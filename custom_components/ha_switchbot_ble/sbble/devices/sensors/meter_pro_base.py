"""What Meter Pro and Meter Pro CO2 share: the clock and its display.

Advertisement as the other meters (thermo_hygrometer_base.parse_climate).
Commands over a plain connection, every reply starts with ``01``:

* ``57 0f 69 05 06``                     read the display time offset
                                         -> ``01 SS OOOOOO`` (SS 80 = minus, seconds)
* ``57 0f 68 05 06 SS OOOOOO``           write it
* ``57 0f 69 01``                        read the clock -> ``01 TTTTTTTT FF YYYY MM DD hh mm ss``
                                         (FF bit 7 = 12 h display; T temperature, ignored)
* ``57 00 05 03 ZZ <u64 seconds> MM``    set the clock: ZZ = UTC offset hours + 12,
                                         MM = offset minutes (added to the seconds too)
* ``57 0f 68 05 05 FF``                  12 h (80) / 24 h (00) display
"""

from __future__ import annotations

from typing import Any

from ...core.device import Device
from .thermo_hygrometer_base import parse_climate

GET_TIME_OFFSET = "570f690506"
SET_TIME_OFFSET = "570f680506"
GET_DATETIME = "570f6901"
SET_DATETIME = "57000503"
SET_DISPLAY_FORMAT = "570f680505"
MAX_TIME_OFFSET = (1 << 24) - 1


class MeterProBase(Device):
    """Meter Pro / Meter Pro CO2."""

    parse = staticmethod(parse_climate)

    async def get_time_offset(self) -> int:
        """Display time offset in seconds (can be negative)."""
        r = await self.command(GET_TIME_OFFSET, "reading the time offset", ok={1}, min_length=5)
        offset = int.from_bytes(r[2:5], "big")
        return -offset if r[1] & 0x80 else offset

    async def set_time_offset(self, offset_seconds: int) -> None:
        """Shift the displayed time by up to ±2^24 - 1 seconds."""
        if abs(offset_seconds) > MAX_TIME_OFFSET:
            raise ValueError(f"time offset {offset_seconds} s out of ±{MAX_TIME_OFFSET}")
        sign = "80" if offset_seconds < 0 else "00"
        await self.command(f"{SET_TIME_OFFSET}{sign}{abs(offset_seconds):06x}",
                           "setting the time offset", ok={1})

    async def get_datetime(self) -> dict[str, Any]:
        """The displayed date and time (offset included) and the 12 h flag."""
        r = await self.command(GET_DATETIME, "reading the clock", ok={1}, min_length=13)
        return {
            "12h_mode": bool(r[5] & 0x80),
            "year": (r[6] << 8) + r[7],
            "month": r[8],
            "day": r[9],
            "hour": r[10],
            "minute": r[11],
            "second": r[12],
        }

    async def set_datetime(self, timestamp: int, utc_offset_hours: int = 0,
                           utc_offset_minutes: int = 0) -> None:
        """Set the clock like the app: hours floor()ed (UTC-5:30 = -6 h + 30 min)."""
        if not -12 <= utc_offset_hours <= 14:
            raise ValueError(f"utc_offset_hours {utc_offset_hours} not in -12 … 14")
        if not 0 <= utc_offset_minutes < 60:
            raise ValueError(f"utc_offset_minutes {utc_offset_minutes} not in 0 … 59")
        # the device does not add the minutes itself
        seconds = timestamp + utc_offset_minutes * 60
        await self.command(
            f"{SET_DATETIME}{utc_offset_hours + 12:02x}{seconds:016x}{utc_offset_minutes:02x}",
            "setting the clock", ok={1},
        )

    async def set_time_display_format(self, is_12h_mode: bool = False) -> None:
        await self.command(f"{SET_DISPLAY_FORMAT}{'80' if is_12h_mode else '00'}",
                           "setting the time format", ok={1})
