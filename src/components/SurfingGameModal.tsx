import React, { useRef, useEffect, useState, useCallback } from 'react';
import { X, Award, Waves, Zap } from 'lucide-react';
import type { RadioStation } from '../types';
import { soundEffects } from '../services/audioEffects';
import { MissionHUD } from './MissionHUD';
import type { MissionScenario, MissionResultPayload } from '../missions/types';
import confetti from 'canvas-confetti';

interface SurfingGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeStation: RadioStation | null;
  waterwayName: string | null;
  onAddCoins?: (amount: number) => void;
  highScore?: number;
  onUpdateHighScore?: (score: number) => void;
  /** Active World Expedition mission scenario (null = free surf) */
  missionScenario?: MissionScenario | null;
  /** Emitted exactly once when an active mission run settles */
  onMissionResult?: (payload: MissionResultPayload) => void;
}

interface SprayParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  color: string;
}

interface WaveCollectible {
  id: number;
  x: number;
  y: number;
  type: 'pearl' | 'wave_orb';
  collected: boolean;
}

export const SurfingGameModal: React.FC<SurfingGameModalProps> = ({
  isOpen,
  onClose,
  activeStation,
  waterwayName,
  onAddCoins,
  highScore = 0,
  onUpdateHighScore,
  missionScenario,
  onMissionResult
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game state
  const [gameState, setGameState] = useState<'ready' | 'surfing' | 'wipeout' | 'finished'>('ready');
  const [score, setScore] = useState(0);
  const [tubeTimeSec, setTubeTimeSec] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [styleRating, setStyleRating] = useState('Grommet');
  const [waveIntensity, setWaveIntensity] = useState(1.0);
  const [activeTrick, setActiveTrick] = useState<{ name: string; pts: number } | null>(null);
  const [longestTubeTime, setLongestTubeTime] = useState<number>(() => {
    const saved = localStorage.getItem('world_radio_surf_longest_tube');
    return saved ? parseFloat(saved) : 0;
  });

  // References for the 60fps loop
  const loopRef = useRef<number | null>(null);
  const keysRef = useRef<{ left: boolean; right: boolean; up: boolean; down: boolean; snap: boolean }>({
    left: false,
    right: false,
    up: false,
    down: false,
    snap: false
  });

  const surferRef = useRef({
    x: 350,
    y: 280,
    vx: 0,
    vy: 0,
    speed: 12,
    angle: 0,
    inTube: false,
    airborne: false,
    airTime: 0,
    wipeoutTimer: 0,
    carveHeat: 0
  });

  const particlesRef = useRef<SprayParticle[]>([]);
  const collectiblesRef = useRef<WaveCollectible[]>([]);
  const waveOffsetRef = useRef(0);
  const statsRef = useRef({ score: 0, tubeTime: 0, multiplier: 1, runTime: 0 });
  const trickCooldownRef = useRef(0);
  const floaterTimeRef = useRef(0);
  const trickTimerRef = useRef(0);
  const runSettledRef = useRef(false);

  // Mission context (World Expedition Command), read fresh by the 60fps loop.
  const scenarioRef = useRef<MissionScenario | null | undefined>(undefined);
  scenarioRef.current = missionScenario;
  const missionSettledRef = useRef<boolean>(false);

  // Fresh session each time the modal opens (clears any stale finished state)
  useEffect(() => {
    if (!isOpen) return;
    missionSettledRef.current = false;
    setGameState('ready');
  }, [isOpen]);

  // Settle the active mission exactly once — only when the ride is kicked out
  // on the open shoulder (finished). Wipeouts and early exits never settle,
  // so retrying is never punished and quitting cannot farm mission rewards.
  const settleMission = useCallback(() => {
    const scenario = scenarioRef.current;
    if (!scenario || missionSettledRef.current) return;
    missionSettledRef.current = true;
    onMissionResult?.({
      missionId: scenario.missionId,
      gameId: scenario.gameId,
      score: Math.round(statsRef.current.score),
      outcome: 'completed',
      stats: {
        rideScore: Math.round(statsRef.current.score),
        tubeTime: Math.round(statsRef.current.tubeTime * 10) / 10,
        runTime: Math.round(statsRef.current.runTime)
      }
    });
  }, [onMissionResult]);

  // Reset Surfer
  const resetRun = useCallback(() => {
    runSettledRef.current = false;
    surferRef.current = {
      x: 320,
      y: 260,
      vx: 0,
      vy: 0,
      speed: 14,
      angle: 0,
      inTube: false,
      airborne: false,
      airTime: 0,
      wipeoutTimer: 0,
      carveHeat: 0
    };
    particlesRef.current = [];
    statsRef.current = { score: 0, tubeTime: 0, multiplier: 1, runTime: 0 };
    setScore(0);
    setTubeTimeSec(0);
    setMultiplier(1);
    setCoinsEarned(0);
    setActiveTrick(null);
    setWaveIntensity(1.0);
    trickCooldownRef.current = 0;
    floaterTimeRef.current = 0;
    trickTimerRef.current = 0;

    // Generate collectibles across the wave face
    const items: WaveCollectible[] = [];
    for (let i = 0; i < 12; i++) {
      items.push({
        id: i,
        x: 400 + i * 280,
        y: 190 + Math.sin(i * 1.5) * 80,
        type: i % 3 === 0 ? 'wave_orb' : 'pearl',
        collected: false
      });
    }
    collectiblesRef.current = items;
    setGameState('surfing');
    soundEffects.playUiClick(0.3);
  }, []);

  // Keyboard handlers
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (['ArrowUp', 'KeyW'].includes(e.code)) keysRef.current.up = true;
      if (['ArrowDown', 'KeyS'].includes(e.code)) keysRef.current.down = true;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) keysRef.current.left = true;
      if (['ArrowRight', 'KeyD'].includes(e.code)) keysRef.current.right = true;
      if (['Space'].includes(e.code)) {
        e.preventDefault();
        keysRef.current.snap = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (['ArrowUp', 'KeyW'].includes(e.code)) keysRef.current.up = false;
      if (['ArrowDown', 'KeyS'].includes(e.code)) keysRef.current.down = false;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) keysRef.current.left = false;
      if (['ArrowRight', 'KeyD'].includes(e.code)) keysRef.current.right = false;
      if (['Space'].includes(e.code)) keysRef.current.snap = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isOpen]);

  // Main Canvas Render & Physics Loop
  useEffect(() => {
    if (!isOpen || gameState === 'ready') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();

    const render = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const width = canvas.width;
      const height = canvas.height;

      const surfer = surferRef.current;
      const keys = keysRef.current;
      const stats = statsRef.current;
      // Mission scenarios tune barrel vs open-face trick scoring weights
      const tubeScale = scenarioRef.current?.tubeScoreScale ?? 1;
      const trickScale = scenarioRef.current?.trickScoreScale ?? 1;

      // Progressive wave intensity over time
      const intensity = Math.min(2.2, 1.0 + stats.runTime * 0.035);
      waveOffsetRef.current += (160 * intensity) * dt;
      setWaveIntensity(Math.round(intensity * 10) / 10);

      // Trick display timer
      if (trickTimerRef.current > 0) {
        trickTimerRef.current -= dt;
        if (trickTimerRef.current <= 0) {
          setActiveTrick(null);
        }
      }
      if (trickCooldownRef.current > 0) {
        trickCooldownRef.current -= dt;
      }

      if (gameState === 'surfing') {
        stats.runTime += dt;

        // Wave face coordinates:
        // Wave curls on the left (x: 100 to 260 is the barrel section)
        // Wave face extends from y: 140 (crest lip) to y: 380 (trough bottom)
        const isTube = surfer.x > 90 && surfer.x < 240 && surfer.y > 170 && surfer.y < 320;
        surfer.inTube = isTube;

        if (isTube) {
          stats.tubeTime += dt;
          const currTube = Math.round(stats.tubeTime * 10) / 10;
          setTubeTimeSec(currTube);
          if (currTube > longestTubeTime) {
            setLongestTubeTime(currTube);
            localStorage.setItem('world_radio_surf_longest_tube', currTube.toString());
          }
          stats.multiplier = Math.min(5, 1 + Math.floor(stats.tubeTime * 1.5));
          setMultiplier(stats.multiplier);
          stats.score += Math.round(180 * dt * stats.multiplier * intensity * tubeScale);
        }

        // Steer inputs
        if (keys.left) {
          surfer.vx -= 480 * dt;
          surfer.angle = Math.max(-0.45, surfer.angle - 2.5 * dt);
          surfer.carveHeat = Math.min(1, surfer.carveHeat + 1.2 * dt);
        } else if (keys.right) {
          surfer.vx += 420 * dt;
          surfer.angle = Math.min(0.45, surfer.angle + 2.5 * dt);
          surfer.carveHeat = Math.min(1, surfer.carveHeat + 1.2 * dt);
        } else {
          surfer.angle *= 0.92;
          surfer.carveHeat = Math.max(0, surfer.carveHeat - 1.5 * dt);
        }

        // Up/Down face climbing
        if (keys.up) {
          surfer.vy -= 380 * dt; // climb face
          surfer.speed = Math.max(8, surfer.speed - 4 * dt);
        } else if (keys.down) {
          surfer.vy += 450 * dt; // drop down face, accelerates!
          surfer.speed = Math.min(26, surfer.speed + 6 * dt);
        }

        // ----------------------------------------------------
        // NAMED TRICK RECOGNITION SYSTEM
        // ----------------------------------------------------
        // 1. Cutback: sharp directional reversal back to pocket from the open shoulder
        if (keys.left && surfer.x > 320 && surfer.carveHeat > 0.4 && trickCooldownRef.current <= 0) {
          const pts = Math.round(180 * stats.multiplier * trickScale);
          stats.score += pts;
          setActiveTrick({ name: 'RADICAL CUTBACK', pts });
          trickTimerRef.current = 1.4;
          trickCooldownRef.current = 1.3;
          soundEffects.playRadarPing(900, 0.1);
        }

        // 2. Lip Floater: skimming horizontally on top of breaking lip
        if (keys.up && surfer.y <= 160 && surfer.speed > 13) {
          floaterTimeRef.current += dt;
          if (floaterTimeRef.current > 0.35 && trickCooldownRef.current <= 0) {
            const pts = Math.round(250 * stats.multiplier * trickScale);
            stats.score += pts;
            setActiveTrick({ name: 'LIP FLOATER', pts });
            trickTimerRef.current = 1.5;
            trickCooldownRef.current = 1.8;
            floaterTimeRef.current = 0;
            soundEffects.playRadarPing(1100, 0.1);
          }
        } else {
          floaterTimeRef.current = Math.max(0, floaterTimeRef.current - dt * 2);
        }

        // 3. Power Snap off the lip
        if (keys.snap && surfer.y < 210 && !surfer.airborne && surfer.speed > 13 && trickCooldownRef.current <= 0) {
          const pts = Math.round(320 * stats.multiplier * trickScale);
          stats.score += pts;
          setActiveTrick({ name: 'POWER SNAP', pts });
          trickTimerRef.current = 1.4;
          trickCooldownRef.current = 1.4;
          for (let i = 0; i < 16; i++) {
            particlesRef.current.push({
              x: surfer.x,
              y: surfer.y,
              vx: (Math.random() - 0.5) * 220,
              vy: -Math.random() * 140 - 40,
              radius: Math.random() * 4 + 2,
              alpha: 1,
              color: 'rgba(255,255,255,0.95)'
            });
          }
          soundEffects.playStaticBurst(0.08, 0.2);
        }

        // 4. Aerial off the lip
        if (keys.snap && surfer.y < 160 && !surfer.airborne && surfer.speed > 14) {
          surfer.airborne = true;
          surfer.airTime = 0.65;
          surfer.vy = -180;
          stats.score += Math.round(250 * stats.multiplier * trickScale);
          soundEffects.playTriumphChime(0.2);
        }

        // 5. Airborne Spin: Aerial 360 Air Reverse
        if (surfer.airborne && surfer.airTime > 0.1 && (keys.left || keys.right) && trickCooldownRef.current <= 0) {
          const pts = Math.round(500 * stats.multiplier * trickScale);
          stats.score += pts;
          setActiveTrick({ name: 'AERIAL 360', pts });
          trickTimerRef.current = 1.6;
          trickCooldownRef.current = 2.0;
          soundEffects.playTriumphChime(0.25);
        }

        // Airborne physics
        if (surfer.airborne) {
          surfer.airTime -= dt;
          surfer.vy += 350 * dt;
          if (surfer.airTime <= 0 && surfer.y >= 170) {
            surfer.airborne = false;
            // Landing spray
            for (let i = 0; i < 15; i++) {
              particlesRef.current.push({
                x: surfer.x,
                y: surfer.y,
                vx: (Math.random() - 0.5) * 200,
                vy: -Math.random() * 120,
                radius: Math.random() * 4 + 2,
                alpha: 1,
                color: 'rgba(255,255,255,0.9)'
              });
            }
          }
        }

        // Natural wave pull: wave pushes rider to the right towards shoulder
        surfer.vx += 35 * dt * intensity;
        // Gravity down the wave face
        surfer.vy += 40 * dt;

        // Apply friction
        surfer.vx *= 0.88;
        surfer.vy *= 0.88;

        surfer.x += surfer.vx * dt;
        surfer.y += surfer.vy * dt;

        // Boundaries:
        // Left boundary: if too far into the crashing white water, wipeout!
        if (surfer.x < 75 && !surfer.airborne) {
          setGameState('wipeout');
          soundEffects.playStaticBurst(0.3, 0.4);
        }
        // Right boundary: riding out on the shoulder completes the ride
        if (surfer.x > width - 60) {
          const finalScore = stats.score + 500;
          stats.score = finalScore;
          setScore(finalScore);
          const earned = Math.max(25, Math.round(finalScore / 40));
          setCoinsEarned(earned);
          if (onAddCoins && !runSettledRef.current) {
            onAddCoins(earned);
            runSettledRef.current = true;
          }
          if (onUpdateHighScore && finalScore > highScore) {
            onUpdateHighScore(finalScore);
          }

          let rating = 'Grommet';
          if (finalScore > 2500) rating = 'World Champion Pro';
          else if (finalScore > 1500) rating = 'Pipeline Master';
          else if (finalScore > 800) rating = 'Big Wave Charger';
          setStyleRating(rating);

          setGameState('finished');
          confetti({ particleCount: 80, spread: 60, origin: { y: 0.55 } });
          soundEffects.playTriumphChime(0.4);
          settleMission(); // mission settles exactly once, on riding out the shoulder
        }

        // Clamp Y (wave crest to trough)
        if (surfer.y < 140) surfer.y = 140;
        if (surfer.y > 380) surfer.y = 380;

        // Carve spray particles
        if (surfer.carveHeat > 0.3 || surfer.speed > 16) {
          for (let i = 0; i < 2; i++) {
            particlesRef.current.push({
              x: surfer.x - Math.sin(surfer.angle) * 15,
              y: surfer.y + 6,
              vx: -surfer.vx * 0.4 + (Math.random() - 0.5) * 80,
              vy: -Math.random() * 80 - 30,
              radius: Math.random() * 3.5 + 1.5,
              alpha: 0.85,
              color: 'rgba(230, 255, 255, 0.8)'
            });
          }
        }

        // Check collectibles collision
        collectiblesRef.current.forEach(c => {
          if (!c.collected) {
            const dx = surfer.x - c.x;
            const dy = surfer.y - c.y;
            if (Math.hypot(dx, dy) < 32) {
              c.collected = true;
              const bonus = c.type === 'wave_orb' ? 150 : 75;
              stats.score += Math.round(bonus * stats.multiplier * trickScale);
              soundEffects.playRadarPing(880, 0.1);
            }
          }
        });

        // Passive scoring
        stats.score += Math.round(surfer.speed * dt * 3);
        setScore(stats.score);
      }

      // --- DRAWING ---
      ctx.clearRect(0, 0, width, height);

      // 1. Sky & Horizon Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 150);
      skyGrad.addColorStop(0, '#0c1b33');
      skyGrad.addColorStop(0.6, '#1a365d');
      skyGrad.addColorStop(1, '#0284c7');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, 150);

      // Tropical sun glow
      const sunGrad = ctx.createRadialGradient(width * 0.75, 50, 5, width * 0.75, 50, 70);
      sunGrad.addColorStop(0, 'rgba(254, 240, 138, 0.8)');
      sunGrad.addColorStop(0.5, 'rgba(251, 146, 60, 0.3)');
      sunGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(width * 0.75, 50, 70, 0, Math.PI * 2);
      ctx.fill();

      // Distant tropical island mountains / coastline silhouette
      ctx.fillStyle = '#0f2942';
      ctx.beginPath();
      ctx.moveTo(0, 150);
      ctx.lineTo(80, 125);
      ctx.lineTo(190, 145);
      ctx.lineTo(310, 115);
      ctx.lineTo(430, 138);
      ctx.lineTo(560, 120);
      ctx.lineTo(width, 150);
      ctx.closePath();
      ctx.fill();

      // 2. Rolling Ocean Wave Body
      // Background deep water swell
      const oceanGrad = ctx.createLinearGradient(0, 140, 0, height);
      oceanGrad.addColorStop(0, '#0284c7');
      oceanGrad.addColorStop(0.3, '#0369a1');
      oceanGrad.addColorStop(0.6, '#075985');
      oceanGrad.addColorStop(1, '#082f49');
      ctx.fillStyle = oceanGrad;
      ctx.fillRect(0, 140, width, height - 140);

      // Dynamic wave curve lines (swell face contours)
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = 2;
      for (let y = 170; y < height - 20; y += 32) {
        ctx.beginPath();
        for (let x = 0; x <= width; x += 15) {
          const waveY = y + Math.sin((x + waveOffsetRef.current) * 0.02) * 8;
          if (x === 0) ctx.moveTo(x, waveY);
          else ctx.lineTo(x, waveY);
        }
        ctx.stroke();
      }

      // 3. The Breaking Barrel / Tube Section (Left side x: 0 to 240)
      // Curling translucent green barrel cylinder
      const tubeGrad = ctx.createLinearGradient(60, 140, 220, 320);
      tubeGrad.addColorStop(0, 'rgba(14, 165, 233, 0.4)');
      tubeGrad.addColorStop(0.4, 'rgba(45, 212, 191, 0.6)');
      tubeGrad.addColorStop(0.8, 'rgba(13, 148, 136, 0.7)');
      tubeGrad.addColorStop(1, 'rgba(15, 118, 110, 0.85)');

      ctx.fillStyle = tubeGrad;
      ctx.beginPath();
      ctx.moveTo(0, 140);
      ctx.bezierCurveTo(120, 120, 240, 150, 220, 310);
      ctx.bezierCurveTo(200, 370, 80, 380, 0, 360);
      ctx.closePath();
      ctx.fill();

      // Barrel interior glow if rider is inside
      if (surfer.inTube) {
        ctx.fillStyle = 'rgba(52, 211, 153, 0.22)';
        ctx.beginPath();
        ctx.arc(160, 250, 90, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#6ee7b7';
        ctx.font = 'bold 13px monospace';
        ctx.fillText('⚡ IN THE GREEN ROOM! ⚡', 90, 200);
      }

      // 4. White Crest Foam Lip (Tumbling down from x: 40 to 180)
      const foamLipGrad = ctx.createLinearGradient(0, 130, 160, 230);
      foamLipGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      foamLipGrad.addColorStop(0.6, 'rgba(224, 242, 254, 0.8)');
      foamLipGrad.addColorStop(1, 'rgba(186, 230, 253, 0.2)');
      ctx.fillStyle = foamLipGrad;
      ctx.beginPath();
      ctx.moveTo(0, 140);
      ctx.bezierCurveTo(70, 130, 170, 160, 160, 230);
      ctx.bezierCurveTo(120, 250, 30, 220, 0, 200);
      ctx.closePath();
      ctx.fill();

      // Foaming crashing water turbulence
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      for (let i = 0; i < 18; i++) {
        const bubbleX = 20 + (i * 9) + Math.sin(waveOffsetRef.current * 0.05 + i) * 8;
        const bubbleY = 160 + (i * 4) + Math.cos(waveOffsetRef.current * 0.04 + i) * 6;
        ctx.beginPath();
        ctx.arc(bubbleX, bubbleY, 3 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

      // 5. Draw Collectibles
      collectiblesRef.current.forEach(c => {
        if (c.collected) return;
        ctx.save();
        ctx.translate(c.x, c.y);
        if (c.type === 'wave_orb') {
          // Radio Wave Orb
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(0, 0, 11, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#e0f2fe';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.font = '9px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⚡', 0, 0);
        } else {
          // Golden Pearl
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(0, 0, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.fillStyle = '#78350f';
          ctx.font = '8px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('★', 0, 0);
        }
        ctx.restore();
      });

      // 6. Draw Spray Particles
      particlesRef.current.forEach((p, idx) => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 180 * dt; // gravity
        p.alpha -= 1.1 * dt;
        if (p.alpha <= 0) {
          particlesRef.current.splice(idx, 1);
          return;
        }
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // 7. Draw Surfer & Surfboard
      ctx.save();
      ctx.translate(surfer.x, surfer.y);
      ctx.rotate(surfer.angle);

      // Surfboard shadow on water
      ctx.fillStyle = 'rgba(7, 89, 133, 0.4)';
      ctx.beginPath();
      ctx.ellipse(2, 10, 28, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Surfboard deck (fiberglass with color stringer)
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 30, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Stringer line
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-28, 0);
      ctx.lineTo(28, 0);
      ctx.stroke();

      // Surfer Body
      // Stance: low center of gravity knees bent
      ctx.fillStyle = '#0284c7'; // boardshorts
      ctx.fillRect(-6, -14, 12, 10);

      // Torso
      ctx.fillStyle = '#f59e0b'; // rashguard
      ctx.fillRect(-5, -24, 10, 11);

      // Head & hair
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.arc(0, -29, 5.5, 0, Math.PI * 2);
      ctx.fill();

      // Extended arms balancing
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-5, -20);
      ctx.lineTo(-14, -16); // back arm
      ctx.moveTo(5, -20);
      ctx.lineTo(16, -22); // forward arm leading the turn
      ctx.stroke();

      ctx.restore();

      loopRef.current = requestAnimationFrame(render);
    };

    loopRef.current = requestAnimationFrame(render);
    return () => {
      if (loopRef.current) cancelAnimationFrame(loopRef.current);
    };
  }, [isOpen, gameState, onAddCoins, longestTubeTime, highScore, onUpdateHighScore, settleMission]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-sky-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-sky-500/20 flex items-center justify-between bg-gradient-to-r from-sky-950/80 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/20 text-sky-400 rounded-2xl border border-sky-500/30">
              <Waves className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-100">
                  Ocean Swell Surfing Simulator
                </h3>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-500/30">
                  Coastal Waters
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {waterwayName || 'Pacific Ocean Swell & Coastal Surf Reef'} • {activeStation?.place || 'Coastal Region'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {highScore > 0 && (
              <div className="text-right hidden sm:block">
                <div className="text-[10px] uppercase font-mono text-slate-400">Record</div>
                <div className="font-mono font-bold text-xs text-amber-400">{highScore.toLocaleString()}</div>
              </div>
            )}
            <div className="text-right">
              <div className="text-[10px] uppercase font-mono text-slate-400">Score</div>
              <div className="font-mono font-bold text-lg text-sky-300">{score.toLocaleString()}</div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mission objective banner (World Expedition Command) */}
        <MissionHUD
          scenario={missionScenario}
          progressLabel={gameState === 'finished' ? 'Rode out the shoulder ✓' : `Score ${score.toLocaleString()}`}
          secondaryLabel={`Tube ${tubeTimeSec}s • Mult ${multiplier}x`}
        />

        {/* Game Canvas Container */}
        <div className="relative w-full bg-slate-950 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={760}
            height={440}
            className="w-full h-auto max-h-[38vh] sm:max-h-[440px] block"
          />

          {/* Floating Trick Banner */}
          {activeTrick && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 bg-gradient-to-r from-amber-400 to-rose-400 text-slate-950 font-black px-4 py-1.5 rounded-full text-xs font-mono shadow-2xl animate-bounce flex items-center gap-1.5 border border-white/60">
              <Zap className="w-3.5 h-3.5 fill-slate-950" />
              {activeTrick.name} +{activeTrick.pts} PTS!
            </div>
          )}

          {/* In-Game HUD Overlays */}
          {gameState === 'surfing' && (
            <div className="absolute top-3 left-4 right-4 flex items-center justify-between pointer-events-none">
              <div className="flex items-center gap-2 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-sky-500/30 text-xs font-mono text-slate-200">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Tube: <strong className="text-amber-300">{tubeTimeSec}s</strong></span>
                <span className="text-slate-500">|</span>
                <span>Best: <strong className="text-teal-300">{longestTubeTime}s</strong></span>
                <span className="text-slate-500">|</span>
                <span>Mult: <strong className="text-sky-400">{multiplier}x</strong></span>
                <span className="text-slate-500">|</span>
                <span className="text-cyan-300">{(4.5 * waveIntensity).toFixed(1)}ft Swell</span>
              </div>

              <div className="text-xs font-mono bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-sky-500/30 text-slate-300">
                A/D Carve • W/S Face • Space Snap / Air
              </div>
            </div>
          )}

          {/* Ready Overlay */}
          {gameState === 'ready' && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
              <div className="p-4 bg-sky-500/20 text-sky-400 rounded-full border border-sky-500/40 mb-3">
                <Waves className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-bold text-slate-100 mb-1">Paddle Into The Swell!</h2>
              <p className="text-xs text-slate-400 max-w-md mb-5 leading-relaxed">
                Catch the wave crest, drop down the face, carve radical bottom turns, execute Cutbacks and Lip Floaters, and tuck into the deep green tube!
              </p>

              <div className="grid grid-cols-2 gap-3 max-w-sm w-full mb-6 text-left text-xs font-mono bg-slate-900/90 p-3 rounded-2xl border border-sky-500/20 text-slate-300">
                <div>• <strong className="text-sky-300">A / D</strong>: Carve / Cutback</div>
                <div>• <strong className="text-sky-300">W / S</strong>: Lip Floater / Drop</div>
                <div>• <strong className="text-amber-300">Tube</strong>: Tuck into barrel</div>
                <div>• <strong className="text-sky-300">Space</strong>: Snap / Aerial 360</div>
              </div>

              <button
                onClick={resetRun}
                className="px-6 py-2.5 bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-400 hover:to-teal-400 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-sky-500/30 transition active:scale-95"
              >
                Catch Wave →
              </button>
            </div>
          )}

          {/* Wipeout Overlay */}
          {gameState === 'wipeout' && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
              <h2 className="text-2xl font-bold text-rose-400 mb-1">Wipeout in the Whitewater!</h2>
              <p className="text-xs text-slate-300 max-w-sm mb-4">
                You got caught by the crushing foam lip. Shake off the seawater and paddle back out to the lineup!
              </p>
              <button
                onClick={resetRun}
                className="px-5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl shadow transition"
              >
                Paddle Out Again ↺
              </button>
            </div>
          )}

          {/* Finished Overlay */}
          {gameState === 'finished' && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
              <Award className="w-12 h-12 text-yellow-400 animate-bounce mb-2" />
              <h2 className="text-2xl font-bold text-slate-100 mb-0.5">Wave Ridden To The Shoulder!</h2>
              <div className="text-sm font-bold text-sky-300 mb-3">{styleRating}</div>

              <div className="grid grid-cols-3 gap-3 max-w-sm w-full mb-5 text-center font-mono text-xs bg-slate-900/90 p-3 rounded-2xl border border-sky-500/30 text-slate-200">
                <div>
                  <div className="text-slate-400 text-[10px]">TOTAL SCORE</div>
                  <div className="text-base font-bold text-yellow-400">{score.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px]">TUBE TIME</div>
                  <div className="text-base font-bold text-teal-300">{tubeTimeSec}s</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px]">BEST TUBE</div>
                  <div className="text-base font-bold text-sky-300">{longestTubeTime}s</div>
                </div>
              </div>

              <div className="text-xs text-amber-300 font-bold mb-4">
                +{coinsEarned} Traveler Coins awarded!
              </div>

              <div className="flex gap-3">
                <button
                  onClick={resetRun}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition"
                >
                  Ride Another Wave
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl transition shadow"
                >
                  Return to Port
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
