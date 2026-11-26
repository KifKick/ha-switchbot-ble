"""Bot: press, or on / off in switch mode; optional password (core Device).

Service data: data[1] bit 7 switch mode, bit 6 off (in switch mode),
data[2] battery.

* ``570100`` press, ``570101`` on, ``570102`` off; reply 01 / 05 = done
* ``5702`` basic info: battery, firmware, data[9] bit 4 switch mode
"""

from __future__ import annotations

from typing import Any

from ...core.advertisement import device
from ...core.const import Model
from ...core.device import Device
from ...core.errors import OperationError

PRESS = "570100"
TURN_ON = "570101"
TURN_OFF = "570102"
DONE = frozenset({0x01, 0x05})


def parse_bot(service: bytes | None, mfr: bytes | None) -> dict[str, Any]:
    if service is None and mfr is None:
        return {}
    if service is None or len(service) < 3:
        return {"switchMode": None, "isOn": None, "battery": None}
    switch_mode = bool(service[1] & 0x80)
    return {
        "switchMode": switch_mode,
        "isOn": not service[1] & 0x40 if switch_mode else False,
        "battery": service[2] & 0x7F,
    }


@device("Bot", "H")
class Bot(Device):
    model = Model.BOT
    parse = staticmethod(parse_bot)

    def is_on(self) -> bool | None:
        return self.data.get("isOn")

    def switch_mode(self) -> bool | None:
        return self.data.get("switchMode")

    def _accepts_advertisements(self) -> bool:
        # the Bot keeps advertising the old state while connected
        return not self._conn.connected

    async def read_basic_info(self) -> dict[str, Any]:
        reply = await self.request("5702")
        if reply in (b"\x07", b"\x00"):
            return {}
        return {"battery": reply[1], "firmware": reply[2] / 10.0,
                "switchMode": bool(reply[9] & 0x10)}

    async def press(self) -> bool:
        return await self._operate(PRESS, None)

    async def turn_on(self) -> bool:
        return await self._operate(TURN_ON, True)

    async def turn_off(self) -> bool:
        return await self._operate(TURN_OFF, False)

    async def _operate(self, command: str, on: bool | None) -> bool:
        reply = await self.request(command)
        if not reply:
            raise OperationError(f"{self.name}: no reply to {command}")
        if on is not None:
            self.merge({"isOn": on})
        await self.update()
        return reply[0] in DONE
