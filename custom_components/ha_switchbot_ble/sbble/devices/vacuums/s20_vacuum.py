"""S20 Vacuum (protocol 2)."""

from __future__ import annotations

from ...core.advertisement import device
from ...core.const import Model
from .vacuum_base import VacuumBase


@device("S20 Vacuum", b"\x00\x10\xe0P", b"\x01\x10\xe0P")
class S20Vacuum(VacuumBase):
    model = Model.S20_VACUUM
