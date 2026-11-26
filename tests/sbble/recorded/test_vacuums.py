"""Vacuums: advertisement parsers, registered codes, operations.

Results for generated inputs are pinned in data/ (record.py).
"""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock

import pytest

from custom_components.ha_switchbot_ble.sbble import MODELS, Model
from custom_components.ha_switchbot_ble.sbble.devices import vacuums

from .common import BLE, run, samples, sent
from .record import check, seed

VACUUM_MODELS = sorted(
    (m for m, i in MODELS.items() if i.cls.__module__.startswith(vacuums.__name__)), key=str
)
PROTOCOL_1 = {Model.K10_VACUUM, Model.K10_PRO_VACUUM}  # as in the integration's vacuum.py


def test_all_seven_registered() -> None:
    assert len(VACUUM_MODELS) == 7
    assert {m for m in VACUUM_MODELS if MODELS[m].cls.protocol == 1} == PROTOCOL_1


@pytest.mark.parametrize("model", VACUUM_MODELS)
def test_parser_and_codes(model: Model) -> None:
    for service, mfr in samples(seed(model.value), 600):
        check(run(MODELS[model].parser, service, mfr), model, service, mfr)
    check([[code, MODELS[model].name, model.value] for code in MODELS[model].codes])


REPLIES = [b"\x01\x02\x03", b"\x07", b"\x00", b"\x01\x05\x09\x00", b"\x01"]


@pytest.mark.parametrize("model", VACUUM_MODELS)
@pytest.mark.parametrize("method", ["clean_up", "return_to_dock", "update"])
@pytest.mark.parametrize("second", REPLIES)
def test_operations(model: Model, method: str, second: bytes) -> None:
    replies = [second] if method == "update" else [b"\x01\xaa", second]  # update: one command

    def outcome(coro_fn):
        try:
            return ("ok", asyncio.run(coro_fn()))
        except IndexError:
            return ("error", "IndexError")

    device = MODELS[model].cls(BLE)
    device.request = AsyncMock(side_effect=list(replies))
    result = outcome(lambda: getattr(device, method)())  # protocol from the class
    check({"result": result, "sent": sent(device.request),
           "firmware": device.data.get("firmware")})


def test_work_status() -> None:
    device = MODELS[Model.S10_VACUUM].cls(BLE)
    assert device.get_work_status() is None
    device.data = {"work_status": 8}
    assert device.get_work_status() == 8
