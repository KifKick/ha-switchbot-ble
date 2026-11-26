# SwitchBot mmWave Presence Sensor: app protocol

Product: SwitchBot mmWave Presence Sensor (battery, 24 GHz radar + light sensor).

Analysis of 2026-11-16, from the behaviour of the SwitchBot app 10.10, including its settings screens for this sensor. Nothing was tested on a device. **(?)** marks uncertain items.

**Our code:**
- Library: `sbble/devices/sensors/presence_sensor.py` (ids `00 10 CC C8` / `01 10 CC C8`).
- Integration: `catalog/sensors.py` (passive, advertisements only; `battery_range`, `led_state`, `adaptive_state`), `catalog/common.py` (`motion_detected` with device class occupancy, `lightLevel`, battery).

## 1. Identity

| Item | Value |
|---|---|
| Cloud type code | **W1101000** (`WoPresenceSensor`) |
| BLE id | 3-byte number 1101000 = `0x10CCC8`. Service data byte 0 & 0x7F = `0x00`, bytes 4-6 = `10 CC C8`. The 4-byte id is `00 10 CC C8`. |
| Pairing mode | service data byte 3 bit 0 |
| sbble | `PresenceSensor`, found by the service-data suffix `00 10 CC C8` (normal) or `01 10 CC C8` (pairing) |
| Encryption | **Always encrypted**, whatever the firmware, with the same key scheme as the Keypad (see `keypad.md`). |

The app's main screen reads the status itself; all settings live on separate screens that the app downloads on demand. Every setting is **BLE only and encrypted**; there is no cloud path for settings. The command bytes below are the plain payloads; the encryption frame is added on top.

## 2. App BLE commands

### Main screen and setup

| Command | Meaning |
|---|---|
| `5702` | Basic info. Sent by the main screen and during setup. The app reads the reply in the **Motion Sensor** layout (see §3) **(?)** |
| `570f7781` | **Status read** ("get device info"). Reply layout in §3 |
| `5709 01` + 8-byte UTC seconds (big-endian) | Time sync, sent by the main screen |
| `570002` | Hardware version, sent during setup. Reply: b2 = hardware version |

The app also contains copies of the Motion Sensor test screens that send `5703`+byte (Motion Sensor settings) and `570011` (Motion Sensor status), but nothing opens them **(?)**. Do not use them as a source for this device.

### Settings screens

Multi-byte numbers are big-endian. A reply is OK when its first byte is `01` (anything else is "device response err"); "r1" below is the first byte after the status.

| Command (hex) | Payload | Reply | Used by |
|---|---|---|---|
| `570F7601 01 000F 20` | fixed bytes. `01` = start; the meaning of `00 0F 20` is unknown (maybe 15 s / 32 bins) **(?)** | status only | Auto-adjust, step 1 |
| `570F7601 02 000F 20` | `02` = stop/end | status only | **never sent** by the app |
| `570F7701` | – | r1 = adjust status; `1` = done | Auto-adjust, polled every 5 s |
| `570F7604 01` + uint16 | `01` = "distance mode" **(?)**, then the range in **millimetres**, 250-8000, step 250 | status only | Detection Range |
| `570F770401` | – | r1-r2 = range in mm (uint16 BE); the app clamps to ≤ 8000 | Detection Settings / Range |
| `570F7605` + uint16 | unoccupied timeout in **seconds** | status only | Unoccupied Timer |
| `570F7606 01` / `570F7606 00` | `01` = LED on, `00` = off | status only | Indicator Light switch |
| `570F7703 tt ii` | `tt` = `01` (motion) or `03` (micro-motion); `ii` = segment index `00`-`0D` (14 segments) | **only logged**, layout unknown **(?)** | read once after auto-adjust succeeds (28 reads) |
| `570F7781` | – | see §3 | all settings screens, firmware screen, pairing |
| `570002` | – | r2 = hardware version (default 60 if the read fails) | firmware screen, pairing |
| `57000501` + 8-byte UTC seconds (BE) | time sync. The main screen sends `5709 01` + 8 bytes instead; which one the firmware wants is unclear **(?)** | status only | after pairing / firmware read |
| `570F5803 02 cc vv` + uint32 size | chunk size, file version, file size | – | **radar OTA, dangerous** |
| `570F5803 03` + uint16 idx + len + data | – | – | **radar OTA** |
| `570F5803 04` | – | – | **radar OTA** |

