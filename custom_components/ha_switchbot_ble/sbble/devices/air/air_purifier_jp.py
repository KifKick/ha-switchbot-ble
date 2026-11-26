"""Air Purifier, JP model."""

from __future__ import annotations

from ...core.advertisement import device
from ...core.const import Model
from .air_purifier_base import AirPurifierBase


@device("Air Purifier JP", "+", b"\x0b")
class AirPurifierJP(AirPurifierBase):
    model = Model.AIR_PURIFIER_JP

