"""Weather Station (advertisements only).

Manufacturer data: 6 sequence, 7 bit 7 charging / bits 0-6 battery, 8-10 the
temperature / humidity bytes of the meters. Older firmware: service data
3-5, battery in service data 2.
"""

from __future__ import annotations

from typing import Any

from ...core.advertisement import device
from ...core.const import Model
from ...core.device import Device
from .thermo_hygrometer_base import decode_climate


def parse_weather_station(service: bytes | None, mfr: bytes | None) -> dict[str, Any]:
    raw, battery = None, None
    if mfr and len(mfr) >= 11:
        raw, battery = mfr[8:11], mfr[7] & 0x7F
    if service and len(service) >= 6:
        raw = raw or service[3:6]
        battery = service[2] & 0x7F if battery is None else battery
    if raw is None or not (data := decode_climate(raw)):
        return {}
    return data | {"battery": battery}


@device("Weather Station", b"\x00\x10S\xb0", b"\x01\x10S\xb0")
class WeatherStation(Device):
    model = Model.WEATHER_STATION
    parse = staticmethod(parse_weather_station)
