"""Hand-made and captured vectors (old tests/test_library.py), against sbble.

The bytes, expected values and command hex come from real devices and the
SwitchBot app; keys sbble drops on purpose (dropped.py) are not asserted.
Commands are captured at ``Device._exchange`` (plain payloads, above encryption).
"""

from __future__ import annotations

import asyncio
from typing import Any
from unittest.mock import AsyncMock, Mock

from bleak.backends.device import BLEDevice
from bleak.backends.scanner import AdvertisementData
import pytest

from custom_components.ha_switchbot_ble.sbble import LockStatus, Model, OperationError, parse
from custom_components.ha_switchbot_ble.sbble.core.const import CLOUD_MODELS
from custom_components.ha_switchbot_ble.sbble.core.history import record_key
from custom_components.ha_switchbot_ble.sbble.devices.air.air_purifier_base import parse_purifier
from custom_components.ha_switchbot_ble.sbble.devices.air.air_purifier_us import AirPurifierUS
from custom_components.ha_switchbot_ble.sbble.devices.air.circulator_fan import (
    CirculatorFan,
    parse_circulator_fan,
)
from custom_components.ha_switchbot_ble.sbble.devices.air.circulator_fan_pro import (
    CirculatorFanPro,
    parse_pro_status,
)
from custom_components.ha_switchbot_ble.sbble.devices.air.evaporative_humidifier import (
    EvaporativeHumidifier,
    HumidifierMode,
    parse_evaporative_humidifier,
)
from custom_components.ha_switchbot_ble.sbble.devices.climate.radiator_thermostat import (
    ClimateAction,
    ClimateMode,
    RadiatorThermostat,
    decode_calibration as decode_trv_calibration,
    encode_calibration as encode_trv_calibration,
    parse_thermostat,
)
from custom_components.ha_switchbot_ble.sbble.devices.covers.blind_tilt import BlindTilt
from custom_components.ha_switchbot_ble.sbble.devices.covers.curtain_3 import Curtain3
from custom_components.ha_switchbot_ble.sbble.devices.covers.curtain_track_4 import (
    CurtainTrack4,
    combined_battery,
    parse_curtain_track_4,
)
from custom_components.ha_switchbot_ble.sbble.devices.covers.roller_shade import RollerShade
from custom_components.ha_switchbot_ble.sbble.devices.keypads.keypad import Keypad
from custom_components.ha_switchbot_ble.sbble.devices.keypads.keypad_base import (
    NO_END,
    KeypadBase,
    packets,
    parse_keypad,
    weekday_mask,
)
from custom_components.ha_switchbot_ble.sbble.devices.keypads.keypad_history import (
    parse_keypad_record,
)
from custom_components.ha_switchbot_ble.sbble.devices.keypads.keypad_touch import KeypadTouch
from custom_components.ha_switchbot_ble.sbble.devices.locks.lock import Lock
from custom_components.ha_switchbot_ble.sbble.devices.locks.lock2 import night_mode
from custom_components.ha_switchbot_ble.sbble.devices.locks.lock_base import (
    parse_lock2,
    parse_modern,
)
from custom_components.ha_switchbot_ble.sbble.devices.locks.lock_history import parse_lock_record
from custom_components.ha_switchbot_ble.sbble.devices.locks.lock_lite import LockLite
from custom_components.ha_switchbot_ble.sbble.devices.locks.lock_pro import LockPro
from custom_components.ha_switchbot_ble.sbble.devices.locks.lock_ultra import LockUltra
from custom_components.ha_switchbot_ble.sbble.devices.locks.lock_ultra_max import LockUltraMax
from custom_components.ha_switchbot_ble.sbble.devices.locks.lock_vision import LockVision
from custom_components.ha_switchbot_ble.sbble.devices.locks.lock_vision_pro import LockVisionPro
from custom_components.ha_switchbot_ble.sbble.devices.plugs.plug_mini_eu import PlugMiniEU
from custom_components.ha_switchbot_ble.sbble.devices.sensors.contact_sensor import parse_contact
from custom_components.ha_switchbot_ble.sbble.devices.sensors.indoor_outdoor_thermo_hygrometer import (
    IndoorOutdoorThermoHygrometer,
)
from custom_components.ha_switchbot_ble.sbble.devices.sensors.leak_detector import parse_leak
from custom_components.ha_switchbot_ble.sbble.devices.sensors.motion_sensor import parse_motion
from custom_components.ha_switchbot_ble.sbble.devices.sensors.presence_sensor import (
    parse_presence,
)
from custom_components.ha_switchbot_ble.sbble.devices.sensors.thermo_hygrometer_base import (
    Calibration,
    decode_calibration,
    encode_calibration,
    parse_climate,
)

BLE = BLEDevice("AA:BB:CC:DD:EE:FF", "dev", {})
MAC = bytes.fromhex("aabbccddeeff")


def make(cls, replies=(), data: dict[str, Any] | None = None, *, encrypted: bool = True):
    """A device whose commands get ``replies`` (a list, or a function of the command)."""
    device = cls(BLE, key_id="ab", encryption_key="00" * 16) if encrypted else cls(BLE)
    side_effect = replies if callable(replies) else list(replies)
    device._exchange = AsyncMock(side_effect=side_effect)
    device.update = AsyncMock()  # operations read the state afterwards
    device.data = dict(data or {})
    return device


def sent(device) -> list[str]:
    """Commands sent so far, lower-case hex."""
    return [c.args[0].hex() for c in device._exchange.call_args_list]


def run(coro):
    return asyncio.run(coro)


# ============================================================================
# locks
# ============================================================================


def test_status_extras() -> None:
    # status byte + payload; payload index n == app bytes[n + 1]
    payload = bytes(
        [
            0b1_0000_000,  # calibrated, status LOCKED
            0b01_0_1_00_1_1,  # door source 1, door open, on backup, half-lock calib
            0b1_0110010,  # charging, 50 %
            0b0000_1_1_1_1,  # rotation 1, night mode, power alarm, half-lock enabled
            0b10_000011,  # latch state 2, lock type 3
            0b1_0_1_0_1_101,  # unclosed, half-lock calib done, magnetic alarm, mode 5
            45,  # knob angle 90 degrees
        ]
    )
    data = LockUltra.parse_status(payload)
    assert data["calibration"] is True
    assert data["status"] is LockStatus.LOCKED
    assert data["door_open"] is True
    assert data["half_lock_calibration"] is True
    assert data["door_status_source"] == 1
    assert data["on_backup_battery"] is True
    assert data["battery_charging"] is True
    assert "battery" not in data  # battery stays owned by adv / basic info
    assert data["rotation_direction"] == 1
    assert data["night_mode_active"] is True
    assert data["power_alarm"] is True
    assert data["half_lock_enabled"] is True
    assert data["lock_type"] == 3
    assert data["latch_state"] == 2
    assert data["unclosed_alarm"] is True
    assert data["unlocked_alarm"] is False
    assert data["half_lock_calibration_done"] is True
    assert data["auto_calibration_done"] is False
    assert data["magnetic_position_alarm"] is True
    assert data["battery_status"] == 5
    assert data["knob_angle"] == 90

    # the first-generation layout has its own extras (test_classic_status); Lock Pro its own
    old = Lock.parse_status(payload)
    assert old["knob_angle"] == payload[2] * 2 and "battery_charging" not in old
    pro = LockPro.parse_status(payload)
    assert "half_lock_enabled" not in pro and "battery_status" not in pro


