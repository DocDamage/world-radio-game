# TerraWave — World Radio Game & 3D Street Explorer

> **Listen to live global broadcasts, walk the world in 3D Street View, and play authentic location-aware arcade simulations.**

Built on top of **Radio Garden**, **OpenRadio**, and 3D globe visualization, TerraWave transforms exploring 12,000+ radio cities across Earth into a living, interactive world simulation.

---

## 🌍 Features

### 1. Global 3D Radio Exploration
- **Interactive Orbit Globe**: Spin the globe and tune into thousands of live radio streams from Tokyo to Paris, Reykjavik, Havana, and Nairobi.
- **Photorealistic 3D Tiles (opt-in)**: Stream Google's Photorealistic 3D Tiles onto the globe and zoom from orbit down to real streets and skylines — bring your own Google Maps Platform key (Map Tiles API) via the **3D Tiles** button; the key is stored only in your browser, like the Gemini key.
- **3D Street Walker**: Drop into real street panoramas with WASD / gamepad navigation, compass headings, and local ambient audio.
- **City Drawer**: Explore all broadcasting stations in any selected city with instantaneous switching, favorites, and genre tags.
- **Command Palette (`Ctrl+K` or `/`)**: Rapid search across stations, cities, and countries.

### 2. Location-Aware Mini-Games & Simulations
Activities physically and culturally adapt to every city's geography, biomes, and waterways:

- 🚲 **City Bicycle Grand Prix** (`BicycleGameModal`):
  - 2.5D pseudo-3D road cycling arcade game rendered on HTML5 Canvas.
  - Steer through city traffic (taxis, scooters, delivery vans, pedestrians).
  - Tap pedal cadence to build speed up to 45+ km/h; shift gears (1–5) for torque vs sprint.
  - Ring your bicycle bell to scatter pedestrians and clear the bike lane.
  - Dynamic city backdrops: Tokyo neon skyscrapers, Paris Haussmann buildings, Alpine peaks, Desert palms.
  - Persistent high scores and coin rewards.

- 🚢 **Waterway & Naval Simulator** (`BoatingGameModal`):
  - Top-down naval simulation with water wake physics, currents, and engine telegraph throttle (Reverse to Full Ahead).
  - Steer port/starboard helm through historic channels (e.g. Seine River, Tokyo Bay, River Thames, Venetian canals).
  - Acoustic ship's foghorn with reverberation.
  - Navigate between green/red channel buoys, thread under historic bridge arches, salvage floating cargo crates, and dock into designated marina berths.
  - Persistent naval rating and coin rewards.

- 🎣 **Deep Cast & Catch Angling Simulator** (`FishingGameModal`):
  - 2D depth cross-section canvas simulation showing water surface, shallow weeds, and deep riverbed trenches.
  - Power/Angle casting meter to target deep pools and bridge pilings.
  - Autonomous swimming fish AI: fish detect bait, approach, test nibble, and strike!
  - Realistic rod flex and line tension battle: keep tension in the green sweet spot (35–65%) for +80% reel torque and ratchet clicks.
  - Catch streak combo multipliers (up to 3x coins) and high-tension screen shake.
  - Persistent personal best catch records (`kg`) and automatic trophy fish stashing in your backpack.
  - Regional authentic species tailored to coastal ports (Pacific Bluefin Tuna, Sea Bass, Red Snapper), European canals (Seine Perch, European Pike, Wels Catfish), and alpine streams (Brook Char, Rainbow Trout).

- 🎛️ **Rooftop Vinyl DJ & Beat Machine** (`RooftopBeatModal`):
  - Available in inland metropolises (Madrid, Berlin, Chicago, Mexico City, São Paulo).
  - Interactive vinyl turntable with real scratching and audio scrubbing layered live over the streaming radio broadcast!
  - 8 MPC drum pads (808 Kick, Trap Snare, Hi-Hat, Vinyl Scratch, Dub Siren, Sub Bass, Brass Stab).
  - Resonant audio filter sweep knob.
  - Groove Combo streak multipliers (up to 16x) and dynamic Crowd Hype gauge.
  - "ROOFTOP FEVER!" mode with synthesized crowd cheers and double coins.
  - Persistent high score tracking.

- 🍳 **Street Chef Kitchen & Artisan Cooking** (`MarketShopModal`):
  - Interactive multi-step skillet cooking simulation: Sear, Toss, and Season.
  - Oscillating skillet temperature needle with precision green zones.
  - Authentic culinary ratings (1 to 3 Stars) with crowd cheers and confetti on master chefs.
  - Cooked dishes are added to your backpack with score annotations and high resale value.

- 📸 **Street Photo Snap** (`PhotoSnapModal`):
  - Viewfinder framing tool to capture street scenes and landmarks.
  - Saves authentic Polaroid snapshots to your backpack complete with city, country, and coin value.

- 🏜️ **Desert Dune Buggy Cruiser** (`DesertBuggyModal`):
  - Available in desert cities (Dubai, Riyadh, Marrakech, Phoenix, Doha).
  - High-speed sand dune arcade runner with tire sand spray particles, nitro boosts, and solar radio power cells.

### 3. Closed-Loop Traveler Economy & Backpack
- **Adventure Backpack (`BackpackModal`)**:
  - Filter items by All, Food, Music/Vinyl, Souvenirs, Fish, and Photos.
  - Interactive inspection modal: view Polaroid snapshots, fish trophy weights, and regional descriptions.
  - Instant pawn selling: sell any backpack item for Traveler Coins.
- **Local Markets & Souks (`MarketShopModal`)**:
  - Buy regional artisan goods, musical instruments, rare pressed vinyl, and local food in every city.
  - Cook live street dishes using the Street Chef Kitchen minigame.
  - Dedicated "Sell & Pawn" tab to turn fish catches and postcards into coins.
- **Traveler Coins**:
  - Earn coins across all minigames, salvage ops, trophy catches, DJ sets, and radio mysteries.

### 4. World Listener Passport & Fast-Travel
- **Stamps & Visas (`PassportModal`)**: Collect authentic passport stamps for every station and city visited.
- **Instant Fast-Travel**: Click on any stamp in your passport to instantly fly the camera and tune into that city's live broadcast!
- **Global Explorer Stats**: Track total stations logged, unique countries visited, continents charted, and unlock Explorer Rank Badges.

### 5. Mystery Modes & Audio Lab
- **Transmitter Signal Hunt**: Track down a hidden radio transmitter using signal strength meter and directional audio cues.
- **Radio Detective**: Guess the city and country based on audio language, genre, and street cues.
- **Live Stream Audio Recorder**: Record MP3 audio clips directly from any global station with one click.
- **Web Audio FX Synthesizer**: Pure Web Audio synthesis for crowd cheers, skillet sizzles, fishing reel ratchets, bicycle bells, boat foghorns, radar pings, and static bursts.
- **Modern Gamepad Support**: Full analog stick steering, trigger pedaling/throttles, and haptic rumble vibration.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation
```bash
git clone https://github.com/DocDamage/world-radio-game.git
cd world-radio-game
npm install
```

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

---

## 🎮 Controls

| Key / Input | Action |
| --- | --- |
| **Space** | Play / Pause Live Radio |
| **Ctrl + K** or **/** | Open World Search Palette |
| **S** | Teleport to Random Station |
| **W** | Toggle 3D Street Walk Mode |
| **R** | Toggle Audio Recording |
| **F** | Add Station to Favorites |
| **← / →** | Previous / Next Station |
| **WASD / Arrows** | Steer & Move in 3D Walk & Minigames |
| **Gamepad** | Full analog steering, throttle, and vibration |

---

## 📜 License
MIT

