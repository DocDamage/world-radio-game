import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Radio, 
  Globe, 
  Footprints, 
  Flame, 
  HelpCircle, 
  BookOpen, 
  Bot, 
  Search, 
  Shuffle,
  Backpack,
  Coins,
  Zap
} from 'lucide-react';
import type { RadioStation, AppMode, SignalHuntState, DetectiveState, PassportEntry, Place, BackpackItem, ActivityMode } from './types';
import { fetchTopStations, CURATED_STATIONS, loadStationsSnapshot } from './services/radioApi';
import { resolveLocationEnvironment } from './services/activityData';
import { WorldGlobe } from './components/WorldGlobe';
import { StreetWalker } from './components/StreetWalker';
import { RadioPlayerBar } from './components/RadioPlayerBar';
import { SignalHuntModal } from './components/SignalHuntModal';
import { DetectiveLabModal } from './components/DetectiveLabModal';
import { PassportModal } from './components/PassportModal';
import { GeminiGuidePanel } from './components/GeminiGuidePanel';
import { CityDrawer } from './components/CityDrawer';
import { CommandPalette } from './components/CommandPalette';
import { GamepadHUD } from './components/GamepadHUD';
import { Dlss5Modal } from './components/Dlss5Modal';
import { Dlss5Overlay } from './components/Dlss5Overlay';
import { BicycleGameModal } from './components/BicycleGameModal';
import { BoatingGameModal } from './components/BoatingGameModal';
import { FishingGameModal } from './components/FishingGameModal';
import { MarketShopModal } from './components/MarketShopModal';
import { BackpackModal } from './components/BackpackModal';
import { PhotoSnapModal } from './components/PhotoSnapModal';
import { RooftopBeatModal } from './components/RooftopBeatModal';
import { DesertBuggyModal } from './components/DesertBuggyModal';
import { AlpineDownhillModal } from './components/AlpineDownhillModal';
import { SurfingGameModal } from './components/SurfingGameModal';
import { soundEffects } from './services/audioEffects';
import { streamRecorder } from './services/recorder';
import { gamepadManager } from './services/gamepadManager';
import { dlss5 } from './services/dlss5Engine';

