# SwitchBot Curtain 3: app protocol

Product: SwitchBot Curtain 3 (battery curtain robot for U rail, I rail and rods; optional solar panel; can pair two robots for curtains that open from the middle).

Analysis of 2026-11-24. Source: the SwitchBot app 10.10; nothing was tested on a device. **(?)** marks items that are not proven.

The app drives the Curtain Track 4 (cloud type `W1100000`) the same way; the differences are in [curtain-track-4.md](curtain-track-4.md). Frames are written as hex, `{x}` = 1 byte unless noted.

How the app talks to it: it builds every frame itself and sends it unencrypted over BLE; a reply is OK when it starts with `01` or `06`. Scenes, widgets, NFC tags and buttons use a few older frames (marked "scenes" below).

**Our code:**
- Library: `sbble/devices/covers/curtain_3.py`, `curtain_base.py`, `cover_base.py`.
- Integration: `cover.py` (`SwitchBotCurtainEntity`), `catalog/devices.py` (`curtain_3`), `const.py` (`CURTAIN_SPEED_TO_VALUE`).

## 0. Model ids

| Item | Value |
|---|---|
| Cloud type / code | `WoCurtain3`. No numeric `W…` product code. |
| Service-data model byte | `0x7B` (`'{'`) normal, `0x5B` (`'['`) pairing mode (`b0 & 0x7F == 123` or `== 91`). |
| 4-byte product id | none (old one-letter format). |
| Encryption | **None.** The app encrypts only when the advertisement sets an "encrypted" flag, which a Curtain 3 never does. No key is needed. |
| Original Curtain / Curtain 2 | `WoCurtain`, `0x63` (`'c'`) / `0x43` (`'C'`). Same frame families (`570F45`/`570F46`), see section 9. |

### "Curtain 3 Rod Type"

It is **not** a separate model: there is no extra cloud type, model byte or product id. Rod, U-rail and I-rail robots are all `WoCurtain3`. The mount is reported as the **ear type** in manufacturer byte 11 bits 0-3: `0` → U rail, `1` → rod, `2` → I rail, anything else → U rail. The app only uses it to pick install videos and to tell the cloud the rail type. The app's own rail-type list in the UI uses a different order (`U=0, I=1, ROD=2`); do not mix the two.

The app also knows a "2025" hardware edition: `1 ≤ hardware version < 23` (hardware version from the cloud, not BLE). It only changes guide videos and analytics events.

## 1. Advertisement

Service data `fd3d` (bytes counted from 0 = model byte):

| Byte | Bits | Meaning |
|---|---|---|
| 0 | 0-6 | model `0x7B` / `0x5B` (pairing) |
| 1 | 6 | **calibrated** |
| 1 | 7 | this robot is the group master |
| 2 | 0-6 | battery % |
| 3 | 0-6 | position % (0 = open, 100 = closed) |
| 4 | 0-3 | device-chain length; `> 1` = in a group |
| 5 | 0-2 | `== 7` → "too hot" alarm |

Manufacturer data, company 2409 (bytes 0-5 = MAC):

| Byte | Bits | Meaning |
|---|---|---|
| 7 | 6-7 | `10` = temperature too high, `01` = too low |
| 7 | 2 | geomagnetic (positioning magnet) alarm — parsed only when the data is longer than 12 bytes |
| 11 | 0-3 | ear type (rail / rod, see above) |
| 11 | 7 | pre-grouped kit (two robots sold as a set) |

The app reads **no** position, motion or light level from manufacturer bytes 8-10 and no battery from byte 12 for the Curtain 3; those offsets are the Curtain Track 4 layout. What the Curtain 3 sends there is unknown **(?)**.

Home-card "status error": the app's stored "in a group" flag differs from the advertisement's in-group bit (a broken pair).

## 2. Control commands

All frames are plain (no encryption). "role" = which robot of a pair: `1` master (or single), `2` slave, `3` both. Positions: **0 = open, 100 = closed**.

