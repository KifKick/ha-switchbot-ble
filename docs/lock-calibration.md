# Lock (first generation) and Lock Lite calibration

Source: the SwitchBot app 10.10 and the devices.

All frames are plaintext, before encryption; each is written and its reply awaited. `dev`
is the device byte: `00` for a single lock and `03` for a Dual Lock group.

## Frames

| frame | meaning |
|---|---|
| `570f4e0301 dev c0` | enter calibration mode ("start"; `570f4e030100c0` for a single lock) |
| `570f4e0304 dev c0 00` | record the lock position + door closed |
| `570f4e0304 dev c0 c0` | record the unlock position + door open, in one frame (the later locks use separate frames: `…80 80` unlock position, `…40 40` door open) |
| `570f4e0304 00 40 40` (device byte always 00) | record the door open (magnet), lock locked |
| `570f4e0408 02` | lock type = latch (Night Latch); `…01` would be "normal" |
| `570f4e0303 dev 80` | test unlock |
| `570f4e0303 dev 00` | test lock |
| `570f4e0302 dev` | complete the calibration |
| `570f4e0306 dev` | leave: restore the previous calibration |
| `570e01001e000081 01` / `…81 02` | status notifications on (single lock / group) |
| `570e00` | notifications off |
| `570f4f81 01` / `…81 02` | status read; the reply has the same layout as a notification |

`570f4e0304 dev c0 (0x80 if unlocked | 0x40 if door open)`: byte 6 (`c0`) looks like a mask of
which half of byte 7 is valid: `80` = lock position and `40` = door state. Compare the later
locks' "lock position only" `…80 00` and "door closed only" `…40 00` (?).

Notifications on: these screens send `00 1e` (30) in bytes 3–4, while the app's other
lock code sends `00 20` (32). This looks like a duration in seconds (?). Our library sends `1e`.
A failed frame is retried only when notifications are turned **off**.

The "normal" lock type (`570f4e040801`) is never sent by these wizards. Not used by them
either: normal lock / unlock (`570f4e0101 10|13 00|80|a0`), "move until jammed", and the
later locks' separate lock-position, door-closed and unlock-position frames.

## Status fields the wizards use

App byte `[i]` counts the status byte as index 0. Our parsers get the data without that byte,
as `d`, so app byte `[i]` = our `d[i-1]`. The notification has the same layout as the status
read reply.

| app byte | field | values | our key (`status_classic` = Lock, `status_lite` = Lite) |
|---|---|---|---|
| `[1]` bit 7 | calibrated | | `calibration` ✓ both |
| `[1]` bits 6–4 | lock status | 0 locked, 1 unlocked, 2 locking, 3 unlocking, 4 jammed while locking, 5 jammed while unlocking, 6 latch locked, 7 partially locked | `status` ✓ both (`LockStatus` 4/5 = `LOCKING_STOP`/`UNLOCKING_STOP`) |
| `[1]` bits 3–2 | door status (2 bits) | not used by the wizards; the app's status parser reads bit 3 as "door state source" (?) | Lock: only bit 2 → `door_open`; Lite: none |
| `[1]` bit 1 | direction | logged only | none |
| `[2]` bit 7 | group (Dual Lock) | | none |
| `[3]` × 2 | knob angle (degrees, 2° steps) | | `knob_angle` = `d[2] * 2` |
| `[11]` & 0x03 (only if the frame has ≥ 12 bytes, not a group) | lock type | 0 = unknown / not reported (older firmware or a short frame), 1 = normal, 2 = latch (Night Latch) | `latch_type` = `d[10] & 3` |
| `[11]` bit 7 | motor self-adjusting after a jam (Lite: "Emergency Power initiated") | | `self_adjusting` = `d[10] & 0x80` |
| battery | not in the notification for a single lock (the app shows a stored value) | | `battery` from the advertisement |

Group layout: `[4]` master battery/charge, `[5]` slave online/calibrated/status, `[7]`×2 slave
angle, `[8]` slave battery/charge; the lock type is always 0.

## Which wizard, and when

