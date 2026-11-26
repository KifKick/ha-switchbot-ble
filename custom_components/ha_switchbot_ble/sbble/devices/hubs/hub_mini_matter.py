"""Hub Mini (Matter): temperature and humidity of its sensor cable."""

from __future__ import annotations

from typing import Any

from ...core.advertisement import device
from ...core.const import Model
from ...core.device import Device
from .hub_base import parse_hub_climate


def parse_hub_mini_matter(service: bytes | None, mfr: bytes | None) -> dict[str, Any]:
    return parse_hub_climate(mfr)


@device("Hub Mini Matter", "%", b"\x05")
class HubMiniMatter(Device):
    model = Model.HUBMINI_MATTER
    parse = staticmethod(parse_hub_mini_matter)
