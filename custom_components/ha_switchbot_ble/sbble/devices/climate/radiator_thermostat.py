"""Smart Radiator Thermostat (W1128000): encrypted.

Modes ``570f7800 <mode>``, temperatures ``570f78 01/02/03/06``, basic functions
``5703 ff… <switches>``, fast heating / response time / calibration
``570f78 04/0f/09`` (docs/radiator-thermostat.md, notes 1, 3, 4, 6).
"""

from __future__ import annotations

from enum import Enum
from typing import Any

from ...core.advertisement import device
from ...core.const import Model
from ...core.device import EncryptedDevice
from ...core.errors import OperationError
from ..air.air_base import Operated


class ClimateMode(Enum):
    OFF = 0
    HEAT = 1
    COOL = 2
    HEAT_COOL = 3
    AUTO = 4
    DRY = 5
    FAN_ONLY = 6


class ClimateAction(Enum):
    OFF = 0
    IDLE = 1
    HEATING = 2


class ThermostatMode(Enum):
    SCHEDULE = 0
    MANUAL = 1
    OFF = 2
    ECO = 3
    COMFORT = 4
    BOOST = 5

    @classmethod
    def name_of(cls, value: int) -> str | None:
        """Lower-case name; None for unknown values (note 4)."""
        try:
            return cls(value).name.lower()
        except ValueError:
            return None


PRESET_MODES = [m.name.lower() for m in ThermostatMode]
ACTIVE_MODES = [m.name.lower() for m in ThermostatMode if m is not ThermostatMode.OFF]

SET_MODE = {m.name.lower(): f"570F7800{m.value:02X}" for m in ThermostatMode}
SET_TEMPERATURE = {  # boost always heats at the maximum
    "manual": "570F7801{temp:04X}",
    "eco": "570F7802{temp:02X}",
    "comfort": "570F7803{temp:02X}",
    "schedule": "570F7806{temp:04X}",
}
MODE_TEMP_RANGE = {"eco": (10.0, 20.0), "comfort": (10.0, 25.0)}
# the app allows 4.0 °C in schedule / manual mode and shows it as off
DEFAULT_TEMP_RANGE = (4.0, 35.0)
OFF_TEMPERATURE = 4.0
VALVE_FIRMWARE = 1.2  # the valve bit is valid from firmware 1.2
HYSTERESIS_IDLE_THRESHOLD = 0.5

BASIC_FUNCTIONS = "5703ffffffffffff{sw:02x}"  # 2-bit fields, 3 = keep
BASIC_FUNCTION_SHIFT = {"child_lock": 0, "anti_frost": 2, "descaling": 4, "window_detection": 6}
SET_FAST_HEAT_TIME = "570F7804{v:02X}"
SET_RESPONSE_TIME = "570F780F{v:02X}"  # firmware >= 1.3
READ_RESPONSE_TIME = "570F7910"
SET_CALIBRATION = "570F7809{v:02X}"  # |offset|, bit 7 = positive
READ_CALIBRATION = "570F7909"
FAST_HEAT_RANGE = (1, 180)
RESPONSE_TIME_RANGE = (1, 5)
CALIBRATION_RANGE = (-10, 10)


def encode_calibration(offset: int) -> int:
    return (0x80 | offset) if offset > 0 else -offset


def decode_calibration(value: int) -> int:
    return (value & 0x7F) if value & 0x80 else -(value & 0x7F)


def parse_thermostat(service: bytes | None, mfr: bytes | None) -> dict[str, Any]:
    if mfr is None or len(mfr) < 13:
        return {}
    t = mfr[8:11]
    local = (t[1] & 0x7F) + (t[0] & 0x0F) / 10
    target = (t[2] & 0x7F) + ((t[0] >> 4) & 0x0F) / 10
    fault_code = (mfr[12] >> 1) & 0x07
    return {
        "sequence_number": mfr[6],
        "isOn": bool(mfr[7] & 0x80),
        "battery": mfr[7] & 0x7F,
        "temperature": local if t[1] & 0x80 else -local,
        "target_temperature": target if t[2] & 0x80 else -target,
        "mode": ThermostatMode.name_of(mfr[11] & 0x07),
        "last_mode": ThermostatMode.name_of((mfr[11] >> 4) & 0x0F),
        # 0 = open (firmware >= 1.2)
        "valve_open": not mfr[11] & 0x08,
        "restarted": bool((mfr[12] >> 4) & 0x01),
        "door_open": bool(mfr[12] & 0x01),
        "fault": fault_code != 0,  # the app only names 3, sensor abnormal
    }


