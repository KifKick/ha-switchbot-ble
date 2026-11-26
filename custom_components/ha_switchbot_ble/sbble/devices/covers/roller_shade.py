"""Roller Shade: its own command set (``570F47`` writes, ``570F48`` reads), see
docs/roller-shade.md. Not encrypted. Positions 0 = rolled up (open).

Advertisement (manufacturer data, the app parses it from 11 bytes on):

* [6] sequence; [7] bits 1-2 motion (0 stop, 1 opening, 2 closing), bit 0
  allowConnect; [8] bit 7 calibrated, bits 0-6 position; [9] bits 4-7 light
  level, bits 0-3 chain length; [10] bits 4-5 crash reason, bits 0-3 motor
  stop reason; [11] battery (else service data [2]); [12] bits 5-7 charge
  status, bit 3 stuck. Bits 0-2 of [12] ("group state differs") are unnamed (?).

* ``570f4701 05 01 <mode> <pos>``  move (chain unified action, source 1 = app)
* ``570f4701 0a01``                stop (chain unified stop)
* ``570f4701 06 01 01``            open-stop-close-stop toggle (?)
* ``570f4701 0c``                  locate: brief roll
* ``570f4804 11 00``               state of this shade: [1] hardware,
  [2] firmware, [3] battery, [4] bit 0 direction (0 reverse, 1 standard),
  bits 1-3 charge status, [5] bits 0-1 motion, bits 3-6 stop reason,
  [6] bit 7 calibrated, bits 0-6 position

Motor mode 0 performance, 1 QuietDrift (100 cm/min): not stored on the
device, it is part of every move (the app's switch lives on its page only).

Calibration (docs/roller-shade.md section 4): ``570f470501`` start +
``570f47040200 <dir>`` (0 reverse, 1 standard), ``570f470503`` roll to the
top, ``570f470504 <1 up | 2 down>`` jog, ``570f470505`` pause,
``570f47050900 <2 top | 0 open | 1 closed>`` record, ``570f470506`` complete,
``570f470502`` exit. Route correction: ``570f47010b0101 <00 start | 01 rolled
up>``, left with the stop ``570f47010a01``.
"""

from __future__ import annotations

from typing import Any

from ...core.advertisement import device
from ...core.const import Model
from ...core.device import OK
from ...core.errors import OperationError
from .cover_base import CLOSING, OPENING, STOPPED, CoverBase, clamp

SHADE = "570f4701"
STATE = "570f48041100"
MOTOR_MODES = {0: "performance", 1: "quietdrift"}
MODE_VALUES = {name: value for value, name in MOTOR_MODES.items()}
MOTION = {0: STOPPED, 1: OPENING, 2: CLOSING}
STOP_REASONS = {
    0: "none", 1: "move_timeout", 2: "step_timeout", 3: "stuck", 4: "target_reached",
    5: "command", 6: "normal", 7: "idle", 8: "fully_closed", 9: "fully_open",
}
STUCK_REASONS = (2, 3)
CRASH_REASONS = {0: "none", 1: "hard_fault", 2: "rom_watchdog", 3: "aon_watchdog"}
CHARGE_STATUS = {
    0: "not_charging", 1: "adapter_charging", 2: "solar_charging", 3: "adapter_full",
    4: "solar_full", 5: "solar_idle", 6: "error",
}
CHARGING = (1, 2)
SOLAR = (2, 4, 5)  # "solar panel present"
DIRECTIONS = {0: "reverse", 1: "standard"}


def _motion_fields(motion: int, reason: int) -> dict[str, Any]:
    state = MOTION.get(motion, STOPPED)
    return {
        "motion": state,
        "motor_stop_reason": STOP_REASONS.get(reason),
        "stuck": state == STOPPED and reason in STUCK_REASONS,
    }


def _charge_fields(charge: int) -> dict[str, Any]:
    return {
        "charge_status": CHARGE_STATUS.get(charge),
        "battery_charging": charge in CHARGING,
        "solar_panel": charge in SOLAR,
    }


