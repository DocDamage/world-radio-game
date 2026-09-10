# TerraWave — Game Completeness Audit

Audited September 10, 2026 against the current `main` branch.

## ✅ What IS Complete and Fully Wired

### Build & Quality
- `tsc --noEmit` passes with zero errors
- `npm run build` succeeds (production bundle, code-split chunks)
- `npm run lint` (oxlint) reports **0 warnings, 0 errors**
- `npm test` — all **53 tests pass** (missions, scenarios, traveler state, settings, globe tiles, world feeds)
- No `TODO`, `FIXME`, or stub comments anywhere in `src/`

### Core App Loop
- ✅ Globe explore mode with station selection, city drawer, and place search
- ✅ Street walk mode with WASD navigation, heading/pitch control, and activity launchers
- ✅ Radio playback with play/pause, volume, mute, stream error/retry, Media Session API
- ✅ Command Palette (Ctrl+K / `/`) with city, country, and station search
- ✅ Passport system — stamps unique stations, 25 XP per new visit, fast-travel
- ✅ Favorites toggle, persisted in traveler state
- ✅ Coin economy — earning, spending, deducting, with storage persistence
- ✅ Backpack inventory — items from fishing, market, photos; sell for coins
- ✅ Settings store — reduced motion, reduced flashes, screen shake, visual cues, dual volumes
- ✅ Google Photorealistic 3D Tiles integration (API key flow, status tracking)
- ✅ Stream recording (dev proxy + direct CORS fallback, with error messaging)
- ✅ Gamepad controller support (GTA-style analog sticks, d-pad, triggers)

### All 11 Mini-Games — Wired End-to-End
| # | Game | Component | `missionScenario` | `onMissionResult` | `MissionHUD` | High Score |
|---|------|-----------|:-:|:-:|:-:|:-:|
| 1 | Bicycle Grand Prix | `BicycleGameModal` | ✅ | ✅ | ✅ | ✅ |
| 2 | Boating | `BoatingGameModal` | ✅ | ✅ | ✅ | ✅ |
| 3 | Fishing | `FishingGameModal` | ✅ | ✅ | ✅ | ✅ |
| 4 | Rooftop DJ | `RooftopBeatModal` | ✅ | ✅ | ✅ | ✅ |
| 5 | Street Chef (Market) | `MarketShopModal` | ✅ | ✅ | ✅ | N/A (shop) |
| 6 | Photo Snap | `PhotoSnapModal` | ✅ | ✅ | ✅ | N/A |
| 7 | Desert Buggy | `DesertBuggyModal` | ✅ | ✅ | ✅ | ✅ |
| 8 | Alpine Downhill | `AlpineDownhillModal` | ✅ | ✅ | ✅ | ✅ |
| 9 | Surfing | `SurfingGameModal` | ✅ | ✅ | ✅ | ✅ |
| 10 | Signal Hunt | `SignalHuntModal` | ✅ | ✅ | ✅ | N/A (mode) |
| 11 | Radio Detective | `DetectiveLabModal` | ✅ | ✅ | ✅ | N/A (mode) |

### Mission System — Fully Wired
- ✅ 11 mission definitions in catalog (one per game), all marked `status: 'live'`
- ✅ Each mission has 2 approach choices with distinct scenario knobs
- ✅ `buildScenario()` produces bounded, deterministic run parameters for all 11 missions
- ✅ Mission Board UI — browse, select choices, launch missions
- ✅ `missionSession` — start, complete with once-only settlement via transaction IDs
- ✅ Medal thresholds (bronze/silver/gold) with multiplied coin/XP rewards
- ✅ Mission Results debrief modal with medal, score bar, stats, and expedition progress

### Expedition System — Fully Wired
- ✅ 4 multi-leg expeditions chaining 3–4 missions each
- ✅ Expedition start → leg chaining → completion with bonus coins/XP and badge
- ✅ "Continue Next Leg" button in debrief modal
- ✅ Completed expeditions tracked in traveler state, once-only bonus

### World Monitor
- ✅ CCTV camera catalog with categories, filtering, pinning, wall/single view
- ✅ Live USGS earthquake feed, NASA EONET natural events, NOAA space weather
- ✅ Postcard capture from camera views → backpack
- ✅ Modal a11y (Escape, focus trap)

### Accessibility & A11y
- ✅ `AccessibilitySettingsModal` for all settings
- ✅ `useModalA11y` hook used by all major modals (focus trap, Escape, restore)
- ✅ `VisualCueToast` for sound-only cue equivalents
- ✅ `data-reduced-motion` attribute on `<html>` element
- ✅ Separate radio/effects volume controls
- ✅ Settings persisted with migration from legacy keys

### Data & Persistence
- ✅ Traveler state v2 with schema migration from v1 legacy keys
- ✅ Corrupt save recovery (falls back to defaults)
- ✅ Storage failure graceful degradation (in-memory state continues working)
- ✅ Export/import JSON for save data
- ✅ Transaction-based once-only reward settlement (prevents double payouts)

---

## ⚠️ What Is NOT Complete or Has Known Issues

### 1. Global Keyboard Shortcuts Conflict with Games/Modals
**Severity: High**

