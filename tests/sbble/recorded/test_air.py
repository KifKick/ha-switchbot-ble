"""Air purifiers, fans and humidifiers: advertisements, reads and command frames.

Results for generated inputs are pinned in data/ (record.py).
"""

from __future__ import annotations

import asyncio
from pathlib import Path
import random
import re
from typing import Any
from unittest.mock import AsyncMock

import pytest

from custom_components.ha_switchbot_ble.sbble.core.advertisement import MODELS
from custom_components.ha_switchbot_ble.sbble.core.const import Model
from custom_components.ha_switchbot_ble.sbble.devices import air  # noqa: F401 (registers)
from custom_components.ha_switchbot_ble.sbble.devices.air.circulator_fan import CirculatorFan
from custom_components.ha_switchbot_ble.sbble.devices.air.circulator_fan_pro import (
    CirculatorFanPro,
)
from custom_components.ha_switchbot_ble.sbble.devices.air.evaporative_humidifier import (
    EvaporativeHumidifier,
    HumidifierMode,
)
from custom_components.ha_switchbot_ble.sbble.devices.air.humidifier import Humidifier
from custom_components.ha_switchbot_ble.sbble.devices.air.standing_fan import StandingFan

from .common import BLE, KEY, run
from .record import check, seed

REPLY = bytes.fromhex("01" + "00" * 17)


def air_samples(start: int, count: int = 500):
    """Random (service data, manufacturer data) pairs of the lengths these models use."""
    rnd = random.Random(start)
    for _ in range(count):
        service = bytes(rnd.randrange(256) for _ in range(rnd.choice((0, 3, 5, 6, 9))))
        mfr = bytes(rnd.randrange(256)
                    for _ in range(rnd.choice((0, 9, 10, 12, 13, 14, 16, 17, 20))))
        yield service or None, mfr or None


def check_parser(model: Model) -> None:
    parser = MODELS[model].parser
    for service, mfr in air_samples(seed(model.value)):
        check(run(parser, service, mfr), model, service and service.hex(), mfr and mfr.hex())


def frames(device, method: str, args: tuple, state: dict, replies=None) -> list[str]:
    """Frames ``method`` sends with ``state`` as the device data."""
    device.data = dict(state)
    device.request = AsyncMock(side_effect=replies) if replies else AsyncMock(
        return_value=REPLY)
    device.update = AsyncMock()
    asyncio.run(getattr(device, method)(*args))
    return [(c.args[0] if isinstance(c.args[0], str) else c.args[0].hex()).lower()
            for c in device.request.call_args_list]


async def _call(func, *args):
    try:
        return ("ok", await func(*args))
    except Exception as err:  # the error is part of the result
        return ("error", type(err).__name__)


OK_READS: list[str] = []  # how many reads succeeded (see the tests)


def check_read(device, method: str, replies: list[bytes], state: dict | None = None) -> Any:
    """Run one read on ``device`` with ``replies``, check its result; returns it."""
    device.data = dict(state or {})
    device.request = AsyncMock(side_effect=list(replies))
    result = asyncio.run(_call(getattr(device, method)))
    check(result, method, [r.hex() for r in replies])
    if result[0] == "ok" and result[1] is not None:
        OK_READS.append(method)
    return result


def random_reply(rnd: random.Random, length: int, statuses=(1, 1, 1, 6, 0x0E, 5)) -> bytes:
    return bytes([rnd.choice(statuses)]) + bytes(rnd.randrange(256) for _ in range(length - 1))


# --- advertisements --------------------------------------------------------------------------

AIR_MODELS = [Model.AIR_PURIFIER_US, Model.AIR_PURIFIER_JP, Model.AIR_PURIFIER_TABLE_US,
              Model.AIR_PURIFIER_TABLE_JP, Model.CIRCULATOR_FAN, Model.STANDING_FAN,
              Model.CIRCULATOR_FAN_PRO, Model.EVAPORATIVE_HUMIDIFIER, Model.HUMIDIFIER]


@pytest.mark.parametrize("model", AIR_MODELS)
def test_advertisement_parsers(model: Model) -> None:
    check_parser(model)


def test_registered_codes() -> None:
    for model in AIR_MODELS:
        check((sorted(MODELS[model].codes), MODELS[model].name), model)


# --- air purifier ----------------------------------------------------------------------------

PURIFIERS = [Model.AIR_PURIFIER_US, Model.AIR_PURIFIER_TABLE_JP]


