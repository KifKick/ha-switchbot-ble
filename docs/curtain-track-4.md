# SwitchBot Curtain Track 4: app protocol

Product: SwitchBot Curtain 4 for tracks (cloud type `W1100000`). Built-in battery plus an optional clip-on **Extended Battery** ("long-range model") or solar panel; hook wheels instead of the Curtain 3 rail ears.

Analysis of 2026-11-24. Source: the SwitchBot app 10.10; nothing was tested on a device. **(?)** marks items that are not proven. The app has no separate Curtain 4 control screens: it drives the Curtain 4 with the Curtain 3 screens and frames and only branches where noted below.

This document lists only what differs from the Curtain 3. Every frame, reply and wizard not mentioned here is as in [curtain-3.md](curtain-3.md) (same `570F45` / `570F46` families, same positions 0 = open / 100 = closed, same motion modes).

**Our code:** nothing yet (no `Model` for `W1100000` in `sbble/core/const.py`).

## 0. Model ids

| Item | Value |
|---|---|
| Cloud type / code | `W1100000` (the app also knows a Curtain 4 group type) |
| Service-data model byte | `0x00` (new product-id format) |
| Product id | service data bytes 4-6 = `10 C8 E0` (= 1 100 000). With byte 3 in front: **`00 10 C8 E0`**, **`01 10 C8 E0`** in pairing mode (byte 3 bit 0 = pairing). The app matches it when the data has ≥ 7 bytes, `b0 & 0x7F == 0` and bytes 4-6 == 1100000. |
| Encryption | **Yes, always.** The app encrypts every write; the advertisement flag (service byte 1 bit 5) is also parsed. AES-CTR key pair (key id + 16-byte key) as for the other encrypted SwitchBot models, see section 5. |
| OTA | not a BLE firmware update; done through the app's firmware page / cloud **(?)** |

## 1. Advertisement

Service data: [0] `0x00`, [1] bit 5 encrypted, [3] bit 0 pairing mode, [4..6] product id. Everything else is in manufacturer data (company 2409, bytes 0-5 = MAC):

| Byte | Bits | Meaning |
|---|---|---|
| 7 | 0 | **calibrated** |
| 7 | 1 | group master |
| 7 | 6-7, 4-5 | two 2-bit temperature states (master / slave **(?)**): `2` too high, `1` too low |
| 8 | 0-6 | position % (0 open) |
| 9 | 0-3 | chain length; `> 1` in a group |
| 10 | 0-3 | `== 7` too-hot alarm |
| 11 | 0-3 | ear / hook type (same mapping as Curtain 3 **(?)**) |
| 11 | 5-6 | SKU type (meaning unknown **(?)**; the app uses it only to pick install guides) |
| 11 | 7 | pre-grouped kit |
| 12 | 0-6 | battery % |
| 13 | 7 | Extended Battery installed |

There is no motion bit. Our `curtain_base.parse_curtain` "13+ byte" branch (position mfr[8], battery mfr[12]) matches this layout.

## 2. Control differences

- Move / stop / mode frames are the Curtain 3 ones (`570F4501 04 {role} {mode|FF} {pos}`, `570F4501 00 {role}`), **encrypted**.
- Motion modes and QuietDrift are always available (no firmware gate on the Curtain 4).
- **Identify**: `570100 {seconds}` (flash LED) together with `5701 01`, then `5701 02`, `5701 01` … every 1.5 s (shake); stop with `570100 00`.

## 3. Read differences (reply layouts)

**`570F468101` (status):** master [4] bit 7 solar panel, bits 0-6 position; [5] bit 7 charging, bits 0-6 built-in battery; [6] bit 7 Extended Battery connected, bits 0-6 its level. Slave at [7], [8], [9]. Combined battery shown by the app = `round(0.73 × ext + 0.27 × built-in)` when the Extended Battery is connected, else the built-in level.

**`570F460402` (advanced):** master [1] built-in battery, [2] bit 7 ext connected + bits 0-6 ext level, [3] firmware, [4] charge status; slave [5]-[8] the same.

**`570F460403` (home info), shifted by one byte against the Curtain 3:**

| Byte | Meaning |
|---|---|
| 1 | master built-in battery |
| 2 | bit 7 Extended Battery connected, bits 0-6 its level |
| 3 | firmware |
| 4 | charge status (1/2 = charging) |
| 5 | bit 7 calibrated, bit 6 open mode, bits 4-5 move status, bit 3 delay set, bit 2 Touch & Go, bit 0 solar panel used |
| 6 | timer total |
| 7 | bit 7 auto-charge timer, bits 0-6 normal timers |
| 8 | position |
| 9-14 | slave: built-in battery, ext, firmware, charge, flags, position |
| 15 | bits 4-7 motion mode |
| 16 | battery warning (same coding as Curtain 3 byte 14) |

**`570F460200 01` (chain):** [1] `2` = this unit is the master → slave MAC at bytes 8-13; otherwise master MAC at bytes 2-7.

Low battery in the UI: built-in < 20 % or Extended Battery < 20 %.

## 4. Calibration differences

The new features are always on, so Smart calibration is always the new flow, and there is **no magnet step**.

### Smart calibration

1. First page → location page (no `570F45050A` on open for the Curtain 4).
2. User confirms the logo direction (or taps "logo facing outer side?" and picks Inner / Outer side). Start:
   - `570F450406 {1 single | 3 pair} 00 {0 logo inside | 1 outside}` (pair: `+ 01 {same}`), i.e. open mode 0 plus mounting side;
   - `570F45050A05` (new auto).
