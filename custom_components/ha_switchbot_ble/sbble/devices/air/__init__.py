"""Air purifiers, fans, humidifiers.

``air_base`` is shared by all of them (and the radiator thermostat),
``air_purifier_base`` by the purifiers, ``fan_base`` by the fans.
"""

from . import (  # noqa: F401 (registers the models)
    air_purifier_jp,
    air_purifier_table_jp,
    air_purifier_table_us,
    air_purifier_us,
    circulator_fan,
    circulator_fan_pro,
    evaporative_humidifier,
    humidifier,
    standing_fan,
)
