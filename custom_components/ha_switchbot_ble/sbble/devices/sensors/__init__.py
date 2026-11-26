"""Meters and sensors: Meter (Plus, Pro, Pro CO2), Indoor/Outdoor Thermo-Hygrometer,
Weather Station, contact, motion, presence, water leak.

``thermo_hygrometer_base`` is shared by the meters (its ``parse_climate`` /
``decode_climate`` also by the Meter Pro family and the Weather Station),
``meter_pro_base`` by Meter Pro and Meter Pro CO2.
"""

from . import (  # noqa: F401 (registers the models)
    contact_sensor,
    indoor_outdoor_thermo_hygrometer,
    leak_detector,
    meter,
    meter_plus,
    meter_pro,
    meter_pro_co2,
    motion_sensor,
    presence_sensor,
    weather_station,
)
