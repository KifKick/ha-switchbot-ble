"""Motion Sensor (advertisements only; docs/motion-sensor.md).

Service data: 1 bit 6 motion, 2 battery, 5 bit 5 LED, bits 2-3 detection
distance, bit 1 light. Manufacturer data (8+ bytes): 7 bit 6 motion,
bit 5 light (preferred when present).
"""

from __future__ import annotations

from typing import Any

from ...core.advertisement import device
from ...core.const import Model
from ...core.device import Device

DETECTION_DISTANCES = {0: "long", 1: "medium", 2: "short"}  # as the app names them


def parse_motion(service: bytes | None, mfr: bytes | None) -> dict[str, Any]:
    if service is None and mfr is None:
        return {}
    data: dict[str, Any] = dict.fromkeys(
        ("motion_detected", "battery", "is_light", "led_enabled", "detection_distance")
    )
    if service and len(service) >= 6:
        data |= {
            "motion_detected": bool(service[1] & 0x40),
            "battery": service[2] & 0x7F,
            "is_light": bool(service[5] & 0x02),
            "led_enabled": bool(service[5] & 0x20),
            "detection_distance": DETECTION_DISTANCES.get((service[5] & 0x0C) >> 2),
        }
    if mfr and len(mfr) >= 8:
        data |= {"motion_detected": bool(mfr[7] & 0x40), "is_light": bool(mfr[7] & 0x20)}
    return data


@device("Motion Sensor", "s", "S")
class MotionSensor(Device):
    model = Model.MOTION_SENSOR
    parse = staticmethod(parse_motion)