def test_adv_extras() -> None:
    mfr = bytearray(12)
    mfr[7] = 0b1_0001_011  # calibrated, status UNLOCKED, action source 3
    mfr[9] = 0b1_1010000  # charging, 80 %
    mfr[11] = 0b0_0_1_1_1_010  # low temp, power alarm, magnetic alarm, mode 2
    data = parse_lock2(None, bytes(mfr))
    assert data["battery"] == 80
    assert data["battery_charging"] is True
    assert data["action_source"] == 3
    assert data["low_temperature_alarm"] is True
    assert data["power_alarm"] is True
    assert data["magnetic_position_alarm"] is True
    assert data["battery_status"] == 2


SETTING_REPLIES = {  # 570f4f <sub> -> reply
    # 0401: LED on, sound off, button on, double press, toggle; speed quiet;
    #       half lock enabled (byte 5 bit 6)
    "0401": "01" + "8e" + "00" + "02" + "00" + "40",
    "0402": "01" + "9e" + "02",  # auto-lock on, 2 min 30 s
    "0403": "01" + "0a" + "00",  # forced auto-lock off, 0 min 10 s
    "0404": "01" + "80",
    "0501": "01" + "80" + "05",
    "0502": "01" + "00" + "00",
    "0409": "01" + "8c" + "61",  # on backup battery, main 12 %, backup 97 %
    "040f": "01" + "03520032",
    "0413": "01" + "01",
    "0412": "07",  # EU button rejected by firmware (status 0x07) -> skipped
    # night: lock at start, auto-unlock allowed, auto-lock on, quiet, sound on,
    #        enabled, half lock; 22:30-06:15; auto-lock 1 min 20 s
    "0700": "01" + "f7" + "16" + "1e" + "06" + "0f" + "14" + "01",
}


def test_settings() -> None:
    def reply(payload: bytes) -> bytes:
        assert payload[:3] == bytes.fromhex("570f4f")
        return bytes.fromhex(SETTING_REPLIES[payload[3:].hex()])

    lock = make(LockUltra, reply, {"firmware": 3.1})
    settings = run(lock.update_settings())
    expected = {
        "led_enabled": True,
        "sound_enabled": False,
        "button_enabled": True,
        "button_trigger": "double_press",
        "button_action": "toggle",
        "motor_speed": "quiet",
        "half_lock_enabled": True,
        "auto_lock_enabled": True,
        "auto_lock_delay": 150,
        "force_auto_lock_enabled": False,
        "force_auto_lock_delay": 10,
        "auto_lock_paused": True,
        "unclosed_alarm_enabled": True,
        "unclosed_alarm_delay": 300,
        "unlocked_alarm_enabled": False,
        "unlocked_alarm_delay": 0,
        "on_backup_battery": True,
        "backup_battery": 97,
        "drive_force": "standard",
        "drive_force_raw": "03520032",
        "quick_unlock_mode": "unlatch_only",
        "night_mode_enabled": True,
        "night_mode_start": "22:30",
        "night_mode_end": "06:15",
        "night_lock_at_start": True,
        "night_disable_auto_unlock": False,
        "night_auto_lock_enabled": True,
        "night_auto_lock_delay": 80,
        "night_motor_speed": "quiet",
        "night_sound_enabled": True,
        "night_lock_position": "half_lock",
    }
    assert settings == expected, {
        k: (settings.get(k), v) for k, v in expected.items() if settings.get(k) != v
    } | {k: settings[k] for k in settings.keys() - expected.keys()}


def test_night_mode_unset_times() -> None:
    parsed = night_mode(bytes.fromhex("0100ffffffff0000"))
    assert parsed["night_mode_start"] is None and parsed["night_mode_end"] is None


def test_drive_force_old_firmware() -> None:
    lock = make(LockUltra, (), {"firmware": 1.8})
    assert lock._drive_force(bytes.fromhex("01ffffffff"))["drive_force"] == "standard"
    assert lock._drive_force(bytes.fromhex("01028a000a"))["drive_force"] == "gentle"


EXPECTED_CALIBRATION = {
    # payloads as the app sends them (docs/lock2-calibration.md)
    "start": "570f4e030100c0",
    "set_lock_position": "570f4e0304008000",
    "set_lock_position_door_closed": "570f4e030400c000",
    "set_unlock_position": "570f4e0304008080",
    "set_latch_position": "570f4e040b",
    "set_door_open": "570f4e0304004040",
    "set_door_closed": "570f4e0304004000",
    "test_unlock": "570f4e03030080",
    "test_lock": "570f4e03030000",
    "complete": "570f4e030200",
    "recover": "570f4e030600",
    "auto_record_unlocked": "570f4e03070001",
    "auto_record_locked": "570f4e03070002",
    "half_lock_set_and_test": "570f4e040c0101",
    "half_lock_start": "570f4e040c02",
    "half_lock_complete": "570f4e040c03",
}


def test_calibration_commands() -> None:
    lock = make(LockUltra, lambda _payload: b"\x01")
    lock.enable_notifications = AsyncMock()

    async def steps() -> None:
        for action in EXPECTED_CALIBRATION:
            assert await lock.calibration_command(action) is True
        assert await lock.set_calibration_latch(True) is True
        assert await lock.set_calibration_latch(False) is True

    run(steps())
    assert sent(lock) == [*EXPECTED_CALIBRATION.values(), "570f4e0407ffff01", "570f4e0407ffff00"]
    lock.enable_notifications.assert_awaited_once()  # only "start" turns notifications on


def test_calibration_rejects_other_models() -> None:
    # Lock Vision / Vision Pro are calibrated by another app plugin, not by us
    assert not hasattr(LockVision, "calibration_command")
    assert not hasattr(LockVisionPro, "calibration_command")


def test_classic_calibration_frames() -> None:
    # payloads as the app sends them (docs/lock-calibration.md)
    expected = {
        "start": "030100c0",  # enter calibration
        "set_lock_position_door_closed": "030400c000",  # locked position, door closed
        "set_unlock_position_door_open": "030400c0c0",  # unlocked position, door open
        "set_door_open": "0304004040",  # door open
        "set_latch_type": "040802",  # night latch lock
        "test_unlock": "03030080",  # test unlocking
        "test_lock": "03030000",  # test locking
        "complete": "030200",  # save
        "recover": "030600",  # cancel, restore
    }
    assert Lock.calibration_steps == expected
    assert LockLite.calibration_steps == expected


def test_classic_status() -> None:
    # status byte stripped: payload[n] == reply byte [n + 1]
    payload = bytes([0b1_001_0_1_0_0, 0b0011_0000, 40, 0, 0, 0, 0, 0, 0, 0, 0b1_00000_10])
    data = Lock.parse_status(payload)
    assert data["calibration"] is True and data["status"] is LockStatus.UNLOCKED
    assert data["door_open"] is True
    assert data["knob_angle"] == 80
    assert data["latch_type"] == 2 and data["self_adjusting"] is True
    lite = LockLite.parse_status(payload)
    assert lite["knob_angle"] == 80 and lite["latch_type"] == 2 and "door_open" not in lite
    # a short frame (older firmware): angle only
    short = Lock.parse_status(payload[:3])
    assert short["knob_angle"] == 80 and "latch_type" not in short


TS = 0x6553F100


def _pkt(log_type: int, src: int, flags: int, tail: bytes = b"\x01\x03\x05") -> bytes:
    return b"\x01" + TS.to_bytes(4, "big") + bytes([0, log_type, src, flags]) + tail


def test_parse_unlock_by_fingerprint() -> None:
    rec = parse_lock_record(_pkt(0x02, 0x0F, 0x00))
    assert rec["type"] == "unlocked" and rec["source"] == "keypad"
    assert rec["credential"] == "fingerprint" and rec["credential_id"] == 5
    assert rec["key_id"] == 1 and rec["timestamp"] == TS


