"""Shared by Curtain 3 and Curtain Track 4 (the app drives both the same way).

See docs/curtain-3.md and docs/curtain-track-4.md. ``role`` = which robot of a
pair: 1 this one (single), 3 both. We always address this robot (role 1);
pairs are not supported.

* ``570f4501 04 01 <mode|ff> <pos>``  move (``ff`` = the device's default mode)
* ``570f4501 00 01``                  stop
* ``570f4601 00``                     motion status (polled every second)
* ``570f460403``                      home info (layout per model: ``HOME``)
* ``570f460401``                      base properties: [1] bit 0 logo outside
                                       (bit 3 open direction, 4 sound, 5 LED,
                                       6 Touch & Go: from the home info instead)
* ``570f468104``                      last calibration mode ([1] 1 = automatic)
* ``570f450401 01 <mode>``            default motion mode
* ``570f450403 01 <on> <on>``         Touch & Go

Calibration (docs/curtain-3.md section 4, the plugin's wizard pages):

* ``570f45050a <1 auto | 2 manual | 5 new auto>``  start (clears "calibrated")
* ``570f450508 01 <1 open | 2 closed>``            drive to an end / record it
* ``570f450504 00 <1 left | 2 right>``             jog, ``570f450505 00`` pause
* ``570f450502``                                   exit (= save of the manual wizard)
* ``570f45050c``                                   Smart Correction
* ``570f4605 00``                                  travelled distance (>= 16 steps)
"""

from __future__ import annotations

from dataclasses import dataclass
import logging
from typing import Any, ClassVar

from ...core.device import OK
from ...core.errors import OperationError
from .cover_base import COVER, clamp
from .curtain_base import CurtainBase, parse_move_status

_LOGGER = logging.getLogger(__name__)

ROLE = 1  # this robot only
DEFAULT_MODE = 0xFF
MOTION_MODES = {0: "performance", 1: "quietdrift", 2: "silent"}  # QuietDrift = 27 cm/min
MODE_VALUES = {name: value for value, name in MOTION_MODES.items()}
MODES_FROM_FIRMWARE = 10  # modes need firmware > 10 (as in the app)

CHARGE_STATUS = {
    0: "not_charging", 1: "adapter_charging", 2: "solar_charging", 3: "adapter_full",
    4: "solar_full", 5: "solar_idle", 6: "error",
}
CHARGING = (1, 2)
SOLAR = (2, 4, 5)  # charge states that need a solar panel
MOUNT_TYPES = {0: "u_rail", 1: "rod", 2: "i_rail"}  # ear type, mfr[11] bits 0-3

HOME_INFO = "570f460403"
BASE_PROPERTIES = "570f460401"
LAST_CALIBRATION = "570f468104"
SET_MODE = "570f450401"
SET_TOUCH_AND_GO = "570f450403"


def temperature_alarms(*states: int) -> dict[str, bool]:
    """2-bit temperature states: 2 too high, 1 too low."""
    return {"high_temperature": 2 in states, "low_temperature": 1 in states}


def mount_type(ear: int) -> str:
    return MOUNT_TYPES.get(ear, "u_rail")  # the app maps anything else to the U rail


@dataclass(frozen=True)
class HomeLayout:
    """Byte offsets of the master robot in the ``570F460403`` reply."""

    battery: int
    firmware: int
    charge: int
    flags: int
    timers: int
    position: int
    mode: int
    min_length: int
    extended: int | None = None  # Track 4: Extended Battery byte


CALIBRATION = {
    "start_auto": ("570f45050a01",),
    "start_manual": ("570f45050a02",),
    "start_new_auto": ("570f45050a05",),
    "drive_open": ("570f4505080101",),
    "drive_closed": ("570f4505080102",),
    "jog_left": ("570f4505040001",),
    "jog_right": ("570f4505040002",),
    "pause": ("570f45050500",),
    "exit": ("570f450502",),
    "smart_correction": ("570f45050c",),
}
ABORT = ("570f45050500", "570f450502")  # the app's error path: pause, then exit
NEW_AUTO_FROM_FIRMWARE = 22  # pull-to-start auto calibration and Smart Correction


