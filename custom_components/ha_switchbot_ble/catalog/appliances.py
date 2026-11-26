"""Air purifiers, circulator fans, humidifiers.

Settings from the SwitchBot app 10.10: docs/air-purifier.md, circulator-fans.md,
evaporative-humidifier.md. Never send 570f4c0c to a purifier (MCU firmware update).
"""

from __future__ import annotations

from homeassistant.components.binary_sensor import BinarySensorDeviceClass as B
from homeassistant.components.number import NumberDeviceClass, NumberMode
from homeassistant.components.sensor import SensorStateClass
from homeassistant.components.switch import SwitchDeviceClass
from homeassistant.const import DEGREE, PERCENTAGE, Platform, UnitOfTime

from ..entity import ButtonDesc, NumberDesc, SelectDesc, SwitchDesc, TimeDesc
from ..fan import (
    SwitchBotAirPurifierEntity,
    SwitchBotFanEntity,
    SwitchBotStandingFanEntity,
)
from ..humidifier import SwitchBotEvaporativeHumidifier, SwitchBotHumidifier
from ..light import (
    SwitchbotAirPurifierLightEntity,
    SwitchbotCirculatorFanProLightEntity,
)
from ..sbble import Model as M
from ..sbble.devices.air.air_purifier_base import INDICATOR_MODES, OFF_TIMER_MAX_MINUTES
from ..sbble.devices.air.evaporative_humidifier import PROTECTION_THRESHOLD_RANGE
from ..sbble.devices.air.fan_base import NightLightState
from ..time import local_to_utc_hhmm, utc_hhmm_to_local
from .base import (
    CONFIG,
    ModelSpec,
    always,
    binary,
    charging,
    diag,
    duration,
    dynamic,
    main,
    models,
    problem,
    setting_number,
    setting_select,
    setting_switch,
)
from .climate import read_extra_settings
from .common import COMMON_SENSORS


def _toggle(key: str, is_on, on, off, **kw) -> SwitchDesc:
    """A switch the built-in integration already had (state from the device object)."""
    return SwitchDesc(key=key, translation_key=key, device_class=SwitchDeviceClass.SWITCH,
                      add="always", value_fn=lambda d, _: is_on(d),
                      set_fn=lambda d, v: on(d) if v else off(d), **kw)


def _set(method: str, *args, **kwargs):
    """``set_fn`` calling ``device.<method>(*args, value)``."""
    return lambda d, v: getattr(d, method)(*args, v, **kwargs)


# --- air purifiers ----------------------------------------------------------------

CHILD_LOCK = _toggle("child_lock", lambda d: d.is_child_lock_on(),
                     lambda d: d.open_child_lock(), lambda d: d.close_child_lock())

PURIFIER = (
    main(Platform.FAN, SwitchBotAirPurifierEntity),
    main(Platform.LIGHT, SwitchbotAirPurifierLightEntity),
    CHILD_LOCK,
    ButtonDesc(key="light_sensor", translation_key="light_sensor", uid="_light_sensor",
               add="always", press_fn=lambda d: d.open_light_sensitive_switch()),
    ButtonDesc(key="reset_filter_usage", translation_key="reset_filter_usage",
               uid="_reset_filter_usage", entity_category=CONFIG, add="always",
               press_fn=lambda d: d.reset_filter_usage()),
    setting_switch("beep_enabled", _set("set_beep")),
    setting_select("indicator_mode", INDICATOR_MODES.values(), _set("set_indicator_mode")),
    setting_number("off_timer", 0, OFF_TIMER_MAX_MINUTES, lambda d, v: d.set_off_timer(int(v)),
                   unit=UnitOfTime.MINUTES, entity_category=None),
    *dynamic(
        binary("filter_door_open", B.DOOR, cat=None),
        problem("voc_sensor_fault"),
        problem("pm25_sensor_fault"),
        problem("fan_fault"),
        binary("dnd_active", on=False),
        duration("off_timer_remaining", UnitOfTime.SECONDS),
    ),
)
TABLE = _toggle("wireless_charging", lambda d: d.is_wireless_charging_on(),
                lambda d: d.open_wireless_charging(), lambda d: d.close_wireless_charging())
PM25 = always(COMMON_SENSORS["pm25"])  # US models

# --- fans -------------------------------------------------------------------------

NIGHT_LIGHT_TO_STATE = {"off": NightLightState.OFF, "soft": NightLightState.LEVEL_2,
                        "bright": NightLightState.LEVEL_1}
# the advertisement reports "off" as 0 (the OFF command byte is 3)
NIGHT_LIGHT_FROM_STATE = {0: "off"} | {s.value: o for o, s in NIGHT_LIGHT_TO_STATE.items()}

NIGHT_LIGHT = SelectDesc(
    key="night_light", translation_key="night_light", uid="_night_light",
    entity_category=CONFIG, add="always", options=["off", "soft", "bright"],
    value_fn=lambda d, _: NIGHT_LIGHT_FROM_STATE.get(d.get_night_light_state()),
    set_fn=lambda d, v: d.set_night_light(NIGHT_LIGHT_TO_STATE[v]),
)
FAN_CHARGING = dynamic(charging("charging"))


def _oscillation(axis: str) -> SwitchDesc:
    return _toggle(f"{axis}_oscillation", lambda d: getattr(d, f"get_{axis}_oscillating_state")(),
                   lambda d: getattr(d, f"set_{axis}_oscillation")(True),
                   lambda d: getattr(d, f"set_{axis}_oscillation")(False),
                   uid=f"-{axis}-oscillation")


