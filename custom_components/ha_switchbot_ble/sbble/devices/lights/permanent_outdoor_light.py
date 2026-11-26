"""Permanent Outdoor Light."""

from __future__ import annotations

from ...core.advertisement import device
from ...core.const import Model
from .rgbic_base import RgbicLightBase


@device("Permanent Outdoor Light", b"\x00\x10\xd0\xb7", b"\x01\x10\xd0\xb7")
class PermanentOutdoorLight(RgbicLightBase):
    model = Model.PERMANENT_OUTDOOR_LIGHT