def test_parse_lock_variants() -> None:
    assert parse_lock_record(_pkt(0x01, 18, 0x00))["type"] == "locked"
    assert parse_lock_record(_pkt(0x01, 18, 0x00))["source"] == "auto_lock"
    assert parse_lock_record(_pkt(0x01, 16, 0x04))["type"] == "lock_failed"
    assert parse_lock_record(_pkt(0x01, 1, 0x20))["type"] == "half_locked"
    assert parse_lock_record(_pkt(0x01, 1, 0x40))["type"] == "latch_released"
    assert parse_lock_record(_pkt(0x02, 0x14, 0x00))["type"] == "emergency_unlock"
    assert parse_lock_record(_pkt(0x02, 1, 0x0C))["type"] == "unlock_failed"


def test_parse_alarm_and_unknown() -> None:
    assert parse_lock_record(_pkt(0x04, 0x80, 0x00))["type"] == "door_left_open"
    assert parse_lock_record(_pkt(0x04, 0x40, 0x00))["type"] == "left_unlocked"
    assert parse_lock_record(_pkt(0x03, 0, 0)) is None
    end = b"\x01" + bytes(11)
    assert parse_lock_record(end) is None
    # an all-zero record ends the log (core/history.py)
    lock = make(LockUltra, [b"\x01", end, _pkt(0x02, 0x0F, 0x00)])
    assert run(lock.get_log_records()) == []
    assert len(sent(lock)) == 2


def _lock(replies, cls=LockUltra):
    return make(cls, replies, {"status": None})


def test_setting_writes() -> None:
    lock = _lock([b"\x01"] * 10)
    lock.merge({"button_trigger": "single_press", "button_action": "lock", "auto_lock_delay": 30})

    async def writes() -> None:
        await lock.set_led(True)
        await lock.set_sound(False)
        await lock.set_button(action="toggle", trigger="double_press")
        await lock.set_button(enabled=False)
        await lock.set_motor_speed("quiet")
        await lock.set_timer("auto_lock", enabled=True)
        await lock.set_timer("unclosed_alarm", enabled=True, delay=125)
        await lock.set_auto_lock_paused(True)
        await lock.set_quick_unlock_mode("unlatch_only")
        await lock.set_eu_button(single="unlatch", double="none", relock_delay=10)

    run(writes())
    assert sent(lock) == [
        "570f4e0401008080ff",
        "570f4e0401004000ff",
        "570f4e0401000e0eff",
        "570f4e0401000800ff",
        "570f4e040100000002",
        "570f4e0402009e00",
        "570f4e0501008502",
        "570f4e04040080",
        "570f4e041301",
        "570f4e04120011040f0a",
    ]
    assert lock.data["led_enabled"] is True and lock.data["auto_lock_enabled"] is True
    assert lock.data["unclosed_alarm_delay"] == 125 and lock.data["button_enabled"] is False


def test_night_mode_toggle_keeps_block() -> None:
    block = bytes.fromhex("01160006001e00")  # info 0x01, 22:00-06:00, 30 s
    lock = _lock([b"\x01" + block, b"\x01"])
    run(lock.set_night_mode_enabled(True))
    assert sent(lock)[1] == "570f4e0700" + "03" + block[1:].hex()
    assert lock.data["night_mode_enabled"] is True


def test_history_stops_at_seen_record() -> None:
    newer = _pkt(0x02, 0x0F, 0x00)
    older = b"\x01" + (TS - 10).to_bytes(4, "big") + bytes([0, 1, 18, 0, 0, 0, 0])
    lock = _lock([b"\x01", newer, older])
    seen = record_key(parse_lock_record(older))
    records = run(lock.get_log_records(after_key=seen))
    assert [r["type"] for r in records] == ["unlocked"]
    assert sent(lock)[0].startswith("57001401") and sent(lock)[1] == "57001405"


# --- Lock Pro ------------------------------------------------------------------


def test_pro_status_extras() -> None:
    data = bytes(
        [
            0b1_0000_000,  # calibrated, LOCKED
            0b01_0_1_00_10,  # door source 1, door open, power supply mode 2
            0b1_1010000,  # charging, 80 %
            0b0000_1_111,  # rotation 1; low bits do not exist on Pro
            0b10_000011,  # latch 2, lock type 3
            0b11_1_1_1_1_1_0,  # alarms + low temp, lack of power, magnet, packs
            45,  # knob 90 deg
        ]
    )
    d = LockPro.parse_status(data)
    assert d["power_supply_mode"] == 2 and d["battery_charging"]
    assert d["low_temperature_alarm"] and d["power_alarm"] and d["magnetic_position_alarm"]
    assert d["left_pack_alarm"] and d["right_pack_alarm"]
    assert d["knob_angle"] == 90 and d["lock_type"] == 3 and d["latch_state"] == 2
    for key in ("half_lock_enabled", "night_mode_active", "battery_status", "on_backup_battery"):
        assert key not in d


def test_pro_settings_read() -> None:
    ok = b"\x01"
    lock = _lock(
        [
            b"\x01\xcd\x00\x02\x00\x40",  # 0401: LED, sound, button double toggle (bytes 3/5 ignored)
            b"\x01\x9e\x00",  # auto-lock on, 30 s
            ok + b"\x00\x00",
            ok + b"\x00",
            ok + b"\x00\x00",
            ok + b"\x00\x00",
            b"\x01\xd5\x3c",  # left inserted 85 %, right not inserted 60 %
        ],
        LockPro,
    )
    s = run(lock.update_settings())
    assert s["led_enabled"] and s["sound_enabled"] and s["button_action"] == "unlock"
    assert "motor_speed" not in s and "half_lock_enabled" not in s
    assert s["auto_lock_enabled"] and s["auto_lock_delay"] == 30
    assert s["left_pack_inserted"] and s["left_pack_battery"] == 85
    assert not s["right_pack_inserted"] and s["right_pack_battery"] == 60
    assert "570f4f040f" not in sent(lock) and "570f4f0700" not in sent(lock)


def test_pro_writes_have_no_speed_byte_and_lock2_only_rejected() -> None:
    lock = _lock([b"\x01"] * 4, LockPro)

    async def writes() -> None:
        await lock.set_led(True)
        await lock.set_button(enabled=False)
        await lock.set_timer("auto_lock", enabled=True, delay=10)
        await lock.calibration_command("test_lock")
        with pytest.raises(OperationError):
            await lock.calibration_command("auto_record_unlocked")

    run(writes())
    # Lock 2 settings do not exist on the Lock Pro class at all
    assert not hasattr(lock, "set_motor_speed") and not hasattr(lock, "set_night_mode_enabled")
    assert sent(lock) == [
        "570f4e0401008080",
        "570f4e0401000800",
        "570f4e0402008a00",
        "570f4e03030000",
    ]


def test_pro_adv_extras() -> None:
    mfr = bytes(7) + bytes([0b1_0000_011, 0, 0x80, 0, 0b0001_1000])
    d = parse_modern(None, mfr)
    assert d["battery_charging"] and d["action_source"] == 3
    assert d["power_alarm"] and d["magnetic_position_alarm"]


# --- Lock Ultra Max -------------------------------------------------------------


def test_ultra_max_reads_extra_settings() -> None:
    # 11 Lock 2 reads rejected (status 0x05) + volume, language, weather
    lock = _lock([b"\x05"] * 11 + [b"\x01\x03\x02", b"\x01\x02", b"\x01\x03"], LockUltraMax)
    assert run(lock.update_settings()) == {
        "voice_volume": 3,
        "beep_volume": 2,
        "voice_language": "english",
        "weather_announcement": "off",
    }


