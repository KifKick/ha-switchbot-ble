"""Connection + encryption end to end, against a simulated encrypted lock."""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, patch

from bleak.backends.device import BLEDevice

from custom_components.ha_switchbot_ble.sbble import LockStatus
from custom_components.ha_switchbot_ble.sbble.core import connection as conn_mod
from custom_components.ha_switchbot_ble.sbble.core.crypto import AesMode, Session
from custom_components.ha_switchbot_ble.sbble.devices.locks.lock_ultra import LockUltra
from custom_components.ha_switchbot_ble.sbble.devices.sensors.indoor_outdoor_thermo_hygrometer import (
    IndoorOutdoorThermoHygrometer,
)

BLE = BLEDevice("AA:BB:CC:DD:EE:FF", "dev", {})
KEY = "0123456789abcdef0123456789abcdef"
IV = bytes(range(16))


class FakeClient:
    """Answers like the device would; ``respond(plain) -> plain reply``."""

    def __init__(self, respond, encrypted: bool) -> None:
        self.respond, self.encrypted = respond, encrypted
        self.is_connected = True
        self.written: list[bytes] = []
        self.services = self
        self._notify = None
        self.session = Session(bytes.fromhex(KEY), AesMode.CTR, IV)

    def get_characteristic(self, uuid):
        return uuid

    async def start_notify(self, _char, callback) -> None:
        self._notify = callback

    async def disconnect(self) -> None:
        self.is_connected = False

    async def clear_cache(self) -> None:
        pass

    def push(self, payload: bytes) -> None:
        asyncio.get_running_loop().call_soon(self._notify, None, bytearray(payload))

    async def write_gatt_char(self, _char, frame: bytes, _response: bool) -> None:
        self.written.append(frame)
        if not self.encrypted:
            self.push(self.respond(frame))
        elif frame.startswith(bytes.fromhex("570000000f2103")):
            self.push(b"\x01\x00\x00\x00" + IV)
        else:
            assert frame[1] == 0xAB and frame[2:4] == IV[:2]
            plain = frame[:1] + self.session.decrypt(frame[4:])
            reply = self.respond(plain)
            self.push(reply[:1] + b"\x00\x00\x00" + self.session.encrypt(reply[1:])[1])


def _connect(clients: list[FakeClient]):
    async def establish(*_args, **_kwargs):
        return clients.pop(0)
    return patch.object(conn_mod, "establish_connection", establish)


LOCK_STATUS = bytes.fromhex("01" + "08" + "10" + "00" * 4 + "2d")  # unlocked, door open


def _lock_device(plain: bytes) -> bytes:
    assert plain[:4] == bytes.fromhex("570f4f81")
    return LOCK_STATUS


def test_encrypted_status_read_and_reconnect() -> None:
    async def run() -> None:
        first, second = FakeClient(_lock_device, True), FakeClient(_lock_device, True)
        lock = LockUltra(BLE, key_id="ab", encryption_key=KEY)
        with _connect([first, second]):
            data = await lock.refresh_status()
            assert data["status"] is LockStatus.UNLOCKED
            assert data["door_open"] and data["knob_angle"] == 90
            await lock.refresh_status()  # same connection, same session
            assert len(first.written) == 3
            await lock.disconnect()
            await lock.refresh_status()  # new connection: new session request
            assert second.written[0].startswith(bytes.fromhex("570000000f2103ab"))
    asyncio.run(run())


def test_lock_notification_is_not_taken_as_reply() -> None:
    async def run() -> None:
        client = FakeClient(_lock_device, True)
        lock = LockUltra(BLE, key_id="ab", encryption_key=KEY)
        seen: list[int] = []
        lock.subscribe(lambda: seen.append(1))
        with _connect([client]):
            await lock.refresh_status()
            locked = bytes.fromhex("00" + "00" * 5 + "00")
            client.push(b"\x0f\x00\x00\x00" + client.session.encrypt(locked)[1])
            await asyncio.sleep(0)
            await asyncio.sleep(0)
        assert lock.status is LockStatus.LOCKED
        assert seen
        await lock.disconnect()
    asyncio.run(run())


def test_plain_device_calibration() -> None:
    def thermo(frame: bytes) -> bytes:
        if frame == bytes.fromhex("570f37"):
            return bytes.fromhex("01 81 03 05")
        assert frame == bytes.fromhex("570f36 01 85 05")
        return b"\x01"

    async def run() -> None:
        device = IndoorOutdoorThermoHygrometer(BLE)
        client = FakeClient(thermo, False)
        with _connect([client]):
            calibration = await device.get_calibration()
            assert calibration.as_dict() == {"temperature": 1.5, "humidity": -3}
            await device.set_calibration(-1.5, 5)
        await device.disconnect()
    asyncio.run(run())


