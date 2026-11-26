"""Binary sensors from the catalog."""

from __future__ import annotations

from typing import override

from homeassistant.components.binary_sensor import BinarySensorEntity
from homeassistant.const import Platform

from .entity import BinaryDesc, DescribedEntity, platform_setup

PARALLEL_UPDATES = 0


class DescribedBinarySensor(DescribedEntity, BinarySensorEntity):
    entity_description: BinaryDesc

    def __init__(self, coordinator, description: BinaryDesc, channel=None) -> None:
        super().__init__(coordinator, description, channel)
        if description.device_class_fn:
            self._attr_device_class = description.device_class_fn(coordinator.model)

    @property
    @override
    def is_on(self) -> bool | None:
        return self.value


async_setup_entry = platform_setup(Platform.BINARY_SENSOR, DescribedBinarySensor)
