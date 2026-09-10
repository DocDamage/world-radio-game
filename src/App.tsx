import { useState, useEffect, useCallback, useMemo, useRef, lazy } from 'react';
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
  Zap,
  Compass,
  Eye
} from 'lucide-react';
import type { RadioStation, AppMode, SignalHuntState, DetectiveState, PassportEntry, Place, BackpackItem, ActivityMode } from './types';
import { fetchTopStations, CURATED_STATIONS, loadStationsSnapshot } from './services/radioApi';
import { resolveLocationEnvironment } from './services/activityData';
import { RadioPlayerBar } from './components/RadioPlayerBar';
import { GamepadHUD } from './components/GamepadHUD';
import { Dlss5Overlay } from './components/Dlss5Overlay';
import { soundEffects } from './services/audioEffects';
import { streamRecorder } from './services/recorder';
import { gamepadManager } from './services/gamepadManager';
import { dlss5 } from './services/dlss5Engine';
import { travelerState } from './services/travelerState';
import { inputManager } from './services/inputManager';
import { missionSession } from './missions/session';
import { buildScenario } from './missions/scenarios';
import { MISSION_CATALOG, EXPEDITIONS } from './missions/catalog';
import { MissionResults, type MissionDebriefData } from './components/MissionResults';
import type { GameId, MissionScenario, MissionResultPayload } from './missions/types';

// Code-split heavy 3D Globe, Street View, and Mini-Game Modals to optimize bundle size
const WorldGlobe = lazy(() => import('./components/WorldGlobe').then(m => ({ default: m.WorldGlobe })));
const StreetWalker = lazy(() => import('./components/StreetWalker').then(m => ({ default: m.StreetWalker })));
const SignalHuntModal = lazy(() => import('./components/SignalHuntModal').then(m => ({ default: m.SignalHuntModal })));
const DetectiveLabModal = lazy(() => import('./components/DetectiveLabModal').then(m => ({ default: m.DetectiveLabModal })));
const PassportModal = lazy(() => import('./components/PassportModal').then(m => ({ default: m.PassportModal })));
const GeminiGuidePanel = lazy(() => import('./components/GeminiGuidePanel').then(m => ({ default: m.GeminiGuidePanel })));
const CityDrawer = lazy(() => import('./components/CityDrawer').then(m => ({ default: m.CityDrawer })));
const CommandPalette = lazy(() => import('./components/CommandPalette').then(m => ({ default: m.CommandPalette })));
const Dlss5Modal = lazy(() => import('./components/Dlss5Modal').then(m => ({ default: m.Dlss5Modal })));
const BicycleGameModal = lazy(() => import('./components/BicycleGameModal').then(m => ({ default: m.BicycleGameModal })));
const BoatingGameModal = lazy(() => import('./components/BoatingGameModal').then(m => ({ default: m.BoatingGameModal })));
const FishingGameModal = lazy(() => import('./components/FishingGameModal').then(m => ({ default: m.FishingGameModal })));
const MarketShopModal = lazy(() => import('./components/MarketShopModal').then(m => ({ default: m.MarketShopModal })));
const BackpackModal = lazy(() => import('./components/BackpackModal').then(m => ({ default: m.BackpackModal })));
const PhotoSnapModal = lazy(() => import('./components/PhotoSnapModal').then(m => ({ default: m.PhotoSnapModal })));
const RooftopBeatModal = lazy(() => import('./components/RooftopBeatModal').then(m => ({ default: m.RooftopBeatModal })));
const DesertBuggyModal = lazy(() => import('./components/DesertBuggyModal').then(m => ({ default: m.DesertBuggyModal })));
const AlpineDownhillModal = lazy(() => import('./components/AlpineDownhillModal').then(m => ({ default: m.AlpineDownhillModal })));
const SurfingGameModal = lazy(() => import('./components/SurfingGameModal').then(m => ({ default: m.SurfingGameModal })));
const WorldMonitorModal = lazy(() => import('./components/WorldMonitorModal').then(m => ({ default: m.WorldMonitorModal })));
const MissionBoard = lazy(() => import('./components/MissionBoard').then(m => ({ default: m.MissionBoard })));

