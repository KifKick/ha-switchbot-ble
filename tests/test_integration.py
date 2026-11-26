"""Integration tests: the catalog, every model's entities, values, the panel."""

from __future__ import annotations

import json
import os
from pathlib import Path
import subprocess
import sys
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from bleak.backends.device import BLEDevice
from homeassistant.config_entries import ConfigEntryState
import pytest

from custom_components.ha_switchbot_ble.catalog import BY_MODEL, MODELS
from custom_components.ha_switchbot_ble.panel import devices as panel_devices
from custom_components.ha_switchbot_ble.sbble import (
    MODELS as LIBRARY_MODELS,
    Model as M,
    OperationError,
)
from custom_components.ha_switchbot_ble.storage import EntryStore

ROOT = Path(__file__).parent.parent
SNAPSHOTS = Path(__file__).parent / "snapshots"


# --- catalog --------------------------------------------------------------------


# parsed by the library, but no entities for it (not in Home Assistant core either)
UNSUPPORTED = {M.RGBICWW_CEILING_LIGHT}

# the models whose commands are encrypted (the catalog said so before the class did)
ENCRYPTED = {
    M.LOCK, M.LOCK_LITE, M.LOCK_PRO, M.LOCK_PRO_WIFI, M.LOCK_ULTRA, M.LOCK_ULTRA_MAX,
    M.LOCK_VISION, M.LOCK_VISION_PRO, M.KEYPAD, M.KEYPAD_TOUCH, M.KEYPAD_VISION,
    M.KEYPAD_VISION_PRO, M.SMART_THERMOSTAT_RADIATOR, M.AIR_PURIFIER_JP, M.AIR_PURIFIER_US,
    M.AIR_PURIFIER_TABLE_JP, M.AIR_PURIFIER_TABLE_US, M.CIRCULATOR_FAN_PRO,
    M.EVAPORATIVE_HUMIDIFIER, M.RELAY_SWITCH_1, M.RELAY_SWITCH_1PM, M.PLUG_MINI_EU,
    M.RELAY_SWITCH_2PM, M.FLOOR_LAMP, M.STRIP_LIGHT_3, M.RGBICWW_STRIP_LIGHT,
    M.RGBICWW_FLOOR_LAMP, M.RGBICWW_LIGHT_BARS, M.PERMANENT_OUTDOOR_LIGHT,
    M.CANDLE_WARMER_LAMP, M.RGBIC_NEON_ROPE_LIGHT, M.RGBIC_NEON_WIRE_ROPE_LIGHT,
    M.CURTAIN_TRACK_4,
    M.GARAGE_DOOR_OPENER,
}


def test_catalog_covers_every_library_model() -> None:
    assert set(LIBRARY_MODELS) - set(BY_MODEL) == UNSUPPORTED, "library models without a spec"
    assert len(BY_MODEL) == len(MODELS), "one spec per library model"


def test_specs_are_consistent() -> None:
    for spec in MODELS.values():
        assert spec.platforms, spec.type
        assert spec.device_cls.model is spec.model, spec.type
        assert spec.connectable or spec.passive, spec.type
    assert {s.model for s in MODELS.values() if s.encrypted} == ENCRYPTED


def test_entity_snapshot() -> None:
    """Every model's entities (unique_id, names, categories, units…) are unchanged.

    After a deliberate change: run tests/snapshots/entity_snapshot.py and replace the file.
    """
    out = subprocess.run(
        [sys.executable, str(SNAPSHOTS / "entity_snapshot.py"),
         "custom_components.ha_switchbot_ble", str(SNAPSHOTS / "keys.json")],
        capture_output=True, text=True, check=True, cwd=ROOT,
        env={**os.environ, "PYTHONPATH": os.pathsep.join(filter(None, [str(ROOT), os.environ.get("PYTHONPATH")]))},
    ).stdout
    expected = json.loads((SNAPSHOTS / "ha_switchbot_ble.json").read_text())
    assert json.loads(out) == expected


