"""Support for SwitchBot lock platform."""

from typing import Any, override

from homeassistant.components.lock import LockEntity, LockEntityFeature
from homeassistant.const import Platform

from .const import CONF_LOCK_NIGHTLATCH, DEFAULT_LOCK_NIGHTLATCH
from .coordinator import SwitchbotDataUpdateCoordinator
from .entity import SwitchbotEntity, exception_handler, platform_setup
from .sbble import LockStatus
from .sbble.devices.locks.lock_base import LockBase

PARALLEL_UPDATES = 0


class SwitchBotLock(SwitchbotEntity, LockEntity):
    """Representation of a Switchbot lock."""

    _attr_translation_key = "lock"
    _attr_name = None
    _device: LockBase

    def __init__(self, coordinator: SwitchbotDataUpdateCoordinator) -> None:
        super().__init__(coordinator)
        self._async_update_attrs()
        force_nightlatch = coordinator.config_entry.options.get(
            CONF_LOCK_NIGHTLATCH, DEFAULT_LOCK_NIGHTLATCH
        )
        if self._device.night_latch or force_nightlatch:
            self._attr_supported_features = LockEntityFeature.OPEN

    @override
    def _async_update_attrs(self) -> None:
        """Update the entity attributes."""
        status = self._device.status
        self._attr_is_locked = status in {LockStatus.LOCKED, LockStatus.HALF_LOCKED}
        self._attr_is_locking = status is LockStatus.LOCKING
        self._attr_is_unlocking = status is LockStatus.UNLOCKING
        self._attr_is_jammed = status in {
            LockStatus.LOCKING_STOP,
            LockStatus.UNLOCKING_STOP,
        }

    @exception_handler
    @override
    async def async_lock(self, **kwargs: Any) -> None:
        """Lock the lock."""
        await self._device.lock()
        self.async_write_ha_state()

    @exception_handler
    @override
    async def async_unlock(self, **kwargs: Any) -> None:
        """Unlock the lock."""
        if self._attr_supported_features & (LockEntityFeature.OPEN):
            await self._device.unlock_without_unlatch()
        else:
            await self._device.unlock()
        self.async_write_ha_state()

    @exception_handler
    @override
    async def async_open(self, **kwargs: Any) -> None:
        """Open the lock."""
        await self._device.unlock()
        self.async_write_ha_state()


async_setup_entry = platform_setup(Platform.LOCK)
