import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Fish, Waves, X, RefreshCw, Trophy, AlertCircle } from 'lucide-react';
import { soundEffects } from '../services/audioEffects';
import { gamepadManager } from '../services/gamepadManager';
import { getRegionalFishSpecies } from '../services/activityData';
import type { BackpackItem, FishSpecies, EnvironmentType } from '../types';
import confetti from 'canvas-confetti';

interface FishingGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  cityName: string;
  countryName: string;
  waterwayName: string | null;
  biome: EnvironmentType;
  onAddBackpackItem: (item: BackpackItem) => void;
  onEarnCoins: (amount: number) => void;
  highScore?: number;
  onUpdateHighScore?: (score: number) => void;
}

type FishingPhase = 'aim' | 'cast' | 'waiting' | 'bite' | 'fight' | 'caught' | 'lost';

interface SwimmingFish {
  x: number;
  y: number;
  vx: number;
  species: FishSpecies;
  size: number;
  interested: boolean;
}

export const FishingGameModal: React.FC<FishingGameModalProps> = ({
  isOpen,
  onClose,
  cityName,
  countryName,
  waterwayName,
  biome,
  onAddBackpackItem,
  onEarnCoins,
  highScore = 0,
  onUpdateHighScore
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game phases
  const [phase, setPhase] = useState<FishingPhase>('aim');
  const [castPower, setCastPower] = useState<number>(50); // 0 - 100
  const [tension, setTension] = useState<number>(50); // 0 - 100
  const [catchProgress, setCatchProgress] = useState<number>(20); // 0 - 100
  const [activeFish, setActiveFish] = useState<{ species: FishSpecies; weight: number; coins: number; isRecord: boolean } | null>(null);
  const [streak, setStreak] = useState<number>(0);
  const [screenShake, setScreenShake] = useState<boolean>(false);
  const reelClickTimerRef = useRef<number>(0);

  // Mutable refs for 60fps simulation
  const phaseRef = useRef<FishingPhase>('aim');
  const powerRef = useRef<number>(50);
  const powerDirRef = useRef<number>(1);
  const bobberRef = useRef<{ x: number; y: number; targetX: number; inWater: boolean }>({ x: 120, y: 140, targetX: 350, inWater: false });
  const fishListRef = useRef<SwimmingFish[]>([]);
  const hookedFishRef = useRef<SwimmingFish | null>(null);
  const tensionRef = useRef<number>(50);
  const progressRef = useRef<number>(20);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const reelInputRef = useRef<boolean>(false);
  const biteWaitTimerRef = useRef<number>(0);

  const speciesList = getRegionalFishSpecies(countryName, biome);

  // Cast the fishing line
  const handleCast = useCallback(() => {
    if (phaseRef.current !== 'aim') return;
    phaseRef.current = 'cast';
    setPhase('cast');

    // Calculate landing distance based on power
    const targetX = 220 + (powerRef.current / 100) * 440;
    bobberRef.current.targetX = targetX;
    bobberRef.current.inWater = false;
    soundEffects.playStaticBurst(0.08, 0.1);
    gamepadManager.vibrate(60, 0.4, 0.2);

    setTimeout(() => {
      // Bobber hits water
      bobberRef.current.x = targetX;
      bobberRef.current.y = 155;
      bobberRef.current.inWater = true;
      soundEffects.playSplash();
      gamepadManager.vibrate(120, 0.5, 0.3);

      phaseRef.current = 'waiting';
      setPhase('waiting');
      biteWaitTimerRef.current = 2.5 + Math.random() * 3.5;
    }, 450);
  }, []);

  // Hook strike when bite occurs
  const handleHookStrike = useCallback(() => {
    if (phaseRef.current !== 'bite') return;
    phaseRef.current = 'fight';
    setPhase('fight');
    tensionRef.current = 50;
    progressRef.current = 25;
    soundEffects.playRadarPing(900, 0.15);
    gamepadManager.vibrate(300, 0.8, 0.6);
  }, []);

  // Key controls
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === 'w' || e.key === 'W' || e.key === 'Enter') {
        e.preventDefault();
        if (phaseRef.current === 'aim') {
          handleCast();
        } else if (phaseRef.current === 'bite') {
          handleHookStrike();
        } else if (phaseRef.current === 'fight') {
          reelInputRef.current = true;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === 'w' || e.key === 'W' || e.key === 'Enter') {
        reelInputRef.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isOpen, handleCast, handleHookStrike]);

  // Main 60 FPS Canvas Simulation Loop
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    phaseRef.current = 'aim';
    setPhase('aim');
    powerRef.current = 50;
    powerDirRef.current = 1;
    tensionRef.current = 50;
    progressRef.current = 20;
    bobberRef.current = { x: 120, y: 140, targetX: 350, inWater: false };
    hookedFishRef.current = null;
    setActiveFish(null);

    // Initialize 6 regional fish swimming at various depth layers
    fishListRef.current = speciesList.flatMap(sp => [
      {
        x: 180 + Math.random() * 500,
        y: 200 + Math.random() * 190,
        vx: (Math.random() > 0.5 ? 1 : -1) * (20 + Math.random() * 30),
        species: sp,
        size: sp.rarity === 'Legendary' ? 42 : sp.rarity === 'Rare' ? 32 : 22,
        interested: false
      },
      {
        x: 180 + Math.random() * 500,
        y: 220 + Math.random() * 180,
        vx: (Math.random() > 0.5 ? 1 : -1) * (15 + Math.random() * 25),
        species: sp,
        size: sp.rarity === 'Legendary' ? 38 : sp.rarity === 'Rare' ? 28 : 18,
        interested: false
      }
    ]);

    const simLoop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = currentTime;

      // 1. Aim power oscillation
      if (phaseRef.current === 'aim') {
        powerRef.current += powerDirRef.current * dt * 90;
        if (powerRef.current >= 98) {
          powerRef.current = 98;
          powerDirRef.current = -1;
        } else if (powerRef.current <= 15) {
          powerRef.current = 15;
          powerDirRef.current = 1;
        }
        setCastPower(Math.round(powerRef.current));
      }

      // 2. Fish autonomous swimming
      fishListRef.current.forEach(fish => {
        fish.x += fish.vx * dt;
        if (fish.x > canvas.width - 60) {
          fish.x = canvas.width - 60;
          fish.vx *= -1;
        } else if (fish.x < 140) {
          fish.x = 140;
          fish.vx *= -1;
        }
      });

      // 3. Waiting for bite
      if (phaseRef.current === 'waiting') {
        biteWaitTimerRef.current -= dt;
        if (biteWaitTimerRef.current <= 0) {
          // Fish strikes!
          phaseRef.current = 'bite';
          setPhase('bite');
          soundEffects.playRadarPing(1100, 0.2);
          gamepadManager.vibrate(350, 0.9, 0.7);

          // Select which fish bit
          hookedFishRef.current = fishListRef.current[Math.floor(Math.random() * fishListRef.current.length)];
        }
      }

      // 4. Fighting the hooked fish
      if (phaseRef.current === 'fight') {
        // Natural fish thrashing pulls tension and progress
        const fishStruggle = (Math.sin(currentTime * 0.008) * 14 + (Math.random() - 0.45) * 18) * dt;
        const inSweetSpot = tensionRef.current >= 35 && tensionRef.current <= 65;

        if (reelInputRef.current) {
          // Player reeling in — sweet spot grants +80% torque
          const reelTorque = inSweetSpot ? 36 : 20;
          tensionRef.current = Math.min(100, tensionRef.current + 38 * dt);
          progressRef.current = Math.min(100, progressRef.current + reelTorque * dt);

          if (currentTime - reelClickTimerRef.current > 100) {
            soundEffects.playReelClick();
            reelClickTimerRef.current = currentTime;
          }
        } else {
          // Player feathering / letting out line
          tensionRef.current = Math.max(0, tensionRef.current - 26 * dt + fishStruggle);
          progressRef.current = Math.max(0, progressRef.current - 8 * dt);
        }

        // Screen shake if tension is critically high (> 85%)
        setScreenShake(tensionRef.current > 85);

        // Pull fish towards angler
        if (hookedFishRef.current) {
          hookedFishRef.current.x += (130 - hookedFishRef.current.x) * dt * 0.4;
          hookedFishRef.current.y += (160 - hookedFishRef.current.y) * dt * 0.3;
        }

        // Check line snap or hook lost
        if (tensionRef.current >= 95) {
          // Line snapped!
          phaseRef.current = 'lost';
          setPhase('lost');
          setStreak(0);
          setScreenShake(false);
          soundEffects.playStaticBurst(0.25, 0.2);
          gamepadManager.vibrate(250, 1.0, 0.8);
        } else if (tensionRef.current <= 6 && progressRef.current > 10) {
          // Hook slipped!
          phaseRef.current = 'lost';
          setPhase('lost');
          setStreak(0);
          setScreenShake(false);
        } else if (progressRef.current >= 100) {
          // Caught successfully!
          phaseRef.current = 'caught';
          setPhase('caught');
          setScreenShake(false);
          handleFishLanded();
        }

        setTension(Math.round(tensionRef.current));
        setCatchProgress(Math.round(progressRef.current));
      }

      // ----------------------------------------------------
      // RENDER 2D FISHING SIMULATION CANVAS
      // ----------------------------------------------------
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Sky & Shore
      renderShoreAndSky(ctx, W, H);

      // Deep Water Gradient & Underwater Weeds
      renderUnderwaterCrossSection(ctx, W, H, currentTime);

      // Swimming Fish
      fishListRef.current.forEach(f => {
        renderFishSilhouette(ctx, f);
      });

      // Fishing Rod, Line & Bobber
      renderRodAndBobber(
        ctx,
        bobberRef.current,
        phaseRef.current,
        tensionRef.current,
        currentTime
      );

      animationFrameRef.current = requestAnimationFrame(simLoop);
    };

    animationFrameRef.current = requestAnimationFrame(simLoop);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isOpen, speciesList, streak, highScore, onUpdateHighScore]);

  // Handle successful catch
  const handleFishLanded = () => {
    const sp = hookedFishRef.current?.species || speciesList[0];
    const weight = +(sp.minWeight + Math.random() * (sp.maxWeight - sp.minWeight)).toFixed(2);
    const baseCoins = sp.rarity === 'Legendary' ? 140 : sp.rarity === 'Rare' ? 70 : 35;
    const nextStreak = streak + 1;
    setStreak(nextStreak);
    const multiplier = nextStreak >= 4 ? 3 : nextStreak >= 3 ? 2 : nextStreak >= 2 ? 1.5 : 1;
    const coins = Math.round(baseCoins * multiplier);

    const isRecord = weight > (highScore || 0);
    if (isRecord && onUpdateHighScore) {
      onUpdateHighScore(weight);
    }

    setActiveFish({ species: sp, weight, coins, isRecord });
    soundEffects.playTriumphChime();
    gamepadManager.vibrate(300, 0.7, 0.5);

    confetti({
      particleCount: isRecord ? 130 : 85,
      spread: isRecord ? 85 : 65,
      origin: { y: 0.6 }
    });

    onEarnCoins(coins);
    onAddBackpackItem({
      id: `fish-${Date.now()}`,
      name: `${sp.name} (${weight}kg)`,
      category: 'fish',
      icon: sp.icon,
      city: cityName,
      country: countryName,
      description: `${sp.rarity} trophy catch from ${waterwayName || cityName}. ${sp.funFact}`,
      acquiredAt: new Date().toISOString(),
      priceCoins: coins
    });
  };

  const handleReset = () => {
    phaseRef.current = 'aim';
    setPhase('aim');
    setActiveFish(null);
    tensionRef.current = 50;
    progressRef.current = 20;
    bobberRef.current = { x: 120, y: 140, targetX: 350, inWater: false };
    hookedFishRef.current = null;
    setScreenShake(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-lg flex items-center justify-center p-3 select-none">
      <div className="relative w-full max-w-4xl bg-slate-950 border border-sky-400/40 rounded-3xl overflow-hidden shadow-2xl flex flex-col text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-900/90 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-400/20 text-sky-400 border border-sky-400/30 rounded-xl">
              <Fish className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-wide text-slate-100 uppercase">
                  {waterwayName ? `${waterwayName} Angling` : `${cityName} Waterfront Fishing`}
                </h2>
                <span className="text-[10px] font-mono bg-sky-950 text-sky-400 border border-sky-500/40 px-2 py-0.5 rounded-full font-bold">
                  2D CROSS-SECTION SIMULATOR
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Cast your line into the depths of {cityName}, {countryName} • Authentic regional species!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-amber-300 bg-amber-950/80 px-2.5 py-1 rounded-xl border border-amber-500/30">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Record: {highScore > 0 ? `${highScore} kg` : 'None'}</span>
            </div>
            {streak > 0 && (
              <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-emerald-300 bg-emerald-950/80 px-2.5 py-1 rounded-xl border border-emerald-500/30">
                <span>🔥 Streak: {streak}x ({streak >= 4 ? '3x' : streak >= 3 ? '2x' : streak >= 2 ? '1.5x' : '1x'} Coins)</span>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Simulation Canvas */}
        <div className={`relative w-full h-[450px] bg-slate-950 flex items-center justify-center overflow-hidden ${screenShake ? 'ring-2 ring-rose-500 animate-pulse' : ''}`}>
          <canvas
            ref={canvasRef}
            width={860}
            height={450}
            className="w-full h-full object-cover"
          />

          {/* Phase HUD: Aim Power Meter */}
          {phase === 'aim' && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-slate-950/90 backdrop-blur-md border border-sky-400/40 px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-3">
              <div className="text-xs font-mono text-slate-300">Casting Power:</div>
              <div className="w-36 h-3 bg-slate-800 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-sky-400 to-emerald-400 rounded-full transition-all duration-75"
                  style={{ width: `${castPower}%` }}
                />
              </div>
              <div className="font-mono text-xs font-bold text-sky-400">{castPower}%</div>
            </div>
          )}

          {/* Phase HUD: Strike Alert */}
          {phase === 'bite' && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1 animate-bounce">
              <div className="text-4xl">⚡ 🐟 ⚡</div>
              <div className="text-lg font-black text-amber-400 uppercase tracking-widest bg-slate-950/90 border border-amber-400 px-4 py-1.5 rounded-2xl shadow-2xl">
                FISH ON! HOOK IT NOW!
              </div>
            </div>
          )}

          {/* Phase HUD: Rod Tension Fight Bar */}
          {phase === 'fight' && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-96 bg-slate-950/90 backdrop-blur-md border border-sky-400/40 p-3 rounded-2xl shadow-2xl flex flex-col gap-2">
              <div className="flex justify-between text-xs font-mono font-bold">
                <span className={tension > 80 ? 'text-rose-400 animate-pulse font-black' : tension >= 35 && tension <= 65 ? 'text-emerald-400 font-black' : 'text-slate-300'}>
                  Line Tension: {tension}% {tension > 85 ? '⚠ STRAIN!' : tension >= 35 && tension <= 65 ? '✦ SWEET SPOT' : ''}
                </span>
                <span className="text-sky-400">Reel Progress: {catchProgress}%</span>
              </div>

              {/* Tension Bar with Sweet Spot Indicators */}
              <div className="w-full h-4 bg-slate-900 rounded-full overflow-hidden p-0.5 relative border border-slate-800">
                {/* Sweet Spot Band (35% to 65%) */}
                <div
                  className="absolute top-0 bottom-0 bg-emerald-500/25 border-x border-emerald-400/60 pointer-events-none"
                  style={{ left: '35%', width: '30%' }}
                />
                <div
                  className={`h-full rounded-full transition-all duration-75 ${
                    tension > 85
                      ? 'bg-rose-500 shadow-md shadow-rose-500/50'
                      : tension >= 35 && tension <= 65
                      ? 'bg-emerald-400 shadow-md shadow-emerald-400/50'
                      : 'bg-amber-400'
                  }`}
                  style={{ width: `${tension}%` }}
                />
              </div>

              {/* Sweet spot status indicator */}
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="text-slate-400">Slack</span>
                <span className={tension >= 35 && tension <= 65 ? "text-emerald-400 font-bold" : "text-slate-500"}>
                  ✦ GREEN ZONE: +80% REEL TORQUE ✦
                </span>
                <span className="text-slate-400">Snap (95%)</span>
              </div>

              {/* Catch Progress */}
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-400 transition-all duration-100"
                  style={{ width: `${catchProgress}%` }}
                />
              </div>

              <div className="text-[10px] text-center text-slate-400">
                Hold REEL while fish struggles • Stay in the safe green zone!
              </div>
            </div>
          )}

          {/* Phase HUD: Caught Celebration Card */}
          {phase === 'caught' && activeFish && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-slate-950/95 border border-emerald-400/60 p-6 rounded-3xl shadow-2xl flex flex-col items-center gap-2 text-center animate-in zoom-in-95 duration-200">
              {activeFish.isRecord && (
                <div className="bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-xs px-3 py-1 rounded-full uppercase tracking-wider animate-bounce shadow-lg flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5" /> NEW PERSONAL BEST RECORD!
                </div>
              )}
              <div className="text-5xl">{activeFish.species.icon}</div>
              <h3 className="text-xl font-black text-emerald-300">{activeFish.species.name}</h3>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="bg-emerald-950 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/40 font-bold">
                  {activeFish.species.rarity}
                </span>
                <span className="text-slate-300">Weight: {activeFish.weight} kg</span>
                <span className="text-amber-400 font-bold">+{activeFish.coins} Coins</span>
              </div>
              <p className="text-xs text-slate-400 italic max-w-sm mt-1">"{activeFish.species.funFact}"</p>
              <div className="text-[11px] font-mono text-emerald-400 mt-2">✓ Safely stored in your Adventure Backpack</div>
            </div>
          )}

          {/* Phase HUD: Lost Line Snap Alert */}
          {phase === 'lost' && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-slate-950/95 border border-rose-500/60 p-5 rounded-3xl shadow-2xl flex flex-col items-center gap-2 text-center">
              <AlertCircle className="w-10 h-10 text-rose-500" />
              <div className="text-lg font-black text-rose-400 uppercase">The Fish Got Away!</div>
              <p className="text-xs text-slate-400 max-w-xs">
                Line tension was pushed too high or went completely slack.
              </p>
            </div>
          )}

          {/* Bottom Interactive Action Buttons */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
            {phase === 'aim' && (
              <button
                onClick={handleCast}
                className="px-6 py-3 bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-300 hover:to-blue-400 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-sky-400/20 active:scale-95 flex items-center gap-2"
              >
                <Waves className="w-4 h-4" /> Cast Line (Space / Enter)
              </button>
            )}

            {phase === 'waiting' && (
              <div className="px-5 py-2.5 bg-slate-900/90 text-sky-300 rounded-2xl border border-sky-400/30 text-xs font-mono flex items-center gap-2">
                <Waves className="w-4 h-4 animate-spin" /> Bobber floating... waiting for nibbles...
              </div>
            )}

            {phase === 'bite' && (
              <button
                onClick={handleHookStrike}
                className="px-8 py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black text-base rounded-2xl shadow-2xl shadow-amber-400/40 active:scale-90 animate-pulse flex items-center gap-2"
              >
                🎣 STRIKE & HOOK!
              </button>
            )}

            {phase === 'fight' && (
              <button
                onMouseDown={() => (reelInputRef.current = true)}
                onMouseUp={() => (reelInputRef.current = false)}
                onTouchStart={() => (reelInputRef.current = true)}
                onTouchEnd={() => (reelInputRef.current = false)}
                className="px-8 py-3 bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-emerald-400/30 active:scale-90 flex items-center gap-2"
              >
                🔄 HOLD TO REEL! (Spacebar)
              </button>
            )}

            {(phase === 'caught' || phase === 'lost') && (
              <button
                onClick={handleReset}
                className="px-6 py-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-sm rounded-2xl shadow-xl transition flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Cast Again
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span>Local Waters: <strong>{speciesList.map(s => s.name.split(' ')[0]).join(', ')}</strong></span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
          >
            <Trophy className="w-3.5 h-3.5" /> Close Tackle Box
          </button>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// RENDER HELPERS (2D Depth Cross-Section Simulation)
// ----------------------------------------------------------------------

function renderShoreAndSky(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const waterSurfaceY = 150;

  // Sky
  const skyGrad = ctx.createLinearGradient(0, 0, 0, waterSurfaceY);
  skyGrad.addColorStop(0, '#0f172a');
  skyGrad.addColorStop(1, '#38bdf8');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, waterSurfaceY);

  // Left Stone Pier / Angler Platform
  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 110, 110, waterSurfaceY - 110);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 110, 110, waterSurfaceY - 110);

  // Pier wood pilings down into water
  ctx.fillStyle = '#78350f';
  ctx.fillRect(30, waterSurfaceY, 14, H - waterSurfaceY);
  ctx.fillRect(85, waterSurfaceY, 14, H - waterSurfaceY);

  // Angler silhouette standing on pier
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(65, 80, 8, 0, Math.PI * 2); // Head
  ctx.fill();
  ctx.fillRect(60, 88, 10, 22); // Torso & Legs
}

