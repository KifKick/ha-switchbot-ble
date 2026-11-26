# SwitchBot Water Leak Detector: app protocol

Product: SwitchBot Water Leak Detector (battery, Wi-Fi + BLE, built-in buzzer, test button; "Leak alert" or "Dry alert" mode).

Analysis of 2026-11-16, from the behaviour of the SwitchBot app 10.10, including its device screens for this detector. Nothing was tested on a device. **(?)** marks uncertain items.

**Our code:**
- Library: `sbble/devices/sensors/leak_detector.py` (ids `&` / `\x06`).
- Integration: `catalog/sensors.py` (passive, advertisements only), `catalog/common.py` (`leak` moisture sensor, battery).

## 0. Type codes and ids

| Item | Value |
|---|---|
| Cloud device type | `WoWaterDetector` ("Water Leak Detector") |
| Service-data byte 0 (& 0x7F) | `0x26` "&" = normal; `0x06` = pairing mode |
| Manufacturer id | 2409 (0x0969). The app reads the state **only from manufacturer data**. |
| Modes and states | mode 1 = leak alert ("soaking"), 0 = dry alert; state 1 = wet, 0 = dry |
| Encryption | The app sends the alarm commands without encryption, so they are probably **plaintext** **(?)**: a lower layer could still add the key. Encryption is used only for Wi-Fi provisioning. |
| Transports | BLE, Wi-Fi/IoT cloud, and LAN through a Hub (the Hub relays the same BLE command; the reply gets an extra 2-byte header). |
| ha_switchbot_ble | passive (non-connectable); cloud type `WoWaterDetector` is in sbble's `CLOUD_MODELS` |

## 1. App BLE commands

A reply counts as OK when byte 0 is 0x01, 0x06 or 0x0e.

| Command (hex) | Meaning and byte layout |
|---|---|
| `570f6101` | Read basic info (layout in §2). The app also uses it for the first read over a Hub. |
| `570f6001 {mode} ff ff ff` | Alarm mode: **1 = Leak alert, 0 = Dry alert** (range 0–1). The reply carries the last-alarm UTC in b7–10. |
| `570f6001 ff {vol} ff ff` | Alarm volume 0–3: **0 = Quiet (no sound), 1 = Low, 2 = Medium, 3 = High**. Volume 0 also clears "buzzer ringing". |
| `570f6001 ff ff {dur} ff` | Alarm duration 1–180 **seconds**. |
| `570f6001 ff ff ff {int}` | Alarm interval 0–60 **minutes**. |
| `570f6002` | **Mute now** (stop the buzzer) |
| `570e01002000008104` | Enable notifications (packet layout in §2). Meaning of the payload bytes unknown **(?)**. The app sends it each time the device screen is open and the device is seen over BLE. |
| `570e00` | Disable notifications |
| `5702` | Firmware info: b2 = BLE version, b10 = Wi-Fi version |
| `5704` | BLE OTA mode. **Never send.** |
| `570f0a{01\|02}{ver}`, then `570f0b` | Wi-Fi OTA start (01 = prod, 02 = dev server) and progress poll (b1 = %), then `57000300` to check the version. **Never send.** |
| time sync (generic) | The app sends the current Unix UTC seconds once per screen open, over BLE, before enabling notifications. Layout not checked **(?)** |
| generic reads | Wi-Fi state / IP / SSID |

`0xff` in `570f6001` means "keep the current value", so each field can be written on its own.

The app also keeps a "last time the user left the screen" value in the cloud (no BLE command). It is probably used to suppress repeated in-app alarm pop-ups **(?)**.

## 2. Read reply layouts

### `570f6101`

The app rejects the reply when `len < 11`, or b1 > 100, b2 > 1, b3 > 3 or b6 > 1.

| Byte | Meaning |
|---|---|
| 0 | status |
| 1 | battery % |
| 2 | alarm mode (1 leak / 0 dry) |
| 3 | volume 0–3 |
| 4 | alarm duration (s) |
| 5 | alarm interval (min) |
| 6 | **current state: 1 = wet, 0 = dry** |
| 7–10 | last alarm time, Unix UTC seconds (u32 BE) |