# --- values ---------------------------------------------------------------------


@pytest.mark.parametrize(
    ("key", "value", "offset", "expected"),
    [
        ("temperature", 21.4, -0.4, 21.0),
        ("temperature", 18.3, 0.0, 18.3),
        ("humidity", 48, 2.0, 50),  # int stays int
        ("humidity", 48, 0.3, 48.3),
        ("humidity", 99, 5.0, 100),  # clamped
        ("humidity", 1, -5.0, 0),
        ("co2", 612, 15.4, 627),
        ("temperature", None, 1.0, None),
    ],
)
def test_offsets(key, value, offset, expected) -> None:
    store = EntryStore(MagicMock())
    store.data = {"e": {"offsets": {key: offset, "battery": 5.0}}}
    assert store.corrected("e", key, value) == expected
    assert store.corrected("e", "battery", 80) == 80  # not correctable


def test_store_set_and_remove() -> None:
    store = EntryStore(MagicMock())
    store._store = MagicMock()
    assert store.async_set_offset("e", "temperature", 12.0) == 10.0  # limit
    store.async_set("e", "passcodes", 3, {"name": "Ann"})
    assert store.section("e", "passcodes") == {"3": {"name": "Ann"}}
    store.async_set_offset("e", "temperature", 0)
    store.async_set("e", "passcodes", 3, None)
    assert store.data == {}


# --- panel ----------------------------------------------------------------------


def _entry(entry_id: str, sensor_type: str, data: dict, connectable: bool = True):
    spec = MODELS[sensor_type]
    device = MagicMock(spec=spec.device_cls)
    device.data = data
    coordinator = SimpleNamespace(
        model=spec.model, spec=spec, device=device, device_name=f"name {entry_id}",
        ble_device=BLEDevice(f"AA:BB:CC:DD:EE:{entry_id[-2:]}", entry_id, {}),
        connectable=connectable, available=True,
    )
    return SimpleNamespace(entry_id=entry_id, state=ConfigEntryState.LOADED,
                           runtime_data=coordinator, data={"sensor_type": sensor_type})


