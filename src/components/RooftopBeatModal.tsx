import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Disc, Music, X, Volume2, Sparkles, Sliders } from 'lucide-react';
import { soundEffects } from '../services/audioEffects';
import { gamepadManager } from '../services/gamepadManager';

interface RooftopBeatModalProps {
  isOpen: boolean;
  onClose: () => void;
  cityName: string;
  countryName: string;
  stationName: string;
  onEarnCoins: (amount: number) => void;
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
  onEarnCoins
}) => {
  const [activePads, setActivePads] = useState<Record<string, boolean>>({});
  const [scratchAngle, setScratchAngle] = useState<number>(0);
  const [isScratching, setIsScratching] = useState<boolean>(false);
  const [filterFreq, setFilterFreq] = useState<number>(100); // 0 (lowpass) to 100 (open)
  const [beatCount, setBeatCount] = useState<number>(0);
  const [coinsEarned, setCoinsEarned] = useState<number>(0);

  const lastScratchYRef = useRef<number>(0);
  const coinsRef = useRef<number>(0);

  // Trigger sample pad
  const triggerPad = useCallback((pad: BeatPad) => {
    setActivePads(prev => ({ ...prev, [pad.id]: true }));
    setTimeout(() => {
      setActivePads(prev => ({ ...prev, [pad.id]: false }));
    }, 150);

    // Play synthesis/audio burst
    soundEffects.playRadarPing(pad.frequency, 0.12);
    if (pad.type === 'scratch' || pad.type === 'snare') {
      soundEffects.playStaticBurst(0.06, 0.15);
    }
    gamepadManager.vibrate(40, 0.3, 0.2);

    setBeatCount(b => {
      const next = b + 1;
      if (next % 12 === 0) {
        // Award jam bonus coins
        coinsRef.current += 10;
        setCoinsEarned(coinsRef.current);
        soundEffects.playCoinSound();
      }
      return next;
    });
  }, []);

  // Keyboard shortcut listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
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

  // Scratch turntable drag handlers
  const handleTurntableMouseDown = (e: React.MouseEvent) => {
    setIsScratching(true);
    lastScratchYRef.current = e.clientY;
    soundEffects.playStaticBurst(0.08, 0.2);
  };

  const handleTurntableMouseMove = (e: React.MouseEvent) => {
    if (!isScratching) return;
    const dy = e.clientY - lastScratchYRef.current;
    lastScratchYRef.current = e.clientY;
    setScratchAngle(a => a + dy * 2.5);

    if (Math.abs(dy) > 3) {
      soundEffects.playStaticBurst(0.04, 0.15);
      gamepadManager.vibrate(30, 0.2, 0.1);
    }
  };

  const handleTurntableMouseUp = () => {
    setIsScratching(false);
  };

  const handleExit = () => {
    if (coinsRef.current > 0) {
      onEarnCoins(coinsRef.current);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-lg flex items-center justify-center p-3 select-none">
      <div className="relative w-full max-w-4xl bg-slate-950 border border-purple-400/40 rounded-3xl overflow-hidden shadow-2xl flex flex-col text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-900/90 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-xl">
              <Disc className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-wide text-slate-100 uppercase">
                  {cityName} Rooftop Vinyl Radio Jam
                </h2>
                <span className="text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full font-bold">
                  LIVE OVER RADIO
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Jamming along with <span className="text-purple-300 font-bold">{stationName}</span> • Scratch vinyl & trigger live beat pads!
              </p>
            </div>
          </div>

          <button
            onClick={handleExit}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main DJ Deck Content */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Left Column: Interactive Vinyl Turntable */}
          <div className="flex flex-col items-center gap-3 bg-slate-900/60 border border-slate-800 p-6 rounded-3xl">
            <div className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
              <Music className="w-3.5 h-3.5 text-purple-400" /> Technics SL-1200 Analog Vinyl Platter
            </div>

            {/* Turntable Platter */}
            <div
              onMouseDown={handleTurntableMouseDown}
              onMouseMove={handleTurntableMouseMove}
              onMouseUp={handleTurntableMouseUp}
              onMouseLeave={handleTurntableMouseUp}
              className="relative w-64 h-64 rounded-full bg-slate-950 border-4 border-slate-800 shadow-2xl flex items-center justify-center cursor-grab active:cursor-grabbing group overflow-hidden"
            >
              {/* Vinyl Grooves */}
              <div
                className="w-full h-full rounded-full border-[18px] border-slate-900 flex items-center justify-center transition-transform duration-75"
                style={{ transform: `rotate(${scratchAngle}deg)` }}
              >
                <div className="w-44 h-44 rounded-full border-[12px] border-slate-800/80 flex items-center justify-center">
                  {/* Vinyl Record Center Label */}
                  <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 flex flex-col items-center justify-center shadow-inner text-center p-1">
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
              Drag up and down on the vinyl to scratch along with the live radio broadcast!
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
              💡 <strong>Tip:</strong> Tap keys <strong>Q W E R / A S D F</strong> in rhythm with the broadcast beat! Every 12 beats earns you bonus Traveler Coins.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono text-purple-300">Rooftop Studio Session active in {cityName}, {countryName}</span>
          <button
            onClick={handleExit}
            className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow"
          >
            Save Session & Bank Coins
          </button>
        </div>
      </div>
    </div>
  );
};
