"""Keypad / Keypad Touch: passcodes and NFC cards (protocol: docs/keypad.md). Settings,
actions and the history are entities (catalog/keypad.py).

Passcodes are never stored in Home Assistant; only their index, name, type and
validity (storage.py, sections "passcodes" and "cards").
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from datetime import UTC, datetime
import time
from typing import Any

from homeassistant.components import websocket_api
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant, callback
import voluptuous as vol

from ..entity import ButtonDesc
from ..sbble.devices.keypads.keypad_base import KeypadBase
from ..storage import entry_store
from . import WS, entry_command, loaded_entries, notify, subscribe_entries

PUBLIC_KEYS = (
    "battery", "battery_charging", "firmware", "lockout", "passcode_locked_out",
    "nfc_locked_out", "fingerprint_locked_out", "tamper_alarm", "duress_alarm",
    "keypad_enabled", "tamper_alarm_enabled", "sound_enabled", "backlight_mode",
    "backlight_level", "lock_button_mode", "lock_button_time", "passcodes_count",
    "nfc_cards_count", "supports_fingerprint",
)


def is_keypad(entry: ConfigEntry) -> bool:
    return isinstance(entry.runtime_data.device, KeypadBase)


def _payload(hass: HomeAssistant, entry: ConfigEntry) -> dict[str, Any]:
    coordinator, store = entry.runtime_data, entry_store(hass)
    data = coordinator.device.data
    return {
        "entry_id": entry.entry_id,
        "name": coordinator.device_name,
        "model": coordinator.model.value,
        "available": bool(getattr(coordinator, "available", True)),
        "state": {k: data[k] for k in PUBLIC_KEYS if k in data},
        "passcodes": store.section(entry.entry_id, "passcodes"),
        "cards": store.section(entry.entry_id, "cards"),
    }


def _ts(value: Any) -> int | None:
    """Unix seconds or an ISO date-time (local time of the HA host when naive)."""
    if value in (None, ""):
        return None
    if isinstance(value, (int, float)):
        return int(value)
    moment = datetime.fromisoformat(str(value))
    return int((moment if moment.tzinfo else moment.astimezone()).timestamp())


def _iso(ts: int | None) -> str | None:
    return None if ts is None else datetime.fromtimestamp(ts, tz=UTC).isoformat()


def _button(entry: ConfigEntry, key: str) -> ButtonDesc:
    """The catalog button behind a panel action (one definition of each action)."""
    for item in entry.runtime_data.spec.items(Platform.BUTTON):
        if isinstance(item, ButtonDesc) and item.key == key:
            return item
    raise ValueError(f"unknown action {key}")


# --- operations: (hass, entry, keypad, data) -> result ------------------------------

type Op = Callable[[HomeAssistant, ConfigEntry, KeypadBase, dict], Awaitable[Any]]
OPS: dict[str, Op] = {}
LOCAL_OPS = {"rename"}  # store only, no Bluetooth


def op(func: Op) -> Op:
    OPS[func.__name__.lstrip("_")] = func
    return func


def _store(hass: HomeAssistant, entry: ConfigEntry, kind: str, index: int, item) -> None:
    entry_store(hass).async_set(entry.entry_id, kind, index, item)


def _meta(data: dict, kind: str, start: int | None, end: int | None) -> dict[str, Any]:
    item = {"name": str(data.get("name") or "").strip()[:40], "type": kind,
            "start": _iso(start), "end": _iso(end), "created": _iso(int(time.time()))}
    return item | {k: data[k] for k in ("weekdays", "begin_minute", "end_minute") if k in data}




@op
async def _action(hass, entry, dev, data):
    if data["action"] == "cancel_fingerprint_lockout":  # Touch only, no button entity
        return await dev.cancel_lockout("fingerprint")
    await _button(entry, data["action"]).press_fn(dev)


@op
async def _add_passcode(hass, entry, dev, data):
    kind = data.get("type", "permanent")
    start, end = _ts(data.get("start")), _ts(data.get("end"))
    if kind != "permanent" or start or end:
        await dev.sync_time()  # time windows are checked against the keypad clock
    if kind == "periodic":
        index = await dev.add_periodic_passcode(
            str(data["code"]), list(data["weekdays"]), int(data["begin_minute"]),
            int(data["end_minute"]), start, end,
        )
    else:
        if kind in ("time_limited", "one_time") and not end:
            raise ValueError("this passcode type needs an end time")
        index = await dev.add_passcode(str(data["code"]), kind, start, end)
    _store(hass, entry, "passcodes", index, _meta(data, kind, start, end))
    return {"index": index}


@op
async def _delete_passcode(hass, entry, dev, data):
    await dev.delete_passcode(index := int(data["index"]))
    _store(hass, entry, "passcodes", index, None)



@op
async def _rename(hass, entry, dev, data):
    """Name a credential, also one created in the SwitchBot app."""
    kind, index = data["kind"], int(data["index"])
    item = entry_store(hass).section(entry.entry_id, kind).get(str(index)) or {"type": "unknown"}
    _store(hass, entry, kind, index, item | {"name": str(data.get("name") or "").strip()[:40]})




@op
async def _nfc_start(hass, entry, dev, data):
    kind = data.get("type", "permanent")
    if kind == "time_limited":
        await dev.sync_time()
    return {"index": await dev.nfc_start_enroll(kind)}


@op
async def _nfc_status(hass, entry, dev, data):
    return {"status": await dev.nfc_enroll_status()}


@op
async def _nfc_finish(hass, entry, dev, data):
    index, kind = int(data["index"]), data.get("type", "permanent")
    start, end = _ts(data.get("start")), _ts(data.get("end"))
    if kind == "time_limited":
        if not end:
            raise ValueError("time-limited card needs an end time")
        await dev.nfc_set_validity(index, start or int(time.time()), end)
    await dev.nfc_confirm(index)
    _store(hass, entry, "cards", index, _meta(data, kind, start, end))
    return {"index": index}


@op
async def _nfc_delete(hass, entry, dev, data):
    await dev.nfc_delete(index := int(data["index"]))
    _store(hass, entry, "cards", index, None)



# --- websocket ---------------------------------------------------------------------


@websocket_api.websocket_command({vol.Required("type"): f"{WS}/keypad/subscribe"})
@websocket_api.require_admin
@callback
def ws_subscribe(hass: HomeAssistant, connection, msg: dict) -> None:
    subscribe_entries(connection, msg, loaded_entries(hass, is_keypad), "keypads",
                      lambda entry: _payload(hass, entry))


@entry_command("keypad/op", {
    vol.Required("op"): vol.In(tuple(OPS)),
    vol.Optional("data", default={}): dict,
}, is_keypad)
async def ws_op(hass: HomeAssistant, entry: ConfigEntry, msg: dict) -> dict:
    result = await OPS[msg["op"]](hass, entry, entry.runtime_data.device, msg["data"])
    if msg["op"] in LOCAL_OPS:
        notify(entry)  # push the new names to the subscribers
    return {"result": result, "keypad": _payload(hass, entry)}


COMMANDS = (ws_subscribe, ws_op)
