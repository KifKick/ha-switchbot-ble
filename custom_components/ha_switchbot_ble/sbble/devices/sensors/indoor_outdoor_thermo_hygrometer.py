"""Indoor/Outdoor Thermo-Hygrometer."""

from __future__ import annotations

from ...core.advertisement import device
from ...core.const import Model
from .thermo_hygrometer_base import ThermoHygrometer


@device("Indoor/Outdoor Thermo-Hygrometer", "w", "W")
class IndoorOutdoorThermoHygrometer(ThermoHygrometer):
    model = Model.INDOOR_OUTDOOR_THERMO_HYGROMETER
