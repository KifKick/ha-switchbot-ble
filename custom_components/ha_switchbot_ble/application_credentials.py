"""SwitchBot account OAuth (the public client SwitchBot registered for Home Assistant).

The redirect goes through my.home-assistant.io, the only callback registered for
that client; the token is used during the config flow only and is never stored.
"""

from __future__ import annotations

from typing import Any, override

from aiohttp import RequestInfo
from homeassistant.components.application_credentials import (
    AuthImplementation,
    AuthorizationServer,
    ClientCredential,
)
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import (
    OAuth2TokenRequestReauthError,
    OAuth2TokenRequestTransientError,
)
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.config_entry_oauth2_flow import (
    MY_AUTH_CALLBACK_PATH,
    AbstractOAuth2Implementation,
)
from multidict import CIMultiDict, CIMultiDictProxy
from yarl import URL

from .const import DOMAIN
from .sbble import AccountConnectionError, ApiError, AuthenticationError
from .sbble.core.cloud import (
    OAUTH_AUTHORIZE_URL,
    OAUTH_SCOPE,
    OAUTH_TOKEN_URL,
    exchange_oauth_code,
)


async def async_get_auth_implementation(
    hass: HomeAssistant, auth_domain: str, credential: ClientCredential
) -> AbstractOAuth2Implementation:
    return SwitchbotOAuth2Implementation(
        hass, auth_domain, credential, AuthorizationServer(OAUTH_AUTHORIZE_URL, OAUTH_TOKEN_URL)
    )


def _request_info() -> RequestInfo:
    url = URL(OAUTH_TOKEN_URL)
    return RequestInfo(url, "POST", CIMultiDictProxy(CIMultiDict()), url)


class SwitchbotOAuth2Implementation(AuthImplementation):
    """No client secret, no PKCE (SwitchBot supports neither): ``state`` guards the flow."""

    @property
    @override
    def redirect_uri(self) -> str:
        return MY_AUTH_CALLBACK_PATH

    @property
    @override
    def extra_authorize_data(self) -> dict[str, str]:
        return {"scope": OAUTH_SCOPE}

    @override
    async def async_resolve_external_data(self, external_data: dict[str, Any]) -> dict[str, Any]:
        try:
            return await exchange_oauth_code(
                async_get_clientsession(self.hass),
                self.client_id,
                external_data["state"]["redirect_uri"],
                external_data["code"],
            )
        except AuthenticationError as err:
            raise OAuth2TokenRequestReauthError(
                request_info=_request_info(), status=401, domain=DOMAIN
            ) from err
        except AccountConnectionError as err:
            raise OAuth2TokenRequestTransientError(
                request_info=_request_info(), status=503, domain=DOMAIN
            ) from err
        except ApiError:
            return {}  # the flow aborts with "oauth_error"
