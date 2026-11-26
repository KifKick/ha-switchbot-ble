"""Light Strip (the first one): RGB and the strip effects."""

from __future__ import annotations

from ...core.advertisement import device
from ...core.const import Model
from .strip_base import LightStripBase


@device("Light Strip", "r", "R")
class LightStrip(LightStripBase):
    model = Model.LIGHT_STRIP
