"""Keypad (the first one, buttons only)."""

from __future__ import annotations

from ...core.advertisement import device
from ...core.const import Model
from .keypad_base import KeypadBase


@device("Keypad", "k", "K")
class Keypad(KeypadBase):
    model = Model.KEYPAD
