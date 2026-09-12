# TerraWave Native — M2.10R Coastal Systems

**Godot 4.7.2 · version 0.2.10-rc1 · cumulative native source**

This build connects authored harbor scenery, an optimized physical skiff, simulated
tides and waves, modeled underwater terrain, swimming/diving, and local dock
interactions to TerraWave's existing globe-to-ground application. It uses the actual
included New Haven Harbor water polygons and terrain, not a replacement water square.

M2.10R was rebuilt from the available M2.9 cumulative source because the previously
reported M2.10 source/PCK were not available as bytes. Historical reports are not
current acceptance. This rebuild has actual Godot 4.7.2 import, rendered interaction,
physics, audio-decoding and separate exported-PCK evidence. See
[the implementation handoff](docs/M2_10R_HANDOFF.md),
[the validation report](docs/M2_10R_VALIDATION.json) and
[the evidence index](evidence/m2_10r/README.md).

## Open and play

Extract the complete source ZIP into a **new folder**, retaining previous versions.
Open `project.godot` in **Godot 4.7.2**, allow the first import to finish, then press
**F5**. Models, compiled geographic data and optimized resources are already included;
no extra asset download or dependency installation is needed for offline exploration.

**Explore → New Haven Harbor → Locate installed region → Descend & explore →
Walk / resume.** The original globe start and region selection remain unchanged.

Walk down the short gangway onto the floating visitor dock beside the skiff. Press
**V** to board, **V again** to release the lines, then select **Sail / resume** if
controls are released. Board only from beside the vessel; there is no remote launch
teleport. Existing coastal water/depth guards must accept the complete hull.

| Action | Keyboard / mouse |
|---|---|
| Walk, swim, throttle / steer | W / A / S / D |
| Boat brake | Space |
| Look / boat camera center | Mouse / C |
| Board from dock / release mooring | V |
| Moor / step ashore / climb ladder / reboard nearby stopped skiff | E |
| Enter water from a stopped boat or nearby ladder/bank | G |
| Swim down / up | Ctrl / Space |
| Swim sprint | Shift |
| Release controls | Esc |
| Return to globe | R |
| Toggle expanded view | F2 |

For a return trip, approach the berth slowly, align with the dock, press **E** to
secure the lines, let the boat settle, then press **E** again to step onto the dock.
Enter the water with **G**, dive with **Ctrl**, surface with **Space**, and press **E**
near the ladder to climb out. Air depletes underwater; loss of air or supported water
uses the existing checked-shore recovery path. A nearby stopped skiff can also be
reboarded from the water. Context labels indicate why a transfer is refused.

The marine panel provides tide-rate and wave controls and reports modeled depth,
water conditions, and swim resources. Gamepad mappings are implemented, but physical
controller acceptance is not claimed. Existing radio playback still requires a
separately installed trusted **FFmpeg**, configured in Settings. No broadcast or
FFmpeg binary is bundled.

## Runtime PCK

The separate `TerraWave_Native_M2_10R_Coastal.pck` is a real exported pack, not a
standalone executable. Launch it with a matching Godot 4.7.2 executable:

```text
"path/to/Godot-4.7.2" --main-pack "path/to/TerraWave_Native_M2_10R_Coastal.pck"
```

Keep previous-version PCKs separate. They do not contain this build's coastal code.
`BUILD_WINDOWS.cmd` and the Python build helper are provided, but a Windows EXE was
not produced here: matching Windows export templates are absent. Windows/RTX 3060,
physical controller, human-heard audio and target-device performance remain local
acceptance tasks, not results established by Linux software rendering.

## Data and art boundaries

**Bathymetry and tides are gameplay models, not surveyed depths or live predictions.**
Asset placement is authored scenery at recorded geographic coordinates, not evidence
that those real objects occupy those locations. The mapped shoreline does not flood
and recede with the tide. Carrier and Swift are tide-following exhibits; only the
skiff is physically drivable. Transfers are first-person camera/control transitions,
not visible character boarding animations.

Mesh optimization, shared surfaces, LOD selection, compressed textures, bounded
streaming and simplified collision are implemented. They do not repair missing
photogrammetry surfaces, scan fragments, or original texture defects. No target-GPU
frame-rate or complete artistic reconstruction is claimed. Original model files and
provider/license notices remain preserved. Do not redistribute third-party assets
without their applicable rights.

## Development and verification

```bash
python -m unittest discover -s tests -p "test_*.py" -v
# In the following commands, substitute the actual Godot 4.7.2 executable.
godot --headless --path . --script res://tests/test_suite.gd
godot --headless --path . --script res://tests/test_harbor.gd
godot --headless --path . --fixed-fps 60 --script res://tests/test_coastal_physics.gd -- --hz=60
python tests/run_native_tests.py --godot /path/to/godot --output evidence/local --timeout 900
python tools/validate_pack.py --godot /path/to/godot --pack /path/to/pack.pck --output evidence/local_pack
python tools/verify_source_package.py
```

The integration and PCK runners use isolated profiles and owned loopback audio,
not live station reliability tests. Linux rendered runners need Xvfb and FFmpeg.
Development geometry tools need the Python dependencies in `region_tools/`; normal
play does not. Do not run simultaneous interactive tests on the same X display.
Do not use fixed-FPS fast-forward on asynchronous main-application streaming tests.
