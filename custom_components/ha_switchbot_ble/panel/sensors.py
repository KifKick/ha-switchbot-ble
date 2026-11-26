"""Sensor correction: offsets kept in Home Assistant, or the compensation stored in
the sensor itself (Indoor/Outdoor Thermo-Hygrometer, written over Bluetooth)."""

from __future__ import annotations

from typing import Any

from homeassistant.components import websocket_api
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import entity_registry as er
import voluptuous as vol

from ..const import DOMAIN
from ..sbble.devices.sensors.thermo_hygrometer_base import ThermoHygrometer
from ..storage import OFFSET_KEYS, entry_store
from . import WS, entry_command, loaded_entries, notify, panel_data, subscribe_entries


def has_correction(entry: ConfigEntry) -> bool:
    data = entry.runtime_data.device.data
    return any(key in data for key in OFFSET_KEYS)


def supports_device_calibration(entry: ConfigEntry) -> bool:
    coordinator = entry.runtime_data
    return bool(coordinator.connectable) and isinstance(
        coordinator.device, ThermoHygrometer
    )


def _payload(hass: HomeAssistant, entry: ConfigEntry) -> dict[str, Any]:
    coordinator, store = entry.runtime_data, entry_store(hass)
    data = coordinator.device.data
    registry = er.async_get(hass)
    values = {
        key: {
            "raw": data.get(key),
            "offset": store.offset(entry.entry_id, key),
            "entity_id": registry.async_get_entity_id(
                "sensor", DOMAIN, f"{coordinator.base_unique_id}-{key}"
            ),
        }
        for key in OFFSET_KEYS
        if key in data
    }
    return {
        "entry_id": entry.entry_id,
        "name": coordinator.device_name,
        "model": coordinator.model.value,
        "available": bool(getattr(coordinator, "available", True)),
        "values": values,
        "device_calibration": supports_device_calibration(entry),
        # last compensation read from the sensor (None until read)
        "device_calibration_value": panel_data(hass).get("devcal", {}).get(entry.entry_id),
    }


@websocket_api.websocket_command({vol.Required("type"): f"{WS}/sensors/subscribe"})
@websocket_api.require_admin
@callback
def ws_subscribe(hass: HomeAssistant, connection, msg: dict) -> None:
    subscribe_entries(connection, msg, loaded_entries(hass, has_correction), "sensors",
                      lambda entry: _payload(hass, entry))


@entry_command("sensors/set_offset", {
    vol.Required("key"): vol.In(tuple(OFFSET_KEYS)),
    vol.Required("offset"): vol.Coerce(float),
})
async def ws_set_offset(hass: HomeAssistant, entry: ConfigEntry, msg: dict) -> dict:
    stored = entry_store(hass).async_set_offset(entry.entry_id, msg["key"], msg["offset"])
    notify(entry)  # the entities show the new offset at once
    return {"offset": stored, "sensor": _payload(hass, entry)}


@entry_command("sensors/device_calibration", {
    vol.Optional("action", default="read"): vol.In(("read", "set", "reset")),
    vol.Optional("temperature"): vol.Coerce(float),
    vol.Optional("humidity"): vol.Coerce(int),
}, supports_device_calibration)
async def ws_device_calibration(hass: HomeAssistant, entry: ConfigEntry, msg: dict) -> dict:
    """Read or change the compensation stored in the sensor (no HA offset involved)."""
    device: ThermoHygrometer = entry.runtime_data.device
    if msg["action"] == "reset":
        calibration = await device.set_calibration(0.0, 0)
    else:
        calibration = await device.get_calibration()
        if msg["action"] == "set":
            calibration = await device.set_calibration(
                msg.get("temperature", calibration.temperature),
                msg.get("humidity", calibration.humidity),
            )
    panel_data(hass).setdefault("devcal", {})[entry.entry_id] = calibration.as_dict()
    return {"calibration": calibration.as_dict(), "sensor": _payload(hass, entry)}


COMMANDS = (ws_subscribe, ws_set_offset, ws_device_calibration)
