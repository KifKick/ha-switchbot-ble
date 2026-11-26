"""Plug Mini (JP)."""

from __future__ import annotations

from ...core.advertisement import device
from ...core.const import Model
from .plug_mini_base import PlugMini


@device("Plug Mini (JP)", "j", "J")
class PlugMiniJP(PlugMini):
    model = Model.PLUG_MINI_JP
