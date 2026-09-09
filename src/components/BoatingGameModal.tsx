import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Ship, Waves, Compass, Gauge, X, Volume2, Anchor, Sparkles } from 'lucide-react';
import { soundEffects } from '../services/audioEffects';
import { gamepadManager } from '../services/gamepadManager';
import type { EnvironmentType } from '../types';

interface BoatingGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  cityName: string;
  countryName: string;
  waterwayName: string;
  biome: EnvironmentType;
  onEarnCoins: (amount: number) => void;
}

interface WakeParticle {
  x: number;
  y: number;
  radius: number;
  alpha: number;
}

interface WaterHazard {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'buoy_red' | 'buoy_green' | 'barge' | 'ferry' | 'crate' | 'dock';
  label?: string;
  vx?: number;
  collected?: boolean;
}

export const BoatingGameModal: React.FC<BoatingGameModalProps> = ({
  isOpen,
  onClose,
  cityName,
  countryName,
  waterwayName,
  onEarnCoins
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Ship controls state
  const [throttle, setThrottle] = useState<number>(1); // -1 (Reverse), 0 (Stop), 1 (1/3), 2 (2/3), 3 (Full)
  const [knots, setKnots] = useState<number>(0);
  const [heading, setHeading] = useState<number>(0); // 0 to 360 degrees
  const [depthMeters, setDepthMeters] = useState<number>(14.2);
  const [coinsGathered, setCoinsGathered] = useState<number>(0);
  const [dockedSuccessfully, setDockedSuccessfully] = useState<boolean>(false);
  const [hornActive, setHornActive] = useState<boolean>(false);

  // Mutable refs for 60fps simulation
  const boatPosRef = useRef<{ x: number; y: number }>({ x: 300, y: 450 });
  const boatHeadingRef = useRef<number>(0); // 0 = straight up (North)
  const boatSpeedRef = useRef<number>(0); // pixels/sec
  const throttleRef = useRef<number>(1);
  const rudderInputRef = useRef<number>(0); // -1 (port) to +1 (starboard)
  const wakeParticlesRef = useRef<WakeParticle[]>([]);
  const hazardsRef = useRef<WaterHazard[]>([]);
  const coinsRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const animationFrameRef = useRef<number | null>(null);

  // Fog horn blast
  const soundHorn = useCallback(() => {
    soundEffects.playStaticBurst(0.3, 0.2);
    setTimeout(() => soundEffects.playRadarPing(220, 0.4), 60);
    gamepadManager.vibrate(200, 0.8, 0.5);
    setHornActive(true);
    setTimeout(() => setHornActive(false), 800);
  }, []);

  // Keyboard controls
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
        rudderInputRef.current = -1;
      } else if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
        rudderInputRef.current = 1;
      } else if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
        setThrottle(t => {
          const next = Math.min(3, t + 1);
          throttleRef.current = next;
          return next;
        });
      } else if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') {
        setThrottle(t => {
          const next = Math.max(-1, t - 1);
          throttleRef.current = next;
          return next;
        });
      } else if (e.key === 'h' || e.key === 'H' || e.code === 'Space') {
        e.preventDefault();
        soundHorn();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if ((e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') && rudderInputRef.current === -1) {
        rudderInputRef.current = 0;
      } else if ((e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') && rudderInputRef.current === 1) {
        rudderInputRef.current = 0;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isOpen, soundHorn]);

  // Main 60 FPS Water Navigation Simulation Loop
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    boatPosRef.current = { x: canvas.width / 2, y: canvas.height - 90 };
    boatHeadingRef.current = 0;
    boatSpeedRef.current = 20;
    throttleRef.current = 1;
    wakeParticlesRef.current = [];
    coinsRef.current = 0;
    setDockedSuccessfully(false);

    // Populate Waterway channel hazards, buoys, bridge arches, and docking berth
    hazardsRef.current = [
      // Channel markers (green starboard, red port)
      { x: 180, y: 320, width: 14, height: 14, type: 'buoy_green' },
      { x: canvas.width - 180, y: 320, width: 14, height: 14, type: 'buoy_red' },
      { x: 200, y: 180, width: 14, height: 14, type: 'buoy_green' },
      { x: canvas.width - 200, y: 180, width: 14, height: 14, type: 'buoy_red' },
      // Floating Salvage Crates
      { x: 280, y: 260, width: 22, height: 22, type: 'crate' },
      { x: 420, y: 140, width: 22, height: 22, type: 'crate' },
      // Moving river ferry
      { x: 150, y: 220, width: 70, height: 26, type: 'ferry', vx: 18 },
      // Destination Marina Berthing Slip
      { x: canvas.width / 2 - 45, y: 40, width: 90, height: 35, type: 'dock', label: 'CITY MARINA DOCK' }
    ];

    const simLoop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = currentTime;

      // Throttle Target Speed (-12 in reverse, up to 90 at Full Ahead)
      const targetSpeed = throttleRef.current === -1 ? -18 : throttleRef.current * 28;
      // Boat inertia acceleration/drag
      boatSpeedRef.current += (targetSpeed - boatSpeedRef.current) * dt * 0.9;

      // Rudder response is proportional to speed through water
      const turnRate = rudderInputRef.current * (boatSpeedRef.current * 0.9) * dt;
      boatHeadingRef.current = (boatHeadingRef.current + turnRate + 360) % 360;

      // Update position based on heading
      const rad = (boatHeadingRef.current * Math.PI) / 180;
      boatPosRef.current.x += Math.sin(rad) * boatSpeedRef.current * dt;
      boatPosRef.current.y -= Math.cos(rad) * boatSpeedRef.current * dt;

      // Boundary clamp inside channel
      boatPosRef.current.x = Math.max(70, Math.min(canvas.width - 70, boatPosRef.current.x));
      boatPosRef.current.y = Math.max(30, Math.min(canvas.height - 30, boatPosRef.current.y));

      // Wake particles behind stern
      if (Math.abs(boatSpeedRef.current) > 3) {
        const sternX = boatPosRef.current.x - Math.sin(rad) * 22;
        const sternY = boatPosRef.current.y + Math.cos(rad) * 22;
        wakeParticlesRef.current.push({
          x: sternX + (Math.random() - 0.5) * 8,
          y: sternY + (Math.random() - 0.5) * 8,
          radius: 3 + Math.random() * 3,
          alpha: 0.6
        });
      }

      // Update wake particles
      for (let i = wakeParticlesRef.current.length - 1; i >= 0; i--) {
        const p = wakeParticlesRef.current[i];
        p.radius += dt * 14;
        p.alpha -= dt * 0.45;
        if (p.alpha <= 0) {
          wakeParticlesRef.current.splice(i, 1);
        }
      }

      // Update hazards & collisions
      hazardsRef.current.forEach(h => {
        if (h.vx) {
          h.x += h.vx * dt;
          if (h.x > canvas.width - 160 || h.x < 140) h.vx *= -1;
        }

        // Distance to boat
        const dx = boatPosRef.current.x - (h.x + h.width / 2);
        const dy = boatPosRef.current.y - (h.y + h.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (h.type === 'crate' && !h.collected && dist < 32) {
          h.collected = true;
          coinsRef.current += 30;
          soundEffects.playCoinSound();
          gamepadManager.vibrate(60, 0.4, 0.2);
        } else if (h.type === 'dock' && dist < 45) {
          // Check docking speed
          if (Math.abs(boatSpeedRef.current) < 12) {
            setDockedSuccessfully(true);
            soundEffects.playTriumphChime();
          }
        }
      });

      // Update React HUD states
      setKnots(Math.round(Math.abs(boatSpeedRef.current) / 3));
      setHeading(Math.round(boatHeadingRef.current));
      setDepthMeters(+(12 + Math.sin(currentTime * 0.001) * 2.5).toFixed(1));
      setCoinsGathered(coinsRef.current);

      // ----------------------------------------------------
      // RENDER SIMULATION CANVAS
      // ----------------------------------------------------
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // 1. Water Channel Background with dynamic wave ripples
      renderWater(ctx, W, H, currentTime);

      // 2. Riverbanks & Quays
      renderQuays(ctx, W, H);

      // 3. Wake trails
      wakeParticlesRef.current.forEach(p => {
        ctx.fillStyle = `rgba(224, 242, 254, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // 4. Navigation Hazards & Docks
      hazardsRef.current.forEach(h => {
        if (h.type === 'crate' && h.collected) return;
        renderHazard(ctx, h);
      });

      // 5. Boat Vessel (Hull, Deck, Wheelhouse, Navigation Lights)
      renderBoat(ctx, boatPosRef.current.x, boatPosRef.current.y, boatHeadingRef.current);

      animationFrameRef.current = requestAnimationFrame(simLoop);
    };

    animationFrameRef.current = requestAnimationFrame(simLoop);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isOpen]);

  const handleFinish = () => {
    let finalReward = coinsGathered;
    if (dockedSuccessfully) finalReward += 50;
    if (finalReward > 0) onEarnCoins(finalReward);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-lg flex items-center justify-center p-3 select-none">
      <div className="relative w-full max-w-4xl bg-slate-950 border border-sky-400/40 rounded-3xl overflow-hidden shadow-2xl flex flex-col text-slate-100">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-900/90 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-400/20 text-sky-400 border border-sky-400/30 rounded-xl">
              <Ship className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-wide text-slate-100 uppercase">
                  {waterwayName || `${cityName} Waterfront`}
                </h2>
                <span className="text-[10px] font-mono bg-sky-950 text-sky-400 border border-sky-500/40 px-2 py-0.5 rounded-full font-bold">
                  NAVAL SIMULATOR
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Cruising the waters of {cityName}, {countryName} • Steer under bridges & dock safely at the marina!
              </p>
            </div>
          </div>

          <button
            onClick={handleFinish}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Canvas Viewport */}
        <div className="relative w-full h-[460px] bg-sky-950 flex items-center justify-center overflow-hidden">
          <canvas
            ref={canvasRef}
            width={860}
            height={460}
            className="w-full h-full object-cover"
          />

          {/* Floating Gauges HUD (Top Left) */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
            <div className="bg-slate-950/85 backdrop-blur-md border border-sky-400/30 px-3.5 py-2 rounded-2xl shadow-xl flex items-center gap-3">
              <Gauge className="w-5 h-5 text-sky-400" />
              <div>
                <div className="text-2xl font-black font-mono tracking-tight text-sky-300">
                  {knots} <span className="text-xs text-slate-400 font-normal">knots</span>
                </div>
                <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                  <Waves className="w-3 h-3 text-sky-400" /> Sonar: {depthMeters}m
                </div>
              </div>

              <div className="border-l border-slate-800 pl-3">
                <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <Compass className="w-3 h-3 text-sky-400" /> Helm
                </div>
                <div className="text-lg font-black font-mono text-sky-400">
                  {heading}°
                </div>
              </div>
            </div>
          </div>

          {/* Floating Dock Status & Salvage Coins (Top Right) */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            {dockedSuccessfully ? (
              <div className="bg-emerald-950/90 backdrop-blur-md border border-emerald-400 px-3.5 py-2 rounded-2xl text-xs font-mono text-emerald-300 flex items-center gap-2 shadow-xl animate-pulse">
                <Anchor className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="font-bold">BERTH DOCKED!</div>
                  <div className="text-[10px] text-emerald-400">+50 Marina Bonus</div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800 px-3 py-2 rounded-2xl text-[11px] font-mono text-slate-400">
                Dock Slip Ahead (Speed &lt; 4 kt)
              </div>
            )}

            <div className="bg-amber-950/80 backdrop-blur-md border border-amber-500/40 px-3.5 py-2 rounded-2xl shadow-xl flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <div>
                <div className="text-[10px] text-amber-300">Cargo Salvaged:</div>
                <div className="text-lg font-black font-mono text-amber-400">+{coinsGathered}</div>
              </div>
            </div>
          </div>

          {/* Engine Telegraph Floating Controls (Bottom Center) */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-slate-950/90 backdrop-blur-md p-1.5 rounded-2xl border border-sky-500/30 shadow-2xl">
            <button
              onMouseDown={() => (rudderInputRef.current = -1)}
              onMouseUp={() => (rudderInputRef.current = 0)}
              onTouchStart={() => (rudderInputRef.current = -1)}
              onTouchEnd={() => (rudderInputRef.current = 0)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold active:scale-95"
            >
              ◀ Port Helm (A)
            </button>

            {/* Throttle steps */}
            <div className="flex items-center gap-1">
              {[
                { val: -1, label: 'Astern' },
                { val: 0, label: 'Stop' },
                { val: 1, label: '1/3' },
                { val: 2, label: '2/3' },
                { val: 3, label: 'Full' }
              ].map(t => (
                <button
                  key={t.val}
                  onClick={() => {
                    setThrottle(t.val);
                    throttleRef.current = t.val;
                    soundEffects.playRadarPing(300 + t.val * 90, 0.1);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition border ${
                    throttle === t.val
                      ? 'bg-sky-500 text-slate-950 border-sky-300 shadow-lg shadow-sky-500/30'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <button
              onMouseDown={() => (rudderInputRef.current = 1)}
              onMouseUp={() => (rudderInputRef.current = 0)}
              onTouchStart={() => (rudderInputRef.current = 1)}
              onTouchEnd={() => (rudderInputRef.current = 0)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold active:scale-95"
            >
              Starboard ▶ (D)
            </button>

            {/* Fog Horn Button */}
            <button
              onClick={soundHorn}
              className={`p-2 rounded-xl border text-xs font-bold transition flex items-center justify-center active:scale-90 ${
                hornActive
                  ? 'bg-amber-400 text-slate-950 border-amber-300 scale-105'
                  : 'bg-slate-900 hover:bg-slate-800 text-sky-400 border-sky-500/30'
              }`}
              title="Sound Foghorn (Space / H)"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bottom Control Deck */}
        <div className="px-5 py-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span>Controls: <strong>A/D</strong> Helm • <strong>W/S</strong> Engine Telegraph • <strong>Space/H</strong> Horn</span>
          </div>

          <button
            onClick={handleFinish}
            className="px-4 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow"
          >
            <Anchor className="w-3.5 h-3.5" /> Finish & Disembark
          </button>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// RENDER HELPERS (Naval Canvas Simulation)
// ----------------------------------------------------------------------

function renderWater(ctx: CanvasRenderingContext2D, W: number, H: number, time: number) {
  const waterGrad = ctx.createLinearGradient(0, 0, 0, H);
  waterGrad.addColorStop(0, '#0369a1');
  waterGrad.addColorStop(0.5, '#075985');
  waterGrad.addColorStop(1, '#0c4a6e');
  ctx.fillStyle = waterGrad;
  ctx.fillRect(0, 0, W, H);

  // Soft moving wave crest lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 2;
  for (let y = 30; y < H; y += 45) {
    ctx.beginPath();
    for (let x = 0; x < W; x += 30) {
      const waveOffset = Math.sin((x + time * 0.04) * 0.03) * 6;
      if (x === 0) ctx.moveTo(x, y + waveOffset);
      else ctx.lineTo(x, y + waveOffset);
    }
    ctx.stroke();
  }
}

function renderQuays(ctx: CanvasRenderingContext2D, W: number, H: number) {
  // Left Riverbank / Stone Quay
  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 0, 60, H);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(60, 0);
  ctx.lineTo(60, H);
  ctx.stroke();

  // Right Riverbank
  ctx.fillRect(W - 60, 0, 60, H);
  ctx.beginPath();
  ctx.moveTo(W - 60, 0);
  ctx.lineTo(W - 60, H);
  ctx.stroke();
}

function renderHazard(ctx: CanvasRenderingContext2D, h: WaterHazard) {
  ctx.save();
  ctx.translate(h.x + h.width / 2, h.y + h.height / 2);

  if (h.type === 'buoy_red' || h.type === 'buoy_green') {
    // Navigational Buoy
    const color = h.type === 'buoy_red' ? '#ef4444' : '#22c55e';
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, h.width / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Flashing buoy light
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, -6, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (h.type === 'crate') {
    // Floating Salvage Crate
    ctx.fillStyle = '#b45309';
    ctx.fillRect(-h.width / 2, -h.height / 2, h.width, h.height);
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2;
    ctx.strokeRect(-h.width / 2, -h.height / 2, h.width, h.height);
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', 0, 0);
  } else if (h.type === 'dock') {
    // Marina Berthing Slip
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.fillRect(-h.width / 2, -h.height / 2, h.width, h.height);
    ctx.strokeRect(-h.width / 2, -h.height / 2, h.width, h.height);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(h.label || 'DOCK', 0, 0);
  } else if (h.type === 'ferry') {
    // River Ferry boat
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.roundRect(-h.width / 2, -h.height / 2, h.width, h.height, [6]);
    ctx.fill();
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(-h.width / 2 + 10, -h.height / 2 + 5, h.width - 20, h.height - 10);
  }

  ctx.restore();
}

function renderBoat(ctx: CanvasRenderingContext2D, x: number, y: number, headingDeg: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((headingDeg * Math.PI) / 180);

  // Boat Hull (Pointed bow at top)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, -32); // Bow tip
  ctx.quadraticCurveTo(16, -18, 14, 22); // Starboard gunwale
  ctx.lineTo(-14, 22); // Transom stern
  ctx.quadraticCurveTo(-16, -18, 0, -32); // Port gunwale
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Teak Decking
  ctx.fillStyle = '#d97706';
  ctx.beginPath();
  ctx.moveTo(0, -26);
  ctx.quadraticCurveTo(11, -14, 10, 18);
  ctx.lineTo(-10, 18);
  ctx.quadraticCurveTo(-11, -14, 0, -26);
  ctx.closePath();
  ctx.fill();

  // Cabin / Wheelhouse
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(-7, -10, 14, 18, [3]);
  ctx.fill();

  // Windshield (cyan tint)
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(-5, -8, 10, 5);

  // Port (red) and Starboard (green) Navigation Lights
  ctx.fillStyle = '#ef4444'; // Red Port
  ctx.beginPath();
  ctx.arc(-13, -12, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#22c55e'; // Green Starboard
  ctx.beginPath();
  ctx.arc(13, -12, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