Pairing sets up the device key with a cloud call; the integration never sends key setup frames.

**Never sent by the app:** `570F7602` (distance-spectrum report), `570F760300`-`760303` (threshold writes), `570F7607` (range in bin mode), `570F7702` (read distance spectrum), `570F770302` (per-bin trigger state). There is **no manual sensitivity slider** in the app: "Detection Sensitivity" is only the auto-adjust wizard. These commands are probably factory/debug tools. Their payloads stay **unknown (?)**; the reads `770301`/`770303` (`tt` = 1/3) suggest the writes use the same 14-segment indexing, and by analogy `760300`/`760301` = motion and `760302`/`760303` = micro-motion (per segment / all) **(?)**.

## 3. Read reply layouts

**`570f7781` (status)**, ≥ 12 bytes. b0 is the status byte.

| Byte | Meaning |
|---|---|
| b1 | battery % |
| b2 | BLE firmware version (if > 0) |
| b3 | bits 3-7: light level 0-31; bit 2: adaptive state; bit 1: occupied; **bit 0: indicator LED on** (drives the Indicator Light switch) |
| b4 | number of on-device "local linkage" actions |
| b5-b6 | **unoccupied timeout in seconds**, uint16 BE (the Unoccupied Timer screen shows it as mm:ss). The main screen does not read it |
| b7-b10 | seconds since the last state change, uint32 big-endian (main screen only). The app computes `now - x` as the last occupied or unoccupied time |
| b11 | radar firmware version (if > 0) |

**`570F7701` (adjust status):** b1 = 1 when auto-adjust finished; other values = still running / not done **(?)**.

**`570F770401` (detection range):** b1-b2 = range in mm, uint16 BE (0.25-8 m).

**`570F7703 tt ii` (thresholds):** the app only logs the reply; layout unknown **(?)**.

**`5702` (basic info).** The app reads the reply in the Motion Sensor layout: b2/10 = version; b3 bit 0 LED, bit 1 test mode, bits 2-3 distance, bit 4 cloud mode; b4 action count. Whether the presence firmware really uses this layout is **unknown (?)**.

## 4. Advertisement

Manufacturer data, company 2409; the offsets include the 6-byte MAC. The app reads nothing from service data except the model byte, the pairing bit and the id.

**Manufacturer data (at least 12 bytes):**

| Byte | Bits | App meaning | sbble key |
|---|---|---|---|
| b0-b5 | | MAC | – |
| b6 | all | sequence number | `sequence_number` |
| b7 | bit 7 | adaptive (auto-adjust) state. 0 = not done: the app shows "detection sensitivity can be enhanced after auto-adjustment" | `adaptive_state` |
| b7 | bit 6 | occupied | `motion_detected` |
| b7 | bits 2-3 | **not read by the app** | `battery_range` (<10 / 10-19 / 20-59 / ≥60 %) **(?)** |
| b7 | bit 0 | **bit 16 of the seconds counter** (`(b7 & 1) * 65536 + b8b9`) | – |
| b7 | bits 1, 4, 5 | unknown **(?)** | – |
| b8-b9 | | low 16 bits of seconds since the last occupied/unoccupied change. The app computes the last occupied or unoccupied time = now - seconds | – |
| b10 | bits 0-7 | trigger flags, one per bit. Probably which of 8 radar segments or bins triggered **(?)** | – |
| b11 | bit 7 | LED / indicator state | `led_state` |
| b11 | bits 5-6 | unknown **(?)** | – |
| b11 | bits 0-4 | light level 0-31 | `lightLevel` |

**Service data:**
- b0 & 0x7F = `0x00`.
- b3 bit 0: pairing mode.
- b4-b6: `10 CC C8`.
- sbble reads battery from **b2 & 0x7F**. The app does not read it from the advertisement; it gets battery from `570f7781` b1 or from the cloud **(?)**.