- **Lock**: a calibration screen followed by a test screen. Entry points:
  - after installation, "Calibrate" in the install guide (with the magnet guide first), or the
    video / step guide (without it);
  - Settings → Recalibrate, and the "lock jammed" help page;
  - Settings → Night Latch. This switch exists only for the Lock (not the Lite), not in a
    Japanese locale, and not for a Dual Lock ("Dual Lock does not support setting night
    latch."). It needs firmware 6.4 (BLE version 64); older firmware gets an upgrade prompt.
    Turning the switch on asks whether to recalibrate now; OK opens the wizard in "Night
    Latch" mode. Turning it off asks the same and opens the wizard in "no latch" mode. The
    setting itself is stored in the cloud, and the test screen saves it.
- **Lock Lite**: its own wizard (from the install guide, Settings → Recalibrate, or the jam
  help), then a success screen. The Lock wizard also has Lite texts, but only a doorbell
  helper sends a Lite there, so that path is treated as legacy and not described (?).
- Firmware 6.4 (BLE version 64) also gates Next in the Lock wizard (see below).

## Lock (gen 1): calibration screen

On connect: wait 300 ms, send **start**. If the reply is not OK, send it once more; if that
fails too, show "Failed to connect to your device" and go on. Then notifications on
(`570e01001e00008101`). Title: "Calibrate Lock".

The magnet guide (installation only) is shown first; otherwise the wizard starts at the
locked step. Next is enabled or disabled per step:

| step | what the user sees | Next sends | gating / waits |
|---|---|---|---|
| magnet guide (installation only) | how to stick the magnet to the door frame (less than 30 mm from the lock, press it for over 60 s); button "Calibrate" | nothing | always enabled |
| locked | "Close your door and lock your device manually. Then tap Next."; link "Reinstall SwitchBot Lock" | remember the current angle, then **lock position + door closed** (`570f4e030400c000`), 500 ms | always enabled (no angle check) |
| unlocked, normal | "Now turn your device thumbturn until your door is fully unlocked, then release the thumbturn slowly." | remember the angle, then **unlock position + door open** (`570f4e030400c0c0`), 500 ms | enabled by the next notification whose angle differs from the remembered one, and, from firmware 6.4 (not when adding a Dual Lock slave), a reported lock type ≠ 0. Latch detection runs here (below) |
| unlocked, Night Latch mode | turn the thumbturn until the door is unlatched, then within 3 s release it where the latch just extends (animated picture) | as normal, but **no frame** (the lock type frame was sent instead) | Next forced active once the latch is detected |
| ready to test | "Open your door and lock your SwitchBot Lock. Hold the door tightly against the door frame and then tap Next."; link to a video guide | loading, notifications **off**, 500 ms, **door open** (`570f4e0304004040`, device byte always 00), then the test screen (with the Night Latch choice) | enabled again when the angle differs from the remembered one (+ the lock type rule) |

**Latch detection** (Lock only, on the unlocked step, once per visit):

- Night Latch mode:
  - lock type 2: the lock has a latch; send **lock type = latch** (`570f4e040802`) and enable Next.
  - lock type 1: the first time, show a spinner. A later type-1 notification more than
    **3 s** after that shows "Didn't detect the latch, please recalibrate." (Cancel /
    Recalibrate). Recalibrate turns notifications off and reopens the wizard in the same
    mode (no restore frame is sent (?)).
  - lock type 0: nothing, so the spinner never starts (?).
- Any other entry (not the Night Latch switch), not a Japanese locale, lock type 2: a dialog
  that cannot be dismissed asks "Can you open your unlocked door from the outside without a
  key?" with "No, I need a key" and "Yes, I don't need a key".
  - "No": the lock has a latch; send **lock type = latch** (`570f4e040802`), then press Next.
    This advances only if Next is already active (angle changed and lock type ≠ 0, which
    holds because it is 2) (?).
  - "Yes": no latch; press Next. No frame is sent, so the lock keeps type 2 in its own
    state (?).
- Night Latch switched off: no detection and no latch. The "normal" type frame is not sent
  either (?).

Other controls: "Reinstall SwitchBot Lock" opens the install guide and sends **no frame** (the
lock stays in calibration mode (?)). Back (no confirmation for the Lock): "Connecting to your
device...", **restore** (`570f4e030600`), notifications off (`570e00`), wait 1 s, close.

## Lock (gen 1): test screen

On connect: wait **1.5 s**, then notifications on (`570e01001e00008101`). No start frame: the
lock is still in calibration mode from the previous screen. At start: "Leave a gap, tap Test
Unlocking and SwitchBot Lock will unlock." (Night Latch: the door stays ajar and the lock
stays unlatched for 3 seconds), button "Test Unlocking", link "Recalibrate".

| stage | button | sends | goes on when |
|---|---|---|---|
| 1 | "Test Unlocking" | button disabled, **test unlock** (`570f4e03030080`) | an `unlocked` notification after the tap: "Close your door and tap Test Locking.", button "Test Locking" (enabled), stage 2 |
| 2 | "Test Locking" | button disabled, **test lock** (`570f4e03030000`) | the 3rd `locked` notification after the tap: stage 3, then the completion |
| 3 | "Done" / "Next" / "Test Keypad Touch" | no BLE frame; saves "calibrated" and the Night Latch setting to the cloud, then goes on (keypad test, keypad selection, or back to the lock) | |