class Curtain3Base(CurtainBase):
    """Curtain 3 / Track 4 moves, reads, settings and calibration steps."""

    HOME: ClassVar[HomeLayout]
    calibration_steps = CALIBRATION

    def calibration_abort_frames(self) -> tuple[str, ...]:
        return ABORT

    def supports_new_auto(self) -> bool:
        """Firmware >= 22: the new auto calibration and Smart Correction."""
        firmware = self.data.get("firmware")
        return firmware is not None and round(firmware * 10) >= NEW_AUTO_FROM_FIRMWARE

    async def calibration_read(self, what: str) -> dict[str, Any]:
        """Reads of the wizard: ``distance`` (570F4605), ``last_auto`` (570F468104),
        ``state`` (home info)."""
        if what == "distance":
            info = await self.read_calibration_info()
            self.merge({"calibration_distance": info})
            return info
        if what == "last_auto":
            auto = await self.read_last_calibration_auto()
            self.merge({"last_calibration_auto": auto})
            return {"last_calibration_auto": auto}
        if what == "state":
            await self.update()
            return self.data
        raise ValueError(f"unknown calibration read {what!r}")

    # --- moves ---------------------------------------------------------------------------------

    def supports_modes(self) -> bool:
        firmware = self.data.get("firmware")
        return firmware is None or firmware * 10 > MODES_FROM_FIRMWARE

    def _mode_byte(self, mode: int | str | None) -> int:
        if mode is None or mode == DEFAULT_MODE or mode == "default":
            return DEFAULT_MODE
        value = MODE_VALUES[mode] if isinstance(mode, str) else int(mode)
        if value not in MOTION_MODES:
            raise ValueError(f"motion mode must be one of {list(MODE_VALUES)}, got {mode!r}")
        if not self.supports_modes():
            _LOGGER.debug("%s: firmware %s has no motion modes", self.name, self.data.get("firmware"))
            return DEFAULT_MODE
        return value

    async def set_position(self, position: int, mode: int | str | None = None) -> bool:
        """0-100 (Home Assistant scale); mode 0/1/2 or a name, None = the device's default."""
        frame = f"{COVER}04{ROLE:02x}{self._mode_byte(mode):02x}{self._adjust(position):02x}"
        return await self._move(frame, position)

    async def open(self, mode: int | str | None = None) -> bool:
        return await self.set_position(100, mode)

    async def close(self, mode: int | str | None = None) -> bool:
        return await self.set_position(0, mode)

    async def stop(self) -> bool:
        return await self._stop(f"{COVER}00{ROLE:02x}")

    # --- reads ---------------------------------------------------------------------------------

    def parse_home_info(self, reply: bytes) -> dict[str, Any]:
        h = self.HOME
        flags, charge = reply[h.flags], reply[h.charge]
        data: dict[str, Any] = {
            "firmware": reply[h.firmware] / 10.0,
            "charge_status": CHARGE_STATUS.get(charge),
            "battery_charging": charge in CHARGING,
            "calibration": bool(flags & 0x80),
            "open_direction": "right" if flags & 0x40 else "left",
            "motion_status": parse_move_status((flags >> 4) & 0x03),
            "delay_set": bool(flags & 0x08),
            "touch_and_go": bool(flags & 0x04),
            "timers": reply[h.timers],
            "position": self._adjust(clamp(reply[h.position])),
            "motion_mode": MOTION_MODES.get(reply[h.mode] >> 4) if len(reply) > h.mode else None,
        }
        data.update(self._battery_fields(reply, flags, charge))
        return data

    def _battery_fields(self, reply: bytes, flags: int, charge: int) -> dict[str, Any]:
        return {"battery": reply[self.HOME.battery] & 0x7F, "solar_panel": charge in SOLAR}

    async def read_home_info(self) -> dict[str, Any]:
        reply = await self.request(HOME_INFO)
        if len(reply) < self.HOME.min_length or reply[0] not in OK:
            raise OperationError(f"{self.name}: reading the home info failed ({reply.hex()})")
        return self.parse_home_info(reply)

    async def read_basic_info(self) -> dict[str, Any]:
        return await self.read_home_info()

    async def update(self) -> None:
        await super().update()
        if self.data.get("motion_status") not in (None, "stopped") and self._motion_task is None:
            self.follow_motion()

    async def read_settings(self) -> dict[str, Any]:
        """Home info and the base properties (the 6 h settings refresh)."""
        await self.update()
        reply = await self.request(BASE_PROPERTIES)
        if len(reply) >= 2 and reply[0] in OK:
            self.merge({"logo_outside": bool(reply[1] & 0x01)})
        return self.data

    async def read_last_calibration_auto(self) -> bool:
        """True when the last calibration was automatic (offers Smart Correction)."""
        reply = await self.request(LAST_CALIBRATION)
        return len(reply) >= 2 and reply[0] in OK and reply[1] == 1

    # --- settings ------------------------------------------------------------------------------

    async def set_motion_mode(self, mode: str) -> None:
        """Default motion mode (performance / quietdrift / silent)."""
        if mode not in MODE_VALUES:
            raise ValueError(f"motion mode must be one of {list(MODE_VALUES)}, got {mode!r}")
        await self.command(f"{SET_MODE}{ROLE:02x}{MODE_VALUES[mode]:02x}", "setting the motion mode")
        self.merge({"motion_mode": mode})

    async def set_touch_and_go(self, enabled: bool) -> None:
        """Pull the curtain 5 cm and the robot takes over. The frame repeats the value (?)."""
        on = int(bool(enabled))
        await self.command(f"{SET_TOUCH_AND_GO}{ROLE:02x}{on:02x}{on:02x}", "setting Touch & Go")
        self.merge({"touch_and_go": bool(enabled)})
