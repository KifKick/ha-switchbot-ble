"""K11+ Vacuum (protocol 2)."""

from __future__ import annotations

from ...core.advertisement import device
from ...core.const import Model
from .vacuum_base import VacuumBase


@device("K11+ Vacuum", b"\x00\x10\xfb\xa8", b"\x01\x10\xfb\xa8")
class K11Vacuum(VacuumBase):
    model = Model.K11_VACUUM
