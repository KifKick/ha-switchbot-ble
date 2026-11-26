"""SwitchBot account OAuth: token exchange, the HA implementation and the flow branches."""

from __future__ import annotations

import asyncio
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

from homeassistant.exceptions import (
    OAuth2TokenRequestReauthError,
    OAuth2TokenRequestTransientError,
)
from homeassistant.helpers.config_entry_oauth2_flow import MY_AUTH_CALLBACK_PATH
import pytest

from custom_components.ha_switchbot_ble import application_credentials as ac, config_flow
from custom_components.ha_switchbot_ble.sbble import (
    AccountConnectionError,
    Advertisement,
    ApiError,
    AuthenticationError,
    Model,
)
from custom_components.ha_switchbot_ble.sbble.core.cloud import (
    OAUTH_SCOPE,
    OAUTH_TOKEN_URL,
    Account,
    exchange_oauth_code,
)

from .helpers import BLE


def _lock_adv() -> Advertisement:
    return Advertisement(BLE.address, Model.LOCK_ULTRA, "Lock Ultra", {}, -60, True, BLE)


class _Response:
    def __init__(self, status: int, body: Any) -> None:
        self.status, self._body = status, body

    async def json(self, content_type: Any = None) -> Any:
        if isinstance(self._body, Exception):
            raise self._body
        return self._body

    async def __aenter__(self) -> _Response:
        return self

    async def __aexit__(self, *exc: object) -> None:
        return None


def _session(status: int, body: Any) -> MagicMock:
    session = MagicMock()
    session.post = MagicMock(return_value=_Response(status, body))
    return session


def _exchange(session: MagicMock, code: str = "the-code") -> dict[str, Any]:
    return asyncio.run(exchange_oauth_code(session, "client", MY_AUTH_CALLBACK_PATH, code))


# --- token exchange --------------------------------------------------------------


def test_exchange_ok() -> None:
    session = _session(200, {"access_token": "tok", "expires_in": "7200"})
    token = _exchange(session)
    assert token == {"access_token": "tok", "expires_in": 7200}
    url = session.post.call_args.args[0]
    data = session.post.call_args.kwargs["data"]
    assert url == OAUTH_TOKEN_URL
    assert data == {"code": "the-code", "client_id": "client",
                    "grant_type": "authorization_code", "redirect_uri": MY_AUTH_CALLBACK_PATH}


@pytest.mark.parametrize(("status", "body", "exc"), [
    (401, {}, AuthenticationError),
    (400, {"error": "invalid_grant"}, AuthenticationError),
    (400, {"error": "invalid_request"}, ApiError),
    (429, None, AccountConnectionError),
    (503, ValueError("not json"), AccountConnectionError),
    (200, {"expires_in": 10}, ApiError),  # no access token
    (200, {"access_token": "tok"}, ApiError),  # no expiry
    (200, ValueError("not json"), ApiError),
])
def test_exchange_errors(status: int, body: Any, exc: type[Exception]) -> None:
    with pytest.raises(exc):
        _exchange(_session(status, body))


def test_exchange_error_redacts_the_code() -> None:
    body = {"error": "invalid_grant", "error_description": "code the-code expired"}
    with pytest.raises(AuthenticationError) as err:
        _exchange(_session(400, body))
    assert "the-code" not in str(err.value) and "<redacted>" in str(err.value)


# --- Home Assistant implementation -------------------------------------------------


def _impl() -> ac.SwitchbotOAuth2Implementation:
    return asyncio.run(ac.async_get_auth_implementation(
        MagicMock(), config_flow.DOMAIN, ac.ClientCredential("client", "")
    ))


def test_implementation_uses_my_home_assistant_callback() -> None:
    impl = _impl()
    assert impl.redirect_uri == MY_AUTH_CALLBACK_PATH
    assert impl.extra_authorize_data == {"scope": OAUTH_SCOPE}


@pytest.mark.parametrize(("raised", "expected"), [
    (AuthenticationError("no"), OAuth2TokenRequestReauthError),
    (AccountConnectionError("down"), OAuth2TokenRequestTransientError),
])
def test_implementation_maps_errors(raised: Exception, expected: type[Exception]) -> None:
    external = {"code": "c", "state": {"redirect_uri": MY_AUTH_CALLBACK_PATH}}
    with (patch.object(ac, "async_get_clientsession"),
          patch.object(ac, "exchange_oauth_code", AsyncMock(side_effect=raised)),
          pytest.raises(expected)):
        asyncio.run(_impl().async_resolve_external_data(external))


