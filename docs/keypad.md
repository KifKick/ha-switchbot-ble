# SwitchBot Keypad / Keypad Touch: BLE protocol

Source: the SwitchBot app 10.10 and the devices.

Status, settings and the clock were checked on a real Keypad Touch; everything else, and the Keypad (buttons), only on mocks. Items marked **?** are unconfirmed.

## Identity and advertisement

The model byte is service data byte 0 & 0x7F:

| Model | Normal | Pairing |
|---|---|---|
| Keypad | `k` | `K` |
| Keypad Touch | `y` | `Y` |

`y` is the Keypad Touch, not the original Keypad.

| Field | Location |
|---|---|
| battery | `svc[2] & 0x7F` |
| charging | `mfr[7] & 0x80` |
| lockout after failed attempts | `mfr[8] & 0x01` |
| tamper alarm | `mfr[8] & 0x02` |
| duress alarm | `mfr[8] & 0x04` |
| duress by passcode / NFC / fingerprint | `mfr[9]` bits 0 / 1 / 2 (only valid while the duress bit is set) |
| passcode / NFC / fingerprint locked out | `mfr[9]` bits 4 / 5 / 6 (only valid while the lockout bit is set) |
| charge type | `(mfr[12] >> 4) & 7` |
| event counter **?** | `mfr[6]`; the app does not read it, we use it to trigger a history read |

## Transport

- The app connects to the keypad directly. It does not go through the lock.
- Encryption is the same as for locks: AES-CTR with the keypad's own key, fetched from the SwitchBot account like a lock's key.
- Passcodes get no extra encryption.

## Commands (plaintext)

### Settings and alarms

| Command | Meaning |
|---|---|
| `5702` | basic info: `[1]` battery, `[2]` firmware ×10, `[3]` hardware, `[4]` fingerprint, `[5]` lock button 1/2/3, `[6..7]` its time, `[8]` 2 = disabled, `[9]` 2 = tamper alarm on, `[10]` backlight 1/2/3, `[11]` level, `[12]` 2 = sound on, `[13]` penalty, `[14]` charge |
| `57000501 00000000 TTTTTTTT` | set the UTC time (Unix seconds) |
| `57000502 HH MM` | set the time zone: HH = offset hours + 12 |
| `570f520101 M [SSSS]` | lock button: 1 off, 2 always on, 3 timed (followed by seconds, u16) |
| `570f520102 1/2` | keypad enabled / disabled |
| `570f520103 1/2/3` | tamper alarm off / on / clear the active alarm |
| `570f520104 MODE LEVEL SOUND` | backlight 1 off / 2 auto / 3 on, then level, then sound 1 off / 2 on |
| `570f520105 1/2/3` | lift the lockout for passcodes / NFC / fingerprints |
| `570f52010601` | cancel the duress alarm |

### Passcodes

| Command | Meaning |
|---|---|
| `570f520202 (n<<4\|i) …` | add a passcode. Payload `FF\|idx, type, len, digits` in 11-byte packets; the reply carries the index in `[2]` |
| `570f520203 idx START END` | set validity (u32 BE, UTC seconds). The app sends it after every non-periodic add |
| `570f520201 (n<<4\|i) …` | periodic passcode: `00, 04, len, digits, start, end, weekmask, hour, minute, duration u16`. Weekmask bit 0 = Monday … bit 6 = Sunday |
| `570f520205 idx` | delete a passcode |
| `570f530201 idx 00` | does the passcode exist (`reply[3] != 0`) |
| `570f530100` | counts: passcodes, cards, fingerprints, duress passcodes, duress fingerprints |

Passcode types: 0 permanent, 1 time-limited, 2 one-time, 3 emergency, 4 periodic.
The app uses an end time of 2100-01-01 (`F4865700`) for "no end". **?** What the app sends as the validity of a permanent code; we send now … 2100.

### NFC cards

| Command | Meaning |
|---|---|
| `570f520301 TYPE 02 01` | start enrollment. Type 0 permanent, 1 time-limited, 2 emergency. `reply[1]` = index |
| `570f530106` | enrollment status in `[2]`: 0 waiting, 1 success, 2 failed, 3 already exists, 4 no card, 5 unsupported card. The app polls once per second for up to 60 s |
| `570f520303 idx START END` | validity (time-limited cards only) |
| `570f520307 idx` | confirm the card |
| `570f520304 idx` | delete a card |
| `570f530301 idx` | does the card exist (`reply[0] == 2` means no) |

### History

`57001401 TTTTTTTT` sets the cursor. After that, `57001403` returns one record per call, newest first.

| Byte | Meaning |
|---|---|
| `[3..6]` | time |
| `[7]` | sequence number |
| `[8]` | src |
| `[9]` | act |
| `[10]` | value |

The end of the log is a reply of all zeros, or `FF FF FF`.

| src | Source | act | value |
|---|---|---|---|
| 1 / 2 / 3 / 6 / 8 | passcode / card / fingerprint / face / palm | 0 opened, 1 failed, 2 wrong credential, 3 expired | credential number; 255 = unknown, 10 = test code |
| 4 | lock button | 0 locked, 1 failed | |
| 5 | alarm | 0 low battery, 1 lockout (value: 1 passcode, 2 card, 3 fingerprint), 2 removed from the mount | |
| 7 | doorbell | 0 rang, 1 scene | |

## Not implemented

**Pairing with a lock.** The app does this with a link key from the cloud. On the keypad it sends `570603`, `570F2003`, `570F2004`×2 and `570601`. On the lock it sends `570F2002` / `2003` / `2004`. Leave this to the app.

**Reading the passcode list from the device.** The app reads the list only from the cloud. The firmware has `570F5302 00/02..06` for this, but their layout is unknown.

**Names.** The keypad stores only numbers. Home Assistant keeps the names locally (`.storage/ha_switchbot_ble.entries`, sections `passcodes` and `cards`) and never stores the codes themselves.
