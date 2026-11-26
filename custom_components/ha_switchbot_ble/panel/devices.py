"""``devices``: every loaded device with the panel features it supports."""

from __future__ import annotations

from typing import Any

from homeassistant.components import websocket_api
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import device_registry as dr
import voluptuous as vol

from ..sbble import MODELS as LIBRARY_MODELS, Model
from ..storage import OFFSET_KEYS
from . import WS, loaded_entries
from .covers import is_calibratable_cover
from .keypad import is_keypad
from .locks import LOCK_TYPE_EUROPE, is_calibratable_lock
from .sensors import has_correction, supports_device_calibration

OFFSET_LIMITS = {k: [lo, hi] for k, (lo, hi, _) in OFFSET_KEYS.items()}


def _kind(entry: ConfigEntry) -> str:
    """Group in the panel's device list."""
    coordinator = entry.runtime_data
    platforms = set(coordinator.spec.platforms)
    for kind, matches in (
        ("lock", is_calibratable_lock(entry)),
        ("keypad", is_keypad(entry)),
        ("sensor", has_correction(entry)),
        ("plug", "plug" in coordinator.model.value.lower()),
        # a relay with a door sensor: listed with the switches, not the covers
        ("switch", coordinator.model is Model.GARAGE_DOOR_OPENER),
        ("cover", Platform.COVER in platforms),
        ("appliance", bool(platforms & {Platform.VACUUM, Platform.HUMIDIFIER,
                                        Platform.CLIMATE, Platform.FAN})),
        ("light", Platform.LIGHT in platforms),
        ("switch", Platform.SWITCH in platforms),
        ("sensor", platforms <= {Platform.SENSOR, Platform.BINARY_SENSOR, Platform.EVENT}),
    ):
        if matches:
            return kind
    return "other"


def _device(entry: ConfigEntry, devices: dr.DeviceRegistry) -> dict[str, Any]:
    coordinator = entry.runtime_data
    device = next(iter(dr.async_entries_for_config_entry(devices, entry.entry_id)), None)
    model, kind = coordinator.model, _kind(entry)
    return {
        "entry_id": entry.entry_id,
        "device_id": device.id if device else None,
        "name": coordinator.device_name,
        "model": model.value,
        # product name as the app shows it ("Keypad Touch"), not the library id ("WoKeypadTouch")
        "model_name": info.name if (info := LIBRARY_MODELS.get(model)) else model.value,
        "address": coordinator.ble_device.address,
        "available": bool(getattr(coordinator, "available", True)),
        "kind": kind,
        "features": {
            "correction": has_correction(entry),
            "device_calibration": supports_device_calibration(entry),
            "lock_calibration": is_calibratable_lock(entry),
            # Partially-Lock: Lock Ultra / Ultra Max with an EU lock type (as in the app);
            # unknown lock type: the wizard checks the live status
            "half_lock": model in (Model.LOCK_ULTRA, Model.LOCK_ULTRA_MAX)
            and coordinator.device.data.get("lock_type") in (None, LOCK_TYPE_EUROPE),
            # automatic calibration: the Lock 2 family only (auto record steps)
            "auto_calibration": model in (Model.LOCK_ULTRA, Model.LOCK_ULTRA_MAX),
            "keypad": kind == "keypad",
            "cover_calibration": is_calibratable_cover(entry),
        },
    }


@websocket_api.websocket_command({vol.Required("type"): f"{WS}/panel/devices"})
@websocket_api.require_admin
@callback
def ws_devices(hass: HomeAssistant, connection, msg: dict) -> None:
    devices = dr.async_get(hass)
    connection.send_result(msg["id"], {
        "devices": [_device(e, devices) for e in loaded_entries(hass)],
        "offset_limits": OFFSET_LIMITS,
    })


@websocket_api.websocket_command({vol.Required("type"): f"{WS}/panel/info"})
@websocket_api.require_admin
@callback
def ws_info(hass: HomeAssistant, connection, msg: dict) -> None:
    connection.send_result(msg["id"], {
        "sensors": len(loaded_entries(hass, has_correction)),
        "locks": len(loaded_entries(hass, is_calibratable_lock)),
        "keypads": len(loaded_entries(hass, is_keypad)),
        "offset_limits": OFFSET_LIMITS,
    })


COMMANDS = (ws_devices, ws_info)
