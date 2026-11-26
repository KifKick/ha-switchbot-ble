# SwitchBot Blind Tilt: app protocol

Product: SwitchBot Blind Tilt (battery tilt-wand motor for slat blinds, optional solar panel).

Analysis of 2026-11-24. Source: the SwitchBot app 10.10; nothing was tested on a device. **(?)** marks items that are not proven.

The app's control screens build most frames themselves and send them over BLE (or through a hub); a reply is OK when it starts with `01`. NFC tags and scenes only offer "move to percent 0-100". The light-sensor, delay and schedule screens use the app's older generic code paths (marked "older screens" below).

**Our code:**
- Library: `sbble/devices/covers/blind_tilt.py`, shared `sbble/devices/covers/cover_base.py`.
- Integration: `cover.py` (`SwitchBotBlindTiltEntity`), `catalog/devices.py` (`blind_tilt`).

## 0. Model ids

| Item | Value |
|---|---|
| Cloud type / code | `WoBlindTilt`. No `W…` numeric product code. |
| Service-data model byte | `0x78` (`'x'`) normal, `0x58` (`'X'`) pairing mode (`b0 & 0x7F == 120`, or 88 in pairing mode). |
| 4-byte product id | none: the Blind Tilt uses the old one-letter service-data format, not the `00 xx xx xx` product-id format. |
| Manufacturer id | 2409 (`0x0969`). |
| Encryption | None. The advertisement has no "encrypted" flag and all frames below are plain `57…`. No key needed. |
| Transport | BLE, or the same bytes through a hub. When the device is not scanned, the app may show cloud properties instead. |
| Firmware number | `5702` reply byte 2 (BLE firmware version, integer). |

**Firmware gates** (BLE firmware version):
- **≥ 20**: group (device chain) support; move payload `05 ff <pos>` instead of `01 01 <pos>`; delay frame without the extra `ff`. Below 20 the home page reads `570f460402` + `570f460500`, from 20 on `570f46020105` + `570f468106` + `570f468107`.
- Forced firmware update on pairing: the app compares the cloud's minimum version with the device's; nothing hard-coded.

**Shared with the curtain family:** command group `570f45` (write) / `570f46` (read) and most sub-ids (`01` move, `02` chain, `03` light, `04` mode, `05` calibration, `06` delay, `81` chain status), `5702`, `570e` notifications, `5708`/`5709` timers. The app's command tables list the Blind Tilt next to the curtains for `570f450100/01/05`, `570f450201/02`, `570f450401`, `570f450501/02`, `570f450600/01`, `570f4601/02`, `570f4603xx`, `570f4605/06`, `570f468102`. Blind-Tilt-only ids: `570f450203`, `570f450304/05`, `570f450509`, `570f460307`, `570f4609` (calibration step), `570f468106/07/08`. The Blind Tilt has its own position meaning (tilt, 50 = open) and its own calibration (save-current-position steps, not a motor sweep).

## 1. Advertisement

**Service data** (UUID `fd3d`):

| Byte | Bits | Meaning |
|---|---|---|
| 0 | 0-6 | model `0x78` / `0x58` pairing |
| 2 | 0-6 | battery % |

**Manufacturer data** (id 2409, bytes 0-5 = MAC; offsets as used by the app, i.e. including the MAC):

| Byte | Bits | Meaning |
|---|---|---|
| 6 | all | sequence number (not used by the app) **(?)** |
| 7 | 7 | direction has been set |
| 7 | 6 | direction: 0 horizontal slats (up/down), 1 vertical slats (left/right) |
| 7 | 3 | motor stuck, only when byte 8 bit 7 is 0 |
| 7 | 0 | calibrated |
| 8 | 7 | the stuck formula ignores bit 3 while this is set; most likely "moving" **(?)** |
| 8 | 0-6 | tilt position 0-100 |
| 9 | 0-2 | chain length (number of linked blind tilts); bytes 9-10 only parsed when the mfr data is longer than 10 bytes |
| 10 | 7 | "connection allowed" (used for the "chain link error" badge) |

