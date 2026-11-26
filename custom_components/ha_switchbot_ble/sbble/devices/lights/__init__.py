"""Lights: Color Bulb, Ceiling Light (Pro), Light Strip, Strip Light 3, Floor Lamp,
RGBICWW lights, Permanent Outdoor Light, RGBIC neon rope lights, Candle Warmer Lamp.

``light_base`` is shared by every light, ``strip_base`` by the strip protocol
lights, ``rgbic_base`` by the RGBIC ones, ``ceiling_light_base`` by the two
ceiling lights.
"""

from . import (  # noqa: F401 (registers the models)
    candle_warmer_lamp,
    ceiling_light,
    ceiling_light_pro,
    color_bulb,
    floor_lamp,
    light_strip,
    permanent_outdoor_light,
    rgbic_neon_rope_light,
    rgbic_neon_wire_rope_light,
    rgbicww_ceiling_light,
    rgbicww_floor_lamp,
    rgbicww_light_bars,
    rgbicww_strip_light,
    strip_light_3,
)
