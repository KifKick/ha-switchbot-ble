"""Advertisement parsers, model detection, encryption and lock/keypad parsers.

Results for generated inputs, pinned in data/ (record.py).
"""

from __future__ import annotations

import asyncio
import random
from unittest.mock import AsyncMock

from bleak.backends.scanner import AdvertisementData
import pytest

from custom_components.ha_switchbot_ble.sbble import MODELS, Model, parse
from custom_components.ha_switchbot_ble.sbble.core.crypto import AesMode, Session
from custom_components.ha_switchbot_ble.sbble.devices.keypads import keypad_history
from custom_components.ha_switchbot_ble.sbble.devices.keypads.keypad_base import KeypadBase
from custom_components.ha_switchbot_ble.sbble.devices.locks import lock_base, lock_history
from custom_components.ha_switchbot_ble.sbble.devices.locks.lock_base import LockBase
from custom_components.ha_switchbot_ble.sbble.devices.locks.lock_ultra import LockUltra
from custom_components.ha_switchbot_ble.sbble.devices.sensors import (
    thermo_hygrometer_base as thermo,
)

from .common import BLE, KEY, run, samples, sent
from .record import check, seed

# --- advertisements ------------------------------------------------------------------------


@pytest.mark.parametrize("model", sorted(MODELS, key=str))
def test_advertisement_parser(model: Model) -> None:
    for service, mfr in samples(seed(model.value)):
        check(run(MODELS[model].parser, service, mfr), model, service, mfr)


CODES = sorted({code for info in MODELS.values() for code in info.codes})


def test_codes() -> None:
    check(CODES)


@pytest.mark.parametrize("raw", CODES, ids=bytes.hex)
def test_model_detection(raw: bytes) -> None:
    service = (raw + b"\x00\x64\x0a\x95\x40" if len(raw) == 1
               else b"\x00" * 6 + raw)
    mfr = bytes.fromhex("aabbccddeeff") + bytes(range(1, 19))  # 24 bytes: long enough for all
    adv = AdvertisementData(None, {2409: mfr},
                            {"0000fd3d-0000-1000-8000-00805f9b34fb": service}, [], None, -60, ())
    result = parse(BLE, adv)
    assert result is not None
    assert result.active
    check({"model": result.model.value, "name": result.name, "data": result.data})


# --- encryption -------------------------------------------------------------------------------


@pytest.mark.parametrize("mode", [AesMode.CTR, AesMode.GCM])
def test_encryption(mode: AesMode) -> None:
    iv = bytes(range(16 if mode is AesMode.CTR else 12))
    session = Session(bytes.fromhex(KEY), mode, iv)
    for payload in ("0f4f8107", "0f4e0101000080", "0f4f0700", "02"):
        header, ciphertext = session.encrypt(bytes.fromhex(payload))
        assert session.decrypt(ciphertext).hex() == payload
        if mode is AesMode.GCM:
            session.advance()
        check([header, ciphertext, session.iv], payload)


@pytest.mark.parametrize("mode, reply", [
    (AesMode.CTR, "01000000" + "11" * 16),
    (AesMode.GCM, "01000100" + "22" * 12 + "33" * 4),
])
def test_session_from_reply(mode: AesMode, reply: str) -> None:
    session = Session.from_reply(b"k" * 16, bytes.fromhex(reply))
    assert session.mode is mode
    assert len(session.iv) == (16 if mode is AesMode.CTR else 12)


# --- lock replies --------------------------------------------------------------------------------


LOCK_MODELS = sorted((m for m, i in MODELS.items() if issubclass(i.cls, LockBase)), key=str)


def _lock(model: Model):
    return MODELS[model].cls(BLE, key_id="ab", encryption_key=KEY)


@pytest.mark.parametrize("model", LOCK_MODELS)
def test_lock_status(model: Model) -> None:
    rnd = random.Random(seed(model.value))
    for _ in range(300):
        d = bytes(rnd.randrange(256) for _ in range(rnd.choice((2, 6, 7, 8))))
        check(run(MODELS[model].cls.parse_status, d), model, d.hex())


@pytest.mark.parametrize("model", [Model.LOCK_ULTRA_MAX, Model.LOCK_PRO])
def test_lock_settings_parsers(model: Model) -> None:
    rnd = random.Random(7)
    for sub, min_length, parser in _lock(model).readers:
        if sub == "040f":  # drive force: test_drive_force
            continue
        for _ in range(200):
            r = bytes(rnd.randrange(256) for _ in range(rnd.randrange(min_length, 10)))
            check(run(parser, r), sub, r.hex())


