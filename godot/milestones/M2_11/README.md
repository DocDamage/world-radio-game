# TerraWave M2.11-dev update from M2.10R

This patch adds harbor navigation/exploration guidance to the **complete** M2.10R cumulative source.

## Apply

1. Keep a copy of your M2.10R source.
2. Extract this patch.
3. Run:

```text
python apply_update.py --base "path/to/TerraWave-Coastal-M2.10R"
```

The updater verifies the exact M2.10R `project.godot` and marine UI controller before changing anything, verifies every payload file, and refuses an incompatible or already-modified base.

## New behavior

The marine panel gains selectable harbor exploration targets and live distance, bearing, turn-side, ETA, and visited progress. Targets come from the existing authored harbor layout, so no duplicate geographic coordinate source is introduced. The guide is explicitly a gameplay aid, not marine navigation data.

See `payload/docs/M2_11_DEV_HANDOFF.md` for implementation and validation boundaries.
