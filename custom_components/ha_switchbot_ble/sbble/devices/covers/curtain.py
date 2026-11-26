"""Curtain (the first two generations).

Advertisement (service data): [1] bit 6 calibrated, [2] battery, [3] bit 7
moving, bits 0-6 position, [4] bits 4-7 light level. With 11+ bytes of
manufacturer data the position block is at mfr[8:11].

* ``570f4501 0101 <pos>``  move (as the app's scenes / widgets send it)
* ``570f4501 0001``        stop
* ``5702`` reply: [1] battery, [2] firmware, [5] bit 2 calibrated, [6] position
"""

from __future__ import annotations

from typing import Any

from ...core.advertisement import device
from ...core.const import Model
from .cover_base import COVER, clamp
from .curtain_base import CurtainBase


def parse_curtain(service: bytes | None, mfr: bytes | None) -> dict[str, Any]:
    if mfr and len(mfr) >= 11:
        raw = mfr[8:11]
        battery = service[2] if service and len(service) >= 3 else None
    elif service and len(service) >= 6:
        raw, battery = service[3:6], service[2]
    else:
        return {}
    return {
        "calibration": bool(service[1] & 0x40) if service and len(service) >= 2 else None,
        "battery": battery & 0x7F if battery is not None else None,
        "inMotion": bool(raw[0] & 0x80),
        "position": 100 - clamp(raw[0] & 0x7F),
        "lightLevel": (raw[1] >> 4) & 0x0F,
    }


@device("Curtain", "c", "C")
class Curtain(CurtainBase):
    model = Model.CURTAIN
    parse = staticmethod(parse_curtain)

    async def open(self) -> bool:
        return await self.set_position(100)

    async def close(self) -> bool:
        return await self.set_position(0)

    async def stop(self) -> bool:
        return await self._stop(f"{COVER}0001")

    async def set_position(self, position: int) -> bool:
        """0-100, Home Assistant scale."""
        return await self._move(f"{COVER}0101{self._adjust(position):02x}", position)

    async def read_basic_info(self) -> dict[str, Any]:
        reply = await self.request("5702")
        if reply in (b"\x07", b"\x00") or len(reply) < 7:
            return {}
        return {
            "battery": reply[1],
            "firmware": reply[2] / 10.0,
            "calibration": bool(reply[5] & 0x04),
            "position": self._adjust(clamp(reply[6])),
        }
