"""The "SwitchBot" sidebar panel: registration and the websocket API plumbing.

Frontend source in ``frontend-src/``, bundle in ``frontend/switchbot-panel.js``.
Commands are ``<WS>/...``; each feature module registers its own:

* devices.py      device list (the panel starts from it)
* sensors.py      sensor correction: offsets in HA, or calibration in the sensor
* locks.py        lock calibration wizard primitives
* covers.py       curtain / roller shade / blind tilt calibration primitives
* live.py         live status + polling while a wizard watches a device
* keypad.py       keypad passcodes, NFC cards, settings
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable, Iterable
import functools
import hashlib
import logging
from pathlib import Path
from typing import Any

from homeassistant.components import panel_custom, websocket_api
from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry, ConfigEntryState
from homeassistant.core import HomeAssistant, callback
import voluptuous as vol

from ..const import DOMAIN
from ..coordinator import BLE_ERRORS

_LOGGER = logging.getLogger(__name__)

WS = DOMAIN  # command prefix the panel uses
STATIC_URL = f"/{DOMAIN}_static"
BUNDLE = "switchbot-panel.js"
ICONS = "icons.js"  # icon set "switchbot-ble" (sidebar icon), loaded on every page
DATA_PANEL = f"{DOMAIN}_panel"

type EntryFilter = Callable[[ConfigEntry], bool]
type Handler = Callable[[HomeAssistant, ConfigEntry, dict[str, Any]], Awaitable[Any]]


def loaded_entries(hass: HomeAssistant, wanted: EntryFilter | None = None) -> list[ConfigEntry]:
    return [
        e for e in hass.config_entries.async_entries(DOMAIN)
        if e.state is ConfigEntryState.LOADED and (wanted is None or wanted(e))
    ]


def find_entry(hass: HomeAssistant, entry_id: str, wanted: EntryFilter | None = None,
               connection=None, msg_id: int | None = None) -> ConfigEntry | None:
    """The loaded entry; when missing, the websocket error is sent if a connection is given."""
    entry = next((e for e in loaded_entries(hass, wanted) if e.entry_id == entry_id), None)
    if entry is None and connection is not None:
        connection.send_error(msg_id, "not_found", "Device not found or not loaded")
    return entry


def panel_data(hass: HomeAssistant) -> dict[str, Any]:
    """Runtime state of the panel (not persisted)."""
    return hass.data.setdefault(DATA_PANEL, {})


def entry_command(name: str, schema: dict, wanted: EntryFilter | None = None):
    """A command on one loaded entry (``entry_id``) that may talk to the device.

    The handler's return value is the result; bad input and device errors
    become websocket errors.
    """

    def decorate(handler: Handler):
        @websocket_api.websocket_command(
            {vol.Required("type"): f"{WS}/{name}", vol.Required("entry_id"): str, **schema}
        )
        @websocket_api.require_admin
        @websocket_api.async_response
        @functools.wraps(handler)
        async def command(hass: HomeAssistant, connection, msg: dict) -> None:
            if (entry := find_entry(hass, msg["entry_id"], wanted, connection, msg["id"])) is None:
                return
            try:
                result = await handler(hass, entry, msg)
            except (KeyError, TypeError, ValueError) as err:
                connection.send_error(msg["id"], "invalid", f"{type(err).__name__}: {err}")
            except BLE_ERRORS as err:
                _LOGGER.warning("%s: %s failed: %s", entry.title, name, err)
                connection.send_error(msg["id"], "device_error", str(err))
            else:
                connection.send_result(msg["id"], result)

        return command

    return decorate


@callback
def subscribe_entries(
    connection, msg: dict, entries: Iterable[ConfigEntry], key: str,
    payload: Callable[[ConfigEntry], dict[str, Any]],
) -> None:
    """Send ``{key: [payload…], full: True}`` now, then one payload per device update."""
    entries = list(entries)

    def _pusher(entry: ConfigEntry):
        return lambda: connection.send_message(
            websocket_api.event_message(msg["id"], {key: [payload(entry)]})
        )

    unsubs = [e.runtime_data.device.subscribe(_pusher(e)) for e in entries]
    connection.subscriptions[msg["id"]] = lambda: [unsub() for unsub in unsubs]
    connection.send_result(msg["id"])
    connection.send_message(websocket_api.event_message(
        msg["id"], {key: [payload(e) for e in entries], "full": True}
    ))


def notify(entry: ConfigEntry) -> None:
    """Re-render the device's entities and panel subscribers (no new data)."""
    entry.runtime_data.device.notify()


async def _digest(hass: HomeAssistant, name: str) -> str:
    """Short hash of a frontend file, for cache-busting URLs."""
    path = Path(__file__).parent.parent / "frontend" / name
    return await hass.async_add_executor_job(
        lambda: hashlib.sha256(path.read_bytes()).hexdigest()[:10]
    )


async def async_setup_panel(hass: HomeAssistant) -> None:
    """Static files and websocket commands (once, at integration setup)."""
    from . import covers, devices, keypad, locks, sensors

    await hass.http.async_register_static_paths(
        [StaticPathConfig(STATIC_URL, str(Path(__file__).parent.parent / "frontend"), False)]
    )
    add_extra_js_url(hass, f"{STATIC_URL}/{ICONS}?v={await _digest(hass, ICONS)}")
    for module in (devices, sensors, locks, covers, keypad):
        for command in module.COMMANDS:
            websocket_api.async_register_command(hass, command)


async def async_ensure_panel(hass: HomeAssistant, version: str) -> None:
    """Add the sidebar panel once a device is set up."""
    if panel_data(hass).get("registered"):
        return
    panel_data(hass)["registered"] = True
    # cache-busted by the bundle's content, so a new build always gets a new URL
    digest = await _digest(hass, BUNDLE)
    await panel_custom.async_register_panel(
        hass,
        frontend_url_path="switchbot",
        webcomponent_name="switchbot-panel",
        module_url=f"{STATIC_URL}/{BUNDLE}?v={version}-{digest}",
        sidebar_title="SwitchBot",
        sidebar_icon="switchbot-ble:logo",
        require_admin=True,
        config={},
    )