def test_humidifier_found_by_manufacturer_data_length() -> None:
    from bleak.backends.scanner import AdvertisementData

    from custom_components.ha_switchbot_ble.sbble import Model, parse

    adv = AdvertisementData(None, {741: bytes.fromhex("aabbcc80b3ff")}, {}, [], None, -60, ())
    result = parse(BLE, adv)
    assert result is not None and result.model is Model.HUMIDIFIER


def _curtain(seen: list[str], moving_polls: int = 2, home: str = "01 50 16 00 80 00 00 1e 00 00 00 00 00 10 00"):
    """A Curtain 3 / Track 4 that moves for ``moving_polls`` motion reads."""
    left = [moving_polls]

    def respond(plain: bytes) -> bytes:
        seen.append(plain.hex())
        if plain.startswith(bytes.fromhex("570f460100")):
            left[0] -= 1
            return bytes.fromhex("01 02" if left[0] >= 0 else "01 00")
        if plain == bytes.fromhex("570f460403"):
            return bytes.fromhex(home)
        return b"\x01"
    return respond


def test_curtain_3_move_is_followed_until_it_stops() -> None:
    from custom_components.ha_switchbot_ble.sbble.devices.covers import cover_base
    from custom_components.ha_switchbot_ble.sbble.devices.covers.curtain_3 import Curtain3

    async def run() -> None:
        seen: list[str] = []
        device = Curtain3(BLE)
        device.data = {"position": 100, "firmware": 2.2}
        client = FakeClient(_curtain(seen), False)
        with _connect([client]), patch.object(cover_base, "POLL_INTERVAL", 0):
            assert await device.close()
            assert device.is_closing()
            await device.wait_motion()
        assert seen[0].startswith("57000501")  # clock first on a new connection
        assert seen[1:] == ["570f45010401ff64", "570f460100", "570f460100", "570f460100",
                            "570f460403"]
        assert not device.is_closing() and device.data["position"] == 70
        await device.disconnect()
    asyncio.run(run())


def test_curtain_track_4_is_encrypted() -> None:
    from custom_components.ha_switchbot_ble.sbble.devices.covers import cover_base
    from custom_components.ha_switchbot_ble.sbble.devices.covers.curtain_track_4 import (
        CurtainTrack4,
    )

    async def run() -> None:
        seen: list[str] = []
        device = CurtainTrack4(BLE, key_id="ab", encryption_key=KEY)
        device.data = {"position": 0}
        client = FakeClient(_curtain(seen, 1, "01 50 c4 16 00 80 00 00 00 00 00 00 00 00 00 20 00"),
                            True)
        with _connect([client]), patch.object(cover_base, "POLL_INTERVAL", 0):
            assert await device.open("quietdrift")
            await device.wait_motion()
        # session request in clear, everything else encrypted (FakeClient checks the header)
        assert client.written[0].startswith(bytes.fromhex("570000000f2103ab"))
        assert all(frame[1] == 0xAB for frame in client.written[1:])
        assert seen[0].startswith("57000501")
        assert seen[1:] == ["570f450104010100", "570f460100", "570f460100", "570f460403"]
        assert device.data["battery"] == 71 and device.data["position"] == 100
        await device.disconnect()
    asyncio.run(run())


def test_roller_shade_follows_reported_motion() -> None:
    from custom_components.ha_switchbot_ble.sbble.devices.covers import cover_base
    from custom_components.ha_switchbot_ble.sbble.devices.covers.roller_shade import RollerShade

    states = iter(["01 03 12 4b 01 01 1e", "01 03 12 4b 01 01 28", "01 03 12 4b 01 20 32",
                   "01 03 12 4b 01 20 32"])
    seen: list[str] = []

    def respond(plain: bytes) -> bytes:
        seen.append(plain.hex())
        return bytes.fromhex(next(states)) if plain.hex() == "570f48041100" else b"\x01"

    async def run() -> None:
        device = RollerShade(BLE)
        device.data = {"position": 80}
        with _connect([FakeClient(respond, False)]), patch.object(cover_base, "POLL_INTERVAL", 0):
            assert await device.open()
            await device.wait_motion()
        assert seen[1:] == ["570f470105010000", "570f48041100", "570f48041100", "570f48041100",
                            "570f48041100"]
        assert not device.is_opening() and device.data["position"] == 50
        assert device.data["motor_stop_reason"] == "target_reached"
        await device.disconnect()
    asyncio.run(run())