def test_ultra_max_writes_and_ultra_rejects() -> None:
    lock = _lock([b"\x01"] * 4, LockUltraMax)

    async def writes() -> None:
        await lock.set_volume("beep_volume", 4)
        await lock.set_volume("voice_volume", 0)
        await lock.set_voice_language("german")
        await lock.set_weather_announcement("scheduled")

    run(writes())
    assert sent(lock) == [
        "570f4e0414010401",
        "570f4e0414010002",
        "570f4e04140201",
        "570f4e04150202",
    ]
    assert not hasattr(LockUltra, "set_volume")


# ============================================================================
# keypads
# ============================================================================


def test_adv_flags() -> None:
    # mfr: MAC, counter 7, charging, penalty+tamper, passcode locked out
    mfr = MAC + bytes([7, 0x80, 0x03, 0x10, 0, 0, 0x20])
    d = parse_keypad(b"k\x00\x55", mfr)
    assert d["battery"] == 0x55 and d["event_counter"] == 7
    assert d["battery_charging"] and d["lockout"] and d["tamper_alarm"]
    assert d["passcode_locked_out"] and not d["nfc_locked_out"]
    assert not d["duress_alarm"]


def test_model_bytes() -> None:
    def adv(model: bytes):
        ad = AdvertisementData(
            local_name=None,
            manufacturer_data={2409: MAC + bytes(7)},
            service_data={"0000fd3d-0000-1000-8000-00805f9b34fb": model + b"\x00\x50"},
            service_uuids=[],
            tx_power=None,
            rssi=-60,
            platform_data=(),
        )
        return parse(BLE, ad)

    assert adv(b"k").model is Model.KEYPAD
    assert adv(b"y").model is Model.KEYPAD_TOUCH


def test_packetize_and_weekdays() -> None:
    assert packets("570f520202", bytes(range(13))) == [
        "570f52020220" + bytes(range(11)).hex(),
        "570f52020221" + "0b0c",
    ]
    assert weekday_mask([0, 6]) == 0b1000001  # Monday + Sunday


def _keypad(replies, cls=Keypad):
    return make(cls, replies, {"battery": 80})


def test_sync_time_tolerates_time_zone_rejection() -> None:
    # A real Keypad Touch answers 05 to the time zone frame; UTC still counts.
    kp = _keypad([b"\x01", b"\x05"], KeypadTouch)
    run(kp.sync_time(now=0x01020304, utc_offset=3600))
    assert sent(kp) == ["570005010000000001020304", "570005020d00"]


def test_add_passcode_permanent() -> None:
    kp = _keypad([b"\x01\x00\x07", b"\x01"])
    assert run(kp.add_passcode("123456", start=1000)) == 7
    cmds = sent(kp)
    assert cmds[0] == "570f52020210" + "ff0006" + "010203040506"
    assert cmds[1] == f"570f52020307{1000:08x}{NO_END:08x}"


def test_add_passcode_time_limited_12_digits() -> None:
    kp = _keypad([b"\x01", b"\x01\x00\x03", b"\x01"])
    run(kp.add_passcode("123456789012", "time_limited", 100, 200))
    cmds = sent(kp)
    # 3 + 12 = 15 bytes -> two packets
    assert cmds[0].startswith("570f52020220ff010c") and cmds[1].startswith("570f52020221")
    assert cmds[2] == f"570f52020303{100:08x}{200:08x}"


def test_periodic_passcode() -> None:
    kp = _keypad([b"\x01", b"\x01\x00\x09"])
    idx = run(kp.add_periodic_passcode("654321", [0, 1, 2, 3, 4], 22 * 60, 6 * 60,
                                       start=10, end=20))
    assert idx == 9
    payload = bytes.fromhex("".join(c[12:] for c in sent(kp)))
    assert payload == (
        bytes([0, 4, 6, 6, 5, 4, 3, 2, 1])
        + (10).to_bytes(4, "big")
        + (20).to_bytes(4, "big")
        + bytes([0b0011111, 22, 0])
        + (480).to_bytes(2, "big")  # 22:00 -> 06:00 wraps midnight
    )


def test_settings_and_actions() -> None:
    kp = _keypad([b"\x01"] * 8)

    async def actions() -> None:
        await kp.set_keypad_enabled(False)
        await kp.set_tamper_alarm(True)
        await kp.clear_tamper_alarm()
        await kp.set_backlight_and_sound(mode="on", sound=False)
        await kp.set_lock_button("timed", 30)
        await kp.cancel_lockout("nfc")
        await kp.cancel_duress_alarm()
        await kp.delete_passcode(5)

    run(actions())
    assert sent(kp) == [
        "570f52010202",
        "570f52010302",
        "570f52010303",
        "570f520104030501",
        "570f520101" + "03" + "001e",
        "570f52010502",
        "570f52010601",
        "570f52020505",
    ]
    assert kp.data["keypad_enabled"] is False
    assert kp.data["backlight_mode"] == "on"


def test_basic_info() -> None:
    raw = bytes([1, 90, 12, 1, 0, 3, 0, 20, 1, 2, 2, 1, 2, 0, 0x02])
    info = KeypadBase.parse_basic_info(raw)
    assert info["battery"] == 90 and info["firmware"] == 1.2
    assert info["lock_button_mode"] == "timed" and info["lock_button_time"] == 20
    assert info["keypad_enabled"] and info["tamper_alarm_enabled"]
    assert info["backlight_mode"] == "auto" and info["sound_enabled"]
    assert info["battery_charging"]


def test_nfc_flow() -> None:
    kp = _keypad([b"\x01\x04", b"\x01\x00\x01", b"\x01", b"\x01"])

    async def flow():
        idx = await kp.nfc_start_enroll("time_limited")
        status = await kp.nfc_enroll_status()
        await kp.nfc_set_validity(idx, 1, 2)
        await kp.nfc_confirm(idx)
        return idx, status

    assert run(flow()) == (4, "success")
    assert sent(kp) == [
        "570f5203010102" + "01",
        "570f530106",
        "570f52030304" + "00000001" + "00000002",
        "570f52030704",
    ]


def test_log() -> None:
    def rec(ts, src, act, value):
        return bytes([1, 5, 0]) + ts.to_bytes(4, "big") + bytes([0, src, act, value])

    newest = rec(2000, 1, 0, 7)
    older = rec(1990, 5, 2, 0)
    end = bytes([1]) + bytes(10)
    r = parse_keypad_record(newest)
    assert r["type"] == "unlocked" and r["source"] == "passcode" and r["credential_id"] == 7
    assert parse_keypad_record(older)["type"] == "tamper"
    assert parse_keypad_record(rec(1, 2, 2, 255))["unknown_credential"]

    kp = _keypad([b"\x01", newest, older, end])
    records = run(kp.get_log_records())
    assert [x["type"] for x in records] == ["unlocked", "tamper"]
    assert sent(kp)[0].startswith("57001401") and sent(kp)[1] == "57001403"


# ============================================================================
# thermo-hygrometers
# ============================================================================


@pytest.mark.parametrize(
    ("temp", "hum", "payload"),
    [
        (0.0, 0, "000000"),
        (0.5, 2, "808205"),  # +0.5 °C, +2 %
        (-0.5, -2, "000205"),  # -0.5 °C, -2 %
        (-1.3, 0, "010003"),
        (2.0, -10, "820a00"),
        (1.96, 1, "828100"),  # rounds to +2.0, no 0x0a nibble
        (-0.04, 0, "000000"),  # rounds to 0
    ],
)
def test_encode_matches_app(temp: float, hum: int, payload: str) -> None:
    assert encode_calibration(temp, hum).hex() == payload