[`App.tsx`](file:///c:/dev/world%20radio%20app/src/App.tsx#L663-L706) imports `inputManager` (line 36) and registers modals/games with it (lines 106–278), but the `handleKeyDown` callback **never checks `inputManager.canHandleGlobalShortcuts()`**. This means:
- **W** (toggle walk mode), **S** (random station), **Space** (play/pause), **R** (record), **F** (favorite), and **Arrow keys** (change station) all fire even while a mini-game is active, a modal is open, or street walk mode is in use.
- WASD in bicycle, surfing, or street walk will simultaneously trigger global shortcuts.

The `inputManager` has the right API (`canHandleGlobalShortcuts()`, `canHandleStreetWalk()`, `isGameActive()`) but they are **never called** outside the service file itself.

---

### 2. StreetWalker Does Not Use InputManager
**Severity: Medium**

[`StreetWalker.tsx`](file:///c:/dev/world%20radio%20app/src/components/StreetWalker.tsx) does not import or consult `inputManager`. Its own keyboard listener could conflict with global shortcuts (both respond to WASD/arrows).

---

### 3. Photo Snap Does Not Capture or Store Actual Images
**Severity: Medium**

[`PhotoSnapModal.tsx`](file:///c:/dev/world%20radio%20app/src/components/PhotoSnapModal.tsx) saves metadata to the backpack (city, country, composition score, focal length) but `photoUrl` is never set — the `BackpackItem.photoUrl` field is always `undefined`. The component renders a procedurally generated postcard scene rather than capturing an actual image. The improvement plan explicitly flags this:
> *"Photo Snap assigns a random 80–98 composition score and stores metadata without `photoUrl`. It does not save the pictured scene."*

---

### 4. Stream Recording Only Works in Dev Mode (Mostly)
**Severity: Medium**

[`recorder.ts`](file:///c:/dev/world%20radio%20app/src/services/recorder.ts) depends on the `/stream-proxy` Vite middleware for CORS-blocked streams. In production builds, it falls back to direct fetch (which many stations block via CORS). The improvement plan notes:
> *"The recorder depends on `/stream-proxy`, implemented only by Vite's development-server middleware. A static production build does not supply that endpoint."*

The code handles this gracefully (shows error message), but the feature is functionally unavailable for most stations in production.

---

### 5. Geography/Biome Matching Uses Substring Heuristics
**Severity: Low-Medium**

[`activityData.ts`](file:///c:/dev/world%20radio%20app/src/services/activityData.ts) resolves biome/environment via substring matching on city/country names. The improvement plan warns:
> *"For example, the Venice rule includes `italy`, and the Paris rule includes `france`, so unrelated cities can inherit those waterways."*

This means any Italian city could get Venice's Grand Canal waterway label, and any French city could inherit Paris-specific geography.

---

### 6. DLSS 5 Performance Overlay Shows Simulated Values
**Severity: Low**

[`dlss5Engine.ts`](file:///c:/dev/world%20radio%20app/src/services/dlss5Engine.ts) and [`Dlss5Overlay.tsx`](file:///c:/dev/world%20radio%20app/src/components/Dlss5Overlay.tsx) display performance numbers that are multiplied from measured frame times by a configuration factor. The improvement plan notes:
> *"The performance overlay multiplies measured animation-frame frequency by a configuration value. That displayed number is not a measurement of generated frames."*

---

### 7. Detective Initial Clue Is Hardcoded Generic (Not Dynamic)
**Severity: Low**

[`App.tsx` L540-544](file:///c:/dev/world%20radio%20app/src/App.tsx#L540-L544) sets a static generic clue string for every mystery. While it no longer leaks the target city/country (the critical bug was fixed), the clue doesn't dynamically adapt to the target station's characteristics. Detective missions do provide `clueFocus` from the scenario, but the opening clue text is always the same.

---

### 8. Gemini API Key Stored in localStorage
**Severity: Low**

The Gemini API key ([`App.tsx` L130-132](file:///c:/dev/world%20radio%20app/src/App.tsx#L130-L132)) is stored directly in `localStorage` and passed to the guide panel. The improvement plan flags this:
> *"Avoid retaining a personal API key in local storage by default."*

---

### 9. No CI/CD Pipeline or Automated Browser Tests
**Severity: Low**

Tests exist and pass (53 unit/integration tests), but there is no CI configuration, no browser journey tests, and no automated device/accessibility tests as outlined in the improvement plan §7.

---

### 10. Large Bundle Chunks
**Severity: Low (cosmetic warning)**

The production build warns about chunks exceeding 500 kB:
- `globe-engine` — 1,221 kB (355 kB gzip)
- `three` — 797 kB (205 kB gzip)

Code splitting is already in place (lazy imports, vendor chunks), but the globe/three.js stack remains large.

---

## Summary

| Area | Status |
|------|--------|
| TypeScript compilation | ✅ Clean |
| Production build | ✅ Passes |
| Linting | ✅ 0 warnings, 0 errors |
| Tests | ✅ 53/53 pass |
| All 11 mini-games playable | ✅ Wired |
| All 11 missions wired live | ✅ Complete |
| 4 expeditions wired | ✅ Complete |
| Mission results/debrief | ✅ Complete |
| Traveler state persistence | ✅ Complete |
| **Global shortcut conflicts** | ❌ **Not guarded** |
| **StreetWalker input isolation** | ❌ **Not guarded** |
| **Photo capture (actual image)** | ❌ **Metadata only** |
| **Production recording** | ⚠️ **Limited by CORS** |
| **Geography heuristics** | ⚠️ **Substring-based** |
| **DLSS performance numbers** | ⚠️ **Simulated** |
| **CI/CD and browser tests** | ❌ **Not set up** |

> [!IMPORTANT]
> The most impactful functional issue is **#1 — global keyboard shortcuts fire unconditionally** even during games and modal interactions. The `inputManager` infrastructure exists but its guards are never applied to the App-level keyboard handler.