def test_curtain_3_manual_calibration_step_by_step() -> None:
    """docs/curtain-3.md 4.C: start manual, open side, magnet skipped, open end with
    jogs, closed end, finish; then the distance read."""
    from custom_components.ha_switchbot_ble.sbble.devices.covers.curtain_3 import Curtain3

    seen: list[str] = []

    def respond(plain: bytes) -> bytes:
        seen.append(plain.hex())
        if plain.hex() == "570f460500":
            return bytes.fromhex("01 00 00 c8 00 f0")
        return bytes.fromhex("01 00") if plain.hex() == "570f460100" else b"\x01"

    async def run() -> None:
        device = Curtain3(BLE)
        with _connect([FakeClient(respond, False)]):
            for step, value in (("start_manual", None), ("open_side", 0), ("magnet_off", None),
                                ("drive_open", None), ("jog_left", None), ("pause", None),
                                ("drive_closed", None), ("jog_right", None), ("pause", None),
                                ("exit", None)):
                assert await device.calibration_command(step, value), step
                await device.calibration_poll()
            info = await device.calibration_read("distance")
        assert info == {"distance_cm": 200, "steps": 240, "route_too_short": False}
        steps = [f for f in seen[1:] if f != "570f460100"]
        assert steps == ["570f45050a02", "570f4504060100", "570f4504020101", "570f4509040100",
                         "570f4505080101", "570f4505040001", "570f45050500", "570f4505080102",
                         "570f4505040002", "570f45050500", "570f450502", "570f460500"]
        await device.disconnect()
    asyncio.run(run())


def test_calibration_rejects_unknown_steps_and_values() -> None:
    import pytest

    from custom_components.ha_switchbot_ble.sbble.devices.covers.blind_tilt import BlindTilt
    from custom_components.ha_switchbot_ble.sbble.devices.covers.curtain_track_4 import (
        CurtainTrack4,
    )

    device = BlindTilt(BLE)
    with pytest.raises(ValueError):
        asyncio.run(device.calibration_command("save", 4))  # only 1, 2, 3, 5
    with pytest.raises(ValueError):
        asyncio.run(device.calibration_command("reset"))
    track = CurtainTrack4(BLE, key_id="ab", encryption_key=KEY)
    with pytest.raises(ValueError):
        asyncio.run(track.calibration_command("magnet_on"))  # no magnet on the Track 4
    assert track._calibration_frames("mount_side", 1) == ("570f450406010001",)


def test_blind_tilt_calibration_notifications_and_exit() -> None:
    from custom_components.ha_switchbot_ble.sbble.devices.covers.blind_tilt import BlindTilt

    seen: list[str] = []
    holder: list[FakeClient] = []

    def respond(plain: bytes) -> bytes:
        seen.append(plain.hex())
        if plain.hex() == "570f450509" "01":
            # the user turned the wand far enough: the device notifies (not a reply)
            holder[0].push(bytes.fromhex("01 11 00 00"))
        if plain.hex() == "570f460100":
            return bytes.fromhex("01 00 00 00 00 00 0a 00")
        return b"\x01"

    async def run() -> None:
        device = BlindTilt(BLE)
        client = FakeClient(respond, False)
        holder.append(client)
        with _connect([client]):
            assert await device.calibration_command("start")
            assert device.data["calibration_next"] is False
            assert await device.calibration_command("save", 1)
            await asyncio.sleep(0)
            await device.calibration_poll()
            assert device.data["calibration_next"] is True and device.data["calibration_step"] == 1
            assert device.data["tilt"] == 10
            await device.calibration_abort()  # cancel: exit + notifications off
        assert seen[1:] == ["570f450501", "570e01000affff460900", "570f45050901", "570f460100",
                            "570f450502", "570e00"]
        assert not device._calibrating
        await device.disconnect()
    asyncio.run(run())


def test_roller_shade_abort_depends_on_the_wizard() -> None:
    from custom_components.ha_switchbot_ble.sbble.devices.covers.roller_shade import RollerShade

    device = RollerShade(BLE)
    device.request = AsyncMock(return_value=b"\x01")
    asyncio.run(device.calibration_command("start", 1))
    assert device.calibration_abort_frames() == ("570f470502",)
    asyncio.run(device.calibration_command("route_start"))
    assert device.calibration_abort_frames() == ("570f47010a01",)
    assert [c.args[0] for c in device.request.call_args_list] == [
        "570f470501", "570f4704020001", "570f47010b010100"]
