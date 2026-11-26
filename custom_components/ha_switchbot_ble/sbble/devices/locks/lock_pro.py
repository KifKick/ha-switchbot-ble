"""Lock Pro: settings, calibration (no auto / half-lock steps), two battery packs.

0401 writes have no trailing motor speed byte.
"""

from __future__ import annotations

from typing import Any

from ...core.advertisement import device
from ...core.const import Model
from .lock_base import knob_angle, parse_modern, status_modern
from .lock_extended import TIMER_READERS, ExtendedLock, basic_settings


def status_pro(d: bytes) -> dict[str, Any]:
    """0f4f8104 status: power supply mode and the pack alarms."""
    return status_modern(d) | knob_angle(d) | {
        "door_status_source": (d[1] & 0xC0) >> 6,
        "power_supply_mode": d[1] & 0x03,
        "battery_charging": bool(d[2] & 0x80),
        "rotation_direction": (d[3] & 0x08) >> 3,
        "lock_type": d[4] & 0x3F,
        "latch_state": (d[4] & 0xC0) >> 6,
        "low_temperature_alarm": bool(d[5] & 0x20),
        "power_alarm": bool(d[5] & 0x10),
        "magnetic_position_alarm": bool(d[5] & 0x08),
        "left_pack_alarm": bool(d[5] & 0x04),
        "right_pack_alarm": bool(d[5] & 0x02),
    }


def packs(r: bytes) -> dict[str, Any]:
    """0409: left / right pack, bit 7 = inserted."""
    return {
        "left_pack_inserted": bool(r[1] & 0x80), "left_pack_battery": r[1] & 0x7F,
        "right_pack_inserted": bool(r[2] & 0x80), "right_pack_battery": r[2] & 0x7F,
    }


@device("Lock Pro", "$", b"\x04")
class LockPro(ExtendedLock):
    model = Model.LOCK_PRO
    info = 0x04
    parse = staticmethod(parse_modern)
    parse_status = staticmethod(status_pro)
    readers = (("0401", 2, basic_settings), *TIMER_READERS, ("0409", 3, packs))
