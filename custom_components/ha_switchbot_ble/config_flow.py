"""Config flow: Bluetooth discovery, encryption keys (OAuth, account login or manual),
import from core."""

from __future__ import annotations

from collections.abc import Awaitable
import logging
from typing import Any, Literal, override

from homeassistant.components import bluetooth
from homeassistant.components.application_credentials import (
    ClientCredential,
    async_import_client_credential,
)
from homeassistant.components.bluetooth import (
    BluetoothServiceInfoBleak,
    async_discovered_service_info,
)
from homeassistant.config_entries import ConfigEntry, ConfigFlowResult, OptionsFlow
from homeassistant.const import (
    CONF_ACCESS_TOKEN,
    CONF_ADDRESS,
    CONF_PASSWORD,
    CONF_SENSOR_TYPE,
    CONF_TOKEN,
    CONF_USERNAME,
)
from homeassistant.core import callback
from homeassistant.data_entry_flow import AbortFlow
from homeassistant.helpers import config_entry_oauth2_flow, selector
from homeassistant.helpers.aiohttp_client import async_get_clientsession
import probatio as vol

from .catalog import BY_MODEL, ENCRYPTED_MODELS, MODELS, PASSIVE_MODELS, needs_connection
from .const import (
    CONF_CURTAIN_SPEED,
    CONF_ENCRYPTION_KEY,
    CONF_KEY_ID,
    CONF_LOCK_NIGHTLATCH,
    CONF_RETRY_COUNT,
    CURTAIN_SPEEDS,
    DEFAULT_CURTAIN_SPEED,
    DEFAULT_LOCK_NIGHTLATCH,
    DEFAULT_RETRY_COUNT,
    DOMAIN,
    OAUTH_CLIENT_ID,
    curtain_speed_option,
)
from .migration import CONF_IMPORT_FROM, importable_core_entries
from .sbble import (
    AccountConnectionError,
    Advertisement,
    ApiError,
    AuthenticationError,
    EncryptedDevice,
    parse as parse_advertisement,
)
from .sbble.core.cloud import Account

_LOGGER = logging.getLogger(__name__)

OPTION_DEFAULTS = {
    CONF_LOCK_NIGHTLATCH: DEFAULT_LOCK_NIGHTLATCH,
    CONF_CURTAIN_SPEED: DEFAULT_CURTAIN_SPEED,
}
OPTION_SCHEMAS = {
    CONF_LOCK_NIGHTLATCH: bool,
    CONF_CURTAIN_SPEED: selector.SelectSelector(
        selector.SelectSelectorConfig(options=list(CURTAIN_SPEEDS), translation_key="curtain_speed",
                                      mode=selector.SelectSelectorMode.DROPDOWN)
    ),
}


def format_unique_id(address: str) -> str:
    return address.replace(":", "").lower()


def short_address(address: str) -> str:
    parts = address.replace("-", ":").split(":")
    return f"{parts[-2].upper()}{parts[-1].upper()}"[-4:]


def name_from_discovery(discovery: Advertisement) -> str:
    return f"{discovery.name} {short_address(discovery.address)}"


async def verify_key(adv: Advertisement, key_id: str, encryption_key: str) -> bool:
    """True when the device answers with this key pair."""
    cls = BY_MODEL[adv.model].device_cls
    assert issubclass(cls, EncryptedDevice)
    try:
        device = cls(adv.ble_device, key_id=key_id, encryption_key=encryption_key)
    except ValueError:
        return False
    try:
        return await device.verify_key()
    except Exception:  # any failure: the key is not usable
        _LOGGER.debug("%s: verifying the key failed", adv.address, exc_info=True)
        return False
    finally:
        await device.disconnect()


def _credentials_schema(username: str | None = None) -> vol.Schema:
    return vol.Schema({
        vol.Required(CONF_USERNAME, default=username): str,
        vol.Required(vol.Secret(CONF_PASSWORD)): str,
    })


