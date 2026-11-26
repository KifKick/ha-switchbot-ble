"""Base entity, entity descriptions and the engine that creates entities.

Every entity of the integration comes from the model catalog (catalog/): a
model lists descriptions, each platform module only names its generic entity
class and calls :func:`platform_setup`.
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable, Coroutine, Iterable
from dataclasses import dataclass
import logging
from typing import TYPE_CHECKING, Any, ClassVar, Concatenate, Literal, override

from homeassistant.components import bluetooth
from homeassistant.components.binary_sensor import BinarySensorEntityDescription
from homeassistant.components.bluetooth.passive_update_coordinator import (
    PassiveBluetoothCoordinatorEntity,
)
from homeassistant.components.button import ButtonEntityDescription
from homeassistant.components.event import EventEntityDescription
from homeassistant.components.number import NumberEntityDescription
from homeassistant.components.select import SelectEntityDescription
from homeassistant.components.sensor import SensorEntityDescription
from homeassistant.components.switch import SwitchEntityDescription
from homeassistant.components.time import TimeEntityDescription
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity import Entity, EntityDescription, ToggleEntity
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback
from homeassistant.helpers.start import async_at_started

from .const import DOMAIN, MANUFACTURER
from .coordinator import (
    BLE_ERRORS,
    SwitchbotConfigEntry,
    SwitchbotDataUpdateCoordinator,
)
from .sbble import Device

if TYPE_CHECKING:
    from .catalog import ModelSpec

_LOGGER = logging.getLogger(__name__)


WRITE_ERRORS = (*BLE_ERRORS, ValueError)


# --- base entity --------------------------------------------------------------


class SwitchbotEntity(PassiveBluetoothCoordinatorEntity[SwitchbotDataUpdateCoordinator]):
    """Common to all SwitchBot entities; ``channel`` for multi-channel relays."""

    _device: Device
    _attr_has_entity_name = True

    def __init__(
        self, coordinator: SwitchbotDataUpdateCoordinator, channel: int | None = None
    ) -> None:
        super().__init__(coordinator)
        self._device = coordinator.device
        self._channel = channel
        self._address = coordinator.ble_device.address
        self._attr_unique_id = coordinator.base_unique_id
        if channel is not None:
            self._attr_device_info = DeviceInfo(
                identifiers={(DOMAIN, f"{coordinator.base_unique_id}-channel-{channel}")},
                manufacturer="SwitchBot",
                model_id="RelaySwitch2PM",
                name=f"{coordinator.device_name} Channel {channel}",
            )
            return
        connections = {(dr.CONNECTION_BLUETOOTH, self._address)}
        # a MacOS Bluetooth address is no MAC address; when it is one, keep the
        # MAC connection so upgrading does not create a second device
        if ":" in self._address:
            connections.add((dr.CONNECTION_NETWORK_MAC, self._address))
        self._attr_device_info = DeviceInfo(
            connections=connections,
            manufacturer=MANUFACTURER,
            model=coordinator.model,  # the modelName is sometimes missing from ads
            name=coordinator.device_name,
        )

    @property
    def parsed_data(self) -> dict[str, Any]:
        """Parsed device data (of this entity's channel)."""
        return self.coordinator.data_for(self._channel)

    @callback
    def _async_update_attrs(self) -> None:
        """Update the entity attributes."""

    @callback
    @override
    def _handle_coordinator_update(self) -> None:
        self._async_update_attrs()
        self.async_write_ha_state()

    @override
    async def async_added_to_hass(self) -> None:
        self.async_on_remove(self._device.subscribe(self._handle_coordinator_update))
        return await super().async_added_to_hass()

    @override
    async def async_update(self) -> None:
        """Only used by the generic entity update service."""
        await self._device.update()


def exception_handler[EntityT: SwitchbotEntity, **P](
    func: Callable[Concatenate[EntityT, P], Coroutine[Any, Any, Any]],
) -> Callable[Concatenate[EntityT, P], Coroutine[Any, Any, None]]:
    """Turn device errors of an entity action into a HomeAssistantError."""

    async def handler(self: EntityT, *args: P.args, **kwargs: P.kwargs) -> None:
        try:
            await func(self, *args, **kwargs)
        except WRITE_ERRORS as error:
            raise HomeAssistantError(
                translation_domain=DOMAIN,
                translation_key="operation_error",
                translation_placeholders={"error": str(error)},
            ) from error

    return handler


class SwitchbotSwitchedEntity(SwitchbotEntity, ToggleEntity):
    """Entity that turns the whole device on and off."""

    _device: Any  # a device with turn_on / turn_off

    @exception_handler
    @override
    async def async_turn_on(self, **kwargs: Any) -> None:
        if await self._device.turn_on():
            self._attr_is_on = True
        self.async_write_ha_state()

    @exception_handler
    @override
    async def async_turn_off(self, **kwargs: Any) -> None:
        if await self._device.turn_off():
            self._attr_is_on = False
        self.async_write_ha_state()


class SwitchbotConnectionPolledEntity(SwitchbotEntity):
    """Entity whose value can only be read over a connection.

    The first read waits until startup is over: connecting is slow and often
    impossible while Home Assistant competes for the Bluetooth adapter.
    """

    _attr_entity_registry_enabled_default = False
    _attr_should_poll = True

    async def _async_read_value(self) -> None:
        raise NotImplementedError

    @override
    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        self.async_on_remove(async_at_started(self.hass, self._async_hass_started))

    @callback
    def _async_hass_started(self, _hass: HomeAssistant) -> None:
        # a background task, so a stuck connect is cancelled on unload
        self.coordinator.config_entry.async_create_background_task(
            self.hass,
            self.async_update_ha_state(force_refresh=True),
            f"switchbot read {self.entity_id}",
        )

    @override
    async def async_update(self) -> None:
        if not bluetooth.async_ble_device_from_address(
            self.hass, self._address, connectable=True
        ):
            return
        try:
            await self._async_read_value()
        except BLE_ERRORS:
            _LOGGER.debug("Failed to read %s", self.entity_id, exc_info=True)


# --- descriptions ---------------------------------------------------------------

type AddRule = Literal["data", "dynamic", "always"] | Callable[
    [SwitchbotDataUpdateCoordinator], bool
]
type ValueFn = Callable[[Any, Any], Any]  # (device, raw value) -> state
type SetFn = Callable[[Any, Any], Awaitable[Any]]  # (device, value)


def _raw(_device: Any, value: Any) -> Any:
    return value


@dataclass(frozen=True, kw_only=True)
class SbDescription(EntityDescription):
    """What every catalog entity description adds.

    add: when the entity is created —
      "data"     the key is in the parsed data at setup (advertisement values)
      "dynamic"  as soon as the key has a value (settings read after startup;
                 a setting the firmware lacks never shows up)
      "always"   unconditionally
      callable   ``rule(coordinator)``
    """

    platform: ClassVar[Platform]
    data_key: str | None = None  # parsed-data key, default ``key``
    uid: str = "-{key}"  # unique_id suffix; "-{channel}" appended per channel
    add: AddRule = "data"
    per_channel: bool = True  # created once per channel on multi-channel relays
    cls: type[Entity] | None = None  # default: the platform's generic class
    value_fn: ValueFn = _raw
    set_fn: SetFn | None = None
    # values the advertisement does not carry: the last value set (assumed) or
    # read over a connection (poll_fn, with cls=PolledEntity subclasses)
    assumed: bool = False
    poll_fn: Callable[[Any], Awaitable[Any]] | None = None

    @property
    def dkey(self) -> str:
        return self.data_key or self.key


@dataclass(frozen=True, kw_only=True)
class SensorDesc(SensorEntityDescription, SbDescription):
    platform: ClassVar = Platform.SENSOR


@dataclass(frozen=True, kw_only=True)
class BinaryDesc(BinarySensorEntityDescription, SbDescription):
    platform: ClassVar = Platform.BINARY_SENSOR
    device_class_fn: Callable[[Any], Any] | None = None  # (model) -> device class


@dataclass(frozen=True, kw_only=True)
class SwitchDesc(SwitchEntityDescription, SbDescription):
    platform: ClassVar = Platform.SWITCH


@dataclass(frozen=True, kw_only=True)
class SelectDesc(SelectEntityDescription, SbDescription):
    platform: ClassVar = Platform.SELECT


@dataclass(frozen=True, kw_only=True)
class NumberDesc(NumberEntityDescription, SbDescription):
    platform: ClassVar = Platform.NUMBER


@dataclass(frozen=True, kw_only=True)
class TimeDesc(TimeEntityDescription, SbDescription):
    platform: ClassVar = Platform.TIME


@dataclass(frozen=True, kw_only=True)
class ButtonDesc(ButtonEntityDescription, SbDescription):
    platform: ClassVar = Platform.BUTTON
    press_fn: Callable[[Any], Awaitable[Any]]


@dataclass(frozen=True, kw_only=True)
class EventDesc(EventEntityDescription, SbDescription):
    platform: ClassVar = Platform.EVENT
    fire_event: str | None = None  # counter events: the event a new count fires
    # history events: read the device log after a state change
    trigger_fn: Callable[[dict[str, Any]], tuple] | None = None  # watched state
    read_when: Callable[[dict[str, Any]], Any] = lambda _data: True  # after a change
    read_fn: Callable[[Any, int], Awaitable[list[dict[str, Any]]]] | None = None
    read_delay: float = 4.0
    # (entity, record, attributes): add attributes, e.g. stored credential names
    enrich_fn: Callable[[Any, dict[str, Any], dict[str, Any]], None] | None = None


@dataclass(frozen=True)
class Main:
    """The device's own entity (light, cover, lock…), unique_id = the device's."""

    platform: Platform
    cls: Callable[[SwitchbotDataUpdateCoordinator], Entity]
    key: str = ""  # catalog override key


type CatalogItem = SbDescription | Main


class DescribedEntity(SwitchbotEntity):
    """Entity driven by a catalog description."""

    entity_description: SbDescription
    _stored: Any = None

    def __init__(
        self,
        coordinator: SwitchbotDataUpdateCoordinator,
        description: SbDescription,
        channel: int | None = None,
    ) -> None:
        super().__init__(coordinator, channel)
        self.entity_description = description
        if description.assumed:
            self._attr_assumed_state = True
        suffix = description.uid.format(key=description.key, channel=channel)
        if channel is not None and "{channel}" not in description.uid:
            suffix += f"-{channel}"
        self._attr_unique_id = f"{coordinator.base_unique_id}{suffix}"

    @property
    def raw_value(self) -> Any:
        return self.parsed_data.get(self.entity_description.dkey)

    @property
    def value(self) -> Any:
        desc = self.entity_description
        if desc.assumed or desc.poll_fn:
            return self._stored
        return desc.value_fn(self._device, self.raw_value)

    @exception_handler
    async def async_write_setting(self, value: Any) -> None:
        """Send a setting to the device (the description's set_fn)."""
        desc = self.entity_description
        assert desc.set_fn is not None
        await desc.set_fn(self._device, value)
        if desc.assumed or desc.poll_fn:
            self._stored = value
        self.async_write_ha_state()


class PolledEntity(SwitchbotConnectionPolledEntity, DescribedEntity):
    """Described entity whose value is read over a connection (poll_fn)."""

    @override
    async def _async_read_value(self) -> None:
        assert self.entity_description.poll_fn is not None
        self._stored = await self.entity_description.poll_fn(self._device)


# --- engine ---------------------------------------------------------------------


def _wanted(coordinator: SwitchbotDataUpdateCoordinator, item: SbDescription, channel) -> bool:
    rule = item.add
    if rule == "always":
        return True
    if rule == "data":
        return item.dkey in coordinator.data_for(channel)
    return rule(coordinator)


@callback
def async_add_catalog_entities(
    coordinator: SwitchbotDataUpdateCoordinator,
    entry: SwitchbotConfigEntry,
    platform: Platform,
    default_cls: type[DescribedEntity] | None,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Create the entities the model's catalog lists for one platform."""
    spec: ModelSpec = coordinator.spec
    entities: list[Entity] = []
    dynamic: list[SbDescription] = []
    for item in spec.items(platform):
        if isinstance(item, Main):
            entities.append(item.cls(coordinator))
            continue
        if item.add == "dynamic":
            dynamic.append(item)
            continue
        cls = item.cls or default_cls
        channels = coordinator.channels if item.per_channel else (None,)
        entities.extend(
            cls(coordinator, item, channel)
            for channel in channels
            if _wanted(coordinator, item, channel)
        )
    async_add_entities(entities)
    if dynamic:
        _async_add_when_reported(coordinator, entry, dynamic, default_cls, async_add_entities)


@callback
def _async_add_when_reported(
    coordinator: SwitchbotDataUpdateCoordinator,
    entry: SwitchbotConfigEntry,
    pending: Iterable[SbDescription],
    default_cls: type[DescribedEntity],
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Add each entity once its key has a value (now or after a later read)."""
    waiting = {item.dkey: item for item in pending}

    @callback
    def _add_new() -> None:
        data = coordinator.device.data
        if new := [key for key in waiting if data.get(key) is not None]:
            async_add_entities(
                (waiting[key].cls or default_cls)(coordinator, waiting.pop(key))
                for key in new
            )

    _add_new()
    entry.async_on_unload(coordinator.device.subscribe(_add_new))


def platform_setup(platform: Platform, default_cls: type[DescribedEntity] | None = None):
    """``async_setup_entry`` of a platform: everything comes from the catalog."""

    async def async_setup_entry(
        hass: HomeAssistant,
        entry: SwitchbotConfigEntry,
        async_add_entities: AddConfigEntryEntitiesCallback,
    ) -> None:
        async_add_catalog_entities(
            entry.runtime_data, entry, platform, default_cls, async_add_entities
        )

    return async_setup_entry
