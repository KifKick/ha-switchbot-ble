"""Strip Light 3: encrypted strip with RGB and colour temperature."""

from __future__ import annotations

from ...core.advertisement import device
from ...core.const import Model
from ...core.device import EncryptedDevice
from .light_base import ColorMode
from .strip_base import LightStripBase, parse_strip_cw


@device("Strip Light 3", b"\x00\x10\xd0\xb1", b"\x01\x10\xd0\xb1")
class StripLight3(LightStripBase, EncryptedDevice):
    model = Model.STRIP_LIGHT_3
    parse = staticmethod(parse_strip_cw(16))
    color_modes = frozenset({ColorMode.RGB, ColorMode.COLOR_TEMP})
