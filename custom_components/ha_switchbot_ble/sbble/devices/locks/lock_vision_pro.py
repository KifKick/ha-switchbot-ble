"""Lock Vision Pro (W1141001): lock / unlock and status; settings not mapped yet."""

from __future__ import annotations

from ...core.advertisement import device
from ...core.const import Model
from .lock_base import LockBase, parse_lock2, status_classic


@device("Lock Vision Pro", b"\x00\x11i\x09", b"\x01\x11i\x09")
class LockVisionPro(LockBase):
    model = Model.LOCK_VISION_PRO
    info = 0x02
    parse = staticmethod(parse_lock2)
    parse_status = staticmethod(status_classic)
