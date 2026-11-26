# SwitchBot Air Purifier / Air Purifier Table (EU): app protocol

Analysis of 2026-11-16, from the behaviour of the SwitchBot app 10.10. Nothing was tested on a device.

**Our code:**
- Library: `sbble/devices/air/air_purifier_base.py` and one module per model (`air_purifier_us.py`, `air_purifier_jp.py`, `air_purifier_table_us.py`, `air_purifier_table_jp.py`).
- Integration: `catalog/appliances.py` (`PURIFIER`, `TABLE`, `PM25`), `fan.py`, `light.py`.

## 1. Models and how the app tells them apart

The app knows exactly four purifier types and **none of them is an EU type**:

| Type | Model byte (adv[0]&0x7F) | Pair-mode byte | What it is |
|---|---|---|---|
| Air Purifier US | 0x2A `*` | 0x0A | standard, outside Japan |
| Air Purifier JP | 0x2B `+` | 0x0B | standard, Japan (has the ion function) |
| Air Purifier Table US | 0x37 `7` | 0x17 | Table, outside Japan (wireless charger) |
| Air Purifier Table JP | 0x38 `8` | 0x18 | Table, Japan |

- The app recognises only these four model bytes (each with its pair-mode byte).
- Scenes treat US and Table US as the generic purifier and the generic Table purifier.
- **Inferred, not proven:** an EU unit advertises one of these four ids, almost certainly 0x2A or 0x37 (US), since JP is the ion variant.
- sbble registers all eight bytes, so an EU unit should be detected as "Air Purifier US" / "Air Purifier Table US". No separate EU model is needed.
- **To confirm:** the first byte of a real EU advertisement.
- Region is a firmware setting, not a model id: set with `570f4c0b` + 4 bytes, read with `570f4d0b`. The byte meanings are unknown. **Do not write them.**

## 2. Advertisement layout

Manufacturer id 2409. Bytes are counted after the 6-byte MAC.

| Byte | Content |
|---|---|
| d[0] | sequence number |
| d[1] | 0x80 power; 0x07 mode |
| d[2] | 0x80 Wi-Fi ok; 0x40 cloud connected; 0x30 cloud task state; 0x08 sensor powered; 0x02 child lock; 0x01 updating |
| d[3] | 0x7F fan speed 0–100 |
| d[4] | 0x06 (>>1) air-quality level |
| d[7] | fault bits: 0x08 filter door open, 0x04 VOC sensor, 0x02 PM2.5 sensor, 0x01 fan |

- The app does not parse d[5..6].
- Mode: 1 = manual/level, 2 = auto, 3 = sleep, 4 = pet.
- Air quality: 0 excellent, 1 good, 2 moderate, 3 poor.
- The app shows a level from the speed: below 34 → level 1, below 67 → level 2, otherwise level 3.

## 3. BLE commands (`570f4c` = set, `570f4d` = read)

Most replies start with a status byte, and 0x01, 0x06 and 0x0e mean OK. In the `570f4d81` layout below, the app's indexes include that status byte (b0).

| Command | Payload | Meaning |
|---|---|---|
| `570f4c01` | action, mode, speed | Power on/off plus mode and speed. Manual = mode 1 with speed 0–100. |
| `570f4c02` | (speed) | Stepless speed, only while on. The app sends no value byte here (looks unused); sbble sends one byte. |
| `570f4c03` / `570f4d03` | 0/1 | Child lock |
| `570f4c04` / `570f4d04` | 3 bytes | Off-delay timer: bit 23 = enabled, low 23 bits = seconds. The read reply takes bits 3–23 of bytes 1–3. |
| `570f4c05` / `570f4d05` | type, R, G, B, brightness | LED colour. Type 1 = custom RGB; type 0 = default colour (RGB sent as 0). |
| `570f4c06` / `570f4d06` | 0/1 | Beep |
| `570f4c07` / `570f4d07` | 0 off, 1 on, 2 auto by ambient light | Indicator light |
| `570f4c08` / `570f4d08` | 0/1 | Ion (JP only) |
| `570f4c09` | — | Reset filter timer |
| `570f4d09` | — | Read filter timer: uint16 in bytes 1–2, probably hours (**unconfirmed**) |
| `570f4c0a` / `570f4d0a` | status, start h, start m, end h, end m | Old DND (do-not-disturb) mode |
| `570f4c0b` / `570f4d0b` | 4 bytes | Region / version (meaning unknown) |
| `570f4c0c` | — | Reboot and force-update the APT32 MCU firmware. **Never send this.** |
| `570f4c0d` / `570f4d0d` | 0/1 | Wireless charger (Table) |
| `570f4d0c` | — | 16-bit sensor value in bytes 1–2. The app says "US only". Probably PM2.5 (**unconfirmed**). |
| `570f4d81` | — | Full status read (layout below) |
| `570f4d82` | — | Debug memory dump |
| `5709` | (idx<<4\|5), en<<7, repeat byte, hh, mm, power, mode, speed | Write a schedule slot. Repeat byte: 0x80 alone when repeat = 1, otherwise weekday bits Mon→Sun in bits 6..0 (which value means "once" is unclear). Times are UTC. |
| `57090200` | — | Delete all schedules |
| `5708` | (idx<<4\|5) | Read a schedule slot (same fields from byte 1) |
| `57004E` | (idx<<4\|2), en, repeat/week, start hh, start mm, duration(16b) | New DND time slot (shared helper) |
| `57004E01` | n | DND slot total |
| `57004F01` / `57004F`+(idx<<4\|2) | — | Read DND count / one DND slot |
| `57004D01` / `57004D20…` | — | Matter status / enter Matter pairing |