| Frame | Meaning | Used by |
|---|---|---|
| `570F4501 04 {role} FF {pos}` (+ `FF {pos}` when role = 3) | Move to position with the device's default motion mode. What the app's main control page sends. | control page |
| `570F4501 04 {role} {mode} {pos}` (+ `{mode} {pos}` for role 3) | Move with an explicit motion mode (0 performance, 1 QuietDrift, 2 Silent). The home page's one-shot "quiet" button sends mode 1 (or 0 when the default is already QuietDrift). | control page |
| `570F4501 00 {role}` | Stop ("force stop"); role 1 single, 3 group. | control page, scenes |
| `570F4501 01 {index} {pos}` [`{pos2}`] | Move to percent (older frame; index 1 single / 3 group). | scenes, widgets, NFC |
| `570F4501 05 {mode} {pos}` | "Device-chain unified move" with mode. | Bot / Button curtain action |
| `570F4501 07 01` / `07 02` | Quick open-stop / close-stop (from firmware 32 **(?)**). Used instead of `05` for 0 % / 100 % on newer firmware **(?)**. | Bot / Button curtain action |
| `570F4501 06` | Toggle open-stop-close-stop. | switch action |
| `570F4501 02 …` / `03 …` | Step move / move to cm (known, never sent by the app). | — |
| `5701 00` | Identify: shake the robot. | identify |
| `5701 00 {s}` | Flash the LED for `s` seconds **(?)** (used by the Curtain 4 identify page). | identify |

Motion mode values: **0 = performance ("fast")**, **1 = QuietDrift** (27 cm/min), **2 = Silent**, `0xFF` = use the stored default. The UI lists them as [Performance, Silent, QuietDrift] and swaps 1/2 when sending. The modes need firmware > 10 (both robots in a pair).

The app syncs the clock before it reads timers or opens the home page: `57000501 {UTC seconds, 8 bytes BE}` (only when the device was seen in a scan).

## 3. Reads (reply layouts)

Byte 0 of every reply is the status (`01` OK, `06` OK for some reads).

| Frame | Name | Reply |
|---|---|---|
| `5702` | basic info | [1] battery, [2] firmware, [3] chain length, [4] bit 7 direction (reversed), bit 6 Touch & Go, bit 5 LED, bit 4 sound, bit 3 fault, [5] bit 3 solar panel used, bit 2 **calibrated**, [6] position, [7] timer count |
| `570F4601 {0 main / 1 slave}` | motion status | [1] move status: 0 stopped, 1 opening **(?)**, 2 closing **(?)** (the Curtain 4 wizard treats 2 as "now closing"). The wizards poll this every 1 s. |
| `570F468101` | group status | [1] bits 6-7 delay active, [2] bits 0-3 timer count, [3] > 1 = in a group; master: [4] bit 7 solar panel, bits 0-6 position, [5] bits 0-6 battery; slave: [6] / [7] same |
| `570F460401` | base properties | [1] bit 0 `0` = logo indoor, bit 3 open mode (0 left, 1 right), bit 4 sound, bit 5 LED, bit 6 Touch & Go (the app also reads "direction" from bit 6, probably a bug **(?)**) |
| `570F460402` | advanced (firmware page) | [1] master battery, [2] master firmware, [3] master charge status, [4]-[6] the same for the slave |
| `570F460403` | home info (reply must be longer than 10 bytes) | master: [1] battery, [2] firmware, [3] charge status, [4] bit 7 **calibrated**, bit 6 open mode, bits 4-5 move status, bit 3 delay set, bit 2 Touch & Go, [5] timer total, [6] bit 7 auto-charge timer, bits 0-6 normal timers, [7] position; slave: [8] battery, [9] firmware, [10] charge, [11] bits 4-5 move status, [12] position; [13] bits 4-7 motion mode; [14] battery warning (bits 2-3: 2 → above 50 °C **(?)**, else below 20; bits 0-1 low-battery level) |
| `570F4605 {0 main / 1 slave}` | calibration info | [2..3] travel distance (cm, BE), [4..5] steps (BE). Fewer than **16 steps** = "route too short" (< 10 cm). |
| `570F4606` | delay info | [1..4] UTC due time (BE), [5] mode, [6] action code, [7] sub code, [8..] payload |
| `570F460200 01` | device chain | [1] `2` = this robot is the master; MACs at bytes 2-7, 8-13, 14-19 |
| `570F460200 03` | left/right swap flag | [1] `1` = swapped |
| `570F468104` | last calibration mode | [1] `1` = last calibration was automatic (enables "Smart Correction") |
| `570F460701` | kit info | [1] bit 7 kit (pre-grouped) mode |
| `570F460300` | light summary | [1] light source, [2] bits 0-3 rule count |
| `570F460301 {i}` | light rule `i` | [1] bits 4-7 action mode, [2] bits 6-7 status, bits 4-5 option+1, bits 0-3 level, [3] bit 7 single, bits 0-6 weekdays (UTC), [4] UTC hour, [5] minute, [6..7] duration min, [8] action code, [9] sub code, [10..] payload |
| `570F460302` | light trigger source | [1] `0` = master's sensor |
| `570F460304 {range} {2 + (slave<<2) + part}` | light history (two parts per robot) | raw values |
| `570F460305` | light level | [2] bits 4-7 master, bits 0-3 slave |
| `570F460306` | solar panel status | raw **(?)** |
| `570F460901` | magnet check | raw **(?)** |
| `570F460902 {0/1}` | magnet placed | [1] master detected, [2] slave detected |
| `570F460903 {sel}` | battery history (15 days per frame, `FF` = no value) | |
| `5708 02` | timer count | [1] total, [2] normal, [3] ≠ 0 auto-charge timer present |
| `5708 {(i<<4)|6}` | timer `i` | [1] bit 7 on, bit 6 auto-charge type, bits 0-3 action mode, [2] bit 7 single shot, bits 0-6 weekdays (UTC), [3] UTC hour, [4] minute, [5] action code, [6] sub code, [7..] payload |

