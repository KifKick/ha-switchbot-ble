"""Meters, thermo-hygrometers, hubs, weather station, climate panel, radiator thermostat."""

from __future__ import annotations

from homeassistant.components.binary_sensor import BinarySensorDeviceClass as B
from homeassistant.components.number import NumberDeviceClass, NumberMode
from homeassistant.const import Platform, UnitOfTemperature, UnitOfTime
from homeassistant.util import dt as dt_util

from ..climate import SwitchBotClimateEntity
from ..entity import ButtonDesc, NumberDesc, SelectDesc
from ..number import PolledNumber
from ..sbble import Model as M
from ..sbble.devices.climate.radiator_thermostat import (
    CALIBRATION_RANGE,
    DEFAULT_TEMP_RANGE,
    FAST_HEAT_RANGE,
    MODE_TEMP_RANGE,
    RESPONSE_TIME_RANGE,
)
from ..sbble.devices.sensors.meter_pro_base import MAX_TIME_OFFSET, MeterProBase
from ..sbble.devices.sensors.meter_pro_co2 import MeterProCO2
from ..select import PolledSelect
from .base import (
    CONFIG,
    ModelSpec,
    binary,
    diag,
    duration,
    dynamic,
    main,
    problem,
    setting_number,
    setting_switch,
)

# --- Meter Pro (CO2): clock --------------------------------------------------------


async def _sync_clock(device: MeterProBase) -> None:
    now = dt_util.now()
    offset = int(now.utcoffset().total_seconds()) if now.utcoffset() else 0
    await device.set_datetime(
        timestamp=int(now.timestamp()),
        utc_offset_hours=offset // 3600,
        utc_offset_minutes=abs(offset % 3600) // 60,
    )


SYNC_CLOCK = ButtonDesc(key="sync_datetime", translation_key="sync_datetime", uid="_sync_datetime",
                        entity_category=CONFIG, add="always", press_fn=_sync_clock)


async def _read_offset_minutes(device: MeterProCO2) -> int:
    return round(await device.get_time_offset() / 60)


async def _read_time_format(device: MeterProCO2) -> str:
    return "12h" if (await device.get_datetime())["12h_mode"] else "24h"


CO2_DISPLAY = (
    NumberDesc(
        key="display_time_offset", translation_key="display_time_offset",
        uid="_display_time_offset", entity_category=CONFIG, add="always", cls=PolledNumber,
        device_class=NumberDeviceClass.DURATION, native_unit_of_measurement=UnitOfTime.MINUTES,
        native_min_value=-(MAX_TIME_OFFSET // 60), native_max_value=MAX_TIME_OFFSET // 60,
        native_step=1.0, poll_fn=_read_offset_minutes,
        set_fn=lambda d, v: d.set_time_offset(round(v) * 60),
    ),
    SelectDesc(
        key="time_format", translation_key="time_format", uid="_time_format",
        entity_category=CONFIG, add="always", cls=PolledSelect, options=["12h", "24h"],
        poll_fn=_read_time_format, set_fn=lambda d, v: d.set_time_display_format(v == "12h"),
    ),
)

# --- Smart Radiator Thermostat (docs/radiator-thermostat.md) -----------------------


def _temperature(key: str, lo: float, hi: float, set_fn, **kw) -> NumberDesc:
    return setting_number(key, lo, hi, set_fn, unit=UnitOfTemperature.CELSIUS,
                          device_class=NumberDeviceClass.TEMPERATURE, **kw)


TRV = (
    main(Platform.CLIMATE, SwitchBotClimateEntity),
    *(
        setting_switch(key, (lambda k: lambda d, v: d.set_basic_function(k, v))(key))
        for key in ("child_lock", "window_detection", "anti_frost", "descaling")
    ),
    *(
        _temperature(key, lo, hi, (lambda k: lambda d, v: d.set_mode_temperature(k, float(v)))(key),
                     step=0.5)
        for key, (lo, hi) in (("comfort_target_temp", MODE_TEMP_RANGE["comfort"]),
                              ("economic_target_temp", MODE_TEMP_RANGE["eco"]),
                              ("manual_target_temp", DEFAULT_TEMP_RANGE))
    ),
    _temperature("temperature_calibration", *CALIBRATION_RANGE,
                 lambda d, v: d.set_temperature_calibration(int(v)), mode=NumberMode.SLIDER),
    setting_number("fast_heat_time", *FAST_HEAT_RANGE, lambda d, v: d.set_fast_heat_time(int(v)),
                   unit=UnitOfTime.MINUTES),
    setting_number("response_time", *RESPONSE_TIME_RANGE,
                   lambda d, v: d.set_response_time(int(v)), unit=UnitOfTime.MINUTES,
                   mode=NumberMode.SLIDER),
    *dynamic(
        binary("door_open", B.WINDOW, tk="window_open", cat=None),
        binary("valve_open", B.OPENING, cat=None),
        problem("fault"),
        problem("restarted"),
        binary("mcu_updating", B.UPDATE, on=False),
        duration("fast_heat_remaining", UnitOfTime.MINUTES),
        diag("mcu_version", on=False),
    ),
)


async def read_extra_settings(device, _first: bool) -> None:
    await device.get_extra_settings()


SPECS = (
    ModelSpec("meter", M.METER, connectable=False, passive=True),
    ModelSpec("meter_plus", M.METER_PLUS, connectable=False, passive=True),
    ModelSpec("indoor_outdoor_thermo_hygrometer", M.INDOOR_OUTDOOR_THERMO_HYGROMETER,
              connectable=False, passive=True),
    ModelSpec("meter_pro", M.METER_PRO, (SYNC_CLOCK,), connectable=False, passive=True),
    ModelSpec("meter_pro_co2", M.METER_PRO_CO2, (SYNC_CLOCK, *CO2_DISPLAY), passive=True),
    ModelSpec("hub2", M.HUB2),
    ModelSpec("hub3", M.HUB3, connectable=False, passive=True),
    ModelSpec("hubmini_matter", M.HUBMINI_MATTER, connectable=False, passive=True),
    ModelSpec("weather_station", M.WEATHER_STATION, connectable=False, passive=True),
    ModelSpec("climate_panel", M.CLIMATE_PANEL, passive=True),
    ModelSpec("smart_thermostat_radiator", M.SMART_THERMOSTAT_RADIATOR, TRV,
              refresh=read_extra_settings, refresh_delay=90),
)
