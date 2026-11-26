"""Make ``custom_components.ha_switchbot_ble.sbble`` importable without Home Assistant.

Without HA the integration package's __init__ cannot run, so it is replaced by
an empty package with the right path (the library itself never imports HA).
"""

from __future__ import annotations

import importlib.util
from pathlib import Path
import sys
import types

ROOT = Path(__file__).resolve().parents[2]

if importlib.util.find_spec("homeassistant") is None:
    for name, path in (
        ("custom_components", ROOT / "custom_components"),
        ("custom_components.ha_switchbot_ble", ROOT / "custom_components" / "ha_switchbot_ble"),
    ):
        if name not in sys.modules:
            module = types.ModuleType(name)
            module.__path__ = [str(path)]
            sys.modules[name] = module

