"""Live status of a device in a calibration wizard, shared by locks and covers.

While any panel watches a device it is polled every ``interval`` seconds
(which also keeps the BLE link up); when the last watcher leaves while a
calibration is started, ``recover`` runs (the device leaves calibration mode
or gets its previous calibration back).
"""

from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
import logging
from typing import Any

from homeassistant.components import websocket_api
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback

from ..coordinator import BLE_ERRORS
from . import panel_data

_LOGGER = logging.getLogger(__name__)


@dataclass
class LiveSession:
    """Calibration state of one device, shared by all panel subscriptions."""

    subscribers: int = 0
    started: bool = False
    poll_task: asyncio.Task | None = None
    busy: asyncio.Lock = field(default_factory=asyncio.Lock)
    extra: dict[str, Any] = field(default_factory=dict)  # per-family wizard state


def live_session(hass: HomeAssistant, kind: str, entry_id: str) -> LiveSession:
    return panel_data(hass).setdefault(kind, {}).setdefault(entry_id, LiveSession())


@callback
def subscribe_live(
    hass: HomeAssistant,
    connection,
    msg: dict,
    entry: ConfigEntry,
    session: LiveSession,
    *,
    payload: Callable[[], dict[str, Any]],
    poll: Callable[[], Awaitable[Any]],
    recover: Callable[[], Awaitable[Any]],
    interval: float,
) -> None:
    """Push ``payload()`` now and on every device update; poll while watched."""
    device = entry.runtime_data.device

    @callback
    def _push() -> None:
        connection.send_message(websocket_api.event_message(msg["id"], payload()))

    unsub_device = device.subscribe(_push)
    session.subscribers += 1
    if session.poll_task is None:
        session.poll_task = entry.async_create_background_task(
            hass, _poll(device.name, session, poll, interval),
            f"switchbot calibration poll {entry.entry_id}",
        )

    @callback
    def _unsubscribe() -> None:
        unsub_device()
        session.subscribers = max(0, session.subscribers - 1)
        if session.subscribers:
            return
        if session.poll_task:
            session.poll_task.cancel()
            session.poll_task = None
        if session.started:
            _LOGGER.warning("%s: panel closed mid-calibration, restoring", entry.title)
            entry.async_create_background_task(
                hass, _recover(device.name, session, recover),
                f"switchbot calibration recover {entry.entry_id}",
            )

    connection.subscriptions[msg["id"]] = _unsubscribe
    connection.send_result(msg["id"])
    _push()


async def _poll(name: str, session: LiveSession, poll: Callable[[], Awaitable[Any]],
                interval: float) -> None:
    while True:
        if not session.busy.locked():
            try:
                await poll()
            except BLE_ERRORS as err:
                _LOGGER.debug("%s: status poll failed: %s", name, err)
            except Exception:  # keep polling whatever happens
                _LOGGER.exception("%s: status poll error", name)
        await asyncio.sleep(interval)


async def _recover(name: str, session: LiveSession,
                   recover: Callable[[], Awaitable[Any]]) -> None:
    try:
        async with session.busy:
            await recover()
    except BLE_ERRORS as err:
        _LOGGER.error("%s: leaving the calibration failed: %s", name, err)
    finally:
        session.started = False
