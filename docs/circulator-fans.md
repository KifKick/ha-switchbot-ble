# SwitchBot circulator fans: app protocol

Products:
- Battery Circulator Fan 2 Pro
- Standing Circulator Fan
- Battery Circulator Fan

Analysis of 2026-11-16, from the behaviour of the SwitchBot app 10.10. Nothing was tested on a device. **(?)** marks uncertain items.

**Our code:**
- Library: `sbble/devices/air/fan_base.py`, `circulator_fan.py`, `circulator_fan_pro.py`, `standing_fan.py`.
- Integration: `catalog/appliances.py` (`STANDING_FAN`, `FAN_PRO`, `circulator_fan`), `fan.py`, `light.py`.

## 1. Products and how they are recognised

| Product | Cloud type | BLE adv id (mfr 2409) | Notes |
|---|---|---|---|
| **Battery Circulator Fan 2 Pro** | **W1160000** | 4-byte id `00 11 B3 40` (=1160000) | Own command set (below). Its advertisement uses the ceiling-fan layout (shared with W1071000). It also has Wi-Fi/LAN. |
| **Standing Circulator Fan** | **W1116000** | `00 11 07 60` (=1116000) | Uses the "Fan 2" command set **(?)** |
| **Battery Circulator Fan** | — | service-data byte `0x7E` "~" (pairing mode `0x5E` "^") | "Fan 2" command set. The non-battery "Circulator Fan" is the same type without a battery. |

**Recognition in sbble:**
- `~` / `^` → Circulator Fan (`circulator_fan.py`);
- `0011B340` / `0111B340` → Circulator Fan Pro (= Battery Circulator Fan 2 Pro, `circulator_fan_pro.py`);
- `00110760` / `01110760` → Standing Fan (`standing_fan.py`).

The Battery Circulator Fan and the non-battery Circulator Fan share the id; the advertisement cannot tell them apart.

## 2. App BLE commands

### Battery Circulator Fan 2 Pro (W1160000)

`src` is a control-source byte; sbble uses 0x29.

| Command | Meaning |
|---|---|
| `570f978102` | Full status read; reply layout below |
| `5701` + status + src | "Master switch" **(?)**: unclear what it switches; the app treats it as the power state |
| `570f4111` + src + power(0/1) + mode [+ b7] | Power and mode. Modes: 1 direct, 2 natural, 3 sleep, 4 hurricane, 5 custom natural, 6 = unknown, takes a speed byte **(?)**. b7 = speed 1-100 (FF = keep) for modes 1/2/6, `00` for mode 5, omitted for 3/4. |
| `570f410201` + H + V | Oscillation start/stop: 1 = start, 2 = stop, FF = keep |
| `570f410202` + Hswing + Hcenter + Vswing + Vcenter | Swing angle and centre (FF = keep) |
| `570f410204` + H + V | Angle fine-tune; reply b1/b2 = angles |
| `570f410205` + H + V | Return to centre on power-off (1 on / 2 off) |
| `570f960a01` + on + brightness + `ff` | Indicator light |
| `570f960a02` + ((level<<1)\|on) + bright2 + bright1 | Night light. Level 0 = high, 1 = low; trailing bytes FF by default. |
| `570f960b` + on | Ionizer **(?)**: the command exists, but the hardware may not have one |
| `570f9605` + on + loudness | Beep / buzzer |
| `570f9606` + on | Child lock |
| `570f42030100` | Mode/speed query (reply b1 mode, b2 speed) |
| `570f9705` | Beep query (reply b1) |
| `570f9607` + type(1 = fan) + 4-byte UTC seconds + action | Off/on delay timer |
| `570f9707` | Delay read (b1-4 fan UTC time, b13 bit0 action) |
| `570f960801` + count, then `570f960804` + chunked entries | Write schedules (entry format below) |
| `570f970801`; `570f970804` + idx + off + len | Read schedule count / schedule entries |

**Reply of `570f978102`:**
- **b1:** bit7 indicator light, bit6 child lock, bit5 night-light level, bit4 night-light on, bit3 off-delay active, bits0-2 schedule count.
- **b2:** bit7 charging, bits0-6 battery.
- **b3:** bit7 power, bit6 horizontal oscillation, bit5 vertical oscillation, bit4 horizontal return-to-centre on power-off, bit3 vertical return-to-centre on power-off, bit0 ionizer.
- **b4:** horizontal swing angle.
- **b6:** vertical swing angle.
- **b8 & 0x0F:** mode.
- **b9:** speed (when mode is 1).

**Schedule entry:**
- Fields in order: `01`; (enable<<7\|idx); (once<<7\|weekday bits, bit0 = Sunday); HH and MM in UTC; fanCmdLen + fanCmd (fanCmd = the payload of `570f4101` + src…); light lengths 0, 0.
- The data is split into 11-byte chunks. The offset byte has bit7 = last chunk.

**Pro advertisement** (ceiling-fan layout; mfr-data offsets include the 6-byte MAC):
- **b7:** bit7 charging, bits0-6 battery.
- **b8:** bit7 power, bits4-6 mode, bit3 night-light level, bit2 night light on, bit1 horizontal oscillation, bit0 vertical oscillation.
- **b9:** speed (bits0-6).
- **b10-14:** these look like the ceiling-fan light fields; whether the Pro uses them is unknown **(?)**.