Chain link error: on the master, the number of links in the cloud ≠ chain length; otherwise "connection allowed" is 0 or the chain length is > 1.

The app does **not** read a light level from the advertisement. Byte 9 bits 4-7 (our "lightLevel") are not used by the app **(?)**.

**Position meaning**: horizontal: 0 = closed down, 1-49 = opened down, 50 = fully open, 51-99 = opened up, 100 = closed up. Vertical: 0 = closed left, 50 = open, 100 = closed right. The UI shows "x % open" as `p*2` below 50 and `(100-p)*2` above.

## 2. Commands (write)

All frames are `57 …`. Reply byte 0 = status; OK = `0x01` (the older screens also accept `0x06`, `0x0c`; the control screens only `01`).

`<act>` = action payload: `01 01 <pos>` when the firmware is < 20, `05 ff <pos>` when ≥ 20.

| Frame | Meaning | Who sends it |
|---|---|---|
| `570f4501 01 01 <pos>` | move to pos (single device) | control page (one device); older screens when fw < 20 |
| `570f4501 01 ff <pos>×n` | move the whole chain, one byte per device | control page (n > 1 devices) |
| `570f4501 05 ff <pos>` | move ("chain unified action") | NFC, scenes, widgets when fw ≥ 20 |
| `570f4501 00 01` | force stop; reply byte 1 = position 0-100 | older screens |
| `570f4501 00 ff` | stop | known, never sent by app 10.10 |
| `5701 04` | "single move": jog one device so the user can identify it | group pages |
| `570f4504 01 01 <mode>` | motor mode single device: 0 = high performance, 1 = quiet | motor-mode page |
| `570f4504 01 ff <mode>×n` | motor mode for the chain | motor-mode page |
| `570f4504 06 01 <dir>` | slat direction. The older code sends `dir | 0x02` (bit 1 = "set"), the newer one `dir` raw | not sent by app 10.10 **(?)** |
| `570f4505 01` | calibration start (BLE only) | §4 |
| `570f4505 02` | calibration exit (also on cancel) | §4 |
| `570f4505 09 <n>` | save current position as calibration point n (1, 2, 3, 5) | §4 |
| `570f4506 01 <t:4 BE> [ff] 01 <act>` | delay: move to pos at absolute UTC unix time t; `ff` only when fw < 20 | delay screen (`t = now + delay`) |
| `570f4506 00` | delete delay | delay screen |
| `570f4503 01 <idx|0x10> <en<<6 | type<<4> <thr> <days> <hh> <mm> <dur_hi> <dur_lo>` | light-sensor rule `idx`: type 1 = above, 2 = below threshold; thr 1-10; days bits 0-6; start hh:mm; duration minutes | light-sensor screen |
| `570f4503 01 <idx> 01 <act>` | light-sensor rule `idx` action (target position) | light-sensor screen |
| `570f4503 02 <index> <type>` | light source: type 0 = device body sensor, 1 = solar panel **(?)** | light-sensor screen |
| `570f4503 03` | delete all light-sensor rules | light-sensor screen |
| `570f4503 04 00 <n> <lvl> <days> <hh> <mm> <dur_hi> <dur_lo>` | constant-brightness ("AI") rule n: lvl = level+1, +0x80 when disabled; days bit 7 = once; **hh:mm in UTC**; duration minutes (1440 = all day, 1439 when once) | constant-brightness page |
| `570f4503 05` | delete constant-brightness rules | constant-brightness page |
| `570f4502 01 01 <mac:6>` | chain: add device | group creation |
| `570f4502 01 04 <mac:6>` | chain: remove device | known, never sent |
| `570f4502 01 00` | chain: delete all (dissolve group) | group pages |
| `57000501 <unix:8 BE>` | set device clock (UTC) | home page, on each BLE connect |
| `5709 02 <n>` | timer count | schedules |
| `5709 <(i<<4)|6> <en?80:00> <days|80 if none> <hh> <mm> 01 <act>` | timer i | schedules |
| `570e01 00 0a ff ff 46 01 00` | position notifications (single device) | after a move |
| `570e01 00 32 ff ff 46 81 07` | position notifications (chain) | after a move |
| `570e01 00 0a ff ff 46 09 [00]` | calibration-step notifications (the newer code adds `00`, the older does not) | §4 |
| `570e00` | notifications off | |

