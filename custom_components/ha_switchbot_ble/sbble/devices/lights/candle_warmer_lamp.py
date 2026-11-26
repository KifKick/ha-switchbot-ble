"""Candle Warmer Lamp: encrypted strip protocol, on / off and brightness only."""

from __future__ import annotations

from typing import Any

from ...core.advertisement import device
from ...core.const import Model
from ...core.device import EncryptedDevice
from .light_base import ColorMode
from .strip_base import LightStripBase


def parse_candle(service: bytes | None, mfr: bytes | None) -> dict[str, Any]:
    if mfr is None or len(mfr) < 9:
        return {}
    return {"sequence_number": mfr[6], "isOn": bool(mfr[7] & 0x80), "brightness": mfr[7] & 0x7F}


@device("Candle Warmer Lamp", b"\x00\x11\"\xb8", b"\x01\x11\"\xb8")
class CandleWarmerLamp(LightStripBase, EncryptedDevice):
    model = Model.CANDLE_WARMER_LAMP
    parse = staticmethod(parse_candle)
    rgb_command = ""
    color_temp_command = ""
    effects = {}
    color_modes = frozenset({ColorMode.BRIGHTNESS})

    @property
    def color_mode(self) -> ColorMode:
        return ColorMode.BRIGHTNESS

    def parse_state(self, version: bytes, data: bytes) -> dict[str, Any]:
        return {
            "isOn": bool(data[1] & 0x80),
            "brightness": data[2] & 0x7F,
            "firmware": version[2] / 10.0,
        }
