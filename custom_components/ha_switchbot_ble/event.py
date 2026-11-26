"""Events: advertisement counters (button presses, doorbell) and device history logs."""

from __future__ import annotations

from datetime import UTC, datetime
import logging
import time
from typing import override

from homeassistant.components.event import EventEntity
from homeassistant.const import Platform
from homeassistant.core import callback
from homeassistant.helpers.debounce import Debouncer

from .coordinator import BLE_ERRORS
from .entity import DescribedEntity, EventDesc, platform_setup
from .sbble.core.history import record_key

_LOGGER = logging.getLogger(__name__)
PARALLEL_UPDATES = 0


class CounterEvent(DescribedEntity, EventEntity):
    """Fires ``fire_event`` whenever the advertised counter changes."""

    entity_description: EventDesc

    def __init__(self, coordinator, description: EventDesc, channel=None) -> None:
        super().__init__(coordinator, description, channel)
        self._previous = int(self.raw_value or 0)

    @callback
    @override
    def _async_update_attrs(self) -> None:
        counter = int(self.raw_value or 0)
        if counter not in (0, self._previous):
            self._trigger_event(self.entity_description.fire_event)
        self._previous = counter


class HistoryEvent(DescribedEntity, EventEntity):
    """One event per new record of the device log (who / how it was operated).

    The log is read ``read_delay`` seconds after the watched state changes
    (the device writes the record first); records older than this Home
    Assistant start are not reported.
    """

    entity_description: EventDesc

    def __init__(self, coordinator, description: EventDesc, channel=None) -> None:
        super().__init__(coordinator, description, channel)
        self._last_key = int(time.time()) * 1000 + 100
        self._last_state: tuple | None = None
        self._debouncer = Debouncer(
            coordinator.hass, _LOGGER, cooldown=description.read_delay, immediate=False,
            function=self.async_read_history,
        )

    @override
    async def async_will_remove_from_hass(self) -> None:
        self._debouncer.async_shutdown()
        await super().async_will_remove_from_hass()

    @callback
    @override
    def _async_update_attrs(self) -> None:
        desc, data = self.entity_description, self.parsed_data
        state = desc.trigger_fn(data)
        changed = self._last_state is not None and state != self._last_state
        self._last_state = state
        if changed and desc.read_when(data):
            self.hass.async_create_task(self._debouncer.async_call())

    async def async_read_history(self) -> list[dict]:
        desc = self.entity_description
        try:
            records = await desc.read_fn(self._device, self._last_key)
        except BLE_ERRORS as err:
            _LOGGER.warning("%s: reading the history failed: %s",
                            self.coordinator.device_name, err)
            return []
        for record in reversed(records):  # oldest first
            self._last_key = max(self._last_key, record_key(record))
            attrs = {k: v for k, v in record.items() if k not in ("type", "sequence")}
            attrs["time"] = datetime.fromtimestamp(record["timestamp"], tz=UTC).isoformat()
            if desc.enrich_fn:
                desc.enrich_fn(self, record, attrs)
            self._trigger_event(record["type"], attrs)
        if records:
            self.async_write_ha_state()
        return records


async_setup_entry = platform_setup(Platform.EVENT)
