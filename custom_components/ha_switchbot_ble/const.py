"""Constants. The model tables are derived from the catalog (catalog/)."""

DOMAIN = "ha_switchbot_ble"
MANUFACTURER = "switchbot"
# public OAuth client SwitchBot registered for Home Assistant (callback: My Home Assistant)
OAUTH_CLIENT_ID = "RuCCpYJPMcuZsWOfupJQYmuIPr"

# config entry data / options
CONF_RETRY_COUNT = "retry_count"
CONF_KEY_ID = "key_id"
CONF_ENCRYPTION_KEY = "encryption_key"
CONF_LOCK_NIGHTLATCH = "lock_force_nightlatch"
CONF_CURTAIN_SPEED = "curtain_speed"

DEFAULT_RETRY_COUNT = 3
DEFAULT_LOCK_NIGHTLATCH = False

# cover speeds = motion modes. Curtain 3 / Track 4: "default" lets the robot
# use its stored mode (frame byte FF); QuietDrift moves at 27 cm/min. Roller
# Shade: the mode is sent with every move (QuietDrift 100 cm/min).
CURTAIN_SPEED_DEFAULT = "default"
CURTAIN_SPEEDS = (CURTAIN_SPEED_DEFAULT, "performance", "quietdrift", "silent")
DEFAULT_CURTAIN_SPEED = CURTAIN_SPEED_DEFAULT
# the option used to be the frame byte (0-255); 1 was QuietDrift, not "silent"
LEGACY_CURTAIN_SPEEDS = {0: "performance", 1: "quietdrift", 2: "silent"}
ROLLER_SHADE_SPEEDS = ("performance", "quietdrift")


def curtain_speed_option(value: object) -> str:
    """The stored curtain speed option as a speed name (older entries kept a number)."""
    if isinstance(value, str) and value in CURTAIN_SPEEDS:
        return value
    try:
        return LEGACY_CURTAIN_SPEEDS.get(int(value), CURTAIN_SPEED_DEFAULT)  # type: ignore[call-overload]
    except (TypeError, ValueError):
        return CURTAIN_SPEED_DEFAULT
