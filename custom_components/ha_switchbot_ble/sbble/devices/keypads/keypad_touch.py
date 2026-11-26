"""Keypad Touch: touch buttons and fingerprints."""

from __future__ import annotations

import logging

from ...core.advertisement import device
from ...core.const import Model
from ...core.errors import OperationError
from .keypad_base import KeypadBase

_LOGGER = logging.getLogger(__name__)


@device("Keypad Touch", "y", "Y")
class KeypadTouch(KeypadBase):
    model = Model.KEYPAD_TOUCH

    async def set_time_zone(self, hours: int, minutes: int) -> None:
        # Seen on a real unit (2026-11-23): it answers 05 although the frame
        # matches the app's byte for byte. Validity times are UTC,
        # so the time sync carries on.
        try:
            await super().set_time_zone(hours, minutes)
        except OperationError as err:
            _LOGGER.debug("%s", err)
