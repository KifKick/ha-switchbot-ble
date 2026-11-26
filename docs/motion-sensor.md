# SwitchBot Motion Sensor: app protocol

Product: SwitchBot Motion Sensor (PIR + light sensor, battery).

Analysis of 2026-11-16, from the behaviour of the SwitchBot app 10.10. Nothing was tested on a device. **(?)** marks uncertain items.

The app handles this sensor itself (not through a downloadable device plugin); it shares the device handling with the Contact and Presence sensors.

**Our code:**
- Library: `sbble/devices/sensors/motion_sensor.py` (model chars `s` / `S`).
- Integration: `catalog/sensors.py` (passive, advertisements only; `led_enabled`, `detection_distance`), `catalog/common.py` (`motion_detected`, `is_light`, battery).

## 1. Identity

| Item | Value |
|---|---|
| Cloud type code | **`WoPresence`** (shown as "Motion Sensor"). Not to be confused with `WoPresenceSensor` = W1101000, the mmWave sensor; see `presence-sensor.md`. |
| BLE id | service data byte 0 & 0x7F = `0x73` **`s`**. Pairing mode: `0x53` **`S`**. |
| sbble | `MotionSensor`, chars `s` and `S` |
| Encryption | Plaintext, unless the adv encryption flag is set (service data b1, see §4) **or** the BLE firmware version is ≥ 19. Then the app uses the keypad-style key scheme. Whether 19 means v1.9 **(?)**. |

## 2. App BLE commands

Plaintext payloads are shown; the encryption wrapper is added on top when needed.

| Command | Used for | Meaning |
|---|---|---|
| `5701` | Find device | "Execute action". Used as "find device", probably blinks the LED **(?)** |
| `5702` | Status / settings read | Basic info / settings read; reply below |
| **`5703` XX** | Settings | **Write settings.** One byte, layout below |
| `570002` | Setup | Hardware version (reply b2), sent during setup |
| `570011` | Live status | Status (PIR): motion, light, time since last motion; reply below. The app polls it on the main, distance-test and light-calibration screens. |
| `570014 01` + 4-byte UTC seconds (big-endian) | Motion log | Read the on-device motion log up to that time; the reply comes in chunks **(?)** |
| `5709 01` + 8-byte UTC seconds (big-endian) | Time sync | Time sync |
| `57000D08` | Cloud off | Work mode: cloud service **off** (unbind from hub) |
| `57000D09` | Cloud on | Work mode: cloud service **on**. Comes after two `570012` bind writes (below) |
| `570012 01 00 11 00 01` + 16 ASCII chars | Cloud on | Bind info, part 1: the user id with the dashes removed |
| `570012 02 00 07 00 01` + 6-byte hub MAC | Cloud on | Bind info, part 2: the parent hub's MAC |

### `5703` settings byte

The app always sends the full byte, built from its cached state. It never changes a single bit on its own.

| Bit(s) | Value | Meaning |
|---|---|---|
| bit 0 | 1 = LED on | indicator LED, the settings switch |
| bit 1 | 1 = test mode | The distance-test screen turns it on while testing and off when leaving |
| bits 2-3 | 0 / 4 / 8 | detection distance: index 0 = **long (8 m)** → `0x00`, 1 = **medium (4 m)** → `0x04`, 2 = **short (2 m)** → `0x08`. (A boolean argument of the action inverts the mapping; every caller passes false.) |
| bit 4 | 16 | cloud service enabled. **Must mirror the current cloud state**, or a write may unbind the sensor from its hub **(?)** |
| bits 5-6 | `0x20` / `0x40` | light-sensor calibration request: type 1 → `0x20`, type 2 → `0x40`. The calibration screen sends `0x40`; `0x20` is the other calibration type and is not reached from the visible UI **(?)**. |
| bit 7 | 0 | unused |

**Reply of `5703`:**
- b0 = 1 means success.
- b1 = light-calibration result: 0 = ok, 1 = failed ("Cannot save the Ambient Brightness settings because it is too bright").

### Read reply layouts

**`5702`**. b0 is the status byte.

| Byte | Meaning |
|---|---|
| b1 | not read here; probably battery **(?)** |
| b2 | firmware version ×10 (the app shows b2/10) |
| b3 | bit 0 LED, bit 1 test mode, bits 2-3 distance index (0 long / 1 medium / 2 short), bit 4 cloud service. Bits 5-7 are not read **(?)** |
| b4 | number of on-device local-linkage actions |

**`570011`** (main and distance-test screens). b0 is the status byte.

| Byte | Meaning |
|---|---|
| b1 | not read **(?)** |
| b2-b5 | seconds since the last motion, uint32 big-endian |
| b6 | light: 2 = bright, anything else = dim |
| b7 | 1 = motion detected now, 0 = none |

## 3. Settings the app can write

