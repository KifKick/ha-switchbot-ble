"""What every lock shares: advertisement and status layouts, lock / unlock, notifications.

Everything is encrypted (core/crypto.py). Protocol as used by the SwitchBot
app 10.10.

* ``570f4f81 <info>``                   status (``info`` per model)
* ``570e01001e000081 <info>``           status notifications on
* ``570e00``                             notifications off (after a calibration)
* ``570f4e0101 10 <action>``            lock / unlock, first-generation layout
* ``570f4e0101 0000 <action>``          lock / unlock, later models

Notifications starting with ``0f`` are unsolicited encrypted status updates.
"""

from __future__ import annotations

import logging
from typing import Any, ClassVar

from ...core.const import LockStatus
from ...core.device import EncryptedDevice
from ...core.errors import OperationError

_LOGGER = logging.getLogger(__name__)

LOCK_OK = frozenset({0x01, 0x06})
SETTINGS_OK = frozenset({0x01, 0x06, 0x0E})
NOTIFICATION = 0x0F
READ = "570f4f"
WRITE = "570f4e"

# action byte of the lock command
LOCK, UNLOCK, UNLOCK_KEEP_LATCH, HALF_LOCK = 0x00, 0x80, 0xA0, 0x08

REST_STATUSES = frozenset({LockStatus.LOCKED, LockStatus.UNLOCKED, LockStatus.NOT_FULLY_LOCKED})

# calibration step -> 570f4e payload; docs/lock*-calibration.md
CALIBRATION: dict[str, str] = {
    "start": "030100c0",  # enter calibration
    "set_lock_position": "0304008000",  # record the locked position
    "set_lock_position_door_closed": "030400c000",  # locked position, door closed
    "set_unlock_position": "0304008080",  # record the unlocked position
    "set_latch_position": "040b",  # latch position, EU latch locks
    "set_door_open": "0304004040",  # door open
    "set_door_closed": "0304004000",  # door closed
    "test_unlock": "03030080",  # test unlocking
    "test_lock": "03030000",  # test locking
    "complete": "030200",  # save the calibration
    "recover": "030600",  # cancel and restore the previous calibration
}

# Lock (gen 1) / Lock Lite (docs/lock-calibration.md)
CLASSIC_CALIBRATION: dict[str, str] = {
    step: CALIBRATION[step]
    for step in ("start", "set_lock_position_door_closed", "set_door_open", "test_unlock",
                 "test_lock", "complete", "recover")
} | {
    "set_unlock_position_door_open": "030400c0c0",  # unlocked position, door open
    "set_latch_type": "040802",  # the lock is a night latch lock
}

# --- advertisements (manufacturer data, MAC in bytes 0-5) -----------------------------------


def parse_lite(service: bytes | None, mfr: bytes | None) -> dict[str, Any]:
    """First-generation layout (Lock Lite, Lock Vision; base of the Lock)."""
    if mfr is None or len(mfr) < 9:
        return {}
    return {
        "sequence_number": mfr[6],
        "battery": service[2] & 0x7F if service and len(service) >= 3 else None,
        "calibration": bool(mfr[7] & 0x80),
        "status": LockStatus((mfr[7] & 0x70) >> 4),
        "unlocked_alarm": bool(mfr[8] & 0x10),
        "night_latch": bool(mfr[9] & 0x01) if len(mfr) > 9 else False,
    }


def parse_modern(service: bytes | None, mfr: bytes | None) -> dict[str, Any]:
    """Later layout (Lock Pro and newer)."""
    if mfr is None or len(mfr) < 12:
        return {}
    return {
        "sequence_number": mfr[6],
        "calibration": bool(mfr[7] & 0x80),
        "status": LockStatus((mfr[7] & 0x78) >> 3),
        "action_source": mfr[7] & 0x07,
        "door_open": bool(mfr[8] & 0x10),
        "auto_lock_paused": bool(mfr[8] & 0x08),
        "battery_charging": bool(mfr[9] & 0x80),
        "battery": mfr[9] & 0x7F,
        "unclosed_alarm": bool(mfr[11] & 0x80),
        "unlocked_alarm": bool(mfr[11] & 0x40),
        "low_temperature_alarm": bool(mfr[11] & 0x20),
        "power_alarm": bool(mfr[11] & 0x10),
        "magnetic_position_alarm": bool(mfr[11] & 0x08),
        "night_latch": False,
    }


def parse_lock2(service: bytes | None, mfr: bytes | None) -> dict[str, Any]:
    """Later layout plus the battery status (Lock 2 family)."""
    if not (data := parse_modern(service, mfr)):
        return {}
    return data | {"battery_status": mfr[11] & 0x07}


# --- status reply / notification: ``d`` = payload without the status byte --------------------


def classic_extras(d: bytes) -> dict[str, Any]:
    """Knob angle and latch type of the first-generation layout.

    ``latch_type``: 0 not reported (older firmware), 1 normal, 2 latch (Night Latch);
    ``self_adjusting``: the motor jammed and is adjusting itself (Lite: emergency power).
    """
    data: dict[str, Any] = {}
    if len(d) >= 3:
        data["knob_angle"] = d[2] * 2
    if len(d) >= 11:
        data["latch_type"] = d[10] & 0x03
        data["self_adjusting"] = bool(d[10] & 0x80)
    return data


