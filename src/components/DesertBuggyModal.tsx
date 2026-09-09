import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Flame, X, Trophy, Wind, Sparkles } from 'lucide-react';
import { soundEffects } from '../services/audioEffects';
import { gamepadManager } from '../services/gamepadManager';

interface DesertBuggyModalProps {
  isOpen: boolean;
  onClose: () => void;
  cityName: string;
  countryName: string;
  onEarnCoins: (amount: number) => void;
  highScore?: number;
  onUpdateHighScore?: (score: number) => void;
}

type BuggyState = 'racing' | 'airborne' | 'crashed' | 'finished';

interface SandParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

interface DuneHazard {
  x: number;
  z: number;
  type: 'rock' | 'cactus' | 'cell' | 'oasis' | 'ramp';
  width: number;
  height: number;
}

export const DesertBuggyModal: React.FC<DesertBuggyModalProps> = ({
  isOpen,
  onClose,
  cityName,
  countryName,
  onEarnCoins,
  highScore = 0,
  onUpdateHighScore
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [speed, setSpeed] = useState<number>(0);
  const [coinsCollected, setCoinsCollected] = useState<number>(0);
  const [boostActive, setBoostActive] = useState<boolean>(false);
  const [distanceMeters, setDistanceMeters] = useState<number>(0);
  const [health, setHealth] = useState<number>(3);
  const [nitroFuel, setNitroFuel] = useState<number>(100);
  const [buggyState, setBuggyState] = useState<BuggyState>('racing');
  const [airTimeBonus, setAirTimeBonus] = useState<number>(0);
  const FINISH_DISTANCE = 3000;

  // Mutable refs for 60fps loop
  const playerXRef = useRef<number>(0); // -0.85 to 0.85
  const speedRef = useRef<number>(20);
  const steerInputRef = useRef<number>(0);
  const boostRef = useRef<boolean>(false);
  const sandParticlesRef = useRef<SandParticle[]>([]);
  const hazardsRef = useRef<DuneHazard[]>([]);
  const distanceRef = useRef<number>(0);
  const coinsRef = useRef<number>(0);
  const healthRef = useRef<number>(3);
  const nitroRef = useRef<number>(100);
  const airTimerRef = useRef<number>(0);
  const crashTimerRef = useRef<number>(0);
  const buggyStateRef = useRef<BuggyState>('racing');
  const lastTimeRef = useRef<number>(performance.now());
  const animationFrameRef = useRef<number | null>(null);
  const shakeRef = useRef<number>(0);

  const triggerBoost = useCallback(() => {
    if (nitroRef.current < 15 || buggyStateRef.current !== 'racing') return;
    boostRef.current = true;
    setBoostActive(true);
    soundEffects.playRadarPing(800, 0.15);
    gamepadManager.vibrate(120, 0.7, 0.4);
    setTimeout(() => {
      boostRef.current = false;
      setBoostActive(false);
    }, 1500);
  }, []);

  // Keyboard controls
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
        steerInputRef.current = -1;
      } else if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
        steerInputRef.current = 1;
      } else if (e.key === 'w' || e.key === 'W' || e.code === 'Space') {
        e.preventDefault();
        triggerBoost();
      } else if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') {
        speedRef.current = Math.max(10, speedRef.current - 8);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if ((e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') && steerInputRef.current === -1) {
        steerInputRef.current = 0;
      } else if ((e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') && steerInputRef.current === 1) {
        steerInputRef.current = 0;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isOpen, triggerBoost]);

  // 60 FPS Canvas Game Loop
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    lastTimeRef.current = performance.now();
    speedRef.current = 35;
    playerXRef.current = 0;
    distanceRef.current = 0;
    coinsRef.current = 0;
    healthRef.current = 3;
    nitroRef.current = 100;
    airTimerRef.current = 0;
    crashTimerRef.current = 0;
    buggyStateRef.current = 'racing';
    shakeRef.current = 0;
    hazardsRef.current = [];
    sandParticlesRef.current = [];
    setHealth(3);
    setNitroFuel(100);
    setBuggyState('racing');
    setAirTimeBonus(0);

    // Pre-populate initial desert hazards and solar cells
    for (let i = 0; i < 8; i++) {
      spawnHazard(180 + i * 130);
    }

    function spawnHazard(z: number) {
      const types: DuneHazard['type'][] = ['cell', 'cell', 'cell', 'rock', 'cactus', 'ramp'];
      const type = types[Math.floor(Math.random() * types.length)];
      hazardsRef.current.push({
        x: (Math.random() - 0.5) * 1.6,
        z,
        type,
        width: type === 'cell' ? 30 : type === 'ramp' ? 60 : 45,
        height: type === 'cell' ? 30 : type === 'ramp' ? 20 : 50
      });
    }

    let nextSpawn = 0;

    const loop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = currentTime;

      // Check finished / crashed states
      if (buggyStateRef.current === 'finished' || buggyStateRef.current === 'crashed') {
        // Still render the static scene
        renderFrame(ctx, canvas.width, canvas.height, currentTime);
        animationFrameRef.current = requestAnimationFrame(loop);
        return;
      }

      // Crash recovery timer
      if (crashTimerRef.current > 0) {
        crashTimerRef.current -= dt;
        shakeRef.current = crashTimerRef.current * 12;
        if (crashTimerRef.current <= 0) {
          shakeRef.current = 0;
          speedRef.current = 20;
        }
        renderFrame(ctx, canvas.width, canvas.height, currentTime);
        animationFrameRef.current = requestAnimationFrame(loop);
        return;
      }

      // Airborne state
      if (buggyStateRef.current === 'airborne') {
        airTimerRef.current -= dt;
        if (airTimerRef.current <= 0) {
          buggyStateRef.current = 'racing';
          setBuggyState('racing');
          const bonus = Math.round(airTimerRef.current * -1 + 1.5) * 20;
          coinsRef.current += bonus;
          setAirTimeBonus(bonus);
          soundEffects.playCoinSound();
          setTimeout(() => setAirTimeBonus(0), 1200);
        }
      }

      // Speed & Boost — nitro depletes fuel
      if (boostRef.current && nitroRef.current > 0) {
        nitroRef.current = Math.max(0, nitroRef.current - 35 * dt);
        if (nitroRef.current <= 0) {
          boostRef.current = false;
          setBoostActive(false);
        }
      } else {
        // Nitro recharges slowly
        nitroRef.current = Math.min(100, nitroRef.current + 8 * dt);
      }
      const maxSpeed = boostRef.current ? 75 : 45;
      speedRef.current += (maxSpeed - speedRef.current) * dt * 2.0;

      // Steering
      playerXRef.current += steerInputRef.current * 1.4 * dt;
      playerXRef.current = Math.max(-0.85, Math.min(0.85, playerXRef.current));

      // Distance
      const step = (speedRef.current / 3.6) * dt * 10;
      distanceRef.current += step;

      // Check finish line
      if (distanceRef.current >= FINISH_DISTANCE) {
        buggyStateRef.current = 'finished';
        setBuggyState('finished');
        if (onUpdateHighScore && Math.round(distanceRef.current) > highScore) {
          onUpdateHighScore(Math.round(distanceRef.current));
        }
        soundEffects.playTriumphChime();
        gamepadManager.vibrate(300, 0.6, 0.4);
      }

      // Spawn new items
      nextSpawn += step;
      if (nextSpawn > 80) {
        nextSpawn = 0;
        spawnHazard(950);
      }

      // Sand spray from knobby tires (only when on ground)
      if (speedRef.current > 15 && buggyStateRef.current === 'racing') {
        sandParticlesRef.current.push({
          x: canvas.width / 2 + playerXRef.current * (canvas.width * 0.35) - 30 + (Math.random() - 0.5) * 10,
          y: canvas.height - 30,
          vx: -15 + (Math.random() - 0.5) * 20,
          vy: -20 - Math.random() * 30,
          size: 2 + Math.random() * 3,
          alpha: 0.8
        });
        sandParticlesRef.current.push({
          x: canvas.width / 2 + playerXRef.current * (canvas.width * 0.35) + 30 + (Math.random() - 0.5) * 10,
          y: canvas.height - 30,
          vx: 15 + (Math.random() - 0.5) * 20,
          vy: -20 - Math.random() * 30,
          size: 2 + Math.random() * 3,
          alpha: 0.8
        });
      }

      // Update sand particles
      for (let i = sandParticlesRef.current.length - 1; i >= 0; i--) {
        const p = sandParticlesRef.current[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.alpha -= dt * 1.5;
        if (p.alpha <= 0) {
          sandParticlesRef.current.splice(i, 1);
        }
      }

      // Update hazards & collisions
      for (let i = hazardsRef.current.length - 1; i >= 0; i--) {
        const h = hazardsRef.current[i];
        h.z -= speedRef.current * 14 * dt;

        if (h.z > -20 && h.z < 35) {
          const dx = Math.abs(h.x - playerXRef.current);
          if (h.type === 'cell') {
            if (dx < 0.28) {
              coinsRef.current += 15;
              soundEffects.playCoinSound();
              gamepadManager.vibrate(60, 0.4, 0.2);
              hazardsRef.current.splice(i, 1);
              continue;
            }
          } else if (h.type === 'ramp') {
            if (dx < 0.32 && buggyStateRef.current === 'racing') {
              // Launch airborne!
              buggyStateRef.current = 'airborne';
              setBuggyState('airborne');
              airTimerRef.current = 1.2 + (speedRef.current / 80) * 0.8;
              soundEffects.playRadarPing(600, 0.2);
              gamepadManager.vibrate(150, 0.5, 0.3);
              hazardsRef.current.splice(i, 1);
              continue;
            }
          } else {
            if (dx < 0.22) {
              // Hit desert rock / cactus — lose health
              healthRef.current -= 1;
              setHealth(healthRef.current);
              crashTimerRef.current = 0.8;
              speedRef.current = 10;
              soundEffects.playStaticBurst(0.12, 0.2);
              gamepadManager.vibrate(300, 1.0, 0.8);
              h.z = -50;

              if (healthRef.current <= 0) {
                buggyStateRef.current = 'crashed';
                setBuggyState('crashed');
                if (onUpdateHighScore && Math.round(distanceRef.current) > highScore) {
                  onUpdateHighScore(Math.round(distanceRef.current));
                }
                soundEffects.playStaticBurst(0.3, 0.4);
              }
            }
          }
        }

        if (h.z < -40) {
          hazardsRef.current.splice(i, 1);
        }
      }

      setSpeed(Math.round(speedRef.current));
      setDistanceMeters(Math.round(distanceRef.current));
      setCoinsCollected(coinsRef.current);
      setNitroFuel(Math.round(nitroRef.current));

      renderFrame(ctx, canvas.width, canvas.height, currentTime);
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    function renderFrame(rctx: CanvasRenderingContext2D, W: number, H: number, time: number) {
      rctx.save();
      // Screen shake on crash
      if (shakeRef.current > 0) {
        const sx = (Math.random() - 0.5) * shakeRef.current;
        const sy = (Math.random() - 0.5) * shakeRef.current;
        rctx.translate(sx, sy);
      }
      rctx.clearRect(-10, -10, W + 20, H + 20);

      renderDesertSkyAndDunes(rctx, W, H, time);

      // Sand spray
      sandParticlesRef.current.forEach(p => {
        rctx.fillStyle = `rgba(253, 186, 116, ${p.alpha})`;
        rctx.beginPath();
        rctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        rctx.fill();
      });

      // Distance progress bar toward finish
      const progressPct = Math.min(1, distanceRef.current / FINISH_DISTANCE);
      rctx.fillStyle = 'rgba(0,0,0,0.4)';
      rctx.fillRect(W * 0.1, H - 14, W * 0.8, 8);
      rctx.fillStyle = '#f97316';
      rctx.fillRect(W * 0.1, H - 14, W * 0.8 * progressPct, 8);
      rctx.fillStyle = '#fde047';
      rctx.font = 'bold 9px sans-serif';
      rctx.textAlign = 'center';
      rctx.fillText(`${Math.round(distanceRef.current)}m / ${FINISH_DISTANCE}m`, W / 2, H - 6);

      // Desert hazards sorted by depth
      const sorted = [...hazardsRef.current].sort((a, b) => b.z - a.z);
      sorted.forEach(h => {
        renderDuneHazard(rctx, W, H, h);
      });

      // Dune Buggy — offset upward if airborne
      const airOffset = buggyStateRef.current === 'airborne' ? -40 - Math.sin(airTimerRef.current * 4) * 20 : 0;
      renderDuneBuggy(rctx, W, H, playerXRef.current, steerInputRef.current, speedRef.current, time, airOffset);

      rctx.restore();
    }

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isOpen]);

  const handleExit = () => {
    if (coinsRef.current > 0) {
      onEarnCoins(coinsRef.current);
    }
    if (onUpdateHighScore && Math.round(distanceRef.current) > highScore) {
      onUpdateHighScore(Math.round(distanceRef.current));
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-lg flex items-center justify-center p-3 select-none">
      <div className="relative w-full max-w-4xl bg-slate-950 border border-orange-500/40 rounded-3xl overflow-hidden shadow-2xl flex flex-col text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-900/90 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-xl">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-wide text-slate-100 uppercase">
                  {cityName} Desert Dune Cruiser
                </h2>
                <span className="text-[10px] font-mono bg-orange-950 text-orange-400 border border-orange-500/40 px-2 py-0.5 rounded-full font-bold">
                  DUNE RACER
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Drift across the golden dunes of {cityName}, {countryName} • Gather solar radio cells!
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

        {/* Live Canvas */}
        <div className="relative w-full h-[460px] bg-slate-950 flex items-center justify-center overflow-hidden">
          <canvas
            ref={canvasRef}
            width={860}
            height={460}
            className="w-full h-full object-cover"
          />

          {/* Speed & Stats */}
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
            <div className="bg-slate-950/85 backdrop-blur-md border border-orange-500/40 px-4 py-2.5 rounded-2xl shadow-xl">
              <div className="text-3xl font-black font-mono tracking-tight text-orange-400">
                {speed} <span className="text-xs text-slate-400 font-normal">km/h</span>
              </div>
              <div className="text-[10px] font-mono text-slate-400">Dune Distance: {distanceMeters}m / {FINISH_DISTANCE}m</div>
            </div>

            {/* Health Pips */}
            <div className="bg-slate-950/85 backdrop-blur-md border border-red-500/40 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <span className="text-[10px] text-red-300 font-bold">HULL:</span>
              {[1, 2, 3].map(i => (
                <div key={i} className={`w-5 h-3 rounded-sm ${i <= health ? 'bg-red-500' : 'bg-slate-800'}`} />
              ))}
            </div>

            {/* Nitro Fuel Gauge */}
            <div className="bg-slate-950/85 backdrop-blur-md border border-amber-500/40 px-3 py-1.5 rounded-xl">
              <div className="text-[10px] text-amber-300 font-bold mb-1">NITRO FUEL</div>
              <div className="w-28 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${nitroFuel > 30 ? 'bg-amber-400' : 'bg-red-500'}`} style={{ width: `${nitroFuel}%` }} />
              </div>
            </div>

            {boostActive && (
              <div className="bg-amber-500 text-slate-950 font-black text-xs px-3 py-1.5 rounded-xl shadow-lg animate-pulse flex items-center gap-1">
                <Flame className="w-4 h-4 fill-slate-950" /> NITRO ACTIVE!
              </div>
            )}
          </div>

          {/* Airtime Bonus */}
          {airTimeBonus > 0 && (
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 z-20 text-3xl font-black text-amber-400 animate-bounce drop-shadow-lg">
              🪂 AIR TIME +{airTimeBonus}!
            </div>
          )}

          {/* Solar Battery Score & Record */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            {highScore > 0 && (
              <div className="bg-slate-900/85 backdrop-blur-md border border-slate-700 px-3.5 py-2 rounded-2xl shadow-xl text-xs font-mono text-slate-300">
                Record: <strong className="text-amber-400">{highScore}m</strong>
              </div>
            )}
            <div className="bg-amber-950/85 backdrop-blur-md border border-amber-500/40 px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <div>
                <div className="text-xs text-amber-300 font-bold">Solar Cells:</div>
                <div className="text-lg font-black font-mono text-amber-400">+{coinsCollected}</div>
              </div>
            </div>
          </div>

          {/* Crashed Overlay */}
          {buggyState === 'crashed' && (
            <div className="absolute inset-0 z-30 bg-red-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
              <div className="text-5xl font-black text-red-400 animate-pulse">💥 WRECKED!</div>
              <div className="text-sm text-red-200">Your buggy hit too many obstacles.</div>
              <div className="text-lg font-bold text-amber-400">Solar Cells Collected: +{coinsCollected}</div>
              <button onClick={handleExit} className="px-6 py-2 bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold rounded-xl">
                <Trophy className="w-4 h-4 inline mr-1" /> Bank Coins & Exit
              </button>
            </div>
          )}

          {/* Finished Overlay */}
          {buggyState === 'finished' && (
            <div className="absolute inset-0 z-30 bg-amber-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
              <div className="text-5xl font-black text-amber-400">🏁 FINISH!</div>
              <div className="text-sm text-amber-200">You conquered {FINISH_DISTANCE}m of desert dunes!</div>
              <div className="text-lg font-bold text-amber-400">Solar Cells: +{coinsCollected} • Hull Remaining: {health}/3</div>
              {health === 3 && <div className="text-xs text-green-400 font-bold">🏆 PERFECT RUN — No Damage!</div>}
              <button onClick={handleExit} className="px-6 py-2 bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold rounded-xl">
                <Trophy className="w-4 h-4 inline mr-1" /> Bank Coins & Exit
              </button>
            </div>
          )}

          {/* Quick On-Screen Touch Controls */}
          {buggyState === 'racing' && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
              <button
                onMouseDown={() => (steerInputRef.current = -1)}
                onMouseUp={() => (steerInputRef.current = 0)}
                onTouchStart={() => (steerInputRef.current = -1)}
                onTouchEnd={() => (steerInputRef.current = 0)}
                className="px-4 py-2.5 bg-slate-900/90 border border-slate-700 text-slate-200 rounded-2xl text-xs font-bold active:scale-95"
              >
                ◀ Left (A)
              </button>

              <button
                onClick={triggerBoost}
                className={`px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-orange-500/30 active:scale-90 flex items-center gap-1.5 ${nitroFuel < 15 ? 'opacity-40' : ''}`}
              >
                <Flame className="w-4 h-4 fill-slate-950" /> BOOST ({Math.round(nitroFuel)}%)
              </button>

              <button
                onMouseDown={() => (steerInputRef.current = 1)}
                onMouseUp={() => (steerInputRef.current = 0)}
                onTouchStart={() => (steerInputRef.current = 1)}
                onTouchEnd={() => (steerInputRef.current = 0)}
                className="px-4 py-2.5 bg-slate-900/90 border border-slate-700 text-slate-200 rounded-2xl text-xs font-bold active:scale-95"
              >
                Right (D) ▶
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <Wind className="w-4 h-4 text-orange-400" />
            <span>Controls: <strong>WASD / Arrows</strong> Steer • <strong>Space</strong> Boost Nitro</span>
          </div>

          <button
            onClick={handleExit}
            className="px-4 py-1.5 bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow"
          >
            <Trophy className="w-3.5 h-3.5" /> Return to Camp & Bank Coins
          </button>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// RENDER HELPERS (Desert Dune Simulation)
// ----------------------------------------------------------------------

function renderDesertSkyAndDunes(ctx: CanvasRenderingContext2D, W: number, H: number, time: number) {
  const horizonY = H * 0.42;

  // Sunset Gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
  skyGrad.addColorStop(0, '#431407');
  skyGrad.addColorStop(0.6, '#ea580c');
  skyGrad.addColorStop(1, '#fde047');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, horizonY);

  // Big Orange Desert Sun
  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.arc(W * 0.65, horizonY - 35, 45, 0, Math.PI * 2);
  ctx.fill();

  // Distant Dune ridges
  ctx.fillStyle = '#c2410c';
  ctx.beginPath();
  ctx.moveTo(0, horizonY);
  ctx.quadraticCurveTo(W * 0.25, horizonY - 45, W * 0.5, horizonY);
  ctx.quadraticCurveTo(W * 0.75, horizonY - 60, W, horizonY);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.fill();

  // Golden Foreground Sand Terrain
  const sandGrad = ctx.createLinearGradient(0, horizonY, 0, H);
  sandGrad.addColorStop(0, '#ea580c');
  sandGrad.addColorStop(0.3, '#f97316');
  sandGrad.addColorStop(1, '#d97706');
  ctx.fillStyle = sandGrad;
  ctx.fillRect(0, horizonY, W, H - horizonY);

  // Flowing Sand Dune Ridges
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 2;
  for (let dy = horizonY + 30; dy < H; dy += 40) {
    ctx.beginPath();
    for (let dx = 0; dx < W; dx += 40) {
      const yOff = Math.sin((dx + time * 0.02) * 0.02) * 6;
      if (dx === 0) ctx.moveTo(dx, dy + yOff);
      else ctx.lineTo(dx, dy + yOff);
    }
    ctx.stroke();
  }
}

function renderDuneHazard(ctx: CanvasRenderingContext2D, W: number, H: number, h: DuneHazard) {
  const horizonY = H * 0.42;
  const depthFactor = Math.max(0, Math.min(1, 1 - h.z / 950));
  const scale = Math.pow(depthFactor, 2.2);

  if (scale <= 0.04) return;

  const y = horizonY + (H - horizonY) * scale;
  const roadWidth = W * 0.75 * scale;
  const x = W / 2 + h.x * (roadWidth / 2);

  const drawW = h.width * scale * 1.8;
  const drawH = h.height * scale * 1.8;

  ctx.save();
  ctx.translate(x, y - drawH);

  if (h.type === 'cell') {
    // Glowing Solar Radio Battery
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.roundRect(-drawW / 2, -drawH, drawW, drawH, [4]);
    ctx.fill();
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡', 0, -drawH / 2);
  } else if (h.type === 'ramp') {
    // Sand Dune Ramp
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.moveTo(-drawW / 2, 0);
    ctx.lineTo(drawW / 2, 0);
    ctx.lineTo(0, -drawH * 1.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('▲', 0, -drawH * 0.5);
  } else if (h.type === 'cactus') {
    // Saguaro Cactus
    ctx.fillStyle = '#15803d';
    ctx.fillRect(-drawW * 0.2, -drawH, drawW * 0.4, drawH);
    ctx.fillRect(-drawW * 0.5, -drawH * 0.7, drawW * 0.3, drawH * 0.15);
    ctx.fillRect(-drawW * 0.5, -drawH * 0.7, drawW * 0.15, drawH * 0.35);
  } else {
    // Desert Sandstone Boulder
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.ellipse(0, -drawH * 0.4, drawW * 0.5, drawH * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function renderDuneBuggy(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  playerX: number,
  steerInput: number,
  speed: number,
  time: number,
  airOffset: number = 0
) {
  const baseX = W / 2 + playerX * (W * 0.35);
  const baseY = H - 35 + airOffset;
  const duneBounce = airOffset === 0 ? Math.sin(time * 0.02 * (speed / 20)) * 4 : 0;

  ctx.save();
  ctx.translate(baseX, baseY + duneBounce);
  ctx.rotate((steerInput * 10 * Math.PI) / 180);

  // Shadow when airborne
  if (airOffset < 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(0, -airOffset + 10, 50, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Big Knobby Rear Tires
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-65, -35, 24, 45); // Left tire
  ctx.fillRect(41, -35, 24, 45);  // Right tire

  // Heavy duty steel roll cage
  ctx.strokeStyle = '#f97316';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-45, 0);
  ctx.lineTo(-30, -55);
  ctx.lineTo(30, -55);
  ctx.lineTo(45, 0);
  ctx.closePath();
  ctx.stroke();

  // Roof LED Lightbar
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(-28, -62, 56, 7);

  // Body Panel (Orange & Black)
  ctx.fillStyle = '#ea580c';
  ctx.beginPath();
  ctx.roundRect(-42, -25, 84, 25, [4]);
  ctx.fill();

  // Twin exhaust flame when moving fast
  if (speed > 40) {
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(-20, 8, 8, 0, Math.PI * 2);
    ctx.arc(20, 8, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(-20, 6, 4, 0, Math.PI * 2);
    ctx.arc(20, 6, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
