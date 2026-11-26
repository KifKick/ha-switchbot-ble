"""Keypad history records: read with ``57 00 14 03``.

Record (status byte first): 3-6 Unix seconds, 7 sequence, 8 source, 9 action,
10 value (credential slot, 255 = unknown credential).
"""

from __future__ import annotations

from ...core.history import Record

READ_NEXT = "57001403"

KEYPAD_SOURCES = {1: "passcode", 2: "nfc", 3: "fingerprint", 4: "lock_button", 5: "alarm",
                  6: "face", 7: "doorbell", 8: "palm_vein"}
CREDENTIAL_SOURCES = {1, 2, 3, 6, 8}
SOURCE_PASSCODE, SOURCE_LOCK_BUTTON, SOURCE_ALARM, SOURCE_DOORBELL = 1, 4, 5, 7
TEST_PASSCODE_SLOT = 10
CREDENTIAL_ACTIONS = {0: "unlocked", 1: "unlock_failed", 2: "verification_failed",
                      3: "expired_credential"}
KEYPAD_ACTIONS = {
    SOURCE_LOCK_BUTTON: {0: "locked", 1: "lock_failed"},
    SOURCE_ALARM: {0: "low_battery", 1: "locked_out", 2: "tamper"},
    SOURCE_DOORBELL: {0: "doorbell", 1: "doorbell_scene"},
}
LOCKOUT_CREDENTIALS = {1: "passcode", 2: "nfc", 3: "fingerprint"}

KEYPAD_EVENT_TYPES = (
    "unlocked", "unlock_failed", "verification_failed", "expired_credential", "locked",
    "lock_failed", "low_battery", "locked_out", "tamper", "doorbell", "doorbell_scene",
    "unknown",
)


def parse_keypad_record(pkt: bytes) -> Record | None:
    """One keypad record; None ends the read (empty / FF FF FF slot)."""
    if len(pkt) < 11 or not any(pkt[3:]):
        return None
    source, action, value = pkt[8], pkt[9], pkt[10]
    if (source, action, value) == (0xFF, 0xFF, 0xFF):
        return None
    record: Record = {
        "timestamp": int.from_bytes(pkt[3:7], "big"),
        "sequence": pkt[7],
        "source": KEYPAD_SOURCES.get(source, "unknown"),
        "source_code": source,
        "action_code": action,
        "value": value,
        "raw": pkt[1:].hex(),
    }
    if source in CREDENTIAL_SOURCES:
        record["type"] = CREDENTIAL_ACTIONS.get(action, "unknown")
        if value == 255:
            record |= {"credential_id": None, "unknown_credential": True}
        else:
            record["credential_id"] = value
            if source == SOURCE_PASSCODE and value == TEST_PASSCODE_SLOT:
                record["test_code"] = True
        return record
    record["type"] = KEYPAD_ACTIONS.get(source, {}).get(action, "unknown")
    if source == SOURCE_ALARM and action == 1:
        record["locked_out_credential"] = LOCKOUT_CREDENTIALS.get(value)
    return record
