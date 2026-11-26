"""Contact, motion, presence and leak sensors, remotes (advertisements only).

Protocol notes: docs/contact-sensor.md, motion-sensor.md, presence-sensor.md,
water-leak-detector.md.
"""

from __future__ import annotations

from homeassistant.components.binary_sensor import BinarySensorDeviceClass as B
from homeassistant.const import UnitOfTime

from ..sbble import Model as M
from ..sbble.devices.sensors.leak_detector import ALARM_VOLUMES
from ..sbble.devices.sensors.motion_sensor import DETECTION_DISTANCES
from .base import ModelSpec, always, binary, diag, duration, dynamic, enum, problem
from .common import COMMON_SENSORS


def _passive(type_: str, model: M, *entities) -> ModelSpec:
    return ModelSpec(type_, model, entities=entities, connectable=False, passive=True)


SPECS = (
    _passive("contact", M.CONTACT_SENSOR),
    _passive(
        "motion",
        M.MOTION_SENSOR,
        *dynamic(
            binary("led_enabled", B.LIGHT, on=False),
            enum("detection_distance", DETECTION_DISTANCES.values()),
        ),
    ),
    _passive(
        "presence_sensor",
        M.PRESENCE_SENSOR,
        *always(COMMON_SENSORS["battery_range"]),
        *dynamic(binary("led_state", B.LIGHT, on=False), binary("adaptive_state")),
    ),
    _passive(
        "leak",
        M.LEAK,
        *dynamic(
            problem("alarm_active", cat=None),
            binary("buzzer_ringing", B.SOUND, cat=None),
            problem("wifi_fault"),
            enum("alarm_mode", ("leak", "dry"), cat=None),
            enum("alarm_volume", ALARM_VOLUMES.values()),
            diag("alarm_count", on=False),
            duration("alarm_duration", UnitOfTime.SECONDS),
            duration("alarm_interval", UnitOfTime.MINUTES),
        ),
    ),
    _passive("remote", M.REMOTE),
    ModelSpec("universal_remote", M.UNIVERSAL_REMOTE),
)