def status_classic(d: bytes) -> dict[str, Any]:
    return {
        "calibration": bool(d[0] & 0x80),
        "status": LockStatus((d[0] & 0x70) >> 4),
        "door_open": bool(d[0] & 0x04),
        "unclosed_alarm": bool(d[1] & 0x20),
        "unlocked_alarm": bool(d[1] & 0x10),
    }


def status_lite(d: bytes) -> dict[str, Any]:
    return {
        "calibration": bool(d[0] & 0x80),
        "status": LockStatus((d[0] & 0x70) >> 4),
        "unlocked_alarm": bool(d[1] & 0x10),
    }


def status_modern(d: bytes) -> dict[str, Any]:
    return {
        "calibration": bool(d[0] & 0x80),
        "status": LockStatus((d[0] & 0x78) >> 3),
        "door_open": bool(d[1] & 0x10),
        "unclosed_alarm": bool(d[5] & 0x80),
        "unlocked_alarm": bool(d[5] & 0x40),
    }


def knob_angle(d: bytes) -> dict[str, Any]:
    return {"knob_angle": d[6] * 2} if len(d) >= 7 else {}


class LockBase(EncryptedDevice):
    """Lock / unlock, status and notifications; each model sets the class variables."""

    info: ClassVar[int]  # 570f4f81xx / 570e01001e000081xx
    classic: ClassVar[bool] = False  # first-generation lock command layout
    refresh_on_sequence = True

    @staticmethod
    def parse_status(d: bytes) -> dict[str, Any]:
        raise NotImplementedError

    # --- state ---------------------------------------------------------------------------

    @property
    def status(self) -> LockStatus | None:
        return self.data.get("status")

    @property
    def night_latch(self) -> bool:
        return bool(self.data.get("night_latch"))

    async def refresh(self) -> None:
        """After an operation (new sequence number): the status, like the app."""
        await self.refresh_status()

    async def update(self) -> None:
        await self.refresh_status()
        await super().update()

    async def refresh_status(self) -> dict[str, Any]:
        """Read the status (door, alarms, knob angle …) and merge it."""
        reply = await self.command(f"{READ}81{self.info:02x}", "reading the status",
                                   ok=LOCK_OK, min_length=2)
        data = self.parse_status(reply[1:])
        self.merge(data)
        return data

    async def enable_notifications(self) -> None:
        await self.command(f"570e01001e000081{self.info:02x}", "enabling notifications",
                           ok=LOCK_OK)

    async def disable_notifications(self) -> None:
        """Status notifications off, sent when leaving a calibration."""
        await self.command("570e00", "disabling notifications", ok=range(256))

    def _on_notification(self, payload: bytes) -> bool:
        if not payload or payload[0] != NOTIFICATION:
            return False
        if (plain := self._decrypt_notification(payload)) is not None:
            try:
                data = self.parse_status(plain)
            except (IndexError, ValueError):
                _LOGGER.debug("%s: bad status notification %s", self.name, payload.hex())
            else:
                if self.merge(data):
                    self._conn.keep_alive()  # stay connected for manual operations
        return True

    # --- operations ------------------------------------------------------------------------

    async def lock(self) -> bool:
        return await self._operate(LOCK, {LockStatus.LOCKED, LockStatus.LOCKING})

    async def unlock(self) -> bool:
        """Unlock; EU locks with the latch feature also release the latch."""
        return await self._operate(UNLOCK, {LockStatus.UNLOCKED, LockStatus.UNLOCKING})

    async def unlock_without_unlatch(self) -> bool:
        return await self._operate(
            UNLOCK_KEEP_LATCH,
            {LockStatus.UNLOCKED, LockStatus.UNLOCKING, LockStatus.NOT_FULLY_LOCKED},
        )

    async def _operate(self, action: int, done: set[LockStatus]) -> bool:
        if self.status is None:
            await self.refresh_status()
        if self.status in done:
            return True
        await self.enable_notifications()
        layout = "10" if self.classic else "0000"
        reply = await self.command(f"{WRITE}0101{layout}{action:02x}", "lock command",
                                   ok=range(256))
        try:  # battery and firmware, as the app does
            self.merge(await self.read_basic_info())
        except OperationError as err:
            _LOGGER.debug("%s: %s", self.name, err)
        return reply[0] in LOCK_OK


class CalibratedLock(LockBase):
    """A lock the panel can calibrate: one ``570f4e`` frame per step."""

    calibration_steps: ClassVar[dict[str, str]] = CALIBRATION

    async def calibration_command(self, step: str) -> bool:
        """One calibration step (``calibration_steps``)."""
        if step not in self.calibration_steps:
            raise OperationError(f"{step} is not a calibration step of {self.model}")
        if step == "start":
            await self.enable_notifications()  # the app does the same
        reply = await self.request(f"{WRITE}{self.calibration_steps[step]}")
        _LOGGER.debug("%s: calibration %s -> %s", self.name, step, reply.hex())
        return bool(reply) and reply[0] in SETTINGS_OK
