"""Meter Pro."""

from __future__ import annotations

from ...core.advertisement import device
from ...core.const import Model
from .meter_pro_base import MeterProBase


@device("Meter Pro", "4", b"\x14")
class MeterPro(MeterProBase):
    model = Model.METER_PRO
