"""What Meter, Meter Plus and the Indoor/Outdoor Thermo-Hygrometer share.

Advertisement (manufacturer data, MAC in bytes 0-5):

* mfr[8]  bits 0-3: tenths of a degree
* mfr[9]  bit 7: sign (1 = positive), bits 0-6: whole degrees Celsius
* mfr[10] bit 7: display in Fahrenheit, bits 0-6: humidity %

Older firmware without manufacturer data puts the same 3 bytes at service
data 3-5; the battery is service data byte 2.

On-device calibration ("compensation" in the app), over a plain connection:

* ``57 0f 37``           read  -> ``01 TT HH DD``
* ``57 0f 36 TT HH DD``  write

``TT`` bit 7 = positive, bits 0-6 whole °C; ``HH`` bit 7 = positive, bits 0-6
whole %; ``DD`` bits 0-3 tenths of a degree. The sensor applies it itself, so
display, app and advertisements all show corrected values.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

from ...core.device import Device

READ_CALIBRATION = "570f37"
WRITE_CALIBRATION = "570f36"

MAX_TEMPERATURE_CALIBRATION = 20.0
MAX_HUMIDITY_CALIBRATION = 50


def decode_climate(raw: bytes) -> dict[str, Any]:
    """The 3 temperature / humidity bytes; {} for the all-zero placeholder."""
    whole, humidity = raw[1] & 0x7F, raw[2] & 0x7F
    temperature = whole + (raw[0] & 0x0F) / 10
    if not raw[1] & 0x80:
        temperature = -temperature
    if temperature == 0 and humidity == 0:
        return {}
    return {"temperature": temperature, "humidity": humidity}


def parse_climate(service: bytes | None, mfr: bytes | None) -> dict[str, Any]:
    raw = mfr[8:11] if mfr and len(mfr) >= 11 else None
    if raw is None and service and len(service) >= 6:
        raw = service[3:6]
    if raw is None or not (data := decode_climate(raw)):
        return {}
    data["battery"] = service[2] & 0x7F if service and len(service) >= 3 else None
    return data


@dataclass(frozen=True)
class Calibration:
    temperature: float  # °C, 0.1 resolution
    humidity: int  # %

    def as_dict(self) -> dict[str, float | int]:
        return asdict(self)


def encode_calibration(temperature: float, humidity: int) -> bytes:
    tenths = round(abs(temperature) * 10)
    whole, frac = divmod(tenths, 10)
    if whole > 0x7F or abs(humidity) > 0x7F:
        raise ValueError("calibration out of range")
    t_byte = (0x80 if tenths and temperature > 0 else 0) | whole
    h_byte = (0x80 if humidity > 0 else 0) | abs(humidity)
    return bytes((t_byte, h_byte, frac))


def decode_calibration(raw: bytes) -> Calibration:
    temperature = (raw[0] & 0x7F) + (raw[2] & 0x0F) / 10
    humidity = raw[1] & 0x7F
    return Calibration(
        round(temperature if raw[0] & 0x80 else -temperature, 1) + 0.0,
        humidity if raw[1] & 0x80 else -humidity,
    )


class ThermoHygrometer(Device):
    """Thermo-hygrometer with on-device calibration."""

    parse = staticmethod(parse_climate)

    async def get_calibration(self) -> Calibration:
        reply = await self.command(READ_CALIBRATION, "reading calibration", ok={1}, min_length=4)
        return decode_calibration(reply[1:4])

    async def set_calibration(self, temperature: float, humidity: int) -> Calibration:
        temperature, humidity = round(float(temperature), 1), int(humidity)
        if abs(temperature) > MAX_TEMPERATURE_CALIBRATION or abs(humidity) > MAX_HUMIDITY_CALIBRATION:
            raise ValueError(
                f"calibration {temperature} °C / {humidity} % out of range"
                f" (±{MAX_TEMPERATURE_CALIBRATION} °C, ±{MAX_HUMIDITY_CALIBRATION} %)"
            )
        await self.command(
            bytes.fromhex(WRITE_CALIBRATION) + encode_calibration(temperature, humidity),
            "writing calibration", ok={1},
        )
        return await self.get_calibration()

