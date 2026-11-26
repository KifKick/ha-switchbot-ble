"""Buttons from the catalog."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import Any, override

from homeassistant.components.button import ButtonEntity
from homeassistant.const import EntityCategory, Platform

from .entity import ButtonDesc, DescribedEntity, exception_handler, platform_setup

PARALLEL_UPDATES = 0


def refresh_button(uid: str, read: Callable[[Any], Awaitable[Any]]) -> ButtonDesc:
    """Re-read the settings over Bluetooth."""
    return ButtonDesc(key="refresh_settings", translation_key="refresh_settings", uid=uid,
                      entity_category=EntityCategory.DIAGNOSTIC, add="always", press_fn=read)


class DescribedButton(DescribedEntity, ButtonEntity):
    entity_description: ButtonDesc

    @exception_handler
    @override
    async def async_press(self) -> None:
        await self.entity_description.press_fn(self._device)


async_setup_entry = platform_setup(Platform.BUTTON, DescribedButton)
