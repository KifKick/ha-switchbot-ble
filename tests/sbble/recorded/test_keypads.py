"""Keypad Vision / Vision Pro: parser, basic info and add-password results for generated
inputs, pinned in data/ (record.py)."""

from __future__ import annotations

import asyncio
import random
from unittest.mock import AsyncMock

import pytest

from custom_components.ha_switchbot_ble.sbble import MODELS, Model

from .common import BLE, KEY, run, sent
from .record import check

VISION = (Model.KEYPAD_VISION, Model.KEYPAD_VISION_PRO)


@pytest.mark.parametrize("model", VISION, ids=str)
def test_parser(model: Model) -> None:
    rnd = random.Random(11)
    for _ in range(1500):
        mfr = bytes(rnd.randrange(256) for _ in range(rnd.choice((0, 12, 13, 14, 16))))
        check(run(MODELS[model].parser, None, mfr or None), model, mfr.hex())


def _device(model: Model, reply: bytes):
    device = MODELS[model].cls(BLE, key_id="ab", encryption_key=KEY)
    device.request = AsyncMock(return_value=reply)
    return device


@pytest.mark.parametrize("model", VISION, ids=str)
def test_basic_info(model: Model) -> None:
    rnd = random.Random(12)
    for _ in range(300):
        reply = bytes([1]) + bytes(rnd.randrange(256) for _ in range(15))
        check(asyncio.run(_device(model, reply).read_basic_info()), reply.hex())


@pytest.mark.parametrize("model", VISION, ids=str)
@pytest.mark.parametrize("password, reply", [
    ("123456", b"\x01"), ("123456789012", b"\x01"), ("98765432", b"\x05"),
])
def test_add_password(model: Model, password: str, reply: bytes) -> None:
    device = _device(model, reply)
    check([asyncio.run(device.add_password(password)), sent(device.request)])


def test_add_password_rejects_bad_codes() -> None:
    device = _device(Model.KEYPAD_VISION, b"\x01")
    for bad in ("12345", "1234567890123", "12a456"):
        with pytest.raises(ValueError):
            asyncio.run(device.add_password(bad))
    device.request.assert_not_called()


def test_event_reads_basic_info() -> None:
    from custom_components.ha_switchbot_ble.sbble.core.advertisement import Advertisement

    async def go() -> None:
        device = _device(Model.KEYPAD_VISION, bytes([1]) + bytes(15))
        mfr = bytes(6) + bytes((5, 0x64, 0, 0, 0, 0, 0, 0))
        data = MODELS[Model.KEYPAD_VISION].parser(None, mfr)
        device.update_from_advertisement(Advertisement(BLE.address, Model.KEYPAD_VISION, "x",
                                                       data, -60, False, BLE))
        await asyncio.sleep(0)
        await asyncio.sleep(0)
        assert sent(device.request) == ["5702"]
    asyncio.run(go())
