"""Errors raised by the library."""

from __future__ import annotations


class SwitchbotError(Exception):
    """Base class."""


class OperationError(SwitchbotError):
    """The device rejected a command or answered something unexpected."""


class CharacteristicMissingError(SwitchbotError):
    """The device has no SwitchBot command characteristics (stale GATT cache)."""


class CloudError(SwitchbotError):
    """The SwitchBot account API failed."""


class AuthenticationError(CloudError):
    """The account rejected the credentials or the token."""


class ApiError(CloudError):
    """The account API answered with an error or an unexpected body."""


class AccountConnectionError(CloudError):
    """The account API could not be reached."""
