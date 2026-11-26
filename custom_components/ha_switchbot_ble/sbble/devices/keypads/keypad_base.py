"""What Keypad and Keypad Touch share: settings, alarms, passcodes, NFC cards, history.

The app talks to the keypad directly, encrypted like a lock with the keypad's
own key (docs/keypad.md). Commands before encryption:

* ``5702``                          basic info and settings
* ``57000501 00000000 <u32>``       set the UTC time (seconds)
* ``57000502 <h+12> <m>``           set the time zone
* ``570f5201 01..07``               settings and alarm actions
* ``570f5202 01/02/03/05``          passcodes: periodic add, add, validity, delete
* ``570f5203 01/03/04/07``          NFC cards: enroll, validity, delete, confirm
* ``570f5301 00/06``                credential counts / enrollment status
* history, see keypad_history.py

Advertisement, manufacturer data:
mfr[6] event counter (changes with every event), mfr[7] bit 7 charging,
mfr[8] flags (0 lockout, 1 tamper, 2 duress), mfr[9] which credential.
"""

from __future__ import annotations

import logging
import re
import time
from typing import Any

from ...core import history
from ...core.device import EncryptedDevice
from ...core.errors import OperationError
from . import keypad_history

_LOGGER = logging.getLogger(__name__)

SET_UTC = "57000501"
SET_TIMEZONE = "57000502"
SETTING = "570f5201"
PASSCODE = "570f5202"
NFC = "570f5203"
COUNTS = "570f530100"
ENROLL_STATUS = "570f530106"

PASSCODE_RE = re.compile(r"^\d{6,12}$")
NO_END = 0xF4865700  # 2100-01-01, the app's "forever"
CHUNK = 11  # payload bytes per packet

PASSCODE_TYPES = {"permanent": 0, "time_limited": 1, "one_time": 2, "emergency": 3,
                  "periodic": 4}
NFC_TYPES = {"permanent": 0, "time_limited": 1, "emergency": 2}
LOCK_BUTTON_MODES = {1: "off", 2: "always", 3: "timed"}
BACKLIGHT_MODES = {1: "off", 2: "auto", 3: "on"}
BACKLIGHT_LEVEL_DEFAULT = {"off": 0, "auto": 1, "on": 5}
LOCKOUT_TARGETS = {"passcode": 1, "nfc": 2, "fingerprint": 3}
ENROLL_STATUSES = {0: "idle", 1: "success", 2: "failed", 3: "already_exists", 4: "timeout",
                   5: "not_dedicated_card"}
COUNT_KEYS = ("passcodes", "nfc_cards", "fingerprints", "duress_passcodes",
              "duress_fingerprints")


def parse_keypad(service: bytes | None, mfr: bytes | None) -> dict[str, Any]:
    if service is None or mfr is None or len(service) < 3 or len(mfr) < 7:
        return {"battery": None}
    data: dict[str, Any] = {"battery": service[2] & 0x7F, "event_counter": mfr[6]}
    if len(mfr) >= 10:
        flags, detail = mfr[8], mfr[9]
        lockout = bool(flags & 0x01)
        data |= {
            "battery_charging": bool(mfr[7] & 0x80),
            "lockout": lockout,
            "tamper_alarm": bool(flags & 0x02),
            "duress_alarm": bool(flags & 0x04),
            "passcode_locked_out": lockout and bool(detail & 0x10),
            "nfc_locked_out": lockout and bool(detail & 0x20),
            "fingerprint_locked_out": lockout and bool(detail & 0x40),
        }
    return data


def packets(header: str, payload: bytes) -> list[str]:
    """``payload`` in 11 byte chunks: header + (count << 4 | index) + chunk."""
    chunks = [payload[i : i + CHUNK] for i in range(0, len(payload), CHUNK)] or [b""]
    return [f"{header}{len(chunks) << 4 | i:02x}{c.hex()}" for i, c in enumerate(chunks)]


def weekday_mask(weekdays: list[int]) -> int:
    """0 = Monday … 6 = Sunday -> bit 0 Monday … bit 6 Sunday."""
    mask = 0
    for day in weekdays:
        if not 0 <= int(day) <= 6:
            raise ValueError(f"weekday {day} out of range 0-6")
        mask |= 1 << int(day)
    return mask


def _u32(value: float) -> str:
    return f"{int(value) & 0xFFFFFFFF:08x}"


def _digits(code: str) -> bytes:
    if not PASSCODE_RE.fullmatch(code):
        raise ValueError("passcode must be 6-12 digits")
    return bytes(int(ch) for ch in code)


