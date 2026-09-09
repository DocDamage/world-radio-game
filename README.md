# TerraWave — World Radio Game & 3D Street Explorer

> **Listen to live global broadcasts, walk the world in 3D Street View, and play authentic location-aware arcade simulations.**

Built on top of **Radio Garden**, **OpenRadio**, and Google Maps 3D, TerraWave transforms exploring 12,000+ radio cities across Earth into an interactive world game.

---

## 🌍 Features

### 1. Global 3D Radio Exploration
- **Interactive Orbit Globe**: Spin the globe and tune into thousands of live radio streams from Tokyo to Paris, Reykjavik, Havana, and Nairobi.
- **3D Street Walker**: Drop into real street views with WASD / gamepad navigation, compass headings, and local ambient audio.
- **City Drawer**: Explore all broadcasting stations in any selected city with instantaneous switching, favorites, and genre tags.

### 2. Location-Aware Mini-Games (Real Interactive Arcade & Simulations)
Activities physically and culturally adapt to every city's geography and biome:

- 🚲 **City Bicycle Grand Prix** (`BicycleGameModal`):
  - 2.5D pseudo-3D road cycling arcade game rendered on HTML5 Canvas.
  - Steer through city traffic (taxis, scooters, delivery vans, pedestrians).
  - Tap pedal cadence to build speed up to 45+ km/h; shift gears (1–5) for torque vs sprint.
  - Ring your bicycle bell to scatter pedestrians and clear the bike lane.
  - Dynamic city backdrops: Tokyo neon skyscrapers, Paris Haussmann buildings, Alpine peaks, Desert palms.

- 🚢 **Waterway & Naval Simulator** (`BoatingGameModal`):
  - Top-down naval simulation with water wake physics, currents, and engine telegraph throttle (Reverse to Full Ahead).
  - Steer port/starboard helm through historic channels (e.g. Seine River, Tokyo Bay, River Thames, Venetian canals).
  - Acoustic ship's foghorn with reverberation.
  - Navigate between green/red channel buoys, thread under historic bridge arches, salvage floating cargo crates, and dock into designated marina berths.

- 🎣 **Deep Cast & Catch Angling Simulator** (`FishingGameModal`):
  - 2D depth cross-section canvas simulation showing water surface, shallow weeds, and deep riverbed trenches.
  - Power/Angle casting meter to target deep pools and bridge pilings.
  - Autonomous swimming fish AI: fish detect bait, approach, test nibble, and strike!
  - Realistic rod flex and line tension battle: stay in the safe green zone, reel and feather drag to land trophy catches.
  - Regional authentic species tailored to coastal ports (Pacific Bluefin Tuna, Sea Bass, Red Snapper), European canals (Seine Perch, European Pike, Wels Catfish), and alpine streams (Brook Char, Rainbow Trout).

- 🎛️ **Rooftop Vinyl DJ & Beat Machine** (`RooftopBeatModal`):
  - Available in inland metropolises (Madrid, Berlin, Chicago, Mexico City, São Paulo).
  - Interactive vinyl turntable with real scratching and audio scrubbing layered live over the streaming radio broadcast!
  - 8 MPC drum pads (808 Kick, Trap Snare, Hi-Hat, Vinyl Scratch, Dub Siren, Sub Bass, Brass Stab).
  - Resonant audio filter sweep knob.

- 🏜️ **Desert Dune Buggy Cruiser** (`DesertBuggyModal`):
  - Available in desert cities (Dubai, Riyadh, Marrakech, Phoenix, Doha).
  - High-speed sand dune arcade runner with tire sand spray particles, nitro boosts, and solar radio power cells.

### 3. Traveler Economy & Inventory
- **Adventure Backpack**: Stash regional fish catches, local street food, vintage vinyl LPs, and souvenirs.
- **Traveler Coins**: Earn coins through cycling sprints, salvage retrieval, trophy fish catches, and radio mystery games.
- **Local Markets & Souks**: Purchase regional delicacies, artisan crafts, and rare pressed vinyl in every city.
- **World Passport**: Collect stamps with dates and coordinates for every station visited.

### 4. Mystery Modes & Audio Lab
- **Transmitter Signal Hunt**: Track down a hidden radio transmitter using signal strength meter and directional audio cues.
- **Radio Detective**: Guess the city and country based on audio language, genre, and street cues.
- **Live Stream Audio Recorder**: Record MP3 audio clips directly from any global station with one click.
- **DLSS 5 Neural Rendering Performance HUD**: Ultra-smooth rendering overlay with frame rate monitoring and color enhancement.
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
