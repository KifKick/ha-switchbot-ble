"""Floor Lamp: the same protocol as Strip Light 3."""

from __future__ import annotations

from ...core.advertisement import device
from ...core.const import Model
from .strip_light_3 import StripLight3


@device("Floor Lamp", b"\x00\x10\xd0\xb0", b"\x01\x10\xd0\xb0")
class FloorLamp(StripLight3):
    model = Model.FLOOR_LAMP
