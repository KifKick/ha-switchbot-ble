"""RGBICWW Strip Light."""

from __future__ import annotations

from ...core.advertisement import device
from ...core.const import Model
from .rgbic_base import RgbicLightBase


@device("RGBICWW Strip Light", b"\x00\x10\xd0\xb3", b"\x01\x10\xd0\xb3")
class RgbicwwStripLight(RgbicLightBase):
    model = Model.RGBICWW_STRIP_LIGHT
