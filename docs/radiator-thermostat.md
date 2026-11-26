# SwitchBot Smart Radiator Thermostat: app protocol

Product: SwitchBot Smart Radiator Thermostat (EU TRV, https://eu.switch-bot.com/products/switchbot-smart-radiator-thermostat).

Analysis of 2026-11-16, from the behaviour of the SwitchBot app 10.10. Nothing was tested on a device. **(?)** marks uncertain items. All temperature values on the wire are the real value × 10.

**Our code:**
- Library: `sbble/devices/climate/radiator_thermostat.py`.
- Integration: `catalog/climate.py` (`TRV`), `climate.py`.

## 0. Product, type codes and adv id

| Item | Value |
|---|---|
| Cloud type | `W1128000` (`WoTRV`) |
| BLE adv id (mfr 2409) | `00 11 36 40` (= 1128000) and `01 11 36 40` in sbble. The app's own device-type table only has `00113640`. What the leading `01` means is not known (pairing mode?) **(?)** |
| sbble | `RadiatorThermostat`; cloud type `W1128000` is in `CLOUD_MODELS` |
| Transport | All commands are sent encrypted. When the phone does not see the TRV over BLE, the app sends the same commands via the cloud (through a hub). |
| Firmware gates | The app compares the raw `5702` b2 (BLE version, integer): **≥ 4** temperature-source menu; **≥ 12** valve bit; **≥ 13** 0.5 °C steps and response time; **≥ 18** new schedule format (`7810`/`7911`) and Hub 2 / Hub 3 as temperature source. OTA: b2 < 10 uses one firmware package; b2 ≥ 10 picks one of two packages by MCU version parity. |

**Modes** (sbble `ThermostatMode`):

| Value | App name | sbble |
|---|---|---|
| 0 | Schedule | `schedule` |
| 1 | Manual | `manual` |
| 2 | Off | `off` |
| 3 | Eco | `eco` |
| 4 | Comfort | `comfort` |
| 5 | Fast heating / boost | `boost` |

The app's mode picker offers only 0, 1, 4, 5, 3; it never sends mode 2. The device reaches mode 2 from its knob ("OF" on the display).

Scene actions in the app: on / off (power), set mode, set manual temperature. Scene triggers and conditions: temperature above / below, mode is X, **valve opened / closed**.

### Temperature ranges and steps per mode

All values are sent as °C × 10. With b2 ≥ 13 the app rounds to a multiple of 5 (0.5 °C) before sending; below that it uses whole degrees.

| Mode | Command | Range (b2 ≥ 13) | Range (b2 < 13) | Notes |
|---|---|---|---|---|
| Schedule (0) | `570F7806` | 4.0-35.0 °C, step 0.5 | 4-35 °C, step 1 | **4.0 °C = "OFF"**: the app shows OFF for any target < 5 °C |
| Manual (1) | `570F7801` | 4.0-35.0 °C, step 0.5 | 4-35 °C, step 1 | Same "4.0 = OFF" rule |
| Eco (3) | `570F7802` | 10.0-20.0 °C, step 0.5 | 10-20 °C, step 1 | sbble range matches |
| Comfort (4) | `570F7803` | 10.0-25.0 °C, step 0.5 | 10-25 °C, step 1 | sbble range matches |
| Fast heating (5) | — | fixed 35.0 °C | — | The app offers no temperature setting in mode 5 and shows a target of 350 after switching to it |
| Schedule segment | `7805` / `7810` | 4.0-35.0 °C, step 0.5 (new editor always 0.5) | step 1 in the old editor | < 5 °C is shown as "Turn off" |
| Anti-frost | `5703` bit 2 | no setpoint in the app | | What it holds is not shown in the app **(?)** |

The app has no default values for the eco / comfort / manual temperatures; it reads them from `5702`. A new schedule segment defaults to 08:00, 18.0 °C.

## 1. App BLE commands

Temperatures are °C × 10, either 2 bytes big endian or 1 byte. A 1-byte temperature (eco, comfort) therefore tops out at 25.5 °C. A reply byte 0 of 0x01, 0x06 or 0x0e means OK.

**Write commands**

| Cmd | Payload | Meaning |
|---|---|---|
| `570F7800` | `{mode}` (1 B, 0-5) | Set mode |
| `570F7801` | `{temp×10}` 2 B BE | Manual-mode target temperature |
| `570F7802` | `{temp×10}` 1 B | Eco temperature |
| `570F7803` | `{temp×10}` 1 B | Comfort temperature |
| `570F7804` | `{n}` 1 B | Fast-heating **duration in minutes, 1-180** (the app's picker offers 1-180 min). |
| `570F7806` | `{temp×10}` 2 B BE | Target temperature, whatever the mode is. The app uses it only in schedule mode (a temporary hold until the next slot). |
| `5703 FFFFFFFFFFFF {sw}` | 1 B bit field | "Basic functions". The six `FF` bytes are placeholders (on the Climate Panel, `5703` carries six setting bytes). `sw` holds four 2-bit fields where `0`=off, `1`=on, `3`=keep: **bits 0-1 child lock, bits 2-3 anti-frost, bits 4-5 descaling, bits 6-7 window-open detection**. Example: enable window detection only = `5703ffffffffffff7f`. The app sends one field per call, so the other three are always `3`. |
| `570F7805` (old schedule, 3 packets) | see below | Write the schedule for one day (b2 < 18) |
| `570F7810` (new schedule, ≤12 segments) | see below | Write the schedule for one day (b2 ≥ 18) |
| `570F780D` | — | Clear the "device restarted" flag. The app sends it after adding the device and from the "device restarted, recalibrate" screen. |
| `570F7808` | `{devType 4 B}{mac 6 B}{scanInterval 1 B}` | Bind an external temperature source. See "External temperature source" below. |
| `570F780F` | `{t}` 1 B | Response time: **minutes, 1-5**, b2 ≥ 13 only. "The time it takes for the thermostat to act after the ambient temperature is updated"; shorter = more valve movement, less battery. |
| `570F7809` | `{v}` 1 B | **Temperature calibration offset** (new). `v` = |offset| with bit 7 = sign (1 = positive). The app's range is -10…+10 in steps of 1 (°C; scaled ×9/5 for °F display). |
| `570101` / `570100` | — | Power on / off |
| `57000502` | `{tzInt}{tzFrac}` | Set the device time zone: `tzInt` = UTC offset in whole hours **+ 12**, `tzFrac` = remaining minutes. UTC+1 → `0D00`, UTC-5 → `0700`, UTC+5:30 → `111E`. |
| `57000501` | 8 B BE time | Time sync: **Unix seconds (UTC)**. |

**Read commands**

| Cmd | Reply |
|---|---|
| `5702` | Full status, ≥17 bytes; layout below |
| `570F7904` | `[st, rapidCountdown]`: fast-heating minutes left. The app never sends it; it uses `5702` b16 instead. |
| `570F7905 {day}{idx}` | Old schedule read, 3 packets (idx 0-2). The data starts at byte 5 of the first reply and at byte 2 of the next ones. |
| `570F7911 {day}{idx}` | New schedule read. Reply 0: b1 = packet count; the data starts at byte 7. Later replies: the data starts at byte 3. |
| `570F7908` | `[st, mac 6 B, scanInterval]`. A 1-byte reply means "nothing bound". The reply has no `devType`. |
| `570F7910` | `[st, respondTime]` (minutes; 0 = not set, the app then shows 1) |
| `570F7909` | `[st, v]`: temperature calibration offset, same sign-magnitude encoding as `570F7809`. |
| `570002` | Hardware version: reply b2. |
| `57000602` | `[st, tzInt, tzFrac]`, same +12 bias as `57000502`. The app warns "Time zone mismatch detected" when it differs from the phone. |

**Schedule segment** (both formats): 4 bytes = `{HH}{MM}{temp×10, 2 B BE}`. Each segment is a switch point: from HH:MM, hold this temperature. Times are **local device time**: the device keeps its own UTC offset (`57000502`) and the app asks the user to recalibrate when that offset differs from the phone's.
- **`day` is a day index, 1 = Monday … 7 = Sunday.** One day per write; "copy to other days" repeats the write per day.
- **Format choice:** b2 ≥ 18 uses `7810`/`7911`, otherwise `7805`/`7905`.
- **Read list, entry 0:** the list returned for a day starts with the previous day's last switch point (shown as "From HH:MM of yesterday"). The app always writes the list without it.
- **Old `570F7805`** (exactly 3 packets): packet byte = `(3<<4)|idx`.
  - Packet 0: `570f7805 {pi} 0000 {day} {first 9 data bytes}`.
  - Packets 1-2: `570f7805 {pi} {12 data bytes}`.
  - That makes 33 data bytes, so at most 8 segments **(?)**. The old editor cannot add or delete segments, only change the time and temperature of existing ones, so the segment count is whatever the firmware returns.
- **New `570F7810`** (up to 12 segments): two bytes `{total}{idx}`.
  - Packet 0: `570f7810 {total}{00} 0000 {day} {count} {first 7 data bytes}`.
  - Later packets: `570f7810 {total}{idx} {next 11 data bytes}`.
  - `total = 1 + ceil((4·count − 7) / 11)`.
  - Every packet must get reply byte 0 = `01`, or the app stops.
  - New-editor rules: start times in **15-minute steps**; segments kept sorted by time, a new segment at an existing time replaces it; at least one segment; the add button stops at 13 list entries (= 12 own segments + yesterday's carry-over).

**External temperature source** (`570F7808` / `570F7908`):
- `devType` = the source device's BLE model code, as hex padded to 4 bytes. One-byte legacy codes: Meter `T` → `00000054`, Meter Plus `i` → `00000069`, Outdoor Meter `w` → `00000077`, Hub 2 `v` → `00000076`, Meter Pro `0x34` → `00000034`, Meter Pro CO2 `0x35` → `00000035`. Four-byte codes: Climate Panel `0010F3D8`, Weather Station `001053B0`, Hub 3 `0010B940`.
- `mac` = the source's MAC, 12 hex characters, no colons.
- `scanInterval` = "Data Update Interval" in **minutes: 1, 5 or 10**. The app uses 10 when nothing is stored for an external source; with the TRV's own sensor it is fixed at 1.
- **Unbind** = pick the TRV itself, which sends `570F7808 00000000 000000000000 01`.
- Allowed sources: Meter (firmware > 26, otherwise "upgrade" is shown), Meter Plus, Meter Pro, Meter Pro CO2, Outdoor Meter, Climate Panel, Weather Station; Hub 2 and Hub 3 only when TRV b2 ≥ 18. The menu needs TRV b2 ≥ 4.
- If the source is deleted, moved or offline, "the valve will automatically switch to thermostat temperature".

### Reply of `5702`

b0 = status. Byte numbers are offsets in the reply.

| Byte | Bits | Field |
|---|---|---|
| b1 | all | battery % |
| b2 | all | firmware (BLE version, integer; see the firmware gates in section 0) |
| b3 | all | hardware version |
| b4 | 0-2 | current mode (0-5) |
| b4 | 3-5 | previous mode, used to show the mode while off |
| b4 | 6 | valve state, **0 = open, 1 = closed** (firmware ≥ 12 only) |
| b5-b6 | b5 bit 7 = sign (1 = positive); `(b5 & 0x07)<<8 \| b6` = |temp|×10 | room temperature. The app's calibration screen instead uses `(b5<<8 \| b6) & 0x7FFF`, as sbble does; both agree for any real temperature (see note 2). |
| b7-b8 | BE | manual-mode target ×10 |
| b9 | | comfort temperature ×10 |
| b10 | | eco temperature ×10 |
| b11 | | fast-heating duration, minutes (1-180) |
| b12 | bit 0 child lock, bit 2 anti-frost, bit 4 descaling, bit 6 window-open detection | Same layout as the `5703` write, but the app reads only the low bit of each field |
| b13-b14 | BE | target temperature ×10 (whatever the mode is) |
| b15 | bit 0 | window open now |
| b15 | bit 1 | device restarted (cleared by `570F780D`). The app then blocks control and asks for a valve calibration ("Not calibrated"). |
| b15 | bit 2 | MCU update in progress |
| b15 | bits 3-7 | MCU version (its parity picks the OTA package) |
| b16 | | fast-heating countdown, minutes |

## 2. Advertisement layout

Manufacturer data, company id stripped, so bytes 0-5 are the MAC; mfr[6] = sequence number. Bit ranges count from the least significant bit.

| mfr byte | Bits | Meaning |
|---|---|---|
| 6 | all | sequence number |
| 7 | 0-6 | battery % |
| 7 | 7 | power on |
| 8 | 0-3 | room temperature tenths |
| 8 | 4-7 | target temperature tenths |
| 9 | 7 = sign (1 = positive), 0-6 = whole °C | room temperature = ±(whole×10 + tenths) |
| 10 | 7 = sign, 0-6 = whole °C | target temperature, same encoding |
| 11 | 0-2 | current mode |
| 11 | 3 | valve state (0 = open, 1 = closed) |
| 12 | 0 | window open now |
| 12 | 1-3 | error state (0-7). The app only checks **3 = temperature sensor abnormal** ("Temperature sensor abnormal, please contact us"). Low battery is shown from battery ≤ 20 %, not from this field. Other values are not known **(?)**. |

The app does not read mfr[11] bits 4-7 or mfr[12] bits 4-7. Their meaning is still not known **(?)**.

**Not in the advertisement** (connected `5702` only): child lock, anti-frost, descaling, window-detection setting, comfort / eco / manual temperatures, fast-heating duration and countdown, restart / MCU-update flags.

### App behaviour that matters for HA

- **Heating indicator:** with b2 ≥ 12 the home screen shows "Heating" exactly when the valve is open; on older firmware it needs target > room and the valve open.
- **OFF display:** the app shows OFF (grey) when mode = 2 **or** target = 4.0 °C (raw 40). In schedule / manual mode, moving the slider to the bottom sends 4.0 °C (`7806`/`7801` with `0028`); that is how the app turns the valve "off".
- **Changing the temperature while off (mode 2):** the app uses the previous mode. If it was schedule, it sends `570F780000` and then `7806`; if manual, only `7801`. In eco / comfort it sends `7802` / `7803`.
- **Temporary hold:** in schedule mode, a target that differs from the current slot is a hold until the next slot. "Resume Schedule" sends `570F780000` then `7806 {slot temperature}`.
- **Power on/off (`570101`/`570100`):** the app's own screens practically never send them. Scenes use `570100`. Whether `570100` also sets mode 2 is still not known **(?)**.
- **Polling:** the home screen reads `5702` when it opens and after commands; it does not connect on every advertisement.
- **Basic settings texts:** window detection = "rapid temperature drop (> 6 °C in 4 minutes)", turns the thermostat off, display "OP"; anti-frost = protects pipes from freezing "when your Radiator Thermostat is turned off" (threshold not given **(?)**); descaling = "automatically turns on the valve for 10 s" (interval not given **(?)**), display "Ad"; child lock = display "LC", the button is locked, unlock by holding it for 6 s.

## 3. What ha_switchbot_ble does

- **Climate entity:** HEAT / OFF, the six modes as presets, target temperature (step 0.5), current temperature, action. Min / max follow the preset (eco 10-20, comfort 10-25, otherwise 4-35 °C).
  - OFF is shown when the device is powered off, when mode = 2, or when the target is 4.0 °C in schedule / manual mode. HVAC OFF sends `570100`.
  - HEAT resumes the previous mode: `last_mode` when the mode is off, comfort after a 4.0 °C "off" target; it sends power-on first when the device is powered off.
  - With firmware ≥ 1.2, `hvac_action` is heating exactly when the valve is open; otherwise it is guessed from room vs. target temperature.
- **Advertisement:** seq, power, battery, room / target temperature, mode, previous mode (mfr[11] bits 4-7), valve (mfr[11] bit 3), restarted (mfr[12] bit 4), window (mfr[12] bit 0), fault (mfr[12] bits 1-3 ≠ 0). The app does not read previous mode and restarted from the advertisement **(?)**.
- **`5702`** is read after every sequence-number change and parsed fully (b1-b16).
- **Binary sensors:** window open, valve, fault, restarted, MCU update.
- **Switches:** child lock, open-window detection, anti-frost, descaling (`5703ffffffffffff{sw}`, untouched fields = 3).
- **Numbers:** comfort (10–25), eco (10–20) and manual (4–35) temperatures, written in any mode; fast-heating duration 1–180 min; response time 1–5 min (read only when firmware ≥ 1.3 or unknown); temperature calibration −10…+10 (`570F7809` / `7909`).
- **Sensors:** fast-heating countdown, MCU version (disabled by default).
- Calibration and response time are read 90 s after start, then every 6 h.
- Not supported: weekly schedule, external temperature source, time / time zone (they matter only for the on-device schedule), 0.5 °C steps on firmware < 13 (note 9).

## 4. Notes for implementers

The code refers to these numbers.

1. **The window bit of `5702` is b15 bit 0.** b14 is the low byte of the target temperature.
2. **Room temperature in `5702`:** one place in the app reads `(b5 & 0x07)<<8 | b6`, the calibration screen uses `(b5<<8|b6) & 0x7FFF` with bit 15 as sign. Both give the same value for any |temp| < 204.8 °C, so only a firmware that put flags in b5 bits 3-6 could tell them apart.
3. **Child lock is b12 bit 0 only.** The app reads bit 0; bits 0-1 are the 2-bit write field, and `3` = keep.
4. **Unknown mode values occur.** 5702 b4 bits 3-5 can hold 6-7, and mfr[11] bits 4-7 (0-15) are not defined by the app at all; the app never validates these values. Treat them as unknown (`None`).
5. **Off is ambiguous.** The app itself never sends mode 2 and practically never sends `570100` (power off): it "turns off" by setting a 4.0 °C target in schedule / manual mode, and it treats mode 2 **or** target 4.0 as OFF. Mode 2 comes from the knob. Whether `570100` also sets mode 2 is still not known **(?)**.
6. **The `5702` target (b13-b14) and the advertisement target are the same value**, so a connected read refreshes the target too.
7. **Connected read on every sequence change.** The app reads `5702` only when its screen opens and after commands, not per advertisement. How often the TRV's sequence number changes is still not known **(?)**; rate-limit the read if it turns out to be frequent.
8. **4.0 °C means OFF.** The app's schedule / manual range is 4-35 °C, and a 4.0 °C target set from the app or the knob is OFF.
9. **0.5 °C steps on old firmware.** The app uses whole degrees when b2 < 13 and rounds to 0.5 °C (multiples of 5) otherwise. What firmware < 13 does with e.g. 205 is not known **(?)**.

## 5. Dangerous commands: never send

- `570f0a{01/02}{ver}`: generic OTA start. Never send.
- MCU firmware update: 5702 b15 bit 2 shows an MCU update is in progress, which is a separate MCU flashing path. Do not trigger one or interrupt it.
- No factory-reset command is known (the app's "Resetting device" help is on the device: knob to "OF", hold the button 3 s for pairing mode). Treat any unknown `5700xx` / `570fxx` sub-command as dangerous.
- `570F7808` with a wrong MAC or devType: the app says the valve falls back to its own sensor when the source is unavailable, so probably harmless **(?)**.
- `5703` with anything other than `FF` in the first six bytes: those are placeholders, and other values could overwrite settings nobody knows about **(?)**.
- `570F7809` (calibration offset) outside -10…+10: the app never sends it **(?)**.

## 6. Open questions

- What the leading `01` in the adv id `01113640` means **(?)**.
- Whether `570100` (power off) also sets mode 2 **(?)**. The app's own off is a 4.0 °C target (resolved).
- ~~Units of the fast-heating duration, the response time and the scan interval~~: all minutes; 1-180, 1-5 and 1/5/10.
- ~~Allowed temperature ranges and steps per mode~~: see section 0.
- Schedule: ~~day index or bitmask~~ (index 1-7, Mon-Sun), ~~local or UTC~~ (local), ~~which firmware uses `7810`~~ (b2 ≥ 18). Still open: is the old format capped at 8 segments **(?)**?
- What mfr[11] bits 4-7 and mfr[12] bits 4-5 mean (sbble reads previous mode / restarted; bit 5 may be a need-update-temp flag) **(?)**.
- Error state values other than 3 **(?)**.
- Anti-frost threshold and descaling interval **(?)**.
- ~~`devType` format for the external temperature source~~: 4-byte BLE model code, see section 1.
