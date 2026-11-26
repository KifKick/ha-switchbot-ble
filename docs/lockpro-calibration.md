# Lock Pro calibration

Source: the SwitchBot app 10.10 and the devices.

Lock Pro has a single wizard, and the door sensor is part of it. It has no automatic calibration and no half-lock. Frames are plaintext, before encryption.

1. Start calibration mode (`570f4e030100c0`), then turn status notifications on. The app retries the start every 3 s.
2. Locked position: close the door and turn the knob to the locked position. Send "record the lock position and the closed door" (`570f4e030400c000`). This records the lock position and the closed-door sensor state in one step.
3. On an EU lock (`lock_type` = Europe) whose Night Latch setting was not passed in, ask "Night Latch Lock" (a key is needed to open the unlocked door from outside) or "One-Piece Lock" (no latch, or one the outside handle opens). The question comes after the locked position, not before.
4. Unlocked position: keep the door closed and turn the knob to the unlocked position. Next is enabled after ≥ 10° from the lock angle and, for a night latch, once the lock reports the night latch (`latch_state` 2; the user unlocks fully and releases the knob where the latch extends). Send "record the unlock position" (`570f4e0304008080`). For a night latch, send "record the night latch position" (`570f4e040b`) instead.
5. Open door position: "1. Open and hold your door to leave approx. 10 cm. 2. Manually lock your device. 3. Tap Next." Next is enabled after the knob turned ≥ 10° from the unlock angle. If the magnet alarm (`magnetic_position_alarm`) is set: "Didn't detect the magnet … keep the deadbolt against the door frame", Try Again or Skip (Skip still sends the open-door frame). Send "record the open door" (`570f4e0304004040`).
6. Test unlocking: door ajar, lock locked; the user taps "Test Unlocking": send the test unlock (`570f4e03030080`) and wait for the unlocked state (60 s, then a toast and the step stays).
7. Test locking: close the door, lock unlocked; the user taps "Test Locking": send the test lock (`570f4e03030000`) and wait for the locked state (60 s).
8. Complete the calibration (`570f4e030200`). If it fails, or if the user leaves the wizard, send "restore the previous calibration" (`570f4e030600`); leaving also turns notifications off and reads the status.

A motor jam shows the jam dialog (Recalibrate / Reinstall); no step is repeated where the motor stopped. The Lock Pro status has no battery status, and the app has no low-battery guard for Lock Pro calibration.

The app never sends the calibration type command to a Lock Pro. It drives to the blocked position only for emergency unlocking, not during calibration.

The frames behind these steps are shared with other locks; see `sbble/devices/locks/lock_extended.py` (`CALIBRATION`). Lock Ultra (Lock 2) has its own wizard; see `lock2-calibration.md`.
