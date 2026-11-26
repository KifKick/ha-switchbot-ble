"""RGBIC Neon Rope Light."""

from __future__ import annotations

from ...core.advertisement import device
from ...core.const import Model
from .rgbic_base import RgbicNeonLightBase


@device("RGBIC Neon Rope Light", b"\x00\x10\xd0\xb6", b"\x01\x10\xd0\xb6")
class RgbicNeonRopeLight(RgbicNeonLightBase):
    model = Model.RGBIC_NEON_ROPE_LIGHT
