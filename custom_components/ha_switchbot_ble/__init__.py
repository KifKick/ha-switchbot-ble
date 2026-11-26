"""SwitchBot BLE (extended): SwitchBot devices over Bluetooth, described by catalog/."""

from __future__ import annotations

import logging

from bleak_retry_connector import close_stale_connections_by_address
from homeassistant.components import bluetooth
from homeassistant.components.bluetooth import BluetoothReachabilityIntent
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_ADDRESS, CONF_NAME, CONF_PASSWORD, CONF_SENSOR_TYPE
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ConfigEntryNotReady
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.typing import ConfigType
from homeassistant.loader import async_get_integration

from .catalog import spec_for
from .const import CONF_ENCRYPTION_KEY, CONF_KEY_ID, CONF_RETRY_COUNT, DOMAIN
from .coordinator import SwitchbotConfigEntry, SwitchbotDataUpdateCoordinator
from .migration import async_finish_import
from .panel import async_ensure_panel, async_setup_panel
from .services import async_setup_services
from .storage import async_setup_store, entry_store

_LOGGER = logging.getLogger(__name__)
CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    async_setup_services(hass)
    await async_setup_store(hass)
    await async_setup_panel(hass)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: SwitchbotConfigEntry) -> None:
    spec = spec_for(entry.data[CONF_SENSOR_TYPE])
    address: str = entry.data[CONF_ADDRESS]
    connectable = spec.connectable and not spec.passive
    await close_stale_connections_by_address(address)

    if not (ble_device := bluetooth.async_ble_device_from_address(hass, address.upper(), connectable)):
        raise ConfigEntryNotReady(
            translation_domain=DOMAIN,
            translation_key="device_not_found_error",
            translation_placeholders={
                "sensor_type": spec.type,
                "address": address,
                "reason": bluetooth.async_address_reachability_diagnostics(
                    hass, address.upper(),
                    BluetoothReachabilityIntent.CONNECTION if connectable
                    else BluetoothReachabilityIntent.PASSIVE_ADVERTISEMENT,
                ),
            },
        )

    retry = entry.options[CONF_RETRY_COUNT]
    if spec.encrypted:
        try:
            device = spec.device_cls(
                ble_device, key_id=entry.data.get(CONF_KEY_ID) or "",
                encryption_key=entry.data.get(CONF_ENCRYPTION_KEY) or "", retry_count=retry,
            )
        except ValueError as error:
            raise ConfigEntryNotReady(
                translation_domain=DOMAIN, translation_key="value_error",
                translation_placeholders={"error": str(error)},
            ) from error
    else:
        device = spec.device_cls(ble_device, password=entry.data.get(CONF_PASSWORD),
                                 retry_count=retry)

    coordinator = entry.runtime_data = SwitchbotDataUpdateCoordinator(
        hass, _LOGGER, ble_device, device, entry.unique_id,
        entry.data.get(CONF_NAME, entry.title), connectable, spec.model, entry, spec,
    )
    entry.async_on_unload(coordinator.async_start())
    if not await coordinator.async_wait_ready():
        raise ConfigEntryNotReady(
            translation_domain=DOMAIN, translation_key="advertising_state_error",
            translation_placeholders={"address": address},
        )

    await async_finish_import(hass, entry)
    entry.async_on_unload(entry.add_update_listener(_async_update_listener))
    await hass.config_entries.async_forward_entry_setups(entry, spec.platforms)
    coordinator.async_start_settings_refresh()
    integration = await async_get_integration(hass, DOMAIN)
    await async_ensure_panel(hass, str(integration.version))


async def _async_update_listener(hass: HomeAssistant, entry: ConfigEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: SwitchbotConfigEntry) -> None:
    await hass.config_entries.async_unload_platforms_or_raise(
        entry, spec_for(entry.data[CONF_SENSOR_TYPE]).platforms
    )


async def async_remove_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Drop what Home Assistant kept for the device (offsets, keypad names)."""
    entry_store(hass).async_remove_entry(entry.entry_id)
