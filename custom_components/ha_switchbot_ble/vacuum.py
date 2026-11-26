"""Support for switchbot vacuums."""

from typing import Any, override

from homeassistant.components.vacuum import (
    StateVacuumEntity,
    VacuumActivity,
    VacuumEntityFeature,
)
from homeassistant.const import Platform

from .coordinator import SwitchbotDataUpdateCoordinator
from .entity import SwitchbotEntity, platform_setup
from .sbble import Model
from .sbble.devices.vacuums.vacuum_base import VacuumBase

PARALLEL_UPDATES = 0

DEVICE_SUPPORT_PROTOCOL_VERSION_1 = [
    Model.K10_VACUUM,
    Model.K10_PRO_VACUUM,
]

PROTOCOL_VERSION_1_STATE_TO_HA_STATE: dict[int, VacuumActivity] = {
    0: VacuumActivity.CLEANING,
    1: VacuumActivity.DOCKED,
}

PROTOCOL_VERSION_2_STATE_TO_HA_STATE: dict[int, VacuumActivity] = {
    1: VacuumActivity.IDLE,  # idle
    2: VacuumActivity.DOCKED,  # charge
    3: VacuumActivity.DOCKED,  # charge complete
    4: VacuumActivity.IDLE,  # self-check
    5: VacuumActivity.IDLE,  # the drum is moist
    6: VacuumActivity.CLEANING,  # exploration
    7: VacuumActivity.CLEANING,  # re-location
    8: VacuumActivity.CLEANING,  # cleaning and sweeping
    9: VacuumActivity.CLEANING,  # cleaning
    10: VacuumActivity.CLEANING,  # sweeping
    11: VacuumActivity.PAUSED,  # pause
    12: VacuumActivity.CLEANING,  # getting out of trouble
    13: VacuumActivity.ERROR,  # trouble
    14: VacuumActivity.CLEANING,  # mop cleaning
    15: VacuumActivity.RETURNING,  # returning
    16: VacuumActivity.CLEANING,  # deep cleaning
    17: VacuumActivity.CLEANING,  # sewage extraction
    18: VacuumActivity.CLEANING,  # replenish water for mop
    19: VacuumActivity.CLEANING,  # dust collection
    20: VacuumActivity.CLEANING,  # dry
    21: VacuumActivity.IDLE,  # dormant
    22: VacuumActivity.IDLE,  # network configuration
    23: VacuumActivity.CLEANING,  # remote control
    24: VacuumActivity.RETURNING,  # return to base
    25: VacuumActivity.IDLE,  # shut down
    26: VacuumActivity.IDLE,  # mark water base station
    27: VacuumActivity.IDLE,  # rinse the filter screen
    28: VacuumActivity.IDLE,  # mark humidifier location
    29: VacuumActivity.IDLE,  # on the way to the humidifier
    30: VacuumActivity.IDLE,  # add water for humidifier
    31: VacuumActivity.IDLE,  # upgrading
    32: VacuumActivity.PAUSED,  # pause during recharging
    33: VacuumActivity.IDLE,  # integrated with the platform
    34: VacuumActivity.CLEANING,  # working for the platform
}

SWITCHBOT_VACUUM_STATE_MAP: dict[int, dict[int, VacuumActivity]] = {
    1: PROTOCOL_VERSION_1_STATE_TO_HA_STATE,
    2: PROTOCOL_VERSION_2_STATE_TO_HA_STATE,
}


class SwitchbotVacuumEntity(SwitchbotEntity, StateVacuumEntity):
    """Representation of a SwitchBot vacuum."""

    _device: VacuumBase
    _attr_supported_features = (
        VacuumEntityFeature.RETURN_HOME
        | VacuumEntityFeature.START
        | VacuumEntityFeature.STATE
    )
    _attr_translation_key = "vacuum"
    _attr_name = None

    def __init__(self, coordinator: SwitchbotDataUpdateCoordinator) -> None:
        """Initialize the entity."""
        super().__init__(coordinator)
        self.protocol_version = (
            1 if coordinator.model in DEVICE_SUPPORT_PROTOCOL_VERSION_1 else 2
        )

    @property
    @override
    def activity(self) -> VacuumActivity | None:
        """Return the status of the vacuum cleaner."""
        status_code = self._device.get_work_status()
        return SWITCHBOT_VACUUM_STATE_MAP[self.protocol_version].get(status_code)

    @override
    async def async_start(self) -> None:
        """Start or resume the cleaning task."""
        await self._device.clean_up(self.protocol_version)

    @override
    async def async_return_to_base(self, **kwargs: Any) -> None:
        """Return to dock."""
        await self._device.return_to_dock(self.protocol_version)


async_setup_entry = platform_setup(Platform.VACUUM)
