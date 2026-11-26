"""RGBICWW Ceiling Light: advertisement only.

No commands are known for it and the integration has no catalog
entry; the model is registered so it is recognised. The advertisement has the
strip layout plus the white main light in mfr[13].
"""

from __future__ import annotations

from typing import Any

from ...core.advertisement import device
from ...core.const import Model
from ...core.device import Device
from .strip_base import parse_strip_cw


def parse_rgbicww_ceiling(service: bytes | None, mfr: bytes | None) -> dict[str, Any]:
    if not (data := parse_strip_cw(10)(service, mfr)) or len(mfr) < 14:
        return {}
    return data | {"main_isOn": bool(mfr[13] & 0x80), "main_brightness": mfr[13] & 0x7F}


@device("RGBICWW Ceiling Light", b"\x00\x11\xbb\x10", b"\x01\x11\xbb\x10")
class RgbicwwCeilingLight(Device):
    model = Model.RGBICWW_CEILING_LIGHT
    parse = staticmethod(parse_rgbicww_ceiling)
