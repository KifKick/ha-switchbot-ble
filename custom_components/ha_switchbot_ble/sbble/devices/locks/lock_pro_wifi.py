"""Lock Pro Wi-Fi (W1114000): lock / unlock and status; settings not mapped yet."""

from __future__ import annotations

from ...core.advertisement import device
from ...core.const import Model
from .lock_base import LockBase, parse_modern, status_modern


@device("Lock Pro (Wi-Fi)", b"\x00\x10\xff\x90", b"\x01\x10\xff\x90")
class LockProWifi(LockBase):
    model = Model.LOCK_PRO_WIFI
    info = 0x0A
    parse = staticmethod(parse_modern)
    parse_status = staticmethod(status_modern)
