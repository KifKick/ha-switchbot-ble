"""Support for SwitchBot Fans."""

import logging
from typing import Any, override

from homeassistant.components.fan import FanEntity, FanEntityFeature
from homeassistant.const import Platform
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.restore_state import RestoreEntity

from .const import DOMAIN
from .coordinator import SwitchbotDataUpdateCoordinator
from .entity import SwitchbotEntity, exception_handler, platform_setup
from .sbble.devices.air.air_purifier_base import AirPurifierBase, AirPurifierMode
from .sbble.devices.air.fan_base import FanCommands
from .sbble.devices.air.standing_fan import StandingFan, StandingFanMode

_LOGGER = logging.getLogger(__name__)
PARALLEL_UPDATES = 0


class SwitchBotFanEntity(SwitchbotEntity, FanEntity, RestoreEntity):
    """Circulator fan (the base of the standing fan entity)."""

    _device: FanCommands
    _attr_supported_features = (
        FanEntityFeature.SET_SPEED
        | FanEntityFeature.OSCILLATE
        | FanEntityFeature.PRESET_MODE
        | FanEntityFeature.TURN_OFF
        | FanEntityFeature.TURN_ON
    )
    _attr_translation_key = "fan"
    _attr_name = None

    def __init__(self, coordinator: SwitchbotDataUpdateCoordinator) -> None:
        """Initialize the entity."""
        super().__init__(coordinator)
        self._attr_is_on = False
        self._attr_preset_modes = self._device.fan_modes

    @property
    @override
    def is_on(self) -> bool | None:
        """Return true if device is on."""
        return self._device.is_on()

    @property
    @override
    def percentage(self) -> int | None:
        """Return the current speed as a percentage."""
        return self._device.get_current_percentage()

    @property
    @override
    def oscillating(self) -> bool | None:
        """Return whether or not the fan is currently oscillating."""
        return self._device.get_oscillating_state()

    @property
    @override
    def preset_mode(self) -> str | None:
        """Return the current preset mode."""
        return self._device.get_current_mode()

    @override
    async def async_set_preset_mode(self, preset_mode: str) -> None:
        """Set the preset mode of the fan."""

        _LOGGER.debug(
            "Switchbot fan to set preset mode %s %s", preset_mode, self._address
        )
        await self._device.set_preset_mode(preset_mode)
        self.async_write_ha_state()

    @override
    async def async_set_percentage(self, percentage: int) -> None:
        """Set the speed percentage of the fan."""

        _LOGGER.debug(
            "Switchbot fan to set percentage %d %s", percentage, self._address
        )
        await self._device.set_percentage(percentage)
        self.async_write_ha_state()

    @override
    async def async_oscillate(self, oscillating: bool) -> None:
        """Oscillate the fan."""

        _LOGGER.debug(
            "Switchbot fan to set oscillating %s %s", oscillating, self._address
        )
        await self._device.set_oscillation(oscillating)
        self.async_write_ha_state()

    @override
    async def async_turn_on(
        self,
        percentage: int | None = None,
        preset_mode: str | None = None,
        **kwargs: Any,
    ) -> None:
        """Turn on the fan."""

        _LOGGER.debug(
            "Switchbot fan to set turn on %s %s %s",
            percentage,
            preset_mode,
            self._address,
        )
        await self._device.turn_on()
        self.async_write_ha_state()

    @override
    async def async_turn_off(self, **kwargs: Any) -> None:
        """Turn off the fan."""

        _LOGGER.debug("Switchbot fan to set turn off %s", self._address)
        await self._device.turn_off()
        self.async_write_ha_state()