def parse_roller_shade(service: bytes | None, mfr: bytes | None) -> dict[str, Any]:
    if mfr is None or len(mfr) < 11:
        return {}
    data = {
        "sequence_number": mfr[6],
        "allow_connect": bool(mfr[7] & 0x01),
        **_motion_fields((mfr[7] >> 1) & 0x03, mfr[10] & 0x0F),
        "calibration": bool(mfr[8] & 0x80),
        "position": 100 - clamp(mfr[8] & 0x7F),
        "lightLevel": (mfr[9] >> 4) & 0x0F,
        "chain_length": mfr[9] & 0x0F,
        "crash_reason": CRASH_REASONS.get((mfr[10] >> 4) & 0x03),
        "battery": (mfr[11] if len(mfr) > 11 else service[2] if service and len(service) > 2
                    else None),
    }
    if data["battery"] is not None:
        data["battery"] &= 0x7F
    if len(mfr) > 12:
        data.update(_charge_fields(mfr[12] >> 5))
        data["stuck"] = data["stuck"] or bool(mfr[12] & 0x08)
    return data


def parse_state(reply: bytes, adjust) -> dict[str, Any]:
    """Reply of ``570f480411 <idx>``."""
    return {
        "firmware": reply[2] / 10.0,
        "battery": reply[3] & 0x7F,
        "roll_direction": DIRECTIONS[reply[4] & 0x01],
        **_charge_fields((reply[4] >> 1) & 0x07),
        **_motion_fields(reply[5] & 0x03, (reply[5] >> 3) & 0x0F),
        "calibration": bool(reply[6] & 0x80),
        "position": adjust(clamp(reply[6] & 0x7F)),
    }


CALIBRATION = {
    "start": ("570f470501", "570f47040200{v}"),
    "to_top": ("570f470503",),
    "jog_up": ("570f47050401",),
    "jog_down": ("570f47050402",),
    "pause": ("570f470505",),
    "record_top": ("570f4705090002",),
    "record_open": ("570f4705090000",),
    "record_closed": ("570f4705090001",),
    "complete": ("570f470506",),
    "exit": ("570f470502",),
    "route_start": ("570f47010b010100",),
    "route_confirm": ("570f47010b010101",),
    "stop": ("570f47010a01",),
}


@device("Roller Shade", ",", b"\x0c")
class RollerShade(CoverBase):
    model = Model.ROLLER_SHADE
    parse = staticmethod(parse_roller_shade)
    refresh_on_sequence = True
    calibration_steps = CALIBRATION
    calibration_values = {"start": (0, 1)}

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self.default_mode = 0  # mode of moves without one (the app's page switch)
        self.data["motor_mode"] = MOTOR_MODES[0]
        self._route_correction = False

    async def calibration_command(self, step: str, value: int | None = None) -> bool:
        if step in ("start", "route_start"):
            self._route_correction = step == "route_start"
        return await super().calibration_command(step, value)

    def calibration_abort_frames(self) -> tuple[str, ...]:
        # the app leaves a route correction with a stop, the full wizard with exit
        return CALIBRATION["stop" if self._route_correction else "exit"]

    def _mode(self, mode: int | str | None) -> int:
        if mode is None:
            return self.default_mode
        value = MODE_VALUES.get(mode, mode) if isinstance(mode, str) else mode
        if value not in MOTOR_MODES:
            raise ValueError(f"mode must be 0 (performance) or 1 (quietdrift), got {mode!r}")
        return value

    def set_default_mode(self, mode: int | str) -> None:
        self.default_mode = self._mode(mode)
        self.merge({"motor_mode": MOTOR_MODES[self.default_mode]})

    async def set_position(self, position: int, mode: int | str | None = None) -> bool:
        """0-100 (Home Assistant scale), motor mode 0 performance / 1 QuietDrift."""
        frame = f"{SHADE}0501{self._mode(mode):02x}{self._adjust(position):02x}"
        return await self._move(frame, position)

    async def open(self, mode: int | str | None = None) -> bool:
        return await self.set_position(100, mode)

    async def close(self, mode: int | str | None = None) -> bool:
        return await self.set_position(0, mode)

    async def stop(self) -> bool:
        return await self._stop(f"{SHADE}0a01")

    async def toggle(self) -> bool:
        """Open-stop-close-stop, like the NFC tag (with the app as source) (?)."""
        return await self._move(f"{SHADE}060101", None, "toggle")

    async def locate(self) -> bool:
        """Roll briefly so the shade can be found."""
        return await self._send(f"{SHADE}0c", "locate")

    async def read_state(self) -> dict[str, Any]:
        reply = await self.request(STATE)
        if len(reply) < 7 or reply[0] not in OK:
            raise OperationError(f"{self.name}: reading the state failed ({reply.hex()})")
        return parse_state(reply, self._adjust)

    async def read_basic_info(self) -> dict[str, Any]:
        return await self.read_state()

    async def read_motion(self) -> bool:
        state = await self.read_state()
        self.merge(state, notify=False)
        self._set_motion(state["motion"])
        return state["motion"] != STOPPED
