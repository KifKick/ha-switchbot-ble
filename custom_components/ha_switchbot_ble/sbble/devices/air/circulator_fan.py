"""Circulator Fan and Battery Circulator Fan (cloud type WoFan2): modes 1-4, night light."""

from __future__ import annotations

from typing import Any

from ...core.advertisement import device
from ...core.const import Model
from ...core.device import Device
from .fan_base import FanCommands, FanMode, parse_fan


def parse_circulator_fan(service: bytes | None, mfr: bytes | None) -> dict[str, Any]:
    return parse_fan(mfr, FanMode)


@device("Circulator Fan", "~", "^")
class CirculatorFan(FanCommands, Device):
    model = Model.CIRCULATOR_FAN
    parse = staticmethod(parse_circulator_fan)
