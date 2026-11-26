"""Recorded results: the library's output for generated inputs, kept in data/.

A test passes every result it wants pinned to :func:`check`::

    check(run(parser, service, mfr))

``SBBLE_RECORD=1 pytest tests/sbble/recorded`` writes the results, per test and
in call order, to ``data/<test module>.json.gz``; a normal run compares each
result with the recorded one. Inputs are generated deterministically (seeded
``random``, :func:`seed`), so the n-th call of a test always meets the n-th
recorded value. Re-record only after checking that a change in output is
intended.

Values are stored in a canonical JSON form (:func:`canon`): enums by name,
bytes as hex, timedeltas as seconds, tuples and sets as lists, dict keys as
strings.
"""

from __future__ import annotations

from dataclasses import asdict, is_dataclass
from datetime import date, timedelta
from enum import Enum
from functools import cache
import gzip
import json
import os
from pathlib import Path
from typing import Any
import zlib

DATA = Path(__file__).parent / "data"
RECORD = os.environ.get("SBBLE_RECORD") == "1"

_test: list[str] = [""]  # "<module stem>::<test name with parameters>"
_cursor: dict[str, int] = {}
_recorded: dict[str, dict[str, list[Any]]] = {}


def norm(value: Any) -> Any:
    if isinstance(value, Enum):
        return value.name
    if isinstance(value, dict):
        return {str(norm(k)): norm(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [norm(v) for v in value]
    if isinstance(value, (set, frozenset)):
        return sorted(norm(v) for v in value)
    if isinstance(value, (bytes, bytearray)):
        return bytes(value).hex()
    if isinstance(value, timedelta):
        return {"timedelta": value.total_seconds()}
    if isinstance(value, date):
        return {"datetime": value.isoformat()}
    if is_dataclass(value) and not isinstance(value, type):
        return norm(asdict(value))
    if value is None or isinstance(value, (bool, int, float, str)):
        return value
    raise TypeError(f"cannot record {type(value).__name__}: {value!r}")


def canon(value: Any) -> Any:
    """``value`` as it reads back from the recording."""
    return json.loads(json.dumps(norm(value)))


def seed(*parts: Any) -> int:
    """A stable random seed (``hash()`` of a str changes between processes)."""
    return zlib.crc32(repr(parts).encode()) & 0xFFFF


@cache
def _load(stem: str) -> dict[str, list[Any]]:
    with gzip.open(DATA / f"{stem}.json.gz", "rt") as file:
        return json.load(file)


def check(value: Any, *context: Any) -> None:
    """``value`` equals the recorded one (``context`` only labels a failure)."""
    test = _test[0]
    stem, name = test.split("::", 1)
    value = canon(value)
    if RECORD:
        _recorded.setdefault(stem, {}).setdefault(name, []).append(value)
        return
    values = _load(stem).get(name)
    assert values is not None, f"nothing recorded for {test}"
    index = _cursor.get(test, 0)
    assert index < len(values), f"{test} checks more results than were recorded"
    _cursor[test] = index + 1
    assert value == values[index], (index, *context)


def begin(nodeid: str) -> None:
    path, name = nodeid.split("::", 1)
    _test[0] = f"{Path(path).stem}::{name}"
    _cursor.pop(_test[0], None)


def end() -> None:
    """Every recorded value was checked: the test still makes the same calls."""
    test = _test[0]
    if RECORD:
        return
    stem, name = test.split("::", 1)
    if (DATA / f"{stem}.json.gz").exists() and name in _load(stem):
        expected = len(_load(stem)[name])
        assert _cursor.get(test, 0) == expected, (
            f"{test} checked {_cursor.get(test, 0)} of {expected} recorded results")


def write() -> None:
    DATA.mkdir(exist_ok=True)
    for stem, tests in _recorded.items():
        text = json.dumps(tests, separators=(",", ":"), sort_keys=True)
        with gzip.GzipFile(DATA / f"{stem}.json.gz", "wb", mtime=0) as file:
            file.write(text.encode())
