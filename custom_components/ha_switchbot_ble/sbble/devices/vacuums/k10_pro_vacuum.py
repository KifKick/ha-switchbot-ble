"""K10+ Pro Vacuum (protocol 1)."""

from __future__ import annotations

from ...core.advertisement import device
from ...core.const import Model
from .vacuum_base import VacuumBase, parse_vacuum_k


@device("K10+ Pro Vacuum", "(", b"\x08")
class K10ProVacuum(VacuumBase):
    model = Model.K10_PRO_VACUUM
    protocol = 1
    parse = staticmethod(parse_vacuum_k)
