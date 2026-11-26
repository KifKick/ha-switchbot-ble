"""Settings, calibration and history shared by Lock Pro and the Lock 2 family.

Settings are read with ``570f4f <sub>`` and written with ``570f4e <sub> …``
(the same sub-command and layout). Calibration steps are the app's Lock2 RN
plugin services; see docs/lockpro-calibration.md and docs/lock2-calibration.md.
History: lock_history.py (records) and core/history.py (reading).
"""

from __future__ import annotations

from collections.abc import Callable
import logging
from typing import Any, ClassVar

from ...core import history
from ...core.errors import OperationError
from . import lock_history
from .lock_base import READ, WRITE, CalibratedLock

_LOGGER = logging.getLogger(__name__)


BUTTON_ACTIONS = {0: "lock", 1: "unlock", 2: "toggle"}
BUTTON_TRIGGERS = {0: "single_press", 1: "double_press"}
MAX_TIMER_DELAY = 60 * 60 + 59  # minutes 0-60, seconds 0-59
# timer prefix -> sub-command
TIMERS = {"auto_lock": "0402", "force_auto_lock": "0403",
          "unclosed_alarm": "0501", "unlocked_alarm": "0502"}


type Parser = Callable[[bytes], dict[str, Any]]
type Reader = tuple[str, int, Parser]  # sub-command, minimum reply length, parser


def code_of(mapping: dict[int, str], value: str) -> int:
    for code, name in mapping.items():
        if name == value:
            return code
    raise ValueError(f"unknown option {value!r}")


def timer(prefix: str) -> Parser:
    def parse(r: bytes) -> dict[str, Any]:
        return {f"{prefix}_enabled": bool(r[1] & 0x80),
                f"{prefix}_delay": r[2] * 60 + (r[1] & 0x3F)}
    return parse


def basic_settings(r: bytes) -> dict[str, Any]:
    """0401: LED, sound, knob button."""
    return {
        "led_enabled": bool(r[1] & 0x80),
        "sound_enabled": bool(r[1] & 0x40),
        "button_enabled": bool(r[1] & 0x08),
        "button_trigger": BUTTON_TRIGGERS[(r[1] & 0x04) >> 2],
        "button_action": BUTTON_ACTIONS.get(r[1] & 0x03),
    }


def auto_lock_pause(r: bytes) -> dict[str, Any]:
    return {"auto_lock_paused": bool(r[1] & 0x80)}


TIMER_READERS: tuple[Reader, ...] = (
    ("0402", 3, timer("auto_lock")),
    ("0403", 3, timer("force_auto_lock")),
    ("0404", 2, auto_lock_pause),
    ("0501", 3, timer("unclosed_alarm")),
    ("0502", 3, timer("unlocked_alarm")),
)


class ExtendedLock(CalibratedLock):
    """A lock with settings, calibration and history."""

    readers: ClassVar[tuple[Reader, ...]]
    # 0401 writes of the Lock 2 family end with the motor speed byte (FF = keep)
    speed_hold: ClassVar[str] = ""

    # --- settings ------------------------------------------------------------------------

    async def update_settings(self) -> dict[str, Any]:
        """Read every setting; a read the firmware rejects is skipped."""
        settings: dict[str, Any] = {}
        for sub, min_length, parse in self.readers:
            try:
                reply = await self.command(f"{READ}{sub}", f"reading {sub}", min_length=min_length)
                settings |= parse(reply)
            except (OperationError, IndexError, KeyError, ValueError) as err:
                _LOGGER.debug("%s: %s", self.name, err)
        self.merge(settings)
        return settings

    async def write_setting(self, payload: str, updates: dict[str, Any]) -> None:
        """``570f4e <payload>``, then merge ``updates``."""
        await self.command(f"{WRITE}{payload}", f"setting {payload}")
        self.merge(updates)

    async def set_led(self, enabled: bool) -> None:
        await self.write_setting(f"04010080{0x80 if enabled else 0:02x}{self.speed_hold}",
                                 {"led_enabled": enabled})

    async def set_sound(self, enabled: bool) -> None:
        await self.write_setting(f"04010040{0x40 if enabled else 0:02x}{self.speed_hold}",
                                 {"sound_enabled": enabled})

    async def set_button(self, enabled: bool | None = None, trigger: str | None = None,
                         action: str | None = None) -> None:
        """The knob button; what is not given keeps its current value."""
        enabled = self.data.get("button_enabled", True) if enabled is None else enabled
        trigger = trigger or self.data.get("button_trigger") or "single_press"
        action = action or self.data.get("button_action") or "lock"
        bits = 0x08 | code_of(BUTTON_TRIGGERS, trigger) << 2 | code_of(BUTTON_ACTIONS, action)
        payload = f"0401000e{bits:02x}" if enabled else "0401000800"
        await self.write_setting(payload + self.speed_hold, {
            "button_enabled": enabled, "button_trigger": trigger, "button_action": action,
        })

    async def set_timer(self, prefix: str, enabled: bool | None = None,
                        delay: int | None = None) -> None:
        """Auto-lock, force auto-lock and the two alarms: on / off and delay in s."""
        if prefix not in TIMERS:
            raise ValueError(f"unknown timer {prefix}")
        enabled = self.data.get(f"{prefix}_enabled", False) if enabled is None else enabled
        delay = int(self.data.get(f"{prefix}_delay", 0) if delay is None else delay)
        if not 0 <= delay <= MAX_TIMER_DELAY:
            raise ValueError(f"delay {delay} s out of range")
        minutes, seconds = divmod(delay, 60)
        await self.write_setting(
            f"{TIMERS[prefix]}00{(0x80 if enabled else 0) | seconds:02x}{minutes:02x}",
            {f"{prefix}_enabled": enabled, f"{prefix}_delay": delay},
        )

    async def set_auto_lock_paused(self, paused: bool) -> None:
        await self.write_setting(f"040400{0x80 if paused else 0:02x}",
                                 {"auto_lock_paused": paused})

    # --- history -------------------------------------------------------------

    async def get_log_records(self, after_key: int | None = None,
                              max_records: int = 10) -> list[history.Record]:
        return await history.read_records(
            self, lock_history.READ_NEXT, lock_history.parse_lock_record, after_key, max_records
        )
