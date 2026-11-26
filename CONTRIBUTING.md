# Contributing

## Code layout

```
custom_components/ha_switchbot_ble/
  catalog/        one ModelSpec per model: device class, entities, settings read
  entity.py       description-driven entities
  <platform>.py   the platform's generic entity class (+ main device entities)
  panel/          websocket API of the panel
  storage.py      data kept in Home Assistant (offsets, code names)
  migration.py    taking devices over from the built-in integration
  sbble/          BLE library: core/ (connection, encryption, advertisements, account),
                  devices/<family>/ (one module per device)
frontend-src/     panel sources (TypeScript + Lit); the built file goes to frontend/
brand-src/        logo, icon and sidebar icon as SVG (the PNGs are in brand/)
docs/             per-device protocol notes
tests/            library, integration and panel tests; snapshots/ holds the entity snapshot and its generator
```

A new model is one `ModelSpec` in `catalog/` and one class in `sbble/devices/<family>/`. Platforms and the panel's maps are derived from the catalog.

`sbble` has no Home Assistant imports. Shared code goes into family base modules (`*_base.py`); each concrete device sets `model` and `parse` and registers its advertisement codes with `@device(name, *codes)`.

## Tests and lint

Python 3.14. `requirements_test.txt` pins Home Assistant 2026.11.0, the packages of the core integrations this one depends on, `pytest` and `ruff`:

```sh
python3.14 -m venv .venv && . .venv/bin/activate
pip install -r requirements_test.txt
ruff check .
pytest
```

`tests/sbble/` tests the library without Home Assistant (the conftest stubs the integration package), so `pytest tests/sbble` also runs in a venv with only `bleak`, `bleak-retry-connector`, `cryptography`, `aiohttp` and `pytest`.

`tests/sbble/test_vectors.py` checks bytes from real devices and from the app. `tests/sbble/recorded/` pins parser results and command frames for generated inputs to `recorded/data/` (see `recorded/record.py`). Re-record with `SBBLE_RECORD=1` only after confirming an intended change.

`test_entity_snapshot` compares the entities of every model (unique_id, names, categories, units) with `tests/snapshots/ha_switchbot_ble.json`. After an intended change regenerate it with `python3 tests/snapshots/entity_snapshot.py custom_components.ha_switchbot_ble tests/snapshots/keys.json > tests/snapshots/ha_switchbot_ble.json`.

## Panel

```sh
cd frontend-src && npm ci && npm run build
```

The built bundle (`custom_components/ha_switchbot_ble/frontend/switchbot-panel.js`) is committed: the integration is installed from the repository as it is. CI fails when it is not rebuilt after a change in `frontend-src/`.

End-to-end test with Playwright, driving every demo device and wizard: `python3 tests/panel/run_panel.py <screenshot directory>`.

## CI

`.github/workflows/ci.yml` runs on every push to `main` and every pull request: ruff and pytest, the panel build (and that the committed bundle is current), hassfest and the HACS validation.

`main` requires these four checks before a pull request merges (administrators may push directly). Dependabot keeps the GitHub Actions up to date weekly; its patch and minor updates merge by themselves once the checks pass (`dependabot-automerge.yml`), major updates wait for a review.

## Releasing

1. Set the new version in `custom_components/ha_switchbot_ble/manifest.json` (semantic versioning) and commit it.
2. Tag and push: `git tag v1.0.1 && git push origin main v1.0.1`.

`.github/workflows/release.yml` runs CI again, checks that the tag matches the manifest version, builds `ha_switchbot_ble.zip` (the content of `custom_components/ha_switchbot_ble/`) and creates the GitHub release with generated notes. A tag with a suffix (`v1.1.0-beta.1`) becomes a pre-release. The Marketplace installs the zip of the chosen release (`hacs.json`: `zip_release`).