Charge status: 0 not charging, 1 adapter charging, 2 solar charging, 3 adapter full, 4 solar full, 5 solar panel present but not charging, 6 error. "Charging" = 1 or 2.

The app never enables BLE notifications for the Curtain 3; every page polls.

## 4. Calibration wizard

The app calls a process "calibration" when it sends `570F45050A {method}`. Methods: **1 = auto ("Smart")**, **2 = manual ("Custom")**, **5 = new auto** (pull-to-start). Sending it also clears the calibrated state: the app immediately marks the device uncalibrated locally and in the cloud.

Common frames:

| Frame | Meaning |
|---|---|
| `570F45050A {method}` | start calibration with method 1 / 2 / 5 |
| `570F450508 {target} {phase}` (+ `{phase}` again when target = 3) | calibration phase: target 1 master, 2 slave, 3 both; phase **1 = fully open**, **2 = fully closed**. In auto mode the robot drives there by itself. |
| `570F450504 {target} {dir}` | manual jog: target 0 master / 1 slave, dir 1 left / 2 right |
| `570F450505 {target}` | pause the jog (0 master, 1 slave) |
| `570F450502` | **exit calibration** — ends the manual wizard ("Finish") and aborts a failed auto run |
| `570F450406 {1 or 3} {open mode}` | open mode (which side the curtain opens to); role 3 adds `{1 - mode}` for the slave |
| `570F450402 {1 or 3} {inverse}` | motor direction inverse; role 3 adds the opposite value |
| `570F450904 {1 or 3} {on}` (+`{on}`) | enable magnet (geomagnetic) detection |
| `570F460902 {0/1}` | read "magnet detected" |
| `570F4601 {0/1}` | poll motion status (1 s) |
| `570F4605 {0/1}` | read travelled distance after success |

The first page asks Smart or Custom:

### A. Smart calibration, firmware < 22 (method 1)

