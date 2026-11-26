"""Blind Tilt: tilt 0 closed down, 50 open, 100 closed up (not reversed).

See docs/blind-tilt.md. Not encrypted. Vertical slats: 0 closed left, 100
closed right.

Advertisement: service data [2] battery. Manufacturer data: [6] sequence;
[7] bit 7 direction set, bit 6 direction (0 horizontal slats, 1 vertical),
bit 3 stuck (only while [8] bit 7 is 0), bit 0 calibrated; [8] bit 7 moving (?),
bits 0-6 tilt; [9] bits 0-2 chain length and [10] bit 7 allowConnect (both
only with more than 10 bytes). The app reads no light level here.

* ``570f4501 0101 <pos>``  move, firmware < 20
* ``570f4501 05ff <pos>``  move, firmware >= 20 (firmware = ``5702`` [2])
* ``570f4501 0001``        stop (reply [1] = position)
* ``570f4601 00``          motion: [1] 0 stopped, 1 moving, 2 stuck; [6] tilt
* ``570f4604 02``          charge info: [1] battery, [2] firmware, [3] charge status
* ``570f4604 0300``        motor mode: [1] bit 0 (0 performance, 1 quiet)
* ``570f4504 0101 <m>``    set the motor mode
* ``5702``                 [1] battery, [2] firmware, [5] bit 3 solar panel, bit 2 calibrated

Calibration (docs/blind-tilt.md section 4): the user turns the wand by hand,
the device records four points in this order: ``570f450509 01`` closed down,
``02`` open, ``03`` closed up, ``05`` open again. Start ``570f450501`` with
the calibration notifications ``570e01000affff460900``; always end with
``570f450502`` and ``570e00``. Notification byte 1: bits 0-3 device step,
bit 4 "turned far enough" (Next allowed), bit 5 left calibration, bit 6
turned the wrong way. That the notification is the only 4-byte frame is
assumed (?).
"""

from __future__ import annotations

from typing import Any

from ...core.advertisement import device
from ...core.const import Model
from ...core.device import OK
from ...core.errors import OperationError
from .cover_base import CLOSING, COVER, OPENING, CoverBase, clamp

OPEN, CLOSED_DOWN, CLOSED_UP = 50, 0, 100
CHAIN_MOVE_FROM_FIRMWARE = 20  # "05 ff <pos>" from bleVersion 20
MOTION = "570f460100"
CHARGE_INFO = "570f460402"
MOTOR_MODE = "570f46040300"
SET_MOTOR_MODE = "570f45040101"
MOTOR_MODES = {0: "performance", 1: "quiet"}
MODE_VALUES = {name: value for value, name in MOTOR_MODES.items()}
MOVE_STATES = {0: "stopped", 1: "moving", 2: "stuck"}
CHARGE_STATUS = {
    0: "not_charging", 1: "adapter_charging", 2: "solar_charging", 3: "adapter_full",
    4: "solar_full", 5: "solar_idle", 6: "error",
}
CHARGING = (1, 2)
SOLAR = (2, 4, 5)


def parse_blind_tilt(service: bytes | None, mfr: bytes | None) -> dict[str, Any]:
    if mfr is None or len(mfr) < 9:
        return {}
    moving = bool(mfr[8] & 0x80)
    long = len(mfr) > 10
    return {
        "sequence_number": mfr[6],
        "calibration": bool(mfr[7] & 0x01),
        "slat_direction": ("vertical" if mfr[7] & 0x40 else "horizontal") if mfr[7] & 0x80 else None,
        "stuck": bool(mfr[7] & 0x08) and not moving,
        "inMotion": moving,
        "tilt": clamp(mfr[8] & 0x7F),
        "chain_length": mfr[9] & 0x07 if long else None,
        "allow_connect": bool(mfr[10] & 0x80) if long else None,
        "battery": service[2] & 0x7F if service and len(service) >= 3 else None,
    }


NOTIFY_CALIBRATION = "570e01000affff460900"
NOTIFY_OFF = "570e00"
CALIBRATION = {
    "start": ("570f450501", NOTIFY_CALIBRATION),
    "save": ("570f450509{v}",),
    "exit": ("570f450502", NOTIFY_OFF),
}
CALIBRATION_POINTS = (1, 2, 3, 5)  # closed down, open, closed up, open (from above)


def parse_calibration_notification(payload: bytes) -> dict[str, Any]:
    flags = payload[1]
    return {
        "calibration_step": flags & 0x0F,
        "calibration_next": bool(flags & 0x10),
        "calibration_exited": bool(flags & 0x20),
        "calibration_wrong_way": bool(flags & 0x40),
    }


