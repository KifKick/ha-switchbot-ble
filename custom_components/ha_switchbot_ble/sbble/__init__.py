"""SwitchBot BLE library of the integration (no Home Assistant imports).

``core/`` has what every device shares; ``devices/<family>/`` one module per
device (its advertisement parser, commands and model codes) plus the family's
shared ``*_base`` modules. ``MODELS[model].cls`` is the class of a model.
"""

from __future__ import annotations

from . import devices  # noqa: F401 (registers every model)
from .core.advertisement import MODELS, Advertisement, parse
from .core.const import LockStatus, Model
from .core.device import Device, EncryptedDevice
from .core.errors import (
    AccountConnectionError,
    ApiError,
    AuthenticationError,
    CloudError,
    OperationError,
    SwitchbotError,
)

__all__ = [
    "MODELS",
    "AccountConnectionError",
    "Advertisement",
    "ApiError",
    "AuthenticationError",
    "CloudError",
    "Device",
    "EncryptedDevice",
    "LockStatus",
    "Model",
    "OperationError",
    "SwitchbotError",
    "parse",
]
