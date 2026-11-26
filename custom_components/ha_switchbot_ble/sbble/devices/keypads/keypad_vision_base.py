"""What Keypad Vision and Keypad Vision Pro share (encrypted like a lock).

Advertisement, manufacturer data (13+ bytes): 6 sequence number (changes with
every event), 7 bit 7 charging / bits 0-6 battery, 8 bit 0 lockout, bit 1
tamper, bit 2 duress, bit 6 high / bit 7 low temperature, 12 bit 3 doorbell,
bits 0-2 doorbell counter; 13 the motion sensor (per model).

``5702`` basic info: 1 battery, 2 firmware, 9 tamper alarm on, 11 backlight
level, 14 charging bits (per model). Passcodes are added like on the Keypad
(``570f5202 02``, payload ``FF 00 <length> <digits>``).
"""

from __future__ import annotations

import logging
from typing import Any, ClassVar

from ...core.device import EncryptedDevice
from .keypad_base import PASSCODE, PASSCODE_RE, packets

_LOGGER = logging.getLogger(__name__)


def parse_vision_common(mfr: bytes | None) -> dict[str, Any]:
    if mfr is None or len(mfr) < 14:
        return {}
    return {
        "sequence_number": mfr[6],
        "battery_charging": bool(mfr[7] & 0x80),
        "battery": mfr[7] & 0x7F,
        "lockout_alarm": bool(mfr[8] & 0x01),
        "tamper_alarm": bool(mfr[8] & 0x02),
        "duress_alarm": bool(mfr[8] & 0x04),
        "low_temperature": bool(mfr[8] & 0x80),
        "high_temperature": bool(mfr[8] & 0x40),
        "doorbell": bool(mfr[12] & 0x08),
        "doorbell_seq": mfr[12] & 0x07,
    }


class KeypadVisionBase(EncryptedDevice):
    """Keypad Vision / Vision Pro."""

    refresh_on_sequence = True

    charging_mask: ClassVar[int]  # basic info byte 14


    async def read_basic_info(self) -> dict[str, Any]:
        r = await self.command("5702", "reading basic info", min_length=15)
        return {
            "battery": r[1] & 0x7F,
            "firmware": r[2] / 10.0,
            "tamper_alarm_enabled": bool(r[9]),
            "backlight_level": r[11],
            "battery_charging": bool(r[14] & self.charging_mask),
        }

    async def add_password(self, password: str) -> bool:
        """Add a permanent passcode (6-12 digits); False when the keypad refuses."""
        if not PASSCODE_RE.fullmatch(password):
            raise ValueError("Password must be 6-12 digits.")
        digits = bytes(int(ch) for ch in password)
        for packet in packets(f"{PASSCODE}02", bytes((0xFF, 0x00, len(digits))) + digits):
            if (await self.request(packet))[:1] != b"\x01":
                return False
        return True