1. Direction page: user ticks "logo faces inwards", Next → `570F45050A01`; read `570F460403` (firmware). Single → step 2; pair → location page (user picks which side the flashing robot is; sends `570F450406 03 {side} {1 - side}` + `570F450402 03 {inv} {1 - inv}` with `inv = side==left ? 1 : 0`).
2. Close page: user pulls the curtain fully closed and ticks the box → magnet page.
3. Magnet page: "Detect magnet" → `570F450904 {1|3} 01 [01]`, then (pair) `570F460902 01`, after 500 ms `570F460902 00`; failure shows which side has no magnet. "Skip" → `570F450904 {1|3} 00 [00]`. The cloud stores whether the magnet is used.
4. Open-direction page (single only): user picks "open from left/right" → `570F450406 01 {dir}` then `570F450402 01 {dir==left ? 1 : 0}`.
5. Calibrating page: `570F450508 {1|3} 01` (drive to fully open), wait 1 s, poll `570F4601 00` every 1 s until the move status is 0; then `570F450508 {1|3} 02` (drive to fully closed) and poll again (pair: poll the slave with `570F4601 01` in phase 2). Timeout: 120 polls.
6. Success: read `570F4605 00` (and `01` for the slave). Steps < 16 → "route too short" dialog (recalibrate or finish anyway). The app then marks the device calibrated in the cloud; **no extra "save" frame is sent** — the robot sets its own calibrated flag **(?)**.
7. Error / timeout: `570F450505` (pause) then `570F450502` (exit), back to the first page.

### B. Smart calibration, firmware ≥ 22 (both robots), method 5

The new features (this flow and Smart Correction) need firmware ≥ 22 on both robots of a pair; always available on the Curtain 4.

1. Location page: on open → `570F45050A05`, read `570F460403`. User ticks "direction confirmed", Start → magnet check as in A.3 (failure → magnet page).
2. Pull page: `570F450508 {1|3} 01`, then poll `570F4601 00` (and `01` for a pair) every 1 s **until the robot moves**: the user pulls the curtain open by ≥ 5 cm and the robot takes over.
3. Calibrating page, without the open phase: no phase-1 frame; poll until stopped, then `570F450508 {1|3} 02` and poll; success/error as in A.6/A.7.

There is no open-direction page in this flow: the robot learns it from the pull **(?)**.

### C. Custom (manual) calibration, method 2

1. Direction page → `570F45050A02` → close page → magnet page (as A.1-A.3).
2. Manual page, "open" step (pair: left or right robot from the chosen side): on open `570F450508 {1 main / 2 slave} 01`. The user moves the curtain with ◀ / ▶ (`570F450504 {0|1} {1|2}`), pressing again pauses (`570F450505 {0|1}`); the app polls `570F4601` every 1 s (2 s after a jog) until the move status is 0. For the right-hand robot of a pair the jog directions are swapped. Button "Auto-Calibrate Close".
3. "Close" step: `570F450508 {1|2} 02` — the robot drives back to fully closed by itself; poll; the user may correct with the jog buttons. A pair repeats steps 2-3 for the second robot (target 2).
4. "Finish": `570F450502` (exit = save). The app marks the device calibrated; on 2025 hardware it reads `570F4605 00/01` for analytics.

Timeouts: 120 polls (Curtain 3) or 115 s (Curtain 4) → error dialog + `570F450505`.

### D. Smart Correction (re-calibration of an already calibrated robot)

The re-calibration page shows "Smart Correction" when the device is calibrated, `570F468104` reports last mode `1`, and firmware ≥ 22. It checks `570F4601 00` (and `01`) is stopped, then the pull page with **`570F45050C`** (instead of `0508`), waits for the robot to move, then polls until stopped. Abort: `570F450505` + `570F450502`.

### What "calibrated" means

Advertisement service byte 1 bit 6, `5702` byte 5 bit 2 and `570F460403` byte 4 bit 7. Cleared by `570F45050A`, set by the robot after a completed run **(?)**. The app also keeps its own "calibrated" flag in the cloud. An uncalibrated robot cannot move to a position **(?)**.

## 5. Settings

