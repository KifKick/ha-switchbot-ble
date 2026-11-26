"""Coordinator: advertisements, polling and the periodic settings read."""

import asyncio
import contextlib
from datetime import timedelta
import logging
from typing import TYPE_CHECKING, Any, override

from bleak.exc import BleakError
from homeassistant.components import bluetooth
from homeassistant.components.bluetooth.active_update_coordinator import (
    ActiveBluetoothDataUpdateCoordinator,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import CoreState, HomeAssistant, callback
from homeassistant.helpers.event import async_call_later, async_track_time_interval
from homeassistant.helpers.start import async_at_started

from .sbble import Device, Model, OperationError

if TYPE_CHECKING:
    from bleak.backends.device import BLEDevice

    from .catalog import ModelSpec


_LOGGER = logging.getLogger(__name__)

DEVICE_STARTUP_TIMEOUT = 30
SETTINGS_REFRESH_INTERVAL = timedelta(hours=6)
BLE_ERRORS = (OperationError, BleakError, TimeoutError)

type SwitchbotConfigEntry = ConfigEntry[SwitchbotDataUpdateCoordinator]


class SwitchbotDataUpdateCoordinator(ActiveBluetoothDataUpdateCoordinator[None]):
    """Coordinator of one device: advertisements, polling and availability."""

    def __init__(
        self,
        hass: HomeAssistant,
        logger: logging.Logger,
        ble_device: BLEDevice,
        device: Device,
        base_unique_id: str,
        device_name: str,
        connectable: bool,
        model: Model,
        config_entry: ConfigEntry,
        spec: ModelSpec,
    ) -> None:
        """Initialize the coordinator."""
        super().__init__(
            hass=hass,
            logger=logger,
            address=ble_device.address,
            needs_poll_method=self._needs_poll,
            poll_method=self._async_update,
            mode=bluetooth.BluetoothScanningMode.ACTIVE,
            connectable=connectable,
        )
        self.ble_device = ble_device
        self.device = device
        self.device_name = device_name
        self.base_unique_id = base_unique_id
        self.model = model
        self.config_entry = config_entry
        self.spec = spec
        self.channels: tuple[int | None, ...] = (
            tuple(range(1, spec.channels + 1)) if spec.channels > 1 else (None,)
        )
        self._ready_event = asyncio.Event()
        self._was_unavailable = True

    @callback
    def _needs_poll(
        self,
        service_info: bluetooth.BluetoothServiceInfoBleak,
        seconds_since_last_poll: float | None,
    ) -> bool:
        # Only poll if hass is running, we need to poll,
        # and we actually have a way to connect to the device
        return (
            self.hass.state is CoreState.running
            and self.connectable
            and self.device.poll_needed(seconds_since_last_poll)
            and bool(
                bluetooth.async_ble_device_from_address(
                    self.hass, service_info.device.address, connectable=True
                )
            )
        )

    async def _async_update(
        self, service_info: bluetooth.BluetoothServiceInfoBleak
    ) -> None:
        """Poll the device."""
        await self.device.update()

    @callback
    @override
    def _async_handle_unavailable(
        self, service_info: bluetooth.BluetoothServiceInfoBleak
    ) -> None:
        """Handle the device going unavailable."""
        super()._async_handle_unavailable(service_info)
        self._was_unavailable = True
        _LOGGER.info("Device %s is unavailable", self.device_name)

    @callback
    @override
    def _async_handle_bluetooth_event(
        self,
        service_info: bluetooth.BluetoothServiceInfoBleak,
        change: bluetooth.BluetoothChange,
    ) -> None:
        """Handle a Bluetooth event."""
        self.ble_device = service_info.device
        if not (
            adv := self.device.parse_advertisement(
                service_info.device, service_info.advertisement
            )
        ):
            return
        self._ready_event.set()
        _LOGGER.debug(
            "%s: Switchbot data: %s", self.ble_device.address, self.device.data
        )
        if not self.device.advertisement_changed(adv) and not self._was_unavailable:
            return
        if self._was_unavailable:
            self._was_unavailable = False
            _LOGGER.info("Device %s is online", self.device_name)
        self.device.update_from_advertisement(adv)
        super()._async_handle_bluetooth_event(service_info, change)

    def data_for(self, channel: int | None) -> dict[str, Any]:
        """Parsed data of the device, or of one channel of a multi-channel relay."""
        if channel is None:
            return self.device.data
        return self.device.get_parsed_data(channel)

    @callback
    def async_start_settings_refresh(self) -> None:
        """Read the settings (spec.refresh) after startup, then every 6 h."""
        if (read := self.spec.refresh) is None:
            return
        entry, first = self.config_entry, True

        async def _refresh(_now: object = None) -> None:
            nonlocal first
            try:
                await read(self.device, first)
            except BLE_ERRORS as err:
                _LOGGER.warning("%s: reading settings failed: %s", self.device_name, err)
                return
            first = False

        @callback
        def _schedule_first(_hass: HomeAssistant) -> None:
            entry.async_on_unload(
                async_call_later(self.hass, self.spec.refresh_delay, _refresh)
            )

        entry.async_on_unload(async_at_started(self.hass, _schedule_first))
        entry.async_on_unload(
            async_track_time_interval(self.hass, _refresh, SETTINGS_REFRESH_INTERVAL)
        )

    async def async_wait_ready(self) -> bool:
        """Wait for the device to be ready."""
        with contextlib.suppress(TimeoutError):
            async with asyncio.timeout(DEVICE_STARTUP_TIMEOUT):
                await self._ready_event.wait()
                return True
        return False