**`570f4d81` response layout** (b0 = status):

| Byte | Content |
|---|---|
| b2 | 0x80 power; 0x40 wireless charger; 0x08 ion; 0x07 mode |
| b3 | 0x40 cloud connected; 0x30 cloud task; 0x08 sensor powered; 0x02 child lock |
| b4 | 0xF0 schedule count; 0x06 air-quality level; 0x01 light/ambient flag (meaning unclear) |
| b5 | 0x10 inside DND window; 0x08 door; 0x04 VOC fault; 0x02 PM2.5 fault; 0x01 fan fault |
| b6 | 0x7F speed |
| b7–8 | filter time (uint16) |
| b9–11 | off-delay remaining (21 bits) |
| b12–13 | PM2.5, low 11 bits |

sbble also reads the firmware version from b15; the app does not parse b15.

The app has no:
- a "power-on behaviour" setting;
- a separate night mode (sleep mode and DND are the closest);
- a filter-life percentage (only the raw filter time exists).

## 4. What ha_switchbot_ble does

| Feature | App (command) | sbble / entity | Notes |
|---|---|---|---|
| EU model detection | no EU type; uses 0x2A / 0x37 | detected as US / Table US | Confirm with a real EU advertisement |
| Power, modes manual / auto / sleep / pet | 4c01 mode 1–4 | fan entity; presets level_1/2/3 = mode 1 at speed 0/50/100, auto, sleep, pet | Mode 1 reads back as level_1 / 2 / 3 by speed (≤ 33, ≤ 66, above) |
| Fan speed 0–100 | 4c01 / 4c02 | `set_percentage` via 4c02 + 1 byte, level modes only | The 4c02 payload is not confirmed by the app |
| Child lock | 4c03, adv d2 0x02 | switch | |
| LED on/off, RGB, brightness | 4c07 0/1, 4c05 | light entity, always type 1 | Type 0 (default colour) not supported |
| Indicator light off / on / auto | 4c07 0/1/2, 4d07 | select `indicator_mode` (4d07 b1 & 0x03), button `light_sensor` | |
| Beep | 4c06 / 4d06 | switch `beep_enabled` | |
| Off-delay timer | 4c04 / 4d04, b9–11 | number `off_timer` (minutes, 0–1440, 0 cancels), sensor `off_timer_remaining` | |
| Faults (door / VOC / PM2.5 / fan) | adv d7, b5 | binary sensors | |
| Inside DND window | b5 0x10 | binary sensor `dnd_active`, disabled by default | |
| Filter timer | 4d09, adv d5–6 | sensor from adv d5–6 (the app doesn't map these) | Unit unconfirmed |
| Filter reset | 4c09 | button, verified by reading 4d09 back | |
| Air-quality level | adv d4, b4 | enum sensor | |
| PM2.5 | b12–13 | sensor on US / Table US, mask 0xFFF, polling only | The app uses 11 bits |
| Wireless charger (Table) | 4c0d, b2 0x40 | switch on Table models | |
| Schedules | 5709 / 5708 / 57090200 | no | Low priority (HA automations) |
| DND window (old and new) | 4c0a / 4d0a, 57004E / 4F | no | The app passes raw hours; unknown whether they are UTC |
| Ion | 4c08, b2 0x08 | no | JP only |
| Region / version | 4c0b / 4d0b | no | Don't touch |
| Matter pairing | 57004D | no | Out of scope |

Settings (beep, off timer) are read 90 s after HA starts, then every 6 h (`get_extra_settings`).

## 5. Where sbble reads bits differently from the app

All of these need checking on a real device.

- **PM2.5 width:** 12 bits in sbble, 11 bits in the app.
- **Adv d5–6 as filter time:** sbble reads it; the app does not.
- **Reply positions:** the app's reading of the 4d06 / 4d07 / 4d0b replies is ambiguous (it may count hex characters instead of bytes), so the positions are uncertain. sbble reads byte 1.

Not confirmed:
- the unit of the filter timer;
- the meaning of the 4d0c value;
- the region bytes;
- which repeat value means "once" in schedules;
- the b4 0x01 "light" flag.
