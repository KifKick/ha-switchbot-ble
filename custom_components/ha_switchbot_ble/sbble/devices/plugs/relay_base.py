"""Shared by Relay Switch 1 / 1PM / 2PM, Plug Mini (EU) and Garage Door Opener.

Encrypted like a lock (core/crypto.py). Advertisement (manufacturer data):
mfr[6] sequence number (changes with every switch), mfr[7] bit 7 channel 1
on, bit 6 channel 2 on, bit 5 garage door closed; mfr[10-11] (and 12-13 for
channel 2) power in W.

* ``570f70 01 01 00`` on, ``570f70 01 00 00`` off
* ``570f7181``                                state, firmware (17 bytes)
* ``570f7106 00|01 <now u32> <day start u32>`` channel 1 / 2 energy, voltage,
  current, power (15 bytes)

The advertisement power is not used: every switch changes the sequence number,
which triggers a full read.
"""

from __future__ import annotations

from dataclasses import replace
import logging
import time
from typing import Any, ClassVar

from ...core.advertisement import Advertisement
from ...core.device import EncryptedDevice
from ...core.errors import OperationError
from .plug_base import SwitchState, power_value, uint24

_LOGGER = logging.getLogger(__name__)

CONTROL = "570f70"
TURN_ON = f"{CONTROL}010100"
TURN_OFF = f"{CONTROL}010000"
READ_STATE = "570f7181"
READ_CHANNEL = "570f7106"  # + channel (00 / 01) + now + start of day
POWER_KEYS = ("voltage", "current", "power", "energy")

SWITCH1_ON, SWITCH2_ON, DOOR_CLOSED = 0x80, 0x40, 0x20


def parse_relay(service: bytes | None, mfr: bytes | None) -> dict[str, Any]:
    """Relay Switch 1 (and the base of the others)."""
    if mfr is None:
        return {}
    return {
        "switchMode": True,  # always a real switch
        "sequence_number": mfr[6],
        "isOn": bool(mfr[7] & SWITCH1_ON),
    }


def parse_relay_pm(service: bytes | None, mfr: bytes | None) -> dict[str, Any]:
    """Relay Switch 1PM / Plug Mini (EU): plus the power."""
    if mfr is None:
        return {}
    return parse_relay(service, mfr) | {"power": power_value(mfr, 10)}


def parse_state(r: bytes) -> dict[str, Any]:
    """570f7181 reply (channel 1)."""
    return {
        "sequence_number": r[1],
        "isOn": bool(r[2] & SWITCH1_ON),
        "firmware": r[16] / 10.0,
    }


def _small(value: float, floor: float, digits: int) -> float:
    """Round, but keep a tiny non-zero value visible as ``floor``."""
    return floor if 0 < value <= floor else round(value, digits)


def parse_channel(r: bytes) -> dict[str, Any]:
    """570f7106 reply: energy (kWh), voltage (V), current (A), power (W)."""
    voltage = power_value(r, 9, 10.0)
    return {
        "energy": _small(uint24(r, 1) / 60000, 0.01, 2),
        "voltage": 0.1 if 0 < voltage <= 0.1 else round(voltage),
        "current": _small(power_value(r, 11, 1000.0), 0.1, 1),
        "power": _small(power_value(r, 13, 10.0), 0.1, 1),
    }


def zero_when_off(data: dict[str, Any]) -> dict[str, Any]:
    """A switched-off channel draws nothing (the meter keeps the last values)."""
    if not data.get("isOn"):
        data |= {"power": 0, "current": 0, "voltage": 0}
    return data


class RelayBase(EncryptedDevice, SwitchState):
    """Encrypted relay with on / off and the state read."""

    refresh_on_sequence = True

    # metering models keep the last read power values across advertisements
    metering: ClassVar[bool] = False
    channels: ClassVar[int] = 1

    # --- advertisements --------------------------------------------------------------------

    def update_from_advertisement(self, adv: Advertisement) -> None:
        if self.metering:
            adv = replace(adv, data=self._with_read_power(adv.data))
        super().update_from_advertisement(adv)

    def _with_read_power(self, data: dict[str, Any]) -> dict[str, Any]:
        data = dict(data)
        data.update({key: self.data.get(key) or 0 for key in POWER_KEYS})
        return data


    # --- reading -----------------------------------------------------------------------------

    async def _read(self, command: str, min_length: int) -> bytes | None:
        """A read reply, None when refused (07 / 00) or too short."""
        reply = await self.request(command)
        if reply in (b"\x07", b"\x00"):
            return None
        if len(reply) < min_length:
            _LOGGER.warning("%s: short reply to %s: %s", self.name, command, reply.hex())
            return None
        return reply

    async def _read_channel(self, index: int) -> dict[str, Any] | None:
        now = int(time.time())
        reply = await self._read(f"{READ_CHANNEL}{index:02x}{now:08x}{now // 86400 * 86400:08x}",
                                 15)
        return None if reply is None else parse_channel(reply)

    async def _read_state(self) -> tuple[bytes, dict[str, Any], dict[str, Any]] | None:
        """(raw 7181 reply, its parsed state, channel 1 values), None when refused."""
        if (raw := await self._read(READ_STATE, 17)) is None:
            return None
        if (channel := await self._read_channel(0)) is None:
            return None
        return raw, parse_state(raw), channel

    async def read_basic_info(self) -> dict[str, Any]:
        read = await self._read_state()
        return {} if read is None else self._compose(*read)

    def _compose(self, raw: bytes, state: dict[str, Any], channel: dict[str, Any]) -> dict[str, Any]:
        return zero_when_off(state | channel)

    # --- switching -------------------------------------------------------------------------------

    async def _operate(self, command: str) -> bool:
        reply = await self.request(command)
        if not reply:
            raise OperationError(f"{self.name}: no reply to {command}")
        await self.update()
        return reply[0] == 0x01

    async def turn_on(self) -> bool:
        return await self._operate(TURN_ON)

    async def turn_off(self) -> bool:
        return await self._operate(TURN_OFF)
