"""K20 Vacuum (protocol 2)."""

from __future__ import annotations

from ...core.advertisement import device
from ...core.const import Model
from .vacuum_base import VacuumBase


@device("K20 Vacuum", ".", b"\x0f")
class K20Vacuum(VacuumBase):
    model = Model.K20_VACUUM
