"""Curtains, blind tilt, roller shade: parsers, motion following, state reads, commands.

Results for generated inputs are pinned in data/ (record.py).
"""

from __future__ import annotations

import asyncio
import itertools
from unittest.mock import AsyncMock, Mock, patch

import pytest

from custom_components.ha_switchbot_ble.sbble.core.advertisement import Advertisement
from custom_components.ha_switchbot_ble.sbble.core.const import Model
from custom_components.ha_switchbot_ble.sbble.devices.covers import cover_base
from custom_components.ha_switchbot_ble.sbble.devices.covers.blind_tilt import BlindTilt
from custom_components.ha_switchbot_ble.sbble.devices.covers.curtain import Curtain
from custom_components.ha_switchbot_ble.sbble.devices.covers.curtain_3 import Curtain3
from custom_components.ha_switchbot_ble.sbble.devices.covers.curtain_track_4 import (
    CurtainTrack4,
)
from custom_components.ha_switchbot_ble.sbble.devices.covers.roller_shade import RollerShade

from .common import BLE, KEY, run, samples, sent
from .record import check, seed

CLASSES = {
    Model.CURTAIN: Curtain,
    Model.CURTAIN_3: Curtain3,
    Model.CURTAIN_TRACK_4: CurtainTrack4,
    Model.BLIND_TILT: BlindTilt,
    Model.ROLLER_SHADE: RollerShade,
}


def _device(model: Model):
    if model is Model.CURTAIN_TRACK_4:
        return CurtainTrack4(BLE, key_id="ab", encryption_key=KEY)
    return CLASSES[model](BLE)


def _key(model: Model) -> str:
    return "tilt" if model is Model.BLIND_TILT else "position"


def _run_async(coro):
    try:
        return ("ok", asyncio.run(coro))
    except Exception as err:
        return ("error", type(err).__name__)


def _feed(device, model: Model, data: dict) -> None:
    device.update_from_advertisement(
        Advertisement(BLE.address, model, str(model), dict(data), -60, True, BLE))


@pytest.mark.parametrize("model", list(CLASSES), ids=str)
def test_advertisement_parser(model: Model) -> None:
    for service, mfr in samples(seed(model.value), 600):
        check(run(CLASSES[model].parse, service, mfr), service, mfr)


MOVES = [(None, 50), (None, 55), ("opening", 60), (None, 60), ("stopped", 60), (None, 40),
         ("closing", 30), ("stopped", 30), (None, 30), (None, 35)]


@pytest.mark.parametrize("model", list(CLASSES), ids=str)
def test_motion_following(model: Model) -> None:
    """Opening/closing/position after each advertisement; a position change
    starts the motion polling (motion reads: moving, moving, stopped)."""
    device = _device(model)

    async def track() -> dict:
        device.update = AsyncMock()
        moving = itertools.cycle([True, True, False])
        device.read_motion = AsyncMock(side_effect=lambda: next(moving))
        steps = []
        with patch.object(cover_base, "POLL_INTERVAL", 0):
            for seq, (motion, position) in enumerate(MOVES):
                data = {_key(model): position, "battery": 50, "sequence_number": seq // 3}
                if motion is not None:
                    data["motion"] = motion
                _feed(device, model, data)
                steps.append([device.is_opening(), device.is_closing(), device.get_position(),
                              device._motion_task is not None])
                await device.wait_motion()
        return {"steps": steps, "motion_reads": device.read_motion.await_count,
                "updates": device.update.await_count}

    check(asyncio.run(track()))


READS = {
    Model.CURTAIN: [bytes.fromhex("01 5a 45 01 e0 4f 1e 02"), bytes.fromhex("01 5a 45 01 00 08 64 00"),
                    b"\x07"],
    Model.CURTAIN_3: [bytes.fromhex("01 50 16 00 a4 03 00 1e 00 00 00 00 00 10 00"),
                      bytes.fromhex("01 50 16 02 14 00 81 64 00 00 00 00 00 20 00"),
                      bytes.fromhex("01 50 16 00 a4 03")],
    Model.CURTAIN_TRACK_4: [bytes.fromhex("01 50 c4 16 01 a5 00 00 1e 00 00 00 00 00 00 20 00"),
                            bytes.fromhex("01 30 00 16 00 80 00 00 00 00 00 00 00 00 00 00 00")],
    Model.BLIND_TILT: [bytes.fromhex("01 5a 15 00 28 0e 3c 01"), bytes.fromhex("01 5a 14 00 28 05 10 01")],
    Model.ROLLER_SHADE: [bytes.fromhex("01 03 12 4b 03 19 9e"), bytes.fromhex("01 03 12 4b 04 00 80"),
                         bytes.fromhex("01 03 12")],
}
MOTION_REPLY = bytes.fromhex("01 01 00 00 00 00 32 00")


@pytest.mark.parametrize("model, reply", [(m, r) for m, rs in READS.items() for r in rs], ids=str)
def test_state_read(model: Model, reply: bytes) -> None:
    device = _device(model)

    async def read():
        device.request = AsyncMock(side_effect=lambda cmd, **_: MOTION_REPLY
                                   if cmd == "570f460100" and model is Model.BLIND_TILT else reply)
        await device.update()
        return device.data

    check([_run_async(read()), sent(device.request)])


COMMANDS = [
    *((Model.CURTAIN, meth, args)
      for meth, args in (("open", ()), ("close", ()), ("stop", ()), ("set_position", (30,)))),
    *((m, meth, args) for m in (Model.CURTAIN_3, Model.CURTAIN_TRACK_4)
      for meth, args in (("open", ()), ("open", (1,)), ("close", ()), ("close", ("silent",)),
                         ("stop", ()), ("set_position", (30,)), ("set_position", (70, 0)),
                         ("set_position", (70, 5)))),
    *((Model.BLIND_TILT, meth, args)
      for meth, args in (("open", ()), ("close_up", ()), ("close_down", ()), ("close", ()),
                         ("stop", ()), ("set_position", (25,)))),
    *((Model.ROLLER_SHADE, meth, args)
      for meth, args in (("open", ()), ("open", (1,)), ("close", ()), ("close", ("quietdrift",)),
                         ("stop", ()), ("set_position", (30,)), ("set_position", (70, 1)),
                         ("open", (2,)), ("toggle", ()), ("locate", ()))),
]


@pytest.mark.parametrize("model, method, args", COMMANDS, ids=str)
@pytest.mark.parametrize("reply", [b"\x01", b"\x05", b""])
@pytest.mark.parametrize("start", [20, 80])
@pytest.mark.parametrize("firmware", [1.0, 2.5])
def test_commands(model: Model, method: str, args: tuple, reply: bytes, start: int,
                  firmware: float) -> None:
    device = _device(model)
    device.follow_motion = Mock()
    device._ble_version = int(firmware * 10)

    async def setup() -> None:
        device.update = AsyncMock()
        _feed(device, model, {_key(model): start, "sequence_number": 1, "firmware": firmware})
        await asyncio.sleep(0)

    asyncio.run(setup())
    device.request = AsyncMock(return_value=reply)
    result = _run_async(getattr(device, method)(*args))
    check({"result": result, "sent": sent(device.request),
           "moving": [device.is_opening(), device.is_closing()],
           "follows": device.follow_motion.call_count})
