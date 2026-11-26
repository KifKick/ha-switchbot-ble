"""Locks. Lock Pro / Ultra / Ultra Max get the extended status, settings and history.

Commands and bit layouts come from the SwitchBot app (see sbble/devices/locks/ and
docs/lock2-calibration.md).
"""

from __future__ import annotations

from homeassistant.components.binary_sensor import BinarySensorDeviceClass as B
from homeassistant.components.number import NumberMode
from homeassistant.components.sensor import SensorStateClass
from homeassistant.const import DEGREE, Platform

from ..button import refresh_button
from ..const import CONF_LOCK_NIGHTLATCH, DEFAULT_LOCK_NIGHTLATCH
from ..entity import ButtonDesc, EventDesc
from ..event import HistoryEvent
from ..lock import SwitchBotLock
from ..sbble import LockStatus, Model as M
from ..sbble.devices.locks.lock2 import (
    EU_BUTTON_ACTIONS,
    EU_RELOCK_DELAY_RANGE,
    MOTOR_SPEEDS,
    NIGHT_LOCK_POSITIONS,
    QUICK_UNLOCK_MODES,
)
from ..sbble.devices.locks.lock_base import REST_STATUSES
from ..sbble.devices.locks.lock_extended import (
    BUTTON_ACTIONS,
    BUTTON_TRIGGERS,
    MAX_TIMER_DELAY,
    ExtendedLock,
)
from ..sbble.devices.locks.lock_history import LOCK_EVENT_TYPES
from ..sbble.devices.locks.lock_ultra_max import VOICE_LANGUAGES, VOLUME_RANGE, WEATHER_MODES
from .base import (
    ModelSpec,
    battery,
    binary,
    charging,
    diag,
    duration,
    dynamic,
    enum,
    keyed,
    main,
    problem,
    setting_number,
    setting_select,
    setting_switch,
)

# --- status (advertisement / notifications), shared with the common set ----------

STATUS_BINARY_SENSORS = keyed(
    charging(),
    problem("power_alarm"),
    binary("low_temperature_alarm", B.COLD),
    problem("magnetic_position_alarm", on=False),
    binary("night_mode_active", cat=None),
    binary("on_backup_battery"),
    binary("left_pack_inserted", B.PLUG),
    binary("right_pack_inserted", B.PLUG),
    binary("auto_calibration_done", on=False),
    # settings without a write command
    binary("night_lock_at_start"),
    binary("night_disable_auto_unlock"),
    binary("night_auto_lock_enabled"),
    binary("night_sound_enabled"),
)

STATUS_SENSORS = keyed(
    diag("knob_angle", native_unit_of_measurement=DEGREE,
         state_class=SensorStateClass.MEASUREMENT),
    battery("backup_battery"),
    battery("left_pack_battery"),  # Lock Pro: two removable packs
    battery("right_pack_battery"),
    diag("power_supply_mode", on=False),
    diag("battery_status"),
    diag("lock_type"),
    diag("action_source", on=False),
    diag("door_status_source", on=False),
    diag("latch_state", on=False),
    diag("rotation_direction", on=False),
    # settings shown read-only
    duration("night_auto_lock_delay", "s"),
    enum("night_motor_speed", MOTOR_SPEEDS.values()),
    enum("drive_force", ("gentle", "standard", "strong")),
    enum("night_lock_position", NIGHT_LOCK_POSITIONS.values()),
    diag("night_mode_start"),
    diag("night_mode_end"),
    diag("drive_force_raw", on=False),
)

# --- settings -------------------------------------------------------------------

TIMERS = ("auto_lock", "force_auto_lock", "unclosed_alarm", "unlocked_alarm")


def _timer(prefix: str, **change):
    return lambda dev, value: dev.set_timer(prefix, **{k: f(value) for k, f in change.items()})


