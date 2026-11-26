"""S10 Vacuum (protocol 2)."""

from __future__ import annotations

from ...core.advertisement import device
from ...core.const import Model
from .vacuum_base import VacuumBase


@device("S10 Vacuum", "z", "Z")
class S10Vacuum(VacuumBase):
    model = Model.S10_VACUUM
