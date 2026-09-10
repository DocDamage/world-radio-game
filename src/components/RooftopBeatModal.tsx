import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Disc, Music, X, Volume2, Sparkles, Sliders, Trophy, Flame, Zap } from 'lucide-react';
import { soundEffects } from '../services/audioEffects';
import { gamepadManager } from '../services/gamepadManager';
import { MissionHUD } from './MissionHUD';
import { useModalA11y } from '../hooks/useModalA11y';
import type { MissionScenario, MissionResultPayload } from '../missions/types';
import { celebrate } from '../services/celebrate';

interface RooftopBeatModalProps {
  isOpen: boolean;
  onClose: () => void;
  cityName: string;
  countryName: string;
  stationName: string;
  onEarnCoins: (amount: number) => void;
  highScore?: number;
  onUpdateHighScore?: (score: number) => void;
  /** Active World Expedition mission scenario (null = free jam) */
  missionScenario?: MissionScenario | null;
  /** Emitted exactly once when an active mission run settles */
  onMissionResult?: (payload: MissionResultPayload) => void;
}

interface BeatPad {
  id: string;
  name: string;
  key: string;
  color: string;
  frequency: number;
  type: 'kick' | 'snare' | 'hihat' | 'scratch' | 'airhorn' | 'stab' | 'bass' | 'siren';
}

const BEAT_PADS: BeatPad[] = [
  { id: 'p1', name: '808 Kick', key: 'Q', color: 'from-rose-500 to-red-600', frequency: 65, type: 'kick' },
  { id: 'p2', name: 'Trap Snare', key: 'W', color: 'from-amber-400 to-orange-500', frequency: 240, type: 'snare' },
  { id: 'p3', name: 'Crisp Hi-Hat', key: 'E', color: 'from-sky-400 to-blue-500', frequency: 1200, type: 'hihat' },
  { id: 'p4', name: 'Vinyl Scratch', key: 'R', color: 'from-purple-500 to-indigo-600', frequency: 800, type: 'scratch' },
  { id: 'p5', name: 'Soundclash Horn', key: 'A', color: 'from-emerald-400 to-teal-500', frequency: 440, type: 'airhorn' },
  { id: 'p6', name: 'Dub Siren', key: 'S', color: 'from-pink-500 to-rose-600', frequency: 950, type: 'siren' },
  { id: 'p7', name: 'Sub 808', key: 'D', color: 'from-violet-500 to-purple-600', frequency: 50, type: 'bass' },
  { id: 'p8', name: 'Brass Stab', key: 'F', color: 'from-yellow-400 to-amber-500', frequency: 580, type: 'stab' }
];

