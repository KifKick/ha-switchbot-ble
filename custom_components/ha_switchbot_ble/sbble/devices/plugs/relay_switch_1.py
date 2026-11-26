"""Relay Switch 1: on / off, no metering."""

from __future__ import annotations

from typing import Any

from ...core.advertisement import device
from ...core.const import Model
from .relay_base import RelayBase, parse_relay


@device("Relay Switch 1", ";", b"\x1b")
class RelaySwitch1(RelayBase):
    model = Model.RELAY_SWITCH_1
    parse = staticmethod(parse_relay)

    def _compose(self, raw: bytes, state: dict[str, Any], channel: dict[str, Any]) -> dict[str, Any]:
        return state  # the channel read has no meaningful values here
