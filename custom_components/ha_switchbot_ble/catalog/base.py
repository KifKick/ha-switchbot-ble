"""ModelSpec and the description helpers the catalog files are written with."""

from __future__ import annotations

from collections.abc import Awaitable, Callable, Iterable
from dataclasses import dataclass, field, replace
from typing import Any

from homeassistant.components.binary_sensor import BinarySensorDeviceClass
from homeassistant.components.number import NumberDeviceClass, NumberMode
from homeassistant.components.sensor import SensorDeviceClass, SensorStateClass
from homeassistant.const import EntityCategory, Platform, UnitOfRatio, UnitOfTime

from ..entity import (
    BinaryDesc,
    CatalogItem,
    Main,
    NumberDesc,
    SbDescription,
    SelectDesc,
    SensorDesc,
    SetFn,
    SwitchDesc,
)
from ..sbble import MODELS, Device, EncryptedDevice, Model

DIAG = EntityCategory.DIAGNOSTIC
CONFIG = EntityCategory.CONFIG

type RefreshFn = Callable[[Any, bool], Awaitable[Any]]  # (device, first read)


@dataclass(frozen=True)
class ModelSpec:
    """One supported model: how to talk to it and which entities it has."""

    type: str  # config entry "sensor_type"
    model: Model
    entities: tuple[CatalogItem, ...] = ()
    connectable: bool = True  # can be connected to (else advertisements only)
    passive: bool = False  # also usable from passive advertisements
    refresh: RefreshFn | None = None  # settings read after startup and every 6 h
    refresh_delay: int = 60
    channels: int = 1
    options: tuple[str, ...] = ()  # extra options in the options flow
    _items: dict[Platform, list[CatalogItem]] = field(
        default_factory=dict, init=False, compare=False, repr=False
    )

    def bind(self, common: Iterable[CatalogItem]) -> None:
        """Merge the common entities with the model's own (the model's win)."""
        merged: dict[tuple[Platform, str], CatalogItem] = {}
        for item in (*common, *self.entities):
            merged[(item.platform, item.key)] = item
        for (platform, _), item in merged.items():
            self._items.setdefault(platform, []).append(item)

    @property
    def device_cls(self) -> type[Device]:
        """The library class of the model."""
        return MODELS[self.model].cls

    @property
    def encrypted(self) -> bool:
        """Commands are encrypted with the key from the SwitchBot account."""
        return issubclass(self.device_cls, EncryptedDevice)

    def items(self, platform: Platform) -> list[CatalogItem]:
        return self._items.get(platform, [])

    @property
    def platforms(self) -> list[Platform]:
        return sorted(self._items)


def models(*specs: ModelSpec, **common: Any) -> tuple[ModelSpec, ...]:
    """Several specs sharing fields: ``models(spec(...), spec(...), refresh=read)``."""
    return tuple(replace(s, **common) for s in specs)


def dynamic(*items: SbDescription) -> tuple[SbDescription, ...]:
    """The same descriptions, created once the device reports the key."""
    return tuple(replace(item, add="dynamic") for item in items)


def always(*items: SbDescription) -> tuple[SbDescription, ...]:
    return tuple(replace(item, add="always") for item in items)


def main(platform: Platform, cls) -> Main:
    return Main(platform, cls)


# --- read-only ------------------------------------------------------------------


def sensor(key: str, *, tk: str | None = "", cat: EntityCategory | None = None,
           on: bool = True, **kw: Any) -> SensorDesc:
    """``tk=""`` means translation_key = key, ``tk=None`` no translation key."""
    return SensorDesc(
        key=key,
        translation_key=key if tk == "" else tk,
        entity_category=cat,
        entity_registry_enabled_default=on,
        **kw,
    )


def diag(key: str, *, on: bool = True, **kw: Any) -> SensorDesc:
    return sensor(key, cat=DIAG, on=on, **kw)


def enum(key: str, options: Iterable[str], *, cat: EntityCategory | None = DIAG,
         on: bool = True, **kw: Any) -> SensorDesc:
    return sensor(key, cat=cat, on=on, device_class=SensorDeviceClass.ENUM,
                  options=list(dict.fromkeys(options)), **kw)


def duration(key: str, unit: str, *, on: bool = True) -> SensorDesc:
    return diag(key, on=on, device_class=SensorDeviceClass.DURATION,
                native_unit_of_measurement=unit)


def battery(key: str) -> SensorDesc:
    return diag(key, device_class=SensorDeviceClass.BATTERY,
                native_unit_of_measurement=UnitOfRatio.PERCENTAGE,
                state_class=SensorStateClass.MEASUREMENT)


def binary(key: str, device_class: BinarySensorDeviceClass | None = None, *,
           tk: str | None = "", cat: EntityCategory | None = DIAG, on: bool = True,
           **kw: Any) -> BinaryDesc:
    return BinaryDesc(
        key=key,
        translation_key=key if tk == "" else tk,
        device_class=device_class,
        entity_category=cat,
        entity_registry_enabled_default=on,
        **kw,
    )


def problem(key: str, *, cat: EntityCategory | None = DIAG, on: bool = True) -> BinaryDesc:
    return binary(key, BinarySensorDeviceClass.PROBLEM, cat=cat, on=on)


def charging(key: str = "battery_charging") -> BinaryDesc:
    return binary(key, BinarySensorDeviceClass.BATTERY_CHARGING, tk=None)


# --- settings written over Bluetooth (created when the device reports them) -----


def _bool(_device: Any, value: Any) -> bool | None:
    return None if value is None else bool(value)


def setting_switch(key: str, set_fn: SetFn, **kw: Any) -> SwitchDesc:
    kw.setdefault("entity_category", CONFIG)
    return SwitchDesc(key=key, translation_key=key, add="dynamic",
                      value_fn=_bool, set_fn=set_fn, **kw)


def setting_select(key: str, options: Iterable[str], set_fn: SetFn, **kw: Any) -> SelectDesc:
    return SelectDesc(key=key, translation_key=key, entity_category=CONFIG,
                      add="dynamic", options=list(options), set_fn=set_fn, **kw)


def setting_number(key: str, lo: float, hi: float, set_fn: SetFn, *,
                   unit: str | None = UnitOfTime.SECONDS,
                   device_class: NumberDeviceClass | None = NumberDeviceClass.DURATION,
                   step: float = 1, mode: NumberMode = NumberMode.BOX,
                   **kw: Any) -> NumberDesc:
    kw.setdefault("entity_category", CONFIG)
    return NumberDesc(key=key, translation_key=key, add="dynamic",
                      native_min_value=lo, native_max_value=hi, native_step=step,
                      native_unit_of_measurement=unit, device_class=device_class,
                      mode=mode, set_fn=set_fn, **kw)


def keyed(*items: CatalogItem) -> dict[str, CatalogItem]:
    return {item.key: item for item in items}
