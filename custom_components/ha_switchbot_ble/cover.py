"""Covers: curtains, roller shade, blind tilt, garage door opener."""

import logging
from typing import Any, override

from homeassistant.components.cover import (
    ATTR_POSITION,
    ATTR_SPEED,
    ATTR_TILT_POSITION,
    CoverDeviceClass,
    CoverEntity,
    CoverEntityFeature,
    CoverEntityStateAttribute,
)
from homeassistant.const import Platform
from homeassistant.core import callback
from homeassistant.helpers.restore_state import RestoreEntity

from .const import (
    CONF_CURTAIN_SPEED,
    CURTAIN_SPEEDS,
    DEFAULT_CURTAIN_SPEED,
    ROLLER_SHADE_SPEEDS,
    curtain_speed_option,
)
from .coordinator import SwitchbotDataUpdateCoordinator
from .entity import SwitchbotEntity, exception_handler, platform_setup
from .sbble.devices.covers.blind_tilt import BlindTilt
from .sbble.devices.covers.cover_base import CoverBase
from .sbble.devices.covers.curtain_3_base import Curtain3Base
from .sbble.devices.covers.roller_shade import RollerShade
from .sbble.devices.plugs.garage_door_opener import GarageDoorOpener

_LOGGER = logging.getLogger(__name__)
PARALLEL_UPDATES = 0
CLOSED_BELOW = 20  # position (HA scale) up to which a curtain / shade counts as closed


POSITION_FEATURES = (
    CoverEntityFeature.OPEN
    | CoverEntityFeature.CLOSE
    | CoverEntityFeature.STOP
    | CoverEntityFeature.SET_POSITION
)


class _MovingCover(SwitchbotEntity, CoverEntity, RestoreEntity):
    """Curtain or roller shade: position, speeds (motion modes), live direction."""

    _device: CoverBase
    _attr_supported_features = POSITION_FEATURES
    _attr_name = None

    def __init__(self, coordinator: SwitchbotDataUpdateCoordinator) -> None:
        super().__init__(coordinator)
        self._attr_is_closed = None

    def _mode(self, kwargs: dict[str, Any]) -> str | None:
        """Motion mode of a move (None: the model has none)."""
        return None

    @override
    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        last_state = await self.async_get_last_state()
        if not last_state or CoverEntityStateAttribute.CURRENT_POSITION not in last_state.attributes:
            return
        self._attr_current_cover_position = last_state.attributes.get(
            CoverEntityStateAttribute.CURRENT_POSITION
        )
        if self._attr_current_cover_position is not None:
            self._attr_is_closed = self._attr_current_cover_position <= CLOSED_BELOW

    async def _run(self, method: str, *args: Any, kwargs: dict[str, Any]) -> None:
        mode = self._mode(kwargs)
        await getattr(self._device, method)(*args, *(() if mode is None else (mode,)))
        self._attr_is_opening = self._device.is_opening()
        self._attr_is_closing = self._device.is_closing()
        self.async_write_ha_state()

    @exception_handler
    @override
    async def async_open_cover(self, **kwargs: Any) -> None:
        await self._run("open", kwargs=kwargs)

    @exception_handler
    @override
    async def async_close_cover(self, **kwargs: Any) -> None:
        await self._run("close", kwargs=kwargs)

    @exception_handler
    @override
    async def async_set_cover_position(self, **kwargs: Any) -> None:
        await self._run("set_position", kwargs[ATTR_POSITION], kwargs=kwargs)

    @exception_handler
    @override
    async def async_stop_cover(self, **kwargs: Any) -> None:
        await self._device.stop()
        self._attr_is_opening = self._attr_is_closing = False
        self.async_write_ha_state()

    @callback
    @override
    def _handle_coordinator_update(self) -> None:
        self._attr_is_closing = self._device.is_closing()
        self._attr_is_opening = self._device.is_opening()
        if (position := self.parsed_data.get("position")) is not None:
            self._attr_current_cover_position = position
            self._attr_is_closed = position <= CLOSED_BELOW
        self.async_write_ha_state()


class SwitchBotCurtainEntity(_MovingCover):
    """Curtain, Curtain 3, Curtain Track 4.

    Curtain 3 / Track 4 speeds are the app's motion modes; "default" lets the
    robot use its stored default mode (the "Default motion mode" setting).
    """

    _attr_device_class = CoverDeviceClass.CURTAIN
    _attr_translation_key = "cover"

    def __init__(self, coordinator: SwitchbotDataUpdateCoordinator) -> None:
        super().__init__(coordinator)
        if isinstance(self._device, Curtain3Base):
            self._attr_supported_features |= CoverEntityFeature.SPEED
            self._attr_supported_speeds = list(CURTAIN_SPEEDS)

    @callback
    def _mode(self, kwargs: dict[str, Any]) -> str | None:
        """The speed passed to the action, else the one from the options flow."""
        if not isinstance(self._device, Curtain3Base):
            return None
        if (speed := kwargs.get(ATTR_SPEED)) is None:
            speed = curtain_speed_option(
                self.coordinator.config_entry.options.get(CONF_CURTAIN_SPEED, DEFAULT_CURTAIN_SPEED)
            )
        return speed  # validated against _attr_supported_speeds by the cover entity


