"""Plugs and relays: advertisements, state reads and commands.

Results for generated inputs are pinned in data/ (record.py).
"""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, patch

import pytest

from custom_components.ha_switchbot_ble.sbble.core.advertisement import Advertisement
from custom_components.ha_switchbot_ble.sbble.core.const import Model
from custom_components.ha_switchbot_ble.sbble.devices.plugs import relay_base
from custom_components.ha_switchbot_ble.sbble.devices.plugs.garage_door_opener import (
    GarageDoorOpener,
)
from custom_components.ha_switchbot_ble.sbble.devices.plugs.plug_mini_eu import PlugMiniEU
from custom_components.ha_switchbot_ble.sbble.devices.plugs.plug_mini_jp import PlugMiniJP
from custom_components.ha_switchbot_ble.sbble.devices.plugs.plug_mini_us import PlugMiniUS
from custom_components.ha_switchbot_ble.sbble.devices.plugs.relay_switch_1 import RelaySwitch1
from custom_components.ha_switchbot_ble.sbble.devices.plugs.relay_switch_1pm import (
    RelaySwitch1PM,
)
from custom_components.ha_switchbot_ble.sbble.devices.plugs.relay_switch_2pm import (
    RelaySwitch2PM,
)

from .common import BLE, KEY, run, samples
from .record import check, seed

NOW = 1_764_000_000

ENCRYPTED = {
    Model.RELAY_SWITCH_1: RelaySwitch1,
    Model.RELAY_SWITCH_1PM: RelaySwitch1PM,
    Model.RELAY_SWITCH_2PM: RelaySwitch2PM,
    Model.PLUG_MINI_EU: PlugMiniEU,
    Model.GARAGE_DOOR_OPENER: GarageDoorOpener,
}
ALL = {Model.PLUG_MINI_US: PlugMiniUS, Model.PLUG_MINI_JP: PlugMiniJP, **ENCRYPTED}


def _device(model: Model):
    cls = ALL[model]
    if model in ENCRYPTED:
        return cls(BLE, key_id="ab", encryption_key=KEY)
    return cls(BLE)


@pytest.mark.parametrize("model", list(ALL), ids=str)
def test_advertisement_parser(model: Model) -> None:
    for service, mfr in samples(seed(model.value), 600):
        check(run(ALL[model].parse, service, mfr), model, service, mfr)


# --- state read ------------------------------------------------------------------------------

STATE = bytes.fromhex("01 2a c0 00 00 00 00 00 00 00 00 00 00 00 00 00 21")
STATE_OFF = bytes.fromhex("01 2a 20 00 00 00 00 00 00 00 00 00 00 00 00 00 21")
CHANNEL = bytes.fromhex("01 00 12 34 00 00 10 00 3c 08 fc 01 f4 05 dc")
CHANNEL_TINY = bytes.fromhex("01 00 00 01 00 00 00 00 00 00 01 00 01 00 01")


def _reply_for(state: bytes, channel: bytes):
    def reply(command: str | bytes | None = None, *_args, key: str | None = None,
              **_kwargs) -> bytes:
        command = key or command
        command = command if isinstance(command, str) else command.hex()
        return state if command.startswith("570f7181") else channel
    return reply


@pytest.mark.parametrize("model", list(ENCRYPTED), ids=str)
@pytest.mark.parametrize("state, channel", [
    (STATE, CHANNEL), (STATE_OFF, CHANNEL), (STATE, CHANNEL_TINY), (STATE, b"\x01\x00"),
    (b"\x07", CHANNEL), (STATE[:10], CHANNEL),
])
def test_state_read(model: Model, state: bytes, channel: bytes) -> None:
    device = _device(model)
    device.request = AsyncMock(side_effect=_reply_for(state, channel))
    with patch.object(relay_base.time, "time", return_value=NOW):
        info = asyncio.run(device.read_basic_info())
    check((info, [c.args[0] for c in device.request.call_args_list]))


# --- commands ----------------------------------------------------------------------------------

