"""Contact Sensor (advertisements only; docs/contact-sensor.md).

Manufacturer data (13+ bytes): 7 bit 7 motion, bit 6 light, bit 5 left open
(timeout), bit 4 open; 12 bits 0-3 button press counter. Older firmware puts
the same in service data: 1 bit 6 motion, 3 bit 0 light / bit 1 open /
bit 2 timeout, 8 bits 0-3 button counter. Battery: service data 2.
"""

from __future__ import annotations

from typing import Any

from ...core.advertisement import device
from ...core.const import Model
from ...core.device import Device


def parse_contact(service: bytes | None, mfr: bytes | None) -> dict[str, Any]:
    if mfr is not None and len(mfr) >= 13:
        motion, light = bool(mfr[7] & 0x80), bool(mfr[7] & 0x40)
        is_open, timeout = bool(mfr[7] & 0x10), bool(mfr[7] & 0x20)
        buttons = mfr[12] & 0x0F
    elif service is not None and len(service) >= 9:
        motion, light = bool(service[1] & 0x40), bool(service[3] & 0x01)
        is_open, timeout = bool(service[3] & 0x02), bool(service[3] & 0x04)
        buttons = service[8] & 0x0F
    else:
        return {}
    return {
        "motion_detected": motion,
        "battery": service[2] & 0x7F if service and len(service) >= 3 else None,
        "contact_open": is_open or timeout,  # left open is still open
        "is_light": light,
        "button_count": buttons,
    }


@device("Contact Sensor", "d", "D")
class ContactSensor(Device):
    model = Model.CONTACT_SENSOR
    parse = staticmethod(parse_contact)
