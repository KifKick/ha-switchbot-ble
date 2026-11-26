"""Water Leak Detector (advertisements only; docs/water-leak-detector.md).

Manufacturer data:
7 bits 0-6 battery; 8 bit 7 alarm mode (1 = alarm on water, 0 = on dry),
bit 6 water present, bit 5 buzzer ringing, bits 3-4 alarm volume, bit 2 Wi-Fi
fault, bits 0-1 alarm round counter; 13 alarm duration (s), 14 interval (min).
"""

from __future__ import annotations

from typing import Any

from ...core.advertisement import device
from ...core.const import Model
from ...core.device import Device

ALARM_VOLUMES = {0: "quiet", 1: "low", 2: "medium", 3: "high"}


def parse_leak(service: bytes | None, mfr: bytes | None) -> dict[str, Any]:
    if mfr is None or len(mfr) < 9:
        return {}
    flags = mfr[8]
    wet, leak_mode = bool(flags & 0x40), bool(flags & 0x80)
    data: dict[str, Any] = {
        "leak": wet,
        "alarm_mode": "leak" if leak_mode else "dry",
        "alarm_active": wet == leak_mode,  # the app's "Water leak" / "Dry" state
        "buzzer_ringing": bool(flags & 0x20),
        "alarm_volume": ALARM_VOLUMES[(flags >> 3) & 0x03],
        "wifi_fault": bool(flags & 0x04),
        "alarm_count": flags & 0x03,
        "battery": mfr[7] & 0x7F,
    }
    if len(mfr) >= 15:
        data |= {"alarm_duration": mfr[13], "alarm_interval": mfr[14]}
    return data


@device("Water Leak Detector", "&", b"\x06")
class LeakDetector(Device):
    model = Model.LEAK
    parse = staticmethod(parse_leak)