export function App() {
  const [stations, setStations] = useState<RadioStation[]>(CURATED_STATIONS);
  const [activeStation, setActiveStation] = useState<RadioStation | null>(CURATED_STATIONS[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [mode, setMode] = useState<AppMode>('explore');
  
  // Selected City & City Drawer
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [cityStations, setCityStations] = useState<RadioStation[]>([]);
  const [isCityDrawerOpen, setIsCityDrawerOpen] = useState<boolean>(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState<boolean>(false);

  // Favorites
  const [favorites, setFavorites] = useState<Record<string, RadioStation>>(() => {
    const saved = localStorage.getItem('world_radio_favorites');
    return saved ? JSON.parse(saved) : {};
  });

  // Gemini API Key (saved in localStorage)
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    return localStorage.getItem('world_radio_gemini_key') || '';
  });
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);

  // Passport Stamps
  const [passportEntries, setPassportEntries] = useState<PassportEntry[]>(() => {
    const saved = localStorage.getItem('world_radio_passport');
    return saved ? JSON.parse(saved) : [];
  });
  const [isPassportOpen, setIsPassportOpen] = useState<boolean>(false);

  // Street Player position
  const [playerCoords, setPlayerCoords] = useState<{ lat: number; lng: number }>({
    lat: CURATED_STATIONS[0].geo_lat,
    lng: CURATED_STATIONS[0].geo_long
  });

  // Signal Hunt Game State
  const [huntState, setHuntState] = useState<SignalHuntState>({
    targetStation: null,
    playerPos: { lat: 0, lng: 0 },
    targetPos: { lat: 0, lng: 0 },
    distanceMeters: 500,
    signalStrength: 20,
    found: false,
    score: 0
  });

  // Radio Detective Mystery State
  const [detectiveState, setDetectiveState] = useState<DetectiveState>({
    targetStation: null,
    guessedPos: null,
    revealed: false,
    distanceKm: null,
    score: 0
  });
  const [mysteryClue, setMysteryClue] = useState<string>('');

  // Audio Recording State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordDuration, setRecordDuration] = useState<number>(0);

  // Modern Gamepad State
  const [gamepadConnected, setGamepadConnected] = useState<boolean>(false);
  const [gamepadName, setGamepadName] = useState<string>('');

  // DLSS 5 State
  const [gpuInfo] = useState(() => dlss5.detectGpu());
  const [isDlssModalOpen, setIsDlssModalOpen] = useState<boolean>(false);
  const [dlssConfigVersion, setDlssConfigVersion] = useState<number>(0);

  // Activities & Inventory State
  const [activityMode, setActivityMode] = useState<ActivityMode>('none');
  const [coins, setCoins] = useState<number>(() => {
    const saved = localStorage.getItem('world_radio_coins');
    return saved ? parseInt(saved, 10) : 250;
  });
  const [backpack, setBackpack] = useState<BackpackItem[]>(() => {
    const saved = localStorage.getItem('world_radio_backpack');
    return saved ? JSON.parse(saved) : [];
  });
  const [isBackpackOpen, setIsBackpackOpen] = useState<boolean>(false);

  // Minigame High Scores persisted across sessions
  const [highScores, setHighScores] = useState<{
    bike: number;
    boat: number;
    fishing: number;
    dj: number;
    buggy: number;
    ski: number;
    surf: number;
  }>(() => {
    const saved = localStorage.getItem('world_radio_highscores');
    return saved
      ? JSON.parse(saved)
      : { bike: 0, boat: 0, fishing: 0, dj: 0, buggy: 0, ski: 0, surf: 0 };
  });

  const handleUpdateHighScore = useCallback((game: 'bike' | 'boat' | 'fishing' | 'dj' | 'buggy' | 'ski' | 'surf', score: number) => {
    setHighScores(prev => {
      if (score <= (prev[game] || 0)) return prev;
      const next = { ...prev, [game]: score };
      localStorage.setItem('world_radio_highscores', JSON.stringify(next));
      return next;
    });
  }, []);

  // Dynamic Location Environment & Biome (Coastal, River, Urban, Desert, Alpine)
  const locationEnvironment = useMemo(() => {
    const placeName = selectedPlace?.title || activeStation?.place || '';
    const countryName = selectedPlace?.country || activeStation?.country || '';
    const lat = activeStation?.geo_lat || (selectedPlace ? selectedPlace.geo[1] : 0);
    const lng = activeStation?.geo_long || (selectedPlace ? selectedPlace.geo[0] : 0);
    return resolveLocationEnvironment(placeName, countryName, lat, lng);
  }, [selectedPlace, activeStation]);

  // Coins management
  const handleEarnCoins = useCallback((amount: number) => {
    setCoins(c => {
      const next = c + amount;
      localStorage.setItem('world_radio_coins', next.toString());
      return next;
    });
  }, []);

  const handleDeductCoins = useCallback((amount: number): boolean => {
    if (coins < amount) return false;
    setCoins(c => {
      const next = c - amount;
      localStorage.setItem('world_radio_coins', next.toString());
      return next;
    });
    return true;
  }, [coins]);

  // Backpack item management
  const handleAddBackpackItem = useCallback((item: BackpackItem) => {
    setBackpack(b => {
      const next = [item, ...b];
      localStorage.setItem('world_radio_backpack', JSON.stringify(next));
      return next;
    });
  }, []);

  const handleRemoveBackpackItem = useCallback((id: string) => {
    setBackpack(b => {
      const next = b.filter(i => i.id !== id);
      localStorage.setItem('world_radio_backpack', JSON.stringify(next));
      return next;
    });
  }, []);


  // Initial load of worldwide stations
  useEffect(() => {
    fetchTopStations(250).then(data => {
      if (data && data.length > 0) {
        setStations(data);
      }
    });
  }, []);

  // Audio Recording Toggle
  const handleToggleRecord = useCallback(() => {
    if (streamRecorder.getIsRecording()) {
      streamRecorder.stopRecording(activeStation?.name || 'Radio', activeStation?.place || 'World');
      setIsRecording(false);
      setRecordDuration(0);
      soundEffects.playRadarPing(880, 0.15);
    } else {
      if (!activeStation) return;
      streamRecorder.startRecording(activeStation.streamUrl, (sec) => setRecordDuration(sec)).then((started) => {
        if (started) {
          setIsRecording(true);
          soundEffects.playRadarPing(1200, 0.15);
        }
      });
    }
  }, [activeStation]);

  // Save Gemini Key
  const handleSaveGeminiKey = (key: string) => {
    setGeminiApiKey(key);
    localStorage.setItem('world_radio_gemini_key', key);
  };

  // Toggle Favorite
  const handleToggleFavorite = (station: RadioStation) => {
    setFavorites(prev => {
      const next = { ...prev };
      if (next[station.id]) {
        delete next[station.id];
      } else {
        next[station.id] = station;
      }
      localStorage.setItem('world_radio_favorites', JSON.stringify(next));
      return next;
    });
  };

  // Add a station visit to Passport
  const stampPassport = (station: RadioStation) => {
    if (passportEntries.some(e => e.stationUuid === station.id)) return;
    const newEntry: PassportEntry = {
      stationUuid: station.id,
      stationName: station.name,
      city: station.place || station.country,
      country: station.country,
      countryCode: station.countryCode || 'WORLD',
      genre: station.tags || 'Live Radio',
      visitedAt: new Date().toISOString(),
      coordinates: { lat: station.geo_lat, lng: station.geo_long }
    };
    const updated = [newEntry, ...passportEntries];
    setPassportEntries(updated);
    localStorage.setItem('world_radio_passport', JSON.stringify(updated));
  };

  // Select station
  const handleSelectStation = async (station: RadioStation) => {
    setActiveStation(station);
    setPlayerCoords({ lat: station.geo_lat, lng: station.geo_long });
    setIsPlaying(true);
    stampPassport(station);

    // Also populate city drawer
    if (station.placeId) {
      const { byPlace } = await loadStationsSnapshot();
      const stationsInPlace = byPlace.get(station.placeId) || [station];
      setCityStations(stationsInPlace);
      setSelectedPlace({
        id: station.placeId,
        title: station.place || 'Unknown City',
        country: station.country,
        size: stationsInPlace.length,
        boost: false,
        geo: [station.geo_long, station.geo_lat]
      });
      setIsCityDrawerOpen(true);
    }
  };

  // Next / Prev station
  const handleNextStation = () => {
    if (cityStations.length > 1 && activeStation) {
      const idx = cityStations.findIndex(s => s.id === activeStation.id);
      const nextIdx = (idx + 1) % cityStations.length;
      handleSelectStation(cityStations[nextIdx]);
    } else if (stations.length > 0) {
      const idx = stations.findIndex(s => s.id === activeStation?.id);
      const nextIdx = (idx + 1) % stations.length;
      handleSelectStation(stations[nextIdx]);
    }
  };

  const handlePrevStation = () => {
    if (cityStations.length > 1 && activeStation) {
      const idx = cityStations.findIndex(s => s.id === activeStation.id);
      const prevIdx = (idx - 1 + cityStations.length) % cityStations.length;
      handleSelectStation(cityStations[prevIdx]);
    } else if (stations.length > 0) {
      const idx = stations.findIndex(s => s.id === activeStation?.id);
      const prevIdx = (idx - 1 + stations.length) % stations.length;
      handleSelectStation(stations[prevIdx]);
    }
  };

  const handleSelectPlace = async (place: Place) => {
    const { byPlace } = await loadStationsSnapshot();
    const stationsInPlace = byPlace.get(place.id) || [];
    setSelectedPlace(place);
    setCityStations(stationsInPlace);
    setPlayerCoords({ lat: place.geo[1], lng: place.geo[0] });

    if (stationsInPlace.length > 0) {
      handleSelectStation(stationsInPlace[0]);
    } else {
      setIsCityDrawerOpen(true);
    }
  };

  // Teleport to random station
  const handleRandomStation = () => {
    if (stations.length === 0) return;
    const random = stations[Math.floor(Math.random() * stations.length)];
    soundEffects.playStaticBurst(0.3, 0.2);
    handleSelectStation(random);
  };

  // Start Signal Hunt Game
  const startSignalHunt = () => {
    const randomStation = stations[Math.floor(Math.random() * stations.length)];
    const offsetLat = (Math.random() - 0.5) * 0.006;
    const offsetLng = (Math.random() - 0.5) * 0.006;
    const spawnPos = {
      lat: randomStation.geo_lat + offsetLat,
      lng: randomStation.geo_long + offsetLng
    };

    setActiveStation(randomStation);
    setPlayerCoords(spawnPos);
    setIsPlaying(true);

    const dist = calculateDistanceMeters(spawnPos, { lat: randomStation.geo_lat, lng: randomStation.geo_long });
    const strength = Math.max(5, 100 - (dist / 800) * 90);

    setHuntState({
      targetStation: randomStation,
      playerPos: spawnPos,
      targetPos: { lat: randomStation.geo_lat, lng: randomStation.geo_long },
      distanceMeters: dist,
      signalStrength: strength,
      found: dist < 40,
      score: huntState.score
    });

    setIsCityDrawerOpen(false);
    setMode('hunt');
  };

  // Walk in Signal Hunt
  const handleHuntStep = (direction: 'north' | 'south' | 'east' | 'west') => {
    const stepSize = 0.0003;
    let { lat, lng } = playerCoords;
    if (direction === 'north') lat += stepSize;
    if (direction === 'south') lat -= stepSize;
    if (direction === 'east') lng += stepSize;
    if (direction === 'west') lng -= stepSize;

    const newPos = { lat, lng };
    setPlayerCoords(newPos);

    if (huntState.targetStation) {
      const dist = calculateDistanceMeters(newPos, {
        lat: huntState.targetStation.geo_lat,
        lng: huntState.targetStation.geo_long
      });
      const strength = Math.max(5, Math.min(100, 100 - (dist / 800) * 90));
      const found = dist < 45;

      setHuntState(prev => ({
        ...prev,
        playerPos: newPos,
        distanceMeters: dist,
        signalStrength: strength,
        found: found,
        score: found ? prev.score + 100 : prev.score
      }));
    }
  };

  // Start Detective Game
  const startDetectiveMystery = () => {
    const randomStation = stations[Math.floor(Math.random() * stations.length)];
    setActiveStation(randomStation);
    setPlayerCoords({ lat: randomStation.geo_lat, lng: randomStation.geo_long });
    setIsPlaying(true);

    setDetectiveState({
      targetStation: randomStation,
      guessedPos: null,
      revealed: false,
      distanceKm: null,
      score: detectiveState.score
    });

    setMysteryClue(
      `You are surrounded by local radio broadcasts in ${randomStation.place || randomStation.country}. Look at the street styles and listen carefully to the broadcast rhythms.`
    );

    setIsCityDrawerOpen(false);
    setMode('detective');
  };

  const handleGuessDetective = (coords: { lat: number; lng: number }) => {
    if (!detectiveState.targetStation) return;
    const dist = calculateDistanceMeters(coords, {
      lat: detectiveState.targetStation.geo_lat,
      lng: detectiveState.targetStation.geo_long
    }) / 1000;

    const roundScore = Math.max(0, Math.round(5000 - dist * 2));
    setDetectiveState(prev => ({
      ...prev,
      guessedPos: coords,
      revealed: true,
      distanceKm: dist,
      score: prev.score + roundScore
    }));
  };

  // Global Keyboard Shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Open command palette with Ctrl+K, Cmd+K, or /
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      setIsPaletteOpen(prev => !prev);
      return;
    }

    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    if (e.key === '/') {
      e.preventDefault();
      setIsPaletteOpen(true);
      return;
    }

    if (e.code === 'Space') {
      e.preventDefault();
      setIsPlaying(prev => !prev);
    } else if (e.key === 's' || e.key === 'S') {
      handleRandomStation();
    } else if (e.key === 'w' || e.key === 'W') {
      setMode(prev => (prev === 'street' ? 'explore' : 'street'));
    } else if (e.key === 'r' || e.key === 'R') {
      handleToggleRecord();
    } else if (e.key === 'f' || e.key === 'F') {
      if (activeStation) handleToggleFavorite(activeStation);
    } else if (e.key === 'Escape') {
      setIsCityDrawerOpen(false);
      setIsPassportOpen(false);
      setIsGuideOpen(false);
      setIsPaletteOpen(false);
    } else if (e.key === 'ArrowRight') {
      handleNextStation();
    } else if (e.key === 'ArrowLeft') {
      handlePrevStation();
    }
  }, [activeStation, cityStations, stations, handleToggleRecord]);

  // Modern Gamepad GTA-style controls integration
  useEffect(() => {
    gamepadManager.init({
      onMove: (forward, strafe, sprint) => {
        const speed = sprint ? 0.00035 : 0.00015;
        setPlayerCoords(prev => ({
          lat: prev.lat + forward * speed,
          lng: prev.lng + strafe * speed
        }));
      },
      onLook: (dh, dp) => {
        window.dispatchEvent(new CustomEvent('gamepad-look', { detail: { dh, dp } }));
      },
      onNextStation: handleNextStation,
      onPrevStation: handlePrevStation,
      onTogglePlay: () => setIsPlaying(prev => !prev),
      onToggleMode: () => setMode(prev => (prev === 'street' ? 'explore' : 'street')),
      onToggleRecord: handleToggleRecord,
      onToggleFavorite: () => {
        if (activeStation) handleToggleFavorite(activeStation);
      },
      onOpenMenu: () => setIsPaletteOpen(prev => !prev),
      onRandomStation: handleRandomStation,
      onVolumeChange: (delta) => {
        const audioEl = (window as any).__worldRadioAudio as HTMLAudioElement;
        if (audioEl) {
          audioEl.volume = Math.max(0, Math.min(1, audioEl.volume + delta));
        }
      }
    });

    const checkGp = setInterval(() => {
      setGamepadConnected(gamepadManager.isConnected());
      setGamepadName(gamepadManager.getName());
    }, 1000);

    return () => {
      clearInterval(checkGp);
      gamepadManager.destroy();
    };
  }, [handleNextStation, handlePrevStation, handleToggleRecord, activeStation]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none text-slate-100">
      {/* Top Navigation Bar */}
      <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-slate-950/90 via-slate-950/60 to-transparent pointer-events-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-lime-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-lime-500/20">
            <Radio className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <h1 className="font-black text-lg tracking-wider text-slate-100 flex items-center gap-1.5 uppercase font-sans">
              TerraWave <span className="text-[10px] bg-lime-400/20 text-lime-300 border border-lime-400/40 px-2 py-0.5 rounded-full font-bold">OpenRadio + 3D Walk</span>
            </h1>
            <p className="text-[11px] text-slate-400">12,000+ Radio Garden Cities • Street Explorer • Signal Hunt</p>
          </div>
        </div>

        {/* Search Command Trigger (OpenRadio style) */}
        <button
          onClick={() => setIsPaletteOpen(true)}
          className="flex items-center justify-between w-48 sm:w-72 md:w-80 bg-slate-900/80 hover:bg-slate-800/90 backdrop-blur-md border border-slate-700/80 hover:border-lime-400/50 rounded-2xl py-2 px-3.5 text-xs text-slate-300 transition group shadow-lg"
          title="Search places & stations (Ctrl+K or /)"
        >
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-lime-400 group-hover:scale-110 transition" />
            <span className="text-slate-400 truncate">Search anywhere on Earth...</span>
          </div>
          <kbd className="hidden sm:inline-block font-mono text-[10px] bg-slate-800 border border-slate-700 text-slate-400 px-1.5 py-0.5 rounded">
            Ctrl K
          </kbd>
        </button>

        {/* Mode Switchers & Utilities */}
        <div className="flex items-center gap-2">
          {/* Explore / Globe Mode */}
          <button
            onClick={() => {
              setMode('explore');
            }}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition border flex items-center gap-1.5 ${
              mode === 'explore'
                ? 'bg-lime-400 text-slate-950 border-lime-300 shadow-md shadow-lime-400/20'
                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-700/80'
            }`}
          >
            <Globe className="w-3.5 h-3.5" /> Orbit
          </button>

          {/* Street Walk Mode */}
          <button
            onClick={() => setMode('street')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition border flex items-center gap-1.5 ${
              mode === 'street'
                ? 'bg-lime-400 text-slate-950 border-lime-300 shadow-md shadow-lime-400/20'
                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-700/80'
            }`}
          >
            <Footprints className="w-3.5 h-3.5" /> Walk
          </button>

          {/* Signal Hunt Game Mode */}
          <button
            onClick={startSignalHunt}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition border flex items-center gap-1.5 ${
              mode === 'hunt'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-slate-900/80 hover:bg-slate-800 text-amber-300 border-amber-500/30'
            }`}
          >
            <Flame className="w-3.5 h-3.5" /> Transmitter Hunt
          </button>

          {/* Radio Detective Game Mode */}
          <button
            onClick={startDetectiveMystery}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition border flex items-center gap-1.5 ${
              mode === 'detective'
                ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/20'
                : 'bg-slate-900/80 hover:bg-slate-800 text-purple-300 border-purple-500/30'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" /> Detective
          </button>

          {/* Surprise Me / Random Station */}
          <button
            onClick={handleRandomStation}
            className="p-2 bg-slate-900/80 hover:bg-slate-800 text-lime-300 border border-slate-700/80 rounded-xl transition"
            title="Teleport to Random Station (S)"
          >
            <Shuffle className="w-4 h-4" />
          </button>

          {/* Coins Purse */}
          <div
            className="hidden sm:flex items-center gap-1.5 font-mono text-xs font-bold text-amber-300 bg-amber-950/70 border border-amber-500/40 px-2.5 py-1.5 rounded-xl shadow"
            title="Coins earned from exploring, mystery games & fishing"
          >
            <Coins className="w-3.5 h-3.5 text-amber-400" /> {coins}
          </div>

          {/* Adventure Backpack */}
          <button
            onClick={() => setIsBackpackOpen(true)}
            className="px-3 py-1.5 bg-slate-900/80 hover:bg-slate-800 text-lime-300 border border-slate-700/80 rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95 shadow"
            title="Open Adventure Backpack (Souvenirs, Food, Records, Fish)"
          >
            <Backpack className="w-3.5 h-3.5 text-lime-400" /> Backpack ({backpack.length})
          </button>

          {/* Passport */}
          <button
            onClick={() => setIsPassportOpen(true)}
            className="px-3 py-1.5 bg-slate-900/80 hover:bg-slate-800 text-lime-300 border border-slate-700/80 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5" /> Passport ({passportEntries.length})
          </button>

          {/* Gemini AI Guide */}
          <button
            onClick={() => setIsGuideOpen(!isGuideOpen)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border flex items-center gap-1.5 ${
              isGuideOpen
                ? 'bg-indigo-600 text-white border-indigo-400'
                : 'bg-slate-900/80 hover:bg-slate-800 text-indigo-300 border-indigo-500/30'
            }`}
          >
            <Bot className="w-3.5 h-3.5" /> Gemini AI Guide
          </button>

          {/* DLSS 5 Neural Rendering Button */}
          <button
            onClick={() => setIsDlssModalOpen(true)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border flex items-center gap-1.5 ${
              dlss5.getConfig().enabled
                ? 'bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-300 border-emerald-400 shadow-md shadow-emerald-500/10'
                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 border-slate-700/80'
            }`}
            title="NVIDIA DLSS 5 Neural Rendering Settings"
          >
            <Zap className={`w-3.5 h-3.5 ${dlss5.getConfig().enabled ? 'fill-emerald-400 text-emerald-400' : 'text-slate-500'}`} />
            <span>DLSS 5</span>
          </button>
        </div>
      </header>

      {/* Main View Port */}
      <main
        className="w-full h-full relative transition-all duration-300"
        style={{
          filter: dlss5.getConfig().enabled
            ? `contrast(${dlss5.getConfig().hdrUplift ? 1.08 : 1.0}) saturate(${dlss5.getConfig().hdrUplift ? 1.15 : 1.0})`
            : 'none'
        }}
      >
        {mode === 'explore' ? (
          <WorldGlobe
            stations={stations}
            activeStation={activeStation}
            onSelectStation={handleSelectStation}
          />
        ) : (
          activeStation && (
            <StreetWalker
              station={activeStation}
              playerCoords={playerCoords}
              environment={locationEnvironment}
              onMovePlayer={setPlayerCoords}
              geminiApiKey={geminiApiKey}
              onStartBicycle={() => setActivityMode('bike')}
              onStartBoating={() => setActivityMode('boat')}
              onStartSurfing={() => setActivityMode('surf')}
              onOpenFishing={() => setActivityMode('fishing')}
              onOpenRooftopBeat={() => setActivityMode('dj')}
              onStartDesertBuggy={() => setActivityMode('buggy')}
              onStartAlpineSki={() => setActivityMode('ski')}
              onOpenMarket={() => setActivityMode('market')}
              onTakePhoto={() => setActivityMode('photo')}
              onOpenBackpack={() => setIsBackpackOpen(true)}
            />
          )
        )}
      </main>

      {/* City Drawer (Radio Garden / OpenRadio style side panel) */}
      <CityDrawer
        place={selectedPlace}
        environment={locationEnvironment}
        stations={cityStations}
        activeStation={activeStation}
        isPlaying={isPlaying}
        isOpen={isCityDrawerOpen && mode === 'explore'}
        onClose={() => setIsCityDrawerOpen(false)}
        onSelectStation={handleSelectStation}
        onWalkCity={() => {
          setIsCityDrawerOpen(false);
          setMode('street');
        }}
        onStartHunt={() => {
          setIsCityDrawerOpen(false);
          startSignalHunt();
        }}
        favorites={favorites}
        onToggleFavorite={handleToggleFavorite}
        onOpenMarket={() => setActivityMode('market')}
        onOpenFishing={() => setActivityMode('fishing')}
        onOpenRooftopBeat={() => setActivityMode('dj')}
        onStartDesertBuggy={() => setActivityMode('buggy')}
        onStartAlpineSki={() => {
          setIsCityDrawerOpen(false);
          setActivityMode('ski');
        }}
        onStartBicycle={() => {
          setIsCityDrawerOpen(false);
          setActivityMode('bike');
        }}
        onStartBoating={() => {
          setIsCityDrawerOpen(false);
          setActivityMode('boat');
        }}
        onStartSurfing={() => {
          setIsCityDrawerOpen(false);
          setActivityMode('surf');
        }}
        onTakePhoto={() => {
          setIsCityDrawerOpen(false);
          setMode('street');
          setActivityMode('photo');
        }}
      />

      {/* ARDF Radio Direction Finding (Fox Hunt) Simulation */}
      <SignalHuntModal
        isOpen={mode === 'hunt'}
        onClose={() => setMode('explore')}
        huntState={huntState}
        activeStation={activeStation}
        onStepCloser={handleHuntStep}
        onClaimVictory={() => {
          if (activeStation) stampPassport(activeStation);
          handleEarnCoins(100);
          setMode('explore');
        }}
      />

      {/* Geospatial & Audio Forensics Crime Lab Modal */}
      <DetectiveLabModal
        isOpen={mode === 'detective'}
        onClose={() => setMode('explore')}
        detectiveState={detectiveState}
        activeStation={activeStation}
        onGuessCoords={handleGuessDetective}
        onNewMystery={startDetectiveMystery}
        mysteryClue={mysteryClue}
        onAddCoins={handleEarnCoins}
      />

      {/* Bottom Sticky Radio Player */}
      <RadioPlayerBar
        station={activeStation}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        onEnterStreetWalk={() => setMode(mode === 'street' ? 'explore' : 'street')}
        isStreetMode={mode === 'street'}
        onPrevStation={handlePrevStation}
        onNextStation={handleNextStation}
        isFavorite={activeStation ? !!favorites[activeStation.id] : false}
        onToggleFavorite={() => activeStation && handleToggleFavorite(activeStation)}
        isRecording={isRecording}
        recordDuration={recordDuration}
        onToggleRecord={handleToggleRecord}
      />

      {/* Gamepad HUD Indicator */}
      {gamepadConnected && (
        <GamepadHUD
          controllerName={gamepadName}
          isStreetMode={mode === 'street'}
          isRecording={isRecording}
        />
      )}

      {/* Passport Modal */}
      <PassportModal
        isOpen={isPassportOpen}
        onClose={() => setIsPassportOpen(false)}
        entries={passportEntries}
      />

      {/* Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        onSelectStation={handleSelectStation}
        onSelectPlace={handleSelectPlace}
        favorites={favorites}
      />

      {/* Gemini AI Local Guide Panel */}
      <GeminiGuidePanel
        apiKey={geminiApiKey}
        onSaveApiKey={handleSaveGeminiKey}
        activeStation={activeStation}
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      {/* DLSS 5 Neural Rendering Performance HUD */}
      <Dlss5Overlay
        gpuInfo={gpuInfo}
        onOpenModal={() => setIsDlssModalOpen(true)}
        configVersion={dlssConfigVersion}
      />

      {/* DLSS 5 Configuration Modal */}
      <Dlss5Modal
        isOpen={isDlssModalOpen}
        onClose={() => setIsDlssModalOpen(false)}
        gpuInfo={gpuInfo}
        onConfigChange={() => setDlssConfigVersion(v => v + 1)}
      />

      {/* Full 2.5D Road Cycling Arcade Game */}
      <BicycleGameModal
        isOpen={activityMode === 'bike'}
        onClose={() => setActivityMode('none')}
        cityName={activeStation?.place || selectedPlace?.title || 'City'}
        countryName={activeStation?.country || selectedPlace?.country || 'World'}
        biome={locationEnvironment.biome}
        onEarnCoins={handleEarnCoins}
        highScore={highScores.bike}
        onUpdateHighScore={(s) => handleUpdateHighScore('bike', s)}
      />

      {/* Full Naval Watercraft Navigation Simulator */}
      <BoatingGameModal
        isOpen={activityMode === 'boat'}
        onClose={() => setActivityMode('none')}
        cityName={activeStation?.place || selectedPlace?.title || 'Port'}
        countryName={activeStation?.country || selectedPlace?.country || 'World'}
        waterwayName={locationEnvironment.waterwayName || 'Waterfront Harbor'}
        biome={locationEnvironment.biome}
        onEarnCoins={handleEarnCoins}
        highScore={highScores.boat}
        onUpdateHighScore={(s) => handleUpdateHighScore('boat', s)}
      />

      {/* 2D Depth Cross-Section Fishing Simulator */}
      <FishingGameModal
        isOpen={activityMode === 'fishing'}
        onClose={() => setActivityMode('none')}
        cityName={activeStation?.place || selectedPlace?.title || 'Waterfront'}
        countryName={activeStation?.country || selectedPlace?.country || 'World'}
        waterwayName={locationEnvironment.waterwayName}
        biome={locationEnvironment.biome}
        onAddBackpackItem={handleAddBackpackItem}
        onEarnCoins={handleEarnCoins}
      />

      {/* Rooftop Vinyl DJ Radio Jam (Inland Metropolises) */}
      <RooftopBeatModal
        isOpen={activityMode === 'dj'}
        onClose={() => setActivityMode('none')}
        cityName={activeStation?.place || selectedPlace?.title || 'City'}
        countryName={activeStation?.country || selectedPlace?.country || 'World'}
        stationName={activeStation?.name || 'Local Radio'}
        onEarnCoins={handleEarnCoins}
      />

      {/* Desert Dune Buggy Cruiser (Desert Cities) */}
      <DesertBuggyModal
        isOpen={activityMode === 'buggy'}
        onClose={() => setActivityMode('none')}
        cityName={activeStation?.place || selectedPlace?.title || 'Desert'}
        countryName={activeStation?.country || selectedPlace?.country || 'World'}
        onEarnCoins={handleEarnCoins}
        highScore={highScores.buggy}
        onUpdateHighScore={(s) => handleUpdateHighScore('buggy', s)}
      />

      {/* Alpine Slalom & Mountain Descent (Mountain Cities) */}
      <AlpineDownhillModal
        isOpen={activityMode === 'ski'}
        onClose={() => setActivityMode('none')}
        cityName={activeStation?.place || selectedPlace?.title || 'Alps'}
        countryName={activeStation?.country || selectedPlace?.country || 'World'}
        onEarnCoins={handleEarnCoins}
        highScore={highScores.ski}
        onUpdateHighScore={(s) => handleUpdateHighScore('ski', s)}
      />

      {/* Ocean Swell Surfing Simulation (Coastal Ocean Cities) */}
      <SurfingGameModal
        isOpen={activityMode === 'surf'}
        onClose={() => setActivityMode('none')}
        activeStation={activeStation}
        waterwayName={locationEnvironment.waterwayName}
        onAddCoins={handleEarnCoins}
        highScore={highScores.surf}
        onUpdateHighScore={(s) => handleUpdateHighScore('surf', s)}
      />

      {/* Local Store & Market Modal */}
      <MarketShopModal
        isOpen={activityMode === 'market'}
        onClose={() => setActivityMode('none')}
        cityName={activeStation?.place || 'Central'}
        countryName={activeStation?.country || 'World'}
        coins={coins}
        onDeductCoins={handleDeductCoins}
        onAddBackpackItem={handleAddBackpackItem}
        backpackItemIds={backpack.map(b => b.id)}
      />

      {/* Adventure Backpack & Inventory Modal */}
      <BackpackModal
        isOpen={isBackpackOpen}
        onClose={() => setIsBackpackOpen(false)}
        items={backpack}
        onRemoveItem={handleRemoveBackpackItem}
      />

      {/* Postcard Photo Snap Modal */}
      <PhotoSnapModal
        isOpen={activityMode === 'photo'}
        onClose={() => setActivityMode('none')}
        stationName={activeStation?.name || 'Local Radio'}
        cityName={activeStation?.place || 'City'}
        countryName={activeStation?.country || 'World'}
        coords={playerCoords}
        onSaveToBackpack={handleAddBackpackItem}
      />
    </div>
  );
}

function calculateDistanceMeters(
  pos1: { lat: number; lng: number },
  pos2: { lat: number; lng: number }
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (pos1.lat * Math.PI) / 180;
  const φ2 = (pos2.lat * Math.PI) / 180;
  const Δφ = ((pos2.lat - pos1.lat) * Math.PI) / 180;
  const Δλ = ((pos2.lng - pos1.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export default App;
