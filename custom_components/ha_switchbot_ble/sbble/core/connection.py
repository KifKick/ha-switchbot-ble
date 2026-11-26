"""BLE transport: one GATT connection per device, opened on demand.

Commands go to the TX characteristic, the reply comes as a notification on the
RX characteristic. The connection stays open ``DISCONNECT_DELAY`` seconds after
the last exchange so that a burst of commands reuses it, then closes so the
device (and the Bluetooth proxy slot) is free again.

Only one exchange runs at a time: callers hold ``lock`` around ``exchange``.
"""

from __future__ import annotations

import asyncio
from collections.abc import Callable
import contextlib
import logging
from uuid import UUID

from bleak.backends.device import BLEDevice
from bleak.exc import BleakDBusError
from bleak_retry_connector import (
    BLEAK_RETRY_EXCEPTIONS,
    BleakClientWithServiceCache,
    establish_connection,
)

from .errors import CharacteristicMissingError

_LOGGER = logging.getLogger(__name__)

SERVICE_UUID = UUID("cba20d00-224d-11e6-9fb8-0002a5d5c51b")
TX_UUID = UUID("cba20002-224d-11e6-9fb8-0002a5d5c51b")  # we write
RX_UUID = UUID("cba20003-224d-11e6-9fb8-0002a5d5c51b")  # device notifies

DISCONNECT_DELAY = 8.5
REPLY_TIMEOUT = 5.0
DBUS_BACKOFF = 0.25

# errors after which the connection is dropped and the command retried
RETRY_ERRORS = (*BLEAK_RETRY_EXCEPTIONS, CharacteristicMissingError)

type NotificationHook = Callable[[bytes], bool]


class Connection:
    """GATT connection to one device."""

    def __init__(self, ble_device: BLEDevice, hook: NotificationHook | None = None) -> None:
        self.ble_device = ble_device
        self.lock = asyncio.Lock()
        # bumped on every new connection: encrypted sessions belong to one
        self.generation = 0
        self._hook = hook
        self._client: BleakClientWithServiceCache | None = None
        self._tx = None
        self._reply: asyncio.Future[bytes] | None = None
        self._timer: asyncio.TimerHandle | None = None
        self._closing = False

    @property
    def name(self) -> str:
        return f"{self.ble_device.name} ({self.ble_device.address})"

    @property
    def connected(self) -> bool:
        return self._client is not None and self._client.is_connected

    async def ensure_connected(self) -> None:
        """Connect if needed (caller holds ``lock``)."""
        if self.connected:
            return
        _LOGGER.debug("%s: connecting", self.name)
        self._closing = False
        client = await establish_connection(
            BleakClientWithServiceCache,
            self.ble_device,
            self.name,
            self._on_disconnected,
            use_services_cache=True,
            ble_device_callback=lambda: self.ble_device,
        )
        tx = client.services.get_characteristic(TX_UUID)
        rx = client.services.get_characteristic(RX_UUID)
        if tx is None or rx is None:
            _LOGGER.debug("%s: characteristics missing, clearing the cache", self.name)
            await client.clear_cache()
            with contextlib.suppress(*BLEAK_RETRY_EXCEPTIONS):
                await client.disconnect()
            raise CharacteristicMissingError(f"{self.name}: no SwitchBot characteristics")
        self._client, self._tx = client, tx
        self.generation += 1
        await client.start_notify(rx, self._on_notification)
        _LOGGER.debug("%s: connected", self.name)

    async def exchange(self, frame: bytes, timeout: float = REPLY_TIMEOUT) -> bytes:
        """Write ``frame`` and wait for the reply (caller holds ``lock``)."""
        await self.ensure_connected()
        assert self._client is not None
        self._cancel_timer()
        self._reply = asyncio.get_running_loop().create_future()
        _LOGGER.debug("%s: -> %s", self.name, frame.hex())
        try:
            await self._client.write_gatt_char(self._tx, frame, False)
            async with asyncio.timeout(timeout):
                reply = await self._reply
        except BleakDBusError:
            await asyncio.sleep(DBUS_BACKOFF)
            await self._close()
            raise
        except BLEAK_RETRY_EXCEPTIONS:
            await self._close()
            raise
        finally:
            self._reply = None
            if self.connected:
                self._schedule_disconnect()
        _LOGGER.debug("%s: <- %s", self.name, reply.hex())
        return reply

    def keep_alive(self) -> None:
        """Push the idle disconnect back (unsolicited notifications)."""
        if self.connected:
            self._schedule_disconnect()

    async def disconnect(self) -> None:
        async with self.lock:
            await self._close()

    # --- internals -----------------------------------------------------------------

    def _on_notification(self, _char: object, data: bytearray) -> None:
        payload = bytes(data)
        if self._reply is not None and not self._reply.done():
            if self._hook is None or not self._hook(payload):
                self._reply.set_result(payload)
            return
        if self._hook is None or not self._hook(payload):
            _LOGGER.debug("%s: unsolicited notification %s", self.name, payload.hex())

    def _on_disconnected(self, _client: BleakClientWithServiceCache) -> None:
        if not self._closing:
            _LOGGER.debug("%s: disconnected by the device", self.name)
        self._client = None
        self._cancel_timer()
        if self._reply is not None and not self._reply.done():
            self._reply.set_exception(TimeoutError("disconnected while waiting for a reply"))

    def _schedule_disconnect(self) -> None:
        self._cancel_timer()
        self._timer = asyncio.get_running_loop().call_later(DISCONNECT_DELAY, self._on_idle)

    def _cancel_timer(self) -> None:
        if self._timer is not None:
            self._timer.cancel()
            self._timer = None

    def _on_idle(self) -> None:
        self._timer = None
        if self.lock.locked():  # an exchange is running, it reschedules
            return
        asyncio.get_running_loop().create_task(self.disconnect())

    async def _close(self) -> None:
        self._cancel_timer()
        client, self._client, self._tx = self._client, None, None
        if client is None:
            return
        self._closing = True
        _LOGGER.debug("%s: disconnecting", self.name)
        try:
            await client.disconnect()
        except BLEAK_RETRY_EXCEPTIONS as err:
            _LOGGER.debug("%s: error while disconnecting: %s", self.name, err)
