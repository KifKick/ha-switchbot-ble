"""Color Bulb: RGB, colour temperature, three effects."""

from __future__ import annotations

from enum import Enum
from typing import Any

from ...core.advertisement import device
from ...core.const import Model
from .light_base import ColorMode, LightBase

HEADER = "570F4701"


class BulbColorMode(Enum):
    COLOR_TEMP = 1
    RGB = 2
    DYNAMIC = 3
    UNKNOWN = 10


COLOR_MODES = {
    BulbColorMode.COLOR_TEMP: ColorMode.COLOR_TEMP,
    BulbColorMode.RGB: ColorMode.RGB,
    BulbColorMode.DYNAMIC: ColorMode.EFFECT,
    BulbColorMode.UNKNOWN: ColorMode.OFF,
}


def parse_bulb(service: bytes | None, mfr: bytes | None) -> dict[str, Any]:
    if mfr is None or len(mfr) < 11:
        return {}
    return {
        "sequence_number": mfr[6],
        "isOn": bool(mfr[7] & 0x80),
        "brightness": mfr[7] & 0x7F,
        "color_mode": mfr[8] & 0x07,
    }


@device("Color Bulb", "u", "U")
class ColorBulb(LightBase):
    model = Model.COLOR_BULB
    parse = staticmethod(parse_bulb)
    turn_on_command = f"{HEADER}01"
    turn_off_command = f"{HEADER}02"
    rgb_command = f"{HEADER}12{{}}"
    color_temp_command = f"{HEADER}13{{}}"
    brightness_command = f"{HEADER}14{{}}"
    basic_info_commands = ("570003", "570f4801")
    effects = {
        "colorful": ["570F4701010300"],
        "flickering": ["570F4701010301"],
        "breathing": ["570F4701010302"],
    }
    color_modes = frozenset({ColorMode.RGB, ColorMode.COLOR_TEMP})

    @property
    def color_mode(self) -> ColorMode:
        mode = BulbColorMode(self.data.get("color_mode") or 10)
        return COLOR_MODES.get(mode, ColorMode.OFF)

    def parse_state(self, version: bytes, data: bytes) -> dict[str, Any]:
        self._state.update(r=data[3], g=data[4], b=data[5], cw=int.from_bytes(data[6:8], "big"))
        return {
            "isOn": bool(data[1] & 0x80),
            "brightness": data[2] & 0x7F,
            "r": data[3],
            "g": data[4],
            "b": data[5],
            "cw": self._state["cw"],
            "color_mode": data[10] & 0x0F,
            "firmware": version[2] / 10.0,
        }