COMMANDS = [
    (Model.RELAY_SWITCH_1, "turn_on", ()), (Model.RELAY_SWITCH_1PM, "turn_off", ()),
    (Model.PLUG_MINI_EU, "turn_on", ()),
    (Model.RELAY_SWITCH_2PM, "turn_on", (1,)), (Model.RELAY_SWITCH_2PM, "turn_on", (2,)),
    (Model.RELAY_SWITCH_2PM, "turn_off", (1,)), (Model.RELAY_SWITCH_2PM, "turn_off", (2,)),
    (Model.GARAGE_DOOR_OPENER, "open", ()), (Model.GARAGE_DOOR_OPENER, "close", ()),
    (Model.GARAGE_DOOR_OPENER, "press", ()),
    (Model.PLUG_MINI_EU, "set_led", (True,)), (Model.PLUG_MINI_EU, "set_led", (False,)),
    (Model.PLUG_MINI_EU, "set_power_on_state", ("last_state",)),
    (Model.PLUG_MINI_EU, "get_plug_settings", ()),
]


@pytest.mark.parametrize("model, method, args", COMMANDS, ids=str)
@pytest.mark.parametrize("reply", [b"\x01\x01\x02", b"\x05\x00"])
def test_commands(model: Model, method: str, args: tuple, reply: bytes) -> None:
    device = _device(model)
    device.request = AsyncMock(return_value=reply)
    device.update = AsyncMock()
    result = _run_async(getattr(device, method)(*args))
    check((result, [c.args[0] for c in device.request.call_args_list],
           device.update.await_count))


def _run_async(coro):
    try:
        return ("ok", asyncio.run(coro))
    except Exception as err:  # the error is part of the result
        return ("error", type(err).__name__)


@pytest.mark.parametrize("model", [Model.PLUG_MINI_US, Model.PLUG_MINI_JP], ids=str)
@pytest.mark.parametrize("on", [True, False])
@pytest.mark.parametrize("reply", [b"\x01\x80", b"\x01\x00", b"\x01"])
def test_plug_mini_switch(model: Model, on: bool, reply: bytes) -> None:
    method = "turn_on" if on else "turn_off"
    device = _device(model)
    device.request = AsyncMock(return_value=reply)
    result = _run_async(getattr(device, method)())
    check((result, [c.args[0] for c in device.request.call_args_list]))
    if result[0] == "ok":
        assert device.is_on() is on
    assert not device.poll_needed(None)


# --- advertisements ------------------------------------------------------------------------------


def _adv(model: Model, data: dict) -> Advertisement:
    return Advertisement(BLE.address, model, str(model), data, -60, True, BLE)


def test_metering_keeps_read_power_and_sequence_triggers_read() -> None:
    async def run() -> None:
        device = _device(Model.RELAY_SWITCH_1PM)
        device.update = AsyncMock()
        device.update_from_advertisement(
            _adv(Model.RELAY_SWITCH_1PM, {"sequence_number": 1, "isOn": True, "power": 9.0}))
        await asyncio.sleep(0)
        assert device.data["power"] == 0 and device.data["voltage"] == 0
        assert device.update.await_count == 1  # first advertisement
        device.merge({"power": 12.5, "voltage": 230})
        device.update_from_advertisement(
            _adv(Model.RELAY_SWITCH_1PM, {"sequence_number": 1, "isOn": True, "power": 3.0}))
        await asyncio.sleep(0)
        assert device.data["power"] == 12.5 and device.data["voltage"] == 230
        assert device.update.await_count == 1  # same sequence number
        device.update_from_advertisement(
            _adv(Model.RELAY_SWITCH_1PM, {"sequence_number": 2, "isOn": False, "power": 0.0}))
        await asyncio.sleep(0)
        assert device.update.await_count == 2
    asyncio.run(run())


def test_2pm_channels() -> None:
    async def run() -> None:
        device = _device(Model.RELAY_SWITCH_2PM)
        device.update = AsyncMock()
        mfr = bytes.fromhex("aabbccddeeff" "07" "40" "0000" "0010" "0020")
        data = device.parse(None, mfr)
        device.update_from_advertisement(_adv(Model.RELAY_SWITCH_2PM, data))
        assert device.is_on(1) is False and device.is_on(2) is True
        assert device.get_parsed_data(2)["power"] == 0  # read values win, none yet
        assert device.switch_mode(1) is True
        assert device.get_parsed_data(3) == {}
    asyncio.run(run())