Completion: notifications off (`570e00`, retried once), then **complete** (`570f4e030200`).
"Your SwitchBot Lock device was successfully calibrated!" (after a self-adjusting jam: a
warning that the batteries may be too weak). "Recalibrate" is hidden.

There is no timeout on either test: the button stays disabled until the state arrives or a
jam shows. Notifications within **400 ms** of a test command are ignored.

Jam: a notification with lock status 4 or 5 (and not 2 / 3) resets the `locked` count and
shows the jam dialog, unless the recalibrate dialog is up. The dialog ("Jammed") lists three
checks: the door is not fully closed or something blocks the deadbolt; the lock was not
installed as the guide says (reinstall and recalibrate); contact customer support. Buttons
"Recalibrate", "Reinstall", "contact our customer support":
- Recalibrate (same as the "Recalibrate" link): notifications off, then the wizard again
  (not in Night Latch mode, so latch detection asks again). No restore frame is sent (?).
  The Lite first asks "You will lose the data of the calibrated part. Recalibrate your
  device?" (Recalibrate / Cancel).
- Reinstall: notifications off, then the install guide.

Status byte `[11]` bit 7 (self-adjusting) shows a blocking overlay "Jammed,
self-adjusting..." (Lite: "Emergency Power initiated"); while it shows, the buttons are
ignored.

Back: "Connecting to your device...", **restore** (`570f4e030600`), wait 1 s, close. There is
no confirmation and no notifications off (?). Backing out after the calibration has completed
therefore sends the restore frame too (?).

## Lock Lite

On connect: as the Lock: 300 ms, **start** (`570f4e030100c0`, retried once), notifications on
(`570e01001e00008101`). Title "Calibrate Lock Lite". The Lite has no door sensor, and none of
its steps records a door state.

| step | text | buttons | what a button sends |
|---|---|---|---|
| 0 | "Rotate the thumbturn until the deadbolt fully extends." / open the door to check the lock | Next (active); "Reinstall Lock Lite" | Next: remember the angle, **lock position + door closed** (`570f4e030400c000`), 500 ms; step 1 at once, without waiting for the reply. Reinstall: notifications off, **complete** (`570f4e030200`), then the install guide |
| 1 | "Rotate the thumbturn until the deadbolt disengages." | "Test Locking" (inactive); "Recalibrate" | the inactive button shows "Please unlock your device and tap Test Locking.". Step 2 as soon as a notification reports an angle different from the remembered one (any change, no ≥ 10° rule, no lock type rule) |
| 2 | same text | "Test Locking" (active) | "Locking...": remember the angle, **unlock position + door open** (`570f4e030400c0c0`), 500 ms; then (even if it failed) **test lock** (`570f4e03030000`). On the 3rd `locked` notification: step 3 |
| 3 | "Check if the deadbolt fully extends." / then tap Test Unlocking | "Test Unlocking" | "Unlocking...", **test unlock** (`570f4e03030080`). On the first `unlocked` notification: step 4 |
| 4 | "1. Keep your device unlocked and close your door." / "2. Tap Next." | Next | "Locking...", **test lock** (`570f4e03030000`). On the 3rd `locked`: completion |

Completion: notifications off (`570e00`), **complete** (`570f4e030200`), "calibrated" saved,
then "Calibrated successfully" with "Finish". The app then checks keypad binding in the cloud
(no BLE) and offers the keypad test, the Dual Lock slave, keypad selection, or the lock page.

