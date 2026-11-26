"""Data kept per config entry in Home Assistant (not on the device).

``{entry_id: {section: {key: value}}}`` in one store; sections in use:
"offsets" (sensor corrections), "passcodes" and "cards" (keypad credential
names and metadata — the keypad itself only knows their index).
"""

from __future__ import annotations

from typing import Any

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.storage import Store

from .const import DOMAIN

DATA_STORE = f"{DOMAIN}_store"

# offset key -> (min, max, decimals of the corrected value)
OFFSET_KEYS: dict[str, tuple[float, float, int]] = {
    "temperature": (-10.0, 10.0, 1),
    "humidity": (-20.0, 20.0, 1),
    "co2": (-500.0, 500.0, 0),
}


class EntryStore:
    def __init__(self, hass: HomeAssistant) -> None:
        self._store: Store[dict[str, Any]] = Store(hass, 1, f"{DOMAIN}.entries")
        self.data: dict[str, dict[str, dict[str, Any]]] = {}

    async def async_load(self) -> None:
        self.data = await self._store.async_load() or {}

    def section(self, entry_id: str, name: str) -> dict[str, Any]:
        """Read-only view (a copy) of one section."""
        return dict(self.data.get(entry_id, {}).get(name, {}))

    @callback
    def async_set(self, entry_id: str, name: str, key: str | int, value: Any) -> None:
        """Store a value; ``None`` removes it (and empty sections / entries)."""
        entry = self.data.setdefault(entry_id, {})
        section = entry.setdefault(name, {})
        if value is None:
            section.pop(str(key), None)
        else:
            section[str(key)] = value
        if not section:
            entry.pop(name)
        if not entry:
            self.data.pop(entry_id)
        self._save()

    @callback
    def async_remove_entry(self, entry_id: str) -> None:
        if self.data.pop(entry_id, None) is not None:
            self._save()

    def _save(self) -> None:
        self._store.async_delay_save(lambda: self.data, 1.0)

    # --- sensor offsets --------------------------------------------------------------

    def offset(self, entry_id: str, key: str) -> float:
        return float(self.section(entry_id, "offsets").get(key, 0.0))

    @callback
    def async_set_offset(self, entry_id: str, key: str, offset: float) -> float:
        low, high, _ = OFFSET_KEYS[key]
        offset = round(max(low, min(high, float(offset))), 2)
        self.async_set(entry_id, "offsets", key, offset or None)
        return offset

    def corrected(self, entry_id: str, key: str, value: Any) -> Any:
        """value + the stored offset, with a sensible precision."""
        offset = self.offset(entry_id, key) if key in OFFSET_KEYS else 0
        if not offset or isinstance(value, bool) or not isinstance(value, (int, float)):
            return value
        _, _, decimals = OFFSET_KEYS[key]
        corrected = value + offset
        if key == "humidity":
            corrected = max(0.0, min(100.0, corrected))
        if decimals == 0:
            return round(corrected)
        if isinstance(value, int) and float(offset).is_integer():
            return int(corrected)
        return round(corrected, decimals)


async def async_setup_store(hass: HomeAssistant) -> None:
    store = EntryStore(hass)
    await store.async_load()
    hass.data[DATA_STORE] = store


def entry_store(hass: HomeAssistant) -> EntryStore:
    return hass.data[DATA_STORE]