**Light level scale** (app help text): dark < 2, dim 3-6, slightly bright 7-11, bright 12-17, very bright > 18. Scene conditions use "> Level n" / "< Level n".

The cloud keeps two more numeric values for this sensor that nothing in the app sets; their meaning is unknown **(?)**. After pairing the app stores "auto-adjust not done" in the cloud, and "done" after a successful auto-adjust, plus the radar firmware version.

Product limits from the install guide: max detection 8 m (26 ft) long, 6 m (20 ft) wide, 120° angle.

## 5. Settings the app can write

All settings are **BLE only** (encrypted connection); none goes through the cloud. The app has no "light-sensor settings": its light settings screen is just the indicator LED switch. Factory defaults are not known **(?)**.

**Detection Settings screen** has three rows: "Detection Sensitivity" (→ auto-adjust), "Detection Range" (shows the current range, e.g. "4.00 m") and "Unoccupied Timer". On open it reads `570F7781` (timer from b5-b6) and `570F770401` (range).

| Setting | Command | Value / range | UI control | Notes |
|---|---|---|---|---|
| Detection Range | `570F7604 01` + uint16 mm | 250-8000 mm, step 250 (0.25-8 m) | slider 1-32, value × 0.25 m; Save button | Read back with `570F770401`. Text: "Effective range: 0.25~8 m. The shorter the detection range, the lower the power consumption." Recommended 4 m for compact rooms (kitchen, bathroom), 8 m for open spaces. "Please adjust the detection sensitivity after changing the detection range"; during setup the app goes straight to auto-adjust after saving |
| Unoccupied Timer | `570F7605` + uint16 seconds | picker with a minutes column (up to 3) and a seconds column (from 5), so about 5 s to 3 min 59 s **(?)** (exact limits not checked) | picker, OK button; shown as `00:MM:SS`, "Not set" when 0 | Read back from `570F7781` b5-b6. Tip: a short timer may report "unoccupied" while someone is there; use ≥ 15 s for little movement or far from the sensor (TV on the sofa, desk work). Any motion (curtains, pets) restarts the timer |
| Indicator Light | `570F7606 01` / `00` | on / off | switch "Indicator Light" | Read back from `570F7781` b3 bit 0 (and adv b11 bit 7). Text: "Blinks once when Sensor status changes (e.g., from Space occupied to Space unoccupied)." |
| Detection Sensitivity = Auto-Adjust | `570F7601 01000F20`, then poll `570F7701` | – | wizard, button "Auto-Adjust" | See the sequence below. Result in adv b7 bit 7 / status b3 bit 2 |
| Motion / micro-motion thresholds per segment | `570F760300`-`760303` | unknown **(?)** | **none** in the app | Only reads (`570F7703 01|03 00..0D`, logged) |
| Detection range in bin mode | `570F7607` | unknown **(?)** | none | |
| Distance spectrum | `570F7602` / `570F7702` | unknown **(?)** | none | |
| Local linkage (the sensor drives BLE devices directly) | unknown | – | log screen etc. | out of scope |

**Auto-adjust sequence:**
1. Guide: "Turn on all the interference sources (e.g., fans, air conditioners, air purifiers) and set them to maximum fan speed"; "Remain outside the detection zone"; the user ticks "Preparation done". First run shows "Please wait about 3 minutes for the adjustment to complete."
2. Send `570F7601 01 00 0F 20`. On success: 30 s countdown, "Identifying interference sources... Please remain outside the detection zone and maintain Bluetooth connection."
3. "Auto-adjusting via AI (in approx. 3 minutes)": poll `570F7701` every 5 s, for at most 180 s. If r1 never becomes 1 → "Adjustment failed" (retry: "Wait 15s outside the detection zone, then tap Retry").
4. r1 = 1: the app stores "auto-adjust done" in the cloud, reads all 28 thresholds (log only), and shows a 15 s countdown "The Sensor is saving interference data … stay on this page". Then "Adjustment successful".
5. `570F7601 02 …` (end) is never sent; the device ends the process by itself **(?)**.

## 6. What ha_switchbot_ble does

