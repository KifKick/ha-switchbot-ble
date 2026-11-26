"""What the air purifiers (US / JP, floor and table) share.

Encrypted. Commands ``570f4c …``, status ``570f4d81``, LED ``570f4d05`` /
``570f4d07``, filter usage ``570f4d09``; settings in
docs/air-purifier.md. The EU unit advertises as the US model.
Never send ``570f4c0c``: it force-updates the MCU firmware.
"""

from __future__ import annotations

from enum import Enum
from typing import Any, ClassVar

from ...core.device import EncryptedDevice
from ...core.errors import OperationError
from .air_base import Operated


class AirPurifierMode(Enum):
    LEVEL_1 = 1
    LEVEL_2 = 2
    LEVEL_3 = 3
    AUTO = 4
    SLEEP = 5
    PET = 6

    @classmethod
    def get_modes(cls) -> list[str]:
        return [mode.name.lower() for mode in cls]


class AirQualityLevel(Enum):
    EXCELLENT = 0
    GOOD = 1
    MODERATE = 2
    UNHEALTHY = 3


HEAD = "570f4c"
SET_MODE = {
    "level_1": f"{HEAD}01010100",
    "level_2": f"{HEAD}01010132",
    "level_3": f"{HEAD}01010164",
    "auto": f"{HEAD}01010200",
    "sleep": f"{HEAD}01010300",
    "pet": f"{HEAD}01010400",
}
LEVEL_MODES = frozenset({"level_1", "level_2", "level_3"})
READ_STATUS = "570f4d81"
READ_LED_SETTINGS = "570f4d05"
READ_LED_STATUS = "570f4d07"
RESET_FILTER_USAGE = f"{HEAD}09"
READ_FILTER_USAGE = "570f4d09"
SET_OFF_TIMER = f"{HEAD}04"  # + 3 bytes: bit 23 enabled, low 23 bits seconds
READ_OFF_TIMER = "570f4d04"
SET_BEEP = f"{HEAD}06"  # + 00 / 01
READ_BEEP = "570f4d06"
SET_INDICATOR = f"{HEAD}07"  # + 00 off / 01 on / 02 auto (light sensor)
INDICATOR_MODES = {0: "off", 1: "on", 2: "auto"}
OFF_TIMER_MAX_MINUTES = 24 * 60


def purifier_mode(mode: int, speed: int) -> str | None:
    """Mode 1 is the manual level (by speed), 2-4 are auto / sleep / pet."""
    if mode == 1:
        return "level_1" if speed <= 33 else "level_2" if speed <= 66 else "level_3"
    if 1 < mode <= 4:
        return AirPurifierMode(mode + 2).name.lower()
    return None


def faults(value: int) -> dict[str, bool]:
    """Fault byte of the advertisement (d[7]) and of the status (b5)."""
    return {
        "filter_door_open": bool(value & 0x08),
        "voc_sensor_fault": bool(value & 0x04),
        "pm25_sensor_fault": bool(value & 0x02),
        "fan_fault": bool(value & 0x01),
    }


def parse_purifier(service: bytes | None, mfr: bytes | None) -> dict[str, Any]:
    """Advertisement; ``d`` = manufacturer data after the MAC."""
    if mfr is None or len(mfr) < 14:
        return {}
    d = mfr[6:]
    speed = d[3] & 0x7F
    return {
        "isOn": bool(d[1] & 0x80),
        "mode": purifier_mode(d[1] & 0x07, speed),
        "child_lock": bool(d[2] & 0x02),
        "speed": speed,
        "aqi_level": AirQualityLevel((d[4] & 0x06) >> 1).name.lower(),
        "filter element working time": int.from_bytes(d[5:7], "big"),
        **faults(d[7]),
        "sequence_number": d[0],
    }