def _oscillation_angle(axis: str) -> NumberDesc:
    """The fan does not report the angle: the last set value is kept."""
    return NumberDesc(key=f"{axis}_oscillation_angle", translation_key=f"{axis}_oscillation_angle",
                      uid="_{key}", entity_category=CONFIG, add="always", assumed=True,
                      native_min_value=30, native_max_value=90, native_step=30,
                      set_fn=lambda d, v: getattr(d, f"set_{axis}_oscillation_angle")(int(v)))

STANDING_FAN = (
    main(Platform.FAN, SwitchBotStandingFanEntity),
    NIGHT_LIGHT,
    *FAN_CHARGING,
    *(_oscillation(axis) for axis in ("horizontal", "vertical")),
    *(_oscillation_angle(axis) for axis in ("horizontal", "vertical")),
    setting_switch("child_lock", _set("set_child_lock")),
    setting_switch("display", _set("set_display")),
    setting_switch("sound", _set("set_sound")),
    setting_switch("auto_recenter", _set("set_auto_recenter")),
)

FAN_PRO = (
    main(Platform.FAN, SwitchBotFanEntity),
    main(Platform.LIGHT, SwitchbotCirculatorFanProLightEntity),
    *FAN_CHARGING,
    _toggle("vertical_oscillation", lambda d: d.get_vertical_oscillating_state(),
            lambda d: d.set_vertical_oscillation(True), lambda d: d.set_vertical_oscillation(False)),
    setting_switch("child_lock", _set("set_child_lock")),
    setting_switch("beep_enabled", _set("set_beep")),
    setting_switch("indicator_light", _set("set_indicator_light")),
    setting_switch("horizontal_recenter", lambda d, v: d.set_power_off_recenter(horizontal=v)),
    setting_switch("vertical_recenter", lambda d, v: d.set_power_off_recenter(vertical=v)),
    *dynamic(*(
        diag(f"{axis}_swing_angle", native_unit_of_measurement=DEGREE,
             state_class=SensorStateClass.MEASUREMENT)
        for axis in ("horizontal", "vertical")
    )),
)

# --- evaporative humidifier ----------------------------------------------------------


def _dnd(edge: str) -> TimeDesc:
    """Start / end of the do-not-disturb window; the device keeps it in UTC."""
    return TimeDesc(key=f"dnd_{edge}", translation_key=f"dnd_{edge}", data_key=f"dnd_{edge}_utc",
                    entity_category=CONFIG, add="dynamic",
                    value_fn=lambda _d, v: utc_hhmm_to_local(v),
                    set_fn=lambda d, v: d.set_dnd(**{f"{edge}_utc": local_to_utc_hhmm(v)}))


EVAPORATIVE_HUMIDIFIER = (
    main(Platform.HUMIDIFIER, SwitchBotEvaporativeHumidifier),
    setting_switch("child_lock", _set("set_child_lock")),
    setting_switch("over_humidify_protection",
                   lambda d, v: d.set_over_humidify_protection(enabled=v)),
    setting_switch("prompt_sound", _set("set_prompt_sound")),
    setting_switch("alarm_sound", _set("set_alarm_sound")),
    setting_switch("dnd_enabled", lambda d, v: d.set_dnd(enabled=v)),
    setting_number("over_humidify_threshold", *PROTECTION_THRESHOLD_RANGE,
                   lambda d, v: d.set_over_humidify_protection(threshold=int(v)),
                   unit=PERCENTAGE, device_class=NumberDeviceClass.HUMIDITY,
                   mode=NumberMode.SLIDER),
    _dnd("start"),
    _dnd("end"),
    *dynamic(
        problem("tank_removed", cat=None),
        problem("tilted_alert", cat=None),
        problem("filter_missing", cat=None),
        binary("meter_online", B.CONNECTIVITY),
        binary("is_meter_binded", on=False),
        binary("dnd_active", on=False),
        binary("delay_active", on=False),
        duration("filter_hours_since_clean", UnitOfTime.HOURS),
        duration("filter_hours_since_replace", UnitOfTime.HOURS),
        diag("drying_remaining", on=False),  # unit not confirmed by the app
        duration("delay_remaining", UnitOfTime.SECONDS, on=False),
    ),
)

SETTINGS = {"refresh": read_extra_settings, "refresh_delay": 90}

SPECS = (
    *models(
        ModelSpec("air_purifier_jp", M.AIR_PURIFIER_JP, entities=PURIFIER),
        ModelSpec("air_purifier_us", M.AIR_PURIFIER_US, entities=(*PURIFIER, *PM25)),
        ModelSpec("air_purifier_table_jp", M.AIR_PURIFIER_TABLE_JP, entities=(*PURIFIER, TABLE)),
        ModelSpec("air_purifier_table_us", M.AIR_PURIFIER_TABLE_US,
                  entities=(*PURIFIER, TABLE, *PM25)),
        **SETTINGS,
    ),
    ModelSpec("circulator_fan", M.CIRCULATOR_FAN,
              (main(Platform.FAN, SwitchBotFanEntity), NIGHT_LIGHT, *FAN_CHARGING)),
    ModelSpec("standing_fan", M.STANDING_FAN, STANDING_FAN),
    ModelSpec("circulator_fan_pro", M.CIRCULATOR_FAN_PRO, FAN_PRO, **SETTINGS),
    ModelSpec("evaporative_humidifier", M.EVAPORATIVE_HUMIDIFIER, EVAPORATIVE_HUMIDIFIER,
              **SETTINGS),
    ModelSpec("humidifier", M.HUMIDIFIER,
              (main(Platform.HUMIDIFIER, SwitchBotHumidifier),)),
)
