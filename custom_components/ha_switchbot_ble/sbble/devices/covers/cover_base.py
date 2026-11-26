"""Shared by Curtain, Curtain 3, Curtain Track 4, Roller Shade and Blind Tilt.

Positions: Home Assistant's 0 = closed … 100 = open. The app's curtains and
the roller shade use 0 = open … 100 = closed, so they are reversed
(``reverse``); the blind tilt is not (0 closed down, 50 open, 100 closed up).

Like the app's control pages, a move is one frame; afterwards the motion
state is read every second until the device stops (at most five minutes),
then the full state once (``_follow_motion``). Opening / closing comes from
the device when it reports a direction, otherwise from the move's target.
The device clock is set on every new connection (``57000501 <UTC s>``).
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, ClassVar

from ...core.advertisement import Advertisement
from ...core.connection import RETRY_ERRORS
from ...core.device import OK, Device
from ...core.errors import OperationError

_LOGGER = logging.getLogger(__name__)

COVER = "570f4501"  # curtain family: move / stop
POLL_INTERVAL = 1.0  # s, as the app
POLL_LIMIT = 300  # polls (5 min, the roller shade page's limit)
POLL_FAILURES = 3  # failed reads in a row end the polling

# app's motion state names
STOPPED, OPENING, CLOSING = "stopped", "opening", "closing"


def clamp(value: int) -> int:
    return max(min(value, 100), 0)


class CoverBase(Device):
    """Moving cover: one-frame moves, motion polling and direction."""

    reverse: ClassVar[bool] = True
    position_key: ClassVar[str] = "position"
    sync_clock_on_connect = True

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self._is_opening = False
        self._is_closing = False
        self._motion_task: asyncio.Task[None] | None = None

    # --- state -------------------------------------------------------------------------------

    def is_opening(self) -> bool:
        return self._is_opening

    def is_closing(self) -> bool:
        return self._is_closing

    def get_position(self) -> Any:
        return self.data.get(self.position_key)

    def _adjust(self, position: int) -> int:
        """Home Assistant position <-> app position."""
        return 100 - position if self.reverse else position

    def _set_motion(self, motion: str | None) -> None:
        self._is_opening = motion == OPENING
        self._is_closing = motion == CLOSING

    def _direction(self, old: int | None, new: int | None) -> str | None:
        """Opening / closing when going from ``old`` to ``new`` (HA scale)."""
        if old is None or new is None or old == new:
            return None
        return OPENING if new > old else CLOSING

    def _direction_to(self, target: int) -> str | None:
        return self._direction(self.get_position(), target)

    # --- advertisements -------------------------------------------------------------------------

    def _advertisement_received(self, previous: dict[str, Any], adv: Advertisement) -> None:
        motion = adv.data.get("motion")
        if motion is not None:  # the device says it (roller shade)
            self._set_motion(motion)
        elif self._motion_task is None and self.position_key in adv.data \
                and previous.get(self.position_key) not in (None, adv.data[self.position_key]):
            # moved by the app, a button or by hand: watch it until it stops
            self._set_motion(self._direction(previous.get(self.position_key),
                                             adv.data[self.position_key]))
            self.follow_motion()
        super()._advertisement_received(previous, adv)

    async def read_settings(self) -> dict[str, Any]:
        """What the 6 h settings refresh reads (default: the state)."""
        await self.update()
        return self.data

    # --- motion polling ---------------------------------------------------------------------------

    async def read_motion(self) -> bool:
        """Read the motion state (merged into ``data``); True while moving."""
        raise NotImplementedError

    def follow_motion(self) -> None:
        """Poll the motion state in the background until the device stops."""
        if self._motion_task is not None:
            self._motion_task.cancel()
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            return
        self._motion_task = loop.create_task(self._follow_motion())
        self._tasks.add(self._motion_task)
        self._motion_task.add_done_callback(self._motion_done)

    def _motion_done(self, task: asyncio.Task[None]) -> None:
        self._tasks.discard(task)
        if self._motion_task is task:
            self._motion_task = None

    async def wait_motion(self) -> None:
        """Until the background polling has ended (tests, calibration)."""
        if self._motion_task is not None:
            await asyncio.shield(self._motion_task)

    async def _follow_motion(self) -> None:
        failures = 0
        for _ in range(POLL_LIMIT):
            await asyncio.sleep(POLL_INTERVAL)
            try:
                moving = await self.read_motion()
            except (OperationError, TimeoutError, *RETRY_ERRORS) as err:
                failures += 1
                _LOGGER.debug("%s: motion read failed: %r", self.name, err)
                if failures >= POLL_FAILURES:
                    break
                continue
            failures = 0
            if not moving:
                break
            self.notify()
        self._set_motion(None)
        try:
            await self.update()
        except (OperationError, TimeoutError, *RETRY_ERRORS) as err:
            _LOGGER.debug("%s: state read after the move failed: %r", self.name, err)
        self.notify()

    # --- calibration (the panel's wizards run the app's steps; docs/*.md "Calibration") ------------

    # step name -> frames; "{v}" takes the step's value (one byte, ``calibration_values``)
    calibration_steps: ClassVar[dict[str, tuple[str, ...]]] = {}
    calibration_values: ClassVar[dict[str, tuple[int, ...]]] = {}

    def calibration_abort_frames(self) -> tuple[str, ...]:
        """What leaving a wizard half-way sends (cancel, panel closed)."""
        return ()

    def _calibration_frames(self, step: str, value: int | None) -> tuple[str, ...]:
        if step not in self.calibration_steps:
            raise ValueError(f"{step} is not a calibration step of {self.model}")
        frames = self.calibration_steps[step]
        if any("{v}" in f for f in frames):
            if value not in self.calibration_values.get(step, ()):
                raise ValueError(f"{step} needs one of {self.calibration_values.get(step)}, got {value!r}")
            frames = tuple(f.replace("{v}", f"{value:02x}") for f in frames)
        return frames

    async def calibration_command(self, step: str, value: int | None = None) -> bool:
        """Send one wizard step; True when the device took every frame."""
        ok = True
        for frame in self._calibration_frames(step, value):
            reply = await self.request(frame, retry=0)
            ok &= bool(reply) and reply[0] in OK
        _LOGGER.debug("%s: calibration %s -> %s", self.name, step, ok)
        return ok

    async def calibration_poll(self) -> None:
        """The wizards' 1 s status read (merged into ``data``)."""
        await self.read_motion()
        self.notify()

    async def calibration_abort(self) -> None:
        for frame in self.calibration_abort_frames():
            try:
                await self.request(frame, retry=0)
            except (OperationError, TimeoutError, *RETRY_ERRORS) as err:
                _LOGGER.warning("%s: leaving the calibration failed (%s): %s", self.name, frame, err)

    # --- commands ---------------------------------------------------------------------------------

    async def _send(self, command: str, what: str) -> bool:
        """One frame; True when the device took it (no retry: a move must not repeat)."""
        reply = await self.request(command, retry=0)
        if not reply:
            raise OperationError(f"{self.name}: no reply to {what}")
        return reply[0] in OK

    async def _move(self, command: str, target: int | None, what: str = "move") -> bool:
        """Send a move to ``target`` (HA scale; None = unknown) and follow it."""
        if done := await self._send(command, what):
            self._set_motion(None if target is None else self._direction_to(target))
            self.notify()
            self.follow_motion()
        return done

    async def _stop(self, command: str) -> bool:
        done = await self._send(command, "stop")
        if done:
            self._set_motion(None)
            self.notify()
            self.follow_motion()  # reads the final position once stopped
        return done
