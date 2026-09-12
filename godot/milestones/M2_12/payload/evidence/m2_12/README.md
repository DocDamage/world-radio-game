# M2.12 evidence

These are current-run summaries, logs and actual Godot llvmpipe screenshots. The
historical integrated runner still emits build label `0.2.8`; this run used the
M2.12 source/version, recorded in docs/M2_12_VALIDATION.json. Do not confuse that
legacy summary label with a different source build. Full current integrated run:
2,351 checks and 128 Python cases, zero failures.

The new radio/voyage wrapper ran 143 checks (57 radio, 32 navigation/journal,
1 restart seed + 10 fresh-process checks, 43 rendered native checks). The screenshots
are not concept art: New Haven station browser at two window sizes, harbor target
and saved history. Camera aim for the marker screenshot is explicitly controlled;
independent native suites cover movement/control injection.

Audio continuity acceptance used an owned loopback FFmpeg test broadcast with
Dummy audio driver. No public station or human-heard audio is certified. Individual
source/asset protection and physics/edge suites are additional, not substitutes for
the integrated run. Package CRC/SHA and full updater reconstruction results are in
the separate release package receipt (generated after packaging).