def _code(mapping: dict[int, str], value: str) -> int:
    return next(k for k, v in mapping.items() if v == value)


class KeypadBase(EncryptedDevice):
    """Keypad / Keypad Touch."""

    parse = staticmethod(parse_keypad)

    @staticmethod
    def parse_basic_info(reply: bytes) -> dict[str, Any]:
        info: dict[str, Any] = {
            "battery": reply[1] & 0x7F,
            "firmware": reply[2] / 10.0,
            "supports_fingerprint": bool(reply[4]),
        }
        if len(reply) > 12:
            info |= {
                "lock_button_mode": LOCK_BUTTON_MODES.get(reply[5], "off"),
                "lock_button_time": int.from_bytes(reply[6:8], "big"),
                "keypad_enabled": reply[8] != 2,
                "tamper_alarm_enabled": reply[9] == 2,
                "backlight_mode": BACKLIGHT_MODES.get(reply[10], "auto"),
                "backlight_level": reply[11],
                "sound_enabled": reply[12] == 2,
            }
        if len(reply) > 14:
            info["battery_charging"] = bool(reply[14] & 0x06)
        return info

    async def read_basic_info(self) -> dict[str, Any]:
        reply = await self.command("5702", "reading settings", min_length=5)
        return self.parse_basic_info(reply)

    async def get_settings(self) -> dict[str, Any]:
        info = await self.read_basic_info()
        self.merge(info)
        return info

    # --- settings ------------------------------------------------------------------------

    async def set_lock_button(self, mode: str, seconds: int | None = None) -> None:
        payload = f"{_code(LOCK_BUTTON_MODES, mode):02x}"
        updates: dict[str, Any] = {"lock_button_mode": mode}
        if mode == "timed":
            seconds = int(seconds if seconds is not None
                          else self.data.get("lock_button_time") or 10)
            if not 1 <= seconds <= 0xFFFF:
                raise ValueError("lock button time out of range")
            payload += f"{seconds:04x}"
            updates["lock_button_time"] = seconds
        await self.command(f"{SETTING}01{payload}", "setting the lock button")
        self.merge(updates)

    async def set_keypad_enabled(self, enabled: bool) -> None:
        await self.command(f"{SETTING}02{1 if enabled else 2:02x}", "enabling the keypad")
        self.merge({"keypad_enabled": enabled})

    async def set_tamper_alarm(self, enabled: bool) -> None:
        await self.command(f"{SETTING}03{2 if enabled else 1:02x}", "setting the tamper alarm")
        self.merge({"tamper_alarm_enabled": enabled})

    async def clear_tamper_alarm(self) -> None:
        await self.command(f"{SETTING}0303", "clearing the tamper alarm")
        self.merge({"tamper_alarm": False})

    async def set_backlight_and_sound(self, mode: str | None = None, level: int | None = None,
                                      sound: bool | None = None) -> None:
        mode = mode or self.data.get("backlight_mode") or "auto"
        if level is None:
            level = (self.data.get("backlight_level", BACKLIGHT_LEVEL_DEFAULT[mode])
                     if mode == self.data.get("backlight_mode")
                     else BACKLIGHT_LEVEL_DEFAULT[mode])
        sound = self.data.get("sound_enabled", True) if sound is None else sound
        await self.command(
            f"{SETTING}04{_code(BACKLIGHT_MODES, mode):02x}{int(level) & 0xFF:02x}"
            f"{2 if sound else 1:02x}",
            "setting backlight and sound",
        )
        self.merge({"backlight_mode": mode, "backlight_level": int(level), "sound_enabled": sound})

    async def cancel_lockout(self, target: str) -> None:
        """Lift the lockout after too many wrong attempts (passcode / nfc / fingerprint)."""
        await self.command(f"{SETTING}05{LOCKOUT_TARGETS[target]:02x}", "cancelling the lockout")
        self.merge({f"{target}_locked_out": False})

    async def cancel_duress_alarm(self) -> None:
        await self.command(f"{SETTING}0601", "cancelling the duress alarm")
        self.merge({"duress_alarm": False})

    async def sync_time(self, now: int | None = None, utc_offset: int | None = None) -> None:
        """Set the clock (needed before time-limited credentials); ``utc_offset`` in s."""
        now = int(time.time()) if now is None else int(now)
        if utc_offset is None:
            utc_offset = int(time.localtime().tm_gmtoff)
        await self.command(f"{SET_UTC}00000000{_u32(now)}", "setting the time")
        hours, minutes = divmod(abs(utc_offset) // 60, 60)
        await self.set_time_zone(hours if utc_offset >= 0 else -hours, minutes)

    async def set_time_zone(self, hours: int, minutes: int) -> None:
        await self.command(f"{SET_TIMEZONE}{hours + 12:02x}{minutes:02x}", "setting the time zone")

    # --- credentials -----------------------------------------------------------------------

    async def get_credential_counts(self) -> dict[str, int]:
        reply = await self.command(COUNTS, "reading credential counts")
        counts = {k: reply[i + 1] for i, k in enumerate(COUNT_KEYS) if len(reply) > i + 1}
        self.merge({f"{k}_count": v for k, v in counts.items()})
        return counts

    async def add_passcode(self, code: str, kind: str = "permanent", start: int | None = None,
                           end: int | None = None, index: int | None = None) -> int:
        """Add (with ``index``: overwrite) a passcode; returns its slot.

        ``start`` / ``end`` in Unix seconds (UTC); default now … 2100-01-01.
        """
        if kind == "periodic":
            raise ValueError("use add_periodic_passcode for periodic codes")
        digits = _digits(code)
        start = int(time.time()) - 60 if start is None else int(start)
        end = NO_END if end is None else int(end)
        if end <= start:
            raise ValueError("end must be after start")
        head = bytes((0xFF if index is None else index, PASSCODE_TYPES[kind], len(digits)))
        reply = await self.commands(packets(f"{PASSCODE}02", head + digits), "adding a passcode")
        slot = index if index is not None else (reply[2] if len(reply) > 2 else None)
        if slot is None:
            raise OperationError(f"{self.name}: the keypad returned no slot")
        await self.set_passcode_validity(slot, start, end)
        return slot

    async def set_passcode_validity(self, index: int, start: int, end: int) -> None:
        await self.command(f"{PASSCODE}03{index:02x}{_u32(start)}{_u32(end)}",
                           "setting passcode validity")

    async def add_periodic_passcode(self, code: str, weekdays: list[int], begin_minute: int,
                                    end_minute: int, start: int | None = None,
                                    end: int | None = None) -> int:
        """Valid on ``weekdays`` (0 = Monday) between two times of day (keypad time,
        minutes after midnight; an end before the begin wraps past midnight)."""
        digits = _digits(code)
        if not (mask := weekday_mask(weekdays)):
            raise ValueError("select at least one weekday")
        if not (0 <= begin_minute < 1440 and 0 <= end_minute < 1440):
            raise ValueError("time of day out of range")
        duration = (end_minute - begin_minute) % 1440
        start = int(time.time()) - 60 if start is None else int(start)
        end = NO_END if not end else int(end)
        payload = (
            bytes((0x00, PASSCODE_TYPES["periodic"], len(digits))) + digits
            + start.to_bytes(4, "big") + end.to_bytes(4, "big")
            + bytes((mask, begin_minute // 60, begin_minute % 60)) + duration.to_bytes(2, "big")
        )
        reply = await self.commands(packets(f"{PASSCODE}01", payload), "adding a periodic passcode")
        if len(reply) < 3:
            raise OperationError(f"{self.name}: the keypad returned no slot")
        return reply[2]

    async def delete_passcode(self, index: int) -> None:
        await self.command(f"{PASSCODE}05{index:02x}", "deleting a passcode")

    async def nfc_start_enroll(self, kind: str = "permanent") -> int:
        """Enrollment mode; returns the temporary card slot."""
        reply = await self.command(f"{NFC}01{NFC_TYPES[kind]:02x}0201", "starting NFC enrollment",
                                   min_length=2)
        return reply[1]

    async def nfc_enroll_status(self) -> str:
        reply = await self.command(ENROLL_STATUS, "reading the enrollment status")
        return ENROLL_STATUSES.get(reply[2] if len(reply) > 2 else 0, "unknown")

    async def nfc_set_validity(self, index: int, start: int, end: int) -> None:
        await self.command(f"{NFC}03{index:02x}{_u32(start)}{_u32(end)}", "setting card validity")

    async def nfc_confirm(self, index: int) -> None:
        await self.command(f"{NFC}07{index:02x}", "confirming a card")

    async def nfc_delete(self, index: int) -> None:
        await self.command(f"{NFC}04{index:02x}", "deleting a card")

    async def get_log_records(self, after_key: int | None = None,
                              max_records: int = 20) -> list[history.Record]:
        return await history.read_records(
            self, keypad_history.READ_NEXT, keypad_history.parse_keypad_record, after_key, max_records,
            none_ends=True,
        )

