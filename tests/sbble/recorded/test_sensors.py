"""Sensors (Meter Pro family, Weather Station, contact, motion, presence, leak): parser and
Meter Pro command results for generated inputs, pinned in data/ (record.py)."""

from __future__ import annotations

import asyncio
import random
from unittest.mock import AsyncMock

import pytest

from custom_components.ha_switchbot_ble.sbble import MODELS, Model
from custom_components.ha_switchbot_ble.sbble.devices.sensors.meter_pro import MeterPro
from custom_components.ha_switchbot_ble.sbble.devices.sensors.meter_pro_co2 import MeterProCO2

from .common import BLE, run, sent
from .record import check, seed

MODELS_HERE = (Model.METER_PRO, Model.METER_PRO_CO2, Model.WEATHER_STATION,
               Model.CONTACT_SENSOR, Model.MOTION_SENSOR, Model.PRESENCE_SENSOR, Model.LEAK)


def sensor_samples(start: int, count: int = 1500):
    rnd = random.Random(start)
    for _ in range(count):
        service = bytes(rnd.randrange(256) for _ in range(rnd.choice((0, 2, 3, 6, 9, 12))))
        mfr = bytes(rnd.randrange(256) for _ in range(rnd.choice((0, 7, 8, 9, 11, 12, 13, 15, 19))))
        yield service or None, mfr or None


@pytest.mark.parametrize("model", MODELS_HERE, ids=str)
def test_parser(model: Model) -> None:
    for service, mfr in sensor_samples(seed(model.value)):
        check(run(MODELS[model].parser, service, mfr), model, service, mfr)


def test_leak_water_bit_is_bit_6() -> None:
    """Water is mfr[8] bit 6, not bit 0 (docs/water-leak-detector.md)."""
    parse = MODELS[Model.LEAK].parser
    mfr = bytes(6) + bytes((1, 0x64, 0x01))
    assert parse(None, mfr)["leak"] is False
    assert parse(None, mfr[:8] + b"\x40")["leak"] is True


# --- Meter Pro commands ---------------------------------------------------------------------

CALLS = [
    ("get_time_offset", (), "0180001000"),
    ("get_time_offset", (), "0100000a00"),
    ("set_time_offset", (-4096,), "01"),
    ("set_time_offset", (3600,), "01"),
    ("get_datetime", (), "01e402942300 07e90c1e083701".replace(" ", "")),
    ("get_datetime", (), "01e402942380 07e90c1e083701".replace(" ", "")),
    ("set_datetime", (1767000000, -6, 30), "01"),
    ("set_datetime", (1767000000, 5, 0), "01"),
    ("set_time_display_format", (True,), "01"),
    ("set_time_display_format", (False,), "01"),
]


@pytest.mark.parametrize("cls", [MeterPro, MeterProCO2], ids=lambda c: c.__name__)
@pytest.mark.parametrize("method, args, reply", CALLS)
def test_meter_pro_commands(cls, method, args, reply) -> None:
    device = cls(BLE)
    device.request = AsyncMock(return_value=bytes.fromhex(reply))
    check([asyncio.run(getattr(device, method)(*args)), sent(device.request)])


@pytest.mark.parametrize("method, args", [
    ("set_time_offset", (1 << 24,)), ("set_datetime", (0, 15, 0)), ("set_datetime", (0, 0, 60)),
])
def test_meter_pro_rejects_out_of_range(method, args) -> None:
    device = MeterPro(BLE)
    device.request = AsyncMock(return_value=b"\x01")
    with pytest.raises(ValueError):
        asyncio.run(getattr(device, method)(*args))
    device.request.assert_not_called()


def test_meter_pro_rejected_reply_raises() -> None:
    from custom_components.ha_switchbot_ble.sbble import OperationError
    device = MeterPro(BLE)
    device.request = AsyncMock(return_value=b"\x05")
    with pytest.raises(OperationError):
        asyncio.run(device.get_time_offset())