Notification frame (`570e01` + `[timeUnit & 0xC0, interval, ff, ff]` + read sub-command without `57 0f`): the device then pushes the reply of that read until it is switched off. Interval unit unknown **(?)**. The app stops notifications (and disconnects) as soon as a position notification reports state 0.

## 3. Reads and reply layouts

| Frame | Reply (byte 0 = status) |
|---|---|
| `5702` | [1] battery %, [2] firmware, [5] bit 3 solar panel plugged, bit 2 calibrated |
| `570002` | hardware version (generic) |
| `570f4601 00` | [1] state: 0 stop, 1 moving, 2 stuck; [6] position. 8 bytes; same layout as the position notification |
| `570f4605 [00]` | [1] bit 2 calibrated, bit 1 direction set, bit 0 direction |
| `570f4604 02` | [1] battery, [2] firmware, [3] charge status; 7 bytes over the hub |
| `570f4604 03 [00]` | [1] bit 0 motor mode (0 performance, 1 quiet) |
| `570f4606` | [1..4] UTC unix time of the pending delay (BE, 0 = none), last byte target position |
| `5708 02` | [1] timer count |
| `5708 <(i<<4)|6>` | [1] bit 7 enabled, [2] bits 0-6 days, bit 7 "repeat mode", [3] hour, [4] minute, last byte target position |
| `570f4681 06` | [1] n, then per device 2 bytes: firmware, bit 7 low battery + bits 0-6 battery |
| `570f4681 07` | [1] n, then per device 2 bytes: position; bit 7 calibrated, bit 6 mode, bit 5 stuck, bit 4 moving, bits 0-3 charge status (the older screens read position + charge only) |
| `570f4681 08` | [1] n, per device 2 bytes: hi nibble panel light level, lo nibble body light level; bit 7 sensor source, bit 6 has panel |
| `570f4602 01 05` | [1] == 0 → device is in a group (fw ≥ 20) |
| `570f4602 ff 03` | [1] total, [2] connected count, [3] connected bitmask, [4..9] MAC of the disconnected device |
| `570f4602 ff 06` | [1] group-add status |
| `570f4602 <mask> 04` | up to 3 chain MACs from offset 2, 6 bytes each (mask = 2^k − 1, k ≤ 3; repeated for devices 4-6) |
| `570f4603 00` | [1] device index, [2] bit 4 source type, bits 0-3 number of light rules |
| `570f4603 01 <i>` | [1] bits 0-3 index, [2] bit 6 enabled, bits 4-5 threshold type, bits 0-3 threshold, [3] days, [4] hh, [5] mm, [6..7] duration min, [8..] action (last = position) |
| `570f4603 02` | [2] light source type |
| `570f4603 04 <range> <(src<<1)+idx>` | [2] first hour, [3..14] 12 hourly bytes: hi nibble max, lo nibble min (levels ≤ 10); > `0xAA` = no data |
| `570f4603 06` | [2] number of constant-brightness rules |
| `570f4603 07 <n>` | rule n: [2] number, [3] bit 7 status, bits 0-3 level+1, [4] bit 7 once, bits 6-0 days, [5] UTC hour, [6] UTC minute, [7..8] duration |
| `570f4682 03` | work mode; byte 4 == 4 means "not ready" during pairing **(?)** |

Charge status: 0 not charging, 1 adapter charging, 2 panel charging, 3 adapter full, 4 panel full, 5 panel not charging, 6 device error. The app warns "low battery" when battery ≤ 10 and status is 0 or 5.

