"""Models, lock states and the names the SwitchBot cloud uses for them.

The ``Model`` values are shown as the device model in Home Assistant, so they
must not change.
"""

from __future__ import annotations

from enum import Enum, StrEnum


class Model(StrEnum):
    """Every model the integration knows."""

    BOT = "WoHand"
    CURTAIN = "WoCurtain"
    CURTAIN_3 = "WoCurtain3"
    HUMIDIFIER = "WoHumi"
    PLUG_MINI_US = "WoPlugUS"
    PLUG_MINI_JP = "WoPlugJP"
    CONTACT_SENSOR = "WoContact"
    LIGHT_STRIP = "WoStrip"
    METER = "WoSensorTH"
    METER_PLUS = "WoMeterPlus"
    METER_PRO = "WoTHP"
    METER_PRO_CO2 = "WoTHPc"
    INDOOR_OUTDOOR_THERMO_HYGROMETER = "WoIOSensorTH"
    MOTION_SENSOR = "WoPresence"
    COLOR_BULB = "WoBulb"
    CEILING_LIGHT = "WoCeiling"
    CEILING_LIGHT_PRO = "WoCeilingPro"
    LOCK = "WoLock"
    LOCK_PRO = "WoLockPro"
    BLIND_TILT = "WoBlindTilt"
    HUB2 = "WoHub2"
    LEAK = "Leak Detector"
    KEYPAD = "WoKeypad"
    KEYPAD_TOUCH = "WoKeypadTouch"
    RELAY_SWITCH_1PM = "Relay Switch 1PM"
    RELAY_SWITCH_1 = "Relay Switch 1"
    REMOTE = "WoRemote"
    UNIVERSAL_REMOTE = "WoUniversalRemote"
    EVAPORATIVE_HUMIDIFIER = "Evaporative Humidifier"
    ROLLER_SHADE = "Roller Shade"
    HUB_MINI = "WoLinkMini"
    HUBMINI_MATTER = "HubMini Matter"
    CIRCULATOR_FAN = "Circulator Fan"
    CIRCULATOR_FAN_PRO = "Circulator Fan Pro"
    STANDING_FAN = "Standing Fan"
    K20_VACUUM = "K20 Vacuum"
    S10_VACUUM = "S10 Vacuum"
    K10_VACUUM = "K10+ Vacuum"
    K10_PRO_VACUUM = "K10+ Pro Vacuum"
    K10_PRO_COMBO_VACUUM = "K10+ Pro Combo Vacuum"
    AIR_PURIFIER_US = "Air Purifier US"
    AIR_PURIFIER_JP = "Air Purifier JP"
    AIR_PURIFIER_TABLE_US = "Air Purifier Table US"
    AIR_PURIFIER_TABLE_JP = "Air Purifier Table JP"
    HUB3 = "Hub3"
    LOCK_ULTRA = "Lock Ultra"
    LOCK_LITE = "Lock Lite"
    GARAGE_DOOR_OPENER = "Garage Door Opener"
    RELAY_SWITCH_2PM = "Relay Switch 2PM"
    STRIP_LIGHT_3 = "Strip Light 3"
    FLOOR_LAMP = "Floor Lamp"
    CANDLE_WARMER_LAMP = "Candle Warmer Lamp"
    PLUG_MINI_EU = "Plug Mini (EU)"
    RGBICWW_STRIP_LIGHT = "RGBICWW Strip Light"
    RGBICWW_FLOOR_LAMP = "RGBICWW Floor Lamp"
    RGBICWW_LIGHT_BARS = "RGBICWW Light Bars"
    RGBICWW_CEILING_LIGHT = "RGBICWW Ceiling Light"
    PERMANENT_OUTDOOR_LIGHT = "Permanent Outdoor Light"
    RGBIC_NEON_ROPE_LIGHT = "RGBIC Neon Rope Light"
    RGBIC_NEON_WIRE_ROPE_LIGHT = "RGBIC Neon Wire Rope Light"
    K11_VACUUM = "K11+ Vacuum"
    CLIMATE_PANEL = "Climate Panel"
    SMART_THERMOSTAT_RADIATOR = "Smart Thermostat Radiator"
    S20_VACUUM = "S20 Vacuum"
    PRESENCE_SENSOR = "Presence Sensor"
    KEYPAD_VISION = "Keypad Vision"
    KEYPAD_VISION_PRO = "Keypad Vision Pro"
    LOCK_VISION_PRO = "Lock Vision Pro"
    LOCK_VISION = "Lock Vision"
    LOCK_PRO_WIFI = "Lock Pro Wifi"
    LOCK_ULTRA_MAX = "Lock Ultra Max"
    WEATHER_STATION = "Weather Station"
    CURTAIN_TRACK_4 = "Curtain Track 4"