def test_panel_device_kinds_and_features() -> None:
    entries = [
        _entry("lock01", "lock_ultra", {"status": None}),
        _entry("lock02", "lock_pro", {"status": None}),
        _entry("kpad03", "keypad", {"battery": 80}),
        _entry("meter4", "indoor_outdoor_thermo_hygrometer",
               {"temperature": 21.0, "humidity": 40}),
        _entry("plug05", "plug_mini_eu", {"isOn": True}),
        _entry("curt06", "curtain", {"position": 50}),
        _entry("bulb07", "bulb", {"isOn": True}),
        _entry("bot008", "bot", {"isOn": True}),
        _entry("humi09", "humidifier", {"isOn": True}),
        _entry("cont10", "contact", {"contact_open": True}),
        _entry("curt11", "curtain_3", {"position": 50}),
        _entry("roll12", "roller_shade", {"position": 50}),
        _entry("blnd13", "blind_tilt", {"tilt": 50}),
        _entry("trk414", "curtain_track_4", {"position": 50}),
        _entry("gara15", "garage_door_opener", {"door_open": False}),
        _entry("lock16", "lock", {"status": None}),
        _entry("lock17", "lock_lite", {"status": None}),
        _entry("lock18", "lock_vision", {"status": None}),
    ]
    hass = MagicMock()
    hass.config_entries.async_entries.return_value = entries
    connection = MagicMock()
    with (
        patch.object(panel_devices.dr, "async_get"),
        patch.object(panel_devices.dr, "async_entries_for_config_entry",
                     side_effect=lambda _reg, entry_id: [SimpleNamespace(id=f"dev-{entry_id}")]),
    ):
        panel_devices.ws_devices(hass, connection, {"id": 1})
    result = connection.send_result.call_args.args[1]
    assert set(result["offset_limits"]) >= {"temperature", "humidity"}
    by_id = {d["entry_id"]: d for d in result["devices"]}
    assert {k: d["kind"] for k, d in by_id.items()} == {
        "lock01": "lock", "lock02": "lock", "kpad03": "keypad", "meter4": "sensor",
        "plug05": "plug", "curt06": "cover", "bulb07": "light", "bot008": "switch",
        "humi09": "appliance", "cont10": "sensor", "curt11": "cover", "roll12": "cover",
        "blnd13": "cover", "trk414": "cover", "gara15": "switch",
        "lock16": "lock", "lock17": "lock", "lock18": "other",  # Lock Vision: no wizard
    }
    calibratable = {k for k, d in by_id.items() if d["features"]["cover_calibration"]}
    assert calibratable == {"curt11", "roll12", "blnd13", "trk414"}  # not the first Curtain
    assert by_id["lock01"]["device_id"] == "dev-lock01"
    # product names, not the library ids (WoLockPro, WoKeypad, WoIOSensorTH)
    assert {k: by_id[k]["model_name"] for k in ("lock02", "kpad03", "meter4", "lock16")} == {
        "lock02": "Lock Pro", "kpad03": "Keypad", "meter4": "Indoor/Outdoor Thermo-Hygrometer",
        "lock16": "Lock",
    }
    assert by_id["lock01"]["features"]["half_lock"] is True
    assert by_id["lock02"]["features"]["auto_calibration"] is False
    assert by_id["lock02"]["features"]["lock_calibration"] is True
    # Lock (gen 1) and Lock Lite have their own wizard; Lock Vision none
    calibratable_locks = {k for k, d in by_id.items() if d["features"]["lock_calibration"]}
    assert calibratable_locks == {"lock01", "lock02", "lock16", "lock17"}
    assert not by_id["lock16"]["features"]["auto_calibration"]
    assert by_id["kpad03"]["features"]["keypad"] is True
    meter = by_id["meter4"]["features"]
    assert meter["correction"] is True and meter["device_calibration"] is True
    assert by_id["plug05"]["features"]["correction"] is False


def test_cover_calibration_actions_track_the_wizard() -> None:
    """covers/action: a start step marks the wizard started, exit ends it; abort sends
    the model's exit frames; unknown steps are refused by the library."""
    import asyncio
    import inspect

    from custom_components.ha_switchbot_ble.panel import covers as panel_covers
    from custom_components.ha_switchbot_ble.sbble.devices.covers.curtain_3 import Curtain3

    device = Curtain3(BLEDevice("AA:BB:CC:DD:EE:11", "c3", {}))
    device.request = AsyncMock(return_value=b"\x01")
    entry = SimpleNamespace(entry_id="c3", title="Curtain", runtime_data=SimpleNamespace(
        device=device, available=True))
    hass = MagicMock()
    hass.data = {}
    handler = inspect.unwrap(panel_covers.ws_action)

    def act(**msg):
        return asyncio.run(handler(hass, entry, msg))

    assert act(action="start_manual")["success"]
    assert panel_covers._session(hass, "c3").started
    assert act(action="open_side", value=1)["success"]
    result = act(action="exit")
    assert not panel_covers._session(hass, "c3").started
    assert result["status"]["steps"][0] == "drive_closed"
    act(action="start_new_auto")
    act(action="abort")
    assert not panel_covers._session(hass, "c3").started
    frames = [c.args[0] for c in device.request.call_args_list]
    assert frames == ["570f45050a02", "570f4504060101", "570f4504020100", "570f450502",
                      "570f45050a05", "570f45050500", "570f450502"]
    with pytest.raises(ValueError):
        act(action="reset")