When the device is not reachable over BLE the app shows cloud properties instead (online, stuck, running, position).

## 4. Calibration wizard

The user turns the tilt wand **by hand**; the device only records positions. There are four pages (steps 0-3), each with a picture and "Manually adjust the blinds to …":

0. Page opens → after 500 ms: `570f450501` (start). Over BLE: `570e01000affff460900` (calibration-step notifications).
1. Step 1 "Fully closed down" ("do not reverse the slats"). **Next is always enabled.** Next → `570f450509 01`.
2. Step 2 "Fully open horizontal". Next → `570f450509 02`.
3. Step 3 "Fully closed up". Next → `570f450509 03`.
4. Step 4 "Fully open horizontal" again (the text explains that the number of wand turns to reach "open" differs depending on whether you come from up or down, so it is recorded twice). Next → `570f450509 05`, then `570f450502` (exit) and `570e00`; the app marks the device calibrated in the cloud and shows a success page.

Steps 2-4: **Next is enabled only after a notification with "enable next" set.**

Each `570f450509` must return `01`, otherwise the page shows "Failed, Please try again" and stays.

**Notification** (4 bytes, the `0x46 0x09` read): byte 1:
- bits 0-3: current step code on the device;
- bit 4: "enable next" (probably: the wand was turned far enough **(?)**);
- bit 5: device left calibration ("exit"); the app then switches notifications off;
- bit 6: direction error. When set and the page is not on step 1, the app disables Next and shows "Recalibrate your blind tilt: if you turn in the opposite direction the open/closed positions will not match". "Recalibrate" → `570f450501` + notifications again, back to step 1.

**Cancel** (back + confirm): `570f450502`, `570e00`.

**What the device keeps**: "calibrated" = `5702` b5 bit 2 = `570f4605` b1 bit 2 = adv mfr[7] bit 0. Direction (horizontal / vertical slats) comes from the device (`570f4605` bit 0, adv mfr[7] bit 6). App 10.10 never sets it; older app versions sent `570f45040601 (dir|2)` **(?)**.

Groups: the app runs the same wizard per member MAC (each member over its own BLE connection).

The app's older code names calibration points 1, 2 and 3 (zero, middle, full); the fourth value 5 has no name **(?)**.

## 5. Settings in the app

| Setting | Frames | Notes |
|---|---|---|
| Motor mode ("Movement model") | `570f460403(00)` / `570f450401 01 <m>` (or `ff` + per device) | 0 high performance, 1 quiet |
| Delay | `570f4606` / `570f450601 …` / `570f450600` | one pending delayed move, absolute UTC time |
| Schedules (stored on the device) | `5708 02`, `5708 <i6>`, `5709 02 <n>`, `5709 <i6> …` | times are device time; the app syncs the clock with `57000501` (UTC) on connect. Whether timer hh:mm is UTC or local is not proven **(?)** |
| Light sensor rules | `570f4603xx`, `570f4503 01/02/03` | index is 4 bits (max count not known **(?)**); threshold levels 1-10 |
| Constant brightness ("AI adjust") | `570f460306/07`, `570f4503 04/05` | UTC times |
| Home shortcuts | cloud only (defaults `[0, 50, 100]` on the control page, `[0, 50]` on the home card) | |
| Group (chain, max 4, fw ≥ 20) | `570f4502 01 …`, `570f4602 …`, `570f4681 06/07/08` | the device the app connects to relays to the others **(?)** |

## 6. Dangerous commands — never send these

| Frame | What it does |
|---|---|
| **OTA** (BLE firmware update; forced by the app when adding a device) | firmware update. Not documented further on purpose. |
| **`570004`** | generic "clear device data" (factory reset). |
| **`57000d04`** | the add flow sends it first ("reset"), then polls `570f468203` up to 31× every 200 ms. Reboots the device. |
| `570f4502 01 00` | dissolves the chain (needs re-pairing the group in the app). |
| `570f4502 01 01/04 <mac>`, `570f450203` | changes chain membership / disconnects the next node. |
| `570f450501` without a later `570f450502` | leaves the device in calibration mode; a half-finished `…09 n` sequence overwrites the stored positions. |

