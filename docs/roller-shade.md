# SwitchBot Roller Shade: app protocol

Product: SwitchBot Roller Shade (battery with an optional solar panel; BLE only, reachable over LAN or the cloud only through a Hub).

Analysis of 2026-11-24. Source: the SwitchBot app 10.10; nothing was tested on a device. **(?)** marks items that are not proven.

All writes from the app are **not encrypted**.

**Our code:**
- Library: `sbble/devices/covers/roller_shade.py`, shared `sbble/devices/covers/cover_base.py`.
- Integration: `catalog/devices.py` (`roller_shade`), `cover.py` (speed → mode), `const.py` (`ROLLER_SHADE_SPEED_TO_MODE`).

## 0. Product, type codes and adv id

| Item | Value |
|---|---|
| Cloud type / code | `WoRollerShade` ("Roller Shade"); group type `WoRollerShadeGroup` |
| Service-data model byte | `0x2C` (`,`) normally; `0x0C` in pairing mode (`sd[0] & 0x7F == 44`, or pairing mode) |
| 4-byte product id | None. The roller shade uses the old one-byte model scheme (model byte 44) |
| Encryption | **None.** The app never encrypts a roller shade frame |
| Transport | BLE when scanned, else the cloud via a Hub. A Hub LAN path is used only for the function-page read, the single-device read, the move and the stop, and only for a shade that is not grouped |
| Firmware | **No feature gates.** The app offers a firmware update when a newer version exists and refuses it at battery ≤ 20 % |

Position convention (app): **0 = fully open (rolled up), 100 = fully closed (rolled down)**. For display only, the UI snaps values < 3 to 0 and > 97 to 100. Group members count as "equal" when both are ≤ 2, both are ≥ 98, or both are in between.

Motor mode: `0` performance, `1` quiet ("QuietDrift", a steady 100 cm/min).

Control source byte: `1` app, `5` NFC, `3` the default for fabric cutting.

### Shared with the curtain family

- Same frame scheme `57 0F <class> …` and the same generic commands: `5702` basic info, `570002` hardware version, `5708`/`5709` timers, `57000501` time sync, OTA.
- Curtain, Curtain 3 and Blind Tilt use command class **`570F45`** for control and the `5702` reply for state. The roller shade uses **`570F47`** for writes and **`570F48`** for reads, a different command set; the curtain `570F4501…` frames do not apply.
- The app reuses some curtain / blind UI texts but none of their frames.
- Advertisement: like the Blind Tilt, all state is in the manufacturer data after the 6-byte MAC, with a sequence byte at `mfr[6]` and the light level in a high nibble. Unlike the curtains, the service data carries only the model byte and a battery fallback.

## 1. Advertisement

Manufacturer data id `2409` (`0x0969`), with the MAC in `mfr[0:6]`. The app parses it only when `len(mfr) >= 11`.

| Byte | Bits | Meaning |
|---|---|---|
| `mfr[6]` | 0-7 | Sequence number |
| `mfr[7]` | 1-2 | Motion: 0 stopped, 1 opening, 2 closing |
| `mfr[7]` | 0 | "Connection allowed" flag. For a shade that is not grouped, the app treats the group state as abnormal when this is 0 or the chain length is > 1 |
| `mfr[8]` | 7 | **Calibrated.** When it is 0 the control page shows "Device not calibrated and cannot be used" |
| `mfr[8]` | 0-6 | Position 0-100 (0 open, 100 closed) |
| `mfr[9]` | 4-7 | Light level 1-10 |
| `mfr[9]` | 0-3 | Device-chain (group) length; 1 = single |
| `mfr[10]` | 4-5 | Crash reason: 0 none, 1 hard fault, 2 / 3 watchdog resets |
| `mfr[10]` | 0-3 | Motor stop reason: 0 none, 1 move timeout, 2 step timeout (Hall sensor sees no steps), 3 stuck (stall current), 4 target reached, 5 stop command, 6 normal, 7 idle (6 and 7 are used by fabric cutting), 8 fully rolled down, 9 fully rolled up |
| `mfr[11]` | 0-6 | Battery %; if `mfr[11]` is missing the app uses the service data `sd[2] & 0x7F`. The app's low-battery threshold is 10 % (5 % blocks control) |
| `mfr[12]` | 5-7 | Charge status: 0 not charging, 1 adapter charging, 2 solar charging, 3 adapter full, 4 solar full, 5 panel present but not charging, 6 device error. "Solar panel present" = 2, 4 or 5 |
| `mfr[12]` | 3 | Stuck flag. The control page derives "stuck" itself: motion stopped and stop reason 3 (stuck) or 2 (step timeout) |
| `mfr[12]` | 2, 1, 0 | Group "state differs" flags; the home card shows "Inconsistent opening" when any is set. The control page does not read them: it compares member positions itself. What each bit stands for is unknown **(?)** |