@pytest.mark.parametrize(
    ("temp", "hum"), [(0.0, 0), (0.5, 2), (-0.5, -2), (-12.7, 33), (19.9, -50)]
)
def test_roundtrip(temp: float, hum: int) -> None:
    assert decode_calibration(encode_calibration(temp, hum)) == Calibration(temp, hum)


def _thermo(replies):
    return make(IndoorOutdoorThermoHygrometer, replies, encrypted=False)


def test_get_and_set_commands() -> None:
    dev = _thermo([bytes.fromhex("01"), bytes.fromhex("01808205")])
    assert run(dev.set_calibration(0.5, 2)) == Calibration(0.5, 2)
    assert sent(dev) == ["570f36808205", "570f37"]


def test_rejects_out_of_range_and_errors() -> None:
    with pytest.raises(ValueError):  # checked before anything is sent
        run(_thermo([]).set_calibration(25, 0))
    with pytest.raises(OperationError):
        run(_thermo([bytes.fromhex("05")]).get_calibration())


# real advertisements of two sensors (HA diagnostics; MAC bytes 0-3 anonymised)
ADV_442E = (b"\xaa\xbb\xcc\xddD.4\x0e\t\x915\x00", b"w\xc0\xe4")
ADV_0954 = (b"\xaa\xbb\xcc\xdd\tTo\n\t\x86X\x00", None)


def test_io_sensor_real_adverts() -> None:
    # comfort, battery code and alarm bits are dropped on purpose (dropped.py)
    mfr, svc = ADV_442E
    d = parse_climate(svc, mfr)
    assert d["temperature"] == 17.9 and d["humidity"] == 53 and d["battery"] == 100
    mfr, svc = ADV_0954
    d = parse_climate(svc, mfr)
    assert d["temperature"] == 6.9 and d["humidity"] == 88


def test_io_sensor_alarm_bits() -> None:
    mfr = bytearray(ADV_442E[0])
    mfr[7] = 0b11_10_00_00  # dew point + VPD alarm, comfort 0, battery code 0
    mfr[8] = (mfr[8] & 0x0F) | 0b10_01_0000  # temperature + humidity alarm
    mfr[11] = 0b01  # absolute humidity alarm
    d = parse_climate(ADV_442E[1], bytes(mfr))
    assert d["temperature"] == 17.9  # alarm bits do not disturb the reading
    assert d["humidity"] == 53


# ============================================================================
# Plug Mini EU
# ============================================================================


def _plug(replies):
    return make(PlugMiniEU, replies, {"isOn": False, "power": 5.0, "sequence_number": 1})


def test_read_settings() -> None:
    plug = _plug([b"\x01\x01", b"\x01\x02\xff"])
    assert run(plug.get_plug_settings()) == {
        "led_enabled": True,
        "power_on_state_raw": 2,
        "power_on_state": "last_state",
    }
    assert sent(plug) == ["570f7102", "570f7110"]


def test_write_settings() -> None:
    plug = _plug([b"\x01", b"\x01", b"\x01"])

    async def writes() -> None:
        await plug.set_led(False)
        await plug.set_led(True)
        await plug.set_power_on_state("off")

    run(writes())
    assert sent(plug) == ["570f700202", "570f700201", "570f701000ff"]
    assert plug.data["power_on_state"] == "off"


def test_settings_survive_next_advertisement() -> None:
    from custom_components.ha_switchbot_ble.sbble import Advertisement

    plug = _plug([b"\x01\x00", b"\x01\x01\xff"])
    run(plug.get_plug_settings())
    plug.update_from_advertisement(Advertisement(
        BLE.address, Model.PLUG_MINI_EU, "Plug Mini (EU)",
        {"isOn": True, "power": 5.0, "sequence_number": 1}, -60, True, BLE,
    ))
    assert plug.data["isOn"] is True
    assert plug.data["led_enabled"] is False and plug.data["power_on_state"] == "on"


# ============================================================================
# appliances
# ============================================================================


def _dev(cls, replies, data=None, encrypted=True):
    return make(cls, replies, {"sequence_number": 1, **(data or {})}, encrypted=encrypted)


def test_purifier_adv_faults() -> None:
    d = bytes([7, 0x81, 0x00, 50, 0x02, 0x00, 0x10, 0x09])
    data = parse_purifier(None, MAC + d)
    assert data["filter_door_open"] is True
    assert data["fan_fault"] is True
    assert data["voc_sensor_fault"] is False and data["pm25_sensor_fault"] is False


def test_purifier_settings() -> None:
    dev = _dev(AirPurifierUS,
               [b"\x01\x01", b"\x01\x80\x02\x58", b"\x01", b"\x01", b"\x01", b"\x01"])

    async def settings_and_writes():
        settings = await dev.get_extra_settings()
        await dev.set_off_timer(30)
        await dev.set_off_timer(0)
        await dev.set_beep(False)
        await dev.set_indicator_mode("auto")
        return settings

    assert run(settings_and_writes()) == {
        "beep_enabled": True, "off_timer_remaining": 600, "off_timer": 10,
    }
    assert sent(dev) == [
        "570f4d06",
        "570f4d04",
        "570f4c04800708",
        "570f4c04000000",
        "570f4c0600",
        "570f4c0702",
    ]
    assert dev.data["off_timer"] == 0
    assert dev.data["indicator_mode"] == "auto"
    assert dev.data["beep_enabled"] is False


def test_purifier_settings_unsupported_read() -> None:
    dev = _dev(AirPurifierUS, [b"\x07", b"\x07"])
    assert run(dev.get_extra_settings()) == {}


def test_circulator_fan_charging() -> None:
    data = parse_circulator_fan(None, MAC + bytes([3, 0x80, 0x80 | 55, 40]))
    assert data["charging"] is True and data["battery"] == 55


def test_circulator_fan_night_light() -> None:
    dev = _dev(CirculatorFan, [b"\x01"], encrypted=False)
    run(dev.set_night_light(3))  # OFF -> 0x00
    assert sent(dev) == ["570f41050200ffff"]


def test_fan_pro_oscillation_matches_app() -> None:
    dev = _dev(CirculatorFanPro, [b"\x01"] * 4)

    async def moves() -> None:
        await dev.set_oscillation(True)
        await dev.set_oscillation(False)
        await dev.set_horizontal_oscillation(True)
        await dev.set_vertical_oscillation(False)

    run(moves())
    assert sent(dev) == [
        "570f4102010101",
        "570f4102010202",
        "570f41020101ff",
        "570f410201ff02",
    ]


def test_fan_pro_status_and_settings() -> None:
    # off_delay_active, schedule_count and ionizer are dropped on purpose (dropped.py)
    status = bytes([0x01, 0xC9, 0x80 | 77, 0x91, 60, 0, 30, 0, 0x01, 50])
    parsed = parse_pro_status(status)
    assert parsed["indicator_light"] and parsed["child_lock"]
    assert parsed["charging"] and parsed["battery"] == 77
    assert parsed["horizontal_recenter"] and not parsed["vertical_recenter"]
    assert parsed["horizontal_swing_angle"] == 60 and parsed["vertical_swing_angle"] == 30

    dev = _dev(CirculatorFanPro, [b"\x01\x01", b"\x01", b"\x01", b"\x01", b"\x01"])

    async def settings_and_writes():
        settings = await dev.get_extra_settings()
        await dev.set_beep(False)
        await dev.set_child_lock(True)
        await dev.set_indicator_light(False)
        await dev.set_power_off_recenter(horizontal=False)
        return settings

    assert run(settings_and_writes()) == {"beep_enabled": True}
    assert sent(dev) == [
        "570f9705",
        "570f960500ff",
        "570f960601",
        "570f960a0100ffff",
        "570f41020502ff",
    ]
    assert dev.data["horizontal_recenter"] is False
    assert "vertical_recenter" not in dev.data