def _purifier(model: Model):
    return MODELS[model].cls(BLE, key_id="ab", encryption_key=KEY)


@pytest.mark.parametrize("model", PURIFIERS)
def test_purifier_reads(model: Model) -> None:
    OK_READS.clear()
    rnd = random.Random(11)
    for _ in range(200):
        replies = [random_reply(rnd, 17, (1, 1, 1, 0)), random_reply(rnd, 6, (1, 1, 0)),
                   random_reply(rnd, 2, (1, 1, 0))]
        device = _purifier(model)
        if check_read(device, "read_basic_info", replies)[0] == "ok":
            check(device.rgb, "rgb")
        check_read(_purifier(model), "get_extra_settings",
                   [random_reply(rnd, 2), random_reply(rnd, 4)])
    assert OK_READS.count("read_basic_info") > 50


PURIFIER_OPS = [
    ("turn_on", ()), ("turn_off", ()), ("set_percentage", (55,)),
    *(("set_preset_mode", (m,)) for m in ("level_1", "level_2", "level_3", "auto", "sleep", "pet")),
    ("open_child_lock", ()), ("close_child_lock", ()), ("open_wireless_charging", ()),
    ("close_wireless_charging", ()), ("set_brightness", (40,)), ("set_rgb", (50, 1, 2, 3)),
    ("turn_led_on", ()), ("turn_led_off", ()), ("open_light_sensitive_switch", ()),
    ("set_beep", (True,)), ("set_beep", (False,)), ("set_off_timer", (90,)),
    ("set_off_timer", (0,)), ("set_indicator_mode", ("auto",)), ("set_indicator_mode", ("off",)),
    ("reset_filter_usage", ()),
]


@pytest.mark.parametrize("method, args", PURIFIER_OPS)
def test_purifier_frames(method: str, args: tuple) -> None:
    device = _purifier(Model.AIR_PURIFIER_TABLE_US)
    device._rgb = (1, 2, 3)
    check(frames(device, method, args, {"mode": "level_2"}))


# --- fans -------------------------------------------------------------------------------------

PRO_KWARGS = {"key_id": "ab", "encryption_key": KEY}
FANS = [(CirculatorFan, {}), (StandingFan, {}), (CirculatorFanPro, PRO_KWARGS)]


@pytest.mark.parametrize("cls, kwargs", FANS)
def test_fan_reads(cls, kwargs) -> None:
    OK_READS.clear()
    rnd = random.Random(12)
    for _ in range(300):
        if cls is CirculatorFanPro:
            replies = [random_reply(rnd, rnd.choice((2, 3, 4))), random_reply(rnd, 10)]
        else:
            replies = [random_reply(rnd, rnd.choice((10, 11, 12)), (1, 1, 0)),
                       random_reply(rnd, rnd.choice((1, 3, 4)), (1, 1, 7))]
            if len(replies[1]) == 1:
                replies[1] = rnd.choice((b"\x07", b"\x00", b"\x01"))
        check_read(cls(BLE, **kwargs), "read_basic_info", replies)
    if cls is CirculatorFanPro:
        for _ in range(100):
            check_read(cls(BLE, **kwargs), "get_extra_settings", [random_reply(rnd, 2)])
    assert OK_READS.count("read_basic_info") > 100


FAN_OPS = [
    ("turn_on", ()), ("turn_off", ()), ("set_percentage", (40,)),
    ("set_oscillation", (True,)), ("set_oscillation", (False,)),
    ("set_horizontal_oscillation", (True,)), ("set_horizontal_oscillation", (False,)),
    ("set_vertical_oscillation", (True,)), ("set_vertical_oscillation", (False,)),
]
COMMON_FAN_OPS = [*FAN_OPS, *(("set_night_light", (s,)) for s in (1, 2, 3))]
STANDING_OPS = [
    *COMMON_FAN_OPS,
    *(("set_preset_mode", (m,)) for m in ("normal", "natural", "sleep", "baby", "custom_natural")),
    *((m, (v,)) for m in ("set_child_lock", "set_display", "set_sound", "set_auto_recenter")
      for v in (True, False)),
]
PRO_OPS = [
    *FAN_OPS, ("set_percentage", (150,)), ("set_percentage", (0,)),
    *(("set_preset_mode", (m,)) for m in ("normal", "natural", "sleep", "hurricane")),
    ("turn_on_light", (True,)), ("turn_on_light", (False,)), ("turn_off_light", ()),
    *((m, (v,)) for m in ("set_child_lock", "set_beep", "set_indicator_light")
      for v in (True, False)),
]