The `570f6001` reply uses the same layout (the app reads b7–10 from the mode write's reply).

### Notify packet (after `570e01…`)

The app parses it only when `len > 9`.

| Byte | Meaning |
|---|---|
| 1 | battery % |
| 2 | flags, same layout as adv `mfr[8]` (§3) |
| 3–6 | last alarm UTC (u32 BE) |
| 7 | alarm duration (s) |
| 8 | alarm interval (min) |
| 9–12 | last test-button press UTC (u32 BE) |
| 13 | sequence number |

## 3. Advertisement layout

Manufacturer data for id 2409 without the company id, the same indexing as the manufacturer data in sbble. The app needs `len ≥ 14` but reads up to index 18, so a 14–18 byte payload fails in the app (an app bug; real adverts are probably ≥ 19 bytes **(?)**).

| Byte | Bits | Meaning (app) | sbble key |
|---|---|---|---|
| 0–5 | | MAC | — |
| 6 | | sequence number | — |
| 7 | 0–6 | battery % | `battery` |
| 7 | 7 | not read by the app **(?)** | — |
| 8 | 7 | **alarm mode**: 1 = leak alert, 0 = dry alert | `alarm_mode` |
| 8 | 6 | **current state: 1 = wet (water present), 0 = dry** | `leak` |
| 8 | 5 | buzzer is ringing | `buzzer_ringing` |
| 8 | 3–4 | alarm volume 0–3 (0 = quiet) | `alarm_volume` |
| 8 | 2 | "Wi-Fi can't connect" | `wifi_fault` |
| 8 | 0–1 | "alarm count", 0–3. **The app never shows it.** | `alarm_count` |
| 9–12 | | last alarm time, UTC s (u32 BE) | — |
| 13 | | alarm duration (s) | `alarm_duration` |
| 14 | | alarm interval (min) | `alarm_interval` |
| 15–18 | | last test-button press, UTC s (u32 BE) | — |

**Alarm logic in the app:** an alarm is raised when `state == mode` (bit 6 == bit 7) and the last known mode differs from the last known state. In leak mode an alarm means "wet". In dry mode it means "dry" (e.g. a water bowl or tank ran empty: "Detects low water level"). The main screen uses the same rule (§5a).

**Alarm count (bits 0–1):** the strings say "Your device will alarm up to 3 times after the alarm is triggered", and with interval 0 the app warns "The device alarm will sound up to 3 × duration seconds". So the 2-bit field is most likely the number of buzzer rounds (0–3) in the current alarm **(?)**.

## 4. Settings the app can change

Only family admins see these settings.

| Setting | Command | Range | UI default when unknown | Notes |
|---|---|---|---|---|
| Mode: "Leak alert" / "Dry alert" | `570f6001 {m} ff ff ff` | 1 / 0 | Leak alert | Dry alert is "*Only for Water Leak Detector with Sensor Cable*": put the probe in water, alarm when it is dry. "Do not put the main unit into the water." |
| Alarm duration | `570f6001 ff ff {d} ff` | 1–180 s (slider) | 60 s (another part of the app falls back to 10 s when the cloud has no value) | |
| Alarm interval | `570f6001 ff ff ff {i}` | 0–60 min (slider) | 5 min | "The sound alarm interval for one leak/dry alert before it is removed." Interval 0 → toast "will sound up to 3 × duration seconds". |
| Alarm volume | `570f6001 ff {v} ff ff` | 0 Quiet, 1 Low, 2 Medium, 3 High | Low | Quiet: "The device will not emit an alarm sound once the alarm is triggered!" |
| Mute the current alarm | `570f6002` | — | — | A mute button appears on the main screen only while the buzzer is ringing and the device is online. |
| Wi-Fi setup | BLE provisioning (`570f01`/`02`/`03`, `570f04` status, `570f10`/`11` SSID scan) | — | — | Settings → Wi-Fi; device info shows BLE and Wi-Fi MAC. |
| Email alerts, app notifications, automations | cloud only | — | — | |

Every write needs BLE in range, the cloud/IoT link, or a LAN route; otherwise the app shows "Out of the device's Bluetooth range". The device has no LED setting and no tamper or tilt setting. The app has no "test" command: the test is physical (wet the electrodes or press the button) and only the guide screens and the event log show it.

## 5. App UI

### 5a. Main screen status

The screen uses the mode, the state, volume, duration, interval, buzzer, Wi-Fi fault, battery, online state, BLE visibility, Hub status and LAN route. It never shows the alarm count, the last alarm time or the last test-button press.

| When | Text | Colour |
|---|---|---|
| not seen over BLE, cloud offline and no LAN route | "Offline" | — |
| mode = Leak alert (or unknown) and state = 0 (dry) | "Safe" | blue |
| mode = Leak alert and **state = 1 (wet)** | "Water leak" | orange, animated |
| mode = Dry alert and state = 1 (wet) | "Safe" | blue |
| mode = Dry alert and **state = 0 (dry)** | "Dry" | orange, animated |

### 5b. Banners (first match wins)

1. Admin without a linked email: "Link an email address to receive alert notifications."
2. Offline: offline help.
3. **Wi-Fi fault** (adv bit 2): "Network connection error. Please check its Wi-Fi connection." (links to the Wi-Fi settings).
4. **Battery ≤ 20 %**: "Battery low. Please replace the device batteries soon." The threshold is in the app; it does not use adv `mfr[7]` bit 7.

### 5c. Event log (cloud only)

"Water leak", "Leak alert removed", "Dry", "Dry alert removed", leak / dry alert activated (mode changed), "Water leak (test)", "Dry (test)". The main screen shows the last three. The test events come from the cloud; how the device marks a test (button press) is not known **(?)**.

### 5d. Alarm path (from the test guide)

With a Hub online, the Hub relays the alarm at once. Without a Hub, the device sends the alarm over BLE and also turns on Wi-Fi to send it; this "may take 30 to 120 seconds", then Wi-Fi is turned off again to save battery. The device beeps and flashes red while wet.

## 6. What ha_switchbot_ble does

Advertisements only: the detector is passive in HA and no command is sent.

| App feature | Source | Entity | Notes |
|---|---|---|---|
| Wet / dry state | adv `mfr[8]` bit 6 | moisture binary sensor (`leak`) | The app always takes the state from bit 6; bits 0–1 are the alarm count |
| Alarm active | derived: bit 6 == bit 7 | problem binary sensor | The app's "Water leak" / "Dry" status (§5a) |
| Buzzer ringing | adv bit 5 | binary sensor (sound) | The app shows the mute button only then |
| Wi-Fi fault | adv bit 2 | diagnostic problem binary sensor | App banner "Network connection error" |
| Alarm mode (leak / dry) | adv bit 7 | enum sensor | |
| Alarm volume | adv bits 3–4 | enum sensor: quiet / low / medium / high | |
| Alarm count | adv bits 0–1 | diagnostic sensor, disabled by default | The app does not show it |
| Alarm duration / interval | adv b13 / b14 | sensors (s / min) | Need ≥ 15 bytes of manufacturer data |
| Battery | adv b7 | sensor | |
| Last alarm time, last test-button press | adv b9–12, b15–18 | no | |
| Mode, volume, duration, interval writes; mute now | `570f6001`, `570f6002` | no | Need a connection; whether the commands are plaintext is unknown |
| Firmware versions | `5702` b2 / b10 | no | Low value |

## 7. Notes

1. **Short adverts:** the app needs `len ≥ 14` but reads up to index 18. Fields after b14 need `len ≥ 19`.
2. **Adv `mfr[7]` bit 7** is not used by the app; the low-battery banner uses battery ≤ 20 % **(?)**.

## 8. Dangerous commands: never send

- `5704`: BLE OTA mode.
- `570f0a01{ver}` / `570f0a02{ver}`: Wi-Fi firmware update (02 = dev server!). The app warns that a low battery can brick the upgrade: "If the device cannot start after the upgrade, remove the batteries…".
- `570004`: generic "erase device data", i.e. factory reset **(?)**. Deleting the device in the app also "restore[s] it to factory settings".
- `570016`: clears data the device queued for upload **(?)**.
- Wi-Fi provisioning (`570f01`/`02`/`03`, `570f0c` region, `570f16` token) and the `570f9x` local-broker commands: they change how the device reaches the cloud.
- `570e01…` with other payloads: the bytes of the notify-enable command are not understood **(?)**.

## 9. Open questions

- Volume, units and ranges are now known (§4). The factory default duration is unknown: one part of the app assumes 60 s, another 10 s **(?)**.
- Are commands really plaintext over BLE, or does a lower layer add the device key **(?)**?
- Meaning of the `570e01 00 20 00 00 81 04` payload **(?)**.
- How the alarm count (bits 0–1) changes during an alarm and when it resets **(?)**. This only matters for a diagnostic sensor now.
- Is there a "test button count"? It never appears in BLE data; maybe it is cloud-only **(?)**.
- What the "last time the user left the screen" value is used for **(?)**.
- Does the device advertise as connectable? HA treats it as passive.
