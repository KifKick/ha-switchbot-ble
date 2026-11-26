"""Entity snapshot: every model and platform → the entities the integration creates.

Runs in the HA container:  python3 tests/snapshots/entity_snapshot.py <package> [keys.json] > out.json
<package> is e.g. custom_components.ha_switchbot_ble. SNAPSHOT_REFRESH=type,type
re-derives the keys of those models (and of models missing from keys.json)
after a deliberate change. Parsed data is a superset of
what the model's advertisement parser emits (fed several byte patterns) plus
every key of the model-filtered extras (settings that appear after a read).
"""

from __future__ import annotations

import asyncio
import enum
import importlib
import json
import os
import pkgutil
import sys
import tempfile
from types import SimpleNamespace

from bleak.backends.device import BLEDevice
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity import EntityDescription

PKG = sys.argv[1]
# optional: keys file — written when missing, reused when present, so two
# packages are compared on exactly the same synthetic data
KEYS_FILE = sys.argv[2] if len(sys.argv) > 2 else None
pkg = importlib.import_module(PKG)
lib = importlib.import_module(f"{PKG}.sbble")
catalog = importlib.import_module(f"{PKG}.catalog")

ADDR = "AA:BB:CC:DD:EE:FF"
BLE = BLEDevice(ADDR, "dev", {})


def _all_keys(skip=("sensor", "binary_sensor")) -> set[str]:
    keys: set[str] = set()

    def walk(obj, depth=0):
        if depth > 3:
            return
        if isinstance(obj, EntityDescription):
            keys.add(obj.key)
        elif isinstance(obj, dict):
            for k, v in obj.items():
                if isinstance(v, EntityDescription) and isinstance(k, str):
                    keys.add(k)
                walk(v, depth + 1)
        elif isinstance(obj, (list, tuple, set, frozenset)):
            for v in obj:
                walk(v, depth + 1)

    for mod in pkgutil.iter_modules(pkg.__path__):
        if mod.name in ("sbble", "frontend", *skip):
            continue
        try:
            m = importlib.import_module(f"{PKG}.{mod.name}")
        except Exception as err:
            print(f"skip {mod.name}: {err}", file=sys.stderr)
            continue
        for value in vars(m).values():
            walk(value)
    keys |= {f"{k}_utc" for k in keys}
    return keys


def _parser_keys(model) -> set:
    parser = lib.MODELS[model].parser
    keys: set = set()
    for n in (6, 8, 10, 12, 13, 16, 20, 24, 26, 30, 40):
        for b in (0x00, 0xFF, 0x55, 0xAA, 0x01, 0x80):
            raw = bytes([b]) * n
            try:
                out = parser(raw, raw)
            except Exception:
                continue
            for k, v in (out or {}).items():
                if isinstance(k, int) and isinstance(v, dict):
                    keys |= set(v)
                else:
                    keys.add(k)
    return keys


def _jsonable(v):
    if isinstance(v, enum.Enum):
        return v.value
    if isinstance(v, (list, tuple, set, frozenset)):
        return sorted(str(x) for x in v)
    if v is None or isinstance(v, (bool, int, float, str)):
        return v
    return str(v)


def _describe(platform: str, ent) -> dict:
    out = {"platform": platform, "class": type(ent).__name__}
    for attr in (
        "unique_id",
        "translation_key",
        "entity_category",
        "entity_registry_enabled_default",
        "device_class",
        "native_unit_of_measurement",
        "state_class",
        "options",
        "native_min_value",
        "native_max_value",
        "native_step",
        "event_types",
        "icon",
    ):
        try:
            value = getattr(ent, attr)
        except Exception:
            continue
        if attr in ("native_min_value", "native_max_value", "native_step", "options") and (
            not hasattr(ent, "entity_description") or not hasattr(type(ent), attr)
        ):
            pass
        out[attr] = _jsonable(value)
    desc = getattr(ent, "entity_description", None)
    if desc is not None:
        out["key"] = desc.key
    return {k: v for k, v in out.items() if v is not None}


async def main() -> None:
    hass = HomeAssistant(tempfile.mkdtemp())
    keys_in: dict[str, list[str]] | None = None
    if KEYS_FILE:
        try:
            with open(KEYS_FILE) as file:
                keys_in = json.load(file)
        except FileNotFoundError:
            pass
    keys_out: dict[str, list[str]] = {}
    refresh = set(filter(None, os.environ.get("SNAPSHOT_REFRESH", "").split(",")))
    stale = keys_in is None or bool(refresh) or any(t not in keys_in for t in catalog.MODELS)
    extras = _all_keys() if stale else set()
    result: dict[str, list] = {}
    for sensor_type, spec in sorted(catalog.MODELS.items()):
        platforms, model = spec.platforms, spec.model
        if spec.encrypted:
            device = spec.device_cls(BLE, key_id="ab", encryption_key="00" * 16)
        else:
            device = spec.device_cls(BLE)
        if keys_in and sensor_type in keys_in and sensor_type not in refresh:
            keys = keys_in[sensor_type]
        elif keys_in:  # a new or changed model: its parser and its own entities
            keys = sorted(_parser_keys(model) | {
                getattr(item, "data_key", None) or item.key
                for item in spec.entities if isinstance(item, EntityDescription)
            })
        else:
            keys = sorted(extras | _parser_keys(model))
        keys_out[sensor_type] = keys
        data = {k: 1 for k in keys}
        if spec.channels > 1:
            data = {1: dict(data), 2: dict(data)}
        device.data = data
        coordinator = SimpleNamespace(
            hass=hass,
            device=device,
            ble_device=BLE,
            base_unique_id="aabbccddeeff",
            model=model,
            device_name="Dev",
            connectable=True,
            available=True,
            address=ADDR,
            async_add_listener=lambda *a, **k: (lambda: None),
            spec=spec,
            channels=(1, 2) if spec.channels > 1 else (None,),
        )
        coordinator.data_for = (
            lambda ch, d=device: d.data if ch is None else d.get_parsed_data(ch)
        )
        entry = SimpleNamespace(
            runtime_data=coordinator,
            entry_id="entry",
            unique_id="aabbccddeeff",
            data={"address": ADDR, "sensor_type": sensor_type},
            options={"retry_count": 3},
            title="Dev",
            async_on_unload=lambda f: None,
        )
        coordinator.config_entry = entry
        entities: list[dict] = []
        for platform in platforms:
            platform = getattr(platform, "value", platform)
            mod = importlib.import_module(f"{PKG}.{platform}")
            added: list = []

            def _add(ents, *_a, added=added, **_k):
                added.extend(ents)

            try:
                await mod.async_setup_entry(hass, entry, _add)
            except Exception as err:
                entities.append({"platform": platform, "error": repr(err)})
            entities.extend(_describe(platform, e) for e in added)
        result[sensor_type] = sorted(
            entities, key=lambda e: (e["platform"], str(e.get("unique_id")), e.get("class", ""))
        )
    json.dump(result, sys.stdout, indent=1, sort_keys=True)
    if KEYS_FILE and stale:
        with open(KEYS_FILE, "w") as file:
            json.dump(keys_out, file, indent=1, sort_keys=True)
    await hass.async_stop(force=True)


asyncio.run(main())
