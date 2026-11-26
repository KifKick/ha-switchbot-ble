# SwitchBot Evaporative Humidifier: app protocol

Analysis of 2026-11-16, from the behaviour of the SwitchBot app 10.10. Nothing was tested on a device. **Uncertain** marks items that could not be confirmed.

**Our code:**
- Library: `sbble/devices/air/evaporative_humidifier.py`.
- Integration: `catalog/appliances.py` (`EVAPORATIVE_HUMIDIFIER`), `humidifier.py`.

## 0. Models

- The app handles two cloud device types the same way: `WoHumi2` (Evaporative Humidifier) and `WoHumi2Plus` (the Auto-refill model).
- **The Auto-refill model** adds:
  - refill status, auto-refill, refill during DND, refill during sleep;
  - a robot-vacuum dock link.
- The app tells the two models apart only by the cloud device type, not at the BLE level.
  - `570f440f` (region/version read) returns a region byte and a version byte. The app only shows them.
- sbble registers adv model bytes `'#'` and `0x03` as the Evaporative Humidifier. **Uncertain:** which byte belongs to which model.
- sbble maps both cloud types `WoHumi2` and `WoHumi2Plus` to the Evaporative Humidifier (`CLOUD_MODELS` in `sbble/core/const.py`).
- The app parses no advertisement for this device and uses only connected, encrypted commands. Besides its own commands it uses the generic `5708`/`5709` timer get/set.
- Mode names (as the app shows them):

  | Value | Mode |
  |---|---|
  | 1 | level 4 (strongest) |
  | 2 | level 3 |
  | 3 | level 2 |
  | 4 | level 1 (quiet) |
  | 5 | Humidity (constant target) |
  | 6 | Sleep |
  | 7 | Auto |
  | 8 | drying (sbble's own value, sent as 4301 + `08`) |

## 1. App BLE commands

All commands are encrypted. A reply counts as OK when byte 0 is 0x01, 0x06 or 0x0e.

**Write commands**

| Cmd | Payload | Meaning |
|---|---|---|
| `570f4301` | `{01 on / 00 off}[arg]` | Power. Reply: `[st, isOn, mode, targetHum, dryRemain(2B BE, 0xffff→0)]`. The optional arg is generic; sbble sends `08` to start filter/wick drying. |
| `570f4302` | modes 1–4: `01 {mode} {hum}`; modes 5–8: `{mode-3} 00 {hum}` | Set mode and target humidity (hum `00` if not given) |
| `570f4303` | `{en}{hum}` | Over-humidify protection on/off and threshold |
| `570f4304` | `{0/1}` | "Warm mist". Probably not relevant to an evaporative unit (**uncertain**). |
| `570f4305` | `{0/1}` | Child lock |
| `570f4306` | `{en}{seconds 3B BE}{power}{mode}{hum}` | Delay (sleep/wake) timer |
| `570f4307` | `{(keepOn<<3) \| level(0-7)}` | Indicator light: bits 0–2 = effect/brightness, bit 3 = stay lit when off. **Uncertain:** exact meaning. |
| `570f4308` | `{0/1}` | Button/prompt sound |
| `570f4309` | `{action}` | Reset filter timer. The app then zeroes the clean-time counter. **Uncertain:** action values (clean vs replace). |
| `570f430a` | `{type}` or `03 {weekmask}{hh}{mm}` (UTC) | Automatic wick drying. Type 3 = schedule. Types 1/2 are probably on/off (01 = on, 02 = off is a guess; **unverified**). |
| `570f430b` | `{0/1}` | Alarm sound |
| `570f430d` | `{type}{mac}` or `{type}{mac}{n}{idx}{chunk}` | Bind an external Meter or S10 vacuum for humidity readings. `type 0` unbinds. Newer firmware sends the payload in chunks. |
| `570f430e` | `{en}{sh}{sm}{eh}{em}` | Do Not Disturb window |
| `570f4312` | `{autoRefill}{autoStartOnRefill}` | Plus only: auto-refill |
| `5709{(i<<4)\|5}{en<<7}{rep}{hh}{mm}{power}{mode}{hum}` | — | Write timer i |
| `57090200` | — | Delete all timers |
| `570f0a{01/02}{ver}` | — | OTA |

**Read commands**

| Cmd | Reply / meaning |
|---|---|
| `570f4481` | Full status read (layout below) |
| `570f4401` | `[st, isOn, mode, targetHum]` |
| `570f4402` | `[st, protEn, protHum]` |
| `570f4403` | Delay read: `[st, en, sec(3B), power, mode, hum]` |
| `570f4405` | Child lock: `[st, lock]` |
| `570f4406` | Bound meter: `[st, type, mac…]`. The app also reads temp = b8 & 0x7f and humidity = b10 & 0x7f. |
| `570f4407` | Flag byte b1, same bits as status b2. The app reads b1 bit 3 as "meter online", but status b2 bit 3 is "delay". **The app itself is inconsistent here.** |
| `570f4408` | Water level: b1 & 0x0f |
| `570f4409` | Light and sound: b1 bits 0–2 = light, b1 bit 3 = keep-on, b2 = sound |
| `570f440a` | Filter times: b1–2 = time since clean, b3–4 = time since replace (big endian, probably hours) |
| `570f440c` | Auto-dry settings: `[st, type, weekmask, hh, mm]` |
| `570f440d` | Alarm setting. Read uses sub-id 0x0d but write uses 0x0b. |
| `570f440e` | DND: `[st, en, sh, sm, eh, em]` |
| `570f440f` | Region / version |
| `570f4412` | Plus auto-refill: `[st, en, autoStart]` |
| `570802` | Timer count: b1 |
| `5708{(i<<4)\|5}` | Read timer i: `[st, en<<7, repeat<<7\|weekmask, hh, mm, power, mode, hum]` |
| `57000300` | Firmware info (b2 = BLE version) |
| `570f0b` | OTA progress |

### Status layout of `570f4481`

b0 = status. The advertisement carries the same bytes b1..b10 as `mfr_data[7..16]`, with `mfr_data[6]` = sequence number. Bytes b11..b16 exist only in the connected read.

- **b1:** bit 7 = on; bits 4–6 = timer count; bits 0–3 = mode.
- **b2:** bit 7 = over-humidify protection; bit 6 = warm mist (on the Plus the same bit is read as "adding water"); bit 5 = child lock; bit 4 = DND; bit 3 = delay active; bit 2 = tank missing; bit 1 = tilted; bit 0 = filter missing.
- **b3:** bit 7 = meter bound; bits 0–6 = humidity.
- **b4:** bit 7 = temperature sign (1 = positive); bits 0–6 = whole °C.
- **b5:** bits 4–7 = tenths of °C; bits 0–3 = water level.
- **b6–7:** & 0x0fff = time since filter clean. The app also derives a "vacuum on dock" flag from these bytes, but inconsistently, so its real bit position is **unknown**.
- **b8–9:** time since filter replaced.
- **b10:** & 0x7f = target humidity.
- **b11:** bit 7 = meter online; bits 0–6 = over-humidify threshold.
- **b12–13:** drying time remaining (0xffff = none).
- **b14–16:** b14 bit 7 = delay power; & 0x1fffff = delay seconds remaining.

## 2. What ha_switchbot_ble does

The advertisement carries status b1..b10, so most state updates without a connection. The full `570f4481` read runs after every sequence-number change.

| Feature | App (cmd) | sbble / entity | Notes |
|---|---|---|---|
| Power, modes level 1–4 / Humidity / Sleep / Auto | 4301, 4302 | humidifier entity (on/off, all 8 modes incl. `drying_filter`) | Humidity and Auto are refused unless a meter is bound. Target humidity only in Humidity / Sleep. |
| Drying the wick now | 4301 + arg `08` | mode `drying_filter` | The app's arg is generic (**uncertain**) |
| Current humidity / temperature | 4481 b3–5, adv | humidifier current humidity | Only with a bound meter |
| Water level | b5 & 0x0f | enum sensor | Values above 3 read as unknown (**check on the Plus**) |
| Child lock | 4305, b2.5 | switch | |
| Over-humidify protection + threshold | 4303 / 4402, b2.7, b11 | switch + number (1–99) | The number writes `4303` with the current on/off |
| Prompt sound | 4308 / 4409 b2 | switch | |
| Alarm sound | 430b / 440d | switch | |
| DND window | 430e / 440e, b2.4 | switch + start / end time entities | The device stores UTC (the app sends UTC hours); HA shows local time |
| Tank missing / tilted / filter missing | b2 bits 2/1/0 | binary sensors | |
| Meter online / bound, DND active, delay active | b11.7, b3.7, b2.4, b2.3 | binary sensors (bound / DND / delay disabled by default) | |
| Filter time since clean / replace | b6–7 & 0xfff, b8–9 | sensors in hours | Unit probably hours |
| Drying / delay time remaining | b12–13, b14–16 | sensors, disabled by default | Drying unit unconfirmed |
| Filter reset | 4309 | no | Action values **uncertain** |
| Auto-dry setting | 430a / 440c | no | Values **unverified** |
| Indicator light | 4307 / 4409 | no | Level meaning **uncertain** |
| Bind/unbind meter | 430d / 4406 | no | Low priority |
| Delay timer, schedules | 4306 / 4403, 5708 / 5709 | no | HA automations can replace these |
| Warm mist | 4304, b2.6 | no | Probably not applicable; on the Plus the bit means "adding water" |
| Plus: auto-refill, refill during DND / Sleep, vacuum dock link | 4312 / 4412 | no | Refill during DND / Sleep and the dock link have no BLE command (probably cloud only) |

Settings (protection, sounds, DND) are read 90 s after HA starts, then every 6 h.
