"""Keypads. Keypad / Keypad Touch: settings, actions, history; protocol in docs/keypad.md.

Passcode and NFC card management is in panel/keypad.py (the panel's Keypad tab).
"""

from __future__ import annotations

from typing import Any

from homeassistant.components.binary_sensor import BinarySensorDeviceClass as B

from ..button import refresh_button
from ..entity import ButtonDesc, EventDesc
from ..event import HistoryEvent
from ..sbble import Model as M
from ..sbble.devices.keypads.keypad_base import BACKLIGHT_MODES, LOCK_BUTTON_MODES, KeypadBase
from ..sbble.devices.keypads.keypad_history import KEYPAD_EVENT_TYPES
from ..storage import entry_store
from .base import (
    CONFIG,
    ModelSpec,
    binary,
    charging,
    diag,
    dynamic,
    keyed,
    problem,
    setting_number,
    setting_select,
    setting_switch,
)

# --- status from the advertisement, shared with the common set ---------------------

STATUS_BINARY_SENSORS = keyed(
    problem("lockout", cat=None),
    problem("passcode_locked_out", cat=None, on=False),
    problem("nfc_locked_out", cat=None, on=False),
    problem("fingerprint_locked_out", cat=None, on=False),
    binary("tamper_alarm", B.TAMPER, cat=None),
    binary("duress_alarm", B.SAFETY, cat=None),
    charging(),
)

STATUS_SENSORS = keyed(
    diag("event_counter", on=False),
    diag("passcodes_count"),
    diag("nfc_cards_count"),
)


async def read_keypad(device: KeypadBase, first: bool = False) -> dict[str, int]:
    """Settings and credential counts; the first read also sets the clock."""
    if first:
        await device.sync_time()
    await device.get_settings()
    return await device.get_credential_counts()


def _action(key: str, press) -> ButtonDesc:
    return ButtonDesc(key=key, translation_key=key, entity_category=CONFIG,
                      add="always", press_fn=press)


def _credential_name(entity: Any, record: dict[str, Any], attrs: dict[str, Any]) -> None:
    kind = {"passcode": "passcodes", "nfc": "cards"}.get(record["source"])
    if kind and record.get("credential_id") is not None:
        item = entry_store(entity.hass).section(
            entity.coordinator.config_entry.entry_id, kind
        ).get(str(record["credential_id"]), {})
        attrs["credential_name"] = item.get("name", "") if item else None


ENTITIES = (
    *dynamic(*STATUS_SENSORS.values()),
    setting_switch("keypad_enabled", lambda d, v: d.set_keypad_enabled(v)),
    setting_switch("tamper_alarm_enabled", lambda d, v: d.set_tamper_alarm(v)),
    setting_switch("sound_enabled", lambda d, v: d.set_backlight_and_sound(sound=v)),
    setting_select("backlight_mode", BACKLIGHT_MODES.values(),
                   lambda d, v: d.set_backlight_and_sound(mode=v)),
    setting_select("lock_button_mode", LOCK_BUTTON_MODES.values(),
                   lambda d, v: d.set_lock_button(v)),
    setting_number("lock_button_time", 1, 600, lambda d, v: d.set_lock_button("timed", int(v))),
    _action("cancel_passcode_lockout", lambda d: d.cancel_lockout("passcode")),
    _action("cancel_nfc_lockout", lambda d: d.cancel_lockout("nfc")),
    _action("clear_tamper_alarm", lambda d: d.clear_tamper_alarm()),
    _action("cancel_duress_alarm", lambda d: d.cancel_duress_alarm()),
    _action("sync_time", lambda d: d.sync_time()),
    refresh_button("-refresh_settings", read_keypad),
    EventDesc(
        key="keypad_history",
        translation_key="keypad_history",
        event_types=list(KEYPAD_EVENT_TYPES),
        add="always",
        cls=HistoryEvent,
        trigger_fn=lambda d: tuple(
            d.get(k) for k in ("event_counter", "lockout", "tamper_alarm", "duress_alarm")
        ),
        read_fn=lambda dev, after: dev.get_log_records(after_key=after),
        read_delay=3.0,
        enrich_fn=_credential_name,
    ),
)

SPECS = (
    *(
        ModelSpec(type_, model, ENTITIES, refresh=read_keypad)
        for model, type_ in ((M.KEYPAD, "keypad"), (M.KEYPAD_TOUCH, "keypad_touch"))
    ),
    *(
        ModelSpec(type_, model)
        for model, type_ in ((M.KEYPAD_VISION, "keypad_vision"),
                             (M.KEYPAD_VISION_PRO, "keypad_vision_pro"))
    ),
)
