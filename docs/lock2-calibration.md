# Lock 2 family (Lock Ultra / Ultra 2 / Ultra Max) — calibration flows

Source: the SwitchBot app 10.10 and the devices.

## Steps → BLE command

| step | BLE (plain, before encryption) |
|---|---|
| start calibration mode | `570f4e0301 00 c0` |
| record the lock position | `570f4e0304 00 80 00` |
| record the lock position + door closed | `570f4e0304 00 c0 00` |
| record the unlock position | `570f4e0304 00 80 80` |
| record the night latch position (EU latch locks) | `570f4e040b` (as on the Lock Pro) |
| record the door open | `570f4e0304 00 40 40` |
| record the door closed | `570f4e0304 00 40 00` |
| test unlock | `570f4e0303 00 80` |
| test lock | `570f4e0303 00 00` |
| complete the calibration | `570f4e0302 00` |
| restore the previous calibration (cancel) | `570f4e0306 00` |
| auto calibration: record unlocked | `570f4e030700 01` |
| auto calibration: record locked | `570f4e030700 02` |
| auto calibration: the lock has a latch (`01`) or not (`00`) | `570f4e0407ffff 00/01` |
| half lock: record the position and test | `570f4e040c0101` |
| half lock: start (Ultra 2 only) | `570f4e040c02` |
| half lock: complete (Ultra 2 only) | `570f4e040c03` |
| status notifications on | `570e01…` |
| status read | `570f4f8107` |

Every flow: on entry start + notifications on; on cancel / back restore, then a status read;
when complete fails → restore. The status the wizard waits on comes from the 0x8107
notifications: the lock state (incl. jammed while locking / unlocking → "blocked" dialog), the
knob angle, and the auto calibration done flag (event byte bit 0x10). Idle timeout 15 s,
otherwise 30–60 s.

## A. Auto calibration (the default)

0. Latch question (EU lock type, Night Latch setting not passed in): "Night Latch Lock"
   (a key is needed to open the unlocked door from outside) vs "One-Piece Lock" (no latch,
   or a latch the outside handle opens) → `Q`. The setting is passed in only when the
   wizard is opened from the Night Latch switch; from "Recalibrate" the app always asks.
1. Unlocked — "1. Open and hold your door. 2. Make sure your device is unlocked"
   (the motor then drives to locked by itself, so the door must be open); night latch tip
   "① the latch stays extended ② the deadbolt disengages". No latch gate here. Next:
   EU: "the lock has a latch" (`Q`); then "auto: record unlocked" (the motor drives to locked).
   Wait for the auto calibration done flag only (30 s, then a toast and the step stays) → step 2.
2. Check locked — "Check if the deadbolt fully extends", buttons Correct / No. Correct:
   "auto: record locked" (the motor drives back to unlocked).
   Wait for the auto calibration done flag → step 3.
3. Check unlocked — "Check if the deadbolt disengages", Correct: complete → test completed.
   No on step 2 / 3 goes to the guided step for that position (each needs a ticked checkbox):
   - guided locked: the user turns to locked, Next: record the lock position → guided unlocked
   - guided unlocked: the user turns to unlocked, button "Test Locking": record the unlock
     position (EU latch: the night latch position), then test lock; on locked (60 s) → test unlocking
   - test unlocking: button "Test Unlocking": test unlock; on unlocked (60 s) → complete
4. Test completed — if the magnet is not calibrated (status `magnetic_position_alarm`):
   "Calibrate Magnet" → door-sensor flow (D), or Skip; then the final lock.
5. Final lock — "Keep your device unlocked and close your door", Next: move to lock, wait for
   locked (20 s) → done.

## B. Manual calibration

0. Latch question (EU) → 1. Locked: the user turns to locked, Next: record the lock position.
2. Unlocked: Next enabled only when the knob angle moved ≥ 10° from the recorded
   lock position and, for a night latch, the lock reports the night latch
   (status `latch_state` = 2; otherwise "Didn't detect the latch…"). Night latch text:
   keep the door closed, unlock fully, release the knob where the latch extends. Next:
   record the unlock position (or the night latch position), then test lock; on locked → test unlocking.
3. Test unlocking: Next sends test unlock; on unlocked → complete → test completed.
4. Test completed → door-sensor flow or the final lock (as A).

"The lock has a latch" is sent only by the auto calibration; the manual calibration and
Lock Pro use the night latch position frame alone.

## C. Half-lock (Lock Ultra EU)

Offered only for the EU lock type (Partially-Lock settings). No start frame;
notifications on; Ultra 2 only: half lock start, once on entry.
Half-lock position: "1. Open your door. 2. Rotate the thumbturn to the partially-locked
position. 3. Next"; Next enabled after ≥ 10° from the angle at entry. Next: half lock record
and test, wait for the half-lock test flag (status `half_lock_calibration_done`;
60 s) → confirm "Check if the deadbolt is half engaged": Correct → Ultra 2: half lock complete,
then the settings page turns Partially-Lock on; No → back to the half-lock position (no new
half lock start). Ultra 2: half lock complete also on every way out of the page.

## D. Door sensor / magnet

Start → open door: "Keep your device unlocked. Open and hold your door to leave
approx. 10 cm … (battery cover closed)", Next: record the door open → close door: "Keep your
device unlocked and close your door … the device locks after magnet calibration". Next: if
the magnet alarm is set → "Didn't detect the magnet", Try Again → open door (nothing sent);
else record the door closed, test lock, wait until the motor stops in any state or 20 s →
complete (on error restore) → completed.

## Common

- Exit (back, cancel): restore, notifications off (`570e00`), 1 s later a status read.
- Start: retried every 3 s.
- Motor blocked during a step: jam dialog with Recalibrate / Reinstall, never "retry the step".
- Low battery (Lock 2 family only): no lock or door calibration when the battery status is
  main low (1) or no main battery (2), or the battery is ≤ 10 % with any status but main
  battery OK (0). Battery status: 0 main OK, 1 main low, 2 no main battery, 3 main and backup
  low, 4 no backup battery.