function renderUnderwaterCrossSection(ctx: CanvasRenderingContext2D, W: number, H: number, time: number) {
  const waterSurfaceY = 150;

  // Depth Water Gradient
  const waterGrad = ctx.createLinearGradient(0, waterSurfaceY, 0, H);
  waterGrad.addColorStop(0, '#0284c7'); // Shallows
  waterGrad.addColorStop(0.5, '#0369a1'); // Mid-depth
  waterGrad.addColorStop(1, '#082f49'); // Deep riverbed
  ctx.fillStyle = waterGrad;
  ctx.fillRect(0, waterSurfaceY, W, H - waterSurfaceY);

  // Water Surface Ripple Line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 110; x < W; x += 15) {
    const y = waterSurfaceY + Math.sin((x + time * 0.05) * 0.04) * 2.5;
    if (x === 110) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Riverbed Sand & Rocks
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.moveTo(0, H);
  ctx.lineTo(0, H - 25);
  ctx.quadraticCurveTo(W * 0.3, H - 40, W * 0.6, H - 20);
  ctx.quadraticCurveTo(W * 0.85, H - 45, W, H - 30);
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();

  // Swaying underwater weeds
  ctx.strokeStyle = '#15803d';
  ctx.lineWidth = 4;
  for (let wx = 160; wx < W - 50; wx += 90) {
    const sway = Math.sin((wx + time * 0.03) * 0.02) * 12;
    ctx.beginPath();
    ctx.moveTo(wx, H - 25);
    ctx.quadraticCurveTo(wx + sway, H - 75, wx + sway * 1.5, H - 110);
    ctx.stroke();
  }
}

