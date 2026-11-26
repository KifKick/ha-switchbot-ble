"""Climate Panel (W1111000): temperature, humidity, motion, light, two buttons.

Advertisement only (manufacturer data after the MAC): battery, climate, PIR,
light level and the ON / OFF button key states. A key state byte is
bits 7-5 press mode (0 power-on, 1 single, 2 double, 3 long) and bits 4-0 a
1-30 counter; the raw byte changes with every press (0 = power-on state).
"""

from __future__ import annotations

from typing import Any

from ...core.advertisement import device
from ...core.const import Model
from ...core.device import Device


def parse_climate_panel(service: bytes | None, mfr: bytes | None) -> dict[str, Any]:
    if mfr is None or len(mfr) < 16:
        return {}
    temperature = (mfr[9] & 0x7F) + (mfr[8] & 0x0F) / 10
    return {
        "sequence_number": mfr[6],
        "isOn": bool(mfr[7] & 0x80),
        "battery": mfr[7] & 0x7F,
        "temperature": temperature if mfr[9] & 0x80 else -temperature,
        "humidity": mfr[10] & 0x7F,
        "motion_detected": bool(mfr[15] & 0x80),
        "is_light": ((mfr[15] >> 1) & 0x03) == 0x02,
        "on_keystate": mfr[13],
        "off_keystate": mfr[14],
    }


@device("Climate Panel", b"\x00\x10\xf3\xd8", b"\x01\x10\xf3\xd8")
class ClimatePanel(Device):
    model = Model.CLIMATE_PANEL
    parse = staticmethod(parse_climate_panel)