SETTINGS = (
    setting_switch("led_enabled", lambda d, v: d.set_led(v)),
    setting_switch("sound_enabled", lambda d, v: d.set_sound(v)),
    setting_switch("button_enabled", lambda d, v: d.set_button(enabled=v)),
    setting_switch("auto_lock_paused", lambda d, v: d.set_auto_lock_paused(v)),
    setting_switch("half_lock_enabled", lambda d, v: d.set_half_lock_enabled(v)),
    setting_switch("night_mode_enabled", lambda d, v: d.set_night_mode_enabled(v)),
    *(setting_switch(f"{t}_enabled", _timer(t, enabled=bool)) for t in TIMERS),
    *(setting_number(f"{t}_delay", 0, MAX_TIMER_DELAY, _timer(t, delay=int)) for t in TIMERS),
    setting_number("eu_button_relock_delay", *EU_RELOCK_DELAY_RANGE,
                   lambda d, v: d.set_eu_button(relock_delay=int(v))),
    *(
        setting_number(key, *VOLUME_RANGE, (lambda k: lambda d, v: d.set_volume(k, int(v)))(key),
                       unit=None, device_class=None, mode=NumberMode.SLIDER)
        for key in ("beep_volume", "voice_volume")  # Ultra Max, 0-4
    ),
    setting_select("button_action", BUTTON_ACTIONS.values(), lambda d, v: d.set_button(action=v)),
    setting_select("button_trigger", BUTTON_TRIGGERS.values(), lambda d, v: d.set_button(trigger=v)),
    setting_select("motor_speed", MOTOR_SPEEDS.values(), lambda d, v: d.set_motor_speed(v)),
    setting_select("quick_unlock_mode", QUICK_UNLOCK_MODES.values(),
                   lambda d, v: d.set_quick_unlock_mode(v)),
    setting_select("eu_button_single_action", EU_BUTTON_ACTIONS.values(),
                   lambda d, v: d.set_eu_button(single=v)),
    setting_select("eu_button_double_action", EU_BUTTON_ACTIONS.values(),
                   lambda d, v: d.set_eu_button(double=v)),
    setting_select("voice_language", VOICE_LANGUAGES.values(),
                   lambda d, v: d.set_voice_language(v)),
    setting_select("weather_announcement", WEATHER_MODES.values(),
                   lambda d, v: d.set_weather_announcement(v)),
)

# --- history: one event per new record, read after the lock comes to rest ----------

HISTORY = EventDesc(
    key="history",
    translation_key="history",
    event_types=list(LOCK_EVENT_TYPES),
    add="always",
    cls=HistoryEvent,
    trigger_fn=lambda d: (d.get("status"), d.get("unclosed_alarm"), d.get("unlocked_alarm")),
    read_when=lambda d: (
        d.get("status") in REST_STATUSES or d.get("unclosed_alarm") or d.get("unlocked_alarm")
    ),
    read_fn=lambda dev, after: dev.get_log_records(after_key=after, max_records=10),
)


async def _read_settings(device: ExtendedLock, _first: bool) -> None:
    await device.update_settings()


def _extended(model: M, type_: str, *extra) -> ModelSpec:
    return ModelSpec(
        type_,
        model,
        (
            main(Platform.LOCK, SwitchBotLock),
            *dynamic(*STATUS_BINARY_SENSORS.values(), *STATUS_SENSORS.values()),
            *SETTINGS,
            HISTORY,
            refresh_button("_refresh_settings", lambda dev: dev.update_settings()),
            *extra,
        ),
        refresh=_read_settings,
        options=(CONF_LOCK_NIGHTLATCH,),
    )


def _basic(model: M, type_: str, options=(CONF_LOCK_NIGHTLATCH,)) -> ModelSpec:
    return ModelSpec(type_, model, (main(Platform.LOCK, SwitchBotLock),), options=options)


SPECS = (
    _basic(M.LOCK, "lock"),
    _basic(M.LOCK_LITE, "lock_lite", options=()),
    _basic(M.LOCK_PRO_WIFI, "lock_pro_wifi"),
    _basic(M.LOCK_VISION, "lock_vision"),
    _basic(M.LOCK_VISION_PRO, "lock_vision_pro"),
    _extended(M.LOCK_PRO, "lock_pro"),
    _extended(M.LOCK_ULTRA_MAX, "lock_ultra_max"),
    _extended(
        M.LOCK_ULTRA,
        "lock_ultra",
        binary("half_lock_calibration", add="always"),
        binary("half_locked", cat=None, add="always",
               value_fn=lambda dev, _: None if (s := dev.status) is None
               else s is LockStatus.HALF_LOCKED),
        ButtonDesc(
            key="half_lock", translation_key="half_lock", uid="_half_lock",
            press_fn=lambda dev: dev.half_lock(),
            add=lambda c: c.config_entry.options.get(CONF_LOCK_NIGHTLATCH, DEFAULT_LOCK_NIGHTLATCH),
        ),
    ),
)

assert all(issubclass(s.device_cls, ExtendedLock) == bool(s.refresh) for s in SPECS)
