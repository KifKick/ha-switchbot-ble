"""SwitchBot account API: device list and the encryption keys of locks, keypads ….

Signing in works with the account e-mail and password, or with an OAuth access
token (``authorization`` header as is). Endpoints and the client id are the
ones the SwitchBot app uses.
"""

from __future__ import annotations

import logging
from typing import Any

import aiohttp

from .const import CLOUD_MODELS, Model
from .errors import AccountConnectionError, ApiError, AuthenticationError

_LOGGER = logging.getLogger(__name__)

API_DOMAIN = "api.switchbot.net"
APP_CLIENT_ID = "5nnwmhmsa9xxskm14hd85lm9bm"
TIMEOUT = aiohttp.ClientTimeout(total=10)

OAUTH_AUTHORIZE_URL = "https://sp.oauth.switchbot.net"
OAUTH_TOKEN_URL = "https://account.api.switchbot.net/merchant/v1/oauth/token"
OAUTH_SCOPE = "api_login"


def normalize_mac(mac: str) -> str:
    """``aabbccddeeff`` / ``aa-bb-…`` -> ``AA:BB:CC:DD:EE:FF``."""
    digits = mac.replace(":", "").replace("-", "").upper()
    return ":".join(digits[i : i + 2] for i in range(0, 12, 2))


class Account:
    """Signed-in account: ``await Account.login(...)`` or ``Account(session, token)``."""

    def __init__(self, session: aiohttp.ClientSession, token: str) -> None:
        self._session = session
        self._headers = {"authorization": token}
        self._region: str | None = None

    @classmethod
    async def login(
        cls, session: aiohttp.ClientSession, username: str, password: str
    ) -> Account:
        try:
            body = await _post(session, "account", "account/api/v1/user/login", {
                "clientId": APP_CLIENT_ID,
                "username": username,
                "password": password,
                "grantType": "password",
                "verifyCode": "",
            })
            return cls(session, body["access_token"])
        except (CloudErrorTypes, KeyError, TypeError) as err:
            raise AuthenticationError(f"Authentication failed: {err}") from err

    async def _region_host(self) -> str:
        if self._region is None:
            info = await self._call("account", "account/api/v1/user/userinfo", {})
            region = info.get("botRegion") if isinstance(info, dict) else None
            if not isinstance(region, str) or not region:
                _LOGGER.warning("SwitchBot account region missing; using us")
                region = "us"
            self._region = region
        return f"wonderlabs.{self._region}"

    async def _call(self, host: str, path: str, data: dict[str, Any]) -> Any:
        try:
            return await _post(self._session, host, path, data, self._headers)
        except (AuthenticationError, ApiError):
            raise
        except Exception as err:  # network, JSON …
            raise AccountConnectionError(f"SwitchBot account request failed: {err}") from err

    async def devices(self) -> dict[str, Model]:
        """MAC (``AA:BB:…``) -> model of every known device in the account."""
        body = await self._call(await self._region_host(), "wonder/device/v3/getdevice",
                                {"required_type": "All"})
        items = body.get("Items") if isinstance(body, dict) else None
        if not isinstance(items, list) or not all(isinstance(i, dict) for i in items):
            raise ApiError("Invalid device response from SwitchBot API")
        devices: dict[str, Model] = {}
        for item in items:
            device_type = (item.get("device_detail") or {}).get("device_type")
            if "device_mac" not in item or device_type is None:
                continue
            if model := CLOUD_MODELS.get(device_type):
                devices[normalize_mac(item["device_mac"])] = model
            else:
                _LOGGER.debug("Unknown cloud model %s", device_type)
        return devices

    async def encryption_key(self, mac: str) -> dict[str, str]:
        """``{"key_id": "xx", "encryption_key": "32 hex"}`` of a device."""
        body = await self._call(await self._region_host(), "wonder/keys/v1/communicate", {
            "device_mac": mac.replace(":", "").replace("-", "").upper(),
            "keyType": "user",
        })
        key = body.get("communicationKey") if isinstance(body, dict) else None
        if not isinstance(key, dict) or not isinstance(key.get("keyId"), str) \
                or not isinstance(key.get("key"), str):
            raise ApiError("Invalid encryption key response from SwitchBot API")
        return {"key_id": key["keyId"], "encryption_key": key["key"]}


async def _post(
    session: aiohttp.ClientSession,
    host: str,
    path: str,
    data: dict[str, Any],
    headers: dict[str, str] | None = None,
) -> Any:
    url = f"https://{host}.{API_DOMAIN}/{path}"
    async with session.post(url, json=data, headers=headers, timeout=TIMEOUT) as response:
        _LOGGER.debug("SwitchBot API %s -> HTTP %s", path, response.status)
        if response.status in (401, 403):
            raise AuthenticationError("Authentication rejected by SwitchBot API")
        if response.status > 299:
            raise ApiError(f"Unexpected status code returned by SwitchBot API: {response.status}")
        result = await response.json()
    if result.get("statusCode") != 100:
        raise ApiError(f"{result.get('message')}, status code: {result.get('statusCode')}")
    return result.get("body")


CloudErrorTypes = (AuthenticationError, ApiError, aiohttp.ClientError, TimeoutError)


# --- OAuth ----------------------------------------------------------------------------


def _oauth_error(data: Any, code: str) -> str:
    """``error: description`` from an OAuth error body, the code redacted."""
    if not isinstance(data, dict):
        return ""
    parts = [" ".join(v.split())[:256] for k in ("error", "error_description")
             if isinstance(v := data.get(k), str) and v]
    text = ": ".join(parts)
    return text.replace(code, "<redacted>") if code else text


async def exchange_oauth_code(
    session: aiohttp.ClientSession, client_id: str, redirect_uri: str, code: str
) -> dict[str, Any]:
    """Authorization code -> token dict (``access_token``, ``expires_in`` …)."""
    try:
        async with session.post(
            OAUTH_TOKEN_URL,
            data={"code": code, "client_id": client_id,
                  "grant_type": "authorization_code", "redirect_uri": redirect_uri},
            timeout=TIMEOUT,
        ) as response:
            status = response.status
            try:
                data = await response.json(content_type=None)
            except (aiohttp.ClientError, ValueError, TypeError):
                data = None
    except (aiohttp.ClientError, TimeoutError) as err:
        raise AccountConnectionError(f"Failed to connect to SwitchBot OAuth token API: {err}") from err
    if status >= 400:
        detail = _oauth_error(data, code)
        suffix = f": {detail}" if detail else ""
        error = data.get("error") if isinstance(data, dict) else None
        if status in (401, 403) or (status == 400 and error in ("invalid_client", "invalid_grant")):
            raise AuthenticationError(f"SwitchBot OAuth token request rejected ({status}){suffix}")
        if status == 429 or status >= 500:
            raise AccountConnectionError(f"SwitchBot OAuth token service unavailable ({status}){suffix}")
        raise ApiError(f"SwitchBot OAuth token request failed ({status}){suffix}")
    if not isinstance(data, dict) or not isinstance(data.get("access_token"), str) \
            or not data["access_token"]:
        raise ApiError("Invalid token data from SwitchBot OAuth token API")
    token = dict(data)
    try:
        token["expires_in"] = int(token["expires_in"])
    except (KeyError, TypeError, ValueError) as err:
        raise ApiError("Invalid token data from SwitchBot OAuth token API") from err
    return token