@device("Blind Tilt", "x", "X")
class BlindTilt(CoverBase):
    model = Model.BLIND_TILT
    parse = staticmethod(parse_blind_tilt)
    reverse = False
    position_key = "tilt"
    refresh_on_sequence = True

    calibration_steps = CALIBRATION
    calibration_values = {"save": CALIBRATION_POINTS}

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self._ble_version: int | None = None
        self._calibrating = False

    def calibration_abort_frames(self) -> tuple[str, ...]:
        return CALIBRATION["exit"]

    async def calibration_command(self, step: str, value: int | None = None) -> bool:
        if step == "start":
            self._calibrating = True
            self.merge({"calibration_step": 0, "calibration_next": False,
                        "calibration_exited": False, "calibration_wrong_way": False})
        try:
            return await super().calibration_command(step, value)
        finally:
            if step == "exit":
                self._calibrating = False

    async def calibration_abort(self) -> None:
        await super().calibration_abort()
        self._calibrating = False

    async def calibration_poll(self) -> None:
        """Keeps the link up for the notifications and shows the live tilt."""
        self.merge(await self.read_motion_state())

    def _on_notification(self, payload: bytes) -> bool:
        if not self._calibrating or len(payload) != 4:
            return False
        self.merge(parse_calibration_notification(payload))
        self._conn.keep_alive()
        return True

    def _direction(self, old: int | None, new: int | None) -> str | None:
        """Towards 50 = opening, away from it = closing."""
        if old is None or new is None or old == new:
            return None
        return OPENING if abs(new - OPEN) < abs(old - OPEN) else CLOSING

    async def _firmware(self) -> int:
        if self._ble_version is None:
            await self.update()
        if self._ble_version is None:
            raise OperationError(f"{self.name}: firmware unknown, cannot pick the move frame")
        return self._ble_version

    async def set_position(self, position: int) -> bool:
        """Tilt 0-100: 0 closed down / left, 50 open, 100 closed up / right."""
        position = clamp(int(position))
        if await self._firmware() >= CHAIN_MOVE_FROM_FIRMWARE:
            frame = f"{COVER}05ff{position:02x}"
        else:
            frame = f"{COVER}0101{position:02x}"
        return await self._move(frame, position)

    async def open(self) -> bool:
        return await self.set_position(OPEN)

    async def close_up(self) -> bool:
        return await self.set_position(CLOSED_UP)

    async def close_down(self) -> bool:
        return await self.set_position(CLOSED_DOWN)

    async def close(self) -> bool:
        """Close towards the nearer end (down from the middle, like the app)."""
        if (self.get_position() or 0) > OPEN:
            return await self.close_up()
        return await self.close_down()

    async def stop(self) -> bool:
        return await self._stop(f"{COVER}0001")

    # --- reads -------------------------------------------------------------------------------

    async def read_basic_info(self) -> dict[str, Any]:
        reply = await self.request("5702")
        if reply in (b"\x07", b"\x00") or len(reply) < 6:
            return {}
        self._ble_version = reply[2]
        return {
            "battery": reply[1],
            "firmware": reply[2] / 10.0,
            "solar_panel": bool(reply[5] & 0x08),
            "calibration": bool(reply[5] & 0x04),
        }

    async def read_motion_state(self) -> dict[str, Any]:
        reply = await self.request(MOTION)
        if len(reply) < 7 or reply[0] not in OK:
            raise OperationError(f"{self.name}: reading the motion state failed ({reply.hex()})")
        state = MOVE_STATES.get(reply[1], "moving")
        return {"move_state": state, "stuck": state == "stuck", "inMotion": state == "moving",
                "tilt": clamp(reply[6])}

    async def read_motion(self) -> bool:
        state = await self.read_motion_state()
        self.merge(state, notify=False)
        return state["move_state"] == "moving"

    async def update(self) -> None:
        """Battery, firmware, calibrated (``5702``) and the motion state with the tilt."""
        await super().update()
        self.merge(await self.read_motion_state())

    async def read_settings(self) -> dict[str, Any]:
        """The 6 h settings refresh: state, charge info and motor mode."""
        await self.update()
        reply = await self.request(CHARGE_INFO)
        if len(reply) >= 4 and reply[0] in OK:
            self.merge({"charge_status": CHARGE_STATUS.get(reply[3]),
                        "battery_charging": reply[3] in CHARGING,
                        "solar_panel": reply[3] in SOLAR or self.data.get("solar_panel")})
        reply = await self.request(MOTOR_MODE)
        if len(reply) >= 2 and reply[0] in OK:
            self.merge({"motor_mode": MOTOR_MODES[reply[1] & 0x01]})
        return self.data

    async def set_motor_mode(self, mode: str) -> None:
        if mode not in MODE_VALUES:
            raise ValueError(f"motor mode must be one of {list(MODE_VALUES)}, got {mode!r}")
        await self.command(f"{SET_MOTOR_MODE}{MODE_VALUES[mode]:02x}", "setting the motor mode")
        self.merge({"motor_mode": mode})