export function App() {
  const [stations, setStations] = useState<RadioStation[]>(CURATED_STATIONS);
  const [activeStation, setActiveStation] = useState<RadioStation | null>(CURATED_STATIONS[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [mode, setMode] = useState<AppMode>('explore');
  
  // Keep latest references for stable callbacks
  const stationsRef = useRef(stations);
  stationsRef.current = stations;
  const activeStationRef = useRef(activeStation);
  activeStationRef.current = activeStation;

  // Selected City & City Drawer
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [cityStations, setCityStations] = useState<RadioStation[]>([]);
  const cityStationsRef = useRef(cityStations);
  cityStationsRef.current = cityStations;

  const [isCityDrawerOpen, setIsCityDrawerOpen] = useState<boolean>(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState<boolean>(false);
  const [isPassportOpen, setIsPassportOpen] = useState<boolean>(false);
  const [isBackpackOpen, setIsBackpackOpen] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isDlssModalOpen, setIsDlssModalOpen] = useState<boolean>(false);
  const [isMissionBoardOpen, setIsMissionBoardOpen] = useState<boolean>(false);
  const [isWorldMonitorOpen, setIsWorldMonitorOpen] = useState<boolean>(false);

  // Active mission run: scenario params passed into the game, and the debrief
  // shown once missionSession settles the run (coins/XP/medal/expedition).
  const [missionScenario, setMissionScenario] = useState<MissionScenario | null>(null);
  const [missionDebrief, setMissionDebrief] = useState<MissionDebriefData | null>(null);

  // Synchronize traveler state reactively
  const [traveler, setTraveler] = useState(() => travelerState.getState());
  useEffect(() => {
    return travelerState.subscribe(() => {
      setTraveler({ ...travelerState.getState() });
    });
  }, []);

  const coins = traveler.coins;
  const backpack = traveler.backpack;
  const passportEntries = traveler.passport;
  const favorites = traveler.favorites;
  const highScores = traveler.highScores;

  // Gemini API Key (saved in localStorage)
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    return localStorage.getItem('world_radio_gemini_key') || '';
  });

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

  // Radio Detective Mystery State (with complete mystery isolation)
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
  const [dlssConfigVersion, setDlssConfigVersion] = useState<number>(0);

  // Activities State
  const [activityMode, setActivityMode] = useState<ActivityMode>('none');

  // Sync Input Manager states
  useEffect(() => {
    inputManager.setStreetActive(mode === 'street');
  }, [mode]);

  useEffect(() => {
    inputManager.setActiveGame(activityMode !== 'none' ? activityMode : null);
  }, [activityMode]);

  useEffect(() => {
    if (isPaletteOpen) inputManager.registerModalOpen('palette');
    else inputManager.registerModalClose('palette');
  }, [isPaletteOpen]);

  useEffect(() => {
    if (isCityDrawerOpen) inputManager.registerModalOpen('city');
    else inputManager.registerModalClose('city');
  }, [isCityDrawerOpen]);

  useEffect(() => {
    if (isPassportOpen) inputManager.registerModalOpen('passport');
    else inputManager.registerModalClose('passport');
  }, [isPassportOpen]);

  useEffect(() => {
    if (isBackpackOpen) inputManager.registerModalOpen('backpack');
    else inputManager.registerModalClose('backpack');
  }, [isBackpackOpen]);

  useEffect(() => {
    if (isMissionBoardOpen) inputManager.registerModalOpen('mission');
    else inputManager.registerModalClose('mission');
  }, [isMissionBoardOpen]);

  useEffect(() => {
    if (isWorldMonitorOpen) inputManager.registerModalOpen('monitor');
    else inputManager.registerModalClose('monitor');
  }, [isWorldMonitorOpen]);

  useEffect(() => {
    if (isGuideOpen) inputManager.registerModalOpen('guide');
    else inputManager.registerModalClose('guide');
  }, [isGuideOpen]);

  useEffect(() => {
    if (isDlssModalOpen) inputManager.registerModalOpen('dlss');
    else inputManager.registerModalClose('dlss');
  }, [isDlssModalOpen]);

  // High score updater
  const handleUpdateHighScore = useCallback((game: string, score: number) => {
    travelerState.updateHighScore(game, score);
  }, []);

  // Dynamic Location Environment & Biome (Coastal, River, Urban, Desert, Alpine)
  const locationEnvironment = useMemo(() => {
    const placeName = selectedPlace?.title || activeStation?.place || '';
    const countryName = selectedPlace?.country || activeStation?.country || '';
    const lat = activeStation?.geo_lat ?? (selectedPlace ? selectedPlace.geo[1] : 0);
    const lng = activeStation?.geo_long ?? (selectedPlace ? selectedPlace.geo[0] : 0);
    return resolveLocationEnvironment(placeName, countryName, lat, lng);
  }, [selectedPlace, activeStation]);

  // Coins management
  const handleEarnCoins = useCallback((amount: number) => {
    travelerState.addCoins(amount);
  }, []);

  const handleDeductCoins = useCallback((amount: number): boolean => {
    return travelerState.deductCoins(amount);
  }, []);

  // Backpack item management
  const handleAddBackpackItem = useCallback((item: BackpackItem) => {
    travelerState.settleReward(item.id, { backpackItem: item });
  }, []);

  const handleRemoveBackpackItem = useCallback((id: string) => {
    travelerState.sellItem(id);
  }, []);

  const handleSellItem = useCallback((id: string) => {
    travelerState.sellItem(id);
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

  // Toggle Favorite (single source of truth: travelerState store)
  const handleToggleFavorite = (station: RadioStation) => {
    travelerState.toggleFavorite(station);
  };

  // Add a station visit to Passport (store handles duplicate stamps + XP award)
  const stampPassport = (station: RadioStation) => {
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
    travelerState.addPassportEntry(newEntry);
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

  const handleFastTravelPassport = useCallback((entry: PassportEntry) => {
    const station: RadioStation = stations.find(s => s.id === entry.stationUuid) || {
      id: entry.stationUuid,
      name: entry.stationName,
      place: entry.city,
      country: entry.country,
      countryCode: entry.countryCode,
      geo_lat: entry.coordinates.lat,
      geo_long: entry.coordinates.lng,
      streamUrl: '',
      tags: entry.genre
    };
    handleSelectStation(station);
    setMode('street');
  }, [stations]);

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
        // Award the +100 find bonus only on the transition into the success
        // radius — staying inside (or re-entering) must not re-award the score
        score: found && !prev.found ? prev.score + 100 : prev.score
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

    // Mystery isolation: the opening clue must never name the target city or
    // country — the player deduces it from street view + forensic clues only
    setMysteryClue(
      'An uncataloged broadcast is on the air. Study the street view, the forensic signal readouts, and the radio metadata to pinpoint the transmitter city on the map.'
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

  // Launch a mini-game from the Mission Board. When launched for an active
  // mission, the game receives that mission's scenario so the run counts.
  // 'hunt' and 'detective' are world modes; the rest are activity modals.
  const handleLaunchGame = (gameId: GameId, missionId?: string) => {
    const session = missionSession.getCurrentSession();
    const missionActive = Boolean(
      missionId && session && session.mission.id === missionId && !session.completed
    );
    setMissionScenario(
      missionActive && session ? buildScenario(session.mission, session.chosenOptionId) : null
    );
    setMissionDebrief(null);
    if (gameId === 'hunt') {
      startSignalHunt();
      return;
    }
    if (gameId === 'detective') {
      startDetectiveMystery();
      return;
    }
    setActivityMode(gameId as ActivityMode);
  };

  // Settle a finished mission run: medal-scaled coins/XP are awarded exactly
  // once by missionSession, any active expedition advances, then we debrief.
  const handleMissionResult = useCallback((payload: MissionResultPayload) => {
    const session = missionSession.getCurrentSession();
    if (!session || session.mission.id !== payload.missionId) return;
    const result = missionSession.completeCurrentMission(payload.score);
    if (!result.success) return;

    let expedition: MissionDebriefData['expedition'] = null;
    if (session.expeditionId) {
      const exp = EXPEDITIONS.find(e => e.id === session.expeditionId);
      const active = missionSession.getActiveExpedition();
      if (exp) {
        const nextMission = result.nextMissionId
          ? MISSION_CATALOG.find(m => m.id === result.nextMissionId)
          : undefined;
        expedition = {
          title: exp.title,
          stageIndex: result.isExpeditionComplete
            ? exp.stageMissionIds.length
            : (active?.stageIndex ?? 0),
          totalStages: exp.stageMissionIds.length,
          nextMissionId: nextMission?.id,
          nextMissionTitle: nextMission?.title,
          nextMissionPlayable: nextMission?.status === 'live',
          isComplete: result.isExpeditionComplete
        };
      }
    }

    setMissionDebrief({
      missionTitle: session.mission.title,
      missionSubtitle: session.mission.subtitle,
      medal: result.medal,
      score: payload.score,
      thresholds: session.mission.medalThresholds,
      coinsAwarded: result.coinsAwarded,
      xpAwarded: result.xpAwarded,
      outcome: payload.outcome,
      stats: payload.stats,
      expedition
    });
  }, []);

  const closeMissionDebrief = () => {
    setMissionDebrief(null);
    setMissionScenario(null);
    setActivityMode('none'); // the finished game modal is still open underneath
    setMode(m => (m === 'hunt' || m === 'detective' ? 'explore' : m));
  };

  // Continue an in-progress expedition: start the next leg's session and jump in
  const continueExpeditionLeg = () => {
    const debrief = missionDebrief;
    setMissionDebrief(null);
    const nextId = debrief?.expedition?.nextMissionId;
    if (!nextId) return;
    const mission = MISSION_CATALOG.find(m => m.id === nextId);
    const active = missionSession.getActiveExpedition();
    if (!mission || mission.status !== 'live' || !active) return;
    missionSession.startMission(mission.id, mission.choices[0]?.id, active.expeditionId, active.stageIndex);
    setMissionScenario(buildScenario(mission, mission.choices[0]?.id));
    if (mission.gameId === 'hunt') {
      startSignalHunt();
      return;
    }
    if (mission.gameId === 'detective') {
      startDetectiveMystery();
      return;
    }
    setActivityMode(mission.gameId as ActivityMode);
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
      setIsMissionBoardOpen(false);
      setIsWorldMonitorOpen(false);
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

          {/* World Expedition Command (Missions & Expeditions) */}
          <button
            onClick={() => setIsMissionBoardOpen(true)}
            className="px-3 py-1.5 bg-slate-900/80 hover:bg-slate-800 text-lime-300 border border-lime-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            title="World Expedition Command — mission board & expeditions"
          >
            <Compass className="w-3.5 h-3.5 text-lime-400" /> Missions
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

          {/* World Monitor & Camera Wall */}
          <button
            onClick={() => setIsWorldMonitorOpen(true)}
            className="px-3 py-1.5 bg-slate-900/80 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            title="World Monitor — public cameras & live seismic feed"
          >
            <Eye className="w-3.5 h-3.5 text-emerald-400" /> Monitor
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
        onClose={() => { setMode('explore'); setMissionScenario(null); }}
        huntState={huntState}
        activeStation={activeStation}
        onStepCloser={handleHuntStep}
        onClaimVictory={() => {
          if (activeStation) stampPassport(activeStation);
          handleEarnCoins(100);
          setMode('explore');
        }}
        missionScenario={missionScenario}
        onMissionResult={handleMissionResult}
      />

      {/* Geospatial & Audio Forensics Crime Lab Modal */}
      <DetectiveLabModal
        isOpen={mode === 'detective'}
        onClose={() => { setMode('explore'); setMissionScenario(null); }}
        detectiveState={detectiveState}
        activeStation={activeStation}
        onGuessCoords={handleGuessDetective}
        onNewMystery={startDetectiveMystery}
        mysteryClue={mysteryClue}
        onAddCoins={handleEarnCoins}
        missionScenario={missionScenario}
        onMissionResult={handleMissionResult}
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
        onFastTravel={handleFastTravelPassport}
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

      {/* World Expedition Command (Missions & Expeditions) */}
      <MissionBoard
        isOpen={isMissionBoardOpen}
        onClose={() => setIsMissionBoardOpen(false)}
        currentCity={activeStation?.place || selectedPlace?.title || ''}
        currentCountry={activeStation?.country || selectedPlace?.country || ''}
        onLaunchGame={handleLaunchGame}
      />

      {/* World Monitor & Camera Wall */}
      <WorldMonitorModal
        isOpen={isWorldMonitorOpen}
        onClose={() => setIsWorldMonitorOpen(false)}
        activeCity={activeStation?.place || selectedPlace?.title || ''}
        activeCountry={activeStation?.country || selectedPlace?.country || ''}
        activeStationName={activeStation?.name || ''}
      />

      {/* Mission debrief (medal, rewards, expedition progress) */}
      {missionDebrief && (
        <MissionResults
          data={missionDebrief}
          onClose={closeMissionDebrief}
          onNextMission={continueExpeditionLeg}
        />
      )}

      {/* Full 2.5D Road Cycling Arcade Game */}
      <BicycleGameModal
        isOpen={activityMode === 'bike'}
        onClose={() => { setActivityMode('none'); setMissionScenario(null); }}
        cityName={activeStation?.place || selectedPlace?.title || 'City'}
        countryName={activeStation?.country || selectedPlace?.country || 'World'}
        biome={locationEnvironment.biome}
        onEarnCoins={handleEarnCoins}
        highScore={highScores.bike}
        onUpdateHighScore={(s) => handleUpdateHighScore('bike', s)}
        missionScenario={missionScenario}
        onMissionResult={handleMissionResult}
      />

      {/* Full Naval Watercraft Navigation Simulator */}
      <BoatingGameModal
        isOpen={activityMode === 'boat'}
        onClose={() => { setActivityMode('none'); setMissionScenario(null); }}
        cityName={activeStation?.place || selectedPlace?.title || 'Port'}
        countryName={activeStation?.country || selectedPlace?.country || 'World'}
        waterwayName={locationEnvironment.waterwayName || 'Waterfront Harbor'}
        biome={locationEnvironment.biome}
        onEarnCoins={handleEarnCoins}
        highScore={highScores.boat}
        onUpdateHighScore={(s) => handleUpdateHighScore('boat', s)}
        missionScenario={missionScenario}
        onMissionResult={handleMissionResult}
      />

      {/* 2D Depth Cross-Section Fishing Simulator */}
      <FishingGameModal
        isOpen={activityMode === 'fishing'}
        onClose={() => { setActivityMode('none'); setMissionScenario(null); }}
        cityName={activeStation?.place || selectedPlace?.title || 'Waterfront'}
        countryName={activeStation?.country || selectedPlace?.country || 'World'}
        waterwayName={locationEnvironment.waterwayName}
        biome={locationEnvironment.biome}
        onAddBackpackItem={handleAddBackpackItem}
        onEarnCoins={handleEarnCoins}
        highScore={highScores.fishing}
        onUpdateHighScore={(s) => handleUpdateHighScore('fishing', s)}
        missionScenario={missionScenario}
        onMissionResult={handleMissionResult}
      />

      {/* Rooftop Vinyl DJ Radio Jam (Inland Metropolises) */}
      <RooftopBeatModal
        isOpen={activityMode === 'dj'}
        onClose={() => { setActivityMode('none'); setMissionScenario(null); }}
        cityName={activeStation?.place || selectedPlace?.title || 'City'}
        countryName={activeStation?.country || selectedPlace?.country || 'World'}
        stationName={activeStation?.name || 'Local Radio'}
        onEarnCoins={handleEarnCoins}
        highScore={highScores.dj}
        onUpdateHighScore={(s) => handleUpdateHighScore('dj', s)}
        missionScenario={missionScenario}
        onMissionResult={handleMissionResult}
      />

      {/* Desert Dune Buggy Cruiser (Desert Cities) */}
      <DesertBuggyModal
        isOpen={activityMode === 'buggy'}
        onClose={() => { setActivityMode('none'); setMissionScenario(null); }}
        cityName={activeStation?.place || selectedPlace?.title || 'Desert'}
        countryName={activeStation?.country || selectedPlace?.country || 'World'}
        onEarnCoins={handleEarnCoins}
        highScore={highScores.buggy}
        onUpdateHighScore={(s) => handleUpdateHighScore('buggy', s)}
        missionScenario={missionScenario}
        onMissionResult={handleMissionResult}
      />

      {/* Alpine Slalom & Mountain Descent (Mountain Cities) */}
      <AlpineDownhillModal
        isOpen={activityMode === 'ski'}
        onClose={() => { setActivityMode('none'); setMissionScenario(null); }}
        cityName={activeStation?.place || selectedPlace?.title || 'Alps'}
        countryName={activeStation?.country || selectedPlace?.country || 'World'}
        onEarnCoins={handleEarnCoins}
        highScore={highScores.ski}
        onUpdateHighScore={(s) => handleUpdateHighScore('ski', s)}
        missionScenario={missionScenario}
        onMissionResult={handleMissionResult}
      />

      {/* Ocean Swell Surfing Simulation (Coastal Ocean Cities) */}
      <SurfingGameModal
        isOpen={activityMode === 'surf'}
        onClose={() => { setActivityMode('none'); setMissionScenario(null); }}
        activeStation={activeStation}
        waterwayName={locationEnvironment.waterwayName}
        onAddCoins={handleEarnCoins}
        highScore={highScores.surf}
        onUpdateHighScore={(s) => handleUpdateHighScore('surf', s)}
        missionScenario={missionScenario}
        onMissionResult={handleMissionResult}
      />

      {/* Local Store & Market Modal */}
      <MarketShopModal
        isOpen={activityMode === 'market'}
        onClose={() => { setActivityMode('none'); setMissionScenario(null); }}
        cityName={activeStation?.place || 'Central'}
        countryName={activeStation?.country || 'World'}
        coins={coins}
        onDeductCoins={handleDeductCoins}
        onAddBackpackItem={handleAddBackpackItem}
        backpackItemIds={backpack.map(b => b.id)}
        backpack={backpack}
        onSellItem={handleSellItem}
        missionScenario={missionScenario}
        onMissionResult={handleMissionResult}
      />

      {/* Adventure Backpack & Inventory Modal */}
      <BackpackModal
        isOpen={isBackpackOpen}
        onClose={() => setIsBackpackOpen(false)}
        items={backpack}
        onRemoveItem={handleRemoveBackpackItem}
        onSellItem={handleSellItem}
      />

      {/* Postcard Photo Snap Modal */}
      <PhotoSnapModal
        isOpen={activityMode === 'photo'}
        onClose={() => { setActivityMode('none'); setMissionScenario(null); }}
        stationName={activeStation?.name || 'Local Radio'}
        cityName={activeStation?.place || 'City'}
        countryName={activeStation?.country || 'World'}
        coords={playerCoords}
        onSaveToBackpack={handleAddBackpackItem}
        missionScenario={missionScenario}
        onMissionResult={handleMissionResult}
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
