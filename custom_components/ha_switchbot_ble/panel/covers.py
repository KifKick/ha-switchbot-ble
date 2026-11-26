"""Cover calibration: Curtain 3, Curtain Track 4, Roller Shade, Blind Tilt.

The panel runs the app's wizards (docs/curtain-3.md, curtain-track-4.md,
roller-shade.md, blind-tilt.md, sections "Calibration"); this side offers the
device's calibration steps, a few reads and a live status polled every second
(as the app does). A wizard left half-way — cancel, panel closed, websocket
gone — sends the model's exit frames.
"""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.components import websocket_api
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
import voluptuous as vol

from ..sbble.devices.covers.cover_base import CoverBase
from . import WS, entry_command, find_entry
from .live import LiveSession, live_session, subscribe_live

_LOGGER = logging.getLogger(__name__)

POLL_INTERVAL = 1.0
STATUS_KEYS = (
    "battery", "firmware", "calibration", "position", "tilt", "motion", "motion_status",
    "move_state", "motor_stop_reason", "stuck", "mount_type", "slat_direction",
    "roll_direction", "logo_outside", "solar_panel", "extended_battery_installed",
    "calibration_step", "calibration_next", "calibration_exited", "calibration_wrong_way",
    "magnet_detected", "calibration_distance", "last_calibration_auto", "chain_length",
)
STARTS = {"start", "start_auto", "start_manual", "start_new_auto", "smart_correction",
          "route_start"}
ENDS = {"exit", "complete", "route_confirm"}
READS = ("distance", "last_auto", "magnet", "state")


def is_calibratable_cover(entry: ConfigEntry) -> bool:
    device = entry.runtime_data.device
    return isinstance(device, CoverBase) and bool(device.__class__.calibration_steps)


def _session(hass: HomeAssistant, entry_id: str) -> LiveSession:
    return live_session(hass, "cover_calibration", entry_id)


def _status(entry: ConfigEntry) -> dict[str, Any]:
    coordinator = entry.runtime_data
    device: CoverBase = coordinator.device
    data = device.data
    return {
        "available": bool(getattr(coordinator, "available", True)),
        "rssi": device.rssi,
        "new_auto": getattr(device, "supports_new_auto", lambda: False)(),
        "steps": sorted(device.calibration_steps),
        **{key: data.get(key) for key in STATUS_KEYS},
    }


@websocket_api.websocket_command(
    {vol.Required("type"): f"{WS}/covers/subscribe", vol.Required("entry_id"): str}
)
@websocket_api.require_admin
@callback
def ws_subscribe(hass: HomeAssistant, connection, msg: dict) -> None:
    """Live cover status; the cover is polled every second while anyone watches it."""
    entry = find_entry(hass, msg["entry_id"], is_calibratable_cover, connection, msg["id"])
    if entry is None:
        return
    device: CoverBase = entry.runtime_data.device
    session = _session(hass, entry.entry_id)
    subscribe_live(
        hass, connection, msg, entry, session,
        payload=lambda: {"status": _status(entry), "started": session.started},
        poll=device.calibration_poll,
        recover=device.calibration_abort,
        interval=POLL_INTERVAL,
    )


@entry_command("covers/action", {
    vol.Optional("action"): str,
    vol.Optional("value"): vol.Coerce(int),
    vol.Optional("read"): vol.In(READS),
}, is_calibratable_cover)
async def ws_action(hass: HomeAssistant, entry: ConfigEntry, msg: dict) -> dict:
    """One calibration step (``action`` [+ ``value``]), a read, or ``finished``/``abort``."""
    device: CoverBase = entry.runtime_data.device
    session = _session(hass, entry.entry_id)
    action, result, ok = msg.get("action"), None, True
    async with session.busy:
        if (what := msg.get("read")) is not None:
            result = await device.calibration_read(what)  # type: ignore[attr-defined]
        elif action == "abort":
            await device.calibration_abort()
            session.started = False
        elif action == "finished":  # an auto run ended: the robot saved it, no frame
            session.started = False
        elif action == "poll":
            await device.calibration_poll()
        elif action is not None:
            _LOGGER.info("%s: calibration step %s %s", entry.title, action, msg.get("value", ""))
            ok = await device.calibration_command(action, msg.get("value"))
            if ok and action in STARTS:
                session.started = True
            elif action in ENDS:
                session.started = False
    return {"success": bool(ok), "result": result, "status": _status(entry)}


COMMANDS = (ws_subscribe, ws_action)
