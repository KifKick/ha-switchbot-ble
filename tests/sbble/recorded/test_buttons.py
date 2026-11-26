"""Bot, Remote, Universal Remote: advertisement parsers, basic info, commands.

Results for generated inputs are pinned in data/ (record.py).
"""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock

import pytest

from custom_components.ha_switchbot_ble.sbble.core.const import Model
from custom_components.ha_switchbot_ble.sbble.devices.buttons.bot import Bot
from custom_components.ha_switchbot_ble.sbble.devices.buttons.remote import Remote
from custom_components.ha_switchbot_ble.sbble.devices.buttons.universal_remote import (
    UniversalRemote,
)

from .common import BLE, run, samples, sent
from .record import check, seed

CLASSES = {Model.BOT: Bot, Model.REMOTE: Remote, Model.UNIVERSAL_REMOTE: UniversalRemote}


def _run_async(coro):
    try:
        return ("ok", asyncio.run(coro))
    except Exception as err:
        return ("error", type(err).__name__)


@pytest.mark.parametrize("model", list(CLASSES), ids=str)
def test_advertisement_parser(model: Model) -> None:
    for service, mfr in samples(seed(model.value), 600):
        check(run(CLASSES[model].parse, service, mfr), service, mfr)


BASIC = bytes.fromhex("01 5a 45 32 00 00 00 00 03 11 0a 00 01")


@pytest.mark.parametrize("reply", [BASIC, bytes.fromhex("01 5a 45 32 00 00 00 00 03 00 0a 00 00"),
                                   b"\x07", b"\x00"])
def test_bot_basic_info(reply: bytes) -> None:
    bot = Bot(BLE)
    bot.request = AsyncMock(return_value=reply)
    check(asyncio.run(bot.read_basic_info()))


@pytest.mark.parametrize("reply", [BASIC, b"\x07"])
def test_universal_remote_basic_info(reply: bytes) -> None:
    remote = UniversalRemote(BLE)
    remote.request = AsyncMock(return_value=reply)
    check(asyncio.run(remote.read_basic_info()))


@pytest.mark.parametrize("method", ["press", "turn_on", "turn_off"])
@pytest.mark.parametrize("reply", [b"\x01", b"\x05", b"\x09", b""])
def test_bot_commands(method: str, reply: bytes) -> None:
    bot = Bot(BLE, password="secret")
    bot.request = AsyncMock(return_value=reply)
    bot.update = AsyncMock()
    result = _run_async(getattr(bot, method)())
    check({"result": result, "sent": sent(bot.request), "updates": bot.update.await_count})
    if result[0] == "ok" and method != "press":
        assert bot.is_on() is (method == "turn_on")


def test_bot_password_frame() -> None:
    """``57 01 00`` with a password becomes ``57 11 <crc32> 00``."""
    bot = Bot(BLE, password="secret")
    bot._conn.exchange = AsyncMock(return_value=b"\x01")
    asyncio.run(bot._exchange(bytes.fromhex("570100")))
    frame = bot._conn.exchange.await_args.args[0].hex()
    assert frame.startswith("5711") and frame.endswith("00")
    check(frame)