def off_timer(raw: int) -> dict[str, Any]:
    remaining = raw & 0x1FFFFF if raw & 0x800000 else 0
    return {"off_timer_remaining": remaining, "off_timer": -(-remaining // 60)}


class AirPurifierBase(Operated, EncryptedDevice):
    """Air purifier: fan modes, child lock, RGB light, filter, beep, off-timer."""

    parse = staticmethod(parse_purifier)
    pm25: ClassVar[bool] = False  # US models measure PM2.5
    wireless_charging: ClassVar[bool] = False  # table models

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self._rgb: tuple[int, int, int] | None = None

    # --- state ---------------------------------------------------------------------

    def is_on(self) -> bool | None:
        return self.data.get("isOn")

    def get_current_mode(self) -> str | None:
        return self.data.get("mode")

    def get_current_percentage(self) -> int | None:
        return self.data.get("speed")

    def is_child_lock_on(self) -> bool | None:
        return self.data.get("child_lock")

    def is_wireless_charging_on(self) -> bool | None:
        return self.data.get("wireless_charging")

    @property
    def brightness(self) -> int:
        return self.data.get("brightness") or 0

    @property
    def rgb(self) -> tuple[int, int, int] | None:
        return self._rgb

    async def read_basic_info(self) -> dict[str, Any]:
        replies = [await self.command(c, f"reading {c}", ok={1})
                   for c in (READ_STATUS, READ_LED_SETTINGS, READ_LED_STATUS)]
        data, led, led_status = replies
        self._rgb = (led[2], led[3], led[4])
        speed = data[6] & 0x7F
        info: dict[str, Any] = {
            "isOn": bool(data[2] & 0x80),
            "mode": purifier_mode(data[2] & 0x07, speed),
            "child_lock": bool(data[3] & 0x02),
            "aqi_level": AirQualityLevel((data[4] & 0x06) >> 1).name.lower(),
            "speed": speed,
            "firmware": data[15] / 10.0,
            "brightness": led[5],
        }
        if self.wireless_charging:
            info["wireless_charging"] = bool(data[2] & 0x40)
        if len(data) > 5:
            info |= faults(data[5])
            info["dnd_active"] = bool(data[5] & 0x10)
        if len(data) > 11:
            info["off_timer_remaining"] = int.from_bytes(data[9:12], "big") & 0x1FFFFF
        if len(led_status) > 1:
            info["indicator_mode"] = INDICATOR_MODES.get(led_status[1] & 0x03)
        if self.pm25:
            info["pm25"] = int.from_bytes(data[12:14], "big") & 0xFFF
        return info

    # --- operations ------------------------------------------------------------------

    async def turn_on(self) -> bool:
        return await self.operate(f"{HEAD}010100", "turning on")

    async def turn_off(self) -> bool:
        return await self.operate(f"{HEAD}010000", "turning off")

    async def set_preset_mode(self, preset_mode: str) -> bool:
        return await self.operate(SET_MODE[preset_mode], "setting the mode")

    async def set_percentage(self, percentage: int) -> bool:
        if not 0 <= percentage <= 100:
            raise ValueError("Percentage must be between 0 and 100")
        if self.get_current_mode() not in LEVEL_MODES:
            raise ValueError("Percentage can only be set in LEVEL modes.")
        return await self.operate(f"{HEAD}02{percentage:02x}", "setting the speed")

    async def open_child_lock(self) -> bool:
        return await self.operate(f"{HEAD}0301", "child lock on")

    async def close_child_lock(self) -> bool:
        return await self.operate(f"{HEAD}0300", "child lock off")

    async def open_wireless_charging(self) -> bool:
        self._require_table()
        return await self.operate(f"{HEAD}0d01", "wireless charging on")

    async def close_wireless_charging(self) -> bool:
        self._require_table()
        return await self.operate(f"{HEAD}0d00", "wireless charging off")

    def _require_table(self) -> None:
        if not self.wireless_charging:
            raise OperationError(
                f"Wireless charging is only available on table versions (current model={self.model})"
            )

    # --- light ---------------------------------------------------------------------------

    async def set_brightness(self, brightness: int) -> bool:
        _check_brightness(brightness)
        r, g, b = self._rgb or (0, 0, 0)
        return await self.operate(f"{HEAD}0501{r:02X}{g:02X}{b:02X}{brightness:02X}",
                                  "setting the brightness")

    async def set_rgb(self, brightness: int, r: int, g: int, b: int) -> bool:
        """Note the order: RGB, then brightness."""
        _check_brightness(brightness)
        for name, value in (("r", r), ("g", g), ("b", b)):
            if not 0 <= value <= 255:
                raise ValueError(f"{name} must be between 0 and 255")
        return await self.operate(f"{HEAD}0501{r:02X}{g:02X}{b:02X}{brightness:02X}",
                                  "setting the colour")

    async def turn_led_on(self) -> bool:
        return await self.operate(f"{HEAD}0701", "light on")

    async def turn_led_off(self) -> bool:
        return await self.operate(f"{HEAD}0700", "light off")

    async def open_light_sensitive_switch(self) -> bool:
        """The light follows the ambient light sensor."""
        return await self.operate(f"{HEAD}0702", "light sensor on")

    # --- filter and settings ----------------------------------------------------------------

    async def reset_filter_usage(self) -> bool:
        """Reset the filter hours (sent once, no retry); True only after reading back zero."""
        reply = await self.request(RESET_FILTER_USAGE, retry=0)
        if not reply or reply[0] != 0x01:
            raise OperationError("Filter usage reset was rejected")
        reply = await self.request(READ_FILTER_USAGE)
        if len(reply) < 3:
            raise OperationError("Reset was sent, but filter usage could not be verified. "
                                 "Check the device before retrying")
        if reply[0] != 0x01:
            raise OperationError("Filter usage read was rejected")
        hours = int.from_bytes(reply[1:3], "big")
        if hours:
            raise OperationError(f"Reset was sent, but the device still reports {hours} used "
                                 "hours. Check the device before retrying")
        self.merge({"filter element working time": 0})
        return True

    async def get_extra_settings(self) -> dict[str, Any]:
        """Beep and off-timer."""
        settings: dict[str, Any] = {}
        if (r := await self.try_setting(READ_BEEP, "reading beep")) and len(r) > 1:
            settings["beep_enabled"] = bool(r[1])
        if (r := await self.try_setting(READ_OFF_TIMER, "reading the off-timer")) and len(r) > 3:
            settings |= off_timer(int.from_bytes(r[1:4], "big"))
        self.merge(settings)
        return settings

    async def set_beep(self, enabled: bool) -> None:
        await self.setting(f"{SET_BEEP}{int(enabled):02x}", "setting beep",
                           {"beep_enabled": enabled})

    async def set_off_timer(self, minutes: int) -> None:
        """Turn off after ``minutes`` (0 cancels)."""
        if not 0 <= minutes <= OFF_TIMER_MAX_MINUTES:
            raise ValueError(f"off timer must be 0-{OFF_TIMER_MAX_MINUTES} minutes")
        raw = (0x800000 | minutes * 60) if minutes else 0
        await self.setting(f"{SET_OFF_TIMER}{raw:06x}", "setting the off-timer", off_timer(raw))

    async def set_indicator_mode(self, mode: str) -> None:
        """Indicator light: off, on or auto (ambient light sensor)."""
        code = next(k for k, v in INDICATOR_MODES.items() if v == mode)
        await self.setting(f"{SET_INDICATOR}{code:02x}", "setting the indicator light",
                           {"indicator_mode": mode})


def _check_brightness(brightness: int) -> None:
    if not 0 <= brightness <= 100:
        raise ValueError("Brightness must be between 0 and 100")
