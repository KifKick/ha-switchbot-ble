"""Shared by the plugs and relays: power value decoding and the on / off state."""

from __future__ import annotations

from ...core.device import Device


def power_value(data: bytes, offset: int, scale: float = 1.0, mask: int | None = None) -> float:
    """uint16 BE at ``offset`` divided by ``scale`` (ValueError when too short)."""
    if offset + 2 > len(data):
        raise ValueError(f"need {offset + 2} bytes, got {len(data)}")
    value = int.from_bytes(data[offset : offset + 2], "big")
    if mask is not None:
        value &= mask
    return value / scale


def uint24(data: bytes, offset: int) -> int:
    if offset + 3 > len(data):
        raise ValueError(f"need {offset + 3} bytes, got {len(data)}")
    return int.from_bytes(data[offset : offset + 3], "big")


class SwitchState(Device):
    """``is_on`` / ``switch_mode`` from the parsed data (the switch entity reads them)."""

    def is_on(self) -> bool | None:
        return self.data.get("isOn")

    def switch_mode(self) -> bool | None:
        return self.data.get("switchMode")



def ignore_while_connected(device: Device) -> bool:
    """For ``_accepts_advertisements``: some firmware keeps advertising the old
    state while connected, so the state read over the connection wins."""
    return not device._conn.connected
