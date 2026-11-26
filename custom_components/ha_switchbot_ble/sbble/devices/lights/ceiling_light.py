"""Ceiling Light."""

from __future__ import annotations

from ...core.advertisement import device
from ...core.const import Model
from .ceiling_light_base import CeilingLightBase


@device("Ceiling Light", "q", "Q")
class CeilingLight(CeilingLightBase):
    model = Model.CEILING_LIGHT
