"""K10+ Vacuum (protocol 1)."""

from __future__ import annotations

from ...core.advertisement import device
from ...core.const import Model
from .vacuum_base import VacuumBase, parse_vacuum_k


@device("K10+ Vacuum", "}", "]")
class K10Vacuum(VacuumBase):
    model = Model.K10_VACUUM
    protocol = 1
    parse = staticmethod(parse_vacuum_k)