def test_lock_calibration_actions_track_the_wizard() -> None:
    """calibration/action: start / half-lock start mark the wizard started; leaving sends
    recover + notifications off + status read, or half_lock_complete for an Ultra Max half-lock; the
    half-lock steps need an EU lock; the panel status has the battery status."""
    import asyncio
    import inspect

    from custom_components.ha_switchbot_ble.panel import locks as panel_locks
    from custom_components.ha_switchbot_ble.sbble.devices.locks.lock_ultra_max import LockUltraMax

    device = LockUltraMax(BLEDevice("AA:BB:CC:DD:EE:12", "um", {}), key_id="01",
                          encryption_key="00" * 16)
    device.request = AsyncMock(return_value=b"\x01")
    device.data.update(lock_type=1, battery_status=1)
    entry = SimpleNamespace(entry_id="um", title="Ultra Max", runtime_data=SimpleNamespace(
        device=device, available=True))
    hass = MagicMock()
    hass.data = {}
    handler = inspect.unwrap(panel_locks.ws_action)
    session = panel_locks._session(hass, "um")

    def act(**msg):
        return asyncio.run(handler(hass, entry, msg))

    def frames():
        sent = [c.args[0] for c in device.request.call_args_list]
        device.request.reset_mock()
        return sent

    result = act(action="half_lock_start")
    assert result["status"]["battery_status"] == 1
    assert session.started and session.extra["half_lock"]
    assert frames() == ["570f4e040c02"]
    act(action="leave")  # Cancel in half-lock calibration: half_lock_complete only
    assert not session.started and frames() == ["570f4e040c03"]
    act(action="start")
    assert session.started and not session.extra["half_lock"]
    frames()
    act(action="leave")  # recover, notifications off, status read
    assert not session.started
    assert frames() == ["570f4e030600", "570e00", "570f4f8107"]
    act(action="half_lock_start")
    asyncio.run(panel_locks._leave(device, session))  # panel closed: same as Cancel
    assert frames() == ["570f4e040c02", "570f4e040c03"]
    device.data["lock_type"] = 0
    with pytest.raises(ValueError):
        act(action="half_lock_set_and_test")


def test_classic_lock_calibration_frames() -> None:
    """Lock (gen 1): the wizard's actions send the app's frames (docs/lock-calibration.md);
    the status carries the knob angle and the latch type."""
    import asyncio
    import inspect

    from custom_components.ha_switchbot_ble.panel import locks as panel_locks
    from custom_components.ha_switchbot_ble.sbble.devices.locks.lock import Lock

    device = Lock(BLEDevice("AA:BB:CC:DD:EE:13", "l1", {}), key_id="01",
                  encryption_key="00" * 16)
    device.request = AsyncMock(return_value=b"\x01")
    device.command = AsyncMock(return_value=b"\x01")
    device.data.update(knob_angle=40, latch_type=2)
    entry = SimpleNamespace(entry_id="l1", title="Lock", runtime_data=SimpleNamespace(
        device=device, available=True))
    hass = MagicMock()
    hass.data = {}
    handler = inspect.unwrap(panel_locks.ws_action)

    def act(**msg):
        return asyncio.run(handler(hass, entry, msg))

    for action in ("start", "set_lock_position_door_closed", "set_unlock_position_door_open",
                   "set_latch_type", "notify_off", "set_door_open", "notify", "test_unlock",
                   "test_lock", "complete"):
        result = act(action=action)
        assert result["success"], action
    assert result["status"]["knob_angle"] == 40 and result["status"]["latch_type"] == 2
    assert [c.args[0] for c in device.request.call_args_list] == [
        "570f4e030100c0", "570f4e030400c000", "570f4e030400c0c0", "570f4e040802",
        "570f4e0304004040", "570f4e03030080", "570f4e03030000", "570f4e030200",
    ]
    commands = [c.args[0] for c in device.command.call_args_list]
    assert commands == ["570e01001e00008101", "570e00", "570e01001e00008101"]
    with pytest.raises(OperationError):
        act(action="auto_record_unlocked")  # a Lock 2 step the first generation does not have
