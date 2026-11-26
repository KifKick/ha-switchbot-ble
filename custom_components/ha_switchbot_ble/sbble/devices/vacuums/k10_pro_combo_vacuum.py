"""K10+ Pro Combo Vacuum (protocol 2)."""

from __future__ import annotations

from ...core.advertisement import device
from ...core.const import Model
from .vacuum_base import VacuumBase


@device("K10+ Pro Combo Vacuum", "3", b"\x13")
class K10ProComboVacuum(VacuumBase):
    model = Model.K10_PRO_COMBO_VACUUM