3. Calibrating page, without the open phase: no `0508` frame; the app polls `570F4601 00` every 1 s. While in phase 1, move status `2` means the robot has turned around → phase 2 without a frame; move status `0` in phase 1 → `570F450508 {1|3} 02`. Phase 2 ends at move status `0` (pair: then the slave via `570F4601 01`).
4. Success: `570F4605 00/01` distance check (≥ 16 steps), the app marks the device calibrated in the cloud. Timeout **115 s** (instead of 120 polls) → `570F450505` + `570F450502`.

### Custom calibration

Direction page (button "Start calibration"): `570F450406 {1|3} 00 00 [01 00]`, `570F45050A02`, read `570F460403`, then the manual steps exactly as the Curtain 3 (section 4.C there), with a 115 s timeout per move and, on "Something went wrong", an immediate `570F450505 {target} …`.

### Smart Correction

Offered when calibrated and the last calibration mode (`570F468104`) is `1`: `570F45050C`, then the app polls until stopped. The page also contains a "left/right labels may be incorrect" dialog that sends `570F450410 00`, but app 10.10 never shows it **(?)**.

## 5. Settings and setup differences

| Setting | Frame |
|---|---|
| Reverse open/close direction (settings) | `570F450406 {1|3} {reversed} {0 inside / 1 outside}`; pair adds `{1 - reversed} {inside/outside}`. The current value is `570F460401` byte 1 bit 3. |
| Group calibration method after pairing | `570F45050A02` (manual) on the master |

Timers, delay, light rules, Touch & Go and default motion mode use the Curtain 3 frames.

### Encryption key

The app sets up the device's encryption key once, when the device is added, together with the SwitchBot cloud; from then on every frame is encrypted with that key. These setup frames (`570F20…`, `570F21…` and the unencrypted `57000000 0F21…` reads) can reset or replace the keys and are **never** sent by ha_switchbot_ble.

For our integration this means: get the key id + key from the cloud the way the other encrypted models do (`sbble/core/cloud.py` `encryption_key`). Whether the `wonder/keys/v1/communicate` endpoint returns the key for `W1100000` is not proven **(?)**.

### Pairing two units

Pairing writes a shared link key from the cloud to both units (`570F2003…`, `570F2004…`), then links the master to the slave (`570F450201 01 {keyId} {slave MAC}`, polled with `570F45040103 0000` until OK) and finally starts a manual calibration (`570F45050A02`). Not supported by ha_switchbot_ble.

## 6. Firmware gates

None: every Curtain 3 firmware gate is skipped for the Curtain 4.

## 7. Dangerous commands — never send

Everything listed for the Curtain 3, plus:
- **All key frames** `570F2001…2008` / `570F2101…2105` and the `57000000 0F21…` reads: they reset or replace the encryption keys; a wrong key locks the phone app out of the device.
- **Group link frames** with a key id (`570F450201 01 {keyId} {MAC}`).
- **Firmware upgrade**.

## 8. Open questions

- Which temperature pair in byte 7 belongs to which unit, SKU-type values, whether the ear type uses the Curtain 3 mapping **(?)**.
- The cloud endpoint that returns the communication key for an already added Curtain 4 **(?)**.
- Whether an unencrypted frame is ignored or rejected **(?)**.
- `570F4601` move-status values (2 = reversing to close?) **(?)**.

## 9. Gap vs. our sbble code

- No model at all: add `W1100000` to `sbble/core/const.py`, register product ids `0010C8E0` / `0110C8E0` (service data bytes 3-6; `advertisement.identify` checks `service[-4:]` and `service[-5:-1]`, which covers a 7-byte frame **(?)**), and beware that model byte `0x00` would otherwise be looked up first.
- Needs `EncryptedDevice` (`sbble/core/device.py`) with key id + key, unlike `curtain_3.py`.
- The advertisement parser can reuse `curtain_base.parse_curtain`'s 13-byte branch, but must add calibrated (mfr[7] bit 0), master, Extended Battery (mfr[13] bit 7), temperature alarms; service byte 1 bit 6 is **not** the calibrated flag here.
- `read_basic_info` would need the shifted `570F460403` layout or `570F468101`, plus the combined-battery formula.
- Everything in the Curtain 3 gap list applies (single `570F4501 04` move, mode values 0/1/2, calibration, settings).

### Status 2026-11-25 (what ha_switchbot_ble does now)

Done: model `CURTAIN_TRACK_4` (`W1100000`, product ids `0010C8E0` / `0110C8E0`, also found at service bytes 3-6), `EncryptedDevice` with the key pair from the account like the locks (config flow, key verified with the home info), advertisement as in section 1, shifted home info with the combined battery `0.73 × ext + 0.27 × built-in`, built-in / Extended Battery entities, all Curtain 3 settings except the magnet, calibration steps (mount side `570F450406 01 00 {0|1}`, new auto, custom, Smart Correction) in the library and panel backend, wizard in the panel tab "Calibration" (also in demo mode).
Not done: pairs (shared link key), the left/right label swap. Still unproven **(?)**: that `wonder/keys/v1/communicate` returns the Track 4 key, which temperature pair belongs to which unit, the ear-type mapping, SKU values.
