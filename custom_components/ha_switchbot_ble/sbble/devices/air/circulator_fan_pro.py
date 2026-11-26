"""Battery Circulator Fan 2 Pro (W1160): encrypted, two-level night light, settings.

Power and mode ride on ``570f4111 29 …`` (29 = control
source "Home Assistant"); oscillation uses ``570f410201 H V`` like the other
fans.
"""

from __future__ import annotations

from enum import Enum
import logging
from typing import Any

from ...core.advertisement import device
from ...core.const import Model
from ...core.device import EncryptedDevice
from ...core.errors import OperationError
from .fan_base import FanCommands

_LOGGER = logging.getLogger(__name__)


class CirculatorFanProMode(Enum):
    """Mode 4 is hurricane, not the baby mode of the other fans."""

    NORMAL = 1
    NATURAL = 2
    SLEEP = 3
    HURRICANE = 4

    @classmethod
    def get_modes(cls) -> list[str]:
        return [mode.name.lower() for mode in cls]


READ_STATUS = "570f978102"
READ_BEEP = "570f9705"
SET_BEEP = "570f9605"  # + on + loudness (FF keep)
SET_CHILD_LOCK = "570f9606"  # + 00 / 01
SET_INDICATOR = "570f960a01"  # + on + brightness (FF keep) + FF
SET_RECENTER = "570f410205"  # + H + V (01 on / 02 off / FF keep)
NIGHT_LIGHT = "570f960a02"  # + 00 off / 01 high / 03 low
OSCILLATION = "570f410201"  # + H + V


def parse_fan_pro(service: bytes | None, mfr: bytes | None) -> dict[str, Any]:
    """Shares the W1071 ceiling fan layout: battery and state bytes are swapped."""
    if mfr is None or len(mfr) < 10:
        return {}
    d = mfr[6:]
    state = d[2]
    light_on = bool(state & 0x04)
    horizontal, vertical = bool(state & 0x02), bool(state & 0x01)
    mode = (state & 0x70) >> 4
    return {
        "sequence_number": d[0],
        "isOn": bool(state & 0x80),
        "mode": CirculatorFanProMode(mode).name.lower()
        if mode in {m.value for m in CirculatorFanProMode} else None,
        "night_light_is_on": light_on,
        # bit 3: 0 = level 1 (bright), 1 = level 2 (dim)
        "night_light_level": (2 if state & 0x08 else 1) if light_on else 0,
        "oscillating": horizontal or vertical,
        "oscillating_horizontal": horizontal,
        "oscillating_vertical": vertical,
        "battery": d[1] & 0x7F,
        "charging": bool(d[1] & 0x80),
        "speed": d[3] & 0x7F,
    }


def parse_pro_status(r: bytes) -> dict[str, Any]:
    """570f978102 reply."""
    if len(r) < 10:
        return {}
    return {
        "indicator_light": bool(r[1] & 0x80),
        "child_lock": bool(r[1] & 0x40),
        "charging": bool(r[2] & 0x80),
        "battery": min(r[2] & 0x7F, 100),
        "horizontal_recenter": bool(r[3] & 0x10),
        "vertical_recenter": bool(r[3] & 0x08),
        "horizontal_swing_angle": r[4],
        "vertical_swing_angle": r[6],
    }


@device("Circulator Fan Pro", b"\x00\x11\xb3@", b"\x01\x11\xb3@")
class CirculatorFanPro(FanCommands, EncryptedDevice):
    model = Model.CIRCULATOR_FAN_PRO
    parse = staticmethod(parse_fan_pro)
    modes = CirculatorFanProMode
    set_mode_commands = {m.name.lower(): f"570f41112901{m.value:02X}" for m in CirculatorFanProMode}
    turn_on_command = "570f41112901"
    turn_off_command = "570f41112900"
    start_oscillation = f"{OSCILLATION}0101"
    stop_oscillation = f"{OSCILLATION}0202"

    def is_night_light_on(self) -> bool | None:
        return self.data.get("night_light_is_on")

    def get_night_light_level(self) -> int | None:
        """1 bright, 2 dim, 0 off."""
        return self.data.get("night_light_level")

    async def read_basic_info(self) -> dict[str, Any]:
        """Firmware, plus the full status (the advertisement has the fan state)."""
        reply = await self.read("5702", "reading basic info", min_length=3)
        info: dict[str, Any] = {"firmware": reply[2] / 10.0}
        try:
            info |= parse_pro_status(await self.setting(READ_STATUS, "reading the status"))
        except OperationError as err:
            _LOGGER.debug("%s", err)
        return info

    async def set_percentage(self, percentage: int) -> bool:
        """Speed 1-100: "on + direct mode + speed" (speed only applies in direct mode)."""
        percentage = max(1, min(100, percentage))
        return await self.operate(f"570f4111290101{percentage:02X}", "setting the speed")

    async def set_horizontal_oscillation(self, oscillating: bool) -> bool:
        return await self.operate(f"{OSCILLATION}{'01' if oscillating else '02'}ff",
                                  "horizontal oscillation")

    async def set_vertical_oscillation(self, oscillating: bool) -> bool:
        return await self.operate(f"{OSCILLATION}ff{'01' if oscillating else '02'}",
                                  "vertical oscillation")

    async def turn_on_light(self, low: bool = False) -> bool:
        """Night light on: ``low`` = level 2 (dim), else level 1 (bright)."""
        return await self.operate(f"{NIGHT_LIGHT}{3 if low else 1:02X}", "night light on")

    async def turn_off_light(self) -> bool:
        return await self.operate(f"{NIGHT_LIGHT}00", "night light off")

    # --- settings ----------------------------------------------------------------------

    async def get_extra_settings(self) -> dict[str, Any]:
        settings: dict[str, Any] = {}
        if (r := await self.try_setting(READ_BEEP, "reading beep")) and len(r) > 1:
            settings["beep_enabled"] = bool(r[1])
        self.merge(settings)
        return settings

    async def set_child_lock(self, enabled: bool) -> None:
        await self.setting(f"{SET_CHILD_LOCK}{int(enabled):02x}", "setting the child lock",
                           {"child_lock": enabled})

    async def set_beep(self, enabled: bool) -> None:
        await self.setting(f"{SET_BEEP}{int(enabled):02x}ff", "setting beep",
                           {"beep_enabled": enabled})

    async def set_indicator_light(self, enabled: bool) -> None:
        await self.setting(f"{SET_INDICATOR}{int(enabled):02x}ffff", "setting the indicator",
                           {"indicator_light": enabled})

    async def set_power_off_recenter(self, *, horizontal: bool | None = None,
                                     vertical: bool | None = None) -> None:
        """Return the head to the centre when turned off, per axis."""

        def code(value: bool | None) -> int:
            return 0xFF if value is None else 1 if value else 2

        updates: dict[str, Any] = {}
        if horizontal is not None:
            updates["horizontal_recenter"] = horizontal
        if vertical is not None:
            updates["vertical_recenter"] = vertical
        await self.setting(f"{SET_RECENTER}{code(horizontal):02x}{code(vertical):02x}",
                           "setting return to centre", updates)
