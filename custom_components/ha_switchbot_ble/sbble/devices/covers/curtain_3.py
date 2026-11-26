"""Curtain 3 (U rail, I rail and the Rod Type: one model, mount told by the ear type).

Not encrypted. Advertisement:

* service data: [1] bit 6 calibrated, bit 7 group master; [2] battery;
  [3] position (0 open); [4] bits 0-3 device-chain length (> 1 = paired);
  [5] bits 0-2 == 7 too hot
* manufacturer data: [7] bits 6-7 temperature (2 too high, 1 too low), bit 2
  magnet alarm (only with more than 12 bytes); [11] bits 0-3 ear type
  (0 U rail, 1 rod, 2 I rail), bit 7 pre-grouped kit. Bytes 8-10 and 12 are
  not read by the app for this model (?).

Home info ``570f460403`` (> 10 bytes): [1] battery, [2] firmware, [3] charge
status, [4] flags, [5] timers, [7] position, [13] bits 4-7 motion mode.
"""

from __future__ import annotations

from typing import Any

from ...core.advertisement import device
from ...core.const import Model
from ...core.device import OK
from .cover_base import clamp
from .curtain_3_base import (
    CALIBRATION,
    Curtain3Base,
    HomeLayout,
    mount_type,
    temperature_alarms,
)


def parse_curtain_3(service: bytes | None, mfr: bytes | None) -> dict[str, Any]:
    data: dict[str, Any] = {}
    if service and len(service) >= 6:
        data.update({
            "calibration": bool(service[1] & 0x40),
            "group_master": bool(service[1] & 0x80),
            "battery": service[2] & 0x7F,
            "position": 100 - clamp(service[3] & 0x7F),
            "chain_length": service[4] & 0x0F,
            "overheating": service[5] & 0x07 == 7,
        })
    if mfr and len(mfr) >= 12:
        data.update({
            **temperature_alarms(mfr[7] >> 6),
            "magnet_alarm": bool(mfr[7] & 0x04) if len(mfr) > 12 else None,
            "mount_type": mount_type(mfr[11] & 0x0F),
            "kit": bool(mfr[11] & 0x80),
        })
    return data


@device("Curtain 3", "{", "[")
class Curtain3(Curtain3Base):
    model = Model.CURTAIN_3
    parse = staticmethod(parse_curtain_3)
    HOME = HomeLayout(battery=1, firmware=2, charge=3, flags=4, timers=5, position=7, mode=13,
                      min_length=11)
    calibration_steps = {
        **CALIBRATION,
        # which side the curtain opens to (0 left, 1 right) + the motor direction
        # the app pairs with it (left -> inverse 1): OpenDirectionPage
        "open_side": ("570f45040601{v}", "570f45040201{i}"),
        # positioning magnet: MagnetCheckPage
        "magnet_on": ("570f4509040101",),
        "magnet_off": ("570f4509040100",),
    }
    calibration_values = {"open_side": (0, 1)}

    def _calibration_frames(self, step: str, value: int | None) -> tuple[str, ...]:
        frames = super()._calibration_frames(step, value)
        if step == "open_side":
            frames = tuple(f.replace("{i}", "01" if value == 0 else "00") for f in frames)
        return frames

    async def calibration_read(self, what: str) -> dict[str, Any]:
        if what == "magnet":  # 570F460902 00: [1] magnet detected by this robot
            reply = await self.request("570f46090200")
            detected = len(reply) >= 2 and reply[0] in OK and bool(reply[1])
            self.merge({"magnet_detected": detected})
            return {"magnet_detected": detected}
        return await super().calibration_read(what)