| Setting | Values | Command |
|---|---|---|
| Indicator LED | on / off | `5703` bit 0 |
| Detection distance ("Motion Sensitivity") | long 8 m / medium 4 m / short 2 m | `5703` bits 2-3 |
| Test mode (distance test) | on / off | `5703` bit 1 |
| Light-sensor calibration ("Light Sensor Settings": save the current room as the dim/bright threshold) | request `0x40` (or `0x20`) | `5703` bits 5-6, result in reply b1 |
| Cloud service via hub | on / off | `57000D09` / `08` + `570012` binding. Not for HA |
| Local linkage (the sensor drives BLE devices directly, with time windows) | – | stored on the sensor (b4 = count). How it is written is not known **(?)** |

No hold/clear time and no light threshold value can be set over BLE. The "no motion for N minutes" conditions are scene/cloud logic built on the last-motion time.

## 4. Advertisement

The app parses **service data only**; it reads no manufacturer data for this model.

**Service data (6 bytes):**

| Byte | Bits | App meaning | sbble key |
|---|---|---|---|
| b0 | bits 0-6 | model `0x73` `s` (pairing `0x53` `S`) | model detection |
| b0 | bit 7 | not read (masked off) **(?)** | – |
| b1 | bit 7 | not read by the app **(?)** | – |
| b1 | bit 6 | not read by the app. The app gets motion from `570011` or from the last-motion time | `motion_detected` |
| b1 | bit 5 | encryption flag. The app computes `(b1 & 0x32) >> 5`, which only keeps bit 5 | – |
| b1 | bits 0-4 | unknown **(?)** | – |
| b2 | bits 0-6 | battery % | `battery` |
| b3-b4 | | low 16 bits of seconds since the last motion (b3 high byte). The app computes the last-motion time as now - seconds (and sign-extends b3, an app bug) | – |
| b5 | bit 7 | bit 16 of seconds since the last motion | – |
| b5 | bit 6 | unknown **(?)** | – |
| b5 | bit 5 | LED state (1 = on) | `led_enabled` |
| b5 | bit 4 | cloud service / IoT mode | – |
| b5 | bits 2-3 | detection distance index: 0 long 8 m, 1 medium 4 m, 2 short 2 m | `detection_distance` (long / medium / short) |
| b5 | bits 0-1 | light intensity: 1 = dim, 2 = bright | `is_light` = bit 1 |

**Manufacturer data (company 2409):**
- sbble reads mfr[7] bit 6 as motion and bit 5 as light, and these override the service-data values.
- The app does not read manufacturer data for this model, so these bit positions are unconfirmed by the app **(?)**.

## 5. What ha_switchbot_ble does

Advertisements only: the sensor is passive in HA and no command is sent.

| App feature | Source | Entity | Notes |
|---|---|---|---|
| Motion | svc b1.6 / mfr b7.6 | binary sensor | Bits not confirmed by the app, see §4 |
| Light dim / bright | svc b5.1 / mfr b7.5 | binary sensor | sbble uses bit 1 only, so a value of 3 counts as bright; the app treats only 2 as bright |
| Battery | svc b2 | sensor | |
| LED state | svc b5.5 | diagnostic binary sensor `led_enabled`, disabled by default | |
| Detection distance | svc b5 bits 2-3 | enum sensor `detection_distance` (long / medium / short) | |
| Seconds since the last motion | svc b3-b4 + b5.7 | no | HA's own `last_changed` covers it |
| Set LED / distance, light-sensor calibration | `5703` | no | Need the cloud bit preserved and, on fw ≥ 19, encryption |
| Status read `570011` / `5702`, time sync, logs, local linkage, cloud binding | | no | Out of scope |

## 6. Notes

1. **Motion (svc b1 bit 6) is not confirmed by the app.** The app reads only bit 5 of b1 (the encryption flag) **(?)**.
2. **The manufacturer-data bits (mfr[7] bit 6 / bit 5) override the service-data values.** The app never reads them. If they are wrong on some firmware, motion would flap **(?)**.

## 7. Dangerous commands (never send)

- `5704`: enter OTA mode. `570F580302` / `…0303` / `…0304`: OTA file transfer.
- `570004`: erase device data.
- `57000D08` / `57000D09` (cloud off/on) and `570012` (binding). These change the hub binding and cloud reporting, so do not send them from HA.
- `5703` with the wrong **bit 4** (cloud flag) may switch the sensor's cloud mode **(?)**. Any future `5703` writer must copy bits 0-4 from the current state (adv b5 / `5702` b3) and change only the target bits.
- `5707` / `5706` (encryption / pairing info) and `570F2001` / `570F2002` (key pairs) on encrypted firmware.
- Factory reset is done with the hardware button only; no BLE command for it is known.

## 8. Open questions

- Is the `5702` reply b1 the battery, and what are b3 bits 5-7?
- What is the `570011` reply b1?
- What does `5701` do: blink, or beep?
- What do the light-calibration types `0x20` and `0x40` mean? Probably "set dim threshold" vs. "set bright threshold".
- Does the test-mode bit only shorten the PIR hold time, or more?
- Which firmware version turns encryption on? The app checks BLE version ≥ 19.
- How are the local-linkage actions written? The count is in `5702` b4.