class SwitchBotRollerShadeEntity(_MovingCover):
    """Roller Shade: QuietDrift (100 cm/min) or performance with every move."""

    _device: RollerShade
    _attr_device_class = CoverDeviceClass.SHADE
    _attr_supported_features = POSITION_FEATURES | CoverEntityFeature.SPEED
    _attr_supported_speeds = list(ROLLER_SHADE_SPEEDS)
    _attr_translation_key = "roller_shade"

    @callback
    def _mode(self, kwargs: dict[str, Any]) -> str | None:
        # without a speed the shade's "motor mode" setting applies (device.default_mode)
        return kwargs.get(ATTR_SPEED)


class SwitchBotBlindTiltEntity(SwitchbotEntity, CoverEntity, RestoreEntity):
    """Blind Tilt: tilt 0 closed down / left, 50 open, 100 closed up / right."""

    _device: BlindTilt
    _attr_device_class = CoverDeviceClass.BLIND
    _attr_supported_features = (
        CoverEntityFeature.OPEN_TILT
        | CoverEntityFeature.CLOSE_TILT
        | CoverEntityFeature.STOP_TILT
        | CoverEntityFeature.SET_TILT_POSITION
    )
    _attr_name = None
    _attr_translation_key = "cover"
    CLOSED_UP_THRESHOLD = 80
    CLOSED_DOWN_THRESHOLD = 20

    def __init__(self, coordinator: SwitchbotDataUpdateCoordinator) -> None:
        super().__init__(coordinator)
        self._attr_is_closed = None

    def _closed(self, tilt: int) -> bool:
        return tilt < self.CLOSED_DOWN_THRESHOLD or tilt > self.CLOSED_UP_THRESHOLD

    @override
    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        last_state = await self.async_get_last_state()
        if not last_state or CoverEntityStateAttribute.CURRENT_TILT_POSITION not in last_state.attributes:
            return
        self._attr_current_cover_tilt_position = last_state.attributes.get(
            CoverEntityStateAttribute.CURRENT_TILT_POSITION
        )
        if (tilt := self._attr_current_cover_tilt_position) is not None:
            self._attr_is_closed = self._closed(tilt)

    def _write_motion(self) -> None:
        self._attr_is_opening = self._device.is_opening()
        self._attr_is_closing = self._device.is_closing()
        self.async_write_ha_state()

    @exception_handler
    @override
    async def async_open_cover_tilt(self, **kwargs: Any) -> None:
        await self._device.open()
        self._write_motion()

    @exception_handler
    @override
    async def async_close_cover_tilt(self, **kwargs: Any) -> None:
        await self._device.close()
        self._write_motion()

    @exception_handler
    @override
    async def async_stop_cover_tilt(self, **kwargs: Any) -> None:
        await self._device.stop()
        self._write_motion()

    @exception_handler
    @override
    async def async_set_cover_tilt_position(self, **kwargs: Any) -> None:
        await self._device.set_position(kwargs[ATTR_TILT_POSITION])
        self._write_motion()

    @callback
    @override
    def _handle_coordinator_update(self) -> None:
        if (tilt := self.parsed_data.get("tilt")) is not None:
            self._attr_current_cover_tilt_position = tilt
            self._attr_is_closed = self._closed(tilt)
        self._attr_is_opening = self._device.is_opening()
        self._attr_is_closing = self._device.is_closing()
        self.async_write_ha_state()


class SwitchbotGarageDoorOpenerEntity(SwitchbotEntity, CoverEntity):
    """Representation of a Switchbot garage door."""

    _device: GarageDoorOpener
    _attr_device_class = CoverDeviceClass.GARAGE
    _attr_supported_features = CoverEntityFeature.OPEN | CoverEntityFeature.CLOSE
    _attr_translation_key = "garage_door"
    _attr_name = None

    @property
    @override
    def is_closed(self) -> bool | None:
        """Return true if cover is closed, else False."""
        return not self._device.door_open()

    @exception_handler
    @override
    async def async_open_cover(self, **kwargs: Any) -> None:
        """Open the garage door."""
        await self._device.open()
        self.async_write_ha_state()

    @exception_handler
    @override
    async def async_close_cover(self, **kwargs: Any) -> None:
        """Close the garage door."""
        await self._device.close()
        self.async_write_ha_state()


async_setup_entry = platform_setup(Platform.COVER)
