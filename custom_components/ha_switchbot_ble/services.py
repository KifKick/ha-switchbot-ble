"""Actions: add_password (Keypad Vision / Vision Pro)."""

from __future__ import annotations

from homeassistant.const import ATTR_DEVICE_ID
from homeassistant.core import HomeAssistant, ServiceCall, callback
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import config_validation as cv, service
import probatio as vol

from .const import DOMAIN
from .coordinator import SwitchbotConfigEntry
from .sbble.devices.keypads.keypad_vision_base import KeypadVisionBase

SCHEMA_ADD_PASSWORD = vol.Schema(
    {
        vol.Required(ATTR_DEVICE_ID): cv.string,
        vol.Required("password"): vol.All(cv.string, cv.matches_regex(r"^\d{6,12}$")),
    },
    extra=vol.ALLOW_EXTRA,
)


async def async_add_password(call: ServiceCall) -> None:
    entry: SwitchbotConfigEntry
    _, entry = service.async_get_device_and_config_entry(
        call.hass, DOMAIN, call.data[ATTR_DEVICE_ID]
    )
    device = entry.runtime_data.device
    if not isinstance(device, KeypadVisionBase):
        raise ServiceValidationError(
            translation_domain=DOMAIN, translation_key="not_keypad_vision_device"
        )
    await device.add_password(call.data["password"])


@callback
def async_setup_services(hass: HomeAssistant) -> None:
    hass.services.async_register(DOMAIN, "add_password", async_add_password,
                                 schema=SCHEMA_ADD_PASSWORD)
