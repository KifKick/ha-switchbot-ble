"""Air Purifier Table, US model: PM2.5 and a wireless charging pad."""

from __future__ import annotations

from ...core.advertisement import device
from ...core.const import Model
from .air_purifier_base import AirPurifierBase


@device("Air Purifier Table US", "7", b"\x17")
class AirPurifierTableUS(AirPurifierBase):
    model = Model.AIR_PURIFIER_TABLE_US
    pm25 = True
    wireless_charging = True
