"""Sensors: catalog values (with the user's offsets) and RSSI."""

from __future__ import annotations

from typing import Any, override

from homeassistant.components.bluetooth import async_last_service_info
from homeassistant.components.sensor import SensorEntity
from homeassistant.const import Platform

from .entity import DescribedEntity, platform_setup
from .storage import DATA_STORE

PARALLEL_UPDATES = 0


class DescribedSensor(DescribedEntity, SensorEntity):
    def corrected(self, key: str, value: Any) -> Any:
        """A reading with the offset set in the panel ("Sensor correction")."""
        if self._channel is None and (store := self.hass.data.get(DATA_STORE)):
            return store.corrected(self.coordinator.config_entry.entry_id, key, value)
        return value

    @property
    @override
    def native_value(self) -> Any:
        return self.corrected(self.entity_description.dkey, self.value)


class RssiSensor(DescribedSensor):
    """Signal of the connectable path (the one used to control the device)."""

    @property
    @override
    def native_value(self) -> int | None:
        if info := async_last_service_info(self.hass, self._address, self.coordinator.connectable):
            return info.rssi
        return None


async_setup_entry = platform_setup(Platform.SENSOR, DescribedSensor)
