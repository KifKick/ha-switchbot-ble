"""Hub 3: temperature, humidity, light level and motion.

Manufacturer data (17+ bytes): 6 sequence number, 12 bits 0-3 light level; 13-15 the meters'
temperature / humidity bytes (no all-zero check: the hub always reports);
16 bit 7 motion.
"""

from __future__ import annotations

from typing import Any

from ...core.advertisement import device
from ...core.const import Model
from ...core.device import Device

# light level 1-10 -> lux (SwitchBot after-sales chart)
LUX = {1: 0, 2: 50, 3: 90, 4: 205, 5: 317, 6: 510, 7: 610, 8: 707, 9: 801, 10: 1023}


def parse_hub3(service: bytes | None, mfr: bytes | None) -> dict[str, Any]:
    if mfr is None or len(mfr) < 17:
        return {}
    level = mfr[12] & 0x0F
    temperature = (mfr[14] & 0x7F) + (mfr[13] & 0x0F) / 10
    return {
        "sequence_number": mfr[6],
        "lightLevel": level,
        "illuminance": LUX.get(min(level, 10), 0),
        "temperature": temperature if mfr[14] & 0x80 else -temperature,
        "humidity": mfr[15] & 0x7F,
        "motion_detected": bool(mfr[16] & 0x80),
    }


@device("Hub 3", b"\x00\x10\xb9@", b"\x01\x10\xb9@")
class Hub3(Device):
    model = Model.HUB3
    parse = staticmethod(parse_hub3)