class LockStatus(Enum):
    """Lock state from the advertisement / status reply (3 or 4 bits)."""

    LOCKED = 0
    UNLOCKED = 1
    LOCKING = 2
    UNLOCKING = 3
    LOCKING_STOP = 4  # jammed while locking
    UNLOCKING_STOP = 5  # jammed while unlocking
    NOT_FULLY_LOCKED = 6  # latch locked, EU locks only
    HALF_LOCKED = 7  # Lock Ultra EU only


# device_detail.device_type in the cloud device list -> model
CLOUD_MODELS: dict[str, Model] = {
    "WoHand": Model.BOT,
    "WoCurtain": Model.CURTAIN,
    "WoCurtain3": Model.CURTAIN_3,
    "WoHumi": Model.HUMIDIFIER,
    "WoHumi2": Model.EVAPORATIVE_HUMIDIFIER,
    "WoHumi2Plus": Model.EVAPORATIVE_HUMIDIFIER,
    "WoPlugUS": Model.PLUG_MINI_US,
    "WoPlugJP": Model.PLUG_MINI_JP,
    "WoContact": Model.CONTACT_SENSOR,
    "WoWaterDetector": Model.LEAK,
    "WoStrip": Model.LIGHT_STRIP,
    "WoMeter": Model.METER,
    "WoMeterPlus": Model.METER_PLUS,
    "WoPresence": Model.MOTION_SENSOR,
    "WoBulb": Model.COLOR_BULB,
    "WoCeiling": Model.CEILING_LIGHT,
    "WoCeilingPro": Model.CEILING_LIGHT_PRO,
    "WoLock": Model.LOCK,
    "WoLockPro": Model.LOCK_PRO,
    "WoLockLite": Model.LOCK_LITE,
    "WoBlindTilt": Model.BLIND_TILT,
    "WoIOSensor": Model.INDOOR_OUTDOOR_THERMO_HYGROMETER,
    "WoButton": Model.REMOTE,
    "WoUniversalRemote": Model.UNIVERSAL_REMOTE,
    "WoLinkMini": Model.HUB_MINI,
    "WoLinkMatter": Model.HUBMINI_MATTER,
    "WoFan2": Model.CIRCULATOR_FAN,
    "WoHub2": Model.HUB2,
    "WoRollerShade": Model.ROLLER_SHADE,
    "WoAirPurifierJP": Model.AIR_PURIFIER_JP,
    "WoAirPurifierUS": Model.AIR_PURIFIER_US,
    "WoAirPurifierJPPro": Model.AIR_PURIFIER_TABLE_JP,
    "WoAirPurifierUSPro": Model.AIR_PURIFIER_TABLE_US,
    "WoSweeperMini": Model.K10_VACUUM,
    "WoSweeperMiniPro": Model.K10_PRO_VACUUM,
    "91AgWZ1n": Model.K10_PRO_COMBO_VACUUM,
    "W1113000": Model.K11_VACUUM,
    "sH5cQeLF": Model.K20_VACUUM,
    "WoSweeperOrigin": Model.S10_VACUUM,
    "W1106000": Model.S20_VACUUM,
    "W1083000": Model.RELAY_SWITCH_1PM,
    "W1083001": Model.RELAY_SWITCH_2PM,
    "W1083002": Model.RELAY_SWITCH_1,
    "W1079000": Model.METER_PRO,
    "W1079001": Model.METER_PRO_CO2,
    "W1101000": Model.PRESENCE_SENSOR,
    "W1091000": Model.LOCK_ULTRA,
    "W1096000": Model.HUB3,
    "W1083003": Model.GARAGE_DOOR_OPENER,
    "W1102000": Model.FLOOR_LAMP,
    "W1102001": Model.STRIP_LIGHT_3,
    "W1102003": Model.RGBICWW_STRIP_LIGHT,
    "W1102004": Model.RGBICWW_FLOOR_LAMP,
    "W1163000": Model.RGBICWW_LIGHT_BARS,
    "W1162000": Model.RGBICWW_CEILING_LIGHT,
    "W1160000": Model.CIRCULATOR_FAN_PRO,
    "W1104000": Model.PLUG_MINI_EU,
    "W1128000": Model.SMART_THERMOSTAT_RADIATOR,
    "W1111000": Model.CLIMATE_PANEL,
    "W1141001": Model.LOCK_VISION_PRO,
    "W1141000": Model.LOCK_VISION,
    "W1114000": Model.LOCK_PRO_WIFI,
    "W1100000": Model.CURTAIN_TRACK_4,
}
