"""Remote (the small button remote): battery only, advertisements."""

from __future__ import annotations

from typing import Any

from ...core.advertisement import device
from ...core.const import Model
from ...core.device import Device


def parse_remote(service: bytes | None, mfr: bytes | None) -> dict[str, Any]:
    if service is None or len(service) < 3:
        return {"battery": None}
    return {"battery": service[2] & 0x7F}


@device("Remote", "b", "B")
class Remote(Device):
    model = Model.REMOTE
    parse = staticmethod(parse_remote)
