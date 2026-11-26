"""Humidifier (the first one, cloud type WoHumi): power and level only, no state read.

``570f4381 01 <on> <level> FFFFFFFF``; level 128 (or 228) is auto, 101-103
are the three manual buttons. The model is told by service data 'e' / 'E'
(passive scans: manufacturer data of 6 bytes).
"""

from __future__ import annotations

from typing import Any

from ...core.advertisement import device
from ...core.const import Model
from ...core.device import Device

COMMAND = "570f4381"
AUTO_LEVEL = 128
AUTO_LEVELS = (128, 228)
MANUAL_BUTTON_LEVELS = {101: 33, 102: 66, 103: 100}


def parse_humidifier(service: bytes | None, mfr: bytes | None) -> dict[str, Any]:
    if service is None or len(service) < 5:
        return {"isOn": None, "level": None}
    return {"isOn": bool(service[1]), "level": service[4]}


@device("Humidifier", "e", "E", mfr=(741, 6))
class Humidifier(Device):
    model = Model.HUMIDIFIER
    parse = staticmethod(parse_humidifier)

    def is_on(self) -> bool | None:
        return self.data.get("isOn")

    def get_level(self) -> int | None:
        return self.data.get("level")

    def is_auto(self) -> bool:
        return self.get_level() in AUTO_LEVELS

    def get_target_humidity(self) -> int | None:
        if self.is_auto():
            return None
        level = self.get_level()
        return MANUAL_BUTTON_LEVELS.get(level, level)

    def poll_needed(self, seconds_since_last_poll: float | None) -> bool:
        return False

    async def update(self) -> None:
        """Nothing to read (no battery)."""

    def _command(self, on: bool | None = None, level: int | None = None) -> str:
        level = (self.get_target_humidity() or AUTO_LEVEL) if level is None else level
        on = self.is_on() if on is None else on
        return f"{COMMAND}01{'01' if on else '00'}{level:02X}FFFFFFFF"

    async def _send(self, command: str, updates: dict[str, Any]) -> bool:
        reply = await self.command(command, "humidifier command", ok=range(256))
        self.merge(updates)
        return reply[0] == 0x01

    async def turn_on(self) -> bool:
        level = self.get_target_humidity() or AUTO_LEVEL
        return await self._send(self._command(True, level), {"isOn": True, "level": level})

    async def turn_off(self) -> bool:
        level = self.get_target_humidity() or AUTO_LEVEL
        return await self._send(self._command(False, level), {"isOn": False, "level": level})

    async def set_level(self, level: int) -> bool:
        if not 1 <= level <= 100:
            raise ValueError("Level must be between 1 and 100")
        return await self._send(self._command(level=level), {"level": level})

    async def async_set_auto(self) -> bool:
        return await self._send(self._command(level=AUTO_LEVEL), {"level": AUTO_LEVEL})

    async def async_set_manual(self) -> bool:
        return await self._send(self._command(level=50), {"level": 50})
