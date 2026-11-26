"""Compare with the recorded results in call order (record.py)."""

from __future__ import annotations

import pytest

from . import record


@pytest.fixture(autouse=True)
def _recorded(request: pytest.FixtureRequest):
    record.begin(request.node.nodeid)
    yield
    record.end()


def pytest_sessionfinish(session: pytest.Session, exitstatus: int) -> None:
    if record.RECORD and exitstatus == 0:
        record.write()
