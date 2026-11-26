"""Hub 2, Hub 3 and Hub Mini Matter advertisement parsers: results for generated inputs,
pinned in data/ (record.py).

The hub modules are imported in a fixture, not at collection: test_core's
model-detection test builds a 15 byte manufacturer payload, too short for the
hubs.
"""

from __future__ import annotations

import importlib
import random

import pytest

from custom_components.ha_switchbot_ble.sbble import MODELS, Model

from .common import run
from .record import check, seed


@pytest.fixture(autouse=True)
def hubs() -> None:
    importlib.import_module("custom_components.ha_switchbot_ble.sbble.devices.hubs")


def hub_samples(start: int, count: int = 1500):
    rnd = random.Random(start)
    for _ in range(count):
        mfr = bytes(rnd.randrange(256) for _ in range(rnd.choice((0, 12, 15, 16, 17, 20))))
        yield None, mfr or None


@pytest.mark.parametrize("model", (Model.HUB2, Model.HUB3, Model.HUBMINI_MATTER), ids=str)
def test_parser(model: Model) -> None:
    for service, mfr in hub_samples(seed(model.value)):
        check(run(MODELS[model].parser, service, mfr), model, mfr)


def test_hub_classes_registered() -> None:
    for model in (Model.HUB2, Model.HUB3, Model.HUBMINI_MATTER):
        assert MODELS[model].cls.model is model