def test_implementation_invalid_token_data_gives_empty_result() -> None:
    external = {"code": "c", "state": {"redirect_uri": MY_AUTH_CALLBACK_PATH}}
    with (patch.object(ac, "async_get_clientsession"),
          patch.object(ac, "exchange_oauth_code", AsyncMock(side_effect=ApiError("x")))):
        assert asyncio.run(_impl().async_resolve_external_data(external)) == {}


# --- flow branches after signing in ---------------------------------------------------


def _flow() -> config_flow.SwitchbotConfigFlow:
    flow = config_flow.SwitchbotConfigFlow()
    flow.hass = MagicMock()
    return flow


def _token(access: str | None = "tok") -> dict[str, Any]:
    return {"token": {"access_token": access, "expires_in": 3600}}


def test_flow_signed_in_lists_devices_without_storing_the_token() -> None:
    flow = _flow()
    flow._oauth_next = "select_device"
    with (patch.object(config_flow, "async_get_clientsession"),
          patch.object(Account, "devices", AsyncMock(return_value={})) as fetch,
          patch.object(flow, "async_step_select_device", AsyncMock(return_value="next"))):
        assert asyncio.run(flow.async_oauth_create_entry(_token())) == "next"
    fetch.assert_awaited_once()
    assert flow._token == "tok"


def test_flow_signed_in_fetches_the_encryption_key() -> None:
    flow = _flow()
    flow._oauth_next = "encrypted_key"
    flow._adv = _lock_adv()
    key = {"key_id": "ab", "encryption_key": "00" * 16}
    accounts: list[Account] = []
    real_init = Account.__init__

    def init(self, session, token) -> None:
        real_init(self, session, token)
        accounts.append(self)

    with (patch.object(config_flow, "async_get_clientsession"),
          patch.object(Account, "__init__", init),
          patch.object(Account, "encryption_key", AsyncMock(return_value=key)) as get,
          patch.object(flow, "async_step_encrypted_key", AsyncMock(return_value="created")) as step):
        assert asyncio.run(flow.async_oauth_create_entry(_token())) == "created"
    assert get.call_args.args == (flow._adv.address,)
    assert accounts[0]._headers == {"authorization": "tok"}
    step.assert_awaited_once_with(key)


def test_flow_rejected_token_aborts() -> None:
    flow = _flow()
    flow._oauth_next = "select_device"
    with (patch.object(config_flow, "async_get_clientsession"),
          patch.object(Account, "devices", AsyncMock(side_effect=AuthenticationError("no")))):
        result = asyncio.run(flow.async_oauth_create_entry(_token()))
    assert result["type"] == "abort" and result["reason"] == "oauth_unauthorized"


def test_flow_missing_access_token_aborts() -> None:
    result = asyncio.run(_flow().async_oauth_create_entry(_token(None)))
    assert result["type"] == "abort" and result["reason"] == "oauth_error"


def test_menus_offer_oauth_first() -> None:
    flow = _flow()
    flow._adv = _lock_adv()
    with patch.object(config_flow, "importable_core_entries", return_value=[]):
        assert asyncio.run(flow.async_step_user())["menu_options"][0] == "oauth_login"
    assert asyncio.run(flow.async_step_encrypted_choose_method())["menu_options"][0] == "encrypted_oauth"


def test_curtain_track_4_is_added_like_a_lock() -> None:
    """Always encrypted: the flow asks for the key; the key is checked with the home info."""
    flow = _flow()
    adv = Advertisement(BLE.address, Model.CURTAIN_TRACK_4, "Curtain Track 4", {}, -60, True, BLE)
    result = asyncio.run(flow._async_next_step(adv, confirm=True))
    assert result["type"] == "menu" and result["step_id"] == "encrypted_choose_method"

    from custom_components.ha_switchbot_ble.sbble.devices.covers.curtain_track_4 import (
        CurtainTrack4,
    )
    home = bytes.fromhex("01 50 00 16 00 80 00 00 00 00 00 00 00 00 00 20 00")
    for reply, ok in ((home, True), (b"\x07", False)):
        with (patch.object(CurtainTrack4, "request", AsyncMock(return_value=reply)),
              patch.object(CurtainTrack4, "disconnect", AsyncMock())):
            assert asyncio.run(config_flow.verify_key(adv, "ab", "00" * 16)) is ok
