"""Relay Switch 2PM: two metered channels; data per channel under keys 1 and 2."""

from __future__ import annotations

from typing import Any

from ...core.advertisement import device
from ...core.const import Model
from .plug_base import power_value
from .relay_base import (
    CONTROL,
    POWER_KEYS,
    SWITCH2_ON,
    RelayBase,
    parse_relay,
    zero_when_off,
)

# channel -> (on, off)
SWITCH = {1: (f"{CONTROL}010d00", f"{CONTROL}010c00"),
          2: (f"{CONTROL}010700", f"{CONTROL}010300")}


def parse_relay_2pm(service: bytes | None, mfr: bytes | None) -> dict[Any, Any]:
    if mfr is None:
        return {}
    return {
        1: parse_relay(service, mfr) | {"power": power_value(mfr, 10)},
        2: {
            "switchMode": True,
            "sequence_number": mfr[6],
            "isOn": bool(mfr[7] & SWITCH2_ON),
            "power": power_value(mfr, 12),
        },
        "sequence_number": mfr[6],
    }


@device("Relay Switch 2PM", "=", b"\x1d")
class RelaySwitch2PM(RelayBase):
    model = Model.RELAY_SWITCH_2PM
    parse = staticmethod(parse_relay_2pm)
    metering = True
    channels = 2

    def get_parsed_data(self, channel: int | None = None) -> dict[str, Any]:
        """The data of one channel (1 or 2)."""
        return self.data.get(channel, {})

    def _with_read_power(self, data: dict[Any, Any]) -> dict[Any, Any]:
        data = dict(data)
        for channel in (1, 2):
            known = self.data.get(channel, {})
            data[channel] = {**data.get(channel, {}),
                             **{key: known.get(key) or 0 for key in POWER_KEYS}}
        return data

    async def read_basic_info(self) -> dict[Any, Any]:
        if (read := await self._read_state()) is None:
            return {}
        raw, state, first = read
        if (second := await self._read_channel(1)) is None:
            return {}
        second["isOn"] = bool(raw[2] & SWITCH2_ON)
        return {1: zero_when_off(state | first), 2: zero_when_off(second)}

    def is_on(self, channel: int) -> bool | None:  # type: ignore[override]
        return self.get_parsed_data(channel).get("isOn")

    def switch_mode(self, channel: int) -> bool | None:  # type: ignore[override]
        return self.get_parsed_data(channel).get("switchMode")

    async def turn_on(self, channel: int) -> bool:  # type: ignore[override]
        return await self._operate(SWITCH[channel][0])

    async def turn_off(self, channel: int) -> bool:  # type: ignore[override]
        return await self._operate(SWITCH[channel][1])