| Setting | Frame | Notes |
|---|---|---|
| Default motion mode | `570F450401 {1 or 3} {mode}` (+ `{mode}` for 3) | mode 0 performance, 1 QuietDrift, 2 Silent; firmware > 10. The pair-link check sends `570F45040103 0000`. |
| Touch & Go (pull to move ≥ 5 cm) | `570F450403 {1 or 3} {on} {on}` | read back from `570F460403` byte 4 bit 2 |
| LED / sound | `570F450404 {idx} {on} {on}` / `570F450405 …` | the app has no page for them **(?)** |
| Open direction / inverse | `570F450406` / `570F450402` | only inside the calibration wizard (sections 4.A/4.C) |
| Delay (one-shot action) | `570F450601 {UTC due, 4 B BE} {mode} 01 {4 group / 5 single} {payload}`; delete `570F450600` | payload = an embedded move (see timers); the home card switch deletes it |
| Timers (stored on device) | write `5709 {(i<<4)|6} {on<<7 | autoCharge<<6 | actionMode} {single<<7 | weekdays} {UTC h} {UTC m} 01 {4|5} {payload}`; clear all `57090200` | the app rewrites the whole list from index 0 after any change; weekdays and time are converted to UTC; "auto-charge" timers belong to the solar-charge feature |
| Light-sensing rules | rule: `570F450301 {0x10 | i} {status<<6 | (option+1)<<4 | actionMode} {level + (option==0 ? 1 : 2)} {weekdays UTC} {UTC h} {UTC m} {duration min, 2 B BE}` (0 = all day); action: `570F450301 {i} 01 {4|5} {payload}`; delete all `570F450303` | light history page needs firmware ≥ 9 |
| Light trigger source | `570F450302 {0 master / 1 slave} 01` | |
| Left/right label swap | `570F450410 {flag}` | Curtain 4 group only; never sent by app 10.10 **(?)** |

Payload of timer / delay / light actions: action code `01` = move; sub code `05` single → `{mode} {pos}`; sub code `04` pair → `{role} {mode} {pos} {mode} {pos}` (i.e. the body of `570F4501 04`).

### Pairing two robots ("open from the middle")

1. Add the second robot in the app.
2. Both robots must be on the same side of firmware 21 (the "2025" line); otherwise the app forces a firmware update to version 21.
3. Link: send to the master `570F450201 01 {MAC of slave, 6 B}`, then poll the master with `570F45040103 0000` until it answers OK (max 40 s, one retry).
4. The cloud stores the pair; calibrate again.

Ungroup: `570F45020100`. Remove one device: `570F45020104 {MAC}`.

## 6. Firmware gates

| Firmware (`5702` b2 / `570F460403`) | Feature |
|---|---|
| > 10 | motion modes, QuietDrift button |
| ≥ 9 | light-history chart |
| ≥ 21 | "2025" firmware line; both robots of a pair must agree |
| ≥ 22 | new auto calibration (pull to start), Smart Correction |

## 7. Dangerous commands — never send

- **OTA** (BLE firmware update; the app forces an update to version 21 before grouping).
- **`57000D04`** (reboot / work-mode change) and **`570004`** (erase device data) — known, not used by the app's pages.
- **Key / credential frames** `570F2001…2008`, `570F2101…2105`: Curtain 4 setup only; writing them to a Curtain 3 would turn on encryption **(?)**.
- **`570F450201 01 F9005A15C896`** and **`570F450701 030101`** (kit mode): factory kit pairing with a fixed MAC; unused.
- **`570F458210 0001`** (battery warning, unused).
- **`570F45050A {method}`** outside a supervised wizard: it clears the calibration.
- **Group frames** `570F4502…`: break or rebuild a pair.
- **`570F450906`** / **`570F450905`** (magnet data / clear alarm; never sent by the app).

## 8. Open questions

- Manufacturer bytes 8-12 on the Curtain 3 (position / motion / light / battery?) — not parsed by the app **(?)**.
- `570F4601` move-status values 1 and 2, and whether the robot sends any notification without `570E01` **(?)**.
- Whether a completed auto run needs an explicit save (`570F450502` is only sent on failure) **(?)**.
- What `5701 00 {s}` does on a Curtain 3 (LED flash duration?) **(?)**.
- `570F460401` bit 6 used for both Touch & Go and "direction" **(?)**.
- LED / sound settings (`570F450404/05`) have no page in the app.

