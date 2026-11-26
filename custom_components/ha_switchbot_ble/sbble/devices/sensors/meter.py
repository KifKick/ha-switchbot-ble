"""Meter; on-device calibration as in the app, not tried on a real unit."""

from __future__ import annotations

from ...core.advertisement import device
from ...core.const import Model
from .thermo_hygrometer_base import ThermoHygrometer


@device("Meter", "T", "t")
class Meter(ThermoHygrometer):
    model = Model.METER
