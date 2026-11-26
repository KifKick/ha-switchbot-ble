"""What the air devices (purifiers, fans, humidifiers) and the radiator thermostat share.

* A changed ``sequence_number`` in the advertisement means the device did
  something: read the full state in the background (also once at startup).
* After an operation the state is read again, as the app does.
* Settings commands accept the statuses 01 / 06 / 0e.

``Operated`` is a mixin for a ``Device`` / ``EncryptedDevice`` subclass.
"""

from __future__ import annotations

import logging
from typing import Any

from ...core.device import OK, as_bytes
from ...core.errors import OperationError

_LOGGER = logging.getLogger(__name__)

FAILED_READS = (b"\x07", b"\x00")  # the whole reply of a rejected read


class Operated:
    """Background state reads on a new sequence number, reads after operations."""

    refresh_on_sequence = True

    # --- state reads -----------------------------------------------------------------

    async def _update_quietly(self) -> None:
        """The state read after an operation; a failure is only logged."""
        try:
            await self.update()  # type: ignore[attr-defined]
        except Exception as err:  # the operation itself succeeded
            _LOGGER.debug("%s: state read failed: %r", self.name, err)  # type: ignore[attr-defined]

    async def read(self, command: bytes | str, what: str, min_length: int = 1) -> bytes:
        """A read; only a bare 07 / 00 reply (or a short one) is a failure."""
        reply = await self.request(command)  # type: ignore[attr-defined]
        if reply in FAILED_READS or len(reply) < min_length:
            raise OperationError(f"{self.name}: {what} failed ({reply.hex() or 'empty'})")  # type: ignore[attr-defined]
        return reply

    # --- operations -------------------------------------------------------------------------

    async def operate(self, command: bytes | str, what: str) -> bool:
        """Send an operation, read the state again; True when the device answered 01."""
        reply = await self.command(as_bytes(command), what, ok=range(256))  # type: ignore[attr-defined]
        await self._update_quietly()
        return reply[0] == 0x01

    async def setting(self, command: bytes | str, what: str, updates: dict[str, Any] | None = None
                      ) -> bytes:
        """A settings command (01 / 06 / 0e), then merge ``updates``."""
        reply = await self.command(command, what, ok=OK)  # type: ignore[attr-defined]
        if updates:
            self.merge(updates)  # type: ignore[attr-defined]
        return reply

    async def try_setting(self, command: bytes | str, what: str) -> bytes | None:
        """A settings read; None when the firmware rejects it (not supported)."""
        try:
            return await self.setting(command, what)
        except OperationError as err:
            _LOGGER.debug("%s", err)
            return None

    async def get_extra_settings(self) -> dict[str, Any]:
        """Settings the advertisement does not carry (refreshed every 6 h)."""
        return {}
