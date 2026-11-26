"""Curtain Track 4 (cloud type W1100000): always encrypted, see docs/curtain-track-4.md.

The app drives it with the Curtain 3 plugin and the Curtain 3 frames, sent
encrypted with the key pair from the SwitchBot account (as for the locks).
Whether the account's key endpoint returns the key of this model is not
proven (?). The key setup frames (``570F20…``, ``570F21…``) are never sent.

Advertisement: service data [0] 0x00, [1] bit 5 encrypted, [3] bit 0 pairing,
[4..6] product id 10 C8 E0. Manufacturer data:

* [7] bit 0 calibrated, bit 1 group master, bits 6-7 and 4-5 two temperature
  states (master / slave?) — 2 too high, 1 too low (?)
* [8] position (0 open); [9] bits 0-3 chain length; [10] bits 0-3 == 7 too hot
* [11] bits 0-3 ear type (Curtain 3 mapping?), bits 5-6 SKU (?), bit 7 kit
* [12] built-in battery; [13] bit 7 Extended Battery installed

Home info ``570f460403`` is shifted by one byte against the Curtain 3: [1]
built-in battery, [2] bit 7 Extended Battery connected + its level, [3]
firmware, [4] charge status, [5] flags (bit 0 solar panel used), [6] timers,
[8] position, [15] bits 4-7 motion mode. Battery shown by the app:
``round(0.73 × extended + 0.27 × built-in)`` while the Extended Battery is
connected, else the built-in level.
"""

from __future__ import annotations

from typing import Any

from ...core.advertisement import device
from ...core.const import Model
from ...core.device import EncryptedDevice
from .cover_base import clamp
from .curtain_3_base import (
    CALIBRATION,
    Curtain3Base,
    HomeLayout,
    mount_type,
    temperature_alarms,
)


def combined_battery(builtin: int, extended: int | None) -> int:
    """The app's battery level with the Extended Battery connected."""
    if extended is None:
        return builtin
    return round(0.73 * extended + 0.27 * builtin)


def parse_curtain_track_4(service: bytes | None, mfr: bytes | None) -> dict[str, Any]:
    if mfr is None or len(mfr) < 13:
        return {}
    extended = bool(mfr[13] & 0x80) if len(mfr) > 13 else None
    builtin = mfr[12] & 0x7F
    return {
        "calibration": bool(mfr[7] & 0x01),
        "group_master": bool(mfr[7] & 0x02),
        **temperature_alarms(mfr[7] >> 6, (mfr[7] >> 4) & 0x03),
        "position": 100 - clamp(mfr[8] & 0x7F),
        "chain_length": mfr[9] & 0x0F,
        "overheating": mfr[10] & 0x0F == 7,
        "mount_type": mount_type(mfr[11] & 0x0F),
        "kit": bool(mfr[11] & 0x80),
        "builtin_battery": builtin,
        "extended_battery_installed": extended,
        # with the Extended Battery the combined level comes from the home info
        "battery": None if extended else builtin,
    }


@device("Curtain Track 4", b"\x00\x10\xc8\xe0", b"\x01\x10\xc8\xe0")
class CurtainTrack4(Curtain3Base, EncryptedDevice):
    model = Model.CURTAIN_TRACK_4
    parse = staticmethod(parse_curtain_track_4)
    HOME = HomeLayout(battery=1, firmware=3, charge=4, flags=5, timers=6, position=8, mode=15,
                      min_length=12, extended=2)

    # mounting side before a calibration: open mode 0 + logo inside (0) / outside (1)
    calibration_steps = {**CALIBRATION, "mount_side": ("570f4504060100{v}",)}
    calibration_values = {"mount_side": (0, 1)}

    def supports_modes(self) -> bool:
        return True  # every firmware gate of the plugin is bypassed for the Track 4

    def supports_new_auto(self) -> bool:
        return True

    def _battery_fields(self, reply: bytes, flags: int, charge: int) -> dict[str, Any]:
        builtin = reply[self.HOME.battery] & 0x7F
        ext = reply[self.HOME.extended]
        connected = bool(ext & 0x80)
        return {
            "builtin_battery": builtin,
            "extended_battery_installed": connected,
            "extended_battery": ext & 0x7F if connected else None,
            "battery": combined_battery(builtin, ext & 0x7F if connected else None),
            "solar_panel": bool(flags & 0x01),
        }
