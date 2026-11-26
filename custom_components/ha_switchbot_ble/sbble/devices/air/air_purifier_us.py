"""Air Purifier, US model; measures PM2.5 (the EU unit most likely advertises as this one)."""

from __future__ import annotations

from ...core.advertisement import device
from ...core.const import Model
from .air_purifier_base import AirPurifierBase


@device("Air Purifier US", "*", b"\x0a")
class AirPurifierUS(AirPurifierBase):
    model = Model.AIR_PURIFIER_US
    pm25 = True
