"""Lock Lite: the first-generation lock without door sensor.

Calibration: docs/lock-calibration.md.
"""

from __future__ import annotations

from ...core.advertisement import device
from ...core.const import Model
from .lock_base import CLASSIC_CALIBRATION, CalibratedLock, classic_extras, parse_lite, status_lite


@device("Lock Lite", "-", b"\x0d")
class LockLite(CalibratedLock):
    model = Model.LOCK_LITE
    info = 0x01
    classic = True
    parse = staticmethod(parse_lite)
    parse_status = staticmethod(lambda d: status_lite(d) | classic_extras(d))
    calibration_steps = CLASSIC_CALIBRATION