def _humi_mfr(mode: int = 0x81, water: int = 0x02) -> bytes:
    return MAC + bytes(
        [
            9,  # sequence
            mode,
            0x20 | 0x10 | 0x04,  # child lock, DND, tank removed
            0x80 | 45,  # meter bound, 45 %
            0x80 | 21,  # +21
            0x50 | water,  # .5, water level
            0x00, 0x30,  # 48 h since cleaning
            0x01, 0x00,  # 256 h since replacement
            55,  # target
        ]
    )


def test_humidifier_adv() -> None:
    data = parse_evaporative_humidifier(None, _humi_mfr())
    assert data["sequence_number"] == 9 and "seq_number" not in data
    assert data["mode"] is HumidifierMode.HIGH
    assert data["temperature"] == 21.5 and data["humidity"] == 45
    assert data["water_level"] == "medium"
    assert data["child_lock"] and data["tank_removed"] and data["dnd_active"]
    assert data["filter_hours_since_clean"] == 48
    assert data["filter_hours_since_replace"] == 256


def test_humidifier_unknown_values_do_not_raise() -> None:
    data = parse_evaporative_humidifier(None, _humi_mfr(mode=0x8C, water=0x09))
    assert data["mode"] is None and data["water_level"] is None


def test_cloud_models() -> None:
    assert CLOUD_MODELS["WoHumi2Plus"] is Model.EVAPORATIVE_HUMIDIFIER
    assert CLOUD_MODELS["WoWaterDetector"] is Model.LEAK


def test_humidifier_settings() -> None:
    dev = _dev(
        EvaporativeHumidifier,
        [
            b"\x01\x01\x46",
            b"\x01\x03\x01",
            b"\x01\x00",
            b"\x01\x01\x16\x00\x05\x1e",
            b"\x01", b"\x01", b"\x01", b"\x01", b"\x01",
        ],
    )

    async def settings_and_writes():
        settings = await dev.get_extra_settings()
        await dev.set_over_humidify_protection(threshold=65)
        await dev.set_prompt_sound(False)
        await dev.set_alarm_sound(True)
        await dev.set_dnd(start_utc="21:30")
        await dev.set_dnd(enabled=False)
        return settings

    assert run(settings_and_writes()) == {
        "over_humidify_protection": True,
        "over_humidify_threshold": 70,
        "prompt_sound": True,
        "alarm_sound": False,
        "dnd_enabled": True,
        "dnd_start_utc": "22:00",
        "dnd_end_utc": "05:30",
    }
    assert sent(dev) == [
        "570f4402",
        "570f4409",
        "570f440d",
        "570f440e",
        "570f43030141",
        "570f430800",
        "570f430b01",
        "570f430e01151e051e",
        "570f430e00151e051e",
    ]


# ============================================================================
# sensors
# ============================================================================


def _leak(flags: int) -> bytes:
    return MAC + bytes([5, 0x80 | 64, flags]) + (1700000000).to_bytes(4, "big") + bytes(
        [60, 5]
    ) + (1700000500).to_bytes(4, "big")


def test_leak_wet_is_bit6() -> None:
    # leak mode (bit 7), wet (bit 6), buzzer (bit 5), volume 2, alarm count 1
    # (last_alarm_time, last_test_time and low_battery are dropped on purpose)
    data = parse_leak(None, _leak(0x80 | 0x40 | 0x20 | (2 << 3) | 0x01))
    assert data["leak"] is True and data["alarm_mode"] == "leak"
    assert data["alarm_active"] is True and data["buzzer_ringing"] is True
    assert data["alarm_volume"] == "medium" and data["alarm_count"] == 1
    assert data["alarm_duration"] == 60 and data["alarm_interval"] == 5
    assert data["battery"] == 64
    assert "tampered" not in data


def test_leak_count_bit_is_not_leak() -> None:
    data = parse_leak(None, _leak(0x80 | 0x01))  # leak mode, dry, count 1
    assert data["leak"] is False and data["alarm_active"] is False


def test_leak_dry_alert_mode() -> None:
    data = parse_leak(None, _leak(0x00))  # dry mode, dry -> alarm
    assert data["alarm_mode"] == "dry" and data["alarm_active"] is True


def test_leak_short_advert() -> None:
    data = parse_leak(None, MAC + bytes([1, 50, 0x40]))
    assert data["leak"] is True and "alarm_duration" not in data


def test_contact() -> None:
    # seconds_since_* are dropped on purpose
    svc = bytes([0x64, 0x40, 90, 0x80 | 0x40 | 0x02, 0x00, 0x10, 0x01, 0x00, 0x03])
    data = parse_contact(svc, None)
    assert data["contact_open"] is True and data["motion_detected"] is True


def test_motion_settings() -> None:
    svc = bytes([0x73, 0x40, 80, 0x01, 0x02, 0x80 | 0x20 | (1 << 2) | 0x02])
    data = parse_motion(svc, None)
    assert data["led_enabled"] is True
    assert data["detection_distance"] == "medium"
    assert data["is_light"] is True


def test_presence_flags() -> None:
    mfr = MAC + bytes([3, 0x80 | 0x40 | 0x01, 0x00, 0x05, 0x00, 0x80 | 12])
    data = parse_presence(None, mfr)
    assert data["adaptive_state"] and data["led_state"] and data["lightLevel"] == 12


# --- radiator thermostat --------------------------------------------------------


def _trv_adv(mode: int = 4, valve_closed: bool = False, target: int = 21) -> bytes:
    return MAC + bytes(
        [7, 0x80 | 90, 0x05, 0x80 | 20, 0x80 | target, mode | (0x08 if valve_closed else 0),
         0x01 | (3 << 1)]
    )


def test_trv_adv_valve_window_fault() -> None:
    data = parse_thermostat(None, _trv_adv(valve_closed=True))
    assert data["valve_open"] is False
    assert data["door_open"] is True and data["fault"] is True
    assert parse_thermostat(None, _trv_adv())["valve_open"] is True


def test_trv_unknown_mode_is_none() -> None:
    assert parse_thermostat(None, _trv_adv(mode=7))["mode"] is None


def _trv(replies, adv: bytes | None = None, extra: dict | None = None):
    data = parse_thermostat(None, adv or _trv_adv()) | (extra or {})
    return make(RadiatorThermostat, replies, data)


def test_trv_basic_info_fixes() -> None:
    reply = bytes(
        [
            0x01, 88, 13, 2,
            (0 << 3) | 4,  # previous mode schedule, mode comfort, valve open
            0x80, 215,  # +21.5
            0x00, 200,  # manual 20.0
            220, 170, 30,  # comfort 22.0, eco 17.0, fast heating 30 min
            0x02 | 0x04 | 0x40,  # bit1 only (not child lock), anti-frost, window detection
            0x00, 211,  # target 21.1 (odd: the old window bug)
            0x02 | (5 << 3),  # restarted, MCU 5, window closed
            12,  # fast-heating countdown
        ]
    )
    info = run(_trv([reply]).read_basic_info())
    assert info["child_lock"] is False
    assert info["door_open"] is False
    assert info["target_temperature"] == 21.1
    assert info["anti_frost"] and info["window_detection"] and not info["descaling"]
    assert info["valve_open"] is True and info["restarted"] is True
    assert info["mcu_version"] == 5 and info["fast_heat_remaining"] == 12


