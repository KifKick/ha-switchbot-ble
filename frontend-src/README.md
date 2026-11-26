# SwitchBot panel (frontend source)

TypeScript + Lit source of the "SwitchBot" sidebar panel. esbuild bundles it into
one module, `custom_components/ha_switchbot_ble/frontend/switchbot-panel.js`, which
`panel/__init__.py` registers. The bundle is committed, so Home Assistant needs no build
step; rebuild it after every change here.

```sh
npm ci
npm run build      # typecheck + bundle
npm run watch      # bundle on every save
```

## Layout

```
src/
  main.ts                 <switchbot-panel>: toolbar, routing, demo toggle
  api.ts                  typed websocket calls (custom_components/ha_switchbot_ble/panel/)
  types.ts                hass subset and backend payloads
  devices.ts              device <-> entity helpers (registry, battery, names)
  base.ts, styles.ts      base element (hass + translator), shared HA-like styles
  localize/               en.ts (source of keys), pl.ts (type-checked against en)
  demo/demo-hass.ts       browser-only demo devices (hass wrapper)
  components/
    sb-device-list.ts     start page: devices grouped by kind
    sb-device-page.ts     one device: tabs and the selected section
    sb-device-overview.ts controls / status / diagnostics entities
    sb-entity-settings.ts configuration entities with their controls
    sb-entity-row.ts      one entity row (switch, select, number, button, lock)
    sb-history.ts         lock / keypad history (their history event entity)
    sensor/               correction of temperature / humidity / CO2
    lock/                 live status, calibration wizard (flows + art)
    keypad/               status, passcodes & NFC cards
```

Navigation is device first: `/` lists devices, `/device/<entry_id>/<section>`
shows one device. The path is the panel route, so browser back/forward work.

## Testing

`tests/panel/harness.html` is a mock Home Assistant; `tests/panel/run_panel.py`
drives it with Playwright, checks the websocket/service calls and saves
screenshots.
