# TerraWave Native — M2.12 Regional Radio & Voyages

**Godot 4.7.2 · 0.2.12-dev · complete editable development source**

This continues the recovered M2.11 native project. It fixes missing New Haven-area
station discovery and adds a world-space harbor target marker and saved visit history.
It is not a browser wrapper, Windows executable, or a production-certified release.

## Open this build

Extract the cumulative ZIP into a **new folder**. Open `project.godot` in Godot 4.7.2,
allow the first asset import to finish, and press **F5**. Do not run an older M2.10R
PCK and expect these changes: this delivery is source, not a replacement PCK.
The complete source includes the inherited Earth, harbor, geography and marine assets.
Do not copy the `.godot` cache from a previous version.

For an existing complete, unmodified M2.11 source, the separate M2.12 update ZIP can
reconstruct a new output directory instead. Its SHA-256 checks cover the entire base,
not just `project.godot`; it never changes that base. The full ZIP requires no updater.

## Find New Haven radio

In **Discover stations**, click **New Haven**. The destination moves to New Haven and
**Nearby / 50 km** displays the 12 bundled regional entries, sorted by city-center
distance. Use 25, 50, 100 or 200 km, or search a callsign, station, city, genre or CT.
Nearby follows the exploration destination, not your device location. Toggle Nearby
off to return to the full loaded catalog. Saved and search filters also apply.

Local metadata is available offline and survives older cached/imported catalogs.
The eight original starter stations remain; this is a targeted regional supplement,
not an exhaustive global station database. Globe beacons group cities rather than
stacking multiple stations at the same point. Picking a beacon opens its nearby list;
a selected station at a shared city coordinate retains its own identity.

**Visibility is different from playback.** Three regional entries contain direct
publisher-linked stream URLs (WPKN, WMNR and WESU). The other nine explicitly display
**Website** until an appropriate native endpoint is resolved. Website buttons open
the official player; they do not fake native playback or a listener passport stamp.
No public stream is certified as live by this build's offline tests.

The optional **Refresh regional streams… → Refresh streams online** action contacts
Radio Browser after confirmation. It uses bounded mirror retries and conservative
callsign/country/homepage matching, preserves explicit imported streams, and caches
successful candidates without autoplay. Canceling or losing the network leaves the
existing catalog available. Directory results are not a guarantee of playable audio.

Native audio still requires a separately installed, trusted **FFmpeg** configured
in Settings. Neither FFmpeg nor broadcast recordings are bundled. In this environment
the actual radio decoder/continuity tests used a local generated test broadcast;
public station playback and physical audio output still need testing on your PC.

## Harbor exploration

**Explore → New Haven Harbor → Locate installed region → Descend & explore.**
Choose a target in the marine side panel. **Waypoint marker** toggles a non-colliding
world-space beam/label; **Voyage history…** shows saved first arrivals. The marker is
hidden outside walking/sailing/swimming or beyond 1.5 km. These are authored gameplay
targets, not real navigation aids. Guidance uses the actor's actual forward basis;
ETA appears only when making progress toward the target.

Visited targets and the selected target are saved per region in the existing local
profile. Revisiting an already recorded target does not duplicate history. Region
rebasing does not move the geographic target. Profile saves remain owned by the host,
not by marine simulation nodes.

| Action | Control |
|---|---|
| Walk / swim / skiff movement | W / A / S / D |
| Board nearby skiff / release mooring | V |
| Moor / step ashore / ladder / nearby reboard | E |
| Enter water | G |
| Dive / surface | Ctrl / Space |
| Release controls / return to orbit | Esc / R |
| Expand view / radio search | F2 / Ctrl+K |

The existing geographic water masks, shoreline/hull guards, tide model, buoyancy,
swimming and marine assets are unchanged. Modeled tide and seabed are not survey or
navigation data. Historical physics/art/region evidence remains historical.

## Verification and development boundary

See [current handoff](docs/M2_12_DEV_HANDOFF.md),
[current validation](docs/M2_12_VALIDATION.json), and
[station provenance and playback boundaries](docs/M2_12_RADIO_SOURCES.md).
`SOURCE_MANIFEST.json` describes this cumulative source; it excludes only itself.

Linux Godot software-rendered tests are not Windows/RTX 3060 performance, physical
controller, real broadcast availability or human-heard audio certification. No new
Windows EXE/PCK was built. The optional Cesium dependency remains uninstalled.
The repository's web application is not modified by this native milestone.

Previous M2.10R instructions and build information are archived in `docs/history/`.