@pytest.mark.parametrize("cls, kwargs, method, args", [
    *((CirculatorFan, {}, m, a) for m, a in
      [*COMMON_FAN_OPS, *(("set_preset_mode", (x,)) for x in ("normal", "natural", "sleep",
                                                              "baby"))]),
    *((StandingFan, {}, m, a) for m, a in STANDING_OPS),
    *((CirculatorFanPro, PRO_KWARGS, m, a) for m, a in PRO_OPS),
])
def test_fan_frames(cls, kwargs, method, args) -> None:
    check(frames(cls(BLE, **kwargs), method, args, {}))


@pytest.mark.parametrize("kwargs", [{"horizontal": True}, {"vertical": False},
                                    {"horizontal": False, "vertical": True}])
def test_fan_pro_recenter(kwargs) -> None:
    device = CirculatorFanPro(BLE, **PRO_KWARGS)
    device.request = AsyncMock(return_value=REPLY)
    asyncio.run(device.set_power_off_recenter(**kwargs))
    check([c.args[0] for c in device.request.call_args_list])


@pytest.mark.parametrize("method, angle, frame", [
    # the catalog's Standing Fan oscillation angle entities use these
    ("set_horizontal_oscillation_angle", 30, "570f4102021effffff"),
    ("set_horizontal_oscillation_angle", 90, "570f4102025affffff"),
    ("set_vertical_oscillation_angle", 60, "570f410202ffff3cff"),
    ("set_vertical_oscillation_angle", 90, "570f410202ffff5fff"),
])
def test_standing_fan_angles(method: str, angle: int, frame: str) -> None:
    assert frames(StandingFan(BLE), method, (angle,), {}) == [frame]


# --- humidifiers -------------------------------------------------------------------------------


def _evaporative() -> EvaporativeHumidifier:
    return EvaporativeHumidifier(BLE, key_id="ab", encryption_key=KEY)


def test_evaporative_reads() -> None:
    OK_READS.clear()
    rnd = random.Random(13)
    for _ in range(300):
        reply = random_reply(rnd, rnd.choice((11, 12, 14, 17)), (1, 1, 0))
        if rnd.random() < 0.05:
            reply = rnd.choice((b"\x07", b"\x00"))
        check_read(_evaporative(), "read_basic_info", [reply])
        check_read(_evaporative(), "get_extra_settings",
                   [random_reply(rnd, 3), random_reply(rnd, 3), random_reply(rnd, 2),
                    random_reply(rnd, 6)])
    assert OK_READS.count("read_basic_info") > 150


EVAPORATIVE_STATE = {"mode": HumidifierMode.TARGET_HUMIDITY, "is_meter_binded": True,
                     "target_humidity": 55, "water_level": "high",
                     "dnd_start_utc": "20:00", "dnd_end_utc": "05:30"}
EVAPORATIVE_OPS = [
    ("turn_on", ()), ("turn_off", ()), ("set_target_humidity", (60,)),
    *(("set_mode", (m,)) for m in HumidifierMode),
    ("set_child_lock", (True,)), ("set_child_lock", (False,)),
    ("set_over_humidify_protection", (True, 70)), ("set_over_humidify_protection", ()),
    ("set_prompt_sound", (True,)), ("set_alarm_sound", (False,)),
    ("set_dnd", (True, "21:30", "06:15")), ("set_dnd", (False,)),
]


@pytest.mark.parametrize("method, args", EVAPORATIVE_OPS)
def test_evaporative_frames(method: str, args: tuple) -> None:
    check(frames(_evaporative(), method, args, EVAPORATIVE_STATE))


@pytest.mark.parametrize("state", [{"isOn": True, "level": 101}, {"isOn": False, "level": 128},
                                   {"isOn": True, "level": 47}])
@pytest.mark.parametrize("method, args", [
    ("turn_on", ()), ("turn_off", ()), ("set_level", (40,)), ("async_set_auto", ()),
    ("async_set_manual", ()),
])
def test_humidifier_frames(state: dict, method: str, args: tuple) -> None:
    check(frames(Humidifier(BLE), method, args, state))


def test_never_mcu_update_command() -> None:
    """570f4c0c force-updates the purifier MCU: no code path may build it."""
    root = Path(__file__).parents[3] / "custom_components/ha_switchbot_ble/sbble/devices/air"
    for path in root.glob("*.py"):
        assert not re.search(r"\{HEAD\}0c|[\"']570f4c0c", path.read_text(), re.I), path
