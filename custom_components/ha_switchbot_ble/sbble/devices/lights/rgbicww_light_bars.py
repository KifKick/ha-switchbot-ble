"""RGBICWW Light Bars."""

from __future__ import annotations

from ...core.advertisement import device
from ...core.const import Model
from .rgbic_base import RgbicLightBase


@device("RGBICWW Light Bars", b"\x00\x11\xbe\xf8", b"\x01\x11\xbe\xf8")
class RgbicwwLightBars(RgbicLightBase):
    model = Model.RGBICWW_LIGHT_BARS
