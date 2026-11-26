"""Lock (first generation, app wolock_*): lock / unlock, door sensor, alarms, calibration.

Calibration: docs/lock-calibration.md.
"""

from __future__ import annotations

from typing import Any

from ...core.advertisement import device
from ...core.const import Model
from .lock_base import (
    CLASSIC_CALIBRATION,
    CalibratedLock,
    classic_extras,
    parse_lite,
    status_classic,
)


def parse_lock(service: bytes | None, mfr: bytes | None) -> dict[str, Any]:
    if not (data := parse_lite(service, mfr)):
        return {}
    return data | {
        "door_open": bool(mfr[7] & 0x04),
        "unclosed_alarm": bool(mfr[8] & 0x20),
        "auto_lock_paused": bool(mfr[8] & 0x02),
    }


@device("Lock", "o", "O")
class Lock(CalibratedLock):
    model = Model.LOCK
    info = 0x01
    classic = True
    parse = staticmethod(parse_lock)
    parse_status = staticmethod(lambda d: status_classic(d) | classic_extras(d))
    calibration_steps = CLASSIC_CALIBRATION
