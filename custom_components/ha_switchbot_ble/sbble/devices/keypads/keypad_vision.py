"""Keypad Vision: camera keypad with a PIR motion sensor (mfr 13 bits 0-1)."""

from __future__ import annotations

from typing import Any

from ...core.advertisement import device
from ...core.const import Model
from .keypad_vision_base import KeypadVisionBase, parse_vision_common


def parse_keypad_vision(service: bytes | None, mfr: bytes | None) -> dict[str, Any]:
    if not (data := parse_vision_common(mfr)):
        return {}
    return data | {"pir_triggered_level": mfr[13] & 0x03}


@device("Keypad Vision", b"\x00\x11\x03x", b"\x01\x11\x03x")
class KeypadVision(KeypadVisionBase):
    model = Model.KEYPAD_VISION
    parse = staticmethod(parse_keypad_vision)
    charging_mask = 0x06