Jam (steps 2–4 only): lock status (or the slave's) 4 / 5 and neither is 2 / 3 → the `locked`
count resets and the jam dialog shows (same texts as above), once until the next test frame.
Dialog buttons:
- Recalibrate: notifications off, **complete** (`570f4e030200`), then the wizard again.
- Reinstall: the same exit, then the install guide.

"Recalibrate" (steps 1–4) asks "You will lose the data of the calibrated part. Recalibrate your
device?" (Retry / Cancel). Retry exits as above.

Back (always, any step): "Calibration not finished. You will lose the data of calibrated part
after returning. Return?" (OK / Cancel). OK: "Connecting to your device...", **restore**
(`570f4e030600`), notifications off (`570e00`), 1 s, close.

Note that the Lite's recalibrate and reinstall exits send **complete**, not restore. The
partial calibration is therefore committed before the restart, while only Back restores the
previous one (?).

## Dual Lock (skipped)

For a group the device byte is `03` in start, lock position, unlock position, test, complete
and restore; the door-open frame keeps `00`. Notifications on end in `02`, and the status read
is `570f4f8102`. The notification uses the group layout: the lock type is always 0, the slave
status / angle are in `[5]` / `[7]`, and the batteries in `[4]` / `[8]`. Every gate waits for
both lock bodies: Next needs both angles changed, test success needs both bodies in the same
state, and a jam on either body counts. Groups have their own pictures and texts. Latch is not
offered for a group. One of the app's code paths sends the device byte `00` for a group too,
which looks like a bug in the app.

## Open questions

- What byte 6 of `570f4e0304` means (`c0` / `80` / `40`), and whether `c0 c0` (unlock + door
  open) equals the later locks' unlock-position frame followed by door-open for this
  firmware (?).
- Why the Lock's unlock step sends the door-open bit, and the ready-to-test step then sends
  door-open again with the door really open (?).
- Lock type 0 / 1 / 2: is 1 "normal deadbolt" and is 0 "not yet measured"? Which firmware
  (BLE version ≥ 64 = 6.4?) reports it (?).
- Door status bits 3–2: values, and whether bit 3 really is the "source" (?).
- Is the notification laid out exactly as the status read reply (app index 1 = our `d[0]`)?
  Assumed from the status reply and our working Lock Pro parsing (?).
- Notification duration byte `1e` vs `20` (?).
- Night Latch off: how the lock leaves latch mode without the "normal" type frame (?).
- Test screens have no timeouts. Should our wizard add one, as the Lock 2 wizard has
  (60 s) (?).
- The Lite exits with complete on recalibrate / reinstall, and the Lock with notifications off
  only. Both are probably harmless, because the new wizard sends start again (?).
- What counts as an OK reply for the start retry. We assume status `01` (?).

## What ha_switchbot_ble does

- **Library.** `Lock` and `LockLite` are `CalibratedLock`s (`lock_base.py`, shared with
  `ExtendedLock`). Their `calibration_steps` = `CLASSIC_CALIBRATION`: `start`,
  `set_lock_position_door_closed` (`030400c000`), `set_unlock_position_door_open`
  (`030400c0c0`), `set_door_open` (`0304004040`), `set_latch_type` (`040802`), `test_unlock`,
  `test_lock`, `complete`, `recover`. The status of both gets `classic_extras`: `knob_angle` =
  `d[2] * 2`, and on frames of 11+ bytes `latch_type` = `d[10] & 3` and `self_adjusting` =
  `d[10] & 0x80`. Lock Vision / Vision Pro keep their parsers unchanged (their layout is not
  verified).
- **Panel backend** (`panel/locks.py`). Lock and Lock Lite are calibratable locks. New action
  `notify_off` (`570e00`). The status has `latch_type` and `self_adjusting`. Automatic
  calibration is offered only to Lock Ultra / Ultra Max.
- **Wizard** (`calibration-flows.ts`). The `lock1` flow (Lock) is l1 → l2 → (latch1) → l3 → l4 → l5:
  - l1 sends lock position + door closed and is always enabled.
  - l2 is enabled after any knob move, and also needs `latch_type != 0` when the lock reports
    it. Next sends `030400c0c0`. If the lock reports `latch_type == 2`, it first asks the app's
    question "Can you open your unlocked door from the outside without a key?". "No, I need a
    key" sends lock type = latch and skips the unlock frame; "Yes" sends the unlock frame as usual.
  - l3: the door is held against the frame and the lock is locked by hand. Next sends
    notifications off, then door open, then notifications on.
  - l4 test unlock, l5 test lock.
  - The end sends notifications off and complete.
- **Wizard, `lite` flow** (Lock Lite): t1 sends lock position + door closed. t2 is enabled after
  any knob move, and Test Locking sends `030400c0c0` and then test lock. Then t3 test unlock,
  then t4 close the door, which sends test lock. The end sends notifications off and complete.
  "Calibrate again" in the jam dialog sends notifications off and complete first, as the app
  does.
- **Design decisions:**
  - The Night Latch setting is not stored. The wizard asks when the lock reports a latch,
    so the app's Night Latch switch and its "Didn't detect the latch" path are not modelled.
  - The tests time out after 60 s, like the other wizards; the app waits forever.
- **Not done:** Dual Lock; the magnet guide; the "Reinstall" link; the keypad steps after the
  success screen.
- **Untested on hardware:** not tried on a real Lock or Lock Lite. Checked against the app's behaviour and
  in demo mode only.
