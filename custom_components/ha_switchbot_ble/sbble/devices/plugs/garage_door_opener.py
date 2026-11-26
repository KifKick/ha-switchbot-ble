"""Garage Door Opener: a relay with a door contact; open / close / toggle pulses."""

from __future__ import annotations

from typing import Any

from ...core.advertisement import device
from ...core.const import Model
from .relay_base import CONTROL, DOOR_CLOSED, RelayBase, parse_relay

OPEN = f"{CONTROL}110129"
CLOSE = f"{CONTROL}110229"
TOGGLE = f"{CONTROL}110329"


def parse_garage_door_opener(service: bytes | None, mfr: bytes | None) -> dict[str, Any]:
    if mfr is None:
        return {}
    return parse_relay(service, mfr) | {"door_open": not mfr[7] & DOOR_CLOSED}


@device("Garage Door Opener", ">", b"\x1e")
class GarageDoorOpener(RelayBase):
    model = Model.GARAGE_DOOR_OPENER
    parse = staticmethod(parse_garage_door_opener)

    def _compose(self, raw: bytes, state: dict[str, Any], channel: dict[str, Any]) -> dict[str, Any]:
        return state | {"door_open": not raw[2] & DOOR_CLOSED}

    def door_open(self) -> bool | None:
        return self.data.get("door_open")

    async def open(self) -> bool:
        return await self._operate(OPEN)

    async def close(self) -> bool:
        return await self._operate(CLOSE)

    async def press(self) -> bool:
        """Toggle the door."""
        return await self._operate(TOGGLE)
