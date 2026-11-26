"""RGBICWW Floor Lamp."""

from __future__ import annotations

from ...core.advertisement import device
from ...core.const import Model
from .rgbic_base import RgbicLightBase


@device("RGBICWW Floor Lamp", b"\x00\x10\xd0\xb4", b"\x01\x10\xd0\xb4")
class RgbicwwFloorLamp(RgbicLightBase):
    model = Model.RGBICWW_FLOOR_LAMP
