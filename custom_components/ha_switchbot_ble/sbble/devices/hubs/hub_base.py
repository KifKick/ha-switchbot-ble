"""What the hubs with a temperature / humidity sensor share.

Hub 2 and Hub Mini Matter put the meters' 3 temperature / humidity bytes at
manufacturer data 13-15 (sensors/thermo_hygrometer_base.decode_climate).
"""

from __future__ import annotations

from typing import Any

from ..sensors.thermo_hygrometer_base import decode_climate


def parse_hub_climate(mfr: bytes | None) -> dict[str, Any]:
    if not mfr or len(mfr) < 16:
        return {}
    return decode_climate(mfr[13:16])
