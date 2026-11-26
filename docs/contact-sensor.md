# SwitchBot Contact Sensor: app protocol

Product: SwitchBot Contact Sensor (door/window magnet sensor with motion sensor, light sensor and a button).

Analysis of 2026-11-16, from the behaviour of the SwitchBot app 10.10. Nothing was tested on a device. **(?)** marks uncertain items.

The app handles this sensor itself (not through a downloadable device plugin). The Contact Sensor shares its device handling with the Motion Sensor and the Presence Sensor.

**Our code:**
- Library: `sbble/devices/sensors/contact_sensor.py` (ids `d` / `D`).
- Integration: `catalog/sensors.py` (passive, advertisements only), `catalog/common.py` (`contact_open`, `is_light`, `motion_detected`, the `button` event).

## 0. Type codes and ids

| Item | Value |
|---|---|
| Cloud device type | `WoContact` |
| Service-data byte 0 (& 0x7F) | `0x64` "d" = normal; `0x44` "D" = pairing mode |
| Manufacturer id | 2409 (0x0969) |
| Encrypted commands | Yes from BLE firmware version **≥ 16**, or when the adv flag says so (below). The key comes from the same key setup as the Keypad / Button, not the lock one. |
| ha_switchbot_ble | passive (non-connectable), advertisements only |

## 1. App BLE commands

All commands are the generic `57xx` family. Writes are encrypted when the sensor uses encryption. A reply counts as OK when byte 0 is 0x01.

| Action / screen | Command (hex) | Meaning and byte layout |
|---|---|---|
| Find device | `5701` | The sensor blinks/beeps **(?)** |
| Status / info read | `5702` | Basic info / settings read. Layout in §2. The app also keeps the raw reply as "firmware info". |
| Settings write (BLE) | `5703 {flags} {exit} {timeout} {light}` | Write **all** settings at once (layout below) |
| Settings write (via Hub / cloud) | `5703 {flags} {exit} {timeout}` | Same without the 4th byte |
| Status screen (before `5702`) | `5709 01 {8-byte timestamp}` | Time sync. Timestamp encoding not checked **(?)** |
| Installation test / light-sensor screens | `570011` | Live status read (layout in §2) |
| Event log | `570014 01 {u32 unix time BE}` | Read the local event log since that time. Reply format not analysed **(?)** |
| Cloud on | `57001201 0011 0001` + 16 ASCII chars of the user id (dashes removed), then `57000d09` | Bind to the cloud via a Hub ("Cloud Service") and switch the reporting mode |
| Cloud off | `57000d08` | Leave cloud mode |
| Lock link | key-pair commands (`570f20xx`) | Lets the sensor talk to a SwitchBot Lock directly (e.g. auto-lock on close). Not analysed; not relevant to HA. |
| Firmware update | `5704` | Enter OTA mode. **Never send.** |

### `5703` settings write

The app first reads the current values (`5702`), changes one field, then writes every field back.

**Byte 2, flags:**

| Bit(s) | Field | Values |
|---|---|---|
| 0 | indicator light | 1 = on. App text: "glows whenever the open/closed state changed, motion detected, or ambient brightness changed". |
| 1 | motion sensor mode | Copied from the read; the contact settings never change it **(?)** |
| 2–3 | installation site | 0 = door, 2 = window, 3 = other. The app never uses 1 **(?)**. |
| 4 | cloud service enabled | 1 = cloud on |
| 5 | detection range | Never set by the contact settings. Probably the motion detection range **(?)** |
| 6–7 | unknown | Copied from the read; maybe which hall sensor/orientation is active **(?)** |

**Byte 3, Exit mode** ("Exit", "only applies to installation on a door"):
- bit 7: 0 = "press button", 1 = "auto detection". Auto detection probably uses the motion sensor **(?)**.
- bits 0–6: duration in **5-second steps**, 1–120 (5 s … 10 min). The app has minutes 0–10 + seconds 0–55 and forbids 0:00.

**Byte 4, Left-open timeout:** 1–30, probably minutes **(?)**. The door is reported as "Left open" (status 2) after this time.

**Byte 5** (BLE variant only):
- bits 0–1: light-sensor action: 0 = none, **1 = calibrate** ("confirm the current ambient brightness is dim"; it fails if the room is too bright), **2 = reset** to the default threshold.
- bit 2: **1 = normal mode, 0 = test mode**. The installation guide ("Test", "Open and close the door…") switches to test mode while it polls `570011`, then writes normal mode again.

## 2. Read reply layouts

### `5702`

| Byte | Meaning |
|---|---|
| 0 | status (1 = OK) |
| 1 | not used by the app **(?)** |
| 2 | firmware version × 10 (the app shows `b2 / 10`) |
| 3 | flags, same layout as the `5703` flags byte. The app reads bits 0, 1, 2–3, 4 and 6–7, **but not bit 5** (detect range). |
| 4 | an action count, meaning unknown **(?)** |
| 5 | Exit mode byte (as written) |
| 6 | left-open timeout (as written) |

The light-sensor/work-mode byte of `5703` is **not** read back.

### `570011` (live status; installation test and light-sensor screens)

| Byte | Meaning |
|---|---|
| 0 | status |
| 2–5 | seconds since the last door change (u32 BE). The app computes `now − value`. |
| 7 | light level (1 = bright, else dim) |
| 8 | door status 0 / 1 / 2 (as in the adv) |
| 1, 6 | not used **(?)** |

