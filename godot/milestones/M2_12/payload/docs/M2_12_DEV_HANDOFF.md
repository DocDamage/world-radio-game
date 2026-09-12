# TerraWave M2.12-dev — continuation handoff

## Authoritative state

The cumulative M2.12 source is reconstructed from the user's complete M2.9 archive,
the intact M2.10R update, and the verified M2.11 payload. The previously truncated
M2.10R ZIP is not a source of missing bytes. M2.11 had 2,308 verified source files.
Every inherited file is carried forward unless its exact replacement is in the
M2.12 patch manifest. No marine model, Earth model, water polygon or terrain asset
was substituted. Generated import caches and generated GLB texture extractions are
not source additions; Godot recreates them on first import.

The application version is `0.2.12-dev`; engine used is
`4.7.2.stable.official.ed1daf0bf`. This is a development source release, not M2.10R's
older runtime pack. Consult `M2_12_VALIDATION.json` for the current test boundary.

## Root causes and fixes

The bundled catalog contained eight global starter rows and no Connecticut rows.
An imported/cache catalog replaced that fallback entirely. Text search could not
locate neighbors with different town names. City-grouped globe markers could select
the first service in a cluster instead of the explicitly chosen service. The original
float32 spherical-dot distance was inaccurate at small distances.

`RegionalCatalog` now merges twelve provenance-bearing local entries into every
successful load, preserving imported IDs/endpoints and supplementing known matching
callsigns. `GeoMath` uses haversine distance. Nearby filters by actual radius around
the exploration destination, combines query/favorites, and sorts by distance then ID.
The New Haven shortcut clears conflicting filters and focuses both map and destination.
Shared city beacon picking retains the selected identity and opens nearby results.

CatalogCodec now accepts explicit website-only records, while keeping native streams
and external players distinct. RadioPlayer refuses website-only rows before stopping
current native audio. Opening the website never counts as native listening or stamps.

An explicit online dialog owns a bounded Radio Browser service with mirror discovery,
strict identity selection, retries, body/time limits, and generation IDs so a canceled
callback cannot mutate a later request. Saved candidates supplement future starts;
no auto-refresh, precise device lookup or autoplay is introduced. Imported stream
URLs retain priority. Live public lookup/audio is NOT acceptance-tested here.

## Voyage increment

The navigation guide now computes clockwise-north bearing from the actor's actual
forward basis, corrects ETA rounding, and uses closing velocity (no ETA while moving
away). Targets are validated and deduplicated, saved by stable ID and bound to region.
The host persists bounded selected-target/first-arrival state through the existing
atomic SaveStore, preserving unrelated profile fields. The marine layer never writes
profiles or controls radio directly. Selection and visited state survive restart.

A single non-colliding region-positioned beam/Label3D follows origin rebasing and the
shared water-height model. It is visible only in active surface modes and within
1.5 km, with a user toggle. Voyage history shows bounded first-arrival entries. It is
not a navigable route, chart, real-world POI survey, or steering autopilot.

## Code map

- `data/regional_stations.json`: targeted supplement and publisher provenance.
- `src/core/regional_catalog.gd`, `station_catalog.gd`, `catalog_codec.gd`: catalog.
- `src/core/station_directory.gd`: optional stream refresh; `profile_extensions.gd`: bounded save fields.
- `src/ui/station_browser.gd`, `station_directory_dialog.gd`, `station_inspector.gd`: discovery UI.
- `src/world/globe.gd`: shared city marker identity.
- `src/ui/main.gd`: host wiring and persistence ownership.
- `addons/terrawave_marine/coastal/navigation_guide.gd`: target telemetry/state.
- `src/exploration/marine/waypoint_marker.gd`, `voyage_journal.gd`, `marine_controller.gd`: voyage UX.

## Protection rules

Do not weaken source/asset provenance tests. `M2_12_APPROVED_BASE_CHANGES.json` permits
exactly twelve previously protected source/test replacements, with chained old/new
SHA-256 values and reasons. M2.10R's separate six-file exception remains intact.
All other protected M2.8 files and all supplied marine model hashes stay exact.
The original prohibition on AppState/file writes in marine nodes remains enforced.
New tests supplement old tests rather than replacing radio/harbor integration gates.
Test outputs belong outside `res://` historical evidence; terrain/coastal tests were
adjusted so reruns do not rewrite an earlier milestone's evidence.

## Run tests

Use an isolated profile/catalog/library directory. Native audio tests require FFmpeg.
The integrated runner creates local test broadcasts, not public station recordings.

```text
python tools/validate_integrated.py --godot /path/to/godot --ffmpeg /path/to/ffmpeg --output /new/evidence
python tools/validate_radio_voyages.py --godot /path/to/godot --output /another/new/evidence
/path/to/godot --headless --audio-driver Dummy --path . --script res://tests/test_regional_radio.gd
/path/to/godot --headless --audio-driver Dummy --path . --script res://tests/test_voyage_navigation.gd
python tests/test_marine_tools.py
python tests/test_coastal_tools.py
```

The historical integrated runner labels its JSON build `0.2.8`; its current run is
against this M2.12 tree. The M2.12 validation record records that distinction explicitly.
The new native rendered suite is `tests/test_m212_native.gd`. Use a virtual display
on headless Linux; test both 1440x900 and 1100x720. Restart tests run
`tests/test_m212_restart.gd` first with `-- --seed`, then a new process without seed,
sharing only the isolated profile/catalog paths. Never point QA at a user's real save.

## GitHub handoff

Repository: `DocDamage/world-radio-game`. PR #1 (M2.11) was confirmed merged;
merge commit `573e24b27c16d90fc6db51153cbd534ec583d5fb`.
No M2.12 commit/PR was created in this session: the available GitHub connector exposes
read-only actions. The Git-ready ZIP places this milestone under
`godot/milestones/M2_12/`, without replacing the web app or uploading large licensed
binaries. Start a new feature branch from current main, inspect the supplied files,
commit and open a PR. Do not force-push or merge without authorization. The cumulative
native source ZIP remains necessary for the complete offline Godot asset tree.

## Remaining acceptance / next work

First test New Haven on Windows with a configured FFmpeg and real internet: verify
all twelve rows are visible, distinguish website/direct streams, exercise optional
refresh/cancel and save/restart, and validate currently playable streams. Then test
controller focus and actual audible continuity while walking/sailing/diving. Do not
claim Windows/RTX performance from Linux software rendering. The optional Cesium
native dependency, wider/global station discovery, target-device performance and
full web-game feature parity remain separate work.
