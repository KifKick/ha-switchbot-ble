"""Inputs shared by the recorded tests."""

from __future__ import annotations

from collections.abc import Callable, Iterator
import random
from typing import Any
from unittest.mock import AsyncMock

from bleak.backends.device import BLEDevice

BLE = BLEDevice("AA:BB:CC:DD:EE:FF", "dev", {})
KEY = "0123456789abcdef0123456789abcdef"


def run(func: Callable[..., Any], *args: Any) -> tuple[str, Any]:
    """("ok", result) or ("error", exception name) of a parser."""
    try:
        return ("ok", func(*args))
    except (IndexError, ValueError, KeyError) as err:
        return ("error", type(err).__name__)


def samples(start: int, count: int = 400) -> Iterator[tuple[bytes | None, bytes | None]]:
    """Random (service data, manufacturer data) pairs of plausible lengths."""
    rnd = random.Random(start)
    for _ in range(count):
        service = bytes(rnd.randrange(256) for _ in range(rnd.choice((0, 2, 3, 6, 9, 12))))
        mfr = bytes(rnd.randrange(256) for _ in range(rnd.choice((0, 7, 9, 10, 11, 12, 13, 15))))
        yield service or None, mfr or None


def sent(mock: AsyncMock) -> list[str]:
    """Frames a mocked ``request`` got, lower-case hex."""
    out = []
    for call in mock.call_args_list:
        arg = call.args[0] if call.args else call.kwargs["key"]
        out.append((arg if isinstance(arg, str) else arg.hex()).lower())
    return out
