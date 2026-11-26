"""mmWave Presence Sensor (advertisements only; docs/presence-sensor.md).

Manufacturer data (12+ bytes): 7 bit 7 adaptive
state, bit 6 presence, bits 2-3 battery range; 11 bit 7 LED, bits 0-4 light
level. Battery %: service data 2.
"""

from __future__ import annotations

from typing import Any

from ...core.advertisement import device
from ...core.const import Model
from ...core.device import Device

BATTERY_RANGES = {0: "<10%", 1: "10-19%", 2: "20-59%", 3: ">=60%"}


def parse_presence(service: bytes | None, mfr: bytes | None) -> dict[str, Any]:
    if mfr is None or len(mfr) < 12:
        return {}
    data: dict[str, Any] = {
        "sequence_number": mfr[6],
        "adaptive_state": bool(mfr[7] & 0x80),
        "motion_detected": bool(mfr[7] & 0x40),
        "battery_range": BATTERY_RANGES[(mfr[7] >> 2) & 0x03],
        "led_state": bool(mfr[11] & 0x80),
        "lightLevel": mfr[11] & 0x1F,
    }
    if service:
        data["battery"] = service[2] & 0x7F
    return data


@device("Presence Sensor", b"\x00\x10\xcc\xc8", b"\x01\x10\xcc\xc8")
class PresenceSensor(Device):
    model = Model.PRESENCE_SENSOR
    parse = staticmethod(parse_presence)
