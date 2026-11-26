"""Plug Mini (EU, US, JP), Relay Switch 1 / 1PM / 2PM, Garage Door Opener.

``plug_base`` is shared by all, ``plug_mini_base`` by the US / JP plugs,
``relay_base`` by the encrypted relays (incl. Plug Mini EU, Garage Door Opener).
"""

from . import (  # noqa: F401 (registers the models)
    garage_door_opener,
    plug_mini_eu,
    plug_mini_jp,
    plug_mini_us,
    relay_switch_1,
    relay_switch_1pm,
    relay_switch_2pm,
)
