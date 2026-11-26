"""Selects from the catalog."""

from __future__ import annotations

from datetime import timedelta
from typing import override

from homeassistant.components.select import SelectEntity
from homeassistant.const import Platform
from homeassistant.helpers.restore_state import RestoreEntity

from .entity import DescribedEntity, PolledEntity, platform_setup

PARALLEL_UPDATES = 0
SCAN_INTERVAL = timedelta(days=7)  # PolledSelect


class DescribedSelect(DescribedEntity, SelectEntity):
    @property
    @override
    def current_option(self) -> str | None:
        return self.value

    @override
    async def async_select_option(self, option: str) -> None:
        await self.async_write_setting(option)


class RestoredSelect(DescribedSelect, RestoreEntity):
    """A choice Home Assistant keeps for the device (not stored on the device),
    restored after a restart and handed to the device with set_fn."""

    @override
    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        last = await self.async_get_last_state()
        if last is not None and last.state in (self.options or ()):
            assert self.entity_description.set_fn is not None
            await self.entity_description.set_fn(self._device, last.state)


class PolledSelect(PolledEntity, DescribedSelect):
    """Value only readable over a connection (read weekly)."""


async_setup_entry = platform_setup(Platform.SELECT, DescribedSelect)