## 9. Shared with the original Curtain / Curtain 2

- Same advertisement base layout: service bytes 1-4 identical; Curtain 1/2 add only the kit flag and ear type in manufacturer byte 11.
- Same frame families: move `570F4501 01 {idx} {pos}`, stop `570F4501 00 {idx}`, `5702`, `570F4601`, `570F468101`, calibration `570F4505…`, light `570F4503…`, delay `570F4506…`, timers `5708/5709`.
- The original Curtain calibrates with older screens that use the same frame family: `570F45050A{type}` start, `570F450508 {idx} {mode} {mode}` phase, `570F450505 {idx}` pause, `570F450503 {a}` test (`570F450503 01/02` test open / close), `570F4505 {a}`, `570F450502` complete, `570F450406 03 …` / `570F450402 03 …` direction, `570F45050A03`; reads `570F468103`, `570F460500` **(?)** (flow order not traced).
- Motion modes, QuietDrift, Touch & Go via `570F460403`, the light-level and firmware gates and the new auto calibration are Curtain 3 / 4 only.

## 10. Gap vs. our sbble code

- **Move frames** (`cover_base.py` `set_position`, `curtain_base.py` `open`/`close`): we send two frames, `570f4501 0101 {pos}` and `570f4501 05 {speed} {pos}`. The app's control page sends one frame, `570F4501 04 01 FF {pos}` (or `04 01 {mode} {pos}`). Both of ours are valid app frames (scenes / buttons), but two moves per call is not what the app does.
- **Speed values** (`const.py` `CURTAIN_SPEED_TO_VALUE`, `cover.py`): `"silent": 1` is in fact **QuietDrift (27 cm/min)**; the app's "Silent" is mode **2** and "performance" is **0**. `255` = default mode is right.
- **Stop** (`cover_base.py` `STOP`): we send `570f4501 0001` (correct) and `570f4501 00ff` (not an app frame **(?)**).
- **Advertisement** (`curtain_base.py` `parse_curtain`): for 13+ byte manufacturer data we take position from mfr[8] and battery from mfr[12]. The app takes them from service data bytes 3 and 2 for the Curtain 3 (mfr[8]/mfr[12] is the Curtain 4 layout). Missing: master / in-group bits, too-hot / temperature alarms, magnet alarm, ear type, kit flag.
- **`read_basic_info`** (`curtain_base.py`): reads "moving" from `5702` byte 5 bits 0/1/6, which the app never does; the app takes motion from `570F4601` or `570F460403`. Calibrated (b5 bit 2) and position (b6) match.
- **Not implemented:** default motion mode, Touch & Go, calibration (all three wizards and Smart Correction), magnet detection, delay, device timers, light rules, battery history, charge / solar status (`570F460402/0403`), time sync, two-robot pairing and group roles (role 3 moves both).
- `catalog/devices.py` registers `curtain_3` with the curtain entity only; no select / switch / sensor entities for the settings above.

### Status 2026-11-25 (what ha_switchbot_ble does now)

Done: single move frame `570F4501 04 01 {mode|FF} {pos}` and stop `570F4501 0001` (role 1 only); motion modes 0 performance / 1 QuietDrift / 2 Silent / FF default, gated at firmware > 10; advertisement as in section 1 (service bytes 1-5, mfr[7] alarms, mfr[11] ear type and kit); home info `570F460403` as the state read, `570F4601` polled every 1 s after a move (max 5 min); clock sync `57000501` once per connection; settings entities (default motion mode, Touch & Go, charge state / solar panel, alarms, mount type) on the 6 h refresh; calibration steps of 4.A-4.D in the library and the panel backend (`panel/covers.py`), the wizard in the panel tab "Calibration" (also in demo mode).
Not done: pairs / group roles 2-3 and pairing, delay, device timers, light rules, battery history, LED / sound. Still unproven **(?)**: move status values 1/2, whether `570F460902 00` alone answers the magnet check of a single robot, the doubled Touch & Go value byte, mfr bytes 8-10 and 12.