def test_trv_settings_writes() -> None:
    dev = _trv([b"\x01"] * 8 + [b"\x01\x83", b"\x01\x00"], extra={"firmware": 1.3})

    async def writes():
        await dev.set_basic_function("window_detection", True)
        await dev.set_basic_function("child_lock", False)
        await dev.set_mode_temperature("comfort_target_temp", 22.5)
        await dev.set_mode_temperature("manual_target_temp", 19.0)
        await dev.set_fast_heat_time(45)
        await dev.set_response_time(3)
        await dev.set_temperature_calibration(-2)
        await dev.set_temperature_calibration(3)
        return await dev.get_extra_settings()

    assert run(writes()) == {"temperature_calibration": 3, "response_time": 1}
    assert sent(dev) == [s.lower() for s in (
        "5703ffffffffffff7f",
        "5703fffffffffffffc",
        "570F7803E1",
        "570F780100BE",
        "570F78042D",
        "570F780F03",
        "570F780902",
        "570F780983",
        "570F7909",
        "570F7910",
    )]
    assert dev.data["comfort_target_temp"] == 22.5


def test_trv_calibration_encoding() -> None:
    for v in range(-10, 11):
        assert decode_trv_calibration(encode_trv_calibration(v)) == v


def test_trv_off_and_action() -> None:
    off = _trv([], adv=_trv_adv(mode=1, target=4))
    idle = _trv([], adv=_trv_adv(valve_closed=True), extra={"firmware": 1.3})
    heating = _trv([], adv=_trv_adv(valve_closed=False), extra={"firmware": 1.3})
    assert off.hvac_mode == ClimateMode.OFF and off.hvac_action == ClimateAction.OFF
    assert idle.hvac_mode == ClimateMode.HEAT and idle.hvac_action == ClimateAction.IDLE
    assert heating.hvac_action == ClimateAction.HEATING


def test_trv_heat_resumes_previous_mode() -> None:
    # knob "OF" (mode 2), previous mode eco (adv mfr[11] bits 4-7 = 3)
    dev = _trv([b"\x01"], adv=_trv_adv(mode=2 | (3 << 4)))
    run(dev.set_hvac_mode(ClimateMode.HEAT))
    manual_off = _trv([b"\x01"], adv=_trv_adv(mode=1, target=4))
    run(manual_off.set_hvac_mode(ClimateMode.HEAT))
    assert sent(dev) == ["570f780003"]
    assert sent(manual_off) == ["570f780004"]


# ============================================================================
# covers (frames and layouts from docs/curtain-3.md, curtain-track-4.md,
# roller-shade.md, blind-tilt.md)
# ============================================================================


def _cover(cls, replies=(b"\x01",), data=None):
    device = make(cls, replies, data, encrypted=cls is CurtainTrack4)
    device._sync_clock = AsyncMock()
    device.follow_motion = Mock()
    return device


def _adv(service: str | None, mfr: str | None):
    return parse(BLE, AdvertisementData(
        None, {2409: MAC + bytes.fromhex(mfr)} if mfr else {},
        {"0000fd3d-0000-1000-8000-00805f9b34fb": bytes.fromhex(service)} if service else {},
        [], None, -60, ()))


def test_curtain_3_advertisement() -> None:
    adv = _adv("7b c0 50 1e 02 07", "00 80 00 00 00 81")
    assert adv is not None and adv.model is Model.CURTAIN_3
    d = adv.data
    assert d["calibration"] is True and d["group_master"] is True
    assert d["battery"] == 80
    assert d["position"] == 70  # app 30 % closed
    assert d["chain_length"] == 2 and d["overheating"] is True
    assert d["high_temperature"] is True and d["low_temperature"] is False
    assert d["mount_type"] == "rod" and d["kit"] is True
    assert d["magnet_alarm"] is None  # only with more than 12 bytes
    d = _adv("7b 00 50 64 01 00", "00 44 00 00 00 02 00 00").data
    assert d["low_temperature"] is True and d["magnet_alarm"] is True
    assert d["mount_type"] == "i_rail" and d["position"] == 0
    assert _adv("5b 00 50 00 01 00", "00 00 00 00 00 00 00").data["mount_type"] == "u_rail"
    assert _adv("7b 00 50 00 01 00", "00 00 00 00 00 05 00").data["mount_type"] == "u_rail"


def test_curtain_3_frames() -> None:
    dev = _cover(Curtain3, [b"\x01"] * 6, {"position": 50, "firmware": 2.2})
    run(dev.set_position(30))
    run(dev.set_position(100, "quietdrift"))
    run(dev.close(2))
    run(dev.stop())
    run(dev.set_motion_mode("silent"))
    run(dev.set_touch_and_go(True))
    assert sent(dev) == ["570f45010401ff46", "570f450104010100", "570f450104010264",
                         "570f45010001", "570f45040101" "02", "570f450403010101"]
    assert dev.data["motion_mode"] == "silent" and dev.data["touch_and_go"] is True
    # motion modes need firmware > 10 (raw byte): the default mode is sent instead
    old = _cover(Curtain3, data={"firmware": 1.0, "position": 50})
    run(old.set_position(0, "silent"))
    assert sent(old) == ["570f45010401ff64"]
    with pytest.raises(ValueError):
        run(dev.set_motion_mode("fast"))


def test_curtain_3_home_info() -> None:
    reply = bytes.fromhex("01 4b 16 05 c4 02 81 1e 00 00 00 00 00 20 00")
    dev = _cover(Curtain3, [reply])
    data = run(dev.read_home_info())
    assert data["battery"] == 75 and data["firmware"] == 2.2
    assert data["charge_status"] == "solar_idle" and data["solar_panel"] is True
    assert data["battery_charging"] is False
    assert data["calibration"] is True and data["open_direction"] == "right"
    assert data["touch_and_go"] is True and data["motion_status"] == "stopped"
    assert data["timers"] == 2 and data["position"] == 70 and data["motion_mode"] == "silent"
    assert sent(dev) == ["570f460403"]
    with pytest.raises(OperationError):  # the app needs more than 10 bytes
        run(_cover(Curtain3, [reply[:10]]).read_home_info())


def test_curtain_motion_and_distance() -> None:
    dev = _cover(Curtain3, [bytes.fromhex("01 02"), bytes.fromhex("01 00"),
                            bytes.fromhex("01 00 00 c8 00 f0"), bytes.fromhex("01 00 00 05 00 0f")])
    assert run(dev.read_motion()) is True and dev.is_closing()
    assert run(dev.read_motion()) is False
    assert run(dev.read_calibration_info()) == {"distance_cm": 200, "steps": 240,
                                                "route_too_short": False}
    assert run(dev.read_calibration_info(slave=True))["route_too_short"] is True
    assert sent(dev) == ["570f460100", "570f460100", "570f460500", "570f460501"]


