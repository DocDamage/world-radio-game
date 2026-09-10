# TerraWave improvement plan

Prepared September 9, 2026, from a source review of the app, services, and all existing mini games.

**Product direction:** make TerraWave a dependable world radio player with a rewarding travel adventure around it. The central loop should be: discover a place → listen → explore → complete a local activity → collect a memory → choose the next destination.

**Scope:** improve the existing app and all 11 game/activity experiences, and add the OSIRIS-inspired world-monitoring and research capabilities described in sections 8–13. Complete the existing game upgrades before proposing additional standalone games. This is a plan, not an implementation. Visual quality, live stream availability, and gameplay feel still need browser and device playtesting.

**Expanded scope requested by the user:** retain every original improvement in sections 1–7 and plan functional coverage of the capabilities identified at [osirisai.live](https://osirisai.live/), its documentation, and its linked repository. The expansion is additive; the original effort estimates cover only the original app work.

**Gamification extension requested by the user:** turn the new map, data, and research capabilities into missions inside the existing mini games. Sections 14–17 define the mission system, game-specific mechanics, connected expeditions, rewards, and implementation gates. These extend section 11 beyond contextual overlays into playable objectives.

**CCTV emphasis requested by the user:** section 18 makes public camera viewing, a camera wall, and camera-driven missions a first-class part of the app and existing games. It expands O09 and the photography/Detective mission designs.

## 1. Current baseline and confirmed priorities

- `npm run build` passes. It emits a 2,425.45 kB JavaScript bundle (680.61 kB gzip) and a large-chunk warning. All game components are eagerly imported by `App.tsx`.
- `npm run lint` exits successfully but reports 26 warnings, including stale effect/callback dependencies in playback, the globe, and game loops. The project has no test script.
- Global shortcuts in `App.tsx` remain active alongside street/game listeners: W changes mode, S changes station, Space toggles playback, and arrows change station. These overlap movement and game controls.
- Saved favorites, passport, backpack, and scores are parsed without recovery or schema migration. Purchases, sales, inventory, and coin changes are separate operations.
- Bicycle rewards are paid on exit, while restart clears the run's coins. Boating's loop captures `dockedSuccessfully` with an effect depending only on `isOpen`, creating a repeated docking-reward risk. Signal Hunt adds score on every step within the success radius.
- Detective's initial clue explicitly includes the target city or country. Mystery isolation must also cover the radio player, globe, guide, and other location surfaces.
- Photo Snap assigns a random 80–98 composition score and stores metadata without `photoUrl`. It does not save the pictured scene.
- Geography matching uses substring matches across city and country. For example, the Venice rule includes `italy`, and the Paris rule includes `france`, so unrelated cities can inherit those waterways.
- The recorder depends on `/stream-proxy`, implemented only by Vite's development-server middleware. A static production build does not supply that endpoint.
- The performance overlay multiplies measured animation-frame frequency by a configuration value. That displayed number is not a measurement of generated frames. Replace unsupported rendering claims with actual implemented settings and measurements.
- The station snapshot is approximately 11 MB and places approximately 2.26 MB before transfer compression. Initial globe stations come from the first 250 eligible records rather than a deliberately global selection.

## 2. Delivery sequence

Estimates are rough engineering effort for one developer, including targeted verification; they are not calendar commitments. Re-estimate after the first browser audit. Provider integration and original artwork may add time.

| Phase | Scope | Effort | Exit condition |
| --- | --- | --- | --- |
| 1 — Reliable foundation | Input ownership, game lifecycle/rewards, persistence, playback states, critical hook fixes, honest feature labels | 5–8 days | Controls cannot affect background modes; a result pays exactly once; corrupt saves recover; playback failure is explained |
| 2 — Coherent app experience | Responsive navigation, accessible dialogs, station discovery, location model, street fallback, performance work | 7–10 days | Complete discover/listen/play/return journey on desktop and phone; accurate selected-city context |
| 3 — Shared game framework and first upgrades | Common game shell; Detective, Signal Hunt, bicycle, boating, fishing | 8–12 days | Five games have fair objectives, repeatable scoring, complete results, and verified input support |
| 4 — Remaining game upgrades | DJ, cooking, photography, buggy, skiing, surfing | 10–15 days | Every activity meets the common game quality checklist |
| 5 — Progression and release | Passport missions, collections, economy tuning, guide polish, deployment checks, device playtests | 5–8 days | A complete travel loop works in production, with useful diagnostics and no outstanding critical defects |

Each phase should be delivered as small reviewable changes. Geography must be corrected before adding local missions; reliable result settlement must precede economy tuning; a supported image source must precede real photo capture.

## 3. Improve the whole app

**Navigation and visual design**

- Make Explore, Activities, and Passport the primary destinations. Keep a compact radio player available throughout; place recording, guide, graphics, and less frequent controls in a secondary menu.
- Add a short first-use journey: choose a city, play a station, try one activity. Provide a skip option and contextual control hints afterward.
- Use one visual system for typography, spacing, buttons, panels, status colors, and dialogs. Give activities distinct scenery and accent colors within that system.
- On phones, use bottom sheets, safe-area-aware controls, scrollable activity lists, readable text, and layouts that work in portrait and landscape. Check 360 px width and 200% zoom.
- Give dialogs initial focus, contained keyboard navigation, Escape handling, and restored focus. Label icon controls and provide visible focus indicators, following the [W3C modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
- Add separate radio/effects volume, reduced motion, reduced flashes, adjustable screen shake, and visual equivalents for sound-only cues.

**Radio and discovery**

- Make the audio element's events drive loading, playing, paused, buffering, and failure states. Distinguish a blocked play request from an unavailable stream; provide retry and another-station actions.
- Prevent rapid station changes from leaving old callbacks or metadata active. Make media-session play and pause explicit actions. Persist volume and last station.
- Add country/language/genre filters where metadata supports them, recently played stations, favorites management, and geographically diverse discovery.
- Use city clusters or level-of-detail points on the globe, plus a usable station-list fallback when WebGL fails. Keep location selection and current audio selection explicit and synchronized.
- Validate station metadata, coordinate ranges, missing coordinates, and URLs. Zero latitude or longitude is valid and must not be rejected as missing. Escape station text used in globe HTML labels.
- Replace full-list repeated work with indexed search and cached in-flight data loads. Prevent stale searches from replacing newer results. Publish snapshot source and refresh dates.

**Street exploration and local content**

- Replace country substring rules with exact place identifiers, qualified aliases, and explicit activity capabilities. A city can support both urban activities and river activities; one biome need not determine everything.
- Use one resolved location object for city name, country, coordinates, scenery, fish, market items, and activities. Avoid mixing selected-place labels with active-station coordinates.
- Curate and verify an initial set of representative cities; use modest generic descriptions when local information is unknown.
- Audit the current panorama embed and coordinate-stepping behavior. Use supported navigation where available, clear loading/unavailable states, and a map or external-view fallback where it is not.
- Let users launch local activities from the city panel as well as street mode. Activities should remain usable when imagery is unavailable.

**Architecture, performance, and saved progress**

- Split `App.tsx` responsibilities into playback, location, navigation, game sessions, and persistent traveler state. Use a shared activity registry for availability, controls, records, and launch behavior.
- Load the globe and individual games on demand, with loading and failure fallbacks. [React lazy loading](https://react.dev/reference/react/lazy) supports deferring a component until its first render.
- Keep simulation state outside per-frame React updates; refresh visible HUD values only when needed. Pause inactive simulations and dispose loops, timers, listeners, and audio nodes on exit.
- Pause active games when the document becomes hidden and require a controlled resume; use the [Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API). Let radio continue according to the listener's playback preference.
- Replace simulated performance indicators with measured frame time/FPS and working quality controls for resolution, particles, effects, and globe detail. Store textures locally where redistribution permits.
- Add versioned, validated save data, safe defaults, migrations, storage-failure handling, and export/import. Store photo blobs separately from small settings and records.
- Process purchase, sale, item creation, and reward settlement through a single validated state transition. Derive sale values from owned items and reject duplicate settlement IDs.

**Guide, recording, and production readiness**

- Make the guide optional, cancellable, and grounded in the selected location. Distinguish generated descriptions from verified local facts, and keep useful curated fallback content.
- Verify the configured AI model at implementation time. Avoid retaining a personal API key in local storage by default; for a hosted service, use server-held credentials with request limits and clear usage feedback.
- Either provide a production recording endpoint or hide unavailable recording controls with an explanation. Bind recordings to the station at start, handle stream termination, cap memory/duration, and use the actual supported output format.
- If deploying a stream proxy, restrict destinations and protocols, block private-network access including redirects, set timeouts, and cancel upstream requests on disconnect. The existing arbitrary-URL development proxy needs redesign before public exposure.
- Add error boundaries and useful diagnostics for stream failures, asset errors, failed saves, and game crashes. Exclude keys, recordings, and unnecessary personal data from diagnostics.
- Update README and interface claims to match implemented behavior, including photo capture, scratching, graphics settings, platform support, and production recording.

## 4. Common quality bar for every mini game

- A clear objective, short playable tutorial, visible controls, and practice/standard/challenge options where appropriate.
- Consistent ready → playing → paused → results transitions, plus restart and exit. Define and show what happens to earned rewards when restarting or quitting.
- One active input context; reliable keyboard, pointer/touch, and controller support. Handle lost focus, pointer cancellation, and controller disconnection without stuck movement.
- Time-based simulation with bounded update steps. Difficulty, hazards, and rewards must not depend on display refresh rate.
- Clear success and failure feedback, readable hazards, fair recovery windows, and a results panel explaining score, rewards, personal best, and the next objective.
- Every finished round settles once. Reopening, rapid clicking, restarting, and revisiting results cannot duplicate rewards or erase settled earnings.
- Location changes scenery and verified content; personal bests are separated when rules, difficulty, or courses are not comparable.
- Prefer 1–3 minute standard rounds with optional free play. Test the duration rather than forcing it onto every activity.

## 5. Specific mini-game upgrades

| Game/activity | First fixes | Gameplay improvements |
| --- | --- | --- |
| Bicycle Grand Prix | Isolate steering/pedaling keys; settle rewards before restart; fix stale near-miss state; replace finish-distance-only records with meaningful performance metrics | Add time trials, readable traffic intent, cadence coaching, course variety, checkpoint splits, and medals for time plus clean riding. Keep drafting as an optional skill. |
| Boating | Award each dock once; add collision contact/cooldown handling; make retry/reset reliable | Build short delivery, salvage, and precision-docking missions. Show the next buoy/gate and score heading, approach speed, damage, and completion time. Vary current and channel width by difficulty. |
| Fishing | Stabilize catch callbacks and session state; ensure catches and trophies are committed once | Make cast position, depth, bait, and visible fish behavior influence bites instead of only a timer/random fish pick. Add distinct species fight patterns, a readable bite window, a catch journal, and release/keep choices. |
| Rooftop DJ | Stop rewarding rapid pad spam as rhythm accuracy; prevent pad keys triggering global actions; provide touch scratching | Separate free jam from scored rhythm challenges. Add a beat clock, tap tempo, timing windows, distinct drum voices, pattern lessons, and real filter routing. Use synthesized or cleared samples for scratching; only claim live-stream scrubbing if an actual supported buffer exists. |
| Street Chef | Fix feedback that reports +20 when a step can award +10; stop cooking timers while closed; define ingredient costs and cancellation | Give sear, toss, and season distinct actions. Add a few recipes with different timing patterns, order goals, recipe mastery, and clear quality-to-value results. |
| Photo Snap | Replace random composition scores; make clear that current inventory entries contain metadata, not captured images | Choose a supported, permitted capturable image source or render an original postcard scene. Add composition briefs, actual framing/zoom, a retained image with location/filter metadata, an album, and export. Do not attempt to read pixels from the cross-origin panorama iframe. |
| Desert Buggy | Adopt shared controls, pause/results, and once-only rewards; verify all run state resets | Build checkpoint rallies with readable dune ramps, meaningful nitro/fuel tradeoffs, route choices, landing feedback, and recovery after crashes. Track finish time and clean landings. |
| Alpine Downhill | Fix lifecycle/high-score closure warnings; verify clean restarts and consistent collision behavior | Add slalom gates, jump timing, carve control, clear slope boundaries, missed-gate penalties, course grades, and a ghost of the player's best run. |
| Surfing | Standardize session rewards, retry behavior, and accessible controls | Teach takeoff, carving, tube positioning, and landing in stages. Make the wave's safe zone and closing lip readable; score varied tricks, controlled landings, and sustained tube rides. Offer a practice wave. |
| Signal Hunt | Award success only on the transition to found; wrap bearings correctly near 0/360 degrees; stop hidden animation work | Add a short antenna tutorial, meaningful triangulation from different recorded positions, a map trail, adjustable signal noise, and points for efficient movement/hints used. Provide visual signal cues. |
| Radio Detective | Remove answer names from initial clues and all pre-reveal UI; prevent repeat scoring; synchronize local and parent round state | Add multi-round expeditions, a usable guess map with a keyboard alternative, progressive clue costs, difficulty tiers, and explanations of distance scoring. Replace broad country stereotypes with vetted clues and handle unavailable audio without penalizing the player. |

## 6. Connect the games to a satisfying travel loop

- Expand the passport into a travel journal: places listened to, games completed, local dishes, photo memories, and personal records.
- Add a small set of authored journeys, such as a three-city river trip combining listening, boating, and photography. Give every activity a useful role without requiring all activities to enjoy radio.
- Award stamps for defined milestones; separate discovering a station from actually listening to it. Explain the requirement in the UI.
- Balance rewards by typical round duration and difficulty. Fix unlimited photo-sale and pad-spam earning before tuning prices. Reward mastery and exploration, with optional cosmetic spending goals.
- Add collection sets and local badges. Prefer optional daily challenges and personal bests; defer public leaderboards and account sync until local rules and persistence are dependable.

## 7. Verification and release gates

1. **Regression tests:** input ownership, duplicate docking/round rewards, bicycle restart earnings, sale of an already sold item, malformed saves, zero-coordinate locations, country-rule misclassification, and Detective answer leaks.
2. **Game logic tests:** seeded scenarios for collision/recovery, scoring, difficulty, and state transitions at 30/60/120 Hz. Keep rendering separate enough to test meaningful outcomes.
3. **Browser journeys:** load → search → play → favorite → launch activity → finish → receive reward → inspect passport/backpack → reload. Exercise slow/offline streams, rapid switching, denied playback, missing imagery, hidden tabs, and storage failures.
4. **Device/accessibility playtests:** desktop keyboard/mouse, a real controller, phone touch in both orientations, keyboard-only dialogs, reduced motion, and screen-reader-readable instructions/results. Include Chromium, Firefox, and WebKit/Safari in the release matrix.
5. **Performance:** record startup and frame-time baselines on named devices. Initial targets: standard play around 60 FPS on the reference desktop and at least 30 FPS on the reference phone; no inactive game loops; no game downloads before launch/prefetch; responsive search after data is available. Adjust numerical budgets from measured baselines.
6. **Production:** run the built deployment, not only Vite dev. Check recording capability, station and texture loading, navigation, save recovery, and clear error handling. Require build/lint checks and critical regression tests in CI.

**First implementation slice:** input ownership + a shared game-session/result model + reward regression tests, demonstrated in bicycle and boating. This removes immediate usability and economy problems and establishes the pattern for the remaining games.

## 8. OSIRIS expansion: feasibility and evidence

**Assessment:** most identified capabilities are feasible in TerraWave through a combination of reusable open-source code, our own services, and licensed/public data providers. Full parity is a substantial product expansion, not a front-end embed. Complete global coverage, continuous live data, universal device control, and every advertised tool working without credentials cannot be promised from this review.

The [OSIRIS repository](https://github.com/simplifaisoul/osiris) is public. Its [MIT license](https://github.com/simplifaisoul/osiris/blob/master/LICENSE) allows software reuse subject to retaining the required notices. Plan to audit and selectively reuse useful modules. Review upstream data, imagery, media, and dependency terms separately; a software license does not establish access to every service it calls.

**Evidence reviewed on September 9, 2026:**

- **UI:** inspected the loaded dashboard's layer menus, recon toolkit, markets, alerts, drawing, routing, ArcGIS, remote, space-video, search, and style panels. A visible control confirms a product surface, not the correctness of its implementation or data.
- **Docs:** read the [published documentation](https://osirisai.live/docs) in the browser. It advertises 57 endpoints and covers additional functions absent from the initial menus, including region dossiers, graphs, imagery, air quality, AI, ingestion, and webhooks. Endpoint responses were not exhaustively tested.
- **Repository:** reviewed the public README and license, not a complete code audit. The README identifies some maritime and conflict data as static, while the dashboard emphasizes live monitoring. The README, documentation, and UI also differ in counts and shortcuts. Reconcile these differences against a pinned source revision before integration.
- **Availability:** a fresh homepage request returned a 502 during review; an already loaded dashboard remained available, and the docs subsequently loaded in the browser. Treat third-party outages as an expected integration case.
- **Unverified controls:** Ghost Protocol was visible but its behavior was not established. The remote panel described Bluetooth functions and displayed a device-acquisition interface; no devices were scanned, paired, or controlled. No recon scans, identity searches, AI requests, or external writes were executed.

Use the source links in the following coverage tables as discovery evidence. All TerraWave behavior, priorities, delivery criteria, and integration proposals are our plan, not claims that OSIRIS already implements them exactly this way.

## 9. Capability coverage and implementation backlog

Status notation: **UI** = interface observed; **Docs** = documented, not end-to-end verified; **Repo** = described in repository README; **Unverified** = name observed but behavior unresolved. Each ID must become a tracked implementation or discovery ticket. Features requiring credentials/hardware remain in scope with explicit prerequisites, rather than silently disappearing.

### 9.1 World map, environment, and media

| ID | Capability and evidence | TerraWave implementation target | Dependencies / completion criteria |
| --- | --- | --- | --- |
| O01 | 2D/3D views, imagery, terrain/buildings, day/night, map controls — UI | Add an optional World Monitor workspace with synchronized city selection, map/globe switching, satellite basemap, time-of-day lighting, terrain, scale, coordinates, and place lookup. | Prototype MapLibre alongside the existing globe; decide on consolidation from measured performance and capability coverage. Terrain and imagery require appropriate providers. Preserve radio playback during view changes. |
| O02 | Layer groups, counts, status, shortcuts, fullscreen, shared view — UI/Docs | Provide searchable layer controls, legends, opacity, enabled counts, data timestamps, presets, and shareable camera/layer state. | Counts reflect loaded observations; connection health and data age are separate. Shared URLs exclude private research, exact personal location, and credentials. |
| O03 | Aviation classes — UI/Docs | Plot aircraft with supported commercial/private/jet/government/military classifications, track details and trails, filters, and nearby-station discovery. | Display source/last observation; allow unknown classification. Public coverage may be incomplete or delayed. Never infer ownership or intent from a class label. |
| O04 | Maritime positions, ports, chokepoints, maritime lines — UI/Docs/Repo | Add vessels where a real feed is available, port/place cards, shipping routes, reference chokepoints, and layer filters. | Clearly distinguish static routes/ports from measured vessel positions. A static maritime dataset alone does not complete live-vessel tracking. |
| O05 | Orbital tracking and categories — UI/Docs | Show communications, navigation, Earth-observation, science/station/telescope, and other publicly cataloged satellite groups, with orbit trails and details. | Separate calculated orbital positions from measured telemetry; show orbital-element epoch and stale-data handling. Source coverage determines available classifications. |
| O06 | Space video and solar conditions — UI/Docs | Add switchable ISS/Earth camera views and a space-weather panel, with explanations relevant to radio propagation. | Use permitted embeds and actual provider availability. Video never silently replaces radio audio; show source and observation time. |
| O07 | Earthquakes, fire detections, severe natural events — UI/Docs | Filter by time, event type, magnitude/severity, and map region; open source-linked event cards. | Ingest USGS/NASA or equivalent supported feeds. Preserve geometry and event/update times; distinguish fire detections from confirmed fire perimeters. |
| O08 | Air quality, GPS interference, Earth imagery — Docs | Add air-quality station observations, attributed navigation-disruption reports, and satellite-scene discovery with date/cloud/coverage metadata where supplied. | Audit each documented upstream and select a supported provider. Do not present sparse stations as full geographic coverage or old imagery as live video. |
| O09 | Public cameras and preview/status tools — UI/Docs | Add discoverable public transport/tourism cameras, preview cards, availability checks, source links, and optional favorites. | Use owner-published, permitted feeds. Implement camera/tile proxies only for approved sources. Embedding access does not automatically permit capturing or exporting frames. |
| O10 | Live news broadcasts, news aggregation, public-channel posts — UI/Docs/Repo | Add a news/video directory and regional feed combining selected broadcast, RSS, and permitted public-channel sources. | Preserve source URLs and publication times; deduplicate and filter channel administration/spam posts. Geocoding must carry uncertainty, especially for ambiguous places. |
| O11 | Incidents, conflicts/frontlines, geopolitical events, country risk — UI/Docs | Add opt-in contextual layers with date filters, region summaries, source references, and explanations of any computed indicators. | Separate source reporting, historical/static geometry, and inferred scores. Validate location/date before mapping; a risk score is not an authoritative travel decision. |
| O12 | Infrastructure and geospatial catalog — UI/Docs | Search public ArcGIS items and supported feature services; import permitted pipelines, power, emergency, facility, cable, and other reference layers into a managed catalog. | Source license/attribution, pagination, coordinate systems, geometry limits, and access requirements travel with each layer. Cable data appeared in the loaded view URL; verify its source and visible behavior in the audit. |

Discovery sources: [dashboard](https://osirisai.live/), [map/interface guide](https://osirisai.live/docs#interface), [aviation/space](https://osirisai.live/docs#api-aviation-space), [environment](https://osirisai.live/docs#api-earth), [media](https://osirisai.live/docs#api-media-markets), and [infrastructure](https://osirisai.live/docs#api-surveillance).

### 9.2 Research, analysis, customization, and integrations

| ID | Capability and evidence | TerraWave implementation target | Dependencies / completion criteria |
| --- | --- | --- | --- |
| O13 | Live alert feed and AI overview — UI/Docs | Provide region/type/source/time filters, expandable original reports, a deduplicated timeline, and opt-in watch areas. | Show stale/offline states and provenance. Local in-app alerts first; notification subscriptions require a separately implemented delivery service. |
| O14 | Regional dossier and AI briefings/correlation — Docs | Let a map selection produce a structured place briefing combining stations, environment, public events, and selected layers. Support short overviews and longer sourced summaries. | Ground output only in supplied records; cite underlying observations and label AI conclusions. Limit cost, duration, context size, and retries. Give an ordinary data summary when AI is unavailable. |
| O15 | Entity relationship graph — Docs | Explore relationships among public entities, datasets, places, domains, and events; expand nodes on demand and trace each edge to a source. | Typed IDs, evidence timestamps, graph size limits, and permission-aware expansion. Co-location or similar names alone must not create asserted relationships. |
| O16 | Markets, charts, ticker, AI overview — UI/Docs | Add optional indices, sector equities including defense/energy, commodities, crypto, and FX panels, instrument charts, session state, and sourced summaries. | Choose licensed data with explicit delay and redistribution status. Quotes are informational; financial assets remain separate from Traveler Coins and game rewards. |
| O17 | Drawing/measurement — UI | Add polygons, rectangles, circles, and paths with area/perimeter/distance, contained-entity summaries, saved annotations, and export. | Geodesic calculations, units, undo/edit/delete, date-line handling, and keyboard alternatives. Private annotations stay out of public shared URLs by default. |
| O18 | Directions and location search — UI | Add address/place/coordinate search, driving/walking/cycling routes, multiple stops, route options, and step instructions. | Supported geocoding/routing providers and an optional explicit geolocation action. Distinguish the user's real position from the virtual traveler position; activity movement never requests device location. |
| O19 | Recon and lookup toolkit — UI/Docs/Repo | Add a separate Research workspace covering the tool families below, with structured results, sources, timestamps, and clear capability status. | Passive lookups and active checks have distinct adapters. Active scans run only against authorized assets through a separately secured worker, not arbitrary requests from the public web tier. |
| O20 | CVE, malware, and attack-intelligence feeds — UI/Docs | Add a vulnerability news panel, searchable CVE cards, and aggregate public threat observations with optional map views. | A report's IP location is approximate and does not identify an attacker. Do not visit or execute malware URLs; render indicators as inert data. |
| O21 | Wallet and sanctions lookups — UI/Repo/Docs | Add public BTC/ETH transaction exploration and source-linked sanctions-list search/candidate matches for applicable entities. | A matching string is a possible match, not a conclusive identity finding. Preserve list version and identifiers; public wallet activity does not establish a person's identity. No custody or trading integration is required. |
| O22 | Supply-chain reference data — Docs | Add supplier entities, source-defined criticality attributes, map filters, and evidence links into the graph. | Verify whether the source is maintained or illustrative; label reference dates and avoid inventing real-time operational status. |
| O23 | Style editor and theme sharing — UI | Add theme presets, editable semantic colors, layer colors, fonts, panel opacity, borders, blur, radius, motion, and optional visual effects; import/export validated theme JSON. | Preserve contrast and semantic distinctions; reduced-motion settings take precedence. Scope styles so game readability remains intact. Reset and preview must work without losing saved layouts. |
| O24 | Bluetooth remote / device panel — UI, operation unverified | Plan an experimental panel for explicitly paired, user-owned, supported devices, with capabilities, connection state, disconnect, and minimal local diagnostics. | First build a hardware/browser compatibility proof. Web Bluetooth alone cannot control arbitrary TVs, speakers, or AC units; some require manufacturer protocols or a local companion. Do not collect nearby-device inventories or GPS tags automatically. |
| O25 | Ghost Protocol — Unverified | Create a discovery ticket to identify the actual behavior in a pinned source revision and document a concrete TerraWave equivalent if useful. | No claim of anonymity, network protection, or stealth based on a button label. Complete only when behavior, requirements, and tests are understood; keep this row visibly unresolved until then. |
| O26 | SDK input/output — UI/Docs | Add a documented entity-ingestion adapter, schema validation, namespace ownership, ingest status/history, and an authenticated event stream for custom layers. Evaluate compatibility with the documented Polybolos format. | Key rotation, payload/rate limits, scoped access, deduplication, deletion/expiry, and reconnect tests. Ingestion is disabled until configured. |
| O27 | GitHub webhook integration — Docs | Accept configured repository events as an optional activity/research feed and link them to relevant public project entities. | Verify signatures, protect against replay, scope allowed repositories/events, and exclude secrets or unnecessary payload fields. |
| O28 | System API, documentation, self-hosting — Docs/Repo | Provide health/data-status endpoints, aggregate counts, API reference/examples, container deployment, configuration guidance, and upstream attribution. | Record the exact reused revision, dependency notices, contract tests, and deployment requirements. Offer a usable core app when optional integrations are unconfigured. |
| O29 | About/community/support links — UI/Repo | Maintain TerraWave-specific About, source, feedback, acknowledgments, and optional support links. | Reuse functional ideas and properly licensed code; retain TerraWave's identity and do not import OSIRIS token promotions or imply affiliation. |

Discovery sources: [OSIRIS interface](https://osirisai.live/), [geopolitical/dossier docs](https://osirisai.live/docs#api-geopolitical), [toolkit docs](https://osirisai.live/docs#api-osint), [cyber feeds](https://osirisai.live/docs#api-cyber), [graphs](https://osirisai.live/docs#api-graph), [AI](https://osirisai.live/docs#api-ai), [SDK](https://osirisai.live/docs#api-sdk), [webhooks](https://osirisai.live/docs#api-webhooks), and [repository](https://github.com/simplifaisoul/osiris).

### 9.3 Recon toolkit completeness checklist

The visible panel advertises 20 tools, while the docs and README expose additional functions and different naming. Track coverage by actual capability rather than assuming the advertised count is definitive. These are planned implementations, not permission to run investigations or scans during development.

| Family | Functions to cover | Implementation boundary |
| --- | --- | --- |
| Address/network context | IP geolocation, ASN/BGP prefixes and peering, hardware vendor/OUI lookup, user-requested self-location | Explain approximate location and source age; self-location remains explicit and optional. |
| Domain discovery | DNS records, WHOIS/RDAP registration, certificate transparency, passive subdomain discovery | Source-specific caches and result provenance; handle redacted or unavailable registration records. |
| Website diagnostics | TLS/certificate inspection, security headers, technology detection | Bounded requests to authorized sites, with redirect/private-network protections. Distinguish observation from vulnerability confirmation. |
| Asset exposure | Shodan records, CVE lookup, exposure/vulnerability summaries, port/service checks, range sweeps | Passive provider results by default; active scans require an authorized target set, job limits, cancellation, audit records, and an isolated worker. Verify service availability before exposing scan controls. |
| Public profiles | Username availability/public profile links, GitHub metadata, phone format/region/carrier where provided | Avoid claiming same-name accounts are the same person. Restrict personal-data enrichment to legitimate, consented use; do not expose private contacts. |
| Breach/compromise checks | Breach-exposure and infostealer-exposure indicators | Verified self/organization scope and permitted provider access; return exposure status and remediation links, never stolen credentials or breach contents. |
| Reputation | Indicator reputation and public threat-feed enrichment | Show evidence and uncertainty; never execute or automatically navigate to returned hostile indicators. |
| Financial/public lists | Public blockchain history, address links, sanctions-list search and candidate matches | Preserve provenance, dates, and false-positive handling; no unsupported real-person attribution. |

A separate audit task must inventory current source routes and menu handlers, including documentation-only or UI-only functions, and map every discovered capability to O01–O29 or a new ticket. This is the gate for calling the expansion feature-complete; unverified labels do not count as implemented features.

## 10. Architecture and data sourcing for the expanded app

**Keep one product with distinct workspaces:** Explore/Radio, Activities, Passport, World Monitor, and Research. The player stays available; games own their input while active. Optional monitoring/research panels do not load during ordinary radio listening. A selected place connects the workspaces, while private research state and device location remain separate.

**Recommended integration approach:**

1. Pin and inspect an OSIRIS source revision, dependency tree, adapters, tests, and notices. Build a behavior/endpoint coverage report before importing code. Verify code against docs, especially static data, scanner configuration, AI credentials, and currently unused environment variables.
2. Retain TerraWave's React/Vite shell initially. Prototype a lazily loaded map workspace using [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/), which provides a WebGL map engine and map-layer APIs. Evaluate whether one renderer can eventually cover the current globe and new layer needs without losing the existing experience.
3. Add a deployable server API and background workers. Either adapt audited OSIRIS routes into that service or self-host a pinned OSIRIS service behind a TerraWave adapter. Compare operational cost and maintenance effort before choosing. Do not couple production availability exclusively to the public demo hostname.
4. Normalize observations into a typed envelope: source, entity ID/type, geometry, event/observation time, fetch time, expiry, evidence URL, attribution/license, uncertainty, and data mode (live observation, delayed, reference, estimated, simulated). Keep provider-specific fields without pretending all sources have the same quality.
5. Introduce a layer registry with prerequisites, fetch bounds, clustering/detail rules, refresh policy, legend, status, and memory limits. Use viewport queries, shared caches, request cancellation, backoff, and provider-aware refresh intervals. Stop disabled-layer work.
6. Stream only changing data when a source supports it; use reconnect snapshots and stable IDs. Keep SDK ingest, active scanning, hardware connections, and webhook execution isolated from public read-only feeds.
7. Store user annotations, saved views, graph notes, watch areas, and optional account data separately from transient feed caches and game saves. Define retention/export/deletion; do not put growing telemetry or media into localStorage.
8. Make credentials server-side and scoped. Give integrations explicit states: available, needs configuration, unsupported on this device, stale, unavailable. Show a fallback without fake entities or invented live status.

**Candidate provider checks completed for this plan; final selection remains an implementation task:**

| Data/function | Candidate and verified basis | Planning consequence |
| --- | --- | --- |
| Aircraft | [OpenSky API](https://openskynetwork.github.io/opensky-api/rest.html) documents state vectors, bounding-box queries, authentication, and quotas. | Budget requests by map extent; keep OAuth credentials server-side and verify applicable usage terms. |
| Vessel observations | [AIS Stream](https://aisstream.io/) documents maritime events over WebSocket. | Evaluate coverage, connection/key requirements, redistribution rights, and cost before promising continuous worldwide vessel tracking. |
| Earthquakes | [USGS GeoJSON feeds](https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php) expose event geometry and metadata. | Good first real-data integration for the shared layer model and event detail panel. |
| Fires and natural events | [NASA FIRMS API](https://firms.modaps.eosdis.nasa.gov/api/) and [NASA EONET v3](https://eonet.gsfc.nasa.gov/docs/v3) provide distinct fire/event products. | Handle per-product access and observation semantics. Add a separate forecast provider if gameplay needs forecast wind, temperature, or ocean conditions. |
| Solar conditions | [NOAA space-weather products](https://www.spaceweather.gov/products-and-data) publish observations and related products. | Useful for optional radio education and map context; label measurement/forecast times correctly. |
| Public GIS catalog | [ArcGIS search API](https://developers.arcgis.com/rest/users-groups-and-items/search/) supports catalog item search. | Catalog discovery and permission to query/reuse each resulting service are separate checks. |
| Local devices | [Web Bluetooth](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API) supports Bluetooth Low Energy interaction with browser/security limitations. | Device protocols and actual supported-browser tests are prerequisites; provide an unsupported state instead of a universal remote claim. |

For each additional provider (orbital elements, imagery, cameras, routing, forecasts, news, market history, threat data, identity exposure, sanctions, and AI), record credentials, cost at anticipated usage, attribution, allowed caching/redistribution, retention, coverage, latency, and fallback. Public availability is not a guarantee of unrestricted production use. Estimate usage at 100, 1,000, and 10,000 daily active users before committing to a hosting/data budget.

## 11. Connect new capabilities to the existing mini games

This section establishes the data connections. Sections 14–17 specify how players use those connections through choices, challenges, and rewards in the existing games.

These are extensions of the original game plan, not prerequisites for basic play. Live feeds must never determine whether a player can finish a round. Freeze any optional environmental input at round start, record its source/time, and offer a clearly labeled generated practice scenario when unavailable.

| Existing experience | Useful connection to the expansion |
| --- | --- |
| Radio discovery and passport | Listen while viewing local public cameras, weather, air quality, or space video; save a sourced city memory or a visited-place summary. |
| Bicycle | Use selected public route geometry as inspiration for authored rides; show route distance/elevation where available. Keep game obstacles and physics authored and reproducible. |
| Boating | Launch port-themed missions from maritime cards. Use approved harbor/reference geometry; game vessels and hazards are explicitly simulated. |
| Fishing | Add optional environmental context such as local conditions and water type when verified; unavailable feeds fall back to balanced game presets. |
| Rooftop DJ | Add city-themed listening/jam collections and scene lighting. Use cleared audio for scored beat challenges. |
| Cooking | Link recipes to curated place stories and passport collections; use the location model rather than generating unsupported cultural facts from news data. |
| Photography | Offer licensed camera/imagery scenes or original map/postcard renders only when capture/export is allowed; retain source, date, and scene type. |
| Buggy and skiing | Let verified terrain inspire authored courses, with optional weather presets and comparable records separated by course/rules. |
| Surfing | Use a dedicated ocean-condition provider if real swell is added; atmospheric event feeds alone are insufficient. Keep practice waves deterministic. |
| Signal Hunt | Add map-measurement and bearing-trail tools; optional space-weather lessons explain radio concepts without asserting actual transmitter signal strength. |
| Radio Detective | Use dated, vetted imagery and geographic clues. Hide monitoring layers and dossier details that reveal the answer during a round. |

Do not award competitive points for real-world surveillance, locating private individuals/devices, or exploiting live incidents. Research tools and real event feeds serve exploration/context; gameplay uses authored goals and simulated scenarios.

## 12. Expanded delivery phases and effort

The original phases 1–5 remain intact. Run the expansion discovery early so foundational location/state decisions support future layers; avoid postponing the existing game fixes while building a second platform. Estimates below are additional person-days for one engineer, not elapsed commitments. Data procurement, device compatibility work, and a source audit can materially change them.

| Phase | Deliverable | Additional effort | Gate |
| --- | --- | --- | --- |
| 6 — Parity and reuse audit | Pin upstream source; reconcile all visible/documented features and routes; resolve Ghost Protocol; identify static/demo data; provider/license/cost worksheet | 3–5 days | Every discovered function maps to a backlog ID, feasibility status, and dependency; no unsupported promise of blanket parity |
| 7 — Monitor foundation | Shared layer model, API deployment, map prototype, legends/status, view sharing, themes, one USGS layer, source detail, player continuity | 8–12 days | Works in a built deployment with valid source/time/status and graceful provider failure |
| 8 — World exploration feeds | Aviation, maritime, orbital tracking, space media/weather, natural events, imagery/air quality, public cameras/news, routing, drawing, GIS imports | 15–25 days | Each chosen feed has contract tests, attribution, coverage/age indicators, quotas, and a demonstrated fallback |
| 9 — Research and analysis | Dossiers, graphs, market data, source-aware alerts, AI summaries, cyber feeds, permitted lookup toolkit, wallet/list checks, supplier data | 15–25 days | No unsupported relationships or ungrounded live claims; sensitive queries and active checks follow the defined scopes |
| 10 — Advanced integrations | SDK ingest/streaming, webhook support, isolated authorized scanner, supported-device remote proof and implementation | 10–20 days | Authentication/isolation/replay tests pass; remote behavior is demonstrated on a named device/browser; unavailable capabilities are explicit |
| 11 — Connected release | Game-context links, performance/device tests, deployment monitoring, docs, load/cost tests, source-reuse notices | 8–12 days | Original app and all released expansion modules pass the combined release checklist |

**Planning range:** approximately 59–99 additional engineering days for the identified expansion, subject to the audit and provider decisions. This is not a promise of full parity in that time, especially for undocumented tools or unsupported hardware. The original app plan adds approximately 35–53 engineering days. Re-estimate from working prototypes before setting a release date.

**First expansion slice:** a World Monitor tab with one real earthquake layer, a permitted public-camera example, a source/timestamp detail card, shared selected-city context, and uninterrupted radio. Use it to establish the architecture before bringing in numerous feeds. The original input/reward fixes remain the first overall implementation slice.

## 13. Expanded acceptance criteria and decisions

- [ ] Preserve every original game and app improvement in sections 1–7; no loss of favorites, scores, inventory, or passport data during schema changes.
- [ ] Complete the parity audit for O01–O29 plus any additional discovered functions. Track each as implemented/verified, dependency-blocked, unsupported with reason, or awaiting clarification of upstream behavior. Do not label the expansion fully complete while required capabilities remain unresolved.
- [ ] Audit reused code at a recorded commit and retain license notices. Verify service and content permissions independently from the code license.
- [ ] Verify actual API responses for every integrated capability; docs, a count, or an enabled checkbox alone do not demonstrate working data.
- [ ] Display data source, relevant times, coverage limits, and live/reference/estimated/simulated status in every layer and detail card.
- [ ] Exercise missing credentials, 401/403/429/5xx, malformed feeds, slow requests, empty coverage, stale snapshots, dropped streams, and partial provider outages. Demo-source failure must not break radio or games.
- [ ] Test map projections, coordinate units/order, poles/date-line geometries, layer filters, route measurements, and duplicate entity/event handling.
- [ ] Prove disabled layers and closed videos stop unnecessary work. Measure the combined radio/map/game workload on the same desktop/phone reference devices used in section 7.
- [ ] Test API quotas and egress costs under realistic concurrency; bound media previews, map queries, graph expansion, AI requests, and feed retention.
- [ ] Test imported GIS/theme data as untrusted input; restrict proxy destinations, enforce URL and payload validation, and protect server credentials.
- [ ] Keep research inputs, personal location, and paired-device details out of public links, general telemetry, game saves, and AI requests unless explicitly required and authorized.
- [ ] Test signed webhooks, scoped ingestion, replay/deduplication, worker isolation, and authorized scan boundaries before enabling them in production.
- [ ] Verify that a scan/device action cannot run just by opening a panel, and that cancellation/disconnect reliably stops work.
- [ ] Demonstrate permitted media embedding/capture behavior, radio/video audio priority, and unsupported-browser fallbacks.
- [ ] AI briefings must cite input evidence, distinguish uncertainty, and survive stale/conflicting data without fabricating current conditions.
- [ ] Publish a feature-status page that explains what is available locally, needs configuration, requires a provider plan, or works only on supported hardware.

**Implementation defaults:** preserve React/Vite until the map/backend prototype demonstrates a reason to change; selectively adapt audited open-source code; keep World Monitor and Research optional to load; prioritize reliable public-data features before advanced integrations. Provider subscriptions, production hosting budget, AI provider, and remote-device target models remain decisions for the implementation phase. No purchases or external deployments are implied by this planning update.

## 14. Gamification: a world expedition system inside the existing games

**Design goal:** a map layer should give the player a useful choice, an objective to pursue, or evidence to interpret. Opening panels and watching counters increase is not enough. Reuse the existing games as the action stages of a connected travel adventure.

**Player fantasy:** the traveler helps a fictional community radio network reconnect cities, organize local festivals, document places, and solve broadcast mysteries. Radio remains the soundtrack. Actual places and permitted environmental data can set the scene; characters, deliveries, hidden transmitters, cases, and mission outcomes are authored fiction.

**Core loop:** pick a city mission → inspect one or two useful clues → choose a route, tool, or approach → play an existing mini game → receive an explained result → add a memory to the passport → continue the expedition.

### 14.1 How a mission feels

1. **Discover:** a city card or World Monitor feature offers a relevant mission, such as a harbor delivery or a skyline photo brief. The Activities screen also lists all available missions, so navigating a complex map is optional.
2. **Prepare:** read a one-sentence objective, see the expected duration and rewards, and make one meaningful decision. Show at most two relevant data tools by default; advanced layers stay available outside scored play.
3. **Play:** the existing game receives mission parameters and adds objectives to its normal HUD. Keep the core controls familiar. New mechanics appear through a short tutorial or practice option.
4. **Debrief:** show what the player did, how their choice helped, which objectives were completed, medals earned, and coins/XP saved. Any factual learning card links to its source.
5. **Continue:** return to the same city/station, retry the same scenario, or take the next expedition leg. No reload or station reset is required.

**Mission card example:**

> HARBOR RADIO RUN · Boating · About 3 minutes  
> Deliver two transmitter crates before the evening broadcast.  
> Choose the sheltered channel or the shorter exposed crossing.  
> Earn up to 40 coins, navigation XP, and a harbor passport badge.  
> Practice or Start

The delivery is fictional. A small context label explains whether the harbor outline/conditions are based on a dated observation or a generated scenario; implementation details do not dominate the player flow.

### 14.2 Concrete missions for every existing mini game

All numerical targets below are initial playtest values. Beginner versions use wider tolerances, readable previews, and optional timing pressure. Main missions must be completable in roughly 1–3 minutes after a short briefing; longer variants are opt-in.

| Existing game | Mission and meaningful new mechanic | New capabilities used | Completion and scoring | Replay variant |
| --- | --- | --- | --- | --- |
| **Bicycle Grand Prix** | **Last-Mile Broadcast:** bring a fictional audio cartridge from a transit hub to three neighborhood checkpoints. Preview two simplified routes: a shorter climb or a longer flat road. The chosen route changes hill resistance, checkpoint order, and traffic rhythm. | O01 terrain, O03 airport context, O17 measurement, O18 routing, O08/O10 optional scene context | Finish the route with at least one delivery intact. Medal bonuses come from delivery quality, clean riding, and time; distance alone is insufficient. Explain the route tradeoff after the ride. | **Greenway Challenge:** pick a longer low-traffic route for a clean-ride target; use air-quality readings as contextual information only, not a real-world safety guarantee. |
| **Boating** | **Harbor Radio Run:** collect two fictional crates and deliver them to a dock. Read a traffic-lane diagram and choose a sheltered channel or shorter crossing. Simulated ferries follow visible schedules, so yielding can beat rushing. | O04 ports/routes, O07 supported conditions, O12 reference geometry, O17 channel measurement | Collect both crates and dock below the displayed approach-speed threshold. Score cargo condition, gate order, yielding, and docking angle. Pay each objective once. | **Buoy Survey:** follow a drawn route and stop in three marked areas long enough to take simulated measurements; precision matters more than speed. |
| **Fishing** | **River Field Journal:** inspect two habitat cards, choose a permitted casting area and bait, and catch one of the species in the curated local game catalog. Visible depth and a frozen condition preset change fish approach and fight patterns. | O07/O08 environment, O12 water geometry, O17 survey area, O14 place brief | Land or record-and-release the target species with controlled tension. Score cast placement, fight control, and journal completeness, not rarity alone. Release offers equivalent mission progress. | **Habitat Pair:** record two different species or depth zones over successive short rounds; a pity rule or deterministic spawn prevents endless random waiting. |
| **Rooftop DJ** | **Orbit-to-Rooftop Set:** perform a 60–90 second pattern built from a seeded, musically quantized orbital/space-weather theme. Choose between two pattern arrangements, cue drums on a beat grid, and time a transition to a displayed pass marker. | O05 orbital context, O06 space media/conditions, O02 timeline, O23 visual themes | Score hit timing, varied patterns, and smooth transitions. The pass animation follows the game clock; no player waits for an actual satellite pass. Cleared/synthesized samples carry the scored track. | **World Frequency Relay:** combine curated rhythm packs earned in three cities. Live radio can accompany free jam, while scored mode uses its own stable beat clock and mix. |
| **Street Chef** | **Broadcast Night Market:** choose ingredients for three fictional orders within a small in-game budget, then use the existing sear/toss/season actions. Compare cost against quality and ingredient availability before cooking. | O16 market-chart ideas, O22 supply chains, O14 curated place context, O10 fictional festival bulletin | Fulfill orders within budget and hit cooking-quality targets. Each order explains cost, quality, and payout. Use a generous practice budget and no real money. | **Supply Detour:** a fictional shipment changes ingredient availability; substitute one ingredient and adjust the preparation sequence. Real financial prices never directly determine food cost or profit. |
| **Photo Snap** | **City Correspondent:** receive three composition briefs, such as frame a bridge, capture a skyline silhouette, and show a transport landmark. Compare permitted reference imagery with a capturable licensed scene or an original rendered scene; adjust crop, horizon, and focal framing. | O09 cameras, O08 imagery, O01 daylight, O17 framing region, O10 story briefs | Score deterministic composition criteria against authored scene metadata. Save an actual exportable image where permitted plus its provenance. A generic unsupported panorama cannot be objectively scored as a recognized landmark. | **Then and Now:** compare two dated, licensed scenes and capture three pre-authored changes. This compares places/structures, not people or vehicles. |
| **Desert Buggy** | **Solar Relay Rally:** choose a route between three fictional relay towers using terrain and checkpoint maps. Decide where to spend a limited boost reserve, take marked dune jumps, and protect the carried battery from rough landings. | O01 terrain/daylight, O05/O06 space context, O08 imagery, O17/O18 route planning | Reach the final tower with enough charge and battery condition. Score checkpoints, landings, route efficiency, and remaining charge; an alternate route remains viable. | **Navigation Drift:** a clearly simulated instrument offset appears in a practice course. Use visible landmarks and map bearings to correct it; never imply the browser is measuring real GPS interference. |
| **Alpine Downhill** | **Mountain Broadcast Courier:** study a small slope map, choose a marked easy or technical course, and carry a fictional recorder through slalom checkpoints. The technical line offers optional gates and jump bonuses with clearer risk. | O01 terrain, O07 frozen weather preset, O08 scene imagery, O17 route/area tools | Complete the descent and deliver the recorder. Score gates, clean turns, stable landings, and optional checkpoints; falls use recoverable time penalties. | **Marker Inspection:** visit three fictional course markers on the descent. Environmental graphics are generated for play and do not represent current avalanche or rescue conditions. |
| **Surfing** | **Swell Window:** inspect a simplified wave-set preview, choose a launch window, then link a carve, a tube section, and a landing in the existing surfing game. The chosen window determines the seeded wave sequence. | O07 plus a dedicated ocean provider if available, O09 permitted beach imagery, O02 timeline | Complete a short style sequence. Score positioning, trick variety, and controlled exits rather than repeatedly triggering one trick. Cap extreme environmental inputs to a playable preset. | **Coastal Session:** three short waves with different objectives. A failed wave allows retry; missing ocean data uses an explicitly generated wave set with normal progression rewards. |
| **Signal Hunt** | **Find the Lost Relay:** take bearings at three virtual positions, draw lines or uncertainty sectors, identify their overlap, then move the in-game traveler toward a hidden fictional transmitter. Choose whether to spend a hint on a fourth observation. | O17 measurement, O01 map, O06 radio/space-weather context, O14 mission briefing, O19 sandbox network clues | Lock onto the fictional beacon. Score bearing accuracy, efficient movement, and evidence use. Signal noise comes from a bounded seeded preset; success is a one-time event. | **Relay Repair:** solve a short fictional DNS/routing diagram to choose which relay to inspect, then finish with the existing signal meter and movement game. No real scan is performed. |
| **Radio Detective** | **The Missing Broadcast:** infer a secret city from a vetted audio cue, dated skyline scene, environmental clue, and simplified fictional travel trail. Pin evidence to a small graph and spend limited hint tokens before guessing. | O03/O04 travel concepts, O08/O09 imagery, O10 news format, O14 briefs, O15 graph, O19/O21 fictional research records | Submit one final location per round. Score distance, evidence reasoning, and hints used. Show a concise explanation connecting clues to the answer; avoid demanding arbitrary exact wording. | **Counterfeit Station:** trace a fictional domain/certificate/wallet dossier to identify a forged broadcast record, then use the normal map guess. All identifiers and evidence are authored sandbox data. |

### 14.3 Every new capability has a defined role

This coverage map distinguishes mission mechanics from supporting product functions. It avoids adding a shallow scoring system to administrative tools merely to claim they are gamified.

| Expansion IDs | Game contribution or support role |
| --- | --- |
| O01–O02 map, layers, controls | Mission selection, route previews, clues, virtual positions, scenario context, and saved/shareable challenge views. |
| O03 aviation | Fictional arrival-board/route clues for Detective and transit-hub delivery briefs for Bicycle; no following a real private aircraft for points. |
| O04 maritime | Boating route design and port collections; fictional shipping clues in Detective. |
| O05–O06 space/orbits | DJ beat visualizations, Signal Hunt condition presets and learning cards, and Buggy relay stories. |
| O07–O08 environment/imagery | Frozen bounded conditions and terrain clues across riding/water games; dated-scene challenges for Photo and Detective. Live disaster reports are context, not scored real-world missions. |
| O09 public media | Permitted place scenes for Photo and Detective, and ambience for Surfing; export only where allowed. |
| O10–O11 news/events/risk | Dated, curated educational context and fictional bulletin-style briefs. Do not turn active real conflicts, victims, or crisis locations into reward targets. |
| O12 GIS/infrastructure | Authored course inspiration, fictional relay placement, reference geometry, and habitat/harbor cards. |
| O13–O14 alerts/briefings | Announce in-game mission availability separately from real event alerts; AI may vary wording around a validated mission template. |
| O15 graphs | Detective evidence board and optional expedition recap connecting clues, locations, and completed legs. |
| O16 markets | Cooking budget/price-chart puzzles using synthetic game prices; no trading activity or financial subscription required. |
| O17–O18 drawing/routing | Decisions that affect Bicycle, Boating, Buggy, Skiing, and Signal Hunt; measurement challenges and shared authored routes. |
| O19–O21 recon/cyber/wallet/list tools | Fictional evidence puzzles inside Detective and Signal Hunt. A fully local practice dataset implements the game interaction without querying real identities, leaked data, or vulnerable hosts. |
| O22 supply chains | Cooking ingredient substitutions, Boating cargo manifests, and optional delivery chains linking games. |
| O23 themes | Earn cosmetic map palettes, game scenes, and passport frames. Accessibility controls and basic customization are available immediately. |
| O24 remote devices | Optional input/accessibility mapping for an explicitly paired supported controller/device. Hardware ownership grants no score or exclusive progression. |
| O25 Ghost Protocol | No mission dependency until its upstream behavior is established. A new game mechanic must have its own specification rather than inherit an unexplained label. |
| O26–O27 ingestion/webhooks | Feed validated, authored challenge packs into a separate game-content namespace. Repository events can announce a new pack, but cannot directly grant coins or execute mission instructions. |
| O28–O29 platform/community | Publish challenge documentation, attribution, accessibility notes, and optional seed-based challenge sharing. Health checks, donations, subscriptions, and community actions do not award gameplay points. |

## 15. Expeditions, progression, and the traveler economy

### 15.1 Connect the games through short expeditions

Each expedition is a sequence of 3–5 existing-game missions totaling roughly 8–15 minutes, with progress saved between legs. The player may leave, listen freely, or return later without losing completed rewards. Individual missions are also available outside expeditions.

| Expedition | Playable sequence | Shared story and final memory |
| --- | --- | --- |
| **Harbor to Rooftop** | Boating cargo delivery → Bicycle neighborhood courier → Street Chef festival order → Rooftop DJ set | Prepare a fictional community broadcast night. Each delivery contributes a story item; completion adds a city festival page to the passport. |
| **The Silent Frequency** | Signal Hunt bearing puzzle → Photo landmark brief → Radio Detective city case | Restore a fictional travel broadcast by finding a relay, collecting place evidence, and identifying its destination. Award a radio-restoration badge and evidence scrapbook. |
| **Coast to Coast** | Surfing wave session → Fishing habitat journal → Photo coastal postcard | Document a fictional coastal radio tour. Award a coastal collection page, board/rod cosmetics, and a selected postcard frame. |
| **Mountain Relay** | Alpine Downhill courier → Signal Hunt beacon → Photo mountain scene | Deliver a recording and reconnect a fictional mountain station. Award a summit passport page and equipment appearance. |
| **Desert After Dark** | Desert Buggy relay run → Radio Detective route clue → Rooftop DJ practice stage | Complete a fictional night-radio relay. DJ may be hosted at the expedition's next valid urban stop; the travel card makes that location change explicit. |

The planner checks activity capabilities for every city/stage. An expedition may fast-travel between clearly named stops, use an authored practice venue, or offer an equivalent leg. It must never place a harbor or ocean wave in an inland city merely to satisfy the sequence. No mission depends on an AI-generated assertion that an activity exists there.

**One detailed example: Harbor to Rooftop**

1. In a curated harbor city, a mission card asks for two fictional festival crates. A simplified map offers a protected channel and an exposed shortcut.
2. In Boating, the player collects the crates, navigates simulated ferry crossings, and docks. A result records delivery quality and grants that leg's reward once.
3. Bicycle begins near the fictional radio depot. The player chooses a climbing shortcut or flatter route to deliver a music cartridge; one spare cartridge prevents a minor crash from ending the expedition.
4. Street Chef uses a separate, explicit mission budget to prepare a festival order. Earlier good performance can add a flavor-text compliment or cosmetic presentation, not an unbeatable mechanical advantage.
5. Rooftop DJ closes the event with a fixed short beat challenge. The final passport spread includes the route, scores, and a selected postcard. The finale bonus is awarded once even if reopened.

### 15.2 Progression that rewards mastery and exploration

- **Traveler Coins:** retain the current spendable currency. Use it for cosmetics, postcard frames, scene decorations, and optional collection items. Avoid introducing a second spendable token.
- **Traveler XP:** add one non-spendable progress total and per-game mastery records. XP unlocks additional mission variations and titles; basic radio, all existing games, practice, and essential accessibility tools remain available from the start.
- **Medals:** bronze means complete the objective; silver means complete an optional skill goal; gold means complete the full mastery goal. Medal rules are game-specific and shown before play.
- **Collections:** passport pages track discovered places, completed expeditions, recipe mastery, habitat journals, DJ sets, and genuine saved images. Show missing collection items and how to earn them.
- **Daily/weekly challenges:** optional seeded scenarios with a local practice fallback and no streak-loss punishment. Players can revisit an archive. If public competition is added later, authoritative scheduling and result verification require server support.
- **Personal challenges:** share an authored scenario ID, rules version, difficulty, and seed. A shared challenge does not include personal location, research inputs, paired-device data, or third-party content that cannot be redistributed.
- **Upgrades:** favor cosmetic and sidegrade choices. Scored modes normalize equipment; progression must not make a new player's best achievable score inherently lower.

**Initial reward model to tune with playtests:**

- Short standard mission: 20 coins and 40 XP for completion, plus up to 20 coins and 20 XP for published skill objectives.
- First completion of an expedition: an additional 40 coins, 80 XP, and a cosmetic/collection memory. Individual legs keep their ordinary rewards; the finale is separately settled once.
- Each unique mission medal can grant a one-time small mastery reward. Improving a personal best grants recognition and the applicable first medal reward, not an unlimited bonus on every tiny improvement.
- Failed runs preserve already completed, settled legs. Practice supports normal learning/progression without punitive entry fees. A photo/record created as a mission memory is not automatically an endlessly resellable item.
- Pay comparable rewards per typical minute across different games. Longer sessions do not earn unlimited idle income; active objectives determine completion. Purely opening panels, refreshing data, making API calls, or waiting for events earns nothing.
- Keep scores distinct from wallet payouts. Migrate existing game rewards into the common settlement policy instead of adding mission rewards on top of legacy exit/catch payouts accidentally.

The proposed amounts are design placeholders, not a promise of balance. Measure completion times and earnings across beginner, standard, and expert play before fixing the economy.

## 16. Mission implementation model and data rules

### 16.1 Reuse the existing components

Add a mission layer around `BicycleGameModal`, `BoatingGameModal`, `FishingGameModal`, `RooftopBeatModal`, `MarketShopModal`, `PhotoSnapModal`, `DesertBuggyModal`, `AlpineDownhillModal`, `SurfingGameModal`, `SignalHuntModal`, and `DetectiveLabModal`. Their current free-play modes remain accessible.

Proposed modules:

- `src/missions/types.ts`: mission templates, scenario snapshots, objective definitions, events, results, and expedition records.
- `src/missions/catalog.ts`: authored missions, valid location capabilities, tutorials, difficulties, rewards, and content provenance.
- `src/missions/scenarios.ts`: deterministic conversion of curated data or permitted environmental observations into bounded game parameters.
- `src/missions/session.ts`: ready/playing/paused/results/settled transitions, retry policy, and resumed expedition state.
- `src/missions/objectives.ts`: pure objective reducers consuming game events such as checkpoint passed, dock completed, cast landed, beat judged, recipe served, and shutter captured.
- `src/missions/rewards.ts`: validated once-only settlement using the traveler state transaction model from section 3.
- `src/components/MissionBoard.tsx`, `MissionBrief.tsx`, `MissionHUD.tsx`, and `MissionResults.tsx`: a shared player-facing shell, with game-specific indicators inside the current game UI.

These paths are implementation proposals; they are not files created by this planning update.

**Minimum mission record:** stable mission/template ID, rules version, game ID, difficulty, approved location context, required capabilities, objective definitions, bounds, seed, reward policy, and eligible content references.

**Minimum session record:** unique session ID, immutable scenario snapshot, current state, objective progress, game result, medal, settlement ID, and optional expedition/leg ID. A completed result and its wallet/inventory changes form one logical commit. On the current local-only app this protects against accidental duplicate rewards; tamper-resistant public leaderboards would need a server.

**Minimum scenario snapshot:** chosen course/preset, curated scene metadata, source/observation time where relevant, data-mode label, frozen initial parameters, and any versioned clue pack. Store only content/metadata permitted by the provider. When raw data cannot be retained, preserve a permitted derived preset or use a redistributable practice fixture for replay.

**Objective authority:** games emit typed events; objective reducers determine progress; one result service settles coins/XP/items. UI effects, sound callbacks, map clicks, arriving API messages, and narrative text cannot directly award rewards. Guard objective completion as a transition so repeated contact with a dock or checkpoint cannot farm points.

### 16.2 Fair use of real-world data

1. **Live-inspired play:** conditions are fetched before the round, validated, converted to a playable preset, and frozen. A label such as “Inspired by conditions observed at 14:00 UTC” is more accurate than implying continuous synchronization.
2. **Practice scenarios:** authored seeds reproduce the same objectives, layout, and timing without keys or live endpoints. Provide equal progression opportunities; compare competitive records only within equivalent scenario/rule/difficulty groups.
3. **Public daily challenge:** if introduced, publish one shared permitted snapshot or generated seed. Do not let each player's local weather/provider response alter the same challenge's scoring conditions.
4. **Active play:** never change objective thresholds, spawn a new hazard, or remove a clue because a provider refreshed mid-round. An outage cannot invalidate a result.
5. **AI assistance:** may rewrite a brief or explain a validated result. It cannot invent playable geometry, species, factual clue answers, scoring rules, or direct tool actions without the deterministic template validator accepting the output. Keep an authored fallback.
6. **Answer isolation:** Detective and mystery-style Signal Hunt sessions hide revealing station names, map selections, routes, coordinates, media metadata, accessibility labels, and dossier/guide details. Store the answer separately from player-visible clue objects.
7. **Media scoring:** live camera imagery without authored scene labels supports ambience or unscored photography. Scored Photo/Detective rounds use permitted, validated scenes with known targets; random confidence or image-recognition guesses must not decide the medal.
8. **Research puzzles:** use fictional reserved example domains, synthetic accounts/records, and generated graph fixtures. Never require network scans, exposure lookups, financial transactions, device discovery, or tracking actual people to progress.

### 16.3 Usability details

- Introduce each new tool at the point it helps: a bearing overlay in Signal Hunt, a two-option route preview in Bicycle, and a clue board in Detective. Avoid dropping the full research dashboard into a fast game.
- Give players a recommended default approach and an optional advanced choice. Preparation should usually take under 30 seconds after the first tutorial.
- Make objectives observable through text/shapes as well as color or sound. Provide slower timing windows, remappable controls, and an untimed practice mode.
- Pausing freezes both gameplay and objective timers; focus loss resets held inputs. Radio follows the user's audio preference independently.
- Include a “Why this worked” result explanation: for example, “Your wider approach reduced the final turn and kept the cargo stable.” Explain the actual rules applied in the simulation.
- Keep real alerts visually and logically separate from mission notifications. A fictional request to restore a radio relay is never presented as an actual emergency dispatch.

## 17. Gamification delivery, playtests, and completion criteria

**Delivery order:** start the mission foundation after the original input/reward/lifecycle fixes. It can use local fixtures while live data adapters are built. This lets us validate whether the games are enjoyable before spending time integrating every provider.

| Milestone | Deliverable | Initial additional effort |
| --- | --- | --- |
| G1 — Mission foundation | Shared catalog/snapshot/events/results, XP/mastery records, settlement integration, and a usable Mission Board | 4–6 engineering days |
| G2 — First connected expedition | Signal Hunt triangulation → Photo authored composition → Detective evidence/guess, using local fixtures and an expedition passport page | 5–8 engineering days |
| G3 — Movement and water missions | Bicycle routes, Boating deliveries, Buggy relay course, Skiing gates, Fishing habitat choices, Surfing set preview | 8–14 engineering days |
| G4 — Festival and replay | Cooking budget/substitution, DJ timed sets, remaining expedition chains, challenge seeds, cosmetic collections, and progression tuning | 5–8 engineering days |
| G5 — Data and release | Approved live-context adapters, missing-data fallbacks, clue-leak audit, device/accessibility playtests, and migration/regression checks | 4–6 engineering days |

**Estimate treatment:** this deeper gamification adds roughly 26–42 engineering days of scope before subtracting overlap with the original per-game upgrades and phase 11's simpler context links. It supersedes the lightweight game-connection assumptions in section 12; do not simply add all estimates as independent tasks. Re-estimate the combined backlog after G2 playtesting and the upstream reuse audit.

**First playable milestone:** The Silent Frequency expedition, with a fictional beacon, an original renderable landmark scene, and a curated city clue pack. It needs no OSIRIS account, paid API, personal data, or remote hardware. It must demonstrate the full path from choosing a mission to playing three existing games and receiving a persisted passport reward.

**Acceptance checklist:**

- [ ] Every existing mini game has at least one mission in section 14 with a decision that materially affects play, a visible objective, and an explained result.
- [ ] Every expansion capability O01–O29 has either a game mechanic, a supporting role, or an explicit unresolved dependency in the coverage table; none is silently omitted.
- [ ] The Silent Frequency expedition works from start to finish using local fixtures and survives reload between completed legs.
- [ ] A completed objective/leg/finale pays exactly once across rapid inputs, retry, exit/reopen, saved-game reload, and result-screen revisits.
- [ ] Legacy game payouts are reconciled with mission payouts; no accidental doubled coins or reward loss when switching between free play and missions.
- [ ] The same scenario seed, rules, and input sequence produce equivalent objective outcomes at 30/60/120 Hz within documented simulation tolerances.
- [ ] Mid-round API failure, stale data, revoked media availability, or an AI error cannot silently change the challenge or delete earned progress. If a scene becomes unusable, offer a fair restart with a permitted replacement.
- [ ] Beginner/practice players can reach core content; paid integrations, paired hardware, daily attendance, and competitive scores are never prerequisites.
- [ ] Detective clues remain solvable but do not reveal answers through background panels, station labels, tooltips, screen-reader content, URLs, or image metadata exposed in the UI.
- [ ] Geography and scene validation reject impossible activity combinations. Real route geometry is simplified into a suitable game course, not treated as a promise of actual navigability.
- [ ] Photo scores derive from published authored-scene criteria, rhythm scores derive from timing, and boating scores derive from navigation; each game's main skill controls its result.
- [ ] Research missions work entirely on fictional/sandbox records and cannot invoke operational scanners, identity lookups, device controls, or transactions.
- [ ] Keyboard, touch, controller, reduced-motion, and untimed-practice journeys are verified across the shared shell and new mechanics.
- [ ] Playtest the preparation time, first-round comprehension, completion rate, retry rate, and median coins per active minute for every game. Investigate large differences before locking rewards.
- [ ] In first-time playtests, players can explain their objective and one useful choice without reading a long manual. Use this evidence to simplify confusing panels or mission rules.

**Definition of success:** the new features change what players decide and do inside the existing mini games, while radio listening remains easy and every adventure is playable with reliable, reproducible content.

## 18. CCTV: watch the world and play through camera scenes

**Product goal:** tune into a city's radio and see its streets, harbor, beach, or skyline through published public cameras. From that same view, start a photography brief, a city mystery, a route challenge, or a fictional signal-restoration mission inside an existing mini game.

This is a substantial feature within World Monitor and the city drawer, not just background scenery. O09 remains the feature inventory entry; this section specifies the viewing experience and gameplay.

### 18.1 The camera experience

- **Cameras near this station:** city/station cards show nearby available public cameras, with a distance limit and an honest empty state. Never silently substitute a camera in another city.
- **Map discovery:** clustered camera markers, a camera list alternative, and filters for city/country, harbor, beach, street, transport, skyline, and availability where metadata supports them.
- **Watch and listen:** open one large camera view while radio continues. Camera audio starts muted; explicitly selecting it offers a clear radio/audio mix choice.
- **Camera wall:** pin up to four feeds on desktop, with a compact one-at-a-time phone layout. Use still previews for inactive tiles and load video selectively according to a bandwidth setting.
- **Viewer controls:** fullscreen, fit/fill, supported digital crop/zoom, favorite, source link, and switch camera. Do not imply digital cropping physically moves the camera; pan/tilt/zoom hardware control is not part of viewing public feeds.
- **Clear status:** identify continuous video, periodically refreshed image, dated recorded scene, or original simulation. Show capture/update time when the source provides it; distinguish feed reachability from evidence that the pictured scene is recent.
- **Camera passport:** save favorite views and discovered locations. When frame storage is permitted, save an actual postcard; otherwise save a source-linked camera bookmark with its title and date.
- **Relaxed viewing:** an optional tour cycles through selected public places while keeping the chosen radio station, or switches radio only if the listener enables that behavior. Watching remains useful without playing missions.
- **Mission entry points:** camera cards offer supported actions such as Take a Postcard, Play a City Mystery, or Plan a Harbor Run. Show only missions that have the required licensed scene or authored course.

### 18.2 Camera-driven missions in the current games

| Existing mini game | Camera mission | What the player actually does | How it is scored |
| --- | --- | --- | --- |
| **Photo Snap** | **Perfect Postcard** | Choose a camera scene, position a crop around a known skyline/bridge target, straighten the horizon, and select a look. Save the resulting image when allowed. | Scored rounds use licensed fixed scenes or original rendered scenes with authored target regions. Score framing, horizon alignment, and completion of the brief. A freely chosen live view can produce an unscored postcard. |
| **Photo Snap** | **World Photo Trail** | Complete three different place-based briefs, such as a harbor, a town square, and a coast. Select the best shot for a passport spread. | Each distinct completed brief advances the trail once. Repeated shutter presses do not create saleable rewards. Offer a valid substitute scene when a feed is unavailable. |
| **Radio Detective** | **Where Is This Camera?** | Inspect a dated permitted camera scene and a vetted audio clue, then place a city/country guess. Buy hints about geography or architecture with in-round hint tokens. | Distance plus clue use, using the existing Detective result model. Hide revealing scene labels and station metadata in the scored interface. Media that must visibly retain location-revealing attribution belongs in a different mission format. |
| **Radio Detective** | **Spot the Scene Change** | Compare two licensed, authored scene frames to identify changed buildings, signs, lighting, or placed fictional props, then use those clues to choose a destination. | Authored answer regions and explanations, with an accessible text-clue alternative. No need to wait for an unpredictable event on a live feed. |
| **Signal Hunt** | **Camera Relay** | Switch between three authored camera viewpoints with a clearly fictional signal overlay. Match a visible landmark to the virtual map, take bearings, and walk the in-game traveler to a hidden relay. | Bearing accuracy, evidence selection, and efficient virtual movement. Camera viewpoints help locate the fictional transmitter; the app does not claim to read real RF strength from video. |
| **Signal Hunt** | **Restore the Picture** | Diagnose a fictional feed outage using a small local connection diagram, choose the correct relay, and complete the existing tuning/antenna sequence. | Correct diagnostic steps and final signal lock. All failures and repairs occur in the game simulation; no access to a real camera's administration is needed. |
| **Bicycle / Desert Buggy** | **Scout the Course** | Compare two permitted scene cards showing an authored road/dune course, pick a route, then ride the chosen version with visible checkpoints. | Course completion, clean control, and the chosen route's optional objectives. Live scenes may provide ambience, but actual obstacle positions come from the frozen game scenario. |
| **Boating** | **Harbor Lookout** | Use two authored harbor views to read fictional ferry departure lights or gate markers, choose a crossing, and execute the route in the boating game. | Yielding, timing, cargo condition, and docking. Simulated traffic follows the same schedule the preview shows, so observing the cameras is a useful skill. |
| **Surfing** | **Read the Set** | Watch a short authored wave sequence, choose which wave to enter, then play the matching seeded surfing sequence. A public beach camera can set the location's atmosphere alongside it. | Positioning, takeoff timing, and style. Do not calculate guaranteed surf safety or precise swell conditions from an arbitrary webcam. |
| **Fishing** | **Choose Your Spot** | Inspect authored shoreline views and habitat clues, choose a casting spot/depth, then use the existing casting and tension game. | Cast accuracy, target completion, and fight control. Fish presence and species come from the curated game scenario, not an unsupported claim about what a live camera sees underwater. |
| **Alpine Downhill** | **Slope Preview** | Inspect an authored summit and finish-line view, compare marked gate routes, then descend the chosen course. | Gates, clean turns, and delivery condition. A public mountain camera is contextual; the course preview does not claim actual slope safety. |
| **Rooftop DJ / Street Chef** | **Broadcast Festival** | Select a permitted city camera or original city backdrop for the stage, then complete a DJ set or cooking order within a fictional festival broadcast. | The existing rhythm/cooking skills determine points. A clearly simulated audience reacts to performance; people in the actual feed are never analyzed as a crowd-hype score. |

**Additional connected expedition: Around the World in Four Views.** Start with a Detective camera-location puzzle, take its Photo postcard, complete a Boating or Bicycle mission inspired by the revealed place, and finish a Camera Relay stage in Signal Hunt. Save a four-panel passport memory. Use validated authored scenes for the scored stages; permit an equivalent land route for cities without a harbor.

### 18.3 Two clear ways to play

**Live discovery:** genuinely available public feeds, radio accompaniment, favorites, source-linked observation prompts, and permitted postcards. No timed goal requires a real car, person, ship, weather change, or incident to appear. Recognition of fixed places can be an authored prompt, but dynamic observations are not automatically treated as verified facts.

**Scored missions:** licensed fixed frames/clips or original scenes, known target metadata, a reproducible mission clock, and game-generated overlays. Camera switching and observation affect decisions, while stable content makes scoring fair. Tell the player when a scene is recorded or simulated.

The player can move directly from discovery to an available mission, but the transition makes any scene change clear. If a live feed disappears, return to another available view or offer a permitted practice scenario. Do not silently replay old footage under a LIVE badge.

### 18.4 Camera and scene integration

- Create a camera catalog with stable ID, owner/source, place/coordinates, scene category, media kind, permitted embedding/capture/export/retention operations, timestamps where available, and availability status. Start with a small verified set across several cities.
- Keep the public camera record separate from a mission scene record. A mission scene adds an approved stored asset or original render specification, known landmarks/target regions, clue metadata, supported missions, difficulty, and scoring rules.
- Make camera capability checks explicit: view-only, capturable, exportable, usable in a stored challenge, or source-link-only. An embeddable iframe is not automatically a source of readable canvas pixels.
- Use a reusable camera viewer in the city drawer, World Monitor, Photo Snap, and mission briefing. Leave input ownership and radio audio routing in the shared app services.
- Apply capture only to source types that permit it technically and under the relevant terms. Offer a bookmark or original postcard composition for view-only providers.
- Never automatically submit camera frames to an AI service. Authored target metadata should handle initial scored missions; any future optional image analysis needs a separate permitted-content design and an uncertainty policy.
- Render names/URLs as untrusted input and constrain proxy requests to approved providers. Do not discover unlisted private cameras or bypass login/stream restrictions to grow the catalog.
- Bound refresh intervals and concurrent streams; unload offscreen video, preserve paused user intent, and offer low-data mode. A four-feed wall should not prevent an existing game from meeting its frame-time budget.

### 18.5 Delivery and verification

1. **Viewer milestone:** a verified public-camera catalog, station-to-camera matching, source/time/status cards, one functioning viewer, favorites, and radio continuity. This expands the camera example already planned for expansion phase 7/8.
2. **First playable camera slice:** one original renderable scene with known landmark regions, Perfect Postcard in Photo Snap, and Where Is This Camera? in Detective using a clue-safe scene version. Demonstrate saved output, fair scores, and one-time mission rewards without depending on a live service.
3. **Control-room slice:** Camera Relay in Signal Hunt, an authored Harbor Lookout preview in Boating, and a four-view expedition. Reuse the shared mission shell and snapshot model.
4. **Broader polish:** remaining course previews, camera wall, collections, mobile layout, loading/performance controls, and additional verified cities/providers.

Acceptance checks:

- [ ] A user can select a station, view a nearby public camera, continue listening, and return from a mission without losing the station or playback settings.
- [ ] Camera location, source, media type, and available timestamps are shown accurately; absent timestamps are described as unknown.
- [ ] Broken, stale, blocked, or view-only feeds have usable alternatives. Reaching a camera endpoint alone cannot make its status LIVE.
- [ ] Capture/export actions appear only when permitted; saved images contain the actual selected scene/crop and required attribution, while bookmarks are clearly labeled as bookmarks.
- [ ] Camera missions use known scene targets, meaningful observation choices, and the existing once-only result settlement; no random composition score or live-event waiting is required.
- [ ] Detective scenes preserve required attribution while avoiding answer leakage; if those requirements conflict, choose a different permitted scene or mission.
- [ ] Objectives concern places, authored objects, and fictional events. No facial recognition, license-plate matching, person-following, or points for observing real incidents are required.
- [ ] Camera wall, mobile viewer, keyboard navigation, reduced motion, low-data mode, and radio/video sound controls are tested together.

**Scope/estimate note:** this is an explicit expansion of O09 and milestones G2/G3/G5. Viewer work already appears in the OSIRIS phases, and authored photo/Detective scenes already appear in the mission phases. Add separate tickets for the camera wall and control-room mechanics, then re-estimate overlap before setting a delivery date; do not count the same scene/viewer work twice.