class SwitchBotStandingFanEntity(SwitchBotFanEntity):
    """Representation of a Switchbot Standing Fan."""

    _device: StandingFan
    _attr_preset_modes = StandingFanMode.get_modes()
    _attr_translation_key = "standing_fan"

    @exception_handler
    @override
    async def async_set_preset_mode(self, preset_mode: str) -> None:
        """Set the preset mode of the fan."""
        _LOGGER.debug(
            "Switchbot standing fan to set preset mode %s %s",
            preset_mode,
            self._address,
        )
        if not await self._device.set_preset_mode(preset_mode):
            raise HomeAssistantError(
                translation_domain=DOMAIN, translation_key="set_fan_state_failed"
            )
        self.async_write_ha_state()

    @exception_handler
    @override
    async def async_set_percentage(self, percentage: int) -> None:
        """Set the speed percentage of the fan."""
        _LOGGER.debug(
            "Switchbot standing fan to set percentage %d %s", percentage, self._address
        )
        if not await self._device.set_percentage(percentage):
            raise HomeAssistantError(
                translation_domain=DOMAIN, translation_key="set_fan_state_failed"
            )
        self.async_write_ha_state()

    @exception_handler
    @override
    async def async_oscillate(self, oscillating: bool) -> None:
        """Oscillate the fan."""
        _LOGGER.debug(
            "Switchbot standing fan to set oscillating %s %s",
            oscillating,
            self._address,
        )
        if not await self._device.set_oscillation(oscillating):
            raise HomeAssistantError(
                translation_domain=DOMAIN, translation_key="set_fan_state_failed"
            )
        self.async_write_ha_state()

    @exception_handler
    @override
    async def async_turn_on(
        self,
        percentage: int | None = None,
        preset_mode: str | None = None,
        **kwargs: Any,
    ) -> None:
        """Turn on the fan."""
        _LOGGER.debug(
            "Switchbot standing fan to set turn on %s %s %s",
            percentage,
            preset_mode,
            self._address,
        )
        if not await self._device.turn_on():
            raise HomeAssistantError(
                translation_domain=DOMAIN, translation_key="set_fan_state_failed"
            )
        self.async_write_ha_state()

    @exception_handler
    @override
    async def async_turn_off(self, **kwargs: Any) -> None:
        """Turn off the fan."""
        _LOGGER.debug("Switchbot standing fan to set turn off %s", self._address)
        if not await self._device.turn_off():
            raise HomeAssistantError(
                translation_domain=DOMAIN, translation_key="set_fan_state_failed"
            )
        self.async_write_ha_state()


class SwitchBotAirPurifierEntity(SwitchbotEntity, FanEntity):
    """Representation of a Switchbot air purifier."""

    _device: AirPurifierBase
    _attr_supported_features = (
        FanEntityFeature.PRESET_MODE
        | FanEntityFeature.SET_SPEED
        | FanEntityFeature.TURN_OFF
        | FanEntityFeature.TURN_ON
    )
    _attr_preset_modes = AirPurifierMode.get_modes()
    _attr_translation_key = "air_purifier"
    _attr_name = None

    @property
    @override
    def is_on(self) -> bool | None:
        """Return true if device is on."""
        return self._device.is_on()

    @property
    @override
    def preset_mode(self) -> str | None:
        """Return the current preset mode."""
        return self._device.get_current_mode()

    @property
    @override
    def percentage(self) -> int | None:
        """Return the speed percentage of the air purifier."""
        return self._device.get_current_percentage()

    @exception_handler
    @override
    async def async_set_preset_mode(self, preset_mode: str) -> None:
        """Set the preset mode of the air purifier."""

        _LOGGER.debug(
            "Switchbot air purifier to set preset mode %s %s",
            preset_mode,
            self._address,
        )
        await self._device.set_preset_mode(preset_mode)
        self.async_write_ha_state()

    @exception_handler
    @override
    async def async_set_percentage(self, percentage: int) -> None:
        """Set the speed percentage of the air purifier."""

        _LOGGER.debug(
            "Switchbot air purifier to set percentage %d %s", percentage, self._address
        )
        await self._device.set_percentage(percentage)
        self.async_write_ha_state()

    @exception_handler
    @override
    async def async_turn_on(
        self,
        percentage: int | None = None,
        preset_mode: str | None = None,
        **kwargs: Any,
    ) -> None:
        """Turn on the air purifier."""

        _LOGGER.debug(
            "Switchbot air purifier to set turn on %s %s %s",
            percentage,
            preset_mode,
            self._address,
        )
        await self._device.turn_on()
        self.async_write_ha_state()

    @exception_handler
    @override
    async def async_turn_off(self, **kwargs: Any) -> None:
        """Turn off the air purifier."""

        _LOGGER.debug("Switchbot air purifier to set turn off %s", self._address)
        await self._device.turn_off()
        self.async_write_ha_state()


async_setup_entry = platform_setup(Platform.FAN)
