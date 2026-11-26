"""What the fans share: modes, oscillation, night light (docs/circulator-fans.md).

Commands ``570f41 …``: ``0101`` / ``0102`` power, ``0201 H V`` oscillation
(01 start, 02 stop, FF keep), ``03 …`` mode and speed, ``0502`` night light.
``FanCommands`` is a mixin for a plain or encrypted device.
"""

from __future__ import annotations

from enum import Enum
from typing import Any, ClassVar

from .air_base import Operated


class FanMode(Enum):
    NORMAL = 1
    NATURAL = 2
    SLEEP = 3
    BABY = 4

    @classmethod
    def get_modes(cls) -> list[str]:
        return [mode.name.lower() for mode in cls]


class NightLightState(Enum):
    """Night light command values (the advertisement reports off as 0)."""

    LEVEL_1 = 1
    LEVEL_2 = 2
    OFF = 3


HEAD = "570f41"
READ_STATUS = "570f428102"
SET_MODE = {
    "normal": f"{HEAD}030101ff",
    "natural": f"{HEAD}030102ff",
    "sleep": f"{HEAD}030103",
    "baby": f"{HEAD}030104",
}
SET_NIGHT_LIGHT = f"{HEAD}0502"  # + state + FFFF
START_HORIZONTAL = f"{HEAD}020101ff"
STOP_HORIZONTAL = f"{HEAD}020102ff"
START_VERTICAL = f"{HEAD}0201ff01"
STOP_VERTICAL = f"{HEAD}0201ff02"


def parse_fan(mfr: bytes | None, modes: type[Enum]) -> dict[str, Any]:
    """Circulator / Standing Fan advertisement; ``d`` = after the MAC."""
    if mfr is None or len(mfr) < 10:
        return {}
    d = mfr[6:]
    mode = (d[1] & 0x70) >> 4
    horizontal, vertical = bool(d[1] & 0x02), bool(d[1] & 0x01)
    return {
        "sequence_number": d[0],
        "isOn": bool(d[1] & 0x80),
        "mode": modes(mode).name.lower() if mode in {m.value for m in modes} else None,
        "nightLight": (d[1] & 0x0C) >> 2,
        "oscillating": horizontal or vertical,
        "oscillating_horizontal": horizontal,
        "oscillating_vertical": vertical,
        "battery": d[2] & 0x7F,
        "speed": d[3] & 0x7F,
        # bit 7 of the battery byte; the mains-only fan always reports 0
        "charging": bool(d[2] & 0x80),
    }


class FanCommands(Operated):
    """Fan state and the commands every fan understands."""

    modes: ClassVar[type[Enum]] = FanMode
    set_mode_commands: ClassVar[dict[str, str]] = SET_MODE
    start_oscillation: ClassVar[str] = START_HORIZONTAL
    stop_oscillation: ClassVar[str] = STOP_HORIZONTAL
    turn_on_command: ClassVar[str] = f"{HEAD}0101"
    turn_off_command: ClassVar[str] = f"{HEAD}0102"

    # --- state ---------------------------------------------------------------------------

    @property
    def fan_modes(self) -> list[str]:
        return self.modes.get_modes()  # type: ignore[attr-defined]

    def is_on(self) -> bool | None:
        return self.data.get("isOn")  # type: ignore[attr-defined]

    def get_current_mode(self) -> str | None:
        return self.data.get("mode")  # type: ignore[attr-defined]

    def get_current_percentage(self) -> int | None:
        return self.data.get("speed")  # type: ignore[attr-defined]

    def get_oscillating_state(self) -> bool | None:
        return self.data.get("oscillating")  # type: ignore[attr-defined]

    def get_horizontal_oscillating_state(self) -> bool | None:
        return self.data.get("oscillating_horizontal")  # type: ignore[attr-defined]

    def get_vertical_oscillating_state(self) -> bool | None:
        return self.data.get("oscillating_vertical")  # type: ignore[attr-defined]

    def get_night_light_state(self) -> int | None:
        return self.data.get("nightLight")  # type: ignore[attr-defined]

    # --- operations ----------------------------------------------------------------------------

    async def turn_on(self) -> bool:
        return await self.operate(self.turn_on_command, "turning on")

    async def turn_off(self) -> bool:
        return await self.operate(self.turn_off_command, "turning off")

    async def set_preset_mode(self, preset_mode: str) -> bool:
        return await self.operate(self.set_mode_commands[preset_mode], "setting the mode")

    async def set_percentage(self, percentage: int) -> bool:
        return await self.operate(f"{HEAD}0302{percentage:02X}", "setting the speed")

    async def set_oscillation(self, oscillating: bool) -> bool:
        return await self.operate(
            self.start_oscillation if oscillating else self.stop_oscillation, "oscillation"
        )

    async def set_horizontal_oscillation(self, oscillating: bool) -> bool:
        return await self.operate(START_HORIZONTAL if oscillating else STOP_HORIZONTAL,
                                  "horizontal oscillation")

    async def set_vertical_oscillation(self, oscillating: bool) -> bool:
        return await self.operate(START_VERTICAL if oscillating else STOP_VERTICAL,
                                  "vertical oscillation")

    async def set_night_light(self, state: NightLightState | int) -> bool:
        """LEVEL_1, LEVEL_2 or OFF (Circulator Fan)."""
        state = NightLightState(state)
        # the firmware turns the light off only with 00, not with OFF (03)
        value = 0 if state is NightLightState.OFF else state.value
        return await self.operate(f"{SET_NIGHT_LIGHT}{value:02X}FFFF", "setting the night light")

    # --- reads ------------------------------------------------------------------------------------

    def parse_status(self, status: bytes, info: bytes) -> dict[str, Any]:
        """570f428102 status + 5702 basic info."""
        mode = status[8] & 0x07
        horizontal, vertical = bool(status[3] & 0x40), bool(status[3] & 0x20)
        data: dict[str, Any] = {
            "battery": status[2] & 0x7F,
            "isOn": bool(status[3] & 0x80),
            "oscillating": horizontal or vertical,
            "oscillating_horizontal": horizontal,
            "oscillating_vertical": vertical,
            "mode": self.modes(mode).name.lower()
            if 1 <= mode <= max(m.value for m in self.modes) else None,
            "speed": status[9],
            "firmware": info[2] / 10.0,
        }
        return data

    async def read_basic_info(self) -> dict[str, Any]:
        status = await self.read(READ_STATUS, "reading the status", min_length=10)
        info = await self.read("5702", "reading basic info", min_length=3)
        return self.parse_status(status, info)
