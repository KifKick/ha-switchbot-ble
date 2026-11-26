"""Hub 2: temperature, humidity and light level (manufacturer data 12 bits 0-4)."""

from __future__ import annotations

from typing import Any

from ...core.advertisement import device
from ...core.const import Model
from ...core.device import Device
from .hub_base import parse_hub_climate

# light level 1-21 -> lux (SwitchBot after-sales chart)
LUX = {1: 0, 2: 10, 3: 20, 4: 30, 5: 40, 6: 50, 7: 60, 8: 70, 9: 80, 10: 90, 11: 105,
       12: 205, 13: 317, 14: 416, 15: 510, 16: 610, 17: 707, 18: 801, 19: 897, 20: 1023,
       21: 1091}


def parse_hub2(service: bytes | None, mfr: bytes | None) -> dict[str, Any]:
    if not (data := parse_hub_climate(mfr)):
        return {}
    level = mfr[12] & 0x1F
    return data | {"lightLevel": level, "illuminance": LUX.get(level, 0)}


@device("Hub 2", "v", "V")
class Hub2(Device):
    model = Model.HUB2
    parse = staticmethod(parse_hub2)
