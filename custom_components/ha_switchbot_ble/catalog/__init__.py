"""The model catalog: every supported model, its device class and its entities.

Each file describes one family; ``MODELS`` and the lookup tables below are built
from them, so adding a model means adding one ``ModelSpec``.
"""

from __future__ import annotations

from ..sbble import Model
from . import appliances, climate, covers, devices, keypad, locks, sensors
from .base import ModelSpec
from .common import COMMON

MODELS: dict[str, ModelSpec] = {}
for _spec in (
    *locks.SPECS,
    *keypad.SPECS,
    *climate.SPECS,
    *sensors.SPECS,
    *appliances.SPECS,
    *covers.SPECS,
    *devices.SPECS,
):
    assert _spec.type not in MODELS, _spec.type
    _spec.bind(COMMON)
    MODELS[_spec.type] = _spec

# library model -> spec (what an advertisement says -> what we store)
BY_MODEL: dict[Model, ModelSpec] = {s.model: s for s in MODELS.values()}
CONNECTABLE_MODELS = {s.model for s in MODELS.values() if s.connectable}
PASSIVE_MODELS = {s.model for s in MODELS.values() if s.passive}
ENCRYPTED_MODELS = {s.model for s in MODELS.values() if s.encrypted}


def spec_for(sensor_type: str) -> ModelSpec:
    return MODELS[sensor_type]


def needs_connection(model: Model) -> bool:
    """True when the model is only reachable over a connection."""
    return model in CONNECTABLE_MODELS and model not in PASSIVE_MODELS

