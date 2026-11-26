"""Shared test helpers. Tests run inside the HA container (see CONTRIBUTING.md)."""

from __future__ import annotations

from bleak.backends.device import BLEDevice

BLE = BLEDevice("AA:BB:CC:DD:EE:FF", "dev", {})