## 3. Advertisement layout

The app parses **only the service data** for this device. It does not use manufacturer data. Time fields need `len > 8`.

| Byte | Bits | Meaning (app) | sbble (service-data branch) |
|---|---|---|---|
| 0 | 0–6 | type `0x64` / pairing `0x44` | model id |
| 1 | 7 | — (not read by the app) | — |
| 1 | 6 | **motion detected** | `motion_detected` |
| 1 | 5 | "encrypted" flag (the app masks with `0x32` and shifts by 5, so only bit 5 survives) | — |
| 2 | 0–6 | battery % | `battery` |
| 3 | 7 | bit 16 of "seconds since last motion" | — |
| 3 | 6 | bit 16 of "seconds since last door change" | — |
| 3 | 1–2 | **door status**: 0 = closed, 1 = open, 2 = left open (timeout); 3 not used | `contact_open` = bit 1 or bit 2 (left open is still open) |
| 3 | 0 | **light level**: 1 = bright, 0 = dim | `is_light` |
| 4–5 | | seconds since last motion, low 16 bits (BE) → 17-bit value, max ≈ 36 h | — |
| 6–7 | | seconds since last door change, low 16 bits (BE) → 17-bit value | — |
| 8 | 0–3 | — (not read by the app) | `button_count` (press counter) **(?)** |

The app turns the two "seconds since" fields into absolute times and caches them per MAC. The cached time is kept while the status is the same and the offset only grows (2-second tolerance).

**Manufacturer-data branch (sbble only):** when the manufacturer data has ≥ 13 bytes, sbble reads:
- `mfr[7]`: bit 7 motion, bit 6 light, bit 5 timeout, bit 4 open;
- `mfr[12] & 0x0F`: button count.

The app does not have this layout, so it is **unconfirmed (?)**. Battery still comes from the service data, so with mfr data only it is `None`; parsed data is merged, so a `None` does not overwrite the last battery value.

## 4. Settings the app can change

| Setting | Command / field | Values |
|---|---|---|
| Indicator light | `5703` flags bit 0 | on / off |
| Installation (door / window / other) | `5703` flags bits 2–3 | 0 / 2 / 3 |
| Exit mode (press button / auto) + duration | `5703` byte 3 | bit 7 mode, 5 s – 10 min |
| Left-open timeout | `5703` byte 4 | 1–30 (minutes?) |
| Light-sensor calibrate / reset | `5703` byte 5 bits 0–1 | 1 / 2 |
| Test mode | `5703` byte 5 bit 2 | normal / test |
| Cloud service (via Hub) | `570012…`, `57000d09` / `57000d08` | on / off |
| Name, icon, scenes, notifications | cloud only | — |

There is no buzzer on this device and no app setting for the button itself. The button is used for the Exit mode and shows up as a counter in the adv (sbble).

## 5. What ha_switchbot_ble does

Advertisements only: the sensor is passive in HA and no command is sent.

| App feature | Source | Entity | Notes |
|---|---|---|---|
| Door open / closed | adv b3 bits 1–2 | door binary sensor (`contact_open`) | Left open (status 2) also counts as open. Status 3 (both bits) is undefined in the app and shows as open. |
| Motion | adv b1 bit 6 | motion binary sensor | |
| Light level bright/dim | adv b3 bit 0 | light binary sensor (`is_light`) | |
| Battery | adv b2 | sensor | Service data only |
| Button press | adv b8 / mfr b12 | `button` event (fires on a `button_count` change) | Not read by the app **(?)** |
| Time since last door change / motion | adv b3.6–7 + b4–7 | no | HA's own `last_changed` covers it |
| Settings (indicator light, installation site, Exit mode, left-open timeout, light-sensor calibration) | `5702` / `5703` | no | Need a connection, a `5702` read-modify-write and, on fw ≥ 16, the encryption key |
| Live status / test mode, event log, cloud binding, lock link | `570011`, `570014`, `570012` / `57000d`, key pairs | no | Not needed or not wanted in HA |

## 6. Notes

1. **The mfr-data layout is unverified.** `mfr[7]` bits 4–7 and `mfr[12]` have no counterpart in the app. They could be wrong on newer firmware **(?)**. Compare with service data on a real device.
2. Minor: the app's encrypt-flag mask `0x32 >> 5` looks like a typo for `0x20` (harmless, only bit 5 survives).

## 7. Dangerous commands: never send

- `5704`: enter OTA mode.
- `570004`: generic "erase device data", i.e. factory reset **(?)** for this model.
- `570f20xx` key-pair commands (`570f2001` deletes all key pairs): they would break the lock link and the encryption key.
- `57000d08` / `57000d09` and `570012…`: they change the cloud/reporting mode. They are not destructive, but HA should not touch them.
- `5703` with guessed values: the write replaces **all** settings at once, including the cloud bit and the unknown bits 1/5/6–7. Always read `5702` first and copy those bits back.

## 8. Open questions

- Meaning of `5702` b1 and b4 (action count), flags bits 1, 5, 6–7 **(?)**.
- Unit of the left-open timeout (minutes?) **(?)**.
- Format of the 8-byte timestamp in `5709 01` **(?)**.
- Does adv b8 really carry the button counter? The app does not read it **(?)**.
- Is the mfr-data layout sbble uses real, and on which firmware **(?)**?
- How the fw ≥ 16 encryption key is obtained. It is not the lock key; it may be in the cloud key list for "button"-type devices **(?)**.
