"""Lock calibration (Lock, Lock Lite, Lock Pro, Ultra, Ultra Max).

The panel runs the app's step machine (docs/lock-calibration.md,
lock2-calibration.md, lockpro-calibration.md); this side offers the primitives. While the panel
watches a lock it is polled every POLL_INTERVAL s, which keeps the link up;
when the panel goes away mid-calibration the lock gets ``recover``, so it keeps
its previous calibration (a Lock Ultra Max in half-lock calibration gets
``half_lock_complete`` instead). Leaving a calibration ends like in the app:
``recover``, notifications off, status read.
"""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.components import websocket_api
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
import voluptuous as vol

from ..coordinator import BLE_ERRORS
from ..sbble import LockStatus, Model
from ..sbble.devices.locks.lock2 import LOCK2_CALIBRATION
from ..sbble.devices.locks.lock_base import CLASSIC_CALIBRATION, CalibratedLock
from . import WS, entry_command, find_entry, loaded_entries
from .live import LiveSession, live_session, subscribe_live

_LOGGER = logging.getLogger(__name__)

POLL_INTERVAL = 2.0
STATUS_KEYS = (
    "calibration", "auto_calibration_done", "half_lock_calibration",
    "half_lock_calibration_done", "half_lock_enabled", "door_open", "knob_angle",
    "lock_type", "latch_state", "battery", "battery_charging", "power_alarm",
    "on_backup_battery", "magnetic_position_alarm", "battery_status", "rotation_direction",
    "latch_type", "self_adjusting",  # Lock (gen 1) / Lock Lite
)
LOCK_TYPE_EUROPE = 1  # status lock_type of an EU lock
HALF_LOCK_STEPS = ("half_lock_set_and_test", "half_lock_start", "half_lock_complete",
                   "half_lock_enable")


async def _ok(awaitable) -> bool:
    await awaitable
    return True


STEPS = {  # actions beside the lock's calibration_steps
    "set_latch": lambda dev, msg: dev.set_calibration_latch(msg.get("has_latch", False)),
    "lock": lambda dev, _msg: dev.lock(),
    "unlock": lambda dev, _msg: dev.unlock_without_unlatch(),
    "notify": lambda dev, _msg: _ok(dev.enable_notifications()),
    "notify_off": lambda dev, _msg: _ok(dev.disable_notifications()),
    # after a confirmed half-lock position the app turns Partially-Lock on
    "half_lock_enable": lambda dev, _msg: _ok(dev.set_half_lock_enabled(True)),
}


def is_calibratable_lock(entry: ConfigEntry) -> bool:
    return isinstance(entry.runtime_data.device, CalibratedLock)


def _session(hass: HomeAssistant, entry_id: str) -> LiveSession:
    return live_session(hass, "calibration", entry_id)


async def _leave(device: CalibratedLock, session: LiveSession) -> bool:
    """Leave the calibration the wizard is in, as the app does when going back.

    Half-lock calibration of a Lock Ultra Max: ``half_lock_complete``. Otherwise
    ``recover`` (restores the previous calibration), then notifications off and a status read.
    """
    if session.extra.pop("half_lock", False):
        return await device.calibration_command("half_lock_complete")
    ok = await device.calibration_command("recover")
    try:
        await device.disable_notifications()
        await device.refresh_status()
    except BLE_ERRORS as err:
        _LOGGER.debug("%s: after leaving the calibration: %s", device.name, err)
    return ok


def _status(entry: ConfigEntry) -> dict[str, Any]:
    coordinator = entry.runtime_data
    data = coordinator.device.data
    status = data.get("status")
    known = isinstance(status, LockStatus)
    return {
        "available": bool(getattr(coordinator, "available", True)),
        "lock_state": status.value if known else None,
        "lock_state_name": status.name.lower() if known else None,
        "firmware": data.get("firmware"),
        "rssi": coordinator.device.rssi,
        **{key: data.get(key) for key in STATUS_KEYS},
    }


@websocket_api.websocket_command({vol.Required("type"): f"{WS}/calibration/locks"})
@websocket_api.require_admin
@callback
def ws_locks(hass: HomeAssistant, connection, msg: dict) -> None:
    connection.send_result(msg["id"], [
        {
            "entry_id": e.entry_id,
            "name": e.runtime_data.device_name,
            "model": e.runtime_data.model.value,
            "address": e.runtime_data.ble_device.address,
            "half_lock": e.runtime_data.model in (Model.LOCK_ULTRA, Model.LOCK_ULTRA_MAX)
            and e.runtime_data.device.data.get("lock_type") in (None, LOCK_TYPE_EUROPE),
            # only the Lock 2 family has the automatic calibration (auto record steps)
            "auto_calibration": e.runtime_data.model in (Model.LOCK_ULTRA, Model.LOCK_ULTRA_MAX),
        }
        for e in loaded_entries(hass, is_calibratable_lock)
    ])


@websocket_api.websocket_command(
    {vol.Required("type"): f"{WS}/calibration/subscribe", vol.Required("entry_id"): str}
)
@websocket_api.require_admin
@callback
def ws_subscribe(hass: HomeAssistant, connection, msg: dict) -> None:
    """Live lock status; the lock is polled while anyone watches it."""
    entry = find_entry(hass, msg["entry_id"], is_calibratable_lock, connection, msg["id"])
    if entry is None:
        return
    device, session = entry.runtime_data.device, _session(hass, entry.entry_id)
    subscribe_live(
        hass, connection, msg, entry, session,
        payload=lambda: {"status": _status(entry), "started": session.started},
        poll=device.refresh_status,  # 0x8107: keeps the link up, angle and state fresh
        recover=lambda: _leave(device, session),
        interval=POLL_INTERVAL,
    )


@entry_command("calibration/action", {
    vol.Required("action"): vol.In(
        (*LOCK2_CALIBRATION, *CLASSIC_CALIBRATION, *STEPS, "refresh", "leave")
    ),
    vol.Optional("has_latch"): bool,
}, is_calibratable_lock)
async def ws_action(hass: HomeAssistant, entry: ConfigEntry, msg: dict) -> dict:
    """Run one calibration step."""
    device: CalibratedLock = entry.runtime_data.device
    session, action = _session(hass, entry.entry_id), msg["action"]
    _LOGGER.info("%s: calibration action %s", entry.title, action)
    if action in HALF_LOCK_STEPS and device.data.get("lock_type") != LOCK_TYPE_EUROPE:
        # the app offers Partially-Lock only on EU locks
        raise ValueError(f"{entry.title}: half lock needs an EU lock")
    async with session.busy:
        if action == "refresh":
            await device.refresh_status()
            ok = True
        elif action == "leave":
            ok = await _leave(device, session)
            session.started = False
        elif action in STEPS:
            ok = await STEPS[action](device, msg)
        else:
            ok = await device.calibration_command(action)
            if ok and action in ("start", "half_lock_start"):
                session.started = True
                session.extra["half_lock"] = action == "half_lock_start"
            elif action in ("complete", "recover", "half_lock_complete"):
                session.started = False
                session.extra.pop("half_lock", None)
    return {"success": bool(ok), "status": _status(entry)}


COMMANDS = (ws_locks, ws_subscribe, ws_action)