def parse_basic_info(d: bytes) -> dict[str, Any]:
    """5702 reply."""
    raw = d[5] << 8 | d[6]
    temperature = (raw & 0x7FFF) / 10.0
    mode = ThermostatMode.name_of(d[4] & 0x07)
    target = (d[13] << 8 | d[14]) / 10.0
    info: dict[str, Any] = {
        "battery": d[1],
        "firmware": d[2] / 10.0,
        "last_mode": ThermostatMode.name_of((d[4] >> 3) & 0x07),
        "valve_open": not d[4] & 0x40,
        "temperature": temperature if raw >> 15 else -temperature,
        "manual_target_temp": (d[7] << 8 | d[8]) / 10.0,
        "comfort_target_temp": d[9] / 10.0,
        "economic_target_temp": d[10] / 10.0,
        "fast_heat_time": d[11],
        # only the low bit of each 2-bit field is the state (note 3)
        "child_lock": bool(d[12] & 0x01),
        "anti_frost": bool(d[12] & 0x04),
        "descaling": bool(d[12] & 0x10),
        "window_detection": bool(d[12] & 0x40),
        # the advertisement's key, so the read refreshes it (note 6)
        "target_temperature": target,
        # the window bit is b15 bit 0; b14 is the target's low byte (note 1)
        "door_open": bool(d[15] & 0x01) if len(d) > 15 else None,
    }
    if mode is not None:
        info["mode"] = mode
    if len(d) > 15:
        info["restarted"] = bool(d[15] & 0x02)
        info["mcu_updating"] = bool(d[15] & 0x04)
        info["mcu_version"] = d[15] >> 3
    if len(d) > 16:
        info["fast_heat_remaining"] = d[16]
    return info