export const RooftopBeatModal: React.FC<RooftopBeatModalProps> = ({
  isOpen,
  onClose,
  cityName,
  countryName,
  stationName,
  onEarnCoins,
  highScore = 0,
  onUpdateHighScore,
  missionScenario,
  onMissionResult
}) => {
  const [playMode, setPlayMode] = useState<'challenge' | 'jam'>('challenge');
  const [activePads, setActivePads] = useState<Record<string, boolean>>({});
  const [scratchAngle, setScratchAngle] = useState<number>(0);
  const [isScratching, setIsScratching] = useState<boolean>(false);
  const [filterFreq, setFilterFreq] = useState<number>(100); // 0 (lowpass) to 100 (open)
  const [beatCount, setBeatCount] = useState<number>(0);
  const [coinsEarned, setCoinsEarned] = useState<number>(0);

  // Rhythm & Scoring State
  const [sessionScore, setSessionScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [crowdHype, setCrowdHype] = useState<number>(15); // 0 - 100
  const [isFeverMode, setIsFeverMode] = useState<boolean>(false);
  const [beatPulse, setBeatPulse] = useState<boolean>(false);
  const [lastTimingFeedback, setLastTimingFeedback] = useState<string>('');

  const lastScratchYRef = useRef<number>(0);
  const coinsRef = useRef<number>(0);
  const lastBeatTimeRef = useRef<number>(0);
  const feverTimerRef = useRef<number | null>(null);
  const scoreRef = useRef<number>(0);
  const runSettledRef = useRef<boolean>(false);
  const nextBeatTimeRef = useRef<number>(0);

  // Mission context (World Expedition Command), read fresh by handlers.
  const scenarioRef = useRef<MissionScenario | null | undefined>(undefined);
  useEffect(() => {
    scenarioRef.current = missionScenario;
  });
  const missionSettledRef = useRef<boolean>(false);
  const onBeatHitsRef = useRef<number>(0);
  const [missionHits, setMissionHits] = useState<number>(0);

  // Reset mission bookkeeping once per open (refs in the effect, display
  // state adjusted during render — no cascading setState-in-effect)
  useEffect(() => {
    if (!isOpen) return;
    missionSettledRef.current = false;
    onBeatHitsRef.current = 0;
  }, [isOpen]);
  const [prevDjOpen, setPrevDjOpen] = useState(isOpen);
  if (isOpen !== prevDjOpen) {
    setPrevDjOpen(isOpen);
    if (isOpen) setMissionHits(0);
  }

  // Settle the active mission exactly once — only when the set's on-beat hit
  // target is reached. Offbeat-heavy sets and early exits never settle.
  const settleMission = useCallback(() => {
    const scenario = scenarioRef.current;
    if (!scenario || missionSettledRef.current) return;
    missionSettledRef.current = true;
    onMissionResult?.({
      missionId: scenario.missionId,
      gameId: scenario.gameId,
      score: Math.round(scoreRef.current),
      outcome: 'completed',
      stats: {
        onBeatHits: onBeatHitsRef.current,
        sessionScore: Math.round(scoreRef.current)
      }
    });
  }, [onMissionResult]);

  // Beat clock interval derived from the scenario tempo (default 120 BPM)
  const beatIntervalMs = useMemo(
    () => (missionScenario?.bpm ? Math.round(60000 / missionScenario.bpm) : 500),
    [missionScenario]
  );

  // Beat Clock (120 BPM = 500ms per beat)
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      const now = performance.now();
      nextBeatTimeRef.current = now + beatIntervalMs;
      setBeatPulse(true);
      setTimeout(() => setBeatPulse(false), 140);
    }, beatIntervalMs);

    return () => clearInterval(interval);
  }, [isOpen, beatIntervalMs]);

  // Combo multiplier based on streak
  const comboMultiplier = isFeverMode
    ? (combo >= 20 ? 16 : combo >= 12 ? 8 : combo >= 6 ? 4 : 2)
    : (combo >= 20 ? 8 : combo >= 12 ? 4 : combo >= 6 ? 2 : 1);

  // Activate Rooftop Fever Mode
  const triggerFeverMode = useCallback(() => {
    setIsFeverMode(true);
    soundEffects.playCrowdCheer(3.0, 0.22);
    celebrate({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.6 }
    });

    if (feverTimerRef.current) clearTimeout(feverTimerRef.current);
    feverTimerRef.current = window.setTimeout(() => {
      setIsFeverMode(false);
      setCrowdHype(40);
    }, 10000);
  }, []);

  // Trigger sample pad
  const triggerPad = useCallback((pad: BeatPad) => {
    const now = performance.now();
    setActivePads(prev => ({ ...prev, [pad.id]: true }));
    setTimeout(() => {
      setActivePads(prev => ({ ...prev, [pad.id]: false }));
    }, 150);

    // Audio burst
    soundEffects.playRadarPing(pad.frequency, 0.12);
    if (pad.type === 'scratch' || pad.type === 'snare') {
      soundEffects.playStaticBurst(0.06, 0.15);
    }
    gamepadManager.vibrate(40, 0.3, 0.2);

    if (playMode === 'challenge') {
      // Beat timing evaluation against the (mission-tuned) beat clock
      const windowScale = scenarioRef.current?.timingWindowScale ?? 1;
      const diffToBeats = Math.abs((now % beatIntervalMs) - beatIntervalMs / 2); // offset from beat center
      const isPerfect = diffToBeats < 80 * windowScale;
      const isGood = diffToBeats < 150 * windowScale;

      if (isPerfect) {
        setLastTimingFeedback('🔥 PERFECT (+50)');
        setCombo(c => c + 1);
        const pts = 50 * comboMultiplier;
        scoreRef.current += pts;
        setSessionScore(scoreRef.current);
        setCrowdHype(h => Math.min(100, h + 4));
      } else if (isGood) {
        setLastTimingFeedback('✨ GOOD (+25)');
        setCombo(c => c + 1);
        const pts = 25 * comboMultiplier;
        scoreRef.current += pts;
        setSessionScore(scoreRef.current);
        setCrowdHype(h => Math.min(100, h + 2));
      } else {
        setLastTimingFeedback('⚠️ OFFBEAT');
        setCombo(0);
      }

      // Mission progress: every on-beat hit advances the rooftop set
      if ((isPerfect || isGood) && scenarioRef.current && !missionSettledRef.current) {
        onBeatHitsRef.current += 1;
        setMissionHits(onBeatHitsRef.current);
        if (onBeatHitsRef.current >= (scenarioRef.current.targetBeats ?? 48)) {
          settleMission();
        }
      }
    } else {
      // Free Jam mode: creative play
      setLastTimingFeedback('FREE JAM');
      scoreRef.current += 15;
      setSessionScore(scoreRef.current);
      setCrowdHype(h => Math.min(100, h + 1.5));
    }

    if (scoreRef.current > highScore && onUpdateHighScore) {
      onUpdateHighScore(scoreRef.current);
    }

    setBeatCount(b => {
      const next = b + 1;
      if (next % 12 === 0 && coinsRef.current < 45) {
        const bonus = isFeverMode ? 15 : 10;
        coinsRef.current += bonus;
        setCoinsEarned(coinsRef.current);
        soundEffects.playCoinSound();
      }
      return next;
    });
  }, [playMode, comboMultiplier, highScore, isFeverMode, onUpdateHighScore, settleMission, beatIntervalMs]);

  // Keyboard shortcut listener with full input isolation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.stopPropagation();
      const key = e.key.toUpperCase();
      const pad = BEAT_PADS.find(p => p.key === key);
      if (pad) {
        e.preventDefault();
        triggerPad(pad);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, triggerPad]);

  // Natural crowd hype decay & combo reset loop
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      if (!isFeverMode) {
        setCrowdHype(h => Math.max(10, h - 1.5));
      }

      const now = performance.now();
      if (lastBeatTimeRef.current > 0 && (now - lastBeatTimeRef.current) > 2400) {
        setCombo(0);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isOpen, isFeverMode]);

  // Scratch turntable pointer drag handlers (supports mouse + touch)
  const handleTurntablePointerDown = (e: React.PointerEvent) => {
    setIsScratching(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    lastScratchYRef.current = e.clientY;
    soundEffects.playStaticBurst(0.08, 0.2);
  };

  const handleTurntablePointerMove = (e: React.PointerEvent) => {
    if (!isScratching) return;
    const dy = e.clientY - lastScratchYRef.current;
    lastScratchYRef.current = e.clientY;
    setScratchAngle(a => a + dy * 2.5);

    if (Math.abs(dy) > 3) {
      soundEffects.playStaticBurst(0.04, 0.15);
      gamepadManager.vibrate(30, 0.2, 0.1);

      scoreRef.current += 10;
      setSessionScore(scoreRef.current);
      setCrowdHype(h => {
        const next = Math.min(100, h + 1.2);
        if (next >= 100 && !isFeverMode) {
          triggerFeverMode();
        }
        return next;
      });
    }
  };

  const handleTurntablePointerUp = (e: React.PointerEvent) => {
    setIsScratching(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleExit = () => {
    if (coinsRef.current > 0 && !runSettledRef.current) {
      onEarnCoins(coinsRef.current);
      runSettledRef.current = true;
    }
    if (scoreRef.current > highScore && onUpdateHighScore) {
      onUpdateHighScore(scoreRef.current);
    }
    if (feverTimerRef.current) clearTimeout(feverTimerRef.current);
    onClose();
  };

  // Shared modal a11y: Escape to close, focus trap, focus restore
  const { containerRef: dialogRef, dialogProps } = useModalA11y({ isOpen, onClose });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-lg flex items-center justify-center p-3 select-none">
      <div
        ref={dialogRef}
        {...dialogProps}
        className={`relative w-full max-w-4xl bg-slate-950 border rounded-3xl overflow-hidden shadow-2xl flex flex-col text-slate-100 transition-colors duration-300 max-h-[94vh] ${
          isFeverMode ? 'border-pink-500 shadow-pink-500/20 ring-2 ring-pink-500' : 'border-purple-400/40'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-900/90 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl border transition-colors ${
              isFeverMode ? 'bg-pink-500/20 text-pink-400 border-pink-500/40 animate-pulse' : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
            }`}>
              <Disc className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-wide text-slate-100 uppercase">
                  {cityName} Rooftop Vinyl Radio Jam
                </h2>
                {isFeverMode ? (
                  <span className="text-[10px] font-mono bg-pink-950 text-pink-300 border border-pink-500/50 px-2 py-0.5 rounded-full font-bold animate-pulse">
                    ⚡ ROOFTOP FEVER (2X COINS) ⚡
                  </span>
                ) : (
                  <span className="text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full font-bold">
                    LIVE OVER RADIO
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Jamming live with <span className="text-purple-300 font-bold">{stationName}</span> • Build Groove Combos & Hype the Crowd!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-amber-300 bg-amber-950/80 px-2.5 py-1 rounded-xl border border-amber-500/30">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Record: {Math.max(highScore, sessionScore)} pts</span>
            </div>
            <button
              onClick={handleExit}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Telemetry Bar (Score, Groove Combo, Crowd Hype) */}
        <div className="px-6 py-2.5 bg-slate-900/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-slate-400">Session Score: </span>
              <span className="font-bold text-purple-300 text-sm">{sessionScore.toLocaleString()} pts</span>
            </div>

            {/* Mode Switcher */}
            <div className="flex bg-slate-900 p-0.5 rounded-xl border border-slate-800">
              <button
                onClick={() => setPlayMode('challenge')}
                className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition ${
                  playMode === 'challenge'
                    ? 'bg-purple-500 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Beat Challenge
              </button>
              <button
                onClick={() => setPlayMode('jam')}
                className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition ${
                  playMode === 'jam'
                    ? 'bg-purple-500 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Free Jam
              </button>
            </div>

            {/* Beat Metronome Pulse */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-xl">
              <span className="text-[10px] text-slate-400 font-mono">120 BPM</span>
              <span className={`w-2.5 h-2.5 rounded-full transition-all duration-75 ${
                beatPulse ? 'bg-pink-400 shadow-md shadow-pink-500/50 scale-125' : 'bg-slate-700 scale-90'
              }`} />
              {lastTimingFeedback && (
                <span className="text-[10px] font-mono font-bold text-amber-300 ml-1">
                  {lastTimingFeedback}
                </span>
              )}
            </div>

            {combo > 1 && (
              <div className="flex items-center gap-1.5 bg-purple-950/90 border border-purple-500/40 px-2.5 py-0.5 rounded-full text-purple-300 font-black animate-pulse">
                <Flame className="w-3.5 h-3.5 text-orange-400" /> {combo} Combo ({comboMultiplier}x)
              </div>
            )}
          </div>

          {/* Crowd Hype Gauge */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 flex items-center gap-1">
              <Zap className="w-3 h-3 text-pink-400" /> Crowd Hype:
            </span>
            <div className="w-32 h-2.5 bg-slate-800 rounded-full overflow-hidden relative">
              <div
                className={`h-full rounded-full transition-all duration-150 ${
                  isFeverMode ? 'bg-gradient-to-r from-pink-500 to-amber-400 animate-pulse' : 'bg-gradient-to-r from-purple-500 to-pink-500'
                }`}
                style={{ width: `${crowdHype}%` }}
              />
            </div>
            <span className={`font-bold ${isFeverMode ? 'text-pink-400' : 'text-slate-300'}`}>
              {Math.round(crowdHype)}%
            </span>
          </div>
        </div>

        {/* Mission objective banner (World Expedition Command) */}
        <MissionHUD
          scenario={missionScenario}
          progressLabel={`${missionHits} / ${missionScenario?.targetBeats ?? 48} on-beat`}
          secondaryLabel={`Set score ${sessionScore}`}
        />

        {/* Main DJ Deck Content */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Left Column: Interactive Vinyl Turntable */}
          <div className="flex flex-col items-center gap-3 bg-slate-900/60 border border-slate-800 p-6 rounded-3xl">
            <div className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
              <Music className="w-3.5 h-3.5 text-purple-400" /> Technics SL-1200 Direct Drive Platter
            </div>

            {/* Turntable Platter */}
            <div
              onPointerDown={handleTurntablePointerDown}
              onPointerMove={handleTurntablePointerMove}
              onPointerUp={handleTurntablePointerUp}
              onPointerCancel={handleTurntablePointerUp}
              className="relative w-64 h-64 rounded-full bg-slate-950 border-4 border-slate-800 shadow-2xl flex items-center justify-center cursor-grab active:cursor-grabbing group overflow-hidden touch-none"
            >
              {/* Vinyl Grooves */}
              <div
                className="w-full h-full rounded-full border-[18px] border-slate-900 flex items-center justify-center transition-transform duration-75"
                style={{ transform: `rotate(${scratchAngle}deg)` }}
              >
                <div className="w-44 h-44 rounded-full border-[12px] border-slate-800/80 flex items-center justify-center">
                  {/* Vinyl Record Center Label */}
                  <div className={`w-24 h-24 rounded-full bg-gradient-to-tr ${
                    isFeverMode ? 'from-pink-600 to-amber-400' : 'from-purple-600 to-pink-500'
                  } flex flex-col items-center justify-center shadow-inner text-center p-1`}>
                    <div className="text-[9px] font-black text-slate-950 uppercase tracking-tight truncate w-full">
                      {cityName}
                    </div>
                    <div className="text-[8px] font-mono text-slate-900 font-bold">33⅓ RPM</div>
                    <div className="w-3 h-3 rounded-full bg-slate-950 mt-1 border border-white/40" />
                  </div>
                </div>
              </div>

              {/* Tonearm overlay */}
              <div className="absolute top-2 right-4 w-2 h-28 bg-slate-400 origin-top rotate-12 shadow-lg rounded-full pointer-events-none" />
            </div>

            <p className="text-[11px] text-slate-400 text-center max-w-xs">
              Drag up and down on the vinyl to scratch along with the live radio broadcast and pump crowd hype!
            </p>

            {/* Filter Cutoff Slider */}
            <div className="w-full flex items-center gap-3 pt-2 border-t border-slate-800/80">
              <Sliders className="w-4 h-4 text-purple-400" />
              <span className="text-[11px] font-mono text-slate-400">Resonant Filter:</span>
              <input
                type="range"
                min="10"
                max="100"
                value={filterFreq}
                onChange={e => setFilterFreq(parseInt(e.target.value, 10))}
                className="flex-1 accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <span className="text-[11px] font-mono text-purple-400">{filterFreq}%</span>
            </div>
          </div>

          {/* Right Column: 8 MPC Drum / Sampler Pads */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-300">Live MPC Sample Pads:</span>
              <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-amber-400">
                <Sparkles className="w-3.5 h-3.5" /> {beatCount} Beats • +{coinsEarned} Coins
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {BEAT_PADS.map(pad => {
                const isActive = activePads[pad.id];
                return (
                  <button
                    key={pad.id}
                    onClick={() => triggerPad(pad)}
                    className={`h-24 rounded-2xl border p-2 flex flex-col justify-between transition-all select-none active:scale-95 shadow-lg ${
                      isActive
                        ? `bg-gradient-to-br ${pad.color} text-slate-950 border-white scale-95 shadow-xl`
                        : 'bg-slate-900/80 hover:bg-slate-800 text-slate-200 border-slate-800 hover:border-purple-400/50'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[10px] font-mono font-bold bg-slate-950/80 text-slate-300 px-1.5 py-0.5 rounded">
                        [{pad.key}]
                      </span>
                      <Volume2 className="w-3 h-3 text-slate-400" />
                    </div>
                    <div className="text-left font-bold text-xs leading-tight">
                      {pad.name}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="bg-slate-900/40 border border-slate-800 p-3 rounded-2xl text-[11px] text-slate-400 leading-relaxed">
              💡 <strong>Tip:</strong> Tap keys <strong>Q W E R / A S D F</strong> in rhythm with the broadcast beat! Maintain combos to multiply points up to <strong>8x/16x</strong> and trigger <strong>Rooftop Fever</strong>!
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono text-purple-300">Rooftop Studio Session active in {cityName}, {countryName}</span>
          <button
            onClick={handleExit}
            className="px-4 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow"
          >
            Save Session & Bank Coins
          </button>
        </div>
      </div>
    </div>
  );
};
