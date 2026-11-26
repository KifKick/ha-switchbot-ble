"""What every light shares: on / off, brightness, colour, effects, state reads.

Each light family sets the command templates (``{}`` = hex arguments), the
state read (``basic_info_commands``: version, then state) and its colour modes.
The sequence number in the advertisement changes with every change of state;
the light then reads its full state, like the app.
"""

from __future__ import annotations

from enum import Enum
import logging
import time
from typing import Any, ClassVar

from ...core.device import Device
from ...core.errors import OperationError

_LOGGER = logging.getLogger(__name__)

MIN_TEMP = 2700
MAX_TEMP = 6500


class ColorMode(Enum):
    """Colour mode as the integration sees it (the devices have their own codes)."""

    OFF = 0
    COLOR_TEMP = 1
    RGB = 2
    EFFECT = 3
    BRIGHTNESS = 4


def parse_strip(service: bytes | None, mfr: bytes | None) -> dict[str, Any]:
    """Light strip layout, shared by most lights."""
    if mfr is None or len(mfr) < 9:
        return {}
    return {
        "sequence_number": mfr[6],
        "isOn": bool(mfr[7] & 0x80),
        "brightness": mfr[7] & 0x7F,
        "color_mode": mfr[8] & 0x0F,
    }


def _validate_brightness(brightness: int) -> None:
    if not 0 <= brightness <= 100:
        raise ValueError("Brightness must be between 0 and 100")


def _validate_rgb(r: int, g: int, b: int) -> None:
    for name, value in (("r", r), ("g", g), ("b", b)):
        if not 0 <= value <= 255:
            raise ValueError(f"{name} must be between 0 and 255")


def _validate_color_temp(color_temp: int) -> None:
    if not MIN_TEMP <= color_temp <= MAX_TEMP:
        raise ValueError(f"Color Temp must be between {MIN_TEMP} and {MAX_TEMP}")


class LightBase(Device):
    """A SwitchBot light."""

    refresh_on_sequence = True

    turn_on_command: ClassVar[str | None] = None
    turn_off_command: ClassVar[str | None] = None
    brightness_command: ClassVar[str] = ""  # {brightness}
    color_temp_command: ClassVar[str] = ""  # {brightness}{kelvin:04X}
    rgb_command: ClassVar[str] = ""  # {brightness}{r}{g}{b}
    basic_info_commands: ClassVar[tuple[str, ...]] = ()
    effects: ClassVar[dict[str, list[str]]] = {}
    color_modes: ClassVar[frozenset[ColorMode]] = frozenset()

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        # values read over the connection that advertisements do not carry
        self._state: dict[str, Any] = {}

    # --- state -----------------------------------------------------------------------------

    @property
    def on(self) -> bool | None:
        return self.is_on()

    def is_on(self) -> bool | None:
        return self.data.get("isOn")

    @property
    def brightness(self) -> int:
        return self.data.get("brightness") or 0

    @property
    def rgb(self) -> tuple[int, int, int] | None:
        if not all(k in self._state for k in "rgb"):
            return None
        return self._state["r"], self._state["g"], self._state["b"]

    @property
    def color_temp(self) -> int | None:
        return self._state.get("cw") or self.min_temp

    @property
    def color_mode(self) -> ColorMode:
        raise NotImplementedError

    @property
    def min_temp(self) -> int:
        return MIN_TEMP

    @property
    def max_temp(self) -> int:
        return MAX_TEMP

    @property
    def get_effect_list(self) -> list[str] | None:
        return list(self.effects) if self.effects else None

    def get_effect(self) -> str | None:
        return self.data.get("effect")

    # --- advertisements ----------------------------------------------------------------------


    # --- reading -------------------------------------------------------------------------------

    async def update(self) -> None:
        if (info := await self.get_basic_info()) is not None:
            self._last_full_update = time.monotonic()
            self.merge(info)

    async def _read_all(self) -> list[bytes] | None:
        """Every ``basic_info_commands`` reply; None when one is not accepted."""
        replies = []
        for command in self.basic_info_commands:
            reply = await self.request(command)
            if not self._accepted(reply):
                return None
            replies.append(reply)
        return replies

    async def get_basic_info(self) -> dict[str, Any] | None:
        """State and firmware (``basic_info_commands``: version, then state)."""
        if not (replies := await self._read_all()):
            return None
        return self.parse_state(replies[0], replies[1])

    def parse_state(self, version: bytes, data: bytes) -> dict[str, Any]:
        raise NotImplementedError

    def _accepted(self, reply: bytes) -> bool:
        if not reply:
            raise OperationError(f"{self.name}: no reply")
        return reply[0] == 0x01

    # --- operations ------------------------------------------------------------------------------

    async def _operate(self, command: str | None) -> bool:
        """Send ``command``, then read the state (as the app does)."""
        if not command:
            raise OperationError(f"{self.model} does not support this")
        accepted = self._accepted(await self.request(command))
        await self.update()
        return accepted

    async def turn_on(self) -> bool:
        return await self._operate(self.turn_on_command)

    async def turn_off(self) -> bool:
        return await self._operate(self.turn_off_command)

    async def set_brightness(self, brightness: int) -> bool:
        _validate_brightness(brightness)
        return await self._operate(self.brightness_command and
                                   self.brightness_command.format(f"{brightness:02X}"))

    async def set_color_temp(self, brightness: int, color_temp: int) -> bool:
        _validate_brightness(brightness)
        _validate_color_temp(color_temp)
        return await self._operate(self.color_temp_command and
                                   self.color_temp_command.format(
                                       f"{brightness:02X}{color_temp:04X}"))

    async def set_rgb(self, brightness: int, r: int, g: int, b: int) -> bool:
        _validate_brightness(brightness)
        _validate_rgb(r, g, b)
        return await self._operate(self.rgb_command and
                                   self.rgb_command.format(f"{brightness:02X}{r:02X}{g:02X}{b:02X}"))

    async def set_effect(self, effect: str) -> bool:
        """Play a built-in effect: several commands, any accepted one counts."""
        if not (commands := self.effects.get(effect.lower())):
            raise OperationError(f"Effect {effect} not supported")
        accepted = False
        for command in commands:
            accepted |= self._accepted(await self.request(command))
        if accepted:
            self.merge({"effect": effect})
        await self.update()
        return accepted