def test_curtain_track_4_identified_by_product_id() -> None:
    mfr = "00 03 1e 01 00 01 50 80"
    for service in ("00 20 00 00 10 c8 e0", "00 20 00 01 10 c8 e0", "80 20 00 00 10 c8 e0 aa bb"):
        adv = _adv(service, mfr)
        assert adv is not None and adv.model is Model.CURTAIN_TRACK_4, service
    d = _adv(None, mfr)  # passive scan: the model is not told
    assert d is None
    data = parse_curtain_track_4(None, MAC + bytes.fromhex(mfr))
    assert data["calibration"] is True and data["group_master"] is True
    assert data["position"] == 70 and data["chain_length"] == 1
    assert data["mount_type"] == "rod" and data["builtin_battery"] == 80
    assert data["extended_battery_installed"] is True and data["battery"] is None
    data = parse_curtain_track_4(None, MAC + bytes.fromhex("00 a0 00 01 07 00 3c 00"))
    assert data["high_temperature"] is True and data["low_temperature"] is False
    assert data["overheating"] is True and data["battery"] == 60
    assert data["calibration"] is False  # service byte 1 bit 6 is not the flag here
    assert CLOUD_MODELS["W1100000"] is Model.CURTAIN_TRACK_4


def test_curtain_track_4_home_info_and_battery() -> None:
    assert combined_battery(80, 68) == 71 and combined_battery(80, None) == 80
    reply = bytes.fromhex("01 50 c4 16 01 a5 00 00 1e 00 00 00 00 00 00 20 00")
    dev = _cover(CurtainTrack4, [reply, b"\x01"])
    data = run(dev.read_home_info())
    assert data["builtin_battery"] == 80 and data["extended_battery"] == 68
    assert data["battery"] == 71 and data["extended_battery_installed"] is True
    assert data["firmware"] == 2.2 and data["battery_charging"] is True
    assert data["solar_panel"] is True and data["calibration"] is True
    assert data["touch_and_go"] is True and data["position"] == 70
    assert data["motion_mode"] == "silent"
    run(dev.set_position(70, "performance"))  # always has motion modes
    assert sent(dev) == ["570f460403", "570f45010401001e"]


def test_roller_shade_advertisement() -> None:
    adv = _adv("2c 00 33", "05 02 9e 61 03 4b a0")
    assert adv is not None and adv.model is Model.ROLLER_SHADE
    d = adv.data
    assert d["sequence_number"] == 5 and d["motion"] == "opening"
    assert d["allow_connect"] is False and d["calibration"] is True
    assert d["position"] == 70 and d["lightLevel"] == 6 and d["chain_length"] == 1
    assert d["motor_stop_reason"] == "stuck" and d["stuck"] is False  # still moving
    assert d["battery"] == 75  # mfr[11], not the service data
    assert d["charge_status"] == "solar_idle" and d["solar_panel"] is True
    d = _adv("2c 00 33", "05 05 1e 61 23 4b 08").data
    assert d["motion"] == "closing" and d["crash_reason"] == "rom_watchdog"
    assert d["stuck"] is True  # mfr[12] bit 3
    d = _adv("2c 00 33", "05 01 1e 61 02").data
    assert d["motion"] == "stopped" and d["stuck"] is True and d["battery"] == 51
    assert _adv("2c 00 33", "05 01 1e 61") is None  # the app needs 11 bytes


def test_roller_shade_frames_and_state() -> None:
    state = bytes.fromhex("01 03 12 4b 05 01 1e")
    dev = _cover(RollerShade, [b"\x01"] * 6 + [state, b"\x01"], {"position": 50})
    run(dev.open())
    run(dev.close("quietdrift"))
    run(dev.set_position(70, 1))
    run(dev.stop())
    run(dev.locate())
    run(dev.toggle())
    assert run(dev.read_motion()) is True and dev.is_opening()
    assert sent(dev) == ["570f470105010000", "570f470105010164", "570f47010501011e",
                         "570f47010a01", "570f47010c", "570f4701060101", "570f48041100"]
    assert dev.data["roll_direction"] == "standard" and dev.data["charge_status"] == "solar_charging"
    assert dev.data["position"] == 70 and dev.data["calibration"] is False
    dev.set_default_mode("quietdrift")
    run(dev.open())
    assert sent(dev)[-1] == "570f470105010100"
    with pytest.raises(ValueError):
        run(dev.open(2))


def test_blind_tilt_advertisement() -> None:
    adv = _adv("78 00 3a", "07 c1 32 02 80")
    assert adv is not None and adv.model is Model.BLIND_TILT
    d = adv.data
    assert d["calibration"] is True and d["slat_direction"] == "vertical"
    assert d["tilt"] == 50 and d["stuck"] is False and d["battery"] == 58
    assert d["chain_length"] == 2 and d["allow_connect"] is True
    assert "lightLevel" not in d  # the app has no light level in the advertisement
    d = _adv("78 00 3a", "07 89 14 32 00").data
    assert d["slat_direction"] == "horizontal" and d["stuck"] is True
    assert d["chain_length"] == 2  # bits 0-2 only
    assert _adv("78 00 3a", "07 08 94 00 00").data["stuck"] is False  # moving: not stuck
    assert _adv("78 00 3a", "07 41 32").data["slat_direction"] is None  # not set yet


def test_blind_tilt_frames() -> None:
    basic = lambda fw: bytes([1, 90, fw, 0, 0x28, 0x0c, 0x32, 1])  # noqa: E731
    motion = bytes.fromhex("01 00 00 00 00 00 32 00")
    old = _cover(BlindTilt, [basic(19), motion, b"\x01"], {"tilt": 20})
    old.update = BlindTilt.update.__get__(old)
    run(old.open())
    assert sent(old) == ["5702", "570f460100", "570f4501010132"]
    assert old.data["solar_panel"] is True and old.data["calibration"] is True
    new = _cover(BlindTilt, [b"\x01"] * 4 + [bytes.fromhex("01 01")], {"tilt": 20})
    new._ble_version = 20
    run(new.close_up())
    run(new.stop())
    run(new.set_motor_mode("quiet"))
    run(new.set_position(25))
    assert sent(new) == ["570f450105ff64", "570f45010001", "570f4504010101", "570f450105ff19"]
    assert new.is_opening() is True  # 20 -> 25: towards 50 opens


def test_cover_clock_sync_once_per_connection() -> None:
    dev = Curtain3(BLE)
    dev._exchange = AsyncMock(return_value=b"\x01")
    dev._conn.ensure_connected = AsyncMock()
    dev._conn.generation = 1
    run(dev.request("570f460100"))
    run(dev.request("570f460100"))
    frames = sent(dev)
    assert frames[0].startswith("57000501") and len(frames[0]) == 24
    assert frames[1:] == ["570f460100", "570f460100"]
    dev._conn.generation = 2
    run(dev.request("570f460100"))
    assert sent(dev)[3].startswith("57000501")


def test_cover_settings_reads() -> None:
    home = bytes.fromhex("01 4b 16 00 84 00 00 1e 00 00 00 00 00 10 00")
    c3 = _cover(Curtain3, [home, bytes.fromhex("01 01")])
    c3.update = Curtain3.update.__get__(c3)
    run(c3.read_settings())
    assert sent(c3) == ["570f460403", "570f460401"]
    assert c3.data["logo_outside"] is True and c3.data["motion_mode"] == "quietdrift"
    bt = _cover(BlindTilt, [bytes([1, 90, 21, 0, 0x28, 0x04, 0x32, 1]),
                            bytes.fromhex("01 00 00 00 00 00 32 00"),
                            bytes.fromhex("01 5a 15 04 00 00 00"), bytes.fromhex("01 01")])
    bt.update = BlindTilt.update.__get__(bt)
    run(bt.read_settings())
    assert sent(bt) == ["5702", "570f460100", "570f460402", "570f46040300"]
    assert bt.data["charge_status"] == "solar_full" and bt.data["solar_panel"] is True
    assert bt.data["motor_mode"] == "quiet" and bt.data["move_state"] == "stopped"
