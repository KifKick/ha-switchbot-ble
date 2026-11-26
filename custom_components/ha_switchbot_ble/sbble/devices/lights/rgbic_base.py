"""What the RGBIC lights share: strip protocol, encrypted, RGBIC effects and modes.

RGBICWW Strip Light, RGBICWW Floor Lamp, RGBICWW Light Bars, Permanent Outdoor
Light; the RGBIC neon rope lights use the effects with RGB only.
"""

from __future__ import annotations

from enum import Enum
from typing import ClassVar

from ...core.device import EncryptedDevice
from .light_base import ColorMode
from .strip_base import LightStripBase, parse_strip_cw


class RGBICStripLightColorMode(Enum):
    SEGMENTED = 1
    RGB = 2
    SCENE = 3
    MUSIC = 4
    CONTROLLER = 5
    COLOR_TEMP = 6
    EFFECT = 7
    UNKNOWN = 10


COLOR_MODES = {
    RGBICStripLightColorMode.SEGMENTED: ColorMode.EFFECT,
    RGBICStripLightColorMode.RGB: ColorMode.RGB,
    RGBICStripLightColorMode.SCENE: ColorMode.EFFECT,
    RGBICStripLightColorMode.MUSIC: ColorMode.EFFECT,
    RGBICStripLightColorMode.CONTROLLER: ColorMode.EFFECT,
    RGBICStripLightColorMode.COLOR_TEMP: ColorMode.COLOR_TEMP,
    RGBICStripLightColorMode.EFFECT: ColorMode.EFFECT,
    RGBICStripLightColorMode.UNKNOWN: ColorMode.OFF,
}

RGBIC_EFFECTS: dict[str, list[str]] = {
    "romance": [
        "570F490D01350100FF10EE",
        "570F490D0363",
    ],
    "energy": [
        "570F490D01000300ED070F34FF14FFE114",
        "570F490D03FA",
    ],
    "heartbeat": [
        "570F490D01020400FFDEADFE90FDFF9E3D",
        "570F490D01020403FCBAFD",
        "570F490D03FA",
    ],
    "party": [
        "570F490D01030400FF8A47FF524DFF4DEE",
        "570F490D010304034DFF8C",
        "570F490D03FA",
    ],
    "dynamic": [
        "570F490D010403004DFFFB4DFF4FFFBF4D",
        "570F490D03FA",
    ],
    "mystery": [
        "570F490D01050300F660F6F6D460C6F660",
        "570F490D03FA",
    ],
    "lightning": [
        "570F490D01340100FFD700",
        "570F490D03FA",
    ],
    "rock": [
        "570F490D01090300B0F6606864FCFFBC3D",
        "570F490D03FA",
    ],
    "starlight": [
        "570F490D010A0100FF8C00",
        "570F490D0363",
    ],
    "valentine_day": [
        "570F490D010C0300FDE0FFFFCC8AD7FF8A",
        "570F490D03FA",
    ],
    "dream": [
        "570F490D010E0300A3E5FF73F019FFA8E5",
        "570F490D03FA",
    ],
    "alarm": [
        "570F490D013E0100FF0000",
        "570F490D03FA",
    ],
    "fireworks": [
        "570F490D01110300FFAA33FFE233FF5CDF",
        "570F490D03FA",
    ],
    "waves": [
        "570F490D013D01001E90FF",
        "570F490D03FA",
    ],
    "christmas": [
        "570F490D01380400DC143C228B22DAA520",
        "570F490D0363",
        "570F490D0138040332CD32",
        "570F490D0363",
    ],
    "rainbow": [
        "570F490D01160600FF0000FF7F00FFFF00",
        "570F490D03FA",
        "570F490D0116060300FF000000FF9400D3",
        "570F490D03FA",
    ],
    "game": [
        "570F490D011A0400D05CFF668FFFFFEFD5",
        "570F490D0363",
        "570F490D011A0403FFC55C",
        "570F490D0363",
    ],
    "halloween": [
        "570F490D01320300FF8C009370DB32CD32",
        "570F490D0364",
    ],
    "meditation": [
        "570F490D013502001E90FF9370DB",
        "570F490D0364",
    ],
    "starlit_sky": [
        "570F490D010D010099C8FF",
        "570F490D0364",
    ],
    "sleep": [
        "570F490D01370300FF8C002E4E3E3E3E5E",
        "570F490D0364",
    ],
    "movie": [
        "570F490D013602001919704B0082",
        "570F490D0364",
    ],
    "sunrise": [
        "570F490D013F0200FFD700FF4500",
        "570F490D03FA",
        "570F490D03FA",
    ],
    "sunset": [
        "570F490D01390300FF4500FFA500483D8B",
        "570F490D0363",
        "570F490D0363",
    ],
    "new_year": [
        "570F490D013F0300FF0000FFD700228B22",
        "570F490D0364",
    ],
    "cherry_blossom": [
        "570F490D01400200FFB3C1FF69B4",
        "570F490D0364",
    ],
}


class RgbicLightBase(LightStripBase, EncryptedDevice):
    """RGBICWW lights: RGB and colour temperature."""

    parse = staticmethod(parse_strip_cw(10))
    effects: ClassVar[dict[str, list[str]]] = RGBIC_EFFECTS
    color_modes = frozenset({ColorMode.RGB, ColorMode.COLOR_TEMP})

    @property
    def color_mode(self) -> ColorMode:
        mode = RGBICStripLightColorMode(self.data.get("color_mode") or 10)
        return COLOR_MODES.get(mode, ColorMode.OFF)


class RgbicNeonLightBase(LightStripBase, EncryptedDevice):
    """RGBIC neon rope lights: RGB only, RGBIC effects."""

    effects: ClassVar[dict[str, list[str]]] = RGBIC_EFFECTS

    @property
    def color_mode(self) -> ColorMode:
        return ColorMode.RGB
