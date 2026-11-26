"""Entities any model gets when its advertisement carries the value.

A model's own catalog entry with the same key replaces the common one.
"""

from __future__ import annotations

from homeassistant.components.binary_sensor import BinarySensorDeviceClass as B
from homeassistant.components.event import EventDeviceClass
from homeassistant.components.sensor import SensorDeviceClass as S, SensorStateClass
from homeassistant.const import (
    LIGHT_LUX,
    SIGNAL_STRENGTH_DECIBELS_MILLIWATT,
    UnitOfDensity,
    UnitOfElectricCurrent,
    UnitOfElectricPotential,
    UnitOfEnergy,
    UnitOfPower,
    UnitOfRatio,
    UnitOfTemperature,
    UnitOfTime,
)

from ..entity import EventDesc
from ..event import CounterEvent
from ..sbble import LockStatus, Model
from ..sbble.devices.air.air_purifier_base import AirQualityLevel
from ..sbble.devices.air.evaporative_humidifier import HumidifierWaterLevel
from ..sensor import RssiSensor
from . import keypad, locks
from .base import DIAG, binary, diag, keyed, sensor

M = SensorStateClass.MEASUREMENT


def _measure(key: str, device_class: S, unit: str, **kw) -> object:
    return sensor(key, tk=None, device_class=device_class, native_unit_of_measurement=unit,
                  state_class=M, **kw)


COMMON_SENSORS = keyed(
    sensor("rssi", tk="bluetooth_signal", cat=DIAG, on=False, device_class=S.SIGNAL_STRENGTH,
           native_unit_of_measurement=SIGNAL_STRENGTH_DECIBELS_MILLIWATT, state_class=M,
           add="always", per_channel=False, cls=RssiSensor),
    sensor("wifi_rssi", tk="wifi_signal", cat=DIAG, on=False, device_class=S.SIGNAL_STRENGTH,
           native_unit_of_measurement=SIGNAL_STRENGTH_DECIBELS_MILLIWATT, state_class=M),
    _measure("battery", S.BATTERY, UnitOfRatio.PERCENTAGE, cat=DIAG),
    _measure("co2", S.CO2, UnitOfRatio.PARTS_PER_MILLION),
    sensor("lightLevel", tk="light_level", state_class=M),
    _measure("humidity", S.HUMIDITY, UnitOfRatio.PERCENTAGE),
    _measure("illuminance", S.ILLUMINANCE, LIGHT_LUX),
    _measure("temperature", S.TEMPERATURE, UnitOfTemperature.CELSIUS),
    _measure("power", S.POWER, UnitOfPower.WATT),
    _measure("current", S.CURRENT, UnitOfElectricCurrent.AMPERE),
    _measure("voltage", S.VOLTAGE, UnitOfElectricPotential.VOLT),
    _measure("pm25", S.PM25, UnitOfDensity.MICROGRAMS_PER_CUBIC_METER),
    sensor("energy", tk=None, device_class=S.ENERGY, state_class=SensorStateClass.TOTAL_INCREASING,
           native_unit_of_measurement=UnitOfEnergy.KILO_WATT_HOUR),
    sensor("aqi_level", tk="aqi_quality_level", device_class=S.ENUM,
           options=[m.name.lower() for m in AirQualityLevel]),
    sensor("water_level", device_class=S.ENUM, options=HumidifierWaterLevel.get_levels()),
    sensor("battery_range", cat=DIAG, device_class=S.ENUM,
           options=["critical", "low", "medium", "high"],
           value_fn=lambda _d, v: {"<10%": "critical", "10-19%": "low", "20-59%": "medium",
                                   ">=60%": "high"}.get(str(v))),
    sensor("filter element working time", tk="filter_usage", cat=DIAG, device_class=S.DURATION,
           native_unit_of_measurement=UnitOfTime.HOURS, state_class=M),
    diag("pir_triggered_level"),
    diag("radar_triggered_distance"),
    diag("radar_triggered_level"),
)
for _extra in (locks.STATUS_SENSORS, keypad.STATUS_SENSORS):
    for _key, _desc in _extra.items():
        COMMON_SENSORS.setdefault(_key, _desc)

COMMON_BINARY_SENSORS = keyed(
    binary("calibration"),
    binary("half_lock_calibration"),
    binary("half_locked", cat=None,
           value_fn=lambda dev, _: None if (s := dev.data.get("status")) is None
           else s is LockStatus.HALF_LOCKED),
    binary("motion_detected", tk=None, cat=None,
           device_class_fn=lambda model: B.OCCUPANCY
           if model is Model.PRESENCE_SENSOR else B.MOTION),
    binary("contact_open", B.DOOR, tk=None, cat=None, name=None),
    binary("is_light", B.LIGHT, tk=None, cat=None),
    binary("door_open", B.DOOR, tk=None, cat=None, name=None),
    binary("unclosed_alarm", B.PROBLEM, tk="door_unclosed_alarm"),
    binary("unlocked_alarm", B.PROBLEM, tk="door_unlocked_alarm"),
    binary("auto_lock_paused", tk="door_auto_lock_paused"),
    binary("leak", B.MOISTURE, tk=None, cat=None, name=None),
    binary("battery_charging", B.BATTERY_CHARGING, tk=None),
    binary("duress_alarm", B.SAFETY, cat=None),
    binary("high_temperature", B.HEAT),
    binary("lockout_alarm", B.PROBLEM, cat=None),
    binary("low_temperature", B.COLD),
    binary("tamper_alarm", B.TAMPER, tk=None, cat=None),
)
for _extra in (locks.STATUS_BINARY_SENSORS, keypad.STATUS_BINARY_SENSORS):
    for _key, _desc in _extra.items():
        COMMON_BINARY_SENSORS.setdefault(_key, _desc)


def _counter(key: str, counter: str, device_class: EventDeviceClass, event: str, *,
             tk: str | None = None) -> EventDesc:
    return EventDesc(key=key, translation_key=tk, device_class=device_class,
                     event_types=[event], data_key=counter, fire_event=event, cls=CounterEvent)


COMMON_EVENTS = (
    _counter("doorbell", "doorbell_seq", EventDeviceClass.DOORBELL, "ring"),
    _counter("button", "button_count", EventDeviceClass.BUTTON, "press"),
    _counter("on_button", "on_keystate", EventDeviceClass.BUTTON, "press", tk="on_button"),
    _counter("off_button", "off_keystate", EventDeviceClass.BUTTON, "press", tk="off_button"),
)

COMMON = (*COMMON_SENSORS.values(), *COMMON_BINARY_SENSORS.values(), *COMMON_EVENTS)
