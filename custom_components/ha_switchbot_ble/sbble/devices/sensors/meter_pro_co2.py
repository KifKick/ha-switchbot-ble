"""Meter Pro CO2: the Meter Pro plus CO2 (mfr bytes 13-14, ppm)."""

from __future__ import annotations

from typing import Any

from ...core.advertisement import device
from ...core.const import Model
from .meter_pro_base import MeterProBase
from .thermo_hygrometer_base import parse_climate

# the sensor's range is 400-9999 ppm; higher values are parsing artefacts
CO2_MAX_PPM = 9999


def parse_co2(service: bytes | None, mfr: bytes | None) -> dict[str, Any]:
    data = parse_climate(service, mfr)
    if data and mfr and len(mfr) >= 15 and (co2 := int.from_bytes(mfr[13:15], "big")) <= CO2_MAX_PPM:
        data["co2"] = co2
    return data


@device("Meter Pro CO2", "5", b"\x15")
class MeterProCO2(MeterProBase):
    model = Model.METER_PRO_CO2
    parse = staticmethod(parse_co2)
