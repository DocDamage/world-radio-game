# TerraWave native Godot development

The repository keeps native milestone source updates under `milestones/` alongside
the web application. Large Earth, terrain, and licensed marine assets are supplied
in the complete source distribution, outside ordinary Git history.

The current native update is [M2.12 with Windows radio readiness](milestones/M2_12/README.md).
It contains regional New Haven station discovery, persistent voyage progress,
Windows FFmpeg error feedback, deterministic coastal generation, and a repeatable
Windows validation command. The application remains `0.2.12-dev`.

Apply the updater to a complete, unmodified M2.11 source as described in that README.
It reconstructs a new source directory and verifies every inherited and changed file.
The resulting `docs/CODEX_CHECKPOINT.md` records development state and validation
boundaries. Repository milestone folders themselves are not standalone Godot projects.

`workspace/` preserves the local Windows launchers and workspace entry README.
Copy those files into the parent of `TerraWave-Godot-M2.12` when reproducing that
workspace layout. They expect separately installed portable tools under `.tools/`
at the documented versions. Executables, Python environments, user profiles,
import caches, and complete source archives are not included in this repository.

For the recorded Windows checks, see `milestones/M2_12/evidence/windows/`.
Public stream probes describe availability only at the time they ran; the native
integration tests use generated loopback audio and Dummy output.
