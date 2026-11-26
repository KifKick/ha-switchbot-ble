"""Curtains, Curtain 3, Curtain Track 4, Roller Shade, Blind Tilt, Garage Door Opener.

Settings follow the app's settings pages (docs/curtain-3.md, curtain-track-4.md,
roller-shade.md, blind-tilt.md); they are read after startup, every 6 h and
with the "Refresh settings" button (``read_settings``), not on advertisements.
"""

from __future__ import annotations

from typing import Any

from homeassistant.components.binary_sensor import BinarySensorDeviceClass as B
from homeassistant.const import Platform

from ..button import refresh_button
from ..const import CONF_CURTAIN_SPEED
from ..cover import (
    SwitchBotBlindTiltEntity,
    SwitchBotCurtainEntity,
    SwitchbotGarageDoorOpenerEntity,
    SwitchBotRollerShadeEntity,
)
from ..entity import ButtonDesc, SelectDesc
from ..sbble import Model as M
from ..sbble.devices.covers import blind_tilt, curtain_3_base, roller_shade
from ..select import RestoredSelect
from .base import (
    CONFIG,
    ModelSpec,
    battery,
    binary,
    charging,
    diag,
    dynamic,
    enum,
    main,
    problem,
    setting_select,
    setting_switch,
)


async def _read_settings(device: Any, _first: bool) -> None:
    await device.read_settings()


async def _set_roller_mode(device: roller_shade.RollerShade, mode: str) -> None:
    device.set_default_mode(mode)


def _refresh() -> ButtonDesc:
    return refresh_button("_refresh_settings", lambda dev: dev.read_settings())


def charge_entities(statuses: dict[int, str]) -> tuple:
    """Charge status, charging, solar panel: created once a read reports them."""
    return dynamic(
        enum("charge_status", statuses.values()),
        charging(),
        binary("solar_panel", B.PLUG),
    )


# --- Curtain 3 / Curtain Track 4 ----------------------------------------------

CURTAINS = (
    *charge_entities(curtain_3_base.CHARGE_STATUS),
    setting_select("motion_mode", curtain_3_base.MOTION_MODES.values(),
                   lambda d, v: d.set_motion_mode(v)),
    setting_switch("touch_and_go", lambda d, v: d.set_touch_and_go(v)),
    binary("overheating", B.HEAT),
    enum("mount_type", curtain_3_base.MOUNT_TYPES.values()),
    diag("chain_length", on=False),
    _refresh(),
)

CURTAIN_3 = (*CURTAINS, problem("magnet_alarm"))
TRACK_4 = (  # no positioning magnet
    *CURTAINS,
    *dynamic(
        battery("builtin_battery"),
        battery("extended_battery"),
        binary("extended_battery_installed", B.PLUG),
    ),
)

# --- Roller Shade ---------------------------------------------------------------

ROLLER = (
    *charge_entities(roller_shade.CHARGE_STATUS),
    # not stored on the shade: the mode of every move (the app's page switch)
    SelectDesc(key="motor_mode", translation_key="motor_mode", entity_category=CONFIG,
               add="always", options=list(roller_shade.MOTOR_MODES.values()),
               set_fn=_set_roller_mode, cls=RestoredSelect),
    problem("stuck", cat=None),
    enum("motor_stop_reason", roller_shade.STOP_REASONS.values(), on=False),
    enum("crash_reason", roller_shade.CRASH_REASONS.values(), on=False),
    *dynamic(enum("roll_direction", roller_shade.DIRECTIONS.values())),
    diag("chain_length", on=False),
    binary("allow_connect", on=False),
    ButtonDesc(key="locate", translation_key="locate", add="always",
               press_fn=lambda dev: dev.locate()),
    ButtonDesc(key="toggle", translation_key="toggle", add="always",
               press_fn=lambda dev: dev.toggle()),
    _refresh(),
)

# --- Blind Tilt -----------------------------------------------------------------

BLIND = (
    *charge_entities(blind_tilt.CHARGE_STATUS),
    setting_select("motor_mode", blind_tilt.MOTOR_MODES.values(),
                   lambda d, v: d.set_motor_mode(v)),
    problem("stuck", cat=None),
    *dynamic(enum("slat_direction", ("horizontal", "vertical"))),
    diag("chain_length", on=False),
    binary("allow_connect", on=False),
    _refresh(),
)


def _cover(type_: str, model: M, cls, extra: tuple = (), **kw) -> ModelSpec:
    return ModelSpec(type_, model, (main(Platform.COVER, cls), *extra), **kw)


SPECS = (
    _cover("curtain", M.CURTAIN, SwitchBotCurtainEntity),
    _cover("curtain_3", M.CURTAIN_3, SwitchBotCurtainEntity, CURTAIN_3,
           refresh=_read_settings, options=(CONF_CURTAIN_SPEED,)),
    _cover("curtain_track_4", M.CURTAIN_TRACK_4, SwitchBotCurtainEntity, TRACK_4,
           refresh=_read_settings, options=(CONF_CURTAIN_SPEED,)),
    _cover("roller_shade", M.ROLLER_SHADE, SwitchBotRollerShadeEntity, ROLLER,
           refresh=_read_settings),
    _cover("blind_tilt", M.BLIND_TILT, SwitchBotBlindTiltEntity, BLIND, refresh=_read_settings),
    _cover("garage_door_opener", M.GARAGE_DOOR_OPENER, SwitchbotGarageDoorOpenerEntity),
)
