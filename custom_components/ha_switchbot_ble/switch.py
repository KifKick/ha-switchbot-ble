"""Switches: catalog settings, the Bot / plug / relay switch, relay channels."""

from __future__ import annotations

from typing import Any, override

from homeassistant.components.switch import SwitchDeviceClass, SwitchEntity
from homeassistant.const import STATE_ON, Platform
from homeassistant.helpers.restore_state import RestoreEntity

from .entity import (
    DescribedEntity,
    SwitchbotSwitchedEntity,
    exception_handler,
    platform_setup,
)

PARALLEL_UPDATES = 0


class DescribedSwitch(DescribedEntity, SwitchEntity):
    @property
    @override
    def is_on(self) -> bool | None:
        return self.value

    @override
    async def async_turn_on(self, **kwargs: Any) -> None:
        await self.async_write_setting(True)

    @override
    async def async_turn_off(self, **kwargs: Any) -> None:
        await self.async_write_setting(False)


class ChannelSwitch(DescribedSwitch):
    """One channel of a multi-channel relay."""

    @property
    @override
    def is_on(self) -> bool | None:
        return self._device.is_on(self._channel)

    @exception_handler
    @override
    async def async_turn_on(self, **kwargs: Any) -> None:
        await self._device.turn_on(self._channel)
        self.async_write_ha_state()

    @exception_handler
    @override
    async def async_turn_off(self, **kwargs: Any) -> None:
        await self._device.turn_off(self._channel)
        self.async_write_ha_state()


class BotSwitch(SwitchbotSwitchedEntity, SwitchEntity, RestoreEntity):
    """Bot, plug or relay; a Bot in press mode has no real state (assumed)."""

    _attr_device_class = SwitchDeviceClass.SWITCH
    _attr_translation_key = "bot"
    _attr_name = None

    def __init__(self, coordinator) -> None:
        super().__init__(coordinator)
        self._attr_is_on = False

    @override
    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        if last_state := await self.async_get_last_state():
            self._attr_is_on = last_state.state == STATE_ON

    @property
    @override
    def assumed_state(self) -> bool:
        return not self._device.switch_mode()

    @property
    @override
    def is_on(self) -> bool | None:
        return self._device.is_on() if self._device.switch_mode() else self._attr_is_on

    @property
    @override
    def extra_state_attributes(self) -> dict[str, Any]:
        return {**super().extra_state_attributes, "switch_mode": self._device.switch_mode()}


async_setup_entry = platform_setup(Platform.SWITCH, DescribedSwitch)
