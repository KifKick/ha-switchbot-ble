"""What the robot vacuums share: start cleaning, return to the dock, work status.

Two protocols: K10+ and K10+ Pro use version 1 (``570F5A…``), the others
version 2 (``5A40…``, not a 57 frame). The work status codes differ per
version; the integration maps them.
"""

from __future__ import annotations

import logging
import time
from typing import Any, ClassVar

from ...core.device import Device

_LOGGER = logging.getLogger(__name__)

CLEAN_UP = {1: "570F5A00FFFF7001", 2: "5A400101010126"}
RETURN_TO_DOCK = {1: "570F5A00FFFF7002", 2: "5A400101010225"}


def parse_vacuum(service: bytes | None, mfr: bytes | None) -> dict[str, Any]:
    """S10, S20, K10+ Pro Combo, K11+, K20."""
    if mfr is None or len(mfr) < 14:
        return {}
    return {"sequence_number": mfr[6], "battery": mfr[12], "work_status": mfr[13] & 0x3F}


def parse_vacuum_k(service: bytes | None, mfr: bytes | None) -> dict[str, Any]:
    """K10+, K10+ Pro."""
    if mfr is None or len(mfr) < 9:
        return {}
    return {"sequence_number": mfr[6], "work_status": (mfr[7] & 0x10) >> 4,
            "battery": mfr[8] & 0x7F}


class VacuumBase(Device):
    """A SwitchBot robot vacuum."""

    refresh_on_sequence = True

    protocol: ClassVar[int] = 2
    parse = staticmethod(parse_vacuum)

    def get_work_status(self) -> int | None:
        return self.data.get("work_status")


    async def update(self) -> None:
        """Only the BLE firmware version can be read."""
        reply = await self.request("5702")
        if reply in (b"\x07", b"\x00"):
            _LOGGER.debug("%s: basic info rejected", self.name)
            return
        self._last_full_update = time.monotonic()
        self.merge({"firmware": reply[2]})

    async def clean_up(self, protocol_version: int | None = None) -> bytes:
        """Start (or resume) cleaning."""
        reply = await self.request(CLEAN_UP[protocol_version or self.protocol])
        await self.update()
        return reply

    async def return_to_dock(self, protocol_version: int | None = None) -> bytes:
        reply = await self.request(RETURN_TO_DOCK[protocol_version or self.protocol])
        await self.update()
        return reply
