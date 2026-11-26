"""What the light strips share: the 570F49 commands, state read and colour modes.

Light Strip, Strip Light 3, Floor Lamp, Candle Warmer Lamp and the RGBIC lights
all use this protocol.
"""

from __future__ import annotations

from enum import Enum
from typing import Any, ClassVar

from .light_base import ColorMode, LightBase, parse_strip

HEADER = "570F4901"


class StripLightColorMode(Enum):
    RGB = 2
    SCENE = 3
    MUSIC = 4
    CONTROLLER = 5
    COLOR_TEMP = 6
    UNKNOWN = 10


COLOR_MODES = {
    StripLightColorMode.RGB: ColorMode.RGB,
    StripLightColorMode.SCENE: ColorMode.EFFECT,
    StripLightColorMode.MUSIC: ColorMode.EFFECT,
    StripLightColorMode.CONTROLLER: ColorMode.EFFECT,
    StripLightColorMode.COLOR_TEMP: ColorMode.COLOR_TEMP,
    StripLightColorMode.UNKNOWN: ColorMode.OFF,
}

STRIP_EFFECTS: dict[str, list[str]] = {
    "christmas": [
        "570F49070200033C01",
        "570F490701000600009902006D0EFF0021",
        "570F490701000603009902006D0EFF0021",
    ],
    "halloween": [
        "570F49070200053C04",
        "570F490701000300FF6A009E00ED00EA0F",
    ],
    "sunset": [
        "570F49070200033C3C",
        "570F490701000900FF9000ED8C04DD5800",
        "570F490701000903FF2E008E0B004F0500",
        "570F4907010009063F0010270056140033",
    ],
    "vitality": [
        "570F49070200053C02",
        "570F490701000600C5003FD9530AEC9800",
        "570F490701000603FFDF0000895500468B",
    ],
    "flashing": [
        "570F49070200053C02",
        "570F4907010006000000FF00FF00FF0000",
        "570F490701000603FFFF0000FFFFA020F0",
    ],
    "strobe": [
        "570F49070200043C02",
        "570F490701000300FF00E19D70FFFF0515",
    ],
    "fade": [
        "570F49070200043C04",
        "570F490701000500FF5481FF00E19D70FF",
        "570F490701000503FF0515FF7FEB",
    ],
    "smooth": [
        "570F49070200033C02",
        "570F4907010007000036FC00F6FF00ED13",
        "570F490701000703F6FF00FF8300FF0800",
        "570F490701000706FF00E1",
    ],
    "forest": [
        "570F49070200033C06",
        "570F490701000400006400228B223CB371",
        "570F49070100040390EE90",
    ],
    "ocean": [
        "570F49070200033C06",
        "570F4907010007004400FF0061FF007BFF",
        "570F490701000703009DFF00B2FF00CBFF",
        "570F49070100070600E9FF",
    ],
    "autumn": [
        "570F49070200043C05",
        "570F490701000700D10035922D13A16501",
        "570F490701000703AB9100DD8C00F4AA29",
        "570F490701000706E8D000",
    ],
    "cool": [
        "570F49070200043C04",
        "570F490701000600001A63006C9A00468B",
        "570F490701000603009DA50089BE4378B6",
    ],
    "flow": [
        "570F49070200033C02",
        "570F490701000600FF00D8E100FFAA00FF",
        "570F4907010006037F00FF5000FF1900FF",
    ],
    "relax": [
        "570F49070200033C03",
        "570F490701000400FF8C00FF7200FF1D00",
        "570F490701000403FF5500",
    ],
    "modern": [
        "570F49070200043C03",
        "570F49070100060089231A5F8969829E5A",
        "570F490701000603BCB05EEDBE5AFF9D60",
    ],
    "rose": [
        "570F49070200043C04",
        "570F490701000500FF1969BC215F7C0225",
        "570F490701000503600C2B35040C",
    ],
}


class LightStripBase(LightBase):
    """Light strip protocol."""

    parse = staticmethod(parse_strip)
    turn_on_command = f"{HEADER}01"
    turn_off_command = f"{HEADER}02"
    rgb_command = f"{HEADER}12{{}}"
    color_temp_command = f"{HEADER}11{{}}"
    brightness_command = f"{HEADER}14{{}}"
    basic_info_commands = ("570003", "570f4A01")
    effects: ClassVar[dict[str, list[str]]] = STRIP_EFFECTS
    color_modes = frozenset({ColorMode.RGB})

    @property
    def color_mode(self) -> ColorMode:
        mode = StripLightColorMode(self.data.get("color_mode") or 10)
        return COLOR_MODES.get(mode, ColorMode.OFF)

    def parse_state(self, version: bytes, data: bytes) -> dict[str, Any]:
        self._state.update(r=data[3], g=data[4], b=data[5], cw=int.from_bytes(data[7:9], "big"))
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


def parse_strip_cw(offset: int):
    """Strip layout that must also carry the colour temperature at ``offset``
    (the value itself is not used: the state read has it)."""

    def parse(service: bytes | None, mfr: bytes | None) -> dict[str, Any]:
        if not (data := parse_strip(service, mfr)) or len(mfr) < offset + 2:
            return {}
        return data

    return parse