### Battery Circulator Fan and Standing Circulator Fan

The app's "Fan 2" command set; sbble uses these payloads.

**Control:**
- Power: `570F4101` 01/02.
- Oscillation: `570F410201` H V.
- Swing angle: `570F410202`. Fine-tune: `570F410204`. Return to centre: `570F410205`. Oscillation params: `570F410211`.
- Modes: `570F41030101`+speed (direct), `…0102` natural, `…0103` sleep, `…0104` baby, `…0105` custom natural. Custom-natural setup: `570F410303`.
- Delayed off: `570F410401`. Night light: `570F410502`. Buzzer: `570F4106`. Child lock: `570F4107`.

**Queries:** `570F4181`/`4281` (status), `4201`, `4202`, `420301`/`02`/`03`, `420401` (delay), `420501`/`02`, `4206`, `4207`.

**Advertisement** (mfr b7/b8):
- **b7:** power, mode (bits4-6), night light (bits2-3), horizontal oscillation, vertical oscillation.
- **b8:** bit7 charging, battery (bits0-6).

**Scene UI values:**
- Angles: 30 / 60 / 90.
- Night light: 0 off, 1 "dark", 2 "light".
- Speed: 1-100, shown as 9 levels.

## 3. What ha_switchbot_ble does

### A. Battery Circulator Fan 2 Pro (`circulator_fan_pro.py`, encrypted)

| Feature | App | sbble / entity | Notes |
|---|---|---|---|
| Power, modes normal / natural / sleep / hurricane | `570f4111` | fan entity (`570f411129 01/00`, mode byte) | Custom natural (5) and 6 not supported. For modes 1/2 the app appends b7 (FF = keep); sbble omits it **(?)** |
| Speed 1-100 | `570f4111` mode 1 + b7 | fan percentage (`570f4111290101XX`) | |
| Oscillation H/V | `570f410201 H V` | fan oscillate (both axes) + vertical switch | |
| Night light, 2 levels | `570f960a02` | light entity (`570f960a02` + 00 off / 01 high / 03 low) | The app sends 2 extra brightness bytes (FF); sbble omits them |
| Full status | `570f978102` | read with the basic info: child lock, indicator, return to centre per axis, swing angles | |
| Child lock, beep, indicator light | `570f9606`, `570f9605` / `570f9705`, `570f960a01` | switches | |
| Return to centre on power-off | `570f410205` | horizontal / vertical switches | |
| Swing angles | `570f978102` b4 / b6 | diagnostic sensors | Writes (`570f410202`) and fine-tune (`570f410204`) not supported |
| Battery, charging | adv b7 | sensor, binary sensor | |
| Ionizer | `570f960b` | no | **(?)** may not exist on this hardware |
| Off-delay timer, schedules | `570f9607` / `570f9707`, `570f9608…` / `570f9708…` | no | The timer uses an absolute UTC time; schedules are chunked |

### B. Standing Circulator Fan (`standing_fan.py`)

| Feature | App | sbble / entity | Notes |
|---|---|---|---|
| Power, modes 1-5 (incl. custom natural) | `570F4101`, `570F4103 01 0x` | fan entity | Setting the custom-natural curve (`570F410303`) is not supported |
| Speed | `570F410302` | fan percentage | The app lists `0302` for the Smart Fan only **(?)** |
| Oscillation H/V | `570F410201` | fan oscillate (both) + H and V switches | |
| Swing angle H/V | `570F410202` | number ×2 (30 / 60 / 90; vertical 90° sent as 0x5F) | The fan doesn't report the angle; the last set value is kept |
| Return to centre | `570F410205` | switch `auto_recenter` (both axes) | |
| Night light off / 1 / 2 | `570F410502` | select (off sent as 0x00, read back as 0) | **(?)** The app scene says 1 = dark, 2 = light; the select maps 1 to "bright" |
| Front display, buzzer, child lock | `570F410501`, `570F4106`, `570F4107` | switches | |
| Battery, charging | adv | sensor, binary sensor | |
| Fine-tune angle, delayed off timer | `570F410204`, `570F410401` | no | |

### C. Battery Circulator Fan (`circulator_fan.py`)

| Feature | App | sbble / entity | Notes |
|---|---|---|---|
| Power, modes normal / natural / sleep / baby, speed | yes (mode 5 custom natural also listed for "Fan 2") | fan entity | Custom natural not supported |
| Horizontal oscillation | `570F410201` | fan oscillate (H only) | |
| Vertical oscillation | adv bit0 | `set_vertical_oscillation` exists, no entity | **(?)** Unconfirmed whether this model has a vertical motor |
| Night light | `570F410502` | select | |
| Battery, charging | adv b8 | sensor, binary sensor | The non-battery Circulator Fan shares the id and gets a useless battery sensor |
| Swing angle / fine-tune / return to centre, buzzer / child lock, delayed off timer | `0202` / `0204` / `0205`, `4106` / `4107`, `570F410401` | no | Status bits for child lock / buzzer unconfirmed |
