# TerraWave M2.11-dev — Harbor Navigation & Exploration

This development increment continues from M2.10R without altering the geographic water footprint, buoyancy model, bathymetry model, dock transfer safety rules, radio ownership, or original marine assets.

## Implemented

- Added a lightweight harbor exploration guide driven directly by the existing M2.10R `harbor_layout.json` rather than duplicated coordinates.
- The guide exposes the visitor dock, floating exhibits, and submerged exhibit as selectable exploration targets.
- Live telemetry computes region-space distance, north-referenced bearing, signed left/right turn guidance, ETA when moving, and visited progress.
- Arrival is edge-triggered inside a bounded radius so a target is not repeatedly re-awarded every refresh tick.
- Snapshot/restore helpers are region-bound and reject progress from another geographic region.
- The marine side panel now includes a target selector and live harbor-guide line while preserving the existing tide/wave controls and warnings that modeled water data is not navigation data.
- Project development version advanced to `0.2.11-dev`.

## Validation scope

The uploaded M2.10R cumulative source ZIP was truncated before its central directory and omits 1,866 files named by its own manifest. The intact M2.10R update payload restored the coastal files required to make this patch, but it cannot recreate all inherited M2.9 files by itself. Therefore this delivery is intentionally an **update patch**, not a falsely labeled cumulative source archive.

The new navigation model is tested directly under the supplied Godot 4.7.2 Linux executable. Full-application M2.10R integration/runtime acceptance must be rerun after applying this patch to a complete M2.10R source tree.

## Next recommended development

After applying this patch to a complete cumulative source, run the full existing M2.10R native suite, then add route-marker rendering in world space and persistent per-profile voyage history. Windows/RTX 3060, physical gamepad, audible output, and long-play profiling remain separate target-device acceptance work.
