"""Lock Ultra (W1091000): the Lock 2 set plus the half-lock position."""

from __future__ import annotations

from typing import Any

from ...core.advertisement import device
from ...core.const import LockStatus, Model
from ...core.errors import OperationError
from .lock2 import Lock2, status_lock2
from .lock_base import HALF_LOCK


def status_ultra(d: bytes) -> dict[str, Any]:
    return status_lock2(d) | {"half_lock_calibration": bool(d[1] & 0x01)}


@device("Lock Ultra", b"\x00\x10\xa5\xb8", b"\x01\x10\xa5\xb8")
class LockUltra(Lock2):
    model = Model.LOCK_ULTRA
    parse_status = staticmethod(status_ultra)

    @property
    def half_lock_calibrated(self) -> bool:
        return bool(self.data.get("half_lock_calibration"))

    async def half_lock(self) -> bool:
        """Drive to the half-lock position (EU locks, after its calibration)."""
        if not self.half_lock_calibrated:
            raise OperationError("half lock is not calibrated")
        return await self._operate(HALF_LOCK, {LockStatus.HALF_LOCKED, LockStatus.LOCKING})