def test_drive_force() -> None:
    device = LockUltra(BLE, key_id="ab", encryption_key=KEY)
    for firmware in (None, 3.0, 3.1):
        device.data = {"firmware": firmware}
        for value in ("028a000a", "03520032", "ffffffff", "01020304"):
            check(device._drive_force(bytes.fromhex("01" + value)), firmware, value)


def test_lock_history() -> None:
    rnd = random.Random(3)
    for _ in range(2000):
        pkt = bytes([1]) + bytes(rnd.randrange(256) for _ in range(rnd.choice((8, 11))))
        pkt = pkt[:6] + bytes([rnd.choice((1, 2, 4, 5, 9))]) + pkt[7:]
        check(run(lock_history.parse_lock_record, pkt), pkt.hex())


def test_keypad_history() -> None:
    rnd = random.Random(4)
    for _ in range(2000):
        pkt = bytes([1]) + bytes(rnd.randrange(256) for _ in range(10))
        pkt = pkt[:8] + bytes([rnd.choice((1, 2, 4, 5, 7, 9))]) + pkt[9:]
        check(run(keypad_history.parse_keypad_record, pkt), pkt.hex())


def test_keypad_basic_info() -> None:
    rnd = random.Random(5)
    for _ in range(500):
        r = bytes(rnd.randrange(256) for _ in range(rnd.randrange(5, 17)))
        check(run(KeypadBase.parse_basic_info, r), r.hex())


def test_thermo_calibration() -> None:
    for t in (-20.0, -3.4, -0.1, 0.0, 0.1, 1.5, 19.9):
        for h in (-50, -1, 0, 7, 50):
            raw = thermo.encode_calibration(t, h)
            check([raw, thermo.decode_calibration(raw).as_dict()], t, h)


# --- command frames ------------------------------------------------------------------------------

LOCK_WRITES = [
    ("set_led", (True,)), ("set_led", (False,)), ("set_sound", (True,)),
    ("set_button", ()), ("set_button", (False,)), ("set_button", (True, "double_press", "toggle")),
    ("set_motor_speed", ("quiet",)), ("set_timer", ("auto_lock", True, 125)),
    ("set_timer", ("unlocked_alarm", False, 3600)), ("set_auto_lock_paused", (True,)),
    ("set_half_lock_enabled", (True,)), ("set_quick_unlock_mode", ("unlatch_only",)),
    ("set_eu_button", ("unlatch", "none", 30)), ("set_eu_button", ()),
    ("set_night_mode_enabled", (True,)), ("calibration_command", ("start",)),
    ("calibration_command", ("half_lock_complete",)), ("set_calibration_latch", (True,)),
]
ULTRA_MAX_WRITES = [
    ("set_volume", ("beep_volume", 3)), ("set_voice_language", ("french",)),
    ("set_weather_announcement", ("off",)),
]
REPLY = bytes.fromhex("01" + "05" * 10)


@pytest.mark.parametrize("model, method, args", [
    *((Model.LOCK_ULTRA, m, a) for m, a in LOCK_WRITES),
    *((Model.LOCK_ULTRA_MAX, m, a) for m, a in ULTRA_MAX_WRITES),
    *((Model.LOCK_PRO, m, a) for m, a in LOCK_WRITES[:4] + LOCK_WRITES[7:10]),
])
def test_lock_writes(model: Model, method: str, args: tuple) -> None:
    device = _lock(model)
    device.request = AsyncMock(return_value=REPLY)
    asyncio.run(getattr(device, method)(*args))
    check(sent(device.request))


@pytest.mark.parametrize("model, action, expected", [
    (Model.LOCK, lock_base.LOCK, "570f4e01011000"),
    (Model.LOCK_LITE, lock_base.UNLOCK, "570f4e01011080"),
    (Model.LOCK_PRO, lock_base.UNLOCK_KEEP_LATCH, "570f4e01010000a0"),
    (Model.LOCK_ULTRA, lock_base.HALF_LOCK, "570f4e0101000008"),
])
def test_lock_operation_frames(model: Model, action: int, expected: str) -> None:
    device = _lock(model)
    device.request = AsyncMock(return_value=REPLY)
    device.data = {"status": None, "half_lock_calibration": True}

    async def operate() -> None:
        device.refresh_status = AsyncMock()
        await device._operate(action, set())

    asyncio.run(operate())
    info = {Model.LOCK: "01", Model.LOCK_LITE: "01", Model.LOCK_PRO: "04",
            Model.LOCK_ULTRA: "07"}[model]
    assert sent(device.request) == [f"570e01001e000081{info}", expected, "5702"]
