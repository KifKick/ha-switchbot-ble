"""RGBIC Neon Wire Rope Light."""

from __future__ import annotations

from ...core.advertisement import device
from ...core.const import Model
from .rgbic_base import RgbicNeonLightBase


@device("RGBIC Neon Wire Rope Light", b"\x00\x10\xd0\xb5", b"\x01\x10\xd0\xb5")
class RgbicNeonWireRopeLight(RgbicNeonLightBase):
    model = Model.RGBIC_NEON_WIRE_ROPE_LIGHT