Service data: `sd[0] & 0x7F` = `0x2C` (pairing mode `0x0C`); `sd[2] & 0x7F` = battery fallback. Nothing else is read from it.

## 2. Status replies and notifications

Every reply starts with a status byte. The app accepts `0x01`, `0x06` and `0x0E` as success; over the Hub LAN path it first strips a gateway status byte and then accepts only `0x01`.

### Reads

| Read | Cmd | Reply layout (byte 0 = status) |
|---|---|---|
| function-page info | `570F4881` | Needs ≥ 8 B. `[1]` bit 7 = "connection allowed", bits 3-5 = timer count, bits 0-2 = light-action count; `[2]` chain length; `[3..6]` delay time (UTC seconds, BE); `[7]` bit 7 delay mode, bits 0-6 delay target position |
| versions | `570F480405` | Pairs per chain member from `[1]`: (hardware, firmware); a `00 00` pair ends the list |
| battery / solar | `570F480406` | Pairs per member from `[1]`: battery `b0 & 0x7F`, charging state `b1` bits 1-3. The app also takes the **open direction from `b0` bit 0**, which overlaps the battery byte; it is probably `b1` bit 0 as in the single-device read **(?)** |
| status | `570F480407` | Pairs per member from `[1]`: `b0` bits 0-1 motion, bit 2 linked to the next member, bits 3-6 motor stop reason; `b1` bit 7 calibrated, bits 0-6 position. Parsing stops after the first member that is not linked. The control page uses it for a whole group |
| single device | `570F480411 {idx}` | Needs ≥ 7 B. `[1]` hardware, `[2]` firmware, `[3] & 0x7F` battery, `[4]` bit 0 open direction (0 reverse, 1 standard), bits 1-3 charging state, `[5]` bits 0-1 motion, bit 2 linked, bits 3-6 stop reason, `[6]` bit 7 calibrated, bits 0-6 position. `idx` 0 = the connected device, n = the n-th member down the chain. **The main state read**: the calibration pages and the control page poll it (section 4; control page section 3) |
| chain info | `570F480201` | `[1]` chain length (polled during grouping) |
| delay | `570F4806` | `[1..4]` UTC seconds BE, `[5]` mode, `[10]` target position (0 if the reply is < 11 B) |
| light summary | `570F480300` | `[2] & 0x0F` light-action count |
| light action i | `570F480301 {i}` | Needs ≥ 10 B. `[1]` bits 6-7 enabled, bits 4-5 threshold option (0 none, 1 above, 2 below), bits 0-3 level; `[2]` bit 0 mode; `[3]` repeat bitmask (bit 0 Sunday … bit 6 Saturday); `[4]` start hour, `[5]` minute (**UTC**); `[6..7]` window length in minutes, BE; `[12]` target position (the app's length check does not cover `[12]` **(?)**) |
| light history | `570F480303 {range} {page}` | Sent twice, page `00` then `01`. Reply: `[2]` start hour, `[3..14]` 12 hourly bytes (high nibble max, low nibble min, capped at 10; `0xFF` = no data). `range` is the chart tab: 1 = 24 h (default), others "last 3 days" / "last 7 days" (exact values **(?)**). Some app tables call `570F480303` "light trigger source", but this is what the app sends |
| log count | `570F48040000` | `[1..2]` total, BE |
| log entry | `570F48040001 {idx 2 B BE}` | ≥ 9 B: `[1..4]` UTC, `[5]` action, `[6]` source, `[7]` motor status / bit 0 action mode, `[8]` end position. (The app reads `[7]` with an operator-precedence bug: it masks `& 0x0F` instead of shifting the high nibble) |
| fabric-cut status | `570F480108` | `[1]` bit 4 cut mode, bits 0-3 motor status. The app maps it to 1 running (mode 1, motor 6), 4 running without cutting fabric (mode 1, motor 7), 3 stuck (motor 2 or 3), 2 paused (anything else) |
| timers | `570802` / `5708 {i<<4 \| 6}` | Generic timer protocol, see section 5 |
| basic info | `5702` | Used only by the generic firmware-update flow (`[2]` = firmware). The app never reads roller-shade state from `5702`; the other bytes are not proven **(?)** |
| hardware | `570002` | Generic; `[2]` hardware version (firmware-update flow) |

Known, but never sent by the app **(?)**: `570F4805` "calibration info", `570F4808` "fault status", `570F480302` "read light level", `570F480305` "light level of all devices", `570F48040002` "silent background log extraction".

### Notifications

The app can start and stop BLE notifications for the shade (whether a BLE enable frame is written is unknown **(?)**), but the control pages never do: they rely on advertisements and the replies to their own polling. Frame format: `FF {cmd} {2 B per chain member}…`:
- `cmd 05`: (hardware, firmware) per member;
- `cmd 06`: battery `b0 & 0x7F`, charging state `b1` bits 1-3;
- `cmd 07`: the same 2-byte status as `570F480407` (motion, linked, stop reason, calibrated, position);
- `cmd 08`: chain change / length (ignored by the app).

The app's command tables list these as `570F480005`-`570F480008` ("report …").

## 3. Control commands

| Command | Cmd | Meaning |
|---|---|---|
| move (whole chain, default) | `570F4701 05 {src} {mode} {pos}` | Move to `pos` 0-100 (0 open, 100 closed), `mode` 0 performance / 1 quiet, `src` 1 app / 5 NFC. "Device chain unified action"; it also works for a single shade. Open = pos 0, close = pos 100 (NFC on / off; home-card shortcuts `[0, 100]`) |
| move (one member) | `570F4701 04 {src} 01 {mode<<7 \| pos}` | Used when one member of a group is selected, addressed by connecting to that member's MAC. The `01` is probably a member count **(?)** |
| stop | `570F47010A01` | "Device chain unified stop" |
| toggle | `570F470106 {src} 01` | Open-stop-close-stop cycle (NFC toggle, `src` 5) |
| locate | `570F47010C` | Brief roll to identify the device ("Tap device icon. The device will then start rolling…") |
| fabric cut | `570F470108 {src} {act}` | act 1 start / 0 stop; `src` 3 (section 5) |
| route correction | `570F47010B0101 {x}` | `x = 00` start, `x = 01` confirm the rolled-up position (section 4B) |

How the control page behaves:
- **On open:** sends the time sync (`57000501 {UTC seconds, 8 B BE}`) when the shade is scanned over BLE.
- **Moving:** sends the move with `mode = 1` only while the page's "QuietDrift Control" switch is on. The switch is "only valid on this page"; the motor mode is **not stored on the device**.
- **After a move:** polls the single-device read `570F480411 00` (or `570F480407` for a group) every 1 s until the motion is stopped, for at most 5 min. While the page is open it also polls every 15 s.

Known, but never sent by the app **(?)**: `570F470100` forced stop, `570F470101` move to position (%), `570F470103` move to position (cm), `570F470104` move with mode, `570F470105` chain unified action, `570F470107` chain shortcut 2 (move-stop, for remotes), `570F470109` debug control (works uncalibrated), `570F47010D` reset motor state.

## 4. Calibration

**Parameter values:**
- Open direction: `0` reverse = "Reverse roll" (recommended inside the window frame, e.g. when windows have handles), `1` standard = "Standard roll" (outside the frame).
- Jog direction: `1` up (roll up), `2` down.
- Record type: `2` = mechanical fully rolled-up reference, `0` = user's open (rolled-up) position, `1` = user's closed (shading) position.

**Frames** (BLE only):

| Step | Cmd |
|---|---|
| start calibration | `570F470501` |
| set direction | `570F47040200 {dir}` |
| roll to fully up | `570F470503` (roll up until the motor stops at the top) |
| jog | `570F470504 {1 up \| 2 down}` |
| pause | `570F470505` |
| record current position | `570F47050900 {type}` |
| complete | `570F470506` |
| exit | `570F470502` |
| status poll | `570F480411 00` |

**Where the wizard starts:**
- **Device menu or home card "not calibrated":** the direction page of the full wizard.
- **Settings → Calibrate:**
  - not calibrated → the full wizard;
  - calibrated → a chooser offering "Recalibrate" (full wizard) or "Route Correction" (4B);
  - grouped → a member list, where each member is calibrated alone over its own BLE connection: uncalibrated → full wizard, calibrated → the same chooser.
- **After adding a device:** install guide → optional fabric cut → the full wizard.

There is no separate direction setting: the rolling direction is changed only by recalibrating.

### 4A. Full calibration

The wizard has four numbered steps (1/4 … 4/4). Each step waits for the motion state, the motor stop reason, the BLE connection state and the scan state; these come from advertisements and the poll replies.

1. **Direction (1/4, "Choose the rolling direction").** The user picks Standard (`1`) or Reverse (`0`). No BLE traffic. "Next" opens the calibration page.
2. **Calibration page opens.** A guide appears once. Then:
   - Start calibration, then set direction `{direction}`. Either failing → toast "connect failed", wizard stays.
   - Roll to fully up ("Your Roller Shade is rolling up…", button **Pause**).
   - From here on, `570F480411 00` is polled every 1 s.
   - Exit condition: the motion becomes stopped, or 3 successful polls in a row see it stopped → the "stopped" question (step 3).
   - **Pause** → pause frame; button **Start** → roll to fully up again.
3. **"Stopped" question (2/4, "Your device stopped rolling. Check whether it's stuck").**
   - **Rolled Up** → record `02` (rolled-up reference) → step 4.
   - **Stuck** → instructions; **Continue Calibration** → roll to fully up again (back to 2), or a feedback link.
4. **Open position (3/4, "Set your Roller Shade's rolled-up position").**
   - Jog buttons: first tap → jog `{1|2}` and the 1 s poll starts; tapping the same button again → pause.
   - When the motion stops the page checks the stop reason:
     - stuck (3) or step timeout (2) → dialog "Device Exception — check for obstructions" with **Recalibrate** (exit, page closes);
     - fully rolled up (9) → toast "fully open";
     - fully rolled down (8) → toast "fully rolled".
   - **Next** → record `00` (open position) → step 5.
5. **Closed position (4/4, "Set your Roller Shade to a shading position you like").**
   - Same jog buttons. **Finish** stays disabled until the user has jogged at least once on this step.
   - **Finish** → record `01` (closed position), then after 300 ms complete.
   - If complete fails → dialog "The fully open position you've set is below or the same as the fully closed position. Please recalibrate." (**Recalibrate** → exit).
6. **Done ("Calibration successful").** 500 ms later the app reads `570F480411 00` again to refresh the calibrated flag. It offers pairing a Remote, or "Start using" back to the control page.

**Abort paths:**
- Back / Android back on any step → dialog "Exit Calibration — Calibration not finished. You will lose this data" → **BACK** sends exit.
- BLE connection lost → dialog "Device Connection Error" → **Recalibrate** sends exit and leaves.
- The poll stops when the page loses focus.

**Calibrated flag:** advertisement `mfr[8]` bit 7, single-device read `[6]` bit 7, `570F480407` per member. The device sets it after a successful complete. While it is 0 the control page blocks control ("Device not calibrated and cannot be used"). The power-off notice "Your Roller Shade's rolling route has been changed during power-off. Please recalibrate it." suggests the firmware clears the flag when the shade is moved while unpowered **(?)**.

### 4B. Route correction

For a calibrated shade whose route has drifted. Reached from the chooser ("Calibration Mode" → Recalibrate | Route Correction, "Correct operation route if you notice route deviations").

1. **On open:** reads the open direction (default standard) only to pick the animation. Sends `570F47010B010100`: the shade rolls up. The page polls `570F480411 00` every 1 s and watches the motion.
2. **When stopped** (or the 3rd poll still stopped) → the "stopped" question:
   - **Rolled Up** → `570F47010B010101` → done ("Route correction finished");
   - **Stuck** → instructions; **Continue Correction** → `570F47010B010100` again.
3. **Abort:** back → dialog "Exit Route Correction" → **BACK** sends the stop `570F47010A01` (not the calibration exit). A lost connection offers **Try Again** (`570F47010B010100`).

The stored open and closed positions are kept; only the zero reference is re-learned **(?)** (implied by the flow).

## 5. Settings and stored data

**Rolling direction**: chosen only in the calibration wizard; read back as single-device read `[4]` bit 0. There is no other direction setting in the app.

**Motor mode (performance / QuietDrift)**: not a device setting. It is the `mode` field of every move, timer and delay; the control page has a session-only switch, the timer / delay editors a per-entry picker.

**Solar panel**: no setting. A panel is shown as present when the charge status is 2, 4 or 5; otherwise the light-sensing page shows "Solar Panel not detected". The light sensor and the panel share the same hardware view in the UI.

**Timers** (on the device, generic `5708`/`5709` protocol, times in **UTC**; the app converts local time and weekdays to UTC):
- **Count:** `570802` → `[1]` count (3 bits in `570F4881`, so at most 7 **(?)**).
- **Read timer i:** `5708 {i}6` (one byte `i<<4 | 6`). Reply: `[1]` bit 1 enabled, bit 0 mode; `[2]` bit 7 repeat type, bits 0-6 days (bit 0 Sunday); `[3]` hour; `[4]` minute; `[9]` target position.
- **Write timer i:** `5709 {i}6 {b3} {b4} {HH} {MM} 010513 {mode} {pos}`, with `b3 = enabled<<1 | mode` and `b4 = repeatType<<7 | days`.
  - `repeatType` 1 = once.
  - New-timer defaults: enabled, performance mode, every day, the current time, position 50.
- **Reset count:** `57090200`. Sent first when the new list is shorter than the old one, or alone to delete all timers.
- **Time sync:** the control page and the light-automation editor send the time sync before saving.

**Delay (one-shot delayed move)**:
- **Write:** `570F470601 {UTC 4 B BE} {mode} 010514 {mode} {pos}`. The app sets the time to `now (UTC seconds) + delay`.
- **Delete:** `570F470600`. **Read:** `570F4806`.
- Some app tables name `570F470601` "delete delay" and `570F470602` "set delay"; what the app actually sends is as above.

**Light automations** (at most **5** per device, "Up to 5 Automations associated with light level can be added"; grouped members follow the main device):
- **Write action i**, two frames:
  1. `570F470301 {i} 010512 {mode} {pos}` — the action.
  2. `570F470301 {i|0x10} {enabled<<6 | option<<4 | level} {mode} {days} {HH} {MM} {window 2 B BE}` — the trigger.
- **Trigger fields:**
  - `option`: 1 = light above, 2 = below.
  - `level`: 1-10.
  - `HH:MM`: UTC start of the active window.
  - `window`: its length in minutes. It wraps at 1440; 1440 = all day, which is the default.
- On save, the app rewrites **all** actions with indices 0…n-1.
- **Delete all:** `570F470303`. **Read:** `570F480300` + `570F480301 {i}`. **Light history:** `570F480303 …`.
- `570F470302` (set trigger source) is never sent.

**Grouping (device chain, at most 8 shades: the main device + 7)**, BLE only:
- For each selected device in order: `570F47020102 {index} {MAC 6 B} 01`. `index` counts the members already added (0 = the first secondary).
- The app then polls `570F480201` every 1 s (60 s timeout) until `[1] == index + 2`.
- After all devices: the app stores the group (name, main device, MAC list) in the cloud.
- Members should be ordered by physical distance (a-b-c), because each node relays to the next.
- **Disband:** `570F47020100`, then poll until the chain length is 1.
- Remove member (`570F47020104`) is known but never sent; the app deletes a member by disbanding.
- **After grouping:** the secondaries' timers and delays are cleared and the main device's settings apply to all.

**Fabric cutting**, part of installation ("Resize Fabric"; not allowed while grouped):
- Start page → `570F470108 03 01` → running page, which polls `570F480108` continuously (300 ms after each reply).
- **Pause / Start** → `…08 03 00` / `…08 03 01`. Leaving the page → `…08 03 00`.
- The motor turns at a constant speed and the cutter trims the fabric; the device button also stops it.

**Shortcuts** (home card, control page): app-side position lists, default `[0, 100]`. Not on the device.

## 6. Dangerous commands (never send from the integration)

- **BLE OTA** (generic `5704` "enter OTA mode"): firmware update; it can brick the device.
- **`570F470109` debug control**: drives the motor without calibration limits; risk of over-winding the fabric.
- **`570F47010D` reset motor state**: unknown effect on the stored route.
- **Fabric cutting `570F470108 … 01`**: runs the motor continuously for the cutter; only with the fabric roll prepared as in the install guide.
- **Calibration frames `570F4705xx`, `570F470402xx` and route correction `570F47010B…`** outside a supervised wizard. In particular, recording or completing with wrong positions can store an inverted route, and leaving calibration mode without the exit frame leaves the device in calibration.
- **Grouping `570F4702xx`**: changes the device chain and clears the members' timers; the cloud keeps its own group record, which would then disagree.
- Generic pairing / key frames (`5705`-`5707`) and any factory-reset or unbind flow: the app never sends them to a roller shade; do not use.

## 7. Open questions

1. What the group "differs" bits (`mfr[12]` bits 0-2) mean, and the exact `range` values of `570F480303`.
2. Whether `570F480406` really puts the open direction in the battery byte (an app bug?).
3. The full `5702` reply layout on this model (our code relies on it; the app does not).
4. Whether `570F4701 05` with `src = 0` behaves like `src = 1`, and what the `01` in the single-member frame means.
5. Whether the firmware clears the calibrated bit after a power-off move, and whether it refuses a move while uncalibrated (the app blocks control in the UI only).
6. Whether anything (e.g. a CCCD) must be written for notifications. The app's pages do not use them.
7. The maximum timer count (3-bit field, ≤ 7; not limited explicitly by the app).

## 8. Gap vs. our sbble code

Files: `sbble/devices/covers/roller_shade.py`, `sbble/devices/covers/cover_base.py`, integration `cover.py`.

- **Move frames.** `roller_shade.py` sends two frames per move: `570F4701 0100 01 {pos}` (a `570F470101` variant the app never sends) and `570F4701 0500 {mode} {pos}`. The app sends only `570F4701 05 {src} {mode} {pos}`, with `src = 1`; our second frame uses `src = 0`. Suggest sending only `05 01 {mode} {pos}`.
- **Stop.** Ours: `570F4701 000001` (resembles `570F470100` "forced stop"). App: `570F47010A01` (chain stop). Suggest switching to the app frame.
- **State read.** `read_basic_info()` parses `5702` (`[4]` motion/calibrated, `[5]` position), which the app never uses for this model. The app reads `570F480411 00`: `[3]` battery, `[4]` direction + charging state, `[5]` motion + stop reason, `[6]` bit 7 calibrated + position. Our `5702` offsets are unproven.
- **Advertisement.** `parse_roller_shade()` matches the app for motion (`mfr[7]` bits 1-2), calibrated (`mfr[8]` bit 7), position, light level and sequence. Missing:
  - battery from `mfr[11]` (we use `sd[2]` only);
  - chain length (`mfr[9]` low nibble);
  - crash reason and motor stop reason (`mfr[10]`), so no **stuck** detection (stopped + reason 2/3, or `mfr[12]` bit 3);
  - charging state and solar-panel presence (`mfr[12]` bits 5-7);
  - the "connection allowed" flag (`mfr[7]` bit 0).

  We also infer opening/closing from position changes (`cover_base.py::_track`) instead of reading `mfr[7]` (1 = opening, 2 = closing).
- **Motion polling.** After a move the app polls `570F480411 00` every 1 s until stopped (at most 5 min); we rely on advertisements plus one `update()`.
- **Time sync.** The app sends `57000501 {UTC s}` on every control-page open; we never do, so device timers and light automations (UTC-based) may drift if we add them.
- **Not implemented:** toggle (`570F470106`), locate (`570F47010C`), firmware/hardware and battery/solar reads (`570F480405`/`06`), timers, delay, light automations, logs, grouping (we treat each shade alone and ignore chain members other than idx 0), calibration wizard (4A), route correction (4B).
- **Conventions match:** app 0 = open / 100 = closed, reversed for Home Assistant (`reverse = True` in `cover_base.py`); mode 0 performance / 1 quiet (`const.py`).
- **No encryption needed**, consistent with our unencrypted `Device` base.

### Status 2026-11-25 (what ha_switchbot_ble does now)

Done: move `570F4701 05 01 {mode} {pos}`, stop `570F47010A01`, toggle `570F470106 01 01`, locate `570F47010C`; advertisement as in section 1 (motion from mfr[7], battery mfr[11], chain, crash / stop reason, stuck, charge, solar, "connection allowed"); state read `570F480411 00`, polled every 1 s after a move (max 5 min); clock sync once per connection; motor mode kept by Home Assistant (restored after restart); calibration 4A and route correction 4B steps in the library and panel backend (abort: exit, or stop for the route correction), wizard in the panel tab "Calibration" (also in demo mode).
Not done: chain members other than idx 0, timers, delay, light automations, logs, fabric cutting (dangerous). Still unproven **(?)**: toggle with source 1, the direction bit of `570F480406`.