class SwitchbotConfigFlow(config_entry_oauth2_flow.AbstractOAuth2FlowHandler, domain=DOMAIN):
    DOMAIN = DOMAIN
    VERSION = 2
    MINOR_VERSION = 1

    @staticmethod
    @callback
    @override
    def async_get_options_flow(config_entry: ConfigEntry) -> SwitchbotOptionsFlow:
        return SwitchbotOptionsFlow()

    def __init__(self) -> None:
        super().__init__()
        self._adv: Advertisement | None = None
        self._advs: dict[str, Advertisement] = {}
        self._cloud: dict[str, str] | None = None  # credentials for this flow only
        self._token: str | None = None  # OAuth access token for this flow only
        self._oauth_next: Literal["select_device", "encrypted_key"] = "select_device"
        self._method_chosen = False

    @property
    @override
    def logger(self) -> logging.Logger:
        return _LOGGER

    # --- the device to add ----------------------------------------------------------

    async def _async_next_step(self, adv: Advertisement, *, confirm: bool) -> ConfigFlowResult:
        """Ask for what the device needs: encryption key, password or nothing."""
        self._adv = adv
        if adv.model in ENCRYPTED_MODELS:
            return await self.async_step_encrypted_choose_method()
        if adv.password:
            return await self.async_step_password()
        return await (self.async_step_confirm() if confirm else self._async_create(None))

    async def _async_set_device(self, adv: Advertisement) -> None:
        await self.async_set_unique_id(format_unique_id(adv.address), raise_on_progress=False)
        self._abort_if_unique_id_configured()

    async def _async_create(self, user_input: dict[str, Any] | None) -> ConfigFlowResult:
        assert self._adv is not None
        spec = BY_MODEL[self._adv.model]
        return self.async_create_entry(
            title=name_from_discovery(self._adv),
            data={**(user_input or {}), CONF_ADDRESS: self._adv.address, CONF_SENSOR_TYPE: spec.type},
            options={CONF_RETRY_COUNT: DEFAULT_RETRY_COUNT}
            | {k: OPTION_DEFAULTS[k] for k in spec.options if k == CONF_CURTAIN_SPEED},
        )

    def _show(self, step_id: str, schema: vol.Schema, errors: dict | None = None,
              **placeholders: str) -> ConfigFlowResult:
        assert self._adv is not None
        return self.async_show_form(
            step_id=step_id, data_schema=schema, errors=errors or {},
            description_placeholders={"name": name_from_discovery(self._adv), **placeholders},
        )

    # --- discovery --------------------------------------------------------------------

    @override
    async def async_step_bluetooth(self, discovery_info: BluetoothServiceInfoBleak) -> ConfigFlowResult:
        await self.async_set_unique_id(format_unique_id(discovery_info.address))
        self._abort_if_unique_id_configured()
        parsed = parse_advertisement(discovery_info.device, discovery_info.advertisement)
        model = parsed.model if parsed else None
        if model not in BY_MODEL or (not discovery_info.connectable and needs_connection(model)):
            return self.async_abort(reason="not_supported")
        self.context["title_placeholders"] = {
            "name": parsed.name,
            "address": short_address(discovery_info.address),
        }
        return await self._async_next_step(parsed, confirm=True)

    async def async_step_confirm(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is not None:
            return await self._async_create(user_input)
        return self._show("confirm", vol.Schema({}))

    async def async_step_password(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        # the password cannot be checked without operating the device
        if user_input is not None:
            return await self._async_create(user_input)
        return self._show("password", vol.Schema({vol.Required(vol.Secret(CONF_PASSWORD)): str}))

    # --- encrypted devices: key from the SwitchBot account or typed in -----------------

    async def async_step_encrypted_choose_method(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        assert self._adv is not None
        self._method_chosen = True
        return self.async_show_menu(
            step_id="encrypted_choose_method",
            menu_options=["encrypted_oauth", "encrypted_auth", "encrypted_key"],
            description_placeholders={"name": name_from_discovery(self._adv)},
        )

    async def _async_cloud(self, call: Awaitable[Any]) -> tuple[Any, dict[str, str], dict[str, str]]:
        """Run a SwitchBot account request: (result, errors, placeholders)."""
        try:
            return await call, {}, {}
        except (ApiError, AccountConnectionError) as ex:
            raise AbortFlow("api_error", description_placeholders={"error_detail": str(ex)}) from ex
        except AuthenticationError as ex:
            self._cloud = None
            return None, {"base": "auth_failed"}, {"error_detail": str(ex)}
        except Exception:
            _LOGGER.exception("Unexpected error talking to the SwitchBot account")
            return None, {"base": "unknown"}, {}

    async def async_step_encrypted_auth(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        assert self._adv is not None
        if user_input is None:
            if not self._method_chosen and not self._cloud:
                return await self.async_step_encrypted_choose_method()
            self._method_chosen = False
            user_input = self._cloud  # credentials from the cloud login, if any
        errors: dict[str, str] = {}
        placeholders: dict[str, str] = {}
        if user_input is not None:
            key, errors, placeholders = await self._async_cloud(self._async_key(
                Account.login(async_get_clientsession(self.hass),
                                            user_input[CONF_USERNAME], user_input[CONF_PASSWORD]),
            ))
            if not errors:
                return await self.async_step_encrypted_key(key)
        return self._show("encrypted_auth", _credentials_schema((user_input or {}).get(CONF_USERNAME)),
                          errors, **placeholders)

    async def async_step_encrypted_oauth(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if self._token is None:
            return await self._async_start_oauth("encrypted_key")
        return await self._async_key_by_token()

    async def _async_key_by_token(self) -> ConfigFlowResult:
        assert self._adv is not None and self._token is not None
        key, errors, _ = await self._async_cloud(self._async_key(
            Account(async_get_clientsession(self.hass), self._token),
        ))
        if errors:
            return self.async_abort(reason="oauth_unauthorized")
        return await self.async_step_encrypted_key(key)

    async def _async_key(self, account: Account | Awaitable[Account]) -> dict[str, str]:
        """The device's key pair from the account (signed in, or signing in now)."""
        assert self._adv is not None
        if not isinstance(account, Account):
            account = await account
        return await account.encryption_key(self._adv.address)

    # --- OAuth (application_credentials.py) --------------------------------------------

    async def _async_start_oauth(self, then: Literal["select_device", "encrypted_key"]) -> ConfigFlowResult:
        self._oauth_next = then
        await async_import_client_credential(
            self.hass, DOMAIN, ClientCredential(OAUTH_CLIENT_ID, "", name="SwitchBot")
        )
        return await self.async_step_pick_implementation()

    async def async_step_oauth_login(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        return await self._async_start_oauth("select_device")

    @override
    async def async_oauth_create_entry(self, data: dict[str, Any]) -> ConfigFlowResult:
        """Signed in: continue the device setup (the token is not stored)."""
        token = data[CONF_TOKEN].get(CONF_ACCESS_TOKEN)
        if not isinstance(token, str) or not token:
            return self.async_abort(reason="oauth_error")
        self._token = token
        if self._oauth_next == "encrypted_key":
            return await self._async_key_by_token()
        _, errors, _ = await self._async_cloud(
            Account(async_get_clientsession(self.hass), token).devices()
        )
        if errors:
            return self.async_abort(reason="oauth_unauthorized")
        return await self.async_step_select_device()

    async def async_step_encrypted_key(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        assert self._adv is not None
        if user_input is None and not self._method_chosen:
            return await self.async_step_encrypted_choose_method()
        self._method_chosen = False
        errors: dict[str, str] = {}
        if user_input is not None:
            if await verify_key(self._adv, user_input[CONF_KEY_ID],
                                user_input[CONF_ENCRYPTION_KEY]):
                return await self._async_create(user_input)
            errors = {"base": "encryption_key_invalid"}
        return self._show("encrypted_key", vol.Schema({
            vol.Required(CONF_KEY_ID): str,
            vol.Required(vol.Secret(CONF_ENCRYPTION_KEY)): str,
        }), errors)

    # --- user: cloud login, pick a device, or import from the core integration ----------

    @override
    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        menu = ["oauth_login", "cloud_login", "select_device"]
        if importable_core_entries(self.hass):
            menu.append("import_core")
        return self.async_show_menu(step_id="user", menu_options=menu)

    async def async_step_cloud_login(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        errors: dict[str, str] = {}
        placeholders: dict[str, str] = {}
        if user_input is not None:
            _, errors, placeholders = await self._async_cloud(self._async_devices(
                user_input[CONF_USERNAME], user_input[CONF_PASSWORD]))
            if not errors:
                self._cloud = {k: user_input[k] for k in (CONF_USERNAME, CONF_PASSWORD)}
                return await self.async_step_select_device()
        return self.async_show_form(
            step_id="cloud_login", errors=errors, description_placeholders=placeholders,
            data_schema=_credentials_schema((user_input or {}).get(CONF_USERNAME)),
        )

    async def _async_devices(self, username: str, password: str) -> dict:
        account = await Account.login(async_get_clientsession(self.hass), username, password)
        return await account.devices()

    @callback
    def _async_discover_devices(self) -> None:
        configured = self._async_current_ids(include_ignore=False)
        for connectable in (True, False):
            for info in async_discovered_service_info(self.hass, connectable):
                if format_unique_id(info.address) in configured or info.address in self._advs:
                    continue
                parsed = parse_advertisement(info.device, info.advertisement)
                model = parsed.model if parsed else None
                if model in BY_MODEL and (info.connectable or model in PASSIVE_MODELS):
                    self._advs[info.address] = parsed
        if not self._advs:
            raise AbortFlow("no_devices_found")

    async def async_step_select_device(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is not None:
            adv = self._advs[user_input[CONF_ADDRESS]]
            await self._async_set_device(adv)
            return await self._async_next_step(adv, confirm=False)
        await bluetooth.async_request_active_scan(self.hass)
        self._async_discover_devices()
        if len(self._advs) == 1:
            adv = next(iter(self._advs.values()))
            await self._async_set_device(adv)
            return await self._async_next_step(adv, confirm=True)
        return self.async_show_form(step_id="select_device", data_schema=vol.Schema({
            vol.Required(CONF_ADDRESS): vol.In(
                {address: name_from_discovery(adv) for address, adv in self._advs.items()}
            ),
        }))

    async def async_step_import_core(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Take over a device from the built-in SwitchBot integration (entities, history)."""
        entries = {e.entry_id: e for e in importable_core_entries(self.hass)}
        if not entries:
            return self.async_abort(reason="no_devices_found")
        if user_input is None:
            return self.async_show_form(step_id="import_core", data_schema=vol.Schema({
                vol.Required(CONF_IMPORT_FROM): vol.In({i: e.title for i, e in entries.items()}),
            }))
        core = entries[user_input[CONF_IMPORT_FROM]]
        if core.data.get(CONF_SENSOR_TYPE) not in MODELS:
            return self.async_abort(reason="not_supported")
        # a Bluetooth discovery of the same device may be waiting: the import wins
        await self.async_set_unique_id(core.unique_id, raise_on_progress=False)
        self._abort_if_unique_id_configured()
        # the core entry has to be unloaded before its entities can move over
        await self.hass.config_entries.async_unload(core.entry_id)
        return self.async_create_entry(
            title=core.title,
            data={**core.data, CONF_IMPORT_FROM: core.entry_id},
            options=dict(core.options),
        )


class SwitchbotOptionsFlow(OptionsFlow):
    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is not None:
            return self.async_create_entry(title="", data=user_input)
        current = self.config_entry.options
        spec = MODELS[self.config_entry.data[CONF_SENSOR_TYPE]]
        schema: dict[Any, Any] = {
            vol.Optional(CONF_RETRY_COUNT, default=current.get(CONF_RETRY_COUNT, DEFAULT_RETRY_COUNT)): int
        }
        for key in spec.options:
            value = current.get(key, OPTION_DEFAULTS[key])
            if key == CONF_CURTAIN_SPEED:
                value = curtain_speed_option(value)
            schema[vol.Optional(key, default=value)] = OPTION_SCHEMAS[key]
        return self.async_show_form(step_id="init", data_schema=vol.Schema(schema))

