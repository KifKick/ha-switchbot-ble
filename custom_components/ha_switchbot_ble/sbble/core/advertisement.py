"""Advertisements: which model sent it and what it says.

SwitchBot devices advertise service data (UUID fd3d, older 0d00) and
manufacturer data (company 2409, older 741 / 89). The model is told by

* the first service data byte without bit 7 (bit 7 = encrypted), or
* a 4 byte product id ``00|01 xx xx xx`` at the end of the service data, or
* for a few old models, the length of their manufacturer data (``mfr=``).

Passive scans often carry only manufacturer data; then the caller must know the
model (it is stored in the config entry). Each device module registers its
models with the :func:`device` class decorator.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
import logging
from typing import Any

from bleak.backends.device import BLEDevice
from bleak.backends.scanner import AdvertisementData

from .const import Model

_LOGGER = logging.getLogger(__name__)

SERVICE_UUIDS = (
    "0000fd3d-0000-1000-8000-00805f9b34fb",
    "00000d00-0000-1000-8000-00805f9b34fb",
)
MANUFACTURER_IDS = (2409, 741, 89)

type Parser = Callable[[bytes | None, bytes | None], dict[str, Any]]


@dataclass(frozen=True, slots=True)
class ModelInfo:
    model: Model
    name: str  # friendly name, used for discovered device titles
    parser: Parser
    codes: tuple[bytes, ...]
    cls: type[Any] | None = None  # the library class of the device
    mfr: tuple[int, int] | None = None  # (company id, data length) that tells the model


@dataclass(frozen=True, slots=True)
class Advertisement:
    address: str
    model: Model
    name: str
    data: dict[str, Any]
    rssi: int
    active: bool  # carries service data, i.e. came from an active scan
    ble_device: BLEDevice
    password: bool = False  # commands need the device password (service data bit 7)


MODELS: dict[Model, ModelInfo] = {}
_BY_CODE: dict[bytes, ModelInfo] = {}
_BY_MFR: dict[tuple[int, int], ModelInfo] = {}


def register(
    model: Model,
    name: str,
    parser: Parser,
    *codes: str | bytes,
    cls: type[Any] | None = None,
    mfr: tuple[int, int] | None = None,
) -> ModelInfo:
    """Register a model; ``codes`` are 1 character service data codes or 4 byte ids."""
    info = ModelInfo(
        model, name, parser,
        tuple(c.encode("latin-1") if isinstance(c, str) else c for c in codes), cls, mfr,
    )
    if mfr is not None:
        assert mfr not in _BY_MFR, mfr
        _BY_MFR[mfr] = info
    assert model not in MODELS, model
    MODELS[model] = info
    for code in info.codes:
        assert len(code) in (1, 4) and code not in _BY_CODE, code
        _BY_CODE[code] = info
    return info


def device[T: type[Any]](
    name: str, *codes: str | bytes, mfr: tuple[int, int] | None = None
) -> Callable[[T], T]:
    """Class decorator: register the class's ``model`` with its ``parse`` and ``codes``."""

    def wrap(cls: T) -> T:
        register(cls.model, name, cls.parse, *codes, cls=cls, mfr=mfr)
        return cls

    return wrap


def payloads(adv: AdvertisementData) -> tuple[bytes | None, int | None, bytes | None]:
    """(service data, company id, manufacturer data) of a SwitchBot advertisement."""
    service = next((adv.service_data[u] for u in SERVICE_UUIDS if u in adv.service_data), None)
    company = next((i for i in MANUFACTURER_IDS if i in adv.manufacturer_data), None)
    mfr = adv.manufacturer_data[company] if company is not None else None
    return service, company, mfr


def identify(
    service: bytes | None, company: int | None = None, mfr: bytes | None = None
) -> ModelInfo | None:
    """The model the advertisement names, if it names one (same order as the app)."""
    if service and (info := _BY_CODE.get(bytes((service[0] & 0x7F,)))):
        return info
    if company is not None and mfr is not None \
            and (info := _BY_MFR.get((company, len(mfr)))):
        return info
    if service and len(service) > 5:
        # the id sits at the end, before a trailing byte, or at bytes 3-6
        # (``00 xx b3 <id>``: Curtain Track 4 sends 7 or more bytes)
        for product in (service[-4:], service[-5:-1], service[3:7]):
            if info := _BY_CODE.get(bytes(product)):
                return info
    return None


def parse(
    ble_device: BLEDevice, adv: AdvertisementData, model: Model | None = None
) -> Advertisement | None:
    """Parse an advertisement; ``model`` when it is known (or the data cannot tell)."""
    service, company, mfr = payloads(adv)
    if service is None and mfr is None:
        return None
    info = MODELS.get(model) if model else identify(service, company, mfr)
    if info is None:
        return None
    try:
        data = info.parser(service, mfr)
    except (IndexError, ValueError, KeyError):
        _LOGGER.debug("%s: cannot parse %s / %s", ble_device.address,
                      service and service.hex(), mfr and mfr.hex(), exc_info=True)
        return None
    if not data:
        return None
    return Advertisement(
        ble_device.address, info.model, info.name, data, adv.rssi, service is not None, ble_device,
        bool(service and service[0] & 0x80),
    )