function renderFishSilhouette(ctx: CanvasRenderingContext2D, fish: SwimmingFish) {
  ctx.save();
  ctx.translate(fish.x, fish.y);
  if (fish.vx < 0) ctx.scale(-1, 1);

  const L = fish.size;

  // Fish body
  ctx.fillStyle = fish.species.rarity === 'Legendary' ? '#f59e0b' : fish.species.rarity === 'Rare' ? '#38bdf8' : '#64748b';
  ctx.beginPath();
  ctx.ellipse(0, 0, L, L * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tail fin
  ctx.beginPath();
  ctx.moveTo(-L * 0.9, 0);
  ctx.lineTo(-L * 1.4, -L * 0.4);
  ctx.lineTo(-L * 1.4, L * 0.4);
  ctx.closePath();
  ctx.fill();

  // Eye
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(L * 0.6, -L * 0.1, Math.max(1.5, L * 0.08), 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function renderRodAndBobber(
  ctx: CanvasRenderingContext2D,
  bobber: { x: number; y: number; targetX: number; inWater: boolean },
  phase: FishingPhase,
  tension: number,
  time: number
) {
  const anglerRodTipX = 95;
  const anglerRodTipY = 65;

  // Rod bend calculation during fight
  const rodBendY = phase === 'fight' ? (tension / 100) * 25 : 0;

  // Fishing Rod
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(65, 88);
  ctx.lineTo(anglerRodTipX, anglerRodTipY + rodBendY);
  ctx.stroke();

  // Fishing Line from Rod Tip to Bobber
  const bobberY = bobber.inWater ? bobber.y + Math.sin(time * 0.006) * 2.5 : bobber.y;

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(anglerRodTipX, anglerRodTipY + rodBendY);

  if (phase === 'cast') {
    // High arc
    ctx.quadraticCurveTo((anglerRodTipX + bobber.targetX) / 2, 40, bobber.targetX, 155);
  } else {
    ctx.lineTo(bobber.x, bobberY);
  }
  ctx.stroke();

  // Floating Bobber (Red and White)
  if (bobber.inWater || phase === 'waiting' || phase === 'bite' || phase === 'fight') {
    ctx.save();
    ctx.translate(bobber.x, bobberY);

    // Red top
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, -4, 6, Math.PI, 0);
    ctx.fill();

    // White bottom
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -4, 6, 0, Math.PI);
    ctx.fill();

    // Line beneath bobber to hook
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.lineTo(0, 25);
    ctx.stroke();

    // Tiny bait hook
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 27, 3, 0, Math.PI);
    ctx.stroke();

    ctx.restore();
  }
}
