"""Evaporative Humidifier (and the Auto-refill model): encrypted.

Status ``570f4481`` (the advertisement carries bytes 1-10 of it), commands
``570f43 …``, settings reads ``570f44 …`` (docs/evaporative-humidifier.md).
"""

from __future__ import annotations

from enum import Enum
import logging
from typing import Any

from ...core.advertisement import device
from ...core.const import Model
from ...core.device import EncryptedDevice
from ...core.errors import OperationError
from .air_base import Operated

_LOGGER = logging.getLogger(__name__)


class HumidifierMode(Enum):
    HIGH = 1
    MEDIUM = 2
    LOW = 3
    QUIET = 4
    TARGET_HUMIDITY = 5
    SLEEP = 6
    AUTO = 7
    DRYING_FILTER = 8

    @classmethod
    def get_modes(cls) -> list[str]:
        return [mode.name.lower() for mode in cls]


class HumidifierWaterLevel(Enum):
    EMPTY = 0
    LOW = 1
    MEDIUM = 2
    HIGH = 3

    @classmethod
    def get_levels(cls) -> list[str]:
        return [level.name.lower() for level in cls]


class HumidifierAction(Enum):
    OFF = 0
    HUMIDIFYING = 1
    DRYING = 2


TARGET_HUMIDITY_MODES = {HumidifierMode.SLEEP, HumidifierMode.TARGET_HUMIDITY}
MODE_COMMANDS = {
    HumidifierMode.HIGH: "010100",
    HumidifierMode.MEDIUM: "010200",
    HumidifierMode.LOW: "010300",
    HumidifierMode.QUIET: "010400",
    HumidifierMode.TARGET_HUMIDITY: "0200",
    HumidifierMode.SLEEP: "0300",
    HumidifierMode.AUTO: "040000",
}

TURN_ON = "570f430101"
TURN_OFF = "570f430100"
SET_MODE = "570f4302"
SET_DRYING_FILTER = f"{TURN_ON}08"
CHILD_LOCK = "570f4305"  # + 01 / 00
READ_STATUS = "570f4481"
SET_PROTECTION = "570f4303"  # + enabled + threshold
READ_PROTECTION = "570f4402"  # -> st, enabled, threshold
SET_PROMPT_SOUND = "570f4308"
READ_LIGHT_SOUND = "570f4409"  # -> st, light, sound
SET_ALARM_SOUND = "570f430b"
READ_ALARM_SOUND = "570f440d"  # the read id differs from the write
SET_DND = "570f430e"  # + enabled + start h m + end h m (UTC)
READ_DND = "570f440e"
PROTECTION_THRESHOLD_RANGE = (1, 99)  # the app's range was not found; the device checks


def humidifier_mode(value: int) -> HumidifierMode | None:
    try:
        return HumidifierMode(value)
    except ValueError:
        return None


def water_level(value: int) -> str | None:
    try:
        return HumidifierWaterLevel(value).name.lower()
    except ValueError:
        return None


def climate(raw: bytes, meter_bound: bool) -> tuple[float | None, int | None]:
    """Temperature and humidity of the bound meter (None when there is none)."""
    if len(raw) < 3 or not meter_bound:
        return None, None
    humidity = raw[0] & 0x7F
    if humidity > 100:
        return None, None
    temperature = (raw[1] & 0x7F) + (raw[2] >> 4) / 10
    return (temperature if raw[1] & 0x80 else -temperature), humidity


def status_extras(b: bytes) -> dict[str, Any]:
    """Status fields indexed like the 570f4481 reply (b[0] status / sequence)."""
    out: dict[str, Any] = {}
    if len(b) > 9:
        out["dnd_active"] = bool(b[2] & 0x10)
        out["delay_active"] = bool(b[2] & 0x08)
        out["filter_hours_since_clean"] = int.from_bytes(b[6:8], "big") & 0x0FFF
        out["filter_hours_since_replace"] = int.from_bytes(b[8:10], "big")
    if len(b) > 11:
        out["meter_online"] = bool(b[11] & 0x80)
        out["over_humidify_threshold"] = b[11] & 0x7F
    if len(b) > 13:
        drying = int.from_bytes(b[12:14], "big")
        out["drying_remaining"] = 0 if drying == 0xFFFF else drying
    if len(b) > 16:
        out["delay_remaining"] = int.from_bytes(b[14:17], "big") & 0x1FFFFF
    return out


