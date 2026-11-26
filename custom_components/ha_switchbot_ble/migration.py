"""Taking a device over from Home Assistant's built-in SwitchBot integration.

The config flow copies the core entry (address, model, keys, options) and
unloads it; on the first setup the entities and the device move to the new
entry with their entity_ids, so history and automations keep working, and the
core entry is removed.
"""

from __future__ import annotations

import logging

from homeassistant.config_entries import ConfigEntry, ConfigEntryState
from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr, entity_registry as er

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

CORE_DOMAIN = "switchbot"
CONF_IMPORT_FROM = "import_from"


def importable_core_entries(hass: HomeAssistant) -> list[ConfigEntry]:
    """Core SwitchBot entries whose device is not set up here yet."""
    ours = {e.unique_id for e in hass.config_entries.async_entries(DOMAIN)}
    return [
        e for e in hass.config_entries.async_entries(CORE_DOMAIN)
        if e.unique_id not in ours and e.version == 2
    ]


async def async_finish_import(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Move entities and the device of the imported core entry to ``entry``."""
    if not (core_id := entry.data.get(CONF_IMPORT_FROM)):
        return
    core = hass.config_entries.async_get_entry(core_id)
    if core is not None and core.state is ConfigEntryState.LOADED:
        await hass.config_entries.async_unload(core_id)
    entities, devices = er.async_get(hass), dr.async_get(hass)
    for item in er.async_entries_for_config_entry(entities, core_id):
        entities.async_update_entity_platform(
            item.entity_id, DOMAIN, new_config_entry_id=entry.entry_id
        )
    for device in dr.async_entries_for_config_entry(devices, core_id):
        devices.async_update_device(device.id, new_config_entry_id=entry.entry_id)
    if core is not None:
        await hass.config_entries.async_remove(core_id)
    hass.config_entries.async_update_entry(
        entry, data={k: v for k, v in entry.data.items() if k != CONF_IMPORT_FROM}
    )
    _LOGGER.info("%s: taken over from the built-in SwitchBot integration", entry.title)
