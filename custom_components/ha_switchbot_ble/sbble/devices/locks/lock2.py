"""Lock 2 family: what Lock Ultra and Lock Ultra Max share.

On top of the Lock Pro set: motor speed, half lock, quick unlock, the EU
button, night mode, drive force, a backup battery and auto calibration.
"""

from __future__ import annotations

from typing import Any, ClassVar

from .lock_base import CALIBRATION, knob_angle, parse_lock2, status_modern
from .lock_extended import (
    TIMER_READERS,
    ExtendedLock,
    Reader,
    basic_settings,
    code_of,
)

MOTOR_SPEEDS = {0: "fast", 1: "normal", 2: "quiet"}
QUICK_UNLOCK_MODES = {0: "full_unlock", 1: "unlatch_only"}
NIGHT_LOCK_POSITIONS = {0: "full_lock", 1: "half_lock"}
EU_BUTTON_ACTIONS = {0x00: "lock", 0x01: "unlock_to_open", 0x02: "toggle_open",
                     0x03: "toggle_unlatch", 0x04: "unlatch", 0x05: "relock_after_unlock",
                     0x0F: "none"}
EU_RELOCK_DELAY_RANGE = (5, 60)

DRIVE_FORCE_GENTLE = bytes.fromhex("028a000a")
DRIVE_FORCE_STANDARD_V31 = bytes.fromhex("03520032")
DRIVE_FORCE_MAX = bytes.fromhex("ffffffff")

READ_NIGHT_MODE = "570f4f0700"
CALIBRATION_LATCH = "0407ffff"  # + 00 / 01: the lock has a latch

LOCK2_CALIBRATION = CALIBRATION | {
    "auto_record_unlocked": "03070001",  # record unlocked, drive to locked
    "auto_record_locked": "03070002",  # record locked, drive back
    "half_lock_set_and_test": "040c0101",  # set the half-lock position and test it
    "half_lock_start": "040c02",  # enter half-lock calibration
    "half_lock_complete": "040c03",  # leave half-lock calibration
}


def status_lock2(d: bytes) -> dict[str, Any]:
    """0f4f8107 status."""
    return status_modern(d) | knob_angle(d) | {
        "door_status_source": (d[1] & 0xC0) >> 6,
        "on_backup_battery": bool(d[1] & 0x02),
        "battery_charging": bool(d[2] & 0x80),
        "rotation_direction": (d[3] & 0x08) >> 3,
        "night_mode_active": bool(d[3] & 0x04),
        "power_alarm": bool(d[3] & 0x02),
        "half_lock_enabled": bool(d[3] & 0x01),
        "lock_type": d[4] & 0x3F,
        "latch_state": (d[4] & 0xC0) >> 6,
        "half_lock_calibration_done": bool(d[5] & 0x20),
        "auto_calibration_done": bool(d[5] & 0x10),
        "magnetic_position_alarm": bool(d[5] & 0x08),
        "battery_status": d[5] & 0x07,
    }


def _clock(hour: int, minute: int) -> str | None:
    """HH:MM, None for the FF FF of an unset time."""
    return None if hour > 23 or minute > 59 else f"{hour:02d}:{minute:02d}"


def basic_settings_lock2(r: bytes) -> dict[str, Any]:
    data = basic_settings(r)
    if len(r) > 3:
        data["motor_speed"] = MOTOR_SPEEDS.get(r[3] & 0x03)
    if len(r) > 5:
        data["half_lock_enabled"] = bool(r[5] & 0x40)
    return data


def backup_battery(r: bytes) -> dict[str, Any]:
    return {"on_backup_battery": bool(r[1] & 0x80), "backup_battery": r[2]}


def quick_unlock(r: bytes) -> dict[str, Any]:
    return {"quick_unlock_mode": QUICK_UNLOCK_MODES.get(r[1])}


def eu_button(r: bytes) -> dict[str, Any]:
    return {
        "eu_button_single_action": EU_BUTTON_ACTIONS.get(r[2]),
        "eu_button_double_action": EU_BUTTON_ACTIONS.get(r[3]),
        "eu_button_relock_delay": r[4],
    }