## 7. Open questions

- mfr[8] bit 7: "moving"? Only used indirectly by the stuck formula.
- mfr[9] bits 4-7: the app does not use them; our code calls them light level.
- `5702` bytes 3-4, 5 bits 0-1 and 6: our code reads "moving" and position there; the app never does.
- Interval unit of `570e01` (`0a` single, `32` chain).
- Timer hh:mm in UTC or local; what "repeat mode" (day byte bit 7) means exactly.
- Calibration step codes 0-15 reported in notification bits 0-3 (the app only uses bits 4 and 6).
- Calibration value 5 at step 4 and whether value 2 vs 5 are "open from below / from above".
- Light source type values (0 body sensor, 1 solar panel) **(?)**.

## 8. Gap vs. our sbble code

`sbble/devices/covers/blind_tilt.py`, `sbble/devices/covers/cover_base.py`, `cover.py` (`SwitchBotBlindTiltEntity`):

1. **Move / open / close send two frames** (`570f4501 0101 <pos>` then `570f4501 05ff <pos>`, `cover_base._send_all`). The app sends exactly one: `0101` for fw < 20 (and the control page always for a single device), `05ff` for fw ≥ 20. Sending both may queue two moves; pick one by firmware (`5702` b2).
2. **Stop** sends `570f450100 01` and `570f4501 00ff`; the app uses one of them (`0001` or `00ff`). The `0001` reply carries the stopped position in byte 1 (unused by us).
3. **Advertisement**: we parse calibrated, tilt, battery and a "light level" from mfr[9] bits 4-7 that the app does not have **(?)**. Missing: direction set / direction (mfr[7] bits 7/6, needed to name 0/100 "down/up" vs "left/right"), stuck (mfr[7] bit 3 && !mfr[8] bit 7), chain length (mfr[9] bits 0-2), "connection allowed" (mfr[10] bit 7). "In motion" = mfr[8] bit 7 is plausible but unproven.
4. **`read_basic_info`**: battery, firmware and calibrated match the app; "solar panel plugged" (b5 bit 3) is missing; "in motion" (b5 bits 0-1) and tilt (b6) are not what the app reads — use `570f460100` (state + position) instead.
5. **No notifications**: the app uses `570e01 … 460100` while moving and stops on state 0. We poll / rely on `refresh_on_sequence`.
6. **Not implemented**: motor mode (`570f460403` / `570f450401 01 <m>`), charge status (`570f460402`), calibration (§4) and direction read, delay, device-stored timers, light-sensor and constant-brightness rules, clock sync (`57000501`), group/chain commands and per-member status (`570f468106/07`).
7. `close()` picks the nearer end at > 50 like the app's UI icons do; the app itself has no "close" command, only positions 0 / 100. For vertical blinds "up/down" in our method names really mean right/left.
8. Calibration exposure in HA must keep the order 1, 2, 3, 5 and always end with `570f450502`; it needs the user at the wand, so it fits a guided service / panel flow rather than a button.

### Status 2026-11-25 (what ha_switchbot_ble does now)

Done: one move frame chosen by firmware (`0101` < 20, `05FF` from 20), one stop frame `570F45010001`; advertisement with slat direction, stuck, chain, "connection allowed", no light level; state read `5702` + `570F460100`, polled every 1 s after a move; clock sync once per connection; motor mode, charge state (`570F460402`), solar panel, slat direction entities; calibration (`0501` + notifications, points 1/2/3/5, `0502` + `570E00` always) in the library and panel backend, wizard in the panel tab "Calibration" (also in demo mode).
Not done: delay, device timers, light rules, constant brightness, chain commands. Still unproven **(?)**: that the calibration notification is the only 4-byte frame, mfr[8] bit 7 as "moving".
