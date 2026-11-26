"""Lock history records: read with ``57 00 14 05``.

Record (status byte first): 1-4 Unix seconds, 5 sequence within the second
(higher = earlier), 6 type (1 lock, 2 unlock, 4 alarm, 5 work mode),
7 control source (alarm flags for type 4), 8 result flags, 9 key id of the
paired accessory, 10 keypad credential type, 11 credential slot.
"""

from __future__ import annotations

from ...core.history import Record

READ_NEXT = "57001405"

LOCK_TYPE_LOCK, LOCK_TYPE_UNLOCK, LOCK_TYPE_ALARM, LOCK_TYPE_WORK_MODE = 1, 2, 4, 5

LOCK_SOURCES = {  # control source names as the app shows them
    1: "app", 2: "widget", 3: "apple_watch", 4: "scene", 5: "nfc_tag", 6: "open_api",
    7: "remote", 8: "alexa", 9: "google", 10: "smart", 11: "ifttt", 12: "matter",
    13: "siri", 14: "key", 15: "keypad", 16: "manual", 17: "android_watch",
    18: "auto_lock", 19: "force_auto_lock", 20: "emergency", 21: "contact_sensor",
    22: "key", 23: "geofence", 24: "remote_with_screen", 25: "auto_lock_after_unlock",
    32: "hub_3", 33: "climate_panel",
}
SOURCE_KEYPAD, SOURCE_EMERGENCY = 15, 20
LOCK_CREDENTIALS = {1: "passcode", 2: "nfc_card", 3: "fingerprint", 6: "face", 8: "palm_vein"}
LOCK_ALARMS = ((0x80, "door_left_open"), (0x40, "left_unlocked"),
               (0x20, "low_temperature"), (0x10, "low_power"))
WORK_MODES = {0: "standard", 1: "low_power", 2: "ble_gateway"}

LOCK_EVENT_TYPES = (
    "locked", "lock_failed", "half_locked", "latch_released", "latch_release_failed",
    "unlocked", "unlock_failed", "emergency_unlock", "door_left_open", "left_unlocked",
    "low_temperature", "low_power", "work_mode",
)


def parse_lock_record(pkt: bytes) -> Record | None:
    """One lock record; None for records the app ignores."""
    if len(pkt) < 9:
        return None
    kind, source, flags = pkt[6], pkt[7], pkt[8]
    record: Record = {
        "timestamp": int.from_bytes(pkt[1:5], "big"),
        "sequence": pkt[5],
        "raw": pkt[1:].hex(),
    }
    if kind in (LOCK_TYPE_LOCK, LOCK_TYPE_UNLOCK):
        group = bool(flags & 0x80)
        ok = not flags & 0x04 and not (group and flags & 0x01)
        record |= {
            "group": group,
            "emergency_power": bool(flags & 0x08) or (group and bool(flags & 0x02)),
            "source_code": source,
            "source": LOCK_SOURCES.get(source, "unknown"),
        }
        if len(pkt) >= 12:
            record["key_id"] = pkt[9]
            record["credential_id"] = pkt[11]
            if source == SOURCE_KEYPAD:
                record["credential"] = LOCK_CREDENTIALS.get(pkt[10], "keypad_button")
        if kind == LOCK_TYPE_UNLOCK:
            record["type"] = ("emergency_unlock" if source == SOURCE_EMERGENCY
                              else "unlocked" if ok else "unlock_failed")
        elif not group and flags & 0x40:
            record["type"] = "latch_released" if ok else "latch_release_failed"
        elif not group and flags & 0x20:
            record["type"] = "half_locked"
        else:
            record["type"] = "locked" if ok else "lock_failed"
        return record
    if kind == LOCK_TYPE_ALARM:
        name = next((name for bit, name in LOCK_ALARMS if source & bit), None)
        return record | {"type": name} if name else None
    if kind == LOCK_TYPE_WORK_MODE:
        return record | {"type": "work_mode", "mode": WORK_MODES.get(flags, flags)}
    return None
