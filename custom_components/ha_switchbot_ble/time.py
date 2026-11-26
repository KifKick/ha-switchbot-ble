"""Time entities from the catalog, and the UTC <-> local helpers they use."""

from __future__ import annotations

from datetime import datetime, time
from typing import override

from homeassistant.components.time import TimeEntity
from homeassistant.const import Platform
from homeassistant.util import dt as dt_util

from .entity import DescribedEntity, platform_setup

PARALLEL_UPDATES = 0


def utc_hhmm_to_local(value: str | None) -> time | None:
    """"HH:MM" in UTC (as some devices store times) -> local time."""
    if not value:
        return None
    hour, minute = (int(x) for x in value.split(":"))
    utc = dt_util.utcnow().replace(hour=hour, minute=minute, second=0, microsecond=0)
    return utc.astimezone(dt_util.get_default_time_zone()).time()


def local_to_utc_hhmm(value: time) -> str:
    local = datetime.combine(dt_util.now().date(), value, dt_util.get_default_time_zone())
    utc = dt_util.as_utc(local)
    return f"{utc.hour:02d}:{utc.minute:02d}"


class DescribedTime(DescribedEntity, TimeEntity):
    @property
    @override
    def native_value(self) -> time | None:
        return self.value

    @override
    async def async_set_value(self, value: time) -> None:
        await self.async_write_setting(value)


async_setup_entry = platform_setup(Platform.TIME, DescribedTime)
