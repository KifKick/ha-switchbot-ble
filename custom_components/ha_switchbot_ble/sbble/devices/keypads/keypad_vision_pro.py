"""Keypad Vision Pro: camera keypad with a radar (mfr 13: bits 0-1 level, 2-3 distance)."""

from __future__ import annotations

from typing import Any

from ...core.advertisement import device
from ...core.const import Model
from .keypad_vision_base import KeypadVisionBase, parse_vision_common


def parse_keypad_vision_pro(service: bytes | None, mfr: bytes | None) -> dict[str, Any]:
    if not (data := parse_vision_common(mfr)):
        return {}
    return data | {
        "radar_triggered_level": mfr[13] & 0x03,
        "radar_triggered_distance": (mfr[13] >> 2) & 0x03,
    }


@device("Keypad Vision Pro", b"\x00\x11Q\x98", b"\x01\x11Q\x98")
class KeypadVisionPro(KeypadVisionBase):
    model = Model.KEYPAD_VISION_PRO
    parse = staticmethod(parse_keypad_vision_pro)
    charging_mask = 0x0E
