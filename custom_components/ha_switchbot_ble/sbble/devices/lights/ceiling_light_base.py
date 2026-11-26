"""What Ceiling Light and Ceiling Light Pro share.

Colour temperature and a night light mode. The advertisement always reports
colour mode 1, so the mode read over the connection is kept separately.
"""

from __future__ import annotations

from enum import Enum
from typing import Any

from .light_base import ColorMode, LightBase, _validate_brightness

HEADER = "570F5401"
DEFAULT_COLOR_TEMP = 4001


class CeilingLightColorMode(Enum):
    COLOR_TEMP = 0
    NIGHT = 1
    MUSIC = 4
    UNKNOWN = 10


COLOR_MODES = {
    CeilingLightColorMode.COLOR_TEMP: ColorMode.COLOR_TEMP,
    CeilingLightColorMode.NIGHT: ColorMode.COLOR_TEMP,
    CeilingLightColorMode.MUSIC: ColorMode.EFFECT,
    CeilingLightColorMode.UNKNOWN: ColorMode.OFF,
}


def parse_ceiling(service: bytes | None, mfr: bytes | None) -> dict[str, Any]:
    if mfr is None or len(mfr) < 11:
        return {}
    return {
        "sequence_number": mfr[6],
        "isOn": bool(mfr[10] & 0x80),
        "brightness": mfr[7] & 0x7F,
        "color_mode": 1,
    }


class CeilingLightBase(LightBase):
    parse = staticmethod(parse_ceiling)
    turn_on_command = f"{HEADER}01FF01FFFF"
    turn_off_command = f"{HEADER}02FF01FFFF"
    color_temp_command = f"{HEADER}01FF01{{}}"
    basic_info_commands = ("5702", "570f5581")
    color_modes = frozenset({ColorMode.COLOR_TEMP})

    @property
    def color_mode(self) -> ColorMode:
        value = self._state.get("color_mode", self.data.get("color_mode"))
        mode = CeilingLightColorMode(value if value is not None else 10)
        return COLOR_MODES.get(mode, ColorMode.OFF)

    def is_night_light_on(self) -> bool | None:
        value = self._state.get("color_mode")
        return None if value is None else value == CeilingLightColorMode.NIGHT.value

    async def set_brightness(self, brightness: int) -> bool:
        """Brightness, keeping the last colour temperature."""
        _validate_brightness(brightness)
        color_temp = self._state.get("cw", DEFAULT_COLOR_TEMP)
        return await self._operate(f"{HEADER}01FF01{brightness:02X}{color_temp:04X}")

    async def set_night_light(self, is_on: bool, brightness: int | None = None) -> bool:
        """Night mode on / off; without ``brightness`` 20 % (night) or 100 %, like the app."""
        mode = CeilingLightColorMode.NIGHT if is_on else CeilingLightColorMode.COLOR_TEMP
        if brightness is None:
            brightness = 20 if is_on else 100
        else:
            _validate_brightness(brightness)
        color_temp = self._state.get("cw", DEFAULT_COLOR_TEMP)
        return await self._operate(
            f"{HEADER}01{mode.value:02X}01{brightness:02X}{color_temp:04X}"
        )

    def parse_state(self, version: bytes, data: bytes) -> dict[str, Any]:
        color_temp = int.from_bytes(data[3:5], "big")
        if self.min_temp <= color_temp <= self.max_temp:
            self._state["cw"] = color_temp
        else:
            self._state.setdefault("cw", DEFAULT_COLOR_TEMP)
        self._state["color_mode"] = (data[1] & 0x40) >> 6
        return {
            "isOn": bool(data[1] & 0x80),
            "color_mode": self._state["color_mode"],
            "brightness": data[2] & 0x7F,
            "cw": self._state["cw"],
            "firmware": version[2] / 10.0,
        }
