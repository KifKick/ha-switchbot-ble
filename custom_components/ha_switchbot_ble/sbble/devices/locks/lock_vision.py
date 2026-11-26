"""Lock Vision (W1141000): lock / unlock and status; settings not mapped yet."""

from __future__ import annotations

from ...core.advertisement import device
from ...core.const import Model
from .lock_base import LockBase, parse_lite, status_lite


@device("Lock Vision", b"\x00\x11i\x08", b"\x01\x11i\x08")
class LockVision(LockBase):
    model = Model.LOCK_VISION
    info = 0x02
    parse = staticmethod(parse_lite)
    parse_status = staticmethod(status_lite)
