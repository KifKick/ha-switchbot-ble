"""Bot, plugs and relays, lights, vacuums: one main entity each."""

from __future__ import annotations

from homeassistant.components.switch import SwitchDeviceClass
from homeassistant.const import Platform

from ..entity import SwitchDesc
from ..light import SwitchbotLightEntity
from ..sbble import Model as M
from ..sbble.devices.plugs.plug_mini_eu import POWER_ON_STATES, PlugMiniEU
from ..switch import BotSwitch, ChannelSwitch
from ..vacuum import SwitchbotVacuumEntity
from .base import ModelSpec, main, setting_select, setting_switch


def _one(type_: str, model: M, platform: Platform, entity, **kw) -> ModelSpec:
    return ModelSpec(type_, model, (main(platform, entity),), **kw)


async def _read_plug_settings(device: PlugMiniEU, _first: bool) -> None:
    await device.get_plug_settings()


BOT = main(Platform.SWITCH, BotSwitch)

POWER = (
    _one("bot", M.BOT, Platform.SWITCH, BotSwitch),
    *(
        _one(type_, model, Platform.SWITCH, BotSwitch)
        for type_, model in (
            ("plug_mini_us", M.PLUG_MINI_US),
            ("plug_mini_jp", M.PLUG_MINI_JP),
            ("relay_switch_1", M.RELAY_SWITCH_1),
            ("relay_switch_1pm", M.RELAY_SWITCH_1PM),
        )
    ),
    ModelSpec(
        "plug_mini_eu",
        M.PLUG_MINI_EU,
        (
            BOT,
            setting_switch("led_enabled", lambda d, v: d.set_led(v)),
            setting_select("power_on_state", POWER_ON_STATES.values(),
                           lambda d, v: d.set_power_on_state(v)),
        ),
        refresh=_read_plug_settings,
    ),
    ModelSpec(
        "relay_switch_2pm",
        M.RELAY_SWITCH_2PM,
        (SwitchDesc(key="channel", name=None, uid="-{channel}", add="always",
                    device_class=SwitchDeviceClass.SWITCH, cls=ChannelSwitch),),
        channels=2,
    ),
)

LIGHTS = tuple(
    _one(type_, model, Platform.LIGHT, SwitchbotLightEntity)
    for type_, model in (
        ("bulb", M.COLOR_BULB),
        ("light_strip", M.LIGHT_STRIP),
        ("ceiling_light", M.CEILING_LIGHT),
        ("ceiling_light_pro", M.CEILING_LIGHT_PRO),
        ("floor_lamp", M.FLOOR_LAMP),
        ("strip_light_3", M.STRIP_LIGHT_3),
        ("rgbicww_strip_light", M.RGBICWW_STRIP_LIGHT),
        ("rgbicww_floor_lamp", M.RGBICWW_FLOOR_LAMP),
        ("rgbicww_light_bars", M.RGBICWW_LIGHT_BARS),
        ("permanent_outdoor_light", M.PERMANENT_OUTDOOR_LIGHT),
        ("candle_warmer_lamp", M.CANDLE_WARMER_LAMP),
        ("rgbic_neon_rope_light", M.RGBIC_NEON_ROPE_LIGHT),
        ("rgbic_neon_wire_rope_light", M.RGBIC_NEON_WIRE_ROPE_LIGHT),
    )
)

VACUUMS = tuple(
    _one(type_, model, Platform.VACUUM, SwitchbotVacuumEntity)
    for type_, model in (
        ("s10_vacuum", M.S10_VACUUM),
        ("s20_vacuum", M.S20_VACUUM),
        ("k10_vacuum", M.K10_VACUUM),
        ("k10_pro_vacuum", M.K10_PRO_VACUUM),
        ("k10_pro_combo_vacumm", M.K10_PRO_COMBO_VACUUM),  # sic, the stored type
        ("k11+_vacuum", M.K11_VACUUM),
        ("k20_vacuum", M.K20_VACUUM),
    )
)

SPECS = (*POWER, *LIGHTS, *VACUUMS)
