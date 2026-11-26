"""Universal Remote: battery (mfr[7] bits 0-6) and charging (bit 7); 5702 [1] / [12]."""

from __future__ import annotations

from typing import Any

from ...core.advertisement import device
from ...core.const import Model
from ...core.device import Device


def parse_universal_remote(service: bytes | None, mfr: bytes | None) -> dict[str, Any]:
    if mfr is None or len(mfr) < 8:
        return {"battery": None, "charging": None}
    return {"battery": mfr[7] & 0x7F, "charging": bool(mfr[7] & 0x80)}


@device("Universal Remote", b"\x07", "'")
class UniversalRemote(Device):
    model = Model.UNIVERSAL_REMOTE
    parse = staticmethod(parse_universal_remote)

    async def read_basic_info(self) -> dict[str, Any]:
        reply = await self.request("5702")
        if reply in (b"\x07", b"\x00"):
            return {}
        return {"battery": reply[1], "charging": bool(reply[12])}
