"""Relay Switch 1PM: on / off with power metering."""

from __future__ import annotations

from ...core.advertisement import device
from ...core.const import Model
from .relay_base import RelayBase, parse_relay_pm


@device("Relay Switch 1PM", "<", b"\x1c")
class RelaySwitch1PM(RelayBase):
    model = Model.RELAY_SWITCH_1PM
    parse = staticmethod(parse_relay_pm)
    metering = True