Advertisements only: the sensor is passive in HA, never connected to, and the config flow asks for no encryption key.

| App feature | Source | Entity | Notes |
|---|---|---|---|
| Occupied / unoccupied | adv b7.6 | binary sensor, device class occupancy | |
| Light level 0-31 | adv b11 0-4 | sensor `lightLevel` (no unit, measurement) | |
| Battery % | service data b2 | sensor (when service data was seen) | The app uses `570f7781` b1; the two have not been compared **(?)** |
| Battery range | adv b7 2-3 | diagnostic enum sensor | Not read by the app **(?)** |
| LED state | adv b11.7 | diagnostic binary sensor `led_state`, disabled by default | |
| Auto-adjust done | adv b7.7 | diagnostic binary sensor `adaptive_state` | |
| Seconds since last change | adv b7.0 + b8-b9 (17 bits) | no | HA's own `last_changed` covers it |
| Trigger flags per segment | adv b10 | no | Meaning unconfirmed **(?)** |
| Status read `570f7781`, radar firmware, time sync | | no | Need an encrypted connection |
| Indicator LED, unoccupied timeout, detection range, auto-adjust | `570F7606`, `570F7605`, `570F7604 01` / `570F770401`, `570F7601` + `570F7701` | no | Payloads known (§5); each needs an encrypted connection (keypad-style key, §8) |
| Sensitivity thresholds, distance spectrum, bin-mode range | `7603xx`, `7602`, `7607`, `7702` | no | Unused by the app; do not expose |
| Local linkage, logs | | no | Out of scope |

## 7. Notes

1. **`battery_range` from b7 bits 2-3 is not confirmed by the app.** The app ignores those bits. If they mean something else, the battery-range sensor is wrong **(?)**. Check against a device by comparing with `570f7781` b1.
2. **Battery from service data b2** is not confirmed by the app either **(?)**.

No problems were found in the occupancy, light level or LED bit positions; they match the app.

## 8. Dangerous commands (never send)

- `5704`: enter OTA mode. `570F580302` / `…0303` / `…0304`: OTA file transfer. `570F8201`: radio OTA mode.
- `570004`: erase device data.
- `570F2001` (clear all key pairs) and `570F2002` (delete a key pair). The device uses the keypad-style key scheme, so these could leave it unreachable without a reset and re-pairing.
- `5707` (set encryption info), `5706` (set pairing info), `570012` (set binding info).
- `57000D xx` (set work mode). On the Motion Sensor `08` / `09` switch cloud service off/on together with the hub binding; on this device the effect is unknown.
- `570F7601` (self-adaptation) is not destructive as far as we know, but it changes the radar baseline. The app requires the room to be empty with all fans/purifiers running, for ~3.5 min; running it with a person inside would teach the radar to ignore that person **(?)**.
- `570F5803 02/03/04`: **radar OTA** (start with chunk size, version, file size; transfer; finish). Never send.
- Key setup frames: they can replace or clear the device keys. The integration never sends them.
- Factory reset is done with the hardware button only; no BLE command for it is known.

## 9. Open questions

- Payloads of `570F7602`, `760300`-`760303`, `7607`, `7702` and the reply layout of `570F7703` / `770302`. The app does not use them, so only a firmware dump or a factory tool would show them.
- Meaning of the fixed `00 0F 20` in `570F7601 01 00 0F 20`, and of `01` in `570F7604 01`.
- Exact limits of the unoccupied timer and the factory defaults of range and timer.
- Time sync: `57000501` (settings screens) or `5709 01` (main screen)?
- Is the `5702` reply really in the Motion Sensor layout?
- Meaning of adv b7 bits 1/4/5 and b11 bits 5-6. (`570f7781` b3 bit 0 = LED and b5-b6 = timeout are now known.)
- Does `battery_range` (b7 bits 2-3) really exist? Is service data b2 the battery?
- What are the two cloud values that nothing in the app sets?
- Do the eight trigger flags (adv b10) map to distance segments or to radar bins? The thresholds use 14 segments, so adv b10 cannot be one bit per threshold segment **(?)**.
- Can the keypad key from the SwitchBot account be reused unchanged for this model?
