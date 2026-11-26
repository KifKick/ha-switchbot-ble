"""Device families, one folder per kind and one module per device.

Importing a family registers its models (core.advertisement.MODELS).
"""

from . import (  # noqa: F401
    air,
    buttons,
    climate,
    covers,
    hubs,
    keypads,
    lights,
    locks,
    plugs,
    sensors,
    vacuums,
)
