"""Numbers from the catalog."""

from __future__ import annotations

from datetime import timedelta
from typing import override

from homeassistant.components.number import NumberEntity
from homeassistant.const import Platform

from .entity import DescribedEntity, PolledEntity, platform_setup

PARALLEL_UPDATES = 0
SCAN_INTERVAL = timedelta(days=7)  # PolledNumber


class DescribedNumber(DescribedEntity, NumberEntity):
    @property
    @override
    def native_value(self) -> float | None:
        return self.value

    @override
    async def async_set_native_value(self, value: float) -> None:
        await self.async_write_setting(value)


class PolledNumber(PolledEntity, DescribedNumber):
    """Value only readable over a connection (read weekly)."""


async_setup_entry = platform_setup(Platform.NUMBER, DescribedNumber)