@device("Smart Radiator Thermostat", b"\x00\x116@", b"\x01\x116@")
class RadiatorThermostat(Operated, EncryptedDevice):
    model = Model.SMART_THERMOSTAT_RADIATOR
    parse = staticmethod(parse_thermostat)

    # --- state ------------------------------------------------------------------------------

    def is_on(self) -> bool | None:
        return self.data.get("isOn")

    def get_current_mode(self) -> str | None:
        return self.data.get("mode")

    def get_current_temperature(self) -> float | None:
        return self.data.get("temperature")

    def get_target_temperature(self) -> float | None:
        return self.data.get("target_temperature")

    @property
    def preset_mode(self) -> str | None:
        return self.get_current_mode()

    @property
    def preset_modes(self) -> list[str]:
        return list(PRESET_MODES)

    @property
    def min_temperature(self) -> float:
        return MODE_TEMP_RANGE.get(self.preset_mode, DEFAULT_TEMP_RANGE)[0]

    @property
    def max_temperature(self) -> float:
        return MODE_TEMP_RANGE.get(self.preset_mode, DEFAULT_TEMP_RANGE)[1]

    @property
    def current_temperature(self) -> float | None:
        return self.get_current_temperature()

    @property
    def target_temperature(self) -> float | None:
        return self.get_target_temperature()

    @property
    def hvac_modes(self) -> set[ClimateMode]:
        return {ClimateMode.HEAT, ClimateMode.OFF}

    def _off_by_target(self) -> bool:
        """Schedule / manual at 4.0 °C is "off" in the app."""
        target = self.get_target_temperature()
        return (self.preset_mode in ("schedule", "manual") and target is not None
                and target <= OFF_TEMPERATURE)

    @property
    def hvac_mode(self) -> ClimateMode:
        if self.is_on() is False or self._off_by_target() or self.preset_mode not in ACTIVE_MODES:
            return ClimateMode.OFF
        return ClimateMode.HEAT

    @property
    def hvac_action(self) -> ClimateAction:
        if not self.is_on() or self.hvac_mode == ClimateMode.OFF:
            return ClimateAction.OFF
        # from firmware 1.2 the app's "heating" is exactly "valve open"
        firmware, valve_open = self.data.get("firmware"), self.data.get("valve_open")
        if firmware is not None and firmware >= VALVE_FIRMWARE and valve_open is not None:
            return ClimateAction.HEATING if valve_open else ClimateAction.IDLE
        current, target = self.get_current_temperature(), self.get_target_temperature()
        if current is not None and target is not None \
                and current >= target + HYSTERESIS_IDLE_THRESHOLD:
            return ClimateAction.IDLE
        return ClimateAction.HEATING

    async def read_basic_info(self) -> dict[str, Any]:
        return parse_basic_info(await self.read("5702", "reading basic info", min_length=15))

    # --- operations -------------------------------------------------------------------------------

    async def turn_on(self) -> bool:
        return await self.operate("570101", "turning on")

    async def turn_off(self) -> bool:
        return await self.operate("570100", "turning off")

    async def set_hvac_mode(self, hvac_mode: ClimateMode) -> bool:
        if hvac_mode == ClimateMode.OFF:
            return await self.turn_off()
        if self.is_on() is False:
            await self.request("570101")
        # like the app: resume the previous mode (comfort when unknown)
        mode = self.preset_mode
        if mode not in ACTIVE_MODES:  # off (knob "OF") or unknown
            last = self.data.get("last_mode")
            mode = last if last in ACTIVE_MODES else "comfort"
        elif self._off_by_target():
            mode = "comfort"
        return await self.operate(SET_MODE[mode], "setting the mode")

    async def set_preset_mode(self, preset_mode: str) -> bool:
        return await self.operate(SET_MODE[preset_mode], "setting the preset")

    async def set_target_temperature(self, temperature: float) -> bool:
        if self.preset_mode == "off":
            raise OperationError("Cannot set temperature when mode is OFF.")
        if self.preset_mode == "boost":
            raise OperationError("Boost mode defaults to max temperature.")
        command = SET_TEMPERATURE[self.preset_mode].format(temp=int(temperature * 10))
        return await self.operate(command, "setting the temperature")

    # --- settings -------------------------------------------------------------------------------------

    async def get_extra_settings(self) -> dict[str, Any]:
        """Calibration offset and response time."""
        s: dict[str, Any] = {}
        if (r := await self.try_setting(READ_CALIBRATION, "reading calibration")) and len(r) > 1:
            s["temperature_calibration"] = decode_calibration(r[1])
        firmware = self.data.get("firmware")
        if (firmware is None or firmware >= 1.3) and (
            r := await self.try_setting(READ_RESPONSE_TIME, "reading response time")
        ) and len(r) > 1:
            s["response_time"] = r[1] or 1  # 0 = not set, the app shows 1
        self.merge(s)
        return s

    async def set_basic_function(self, key: str, enabled: bool) -> None:
        """child_lock, anti_frost, descaling or window_detection."""
        shift = BASIC_FUNCTION_SHIFT[key]
        sw = 0xFF & ~(0x03 << shift) | (int(enabled) << shift)
        await self.setting(BASIC_FUNCTIONS.format(sw=sw), f"setting {key}", {key: enabled})

    async def set_mode_temperature(self, key: str, temperature: float) -> None:
        """Eco / comfort / manual temperature, whatever the current mode is."""
        mode, (lo, hi) = {
            "economic_target_temp": ("eco", MODE_TEMP_RANGE["eco"]),
            "comfort_target_temp": ("comfort", MODE_TEMP_RANGE["comfort"]),
            "manual_target_temp": ("manual", DEFAULT_TEMP_RANGE),
        }[key]
        if not lo <= temperature <= hi:
            raise ValueError(f"temperature must be {lo}-{hi} °C")
        await self.setting(SET_TEMPERATURE[mode].format(temp=round(temperature * 10)),
                           f"setting {key}", {key: temperature})

    async def set_fast_heat_time(self, minutes: int) -> None:
        lo, hi = FAST_HEAT_RANGE
        if not lo <= minutes <= hi:
            raise ValueError(f"fast heating must be {lo}-{hi} minutes")
        await self.setting(SET_FAST_HEAT_TIME.format(v=minutes), "setting fast heating",
                           {"fast_heat_time": minutes})

    async def set_response_time(self, minutes: int) -> None:
        lo, hi = RESPONSE_TIME_RANGE
        if not lo <= minutes <= hi:
            raise ValueError(f"response time must be {lo}-{hi} minutes")
        await self.setting(SET_RESPONSE_TIME.format(v=minutes), "setting the response time",
                           {"response_time": minutes})

    async def set_temperature_calibration(self, offset: int) -> None:
        lo, hi = CALIBRATION_RANGE
        if not lo <= offset <= hi:
            raise ValueError(f"calibration must be {lo}-{hi} °C")
        await self.setting(SET_CALIBRATION.format(v=encode_calibration(offset)),
                           "setting the temperature calibration",
                           {"temperature_calibration": offset})