def parse_status(b: bytes) -> dict[str, Any]:
    """Status bytes 1-10 (+ extras), the same in the advertisement and the read."""
    meter_bound = bool(b[3] & 0x80)
    temperature, humidity = climate(b[3:6], meter_bound)
    return {
        "isOn": bool(b[1] & 0x80),
        "mode": humidifier_mode(b[1] & 0x0F),
        "over_humidify_protection": bool(b[2] & 0x80),
        "child_lock": bool(b[2] & 0x20),
        "tank_removed": bool(b[2] & 0x04),
        "tilted_alert": bool(b[2] & 0x02),
        "filter_missing": bool(b[2] & 0x01),
        "is_meter_binded": meter_bound,
        "humidity": humidity,
        "temperature": temperature,
        "water_level": water_level(b[5] & 0x0F),
        "target_humidity": b[10] & 0x7F,
        **status_extras(b),
    }


def parse_evaporative_humidifier(service: bytes | None, mfr: bytes | None) -> dict[str, Any]:
    if mfr is None or len(mfr) < 17:
        return {}
    return {"sequence_number": mfr[6], **parse_status(mfr[6:17])}


@device("Evaporative Humidifier", "#", b"\x03")
class EvaporativeHumidifier(Operated, EncryptedDevice):
    model = Model.EVAPORATIVE_HUMIDIFIER
    parse = staticmethod(parse_evaporative_humidifier)

    # --- state ---------------------------------------------------------------------------

    def is_on(self) -> bool | None:
        return self.data.get("isOn")

    def get_mode(self) -> HumidifierMode | None:
        return self.data.get("mode")

    def get_water_level(self) -> str | None:
        return self.data.get("water_level")

    def get_target_humidity(self) -> int | None:
        return self.data.get("target_humidity")

    def get_humidity(self) -> int | None:
        return self.data.get("humidity")

    def is_meter_binded(self) -> bool | None:
        return self.data.get("is_meter_binded")

    def get_action(self) -> HumidifierAction:
        if not self.is_on():
            return HumidifierAction.OFF
        if self.get_mode() != HumidifierMode.DRYING_FILTER:
            return HumidifierAction.HUMIDIFYING
        return HumidifierAction.DRYING

    async def read_basic_info(self) -> dict[str, Any]:
        return parse_status(await self.read(READ_STATUS, "reading the status", min_length=11))

    # --- operations --------------------------------------------------------------------------

    async def turn_on(self) -> bool:
        return await self.operate(TURN_ON, "turning on")

    async def turn_off(self) -> bool:
        return await self.operate(TURN_OFF, "turning off")

    async def set_target_humidity(self, target_humidity: int) -> bool:
        self._check_water()
        if self.get_mode() not in TARGET_HUMIDITY_MODES:
            raise OperationError("Target humidity can only be set in target humidity mode or sleep mode")
        return await self.operate(
            f"{SET_MODE}{MODE_COMMANDS[self.get_mode()]}{target_humidity:02x}",
            "setting the target humidity",
        )

    async def set_mode(self, mode: HumidifierMode) -> bool:
        self._check_water()
        if not self.is_meter_binded() and mode in (HumidifierMode.TARGET_HUMIDITY,
                                                    HumidifierMode.AUTO):
            raise OperationError(
                "Cannot set target humidity or auto mode when meter is not binded"
            )
        command = SET_DRYING_FILTER if mode == HumidifierMode.DRYING_FILTER \
            else SET_MODE + MODE_COMMANDS[mode]
        if mode in TARGET_HUMIDITY_MODES:
            if (target := self.get_target_humidity()) is None:
                raise OperationError("Target humidity must be set before switching to "
                                     "target humidity mode or sleep mode")
            command += f"{target:02x}"
        return await self.operate(command, "setting the mode")

    def _check_water(self) -> None:
        if self.get_water_level() == HumidifierWaterLevel.EMPTY.name.lower():
            raise OperationError("Cannot perform operation when water tank is empty")

    async def set_child_lock(self, enabled: bool) -> bool:
        return await self.operate(f"{CHILD_LOCK}{'01' if enabled else '00'}", "child lock")

    # --- settings ------------------------------------------------------------------------------

    async def get_extra_settings(self) -> dict[str, Any]:
        """Over-humidify protection, sounds and the do-not-disturb window."""
        s: dict[str, Any] = {}
        if (r := await self.try_setting(READ_PROTECTION, "reading protection")) and len(r) > 2:
            s["over_humidify_protection"] = r[1] == 1
            s["over_humidify_threshold"] = r[2]
        if (r := await self.try_setting(READ_LIGHT_SOUND, "reading sound")) and len(r) > 2:
            s["prompt_sound"] = r[2] == 1
        if (r := await self.try_setting(READ_ALARM_SOUND, "reading the alarm")) and len(r) > 1:
            s["alarm_sound"] = r[1] == 1
        if (r := await self.try_setting(READ_DND, "reading do-not-disturb")) and len(r) > 5:
            s["dnd_enabled"] = r[1] == 1
            s["dnd_start_utc"] = f"{r[2]:02d}:{r[3]:02d}"
            s["dnd_end_utc"] = f"{r[4]:02d}:{r[5]:02d}"
        self.merge(s)
        return s

    async def set_over_humidify_protection(self, enabled: bool | None = None,
                                           threshold: int | None = None) -> None:
        """Stop humidifying above ``threshold`` %RH (manual level modes)."""
        if enabled is None:
            enabled = bool(self.data.get("over_humidify_protection"))
        if threshold is None:
            threshold = self.data.get("over_humidify_threshold") or 60
        lo, hi = PROTECTION_THRESHOLD_RANGE
        if not lo <= threshold <= hi:
            raise ValueError(f"threshold must be {lo}-{hi} %")
        await self.setting(f"{SET_PROTECTION}{int(enabled):02x}{threshold:02x}",
                           "setting over-humidify protection",
                           {"over_humidify_protection": enabled,
                            "over_humidify_threshold": threshold})

    async def set_prompt_sound(self, enabled: bool) -> None:
        await self.setting(f"{SET_PROMPT_SOUND}{int(enabled):02x}", "setting the prompt sound",
                           {"prompt_sound": enabled})

    async def set_alarm_sound(self, enabled: bool) -> None:
        await self.setting(f"{SET_ALARM_SOUND}{int(enabled):02x}", "setting the alarm sound",
                           {"alarm_sound": enabled})

    async def set_dnd(self, enabled: bool | None = None, start_utc: str | None = None,
                      end_utc: str | None = None) -> None:
        """Do-not-disturb window; "HH:MM" in UTC, as the app sends it."""
        enabled = bool(self.data.get("dnd_enabled")) if enabled is None else enabled
        start_utc = start_utc or self.data.get("dnd_start_utc") or "22:00"
        end_utc = end_utc or self.data.get("dnd_end_utc") or "07:00"
        sh, sm = (int(x) for x in start_utc.split(":"))
        eh, em = (int(x) for x in end_utc.split(":"))
        await self.setting(
            f"{SET_DND}{int(enabled):02x}{sh:02x}{sm:02x}{eh:02x}{em:02x}",
            "setting do-not-disturb",
            {"dnd_enabled": enabled, "dnd_start_utc": f"{sh:02d}:{sm:02d}",
             "dnd_end_utc": f"{eh:02d}:{em:02d}"},
        )
