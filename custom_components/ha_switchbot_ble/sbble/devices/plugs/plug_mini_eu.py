"""Plug Mini (EU): a metered relay plus LED and power-on (after an outage) settings.

Settings commands:

* ``570f7002 01|02`` LED on / off, ``570f7102`` read -> ``st 00|01``
* ``570f7010 <ch1> ff`` power-on state, ``570f7110`` read -> ``st ch1 ch2``
"""

from __future__ import annotations

import logging
from typing import Any

from ...core.advertisement import device
from ...core.const import Model
from .relay_base import RelayBase, parse_relay_pm

_LOGGER = logging.getLogger(__name__)

SET_LED = "570f7002"
READ_LED = "570f7102"
SET_POWER_ON_STATE = "570f7010"
READ_POWER_ON_STATE = "570f7110"
# value meanings not confirmed (?)
POWER_ON_STATES = {0: "off", 1: "on", 2: "last_state"}


@device("Plug Mini (EU)", "?", b"\x1f")
class PlugMiniEU(RelayBase):
    model = Model.PLUG_MINI_EU
    parse = staticmethod(parse_relay_pm)
    metering = True

    async def get_plug_settings(self) -> dict[str, Any]:
        """Read the LED and power-on settings."""
        led = await self.command(READ_LED, "reading LED")
        power = await self.command(READ_POWER_ON_STATE, "reading power-on state")
        settings: dict[str, Any] = {}
        if len(led) > 1:
            settings["led_enabled"] = bool(led[1])
        if len(power) > 1:
            settings["power_on_state_raw"] = power[1]
            settings["power_on_state"] = POWER_ON_STATES.get(power[1])
            if settings["power_on_state"] is None:
                _LOGGER.warning("%s: unknown power-on state %s, please report it",
                                self.name, power[1])
        self.merge(settings)
        return settings

    async def set_led(self, enabled: bool) -> None:
        await self.command(f"{SET_LED}{1 if enabled else 2:02x}", "setting LED")
        self.merge({"led_enabled": enabled})

    async def set_power_on_state(self, state: str) -> None:
        code = next(k for k, v in POWER_ON_STATES.items() if v == state)
        await self.command(f"{SET_POWER_ON_STATE}{code:02x}ff", "setting power-on state")
        self.merge({"power_on_state": state, "power_on_state_raw": code})
