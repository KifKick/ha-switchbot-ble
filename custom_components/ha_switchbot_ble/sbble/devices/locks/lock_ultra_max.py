"""Lock Ultra Max (W1155000): the Lock 2 set plus voice.

It adds the beep and voice volume, the voice language and
weather announcements.
"""

from __future__ import annotations

from typing import Any

from ...core.advertisement import device
from ...core.const import Model
from .lock2 import Lock2
from .lock_extended import Reader, code_of

VOICE_LANGUAGES = {1: "german", 2: "english", 3: "french", 4: "italian"}
WEATHER_MODES = {1: "always", 2: "scheduled", 3: "off"}
VOLUME_TYPES = {"beep_volume": 1, "voice_volume": 2}
VOLUME_RANGE = (0, 4)


def volume(r: bytes) -> dict[str, Any]:
    return {"voice_volume": r[1] & 0x0F, "beep_volume": r[2] & 0x0F}


def language(r: bytes) -> dict[str, Any]:
    return {"voice_language": VOICE_LANGUAGES.get(r[1])}


def weather(r: bytes) -> dict[str, Any]:
    return {"weather_announcement": WEATHER_MODES.get(r[1])}


@device("Lock Ultra Max", b"\x00\x11\x9f\xb8", b"\x01\x11\x9f\xb8")
class LockUltraMax(Lock2):
    model = Model.LOCK_ULTRA_MAX

    @property
    def readers(self) -> tuple[Reader, ...]:  # type: ignore[override]
        return (*super().readers,
                ("041401", 3, volume), ("041402", 2, language), ("041502", 2, weather))

    async def read_basic_info(self) -> dict[str, Any]:
        # the 5702 reply layout is unknown; the advertisement has battery and state
        await super().read_basic_info()
        return {}

    async def set_volume(self, kind: str, value: int) -> None:
        """``kind`` beep_volume / voice_volume, 0-4."""
        lo, hi = VOLUME_RANGE
        if not lo <= int(value) <= hi:
            raise ValueError(f"volume {value} out of range {lo}-{hi}")
        await self.write_setting(f"041401{int(value):02x}{VOLUME_TYPES[kind]:02x}",
                                 {kind: int(value)})

    async def set_voice_language(self, language: str) -> None:
        await self.write_setting(f"041402{code_of(VOICE_LANGUAGES, language):02x}",
                                 {"voice_language": language})

    async def set_weather_announcement(self, mode: str) -> None:
        await self.write_setting(f"041502{code_of(WEATHER_MODES, mode):02x}",
                                 {"weather_announcement": mode})
