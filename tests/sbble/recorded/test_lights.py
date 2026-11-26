"""Lights: advertisement parsers, model detection, state reads, properties, command frames.

Results for generated inputs are pinned in data/ (record.py).
"""

from __future__ import annotations

import asyncio
import random
from unittest.mock import AsyncMock

from bleak.backends.scanner import AdvertisementData
import pytest

from custom_components.ha_switchbot_ble.sbble import MODELS, EncryptedDevice, Model, parse
from custom_components.ha_switchbot_ble.sbble.devices import lights
from custom_components.ha_switchbot_ble.sbble.devices.lights.light_base import LightBase

from .common import BLE, KEY, run, samples, sent
from .record import check, seed

LIGHT_MODELS = sorted(
    (m for m, i in MODELS.items() if i.cls.__module__.startswith(lights.__name__)), key=str
)
DEVICE_MODELS = sorted((
    Model.COLOR_BULB, Model.LIGHT_STRIP, Model.CEILING_LIGHT, Model.CEILING_LIGHT_PRO,
    Model.FLOOR_LAMP, Model.STRIP_LIGHT_3, Model.RGBICWW_STRIP_LIGHT, Model.RGBICWW_FLOOR_LAMP,
    Model.RGBICWW_LIGHT_BARS, Model.PERMANENT_OUTDOOR_LIGHT, Model.CANDLE_WARMER_LAMP,
    Model.RGBIC_NEON_ROPE_LIGHT, Model.RGBIC_NEON_WIRE_ROPE_LIGHT,
), key=str)


def _replies(start: int, count: int = 8) -> list[bytes]:
    rnd = random.Random(start)
    return [bytes([1]) + bytes(rnd.randrange(256) for _ in range(13)) for _ in range(count)]


def _device(model: Model, replies: list[bytes], data: dict | None = None) -> LightBase:
    """A light whose requests get ``replies`` (one per request)."""
    cls = MODELS[model].cls
    device = (cls(BLE, key_id="ab", encryption_key=KEY) if issubclass(cls, EncryptedDevice)
              else cls(BLE))
    device.request = AsyncMock(side_effect=list(replies))
    device.data = dict(data or {})
    return device


# --- advertisements ----------------------------------------------------------------------


@pytest.mark.parametrize("model", LIGHT_MODELS)
def test_parser(model: Model) -> None:
    for service, mfr in samples(seed(model.value), 600):
        check(run(MODELS[model].parser, service, mfr), model, service, mfr)


@pytest.mark.parametrize("model", LIGHT_MODELS)
def test_detection(model: Model) -> None:
    for code in MODELS[model].codes:
        service = code + b"\x00\x64" if len(code) == 1 else b"\x00" * 6 + code
        mfr = bytes.fromhex("aabbccddeeff") + bytes(range(1, 15))
        adv = AdvertisementData(None, {2409: mfr},
                                {"0000fd3d-0000-1000-8000-00805f9b34fb": service}, [], None, -60, ())
        result = parse(BLE, adv)
        assert result is not None and result.model is model
        check([result.name, result.model.value], code)


# --- state read ---------------------------------------------------------------------------------


@pytest.mark.parametrize("model", DEVICE_MODELS)
def test_state_read(model: Model) -> None:
    for start in range(40):
        replies = _replies(start)
        if start % 5 == 0:
            replies[1] = b"\x05" + replies[1][1:]  # rejected
        device = _device(model, replies)
        info = asyncio.run(device.get_basic_info())
        check({"info": info, "state": device._state, "rgb": device.rgb,
               "color_temp": device.color_temp, "sent": sent(device.request)}, start)


@pytest.mark.parametrize("model", DEVICE_MODELS)
def test_properties(model: Model) -> None:
    for mode in (None, 0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 15):
        for data in ({"color_mode": mode, "isOn": True, "brightness": 40},
                     {"isOn": False}, {"effect": "christmas", "brightness": 0}):
            data = {k: v for k, v in data.items() if v is not None}
            d = _device(model, [], data)
            check({"color_mode": run(lambda d=d: d.color_mode),
                   "color_modes": set(d.color_modes),
                   "rest": (d.on, d.brightness, d.get_effect(), d.get_effect_list,
                            d.min_temp, d.max_temp)}, data)


# --- operations -----------------------------------------------------------------------------------

OPERATIONS = [
    ("turn_on", ()), ("turn_off", ()), ("set_brightness", (55,)),
    ("set_color_temp", (60, 3000)), ("set_rgb", (70, 1, 2, 3)),
    ("set_brightness", (101,)), ("set_rgb", (10, 256, 0, 0)), ("set_color_temp", (10, 2000)),
    ("set_effect", ("christmas",)), ("set_effect", ("colorful",)), ("set_effect", ("romance",)),
    ("set_effect", ("nope",)),
]
CEILING_OPERATIONS = [("set_night_light", (True,)), ("set_night_light", (False,)),
                      ("set_night_light", (True, 35)), ("set_night_light", (False, 120))]


def _outcome(coro_fn) -> tuple:
    try:
        return ("ok", asyncio.run(coro_fn()))
    except ValueError as err:
        return ("invalid", type(err).__name__)
    except Exception as err:
        return ("error", type(err).__name__)


@pytest.mark.parametrize("model, method, args", [
    *((m, op, a) for m in DEVICE_MODELS for op, a in OPERATIONS),
    *((m, op, a) for m in (Model.CEILING_LIGHT, Model.CEILING_LIGHT_PRO)
      for op, a in CEILING_OPERATIONS),
])
def test_operation_frames(model: Model, method: str, args: tuple) -> None:
    device = _device(model, _replies(seed(model.value, method, args)), {"color_mode": 1})
    result = _outcome(lambda: getattr(device, method)(*args))
    ok = result[0] == "ok"
    check({"result": result, "sent": sent(device.request),
           "effect": device.get_effect() if ok else None,
           "state": device._state if ok else None})
