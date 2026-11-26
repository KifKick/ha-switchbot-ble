"""Plug Mini (US)."""

from __future__ import annotations

from ...core.advertisement import device
from ...core.const import Model
from .plug_mini_base import PlugMini


@device("Plug Mini (US)", "g", "G")
class PlugMiniUS(PlugMini):
    model = Model.PLUG_MINI_US