def night_mode(r: bytes) -> dict[str, Any]:
    info = r[1]
    return {
        "night_mode_enabled": bool(info & 0x02),
        "night_mode_start": _clock(r[2], r[3]),
        "night_mode_end": _clock(r[4], r[5]),
        "night_lock_at_start": bool(info & 0x80),
        "night_disable_auto_unlock": not info & 0x40,
        "night_auto_lock_enabled": bool(info & 0x20),
        "night_auto_lock_delay": r[7] * 60 + r[6],
        "night_motor_speed": MOTOR_SPEEDS.get((info & 0x18) >> 3),
        "night_sound_enabled": bool(info & 0x04),
        "night_lock_position": NIGHT_LOCK_POSITIONS.get(info & 0x01),
    }


class Lock2(ExtendedLock):
    """Lock Ultra / Lock Ultra Max."""

    info: ClassVar[int] = 0x07
    parse = staticmethod(parse_lock2)
    parse_status = staticmethod(status_lock2)
    calibration_steps = LOCK2_CALIBRATION
    speed_hold = "ff"

    @property
    def readers(self) -> tuple[Reader, ...]:  # type: ignore[override]
        return (
            ("0401", 2, basic_settings_lock2),
            *TIMER_READERS,
            ("0409", 3, backup_battery),
            ("040f", 5, self._drive_force),  # depends on the firmware
            ("0413", 2, quick_unlock),
            ("0412", 5, eu_button),
            ("0700", 8, night_mode),
        )

    def _drive_force(self, r: bytes) -> dict[str, Any]:
        value = bytes(r[1:5])
        firmware = self.data.get("firmware")
        new_firmware = firmware is not None and firmware >= 3.1
        if value == DRIVE_FORCE_GENTLE:
            force = "gentle"
        elif new_firmware and value == DRIVE_FORCE_STANDARD_V31:
            force = "standard"
        elif value == DRIVE_FORCE_MAX:
            force = "strong" if new_firmware else "standard"
        else:
            force = None
        return {"drive_force": force, "drive_force_raw": value.hex()}

    async def set_motor_speed(self, speed: str) -> None:
        await self.write_setting(f"0401000000{code_of(MOTOR_SPEEDS, speed):02x}",
                                 {"motor_speed": speed})

    async def set_half_lock_enabled(self, enabled: bool) -> None:
        await self.write_setting(f"040c00{1 if enabled else 0:02x}", {"half_lock_enabled": enabled})

    async def set_quick_unlock_mode(self, mode: str) -> None:
        await self.write_setting(f"0413{code_of(QUICK_UNLOCK_MODES, mode):02x}",
                                 {"quick_unlock_mode": mode})

    async def set_eu_button(self, single: str | None = None, double: str | None = None,
                            relock_delay: int | None = None) -> None:
        single = single or self.data.get("eu_button_single_action") or "lock"
        double = double or self.data.get("eu_button_double_action") or "none"
        delay = self.data.get("eu_button_relock_delay") if relock_delay is None else relock_delay
        lo, hi = EU_RELOCK_DELAY_RANGE
        delay_byte = 0xFF if delay is None else max(lo, min(hi, int(delay)))
        await self.write_setting(
            f"04120011{code_of(EU_BUTTON_ACTIONS, single):02x}"
            f"{code_of(EU_BUTTON_ACTIONS, double):02x}{delay_byte:02x}",
            {"eu_button_single_action": single, "eu_button_double_action": double,
             "eu_button_relock_delay": delay if delay_byte == 0xFF else delay_byte},
        )

    async def set_night_mode_enabled(self, enabled: bool) -> None:
        """Night mode on / off; times and options are written back unchanged."""
        reply = await self.command(READ_NIGHT_MODE, "reading night mode", min_length=8)
        block = bytearray(reply[1:8])
        block[0] = (block[0] & ~0x02 & 0xFF) | (0x02 if enabled else 0)
        await self.write_setting("0700" + block.hex(), night_mode(b"\x01" + bytes(block)))

    async def set_calibration_latch(self, has_latch: bool) -> bool:
        """Tell an EU lock whether it has a latch, before auto calibration."""
        reply = await self.request(f"570f4e{CALIBRATION_LATCH}{1 if has_latch else 0:02x}")
        return bool(reply) and reply[0] in {0x01, 0x06, 0x0E}
