"""Device base: state from advertisements and replies, commands with retries.

``data`` holds everything known about the device (advertisement values merged
with settings read over the connection). Advertisements and replies only add
or change keys, so a setting read once survives later advertisements.
"""

from __future__ import annotations

import asyncio
from collections.abc import Callable, Coroutine, Iterable
import logging
import time
from typing import Any, ClassVar
import zlib

from bleak.backends.device import BLEDevice
from bleak.backends.scanner import AdvertisementData
from bleak_retry_connector import BleakNotFoundError, ble_device_has_changed

from . import advertisement
from .advertisement import Advertisement
from .connection import RETRY_ERRORS, Connection
from .const import Model
from .crypto import SESSION_REQUEST, Session, check_key
from .errors import OperationError

_LOGGER = logging.getLogger(__name__)

OK = frozenset({0x01, 0x06, 0x0E})  # 06: done, battery low
DEFAULT_RETRY_COUNT = 3
# without active scans, connect once a day for the values ads do not carry
PASSIVE_POLL_INTERVAL = 24 * 60 * 60

BASIC_INFO = "5702"
SET_UTC = "57000501"  # + UTC seconds, 8 bytes big endian

type Listener = Callable[[], None]


def merge(old: dict[str, Any], new: dict[str, Any]) -> dict[str, Any]:
    """``old`` updated by ``new``; a None never replaces a known value."""
    merged = dict(old)
    for key, value in new.items():
        if isinstance(value, dict) and isinstance(old.get(key), dict):
            merged[key] = merge(old[key], value)
        elif value is not None or key not in old:
            merged[key] = value
    return merged


def as_bytes(command: bytes | str) -> bytes:
    return bytes.fromhex(command) if isinstance(command, str) else command


