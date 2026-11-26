"""Air Purifier Table, JP model: wireless charging pad."""

from __future__ import annotations

from ...core.advertisement import device
from ...core.const import Model
from .air_purifier_base import AirPurifierBase


@device("Air Purifier Table JP", "8", b"\x18")
class AirPurifierTableJP(AirPurifierBase):
    model = Model.AIR_PURIFIER_TABLE_JP
    wireless_charging = True
