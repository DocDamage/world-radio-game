# TerraWave local development checkpoint

Updated 2026-09-12. Current increment: Windows radio readiness on the restored
M2.12 source. The application still identifies as `0.2.12-dev`; this is not a new
packaged release. The older milestone handoff and evidence remain historical.

## Workspace and baseline

- Active editable source: `C:\dev\radio world godot\TerraWave-Godot-M2.12`.
- No Git repository or local `.codex` configuration was present. No commits,
  pushes, remote changes, or user-save migrations were made. The initial Godot
  import generated editor settings; the completed local gate places editor settings
  under its isolated AppData folder. The parent contains the original archives.
- Reassembled all ten M2.12 parts; archive SHA-256 verified as
  `87442177c35d041c6b76aebe2b70bdd6cef37b6f5a85cee89f52e4098f572e7c`.
  ZIP integrity passed. All 2,345 manifest-listed baseline files initially matched.
- `SOURCE_MANIFEST.json` is the original delivery baseline, not a manifest of the
  edited tree. Current comparison: `../validation/changes/baseline-comparison.json`.
- Source changes are limited to radio failure feedback, the chained source
  protection test, and deterministic coastal JSON output. Supplied marine models,
  generated coastal data, terrain, Earth, and historical evidence are unchanged.

## Completed changes

- Prepared portable official Godot 4.7.2 in `../.tools/godot-4.7.2/`; verified the
  download against its release SHA-256. The system Godot remains 4.7.1.
- Found that PATH resolves FFmpeg to Krita's reduced build, which lacks HTTPS/TLS.
  Prepared FFmpeg 9.0.1 essentials under `../.tools/ffmpeg/`, downloaded from the
  Windows provider linked by https://ffmpeg.org/download.html and verified against
  the provider's SHA-256. The download receipt is in that folder.
- `../PLAY_TERRAWAVE.cmd` and `../EDIT_TERRAWAVE.cmd` select these portable tools
  using process-local environment variables. An explicit saved FFmpeg path still
  takes priority; clear or replace an obsolete path in Settings if necessary.
- Added fixed, actionable game feedback for FFmpeg builds missing HTTPS support.
  Raw diagnostics and stream tokens are never displayed. TLS verification remains
  enabled, and failed playback does not earn a listening stamp.
- Fixed `tools/build_coastal_data.py` to emit UTF-8/LF consistently on Windows.
  Existing byte-for-byte regeneration checks now pass without altering data files.
- Added `tools/validate_local.py`, its tests, and `docs/WINDOWS_DEVELOPMENT.md` for
  a repeatable local gate using isolated profiles and evidence outside the source.
- The exact radio source replacement is chained to M2.12 in
  `docs/M2_13_APPROVED_BASE_CHANGES.json`; inherited protection checks remain active.

## Verification

Platform: Windows, Godot 4.7.2 official, OpenGL compatibility on Intel Iris Xe.
The prepared Python 3.13 environment is `../.tools/qa-venv/Scripts/python.exe`, with
the project's QA and harbor requirements installed. Initial asset import succeeded.

- `../validation/windows-radio-voyages/`: 143 checks passed, including all twelve
  New Haven-area rows, nearby discovery, website/stream distinction, voyage state,
  process restart persistence, and rendered 1440x900 and 1100x720 interfaces.
- `../validation/windows-new-haven/`: 49 native checks passed; one decoder survived
  New Haven movement, rebasing, and library reload; decoded frames advanced.
- `../validation/windows-marine/`: 104 native checks passed, including boarding,
  sailing, docking, swimming, transfers, recovery, and synthetic-radio continuity.
- Decoder feedback: 18 checks passed, including a real failure using Krita FFmpeg.
- Marine geometry/source/assets: 22 Python tests passed. Coastal data/assets:
  25 Python tests passed after fixing canonical line endings.
- Local validation coordinator: 12 Python tests passed, plus a real fail-fast run
  rejecting Krita's missing HTTPS/TLS before asset import. Independent review of
  the game feedback, serialization, provenance chain, and launchers found no
  concrete issues. The coordinator received focused review and fixes before acceptance.
- `../validation/windows-local-final/local-validation-summary.json`: the completed
  one-command gate passed asset import, decoder feedback, all radio/voyage suites,
  New Haven travel, and marine travel on Windows. Editor settings were observed in
  that run's isolated AppData folder. Counts above describe the individual suites;
  do not add this repeated coordinator acceptance run to those totals.
- `../validation/baseline/public-streams-full-ffmpeg.json`: WPKN, WMNR, and WESU
  each decoded two seconds with the full FFmpeg build and TLS verification.
  Audio was discarded, not recorded or played to speakers. This is a point-in-time
  endpoint check, separate from the app's synthetic-radio integration checks.

Human-heard output, physical controllers, public directory refresh on this machine,
RTX performance, and an exported Windows package remain unverified. The game tests
use Dummy audio and injected input. No radio station is certified permanently live.

## Next bounded work

Git publishing checkout: `C:\dev\radio world godot\github-worktree`, linked to
`DocDamage/world-radio-game`, branch `codex/godot-windows-radio-readiness`, based on
remote main `573e24b`. The user authorized commit and push on 2026-09-12.
The pending M2.12 milestone patch includes this Windows increment and exact output
inventories; large native assets and local tool binaries remain outside Git.
Check the branch status and remote before continuing Git work. The sibling
`C:\dev\radio world` checkout stays on its original local main.

Use this checkpoint and the current source comparison instead of restoring again.
The next product increment can improve native playback coverage for the nine
website-only regional stations: investigate publisher endpoints and test the
optional directory refresh/cancel flow on Windows, preserving imported streams,
explicit user action, station identity, and profile isolation. Physical controller
focus and human-audible travel continuity also remain acceptance tasks.

Before running QA, use the documented local gate and a fresh output directory.
Keep new evidence outside the source tree and preserve the archived M2.12 baseline.