class Device:
    """A SwitchBot device reached over BLE; subclasses set ``model`` and ``parse``."""

    model: ClassVar[Model]
    # The sequence number in the advertisement changes with every operation
    # (app, button, automation): a new one, and the first advertisement after
    # startup, start a background ``refresh()`` of what ads do not carry.
    refresh_on_sequence: ClassVar[bool] = False
    # set the device clock (UTC) first on every new connection, as the app's
    # control pages do; timers and light rules stored on the device need it
    sync_clock_on_connect: ClassVar[bool] = False

    def __init__(
        self,
        ble_device: BLEDevice,
        *,
        password: str | None = None,
        retry_count: int = DEFAULT_RETRY_COUNT,
    ) -> None:
        self.data: dict[str, Any] = {}
        self.rssi = -127
        self._conn = Connection(ble_device, self._on_notification)
        self._retry_count = retry_count
        self._password = (
            zlib.crc32(password.encode("ascii")).to_bytes(4, "big") if password else None
        )
        self._advertisement: Advertisement | None = None
        self._listeners: list[Listener] = []
        self._tasks: set[asyncio.Task[Any]] = set()
        self._last_full_update = -float(PASSIVE_POLL_INTERVAL)
        self._refreshing = False
        self._clock_generation = 0

    @staticmethod
    def parse(service: bytes | None, mfr: bytes | None) -> dict[str, Any]:
        """Advertisement parser of the model (service data, manufacturer data)."""
        raise NotImplementedError

    @property
    def ble_device(self) -> BLEDevice:
        return self._conn.ble_device

    @property
    def address(self) -> str:
        return self._conn.ble_device.address

    @property
    def name(self) -> str:
        return self._conn.name

    # --- listeners ----------------------------------------------------------------

    def subscribe(self, listener: Listener) -> Callable[[], None]:
        self._listeners.append(listener)
        return lambda: self._listeners.remove(listener)

    def notify(self) -> None:
        """Call the listeners (also when only the presentation changed)."""
        for listener in list(self._listeners):
            listener()

    def merge(self, updates: dict[str, Any], *, notify: bool = True) -> bool:
        """Merge ``updates`` into ``data``; True (and listeners called) when it changed."""
        merged = merge(self.data, updates)
        if merged == self.data:
            return False
        self.data = merged
        if notify:
            self.notify()
        return True

    # --- advertisements -------------------------------------------------------------

    def parse_advertisement(
        self, ble_device: BLEDevice, adv: AdvertisementData
    ) -> Advertisement | None:
        return advertisement.parse(ble_device, adv, self.model)

    def advertisement_changed(self, adv: Advertisement) -> bool:
        old = self._advertisement
        return (
            old is None
            or ble_device_has_changed(old.ble_device, adv.ble_device)
            or old.data != adv.data
        )

    def update_from_advertisement(self, adv: Advertisement) -> None:
        """Take a new advertisement (listeners are not called: the coordinator is)."""
        previous = self.data
        self._advertisement = adv
        self._conn.ble_device = adv.ble_device
        self.rssi = adv.rssi
        if adv.active:
            self._last_full_update = time.monotonic()
        if self._accepts_advertisements():
            self.merge(adv.data, notify=False)
        self._advertisement_received(previous, adv)

    def _accepts_advertisements(self) -> bool:
        return True

    def _advertisement_received(self, previous: dict[str, Any], adv: Advertisement) -> None:
        """Hook: react to a new advertisement (``previous`` = data before it)."""
        if self.refresh_on_sequence and not self._refreshing \
                and previous.get("sequence_number") != adv.data.get("sequence_number"):
            self._background(self.refresh_quietly())

    async def refresh(self) -> None:
        """What a new sequence number reads (default: :meth:`update`)."""
        await self.update()

    async def refresh_quietly(self) -> None:
        """:meth:`refresh` in the background: one at a time, errors only logged."""
        if self._refreshing:
            return
        self._refreshing = True
        try:
            await self.refresh()
        except Exception as err:  # background read, logged only
            _LOGGER.debug("%s: state read failed: %r", self.name, err)
        finally:
            self._refreshing = False

    def poll_needed(self, seconds_since_last_poll: float | None) -> bool:
        if seconds_since_last_poll is not None and seconds_since_last_poll < PASSIVE_POLL_INTERVAL:
            return False
        return time.monotonic() - self._last_full_update >= PASSIVE_POLL_INTERVAL

    def _background(self, coro: Coroutine[Any, Any, Any]) -> None:
        task = asyncio.get_running_loop().create_task(coro)
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)

    # --- reading ------------------------------------------------------------------------

    async def update(self) -> None:
        """Read what the advertisement does not carry."""
        self.merge(await self.read_basic_info())
        self._last_full_update = time.monotonic()

    async def read_basic_info(self) -> dict[str, Any]:
        reply = await self.command(BASIC_INFO, "reading basic info", min_length=3)
        return self.parse_basic_info(reply)

    @staticmethod
    def parse_basic_info(reply: bytes) -> dict[str, Any]:
        return {"battery": reply[1], "firmware": reply[2] / 10.0}

    # --- commands -----------------------------------------------------------------------

    async def request(self, command: bytes | str, *, retry: int | None = None) -> bytes:
        """Send one command and return the (decrypted) reply.

        BLE errors are retried ``retry`` times (default: the device's retry count;
        0 for commands that must not be sent twice).
        """
        payload = as_bytes(command)
        retries = self._retry_count if retry is None else retry
        for attempt in range(retries + 1):
            try:
                async with self._conn.lock:
                    if self.sync_clock_on_connect:
                        await self._sync_clock()
                    return await self._exchange(payload)
            except BleakNotFoundError:
                raise
            except RETRY_ERRORS as err:
                if attempt == retries:
                    raise
                _LOGGER.debug("%s: attempt %d failed: %r", self.name, attempt + 1, err)
        raise AssertionError("unreachable")

    async def command(
        self,
        command: bytes | str,
        what: str,
        *,
        ok: Iterable[int] = OK,
        min_length: int = 1,
    ) -> bytes:
        """Like :meth:`request`, raising OperationError unless the status is ``ok``."""
        reply = await self.request(command)
        if len(reply) < min_length or reply[0] not in ok:
            raise OperationError(f"{self.name}: {what} failed ({reply.hex() or 'empty'})")
        return reply

    async def commands(self, commands: Iterable[bytes | str], what: str) -> bytes:
        """Several commands in a row; the last reply."""
        reply = b""
        for command in commands:
            reply = await self.command(command, what)
        return reply

    async def disconnect(self) -> None:
        await self._conn.disconnect()

    async def _sync_clock(self) -> None:
        """``57000501 <UTC s>`` once per connection (caller holds the lock)."""
        await self._conn.ensure_connected()
        if self._clock_generation == self._conn.generation:
            return
        self._clock_generation = self._conn.generation
        reply = await self._exchange(bytes.fromhex(SET_UTC) + int(time.time()).to_bytes(8, "big"))
        if not reply or reply[0] not in OK:
            _LOGGER.debug("%s: clock sync answered %s", self.name, reply.hex())

    async def _exchange(self, payload: bytes) -> bytes:
        if self._password is not None:
            # 57 1x <crc32 of the password> <rest>
            payload = bytes((payload[0], 0x10 | payload[1] & 0x0F)) + self._password + payload[2:]
        return await self._conn.exchange(payload)

    def _on_notification(self, payload: bytes) -> bool:
        """Hook: True when an unsolicited notification was handled (not a reply)."""
        return False


class EncryptedDevice(Device):
    """A device whose commands are encrypted with the key from the SwitchBot cloud."""

    def __init__(
        self,
        ble_device: BLEDevice,
        *,
        key_id: str,
        encryption_key: str,
        retry_count: int = DEFAULT_RETRY_COUNT,
    ) -> None:
        self._key_id, self._key = check_key(key_id, encryption_key)
        self._session: Session | None = None
        self._session_generation = -1
        super().__init__(ble_device, retry_count=retry_count)

    async def verify_key(self) -> bool:
        """True when the device answers with this key."""
        try:
            await self.read_basic_info()
        except OperationError:
            return False
        return True

    async def _exchange(self, payload: bytes) -> bytes:
        conn = self._conn
        await conn.ensure_connected()
        if self._session is None or self._session_generation != conn.generation:
            reply = await conn.exchange(SESSION_REQUEST + bytes((self._key_id,)))
            self._session = Session.from_reply(self._key, reply)
            self._session_generation = conn.generation
        session = self._session
        header, ciphertext = session.encrypt(payload[1:])
        reply = await conn.exchange(bytes((payload[0], self._key_id)) + header + ciphertext)
        plain = reply[:1] + session.decrypt(reply[4:])
        session.advance()
        return plain

    def _decrypt_notification(self, payload: bytes) -> bytes | None:
        """Payload of an unsolicited encrypted notification (status byte dropped)."""
        if self._session is None:
            return None
        return self._session.decrypt(payload[4:])
