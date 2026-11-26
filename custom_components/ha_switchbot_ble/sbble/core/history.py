"""Operation history read with a cursor (locks, keypads; newest record first).

Commands:

* ``57 00 14 01 TTTTTTTT``  set the cursor (uint32 BE, Unix seconds UTC)
* ``57 00 14 xx``           next older record (xx per device type)

A reply whose bytes after the status are all zero ends the log. The record
layouts are in the device modules.
"""

from __future__ import annotations

from collections.abc import Callable
import logging
import time
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from .device import Device

_LOGGER = logging.getLogger(__name__)

SET_CURSOR = "57001401"

type Record = dict[str, Any]


def record_key(record: Record) -> int:
    """Monotonic ordering key (the app's recordTime in ms)."""
    return record["timestamp"] * 1000 + 100 - record["sequence"]


async def read_records(
    device: Device,
    read_next: str,
    parse: Callable[[bytes], Record | None],
    after_key: int | None,
    max_records: int,
    *,
    none_ends: bool = False,
) -> list[Record]:
    """Newest records first; stops at ``max_records``, the end, or ``after_key``.

    ``parse`` returns None for records to skip, or with ``none_ends`` to stop.
    """
    await device.command(f"{SET_CURSOR}{int(time.time()) + 60:08x}", "setting the log cursor")
    records: list[Record] = []
    for _ in range(max_records * 2):  # skipped record types do not count
        reply = await device.request(read_next)
        if reply[:1] not in (b"\x01", b"\x06", b"\x0e") or not any(reply[1:]):
            break
        _LOGGER.debug("%s: log record %s", device.name, reply.hex())
        record = parse(reply)
        if record is None:
            if none_ends:
                break
            continue
        if after_key is not None and record_key(record) <= after_key:
            break
        records.append(record)
        if len(records) >= max_records:
            break
    return records
