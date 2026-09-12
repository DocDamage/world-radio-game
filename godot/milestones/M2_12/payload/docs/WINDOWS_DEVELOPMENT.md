# Windows local-development gate

Run this source-project gate from PowerShell after extracting TerraWave to a
writable development folder. It performs a headless editor asset import before the
M2.12 radio/voyage checks and the rendered New Haven native-radio check.

Use the official portable Godot 4.7.2 console executable. The coordinator requires
the version string to start with `4.7.2.stable.official`; it does not download an
engine or FFmpeg.

```powershell
$project = "C:\dev\radio world godot\TerraWave-Godot-M2.12"
$godot = "C:\dev\radio world godot\.tools\godot-4.7.2\Godot_v4.7.2-stable_win64_console.exe"
$ffmpeg = "C:\dev\radio world godot\.tools\ffmpeg\ffmpeg-9.0.1-essentials_build\bin\ffmpeg.exe"
$python = "C:\dev\radio world godot\.tools\qa-venv\Scripts\python.exe"
$evidence = "C:\TerraWave-QA\m2_12-local-20260912"

& $python "$project\tools\validate_local.py" `
  --godot $godot `
  --ffmpeg $ffmpeg `
  --output $evidence
```

The workspace also provides `C:\dev\radio world godot\EDIT_TERRAWAVE.cmd` and
`C:\dev\radio world godot\PLAY_TERRAWAVE.cmd`. They start the portable editor or
project with the bundled full FFmpeg environment without changing global `PATH` or
Godot configuration. The FFmpeg path explicitly saved in TerraWave Settings remains
authoritative for normal interactive playback.

`--godot` and `--ffmpeg` default to `godot` and `ffmpeg` on `PATH`, respectively.
The native fixture also requires NumPy, Rasterio, PyProj, Shapely, Fiona, and Pillow.
The prepared local QA virtual environment above has them; it is a local development
environment, not checked-in source. To create or repair a different environment,
install both pinned requirement files with that environment's Python and then run the
gate:

```powershell
& $python -m pip install -r "$project\tools\requirements-harbor.txt" -r "$project\tools\requirements-qa.txt"
& $python "$project\tools\validate_local.py" --output "C:\TerraWave-QA\m2_12-local-20260912"
```

The output path must be a **new directory outside the source tree**. The command
refuses existing directories rather than overwriting prior evidence. It creates
child-only profile, catalog, region-library, temporary, AppData, and Godot-user-home
paths under that evidence directory. The normal TerraWave saves and global Godot
settings are not used. Godot's project-local `.godot` import cache may be created or
updated in the development source folder; this is the editor import cache, not a
profile or global configuration change.

Before an expensive import, the gate checks the selected FFmpeg's version and runs:

```powershell
& $ffmpeg -hide_banner -protocols
```

The input-protocol section must advertise `http`, `https`, `tcp`, and `tls`; the
output-protocol section must advertise `pipe`. Use a trusted full FFmpeg build when
this check fails; reduced multimedia installations may omit TLS or HTTPS support and
cannot exercise the native radio decoder.

The evidence directory contains:

- `local-validation-summary.json` — machine-readable platform, tool versions,
  isolation paths, per-step exit status, errors, log paths, and limits.
- `editor-import.log` — editor asset-import output.
- `decoder-feedback.log` — decoder-error messaging checks, including the missing
  HTTPS/TLS build guidance.
- `radio-voyages.log` and `radio-voyages/` — the M2.12 regional, voyage, restart,
  and native radio/voyage runner evidence.
- `new-haven-native.log` and `new-haven-native/` — synthetic-loopback rendered
  New Haven native test logs, JSON, and images.
- `marine-native.log` and `marine-native/` — focused rendered harbor boarding,
  sailing, swimming, transfer/recovery, and audio-continuity evidence.

Timeouts can be adjusted for a slow machine. The default editor-import timeout is
15 minutes, with 20 minutes for the radio/voyage runner and 15 minutes for each
native runner:

```powershell
& $python "$project\tools\validate_local.py" --output "C:\TerraWave-QA\retry" `
  --import-timeout 1200 --radio-timeout 1500 --native-timeout 1200 --marine-timeout 1200
```

This is an automated source-project gate. It does not certify audible playback,
physical controllers, public-radio availability, target-hardware performance, or a
signed/exported Windows application. The native test uses generated loopback audio,
not public broadcast recordings.
