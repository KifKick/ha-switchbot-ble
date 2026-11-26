"""Standing Circulator Fan (FAN2): two axes, sweep angles, display, sound, child lock."""

from __future__ import annotations

from enum import Enum
from typing import Any

from ...core.advertisement import device
from ...core.const import Model
from ...core.device import Device
from .fan_base import HEAD, SET_MODE, FanCommands, parse_fan


class StandingFanMode(Enum):
    NORMAL = 1
    NATURAL = 2
    SLEEP = 3
    BABY = 4
    CUSTOM_NATURAL = 5

    @classmethod
    def get_modes(cls) -> list[str]:
        return [mode.name.lower() for mode in cls]


class HorizontalOscillationAngle(Enum):
    """The command byte is the angle in degrees."""

    ANGLE_30 = 30
    ANGLE_60 = 60
    ANGLE_90 = 90


class VerticalOscillationAngle(Enum):
    """90° is byte 95: the firmware takes 90 (0x5A) as "stop the axis"."""

    ANGLE_30 = 30
    ANGLE_60 = 60
    ANGLE_90 = 95

    @classmethod
    def _missing_(cls, value: object) -> VerticalOscillationAngle | None:
        return cls.ANGLE_90 if value == 90 else None


SET_OSCILLATION_PARAMS = f"{HEAD}0202"  # + H angle FF + V angle FF
SET_DISPLAY = f"{HEAD}0501"  # + 01 / 02 + FFFF
SET_SOUND = f"{HEAD}0601"  # + 64 on / 00 off
SET_AUTO_RECENTER = f"{HEAD}0205"  # + 0101 on / 0202 off (both axes)
SET_CHILD_LOCK = f"{HEAD}07"  # + 01 on / 02 off


def parse_standing_fan(service: bytes | None, mfr: bytes | None) -> dict[str, Any]:
    return parse_fan(mfr, StandingFanMode)


@device("Standing Fan", b"\x00\x11\x07`", b"\x01\x11\x07`")
class StandingFan(FanCommands, Device):
    model = Model.STANDING_FAN
    parse = staticmethod(parse_standing_fan)
    modes = StandingFanMode
    set_mode_commands = {**SET_MODE, "custom_natural": f"{HEAD}030105"}
    start_oscillation = f"{HEAD}02010101"  # both axes
    stop_oscillation = f"{HEAD}02010202"

    def parse_status(self, status: bytes, info: bytes) -> dict[str, Any]:
        data = super().parse_status(status, info)
        data |= {
            "charging": bool(status[2] & 0x80),
            "child_lock": bool(status[3] & 0x01),
            "display": bool(status[3] & 0x02),
            # bit 4 horizontal, bit 3 vertical; the app sets both together
            "auto_recenter": bool(status[3] & 0x18),
        }
        if len(status) > 10:
            data["sound"] = bool(status[10] & 0x7F)
        return data

    async def set_horizontal_oscillation_angle(self, angle: HorizontalOscillationAngle | int) -> bool:
        value = HorizontalOscillationAngle(angle).value
        return await self.operate(f"{SET_OSCILLATION_PARAMS}{value:02X}FFFFFF",
                                  "setting the horizontal angle")

    async def set_vertical_oscillation_angle(self, angle: VerticalOscillationAngle | int) -> bool:
        """30 / 60 / 90 degrees (90 is sent as 95)."""
        value = VerticalOscillationAngle(angle).value
        return await self.operate(f"{SET_OSCILLATION_PARAMS}FFFF{value:02X}FF",
                                  "setting the vertical angle")

    async def set_child_lock(self, enabled: bool) -> bool:
        return await self.operate(f"{SET_CHILD_LOCK}{'01' if enabled else '02'}", "child lock")

    async def set_display(self, enabled: bool) -> bool:
        return await self.operate(f"{SET_DISPLAY}{'01' if enabled else '02'}FFFF", "display")

    async def set_sound(self, enabled: bool) -> bool:
        return await self.operate(f"{SET_SOUND}{'64' if enabled else '00'}", "key tone")

    async def set_auto_recenter(self, enabled: bool) -> bool:
        return await self.operate(f"{SET_AUTO_RECENTER}{'0101' if enabled else '0202'}",
                                  "return to centre")
