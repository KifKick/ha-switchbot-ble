"""Plug Mini (US / JP): on / off and power, unencrypted.

Advertisement (manufacturer data): mfr[7] 0x80 = on, mfr[9] Wi-Fi RSSI
(negated), mfr[10-11] power in 0.1 W (15 bits).

* ``570f50010180`` on, ``570f50010100`` off; reply byte 1 is 0x80 on success.
"""

from __future__ import annotations

from typing import Any

from ...core.errors import OperationError
from .plug_base import SwitchState, ignore_while_connected, power_value

TURN_ON = "570f50010180"
TURN_OFF = "570f50010100"


def parse_plug_mini(service: bytes | None, mfr: bytes | None) -> dict[str, Any]:
    if mfr is None or len(mfr) < 12:
        return {}
    return {
        "switchMode": True,
        "isOn": mfr[7] == 0x80,
        "wifi_rssi": -mfr[9],
        "power": power_value(mfr, 10, 10.0, 0x7FFF),  # W
    }


class PlugMini(SwitchState):
    parse = staticmethod(parse_plug_mini)

    def _accepts_advertisements(self) -> bool:
        return ignore_while_connected(self)

    async def update(self) -> None:
        """Nothing to read: no battery, everything is in the advertisement."""

    def poll_needed(self, seconds_since_last_poll: float | None) -> bool:
        return False

    async def turn_on(self) -> bool:
        return await self._switch(TURN_ON, True)

    async def turn_off(self) -> bool:
        return await self._switch(TURN_OFF, False)

    async def _switch(self, command: str, on: bool) -> bool:
        reply = await self.request(command)
        if len(reply) < 2:
            raise OperationError(f"{self.name}: switching failed ({reply.hex() or 'empty'})")
        self.merge({"isOn": on})
        return reply[1] == 0x80
