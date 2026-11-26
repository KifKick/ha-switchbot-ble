"""Radiator thermostat and Climate Panel: advertisements, reads, state and command frames.

Results for generated inputs are pinned in data/ (record.py).
"""

from __future__ import annotations

import itertools
import random

import pytest

from custom_components.ha_switchbot_ble.sbble.core.const import Model
from custom_components.ha_switchbot_ble.sbble.devices import climate  # noqa: F401 (registers)
from custom_components.ha_switchbot_ble.sbble.devices.climate.radiator_thermostat import (
    ClimateMode,
    RadiatorThermostat,
)

from .common import BLE, KEY
from .record import check
from .test_air import OK_READS, check_parser, check_read, frames, random_reply


@pytest.mark.parametrize("model", [Model.SMART_THERMOSTAT_RADIATOR, Model.CLIMATE_PANEL])
def test_advertisement_parsers(model: Model) -> None:
    check_parser(model)


def _thermostat():
    return RadiatorThermostat(BLE, key_id="ab", encryption_key=KEY)


def test_thermostat_reads() -> None:
    OK_READS.clear()
    rnd = random.Random(21)
    for _ in range(400):
        reply = random_reply(rnd, rnd.choice((15, 16, 17)), (1, 1, 0))
        check_read(_thermostat(), "read_basic_info", [reply])
        for firmware in (None, 1.2, 1.3):
            check_read(_thermostat(), "get_extra_settings",
                       [random_reply(rnd, 2), random_reply(rnd, 2)], {"firmware": firmware})
    assert OK_READS.count("read_basic_info") > 300


STATES = [
    {"isOn": on, "mode": mode, "last_mode": last, "target_temperature": target,
     "temperature": 20.0, "firmware": fw, "valve_open": valve}
    for on, mode, last, target, fw, valve in itertools.product(
        (True, False, None), ("schedule", "manual", "off", "eco", "comfort", "boost", None),
        ("eco", "off", None), (4.0, 19.5, 21.0), (1.1, 1.2, None), (True, False))
]


STATE_PROPS = ("hvac_mode", "hvac_action", "min_temperature", "max_temperature",
               "preset_mode", "preset_modes", "current_temperature", "target_temperature")


def test_thermostat_state() -> None:
    for state in STATES:
        device = _thermostat()
        device.data = dict(state)
        values = {prop: getattr(device, prop) for prop in STATE_PROPS}
        check({prop: getattr(v, "name", v) for prop, v in values.items()}
              | {"hvac_modes": {m.name for m in device.hvac_modes}}, state)


THERMOSTAT_OPS = [
    ("turn_on", ()), ("turn_off", ()),
    *(("set_preset_mode", (m,)) for m in ("schedule", "manual", "off", "eco", "comfort", "boost")),
    *((m, (k, v)) for m in ("set_basic_function",)
      for k in ("child_lock", "anti_frost", "descaling", "window_detection") for v in (True, False)),
    ("set_mode_temperature", ("economic_target_temp", 17.5)),
    ("set_mode_temperature", ("comfort_target_temp", 22.0)),
    ("set_mode_temperature", ("manual_target_temp", 4.0)),
    ("set_fast_heat_time", (30,)), ("set_response_time", (3,)),
    ("set_temperature_calibration", (-3,)), ("set_temperature_calibration", (4,)),
    ("set_temperature_calibration", (0,)),
]


@pytest.mark.parametrize("method, args", THERMOSTAT_OPS)
def test_thermostat_frames(method: str, args: tuple) -> None:
    check(frames(_thermostat(), method, args, {"isOn": True, "mode": "manual"}))


@pytest.mark.parametrize("state", [s for s in STATES if s["mode"] not in ("off", "boost", None)
                                   and s["firmware"] is None and s["valve_open"]])
def test_thermostat_mode_and_temperature_frames(state: dict) -> None:
    for method, args in (
        ("set_hvac_mode", (ClimateMode.HEAT,)),
        ("set_hvac_mode", (ClimateMode.OFF,)),
        ("set_target_temperature", (21.5,)),
    ):
        check(frames(_thermostat(), method, args, state), method, state)
