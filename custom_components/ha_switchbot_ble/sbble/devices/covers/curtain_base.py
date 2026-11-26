"""Shared by Curtain, Curtain 3 and Curtain Track 4: the ``570F45`` / ``570F46`` frames.

Positions in frames and replies: 0 = open, 100 = closed (reversed for HA).

* ``570f4601 00``  motion status: [1] 0 stopped, 1 opening, 2 closing (?)
                   (the app's wizards poll it every second; 1 / 2 are not
                   proven, see docs/curtain-3.md)
* ``570f4605 00``  calibration info: [2..3] travelled cm, [4..5] motor steps
"""

from __future__ import annotations

from typing import Any

from ...core.device import OK
from ...core.errors import OperationError
from .cover_base import CLOSING, OPENING, STOPPED, CoverBase

MOTION = "570f460100"
CALIBRATION_INFO = "570f460500"
MOVE_STATUS = {0: STOPPED, 1: OPENING, 2: CLOSING}  # 1 / 2 (?)
MIN_STEPS = 16  # fewer = "route too short" (< 10 cm), as in the app


def parse_move_status(value: int) -> str:
    return MOVE_STATUS.get(value, OPENING if value else STOPPED)


class CurtainBase(CoverBase):
    """Curtain family: motion polling and the calibration info read."""

    async def read_motion(self) -> bool:
        reply = await self.command(MOTION, "reading the motion status", min_length=2)
        motion = parse_move_status(reply[1])
        self.merge({"motion_status": motion}, notify=False)
        if motion != STOPPED:
            self._set_motion(motion)
        return motion != STOPPED

    async def read_calibration_info(self, slave: bool = False) -> dict[str, Any]:
        """Travelled distance of the last calibration (``570F4605``)."""
        reply = await self.request(f"570f4605{int(slave):02x}")
        if len(reply) < 6 or reply[0] not in OK:
            raise OperationError(f"{self.name}: reading the calibration info failed ({reply.hex()})")
        steps = int.from_bytes(reply[4:6], "big")
        return {"distance_cm": int.from_bytes(reply[2:4], "big"), "steps": steps,
                "route_too_short": steps < MIN_STEPS}
