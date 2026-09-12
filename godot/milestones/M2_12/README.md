# TerraWave M2.12 update from complete M2.11

This is a verified source updater, not a standalone Godot project. For a ready-to-open
project, use the separate complete M2.12 source ZIP instead.

## Windows local-development follow-up

This patch carries the Windows radio-readiness follow-up while the application remains
`0.2.12-dev`. It adds fixed HTTPS/TLS decoder guidance, deterministic coastal JSON
serialization, a local Windows validation coordinator, its focused tests, and the
current development checkpoint. It does not add an EXE, PCK, installer, or a new
release version.

`payload/SOURCE_MANIFEST.json` is the immutable source-delivery baseline from the
original M2.12 archive. It intentionally does not describe this later development
increment. `PATCH_MANIFEST.json` is the authoritative updater inventory: it verifies
the unchanged M2.11 base, every patch payload file, and the reconstructed output.
The current rationale, exact baseline comparison, and Windows validation boundary are
recorded in `payload/docs/CODEX_CHECKPOINT.md`.

Compact Windows evidence is kept under this milestone's `evidence/windows/`, outside
`payload/`; it is a historical handoff and is not copied into reconstructed source
trees or included in the updater inventory. It contains the final coordinator and
suite summary JSON, public-stream point checks, the baseline comparison, and passing
NPM/Python dependency-audit receipts.

Extract this patch outside your source folder. Python 3.10+ is required. Run:

```text
python apply_update.py --base "C:/Projects/TerraWave-M2.11" --output "C:/Projects/TerraWave-M2.12"
```

The base must be the complete unmodified recovered M2.11 source. The output must be
a NEW directory, separate from both base and patch; its parent must exist. Every
base file and payload file is checked for exact size and SHA-256. The updater stages
and checks the full output before publishing. Modified, missing, or conflicting
files cause refusal, not a forced overwrite. Your base is never changed; extra
files such as editor caches and personal files stay there and are not copied.

Open the new output/project.godot in Godot 4.7.2 and finish first import. Click
**New Haven** in the station browser. Native audio needs configured FFmpeg; website
players and native streams are labeled separately. No new EXE/PCK is included.

The full base/output inventories are deliberately included for complete verification.
SHA-256 detects accidental corruption, not the identity of an untrusted distributor.
The updater's hermetic tests can be run with `python -m unittest -v test_update`.
See payload/docs/M2_12_DEV_HANDOFF.md and M2_12_VALIDATION.json for current boundaries.
For the Windows follow-up, see `payload/docs/WINDOWS_DEVELOPMENT.md` and
`payload/docs/CODEX_CHECKPOINT.md`.
