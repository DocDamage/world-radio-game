import React, { useState, useEffect, useRef } from 'react';
import { Mountain, Wind, X, Trophy, Sparkles } from 'lucide-react';
import { soundEffects } from '../services/audioEffects';
import { gamepadManager } from '../services/gamepadManager';

interface AlpineDownhillModalProps {
  isOpen: boolean;
  onClose: () => void;
  cityName: string;
  countryName: string;
  onEarnCoins: (amount: number) => void;
}

interface SnowParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

interface SlalomObstacle {
  x: number; // -1 to 1
  z: number; // 0 to 1000
  type: 'gate_red' | 'gate_blue' | 'pine' | 'rock' | 'knoll';
  cleared?: boolean;
}

export const AlpineDownhillModal: React.FC<AlpineDownhillModalProps> = ({
  isOpen,
  onClose,
  cityName,
  countryName,
  onEarnCoins
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [speed, setSpeed] = useState<number>(0);
  const [gatesCleared, setGatesCleared] = useState<number>(0);
  const [distanceMeters, setDistanceMeters] = useState<number>(0);
  const [coinsEarned, setCoinsEarned] = useState<number>(0);

  // Mutable 60fps loop refs
  const playerXRef = useRef<number>(0);
  const speedRef = useRef<number>(30);
  const steerInputRef = useRef<number>(0);
  const snowParticlesRef = useRef<SnowParticle[]>([]);
  const obstaclesRef = useRef<SlalomObstacle[]>([]);
  const distanceRef = useRef<number>(0);
  const gatesRef = useRef<number>(0);
  const coinsRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const animationFrameRef = useRef<number | null>(null);

  // Keyboard controls
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
        steerInputRef.current = -1;
      } else if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
        steerInputRef.current = 1;
      } else if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
        speedRef.current = Math.min(85, speedRef.current + 8);
      } else if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') {
        speedRef.current = Math.max(15, speedRef.current - 12);
        soundEffects.playStaticBurst(0.05, 0.15);
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
  }, [isOpen]);

  // Main 60 FPS Loop
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
    gatesRef.current = 0;
    coinsRef.current = 0;
    obstaclesRef.current = [];
    snowParticlesRef.current = [];

    // Pre-populate slalom course
    for (let i = 0; i < 9; i++) {
      spawnObstacle(160 + i * 120);
    }

    function spawnObstacle(z: number) {
      const types: SlalomObstacle['type'][] = ['gate_red', 'gate_blue', 'pine', 'rock', 'knoll'];
      const type = types[Math.floor(Math.random() * types.length)];
      obstaclesRef.current.push({
        x: (Math.random() - 0.5) * 1.5,
        z,
        type
      });
    }

    let nextSpawn = 0;

    const loop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = currentTime;

      // Gravity pulls skier down the mountain
      speedRef.current = Math.min(78, speedRef.current + 3.5 * dt);

      // Steering with carve resistance
      playerXRef.current += steerInputRef.current * 1.45 * dt;
      playerXRef.current = Math.max(-0.85, Math.min(0.85, playerXRef.current));

      // Distance
      const step = (speedRef.current / 3.6) * dt * 10;
      distanceRef.current += step;

      // Spawn new course gates
      nextSpawn += step;
      if (nextSpawn > 75) {
        nextSpawn = 0;
        spawnObstacle(950);
      }

      // Powder snow spray when carving
      if (Math.abs(steerInputRef.current) > 0 || speedRef.current > 20) {
        const sprayDir = steerInputRef.current <= 0 ? 1 : -1;
        snowParticlesRef.current.push({
          x: canvas.width / 2 + playerXRef.current * (canvas.width * 0.35) + sprayDir * 18,
          y: canvas.height - 35,
          vx: sprayDir * (20 + Math.random() * 30),
          vy: -15 - Math.random() * 25,
          size: 2 + Math.random() * 4,
          alpha: 0.85
        });
      }

      // Update snow particles
      for (let i = snowParticlesRef.current.length - 1; i >= 0; i--) {
        const p = snowParticlesRef.current[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.alpha -= dt * 1.8;
        if (p.alpha <= 0) {
          snowParticlesRef.current.splice(i, 1);
        }
      }

      // Update obstacles & collisions
      for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
        const obs = obstaclesRef.current[i];
        obs.z -= speedRef.current * 13.5 * dt;

        if (obs.z > -20 && obs.z < 35) {
          const dx = Math.abs(obs.x - playerXRef.current);
          if (obs.type === 'gate_red' || obs.type === 'gate_blue') {
            if (dx < 0.32 && !obs.cleared) {
              // Gate cleared!
              obs.cleared = true;
              gatesRef.current += 1;
              coinsRef.current += 15;
              soundEffects.playRadarPing(880, 0.1);
              gamepadManager.vibrate(50, 0.4, 0.2);
            }
          } else if (obs.type === 'pine' || obs.type === 'rock') {
            if (dx < 0.22) {
              // Hit pine or boulder!
              speedRef.current = 14;
              soundEffects.playStaticBurst(0.12, 0.2);
              gamepadManager.vibrate(200, 0.9, 0.7);
              obs.z = -50;
            }
          } else if (obs.type === 'knoll') {
            if (dx < 0.28 && !obs.cleared) {
              // Jump off knoll!
              obs.cleared = true;
              soundEffects.playTriumphChime();
              gamepadManager.vibrate(80, 0.6, 0.3);
            }
          }
        }

        if (obs.z < -40) {
          obstaclesRef.current.splice(i, 1);
        }
      }

      setSpeed(Math.round(speedRef.current));
      setDistanceMeters(Math.round(distanceRef.current));
      setGatesCleared(gatesRef.current);
      setCoinsEarned(coinsRef.current);

      // ----------------------------------------------------
      // RENDER CANVAS
      // ----------------------------------------------------
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Alpine Sky & Mountain Panorama
      renderAlpineSky(ctx, W, H);

      // Snowy Powder Slope
      renderSnowSlope(ctx, W, H, currentTime);

      // Snow spray particles
      snowParticlesRef.current.forEach(p => {
        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Course Gates and Pines (sorted by depth)
      const sorted = [...obstaclesRef.current].sort((a, b) => b.z - a.z);
      sorted.forEach(obs => {
        renderSlalomObstacle(ctx, W, H, obs);
      });

      // Skier in Action (Foreground)
      renderSkier(ctx, W, H, playerXRef.current, steerInputRef.current, speedRef.current, currentTime);

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isOpen]);

  const handleExit = () => {
    if (coinsRef.current > 0) {
      onEarnCoins(coinsRef.current);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-lg flex items-center justify-center p-3 select-none">
      <div className="relative w-full max-w-4xl bg-slate-950 border border-sky-400/40 rounded-3xl overflow-hidden shadow-2xl flex flex-col text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-900/90 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-400/20 text-sky-400 border border-sky-400/30 rounded-xl">
              <Mountain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-wide text-slate-100 uppercase">
                  {cityName} Alpine Slalom Descent
                </h2>
                <span className="text-[10px] font-mono bg-sky-950 text-sky-400 border border-sky-500/40 px-2 py-0.5 rounded-full font-bold">
                  DOWNHILL RACER
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Carve powder snow down the alpine peaks of {cityName}, {countryName} • Clear slalom gates!
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

          {/* Speed & Stats (Top Left) */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
            <div className="bg-slate-950/85 backdrop-blur-md border border-sky-400/30 px-4 py-2.5 rounded-2xl shadow-xl">
              <div className="text-3xl font-black font-mono tracking-tight text-sky-400">
                {speed} <span className="text-xs text-slate-400 font-normal">km/h</span>
              </div>
              <div className="text-[10px] font-mono text-slate-400">Descent Distance: {distanceMeters} m</div>
            </div>

            <div className="bg-slate-950/85 backdrop-blur-md border border-slate-800 px-3.5 py-2 rounded-2xl shadow-xl flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <div>
                <div className="text-[10px] text-slate-400">Gates Cleared:</div>
                <div className="text-base font-black font-mono text-emerald-400">{gatesCleared}</div>
              </div>
            </div>
          </div>

          {/* Coins (Top Right) */}
          <div className="absolute top-4 right-4 z-10 bg-amber-950/85 backdrop-blur-md border border-amber-500/40 px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <div>
              <div className="text-xs text-amber-300 font-bold">Slalom Coins:</div>
              <div className="text-lg font-black font-mono text-amber-400">+{coinsEarned}</div>
            </div>
          </div>

          {/* On-screen Controls */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
            <button
              onMouseDown={() => (steerInputRef.current = -1)}
              onMouseUp={() => (steerInputRef.current = 0)}
              onTouchStart={() => (steerInputRef.current = -1)}
              onTouchEnd={() => (steerInputRef.current = 0)}
              className="px-4 py-2.5 bg-slate-900/90 border border-slate-700 text-slate-200 rounded-2xl text-xs font-bold active:scale-95"
            >
              ◀ Carve Left (A)
            </button>

            <button
              onMouseDown={() => (steerInputRef.current = 1)}
              onMouseUp={() => (steerInputRef.current = 0)}
              onTouchStart={() => (steerInputRef.current = 1)}
              onTouchEnd={() => (steerInputRef.current = 0)}
              className="px-4 py-2.5 bg-slate-900/90 border border-slate-700 text-slate-200 rounded-2xl text-xs font-bold active:scale-95"
            >
              Carve Right (D) ▶
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <Wind className="w-4 h-4 text-sky-400" />
            <span>Controls: <strong>A/D</strong> Carve • <strong>W/S</strong> Tuck / Brake</span>
          </div>

          <button
            onClick={handleExit}
            className="px-4 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow"
          >
            <Trophy className="w-3.5 h-3.5" /> Finish Slalom & Bank Coins
          </button>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// RENDER HELPERS (Alpine Canvas Simulation)
// ----------------------------------------------------------------------

function renderAlpineSky(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const horizonY = H * 0.38;

  // Crisp Blue Alpine Sky
  const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
  skyGrad.addColorStop(0, '#0369a1');
  skyGrad.addColorStop(0.7, '#38bdf8');
  skyGrad.addColorStop(1, '#e0f2fe');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, horizonY);

  // Distant Snowy Mountain Peaks
  ctx.fillStyle = '#64748b';
  ctx.beginPath();
  ctx.moveTo(0, horizonY);
  ctx.lineTo(100, horizonY - 110);
  ctx.lineTo(200, horizonY);
  ctx.lineTo(340, horizonY - 140);
  ctx.lineTo(500, horizonY);
  ctx.lineTo(660, horizonY - 120);
  ctx.lineTo(W, horizonY);
  ctx.fill();

  // White Glacier Caps
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(310, horizonY - 115);
  ctx.lineTo(340, horizonY - 140);
  ctx.lineTo(370, horizonY - 115);
  ctx.moveTo(85, horizonY - 95);
  ctx.lineTo(100, horizonY - 110);
  ctx.lineTo(115, horizonY - 95);
  ctx.fill();
}

function renderSnowSlope(ctx: CanvasRenderingContext2D, W: number, H: number, time: number) {
  const horizonY = H * 0.38;

  // Powder Snow Slope Gradient
  const snowGrad = ctx.createLinearGradient(0, horizonY, 0, H);
  snowGrad.addColorStop(0, '#e2e8f0');
  snowGrad.addColorStop(0.4, '#f1f5f9');
  snowGrad.addColorStop(1, '#ffffff');
  ctx.fillStyle = snowGrad;
  ctx.fillRect(0, horizonY, W, H - horizonY);

  // Slalom slope carve tracks
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  for (let trackX = 140; trackX < W - 140; trackX += 85) {
    ctx.beginPath();
    ctx.moveTo(trackX, horizonY);
    for (let y = horizonY; y < H; y += 30) {
      const wobble = Math.sin((y + time * 0.05) * 0.03) * 12;
      ctx.lineTo(trackX + wobble, y);
    }
    ctx.stroke();
  }
}

function renderSlalomObstacle(ctx: CanvasRenderingContext2D, W: number, H: number, obs: SlalomObstacle) {
  const horizonY = H * 0.38;
  const depthFactor = Math.max(0, Math.min(1, 1 - obs.z / 950));
  const scale = Math.pow(depthFactor, 2.2);

  if (scale <= 0.04) return;

  const y = horizonY + (H - horizonY) * scale;
  const slopeWidth = W * 0.8 * scale;
  const x = W / 2 + obs.x * (slopeWidth / 2);

  ctx.save();
  ctx.translate(x, y);

  if (obs.type === 'gate_red' || obs.type === 'gate_blue') {
    // Slalom Gate Flags (Twin poles)
    const color = obs.type === 'gate_red' ? '#ef4444' : '#0284c7';
    const poleH = 45 * scale * 1.8;
    const gateW = 28 * scale * 1.8;

    // Left pole
    ctx.fillStyle = color;
    ctx.fillRect(-gateW / 2, -poleH, 3 * scale * 1.8, poleH);
    // Right pole
    ctx.fillRect(gateW / 2, -poleH, 3 * scale * 1.8, poleH);

    // Flag banner
    ctx.fillStyle = color;
    ctx.fillRect(-gateW / 2, -poleH, gateW, 14 * scale * 1.8);
  } else if (obs.type === 'pine') {
    // Alpine Pine Tree
    const treeH = 65 * scale * 1.8;
    const treeW = 35 * scale * 1.8;

    ctx.fillStyle = '#14532d';
    ctx.beginPath();
    ctx.moveTo(0, -treeH);
    ctx.lineTo(treeW / 2, -treeH * 0.3);
    ctx.lineTo(-treeW / 2, -treeH * 0.3);
    ctx.closePath();
    ctx.fill();

    // Snow dusting on branches
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-treeW * 0.3, -treeH * 0.6, treeW * 0.6, 4 * scale * 1.8);
  } else if (obs.type === 'rock') {
    // Alpine Boulder
    const rW = 35 * scale * 1.8;
    const rH = 25 * scale * 1.8;
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.ellipse(0, -rH * 0.4, rW * 0.5, rH * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function renderSkier(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  playerX: number,
  steerInput: number,
  _speed: number,
  _time: number
) {
  const baseX = W / 2 + playerX * (W * 0.35);
  const baseY = H - 30;

  ctx.save();
  ctx.translate(baseX, baseY);
  ctx.rotate((steerInput * 18 * Math.PI) / 180);

  // Twin Skis (Red & Neon)
  ctx.fillStyle = '#e11d48';
  ctx.fillRect(-14, -28, 5, 55); // Left ski
  ctx.fillRect(9, -28, 5, 55);  // Right ski

  // Ski tips bent up
  ctx.fillStyle = '#facc15';
  ctx.fillRect(-14, -34, 5, 6);
  ctx.fillRect(9, -34, 5, 6);

  // Skier Body (Rear view, crouching in aero tuck)
  ctx.fillStyle = '#0284c7'; // Jacket
  ctx.beginPath();
  ctx.roundRect(-12, -22, 24, 20, [4]);
  ctx.fill();

  // Helmet
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(0, -28, 9, 0, Math.PI * 2);
  ctx.fill();

  // Ski Poles
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-12, -18);
  ctx.lineTo(-24, 6);
  ctx.moveTo(12, -18);
  ctx.lineTo(24, 6);
  ctx.stroke();

  ctx.restore();
}
