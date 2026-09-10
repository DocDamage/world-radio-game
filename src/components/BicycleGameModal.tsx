import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bike, Bell, X, Zap, Wind, Trophy, Sparkles, AlertTriangle, RotateCcw } from 'lucide-react';
import { celebrate } from '../services/celebrate';
import { settingsStore } from '../services/settingsStore';
import { soundEffects } from '../services/audioEffects';
import { gamepadManager } from '../services/gamepadManager';
import { MissionHUD } from './MissionHUD';
import { useModalA11y } from '../hooks/useModalA11y';
import type { EnvironmentType } from '../types';
import type { MissionScenario, MissionResultPayload } from '../missions/types';

interface BicycleGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  cityName: string;
  countryName: string;
  biome: EnvironmentType;
  onEarnCoins: (amount: number) => void;
  highScore?: number;
  onUpdateHighScore?: (score: number) => void;
  /** Active World Expedition mission scenario (null = free arcade ride) */
  missionScenario?: MissionScenario | null;
  /** Emitted exactly once when an active mission run settles */
  onMissionResult?: (payload: MissionResultPayload) => void;
}

type BicycleState = 'riding' | 'crashed' | 'finished';

interface Obstacle {
  x: number; // -1 (far left) to 1 (far right)
  z: number; // 0 (at player) to 1000 (far horizon)
  type: 'car' | 'taxi' | 'scooter' | 'pedestrian' | 'cone' | 'coin';
  speed: number;
  width: number;
  height: number;
  color: string;
  scared?: boolean;
}

export const BicycleGameModal: React.FC<BicycleGameModalProps> = ({
  isOpen,
  onClose,
  cityName,
  countryName,
  biome,
  onEarnCoins,
  highScore = 0,
  onUpdateHighScore,
  missionScenario,
  onMissionResult
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game state
  const [gameState, setGameState] = useState<BicycleState>('riding');
  const [speed, setSpeed] = useState<number>(0);
  const [gear, setGear] = useState<number>(3);
  const [distanceMeters, setDistanceMeters] = useState<number>(0);
  const [coinsCollected, setCoinsCollected] = useState<number>(0);
  const [calories, setCalories] = useState<number>(0);
  const [cadenceRpm, setCadenceRpm] = useState<number>(0);
  const [bellActive, setBellActive] = useState<boolean>(false);
  const [nearMissCount, setNearMissCount] = useState<number>(0);
  const [comboMultiplier, setComboMultiplier] = useState<number>(1);
  const [isDrafting, setIsDrafting] = useState<boolean>(false);
  // Route length: mission scenarios tune it (e.g. 1,600m incline vs 2,200m avenue)
  const finishDistance = missionScenario?.finishDistance ?? 2000;

  // Mission context (World Expedition Command). Kept in a ref so the 60fps loop
  // and event handlers always read the latest scenario without re-subscribing.
  const scenarioRef = useRef<MissionScenario | null | undefined>(undefined);
  useEffect(() => {
    scenarioRef.current = missionScenario;
  });
  const missionSettledRef = useRef<boolean>(false);

  // Settle the active mission exactly once — only when the route is completed.
  // Crashes and early exits never settle, so retrying is never punished and
  // quitting mid-ride can never farm mission rewards. Run stats are passed in
  // by the caller (the game loop) instead of read from refs here, keeping this
  // render-created callback free of ref reads.
  const settleMission = useCallback(
    (stats: { distance: number; coins: number; nearMisses: number }) => {
      const scenario = scenarioRef.current;
      if (!scenario || missionSettledRef.current) return;
      missionSettledRef.current = true;
      const w = scenario.scoreWeights || {};
      const score = Math.round(
        stats.distance +
        stats.coins * (w.coin ?? 5) +
        stats.nearMisses * (w.nearMiss ?? 10)
      );
      onMissionResult?.({
        missionId: scenario.missionId,
        gameId: scenario.gameId,
        score,
        outcome: 'completed',
        stats: {
          distance: Math.round(stats.distance),
          coins: stats.coins,
          nearMisses: stats.nearMisses
        }
      });
    },
    [onMissionResult]
  );

  // Internal mutable refs for 60fps game loop
  const gameStateRef = useRef<BicycleState>('riding');
  const playerXRef = useRef<number>(0); // -0.85 to 0.85
  const speedRef = useRef<number>(0);
  const gearRef = useRef<number>(3);
  const distanceRef = useRef<number>(0);
  const coinsRef = useRef<number>(0);
  const caloriesRef = useRef<number>(0);
  const curveRef = useRef<number>(0);
  const targetCurveRef = useRef<number>(0);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const lastTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const steerInputRef = useRef<number>(0);
  const pedalTimerRef = useRef<number>(0);
  const bellRingTimerRef = useRef<number>(0);
  const comboMultiplierRef = useRef<number>(1);
  const comboDecayTimerRef = useRef<number>(0);
  const draftTimerRef = useRef<number>(0);
  const isDraftingRef = useRef<boolean>(false);
  const nearMissRef = useRef<number>(0);
  const shakeRef = useRef<number>(0);
  const runSettledRef = useRef<boolean>(false);

  // Sound and bell
  const ringBell = useCallback(() => {
    soundEffects.playBikeBell();
    gamepadManager.vibrate(100, 0.4, 0.2);
    bellRingTimerRef.current = 1.2;
    setBellActive(true);
    setTimeout(() => setBellActive(false), 600);

    // Scatter any nearby pedestrians
    obstaclesRef.current.forEach(obs => {
      if (obs.type === 'pedestrian' && obs.z < 450) {
        obs.scared = true;
        obs.x += obs.x >= 0 ? 0.35 : -0.35;
      }
    });
  }, []);

  // Pedal push action
  const handlePedalPush = useCallback(() => {
    if (gameStateRef.current !== 'riding') return;
    // Gear determines acceleration vs top speed
    const maxSpeedByGear = [16, 24, 34, 42, 52][gearRef.current - 1];
    const accel = [5.5, 4.8, 4.0, 3.2, 2.5][gearRef.current - 1] * (scenarioRef.current?.accelScale ?? 1);

    speedRef.current = Math.min(maxSpeedByGear, speedRef.current + accel);
    pedalTimerRef.current = 0.4;
    caloriesRef.current += 0.2;
    gamepadManager.vibrate(40, 0.2, 0.1);
  }, []);

  // Keyboard controls
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
        steerInputRef.current = -1;
      } else if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
        steerInputRef.current = 1;
      } else if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp' || e.code === 'Space') {
        e.preventDefault();
        handlePedalPush();
      } else if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') {
        speedRef.current = Math.max(0, speedRef.current - 4.5);
      } else if (e.key === 'b' || e.key === 'B') {
        ringBell();
      } else if (e.key >= '1' && e.key <= '5') {
        const newGear = parseInt(e.key, 10);
        gearRef.current = newGear;
        setGear(newGear);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      e.stopPropagation();
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
  }, [isOpen, handlePedalPush, ringBell]);

  // Main 60 FPS Canvas Game Loop
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset loop variables
    lastTimeRef.current = performance.now();
    speedRef.current = 14;
    obstaclesRef.current = [];
    distanceRef.current = 0;
    coinsRef.current = 0;
    playerXRef.current = 0;
    missionSettledRef.current = false;

    // Pre-populate initial coins and obstacles
    for (let i = 0; i < 7; i++) {
      spawnObstacle(200 + i * 140);
    }

    function spawnObstacle(startZ: number) {
      // Mission scenarios tune the coin/hazard mix via bounded density weights
      // (base pool: 3 coins vs 5 hazards — identical odds to the original array pick)
      const coinWeight = 3 * (scenarioRef.current?.coinDensity ?? 1);
      const hazardWeight = 5 * (scenarioRef.current?.trafficDensity ?? 1);
      const roll = Math.random() * (coinWeight + hazardWeight);
      let type: Obstacle['type'];
      if (roll < coinWeight) {
        type = 'coin';
      } else {
        const hazards: Obstacle['type'][] = ['car', 'taxi', 'scooter', 'pedestrian', 'cone'];
        const idx = Math.min(
          hazards.length - 1,
          Math.floor(((roll - coinWeight) / hazardWeight) * hazards.length)
        );
        type = hazards[idx];
      }
      const x = (Math.random() - 0.5) * 1.5;
      const speed = type === 'coin' || type === 'cone' ? 0 : type === 'pedestrian' ? 1.5 : 8 + Math.random() * 8;

      let color = '#38bdf8';
      if (type === 'car') color = '#e11d48';
      if (type === 'taxi') color = '#facc15';
      if (type === 'scooter') color = '#4ade80';
      if (type === 'cone') color = '#fb923c';

      obstaclesRef.current.push({
        x,
        z: startZ,
        type,
        speed,
        width: type === 'coin' ? 30 : type === 'pedestrian' ? 25 : 55,
        height: type === 'coin' ? 30 : type === 'pedestrian' ? 50 : 38,
        color
      });
    }

    let nextSpawnDistance = 0;

    const gameLoop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = currentTime;

      if (gameStateRef.current === 'riding') {
        // Natural drag / friction (reduced if drafting)
        const dragRate = isDraftingRef.current ? 0.6 : 1.8;
        speedRef.current = Math.max(0, speedRef.current - dragRate * dt);

        // Steering
        playerXRef.current += steerInputRef.current * 1.35 * dt;
        playerXRef.current = Math.max(-0.85, Math.min(0.85, playerXRef.current));

        // Advance distance
        const distanceStep = (speedRef.current / 3.6) * dt * 10;
        distanceRef.current += distanceStep;

        // Combo decay timer
        if (comboDecayTimerRef.current > 0) {
          comboDecayTimerRef.current -= dt;
          if (comboDecayTimerRef.current <= 0) {
            comboMultiplierRef.current = 1;
            setComboMultiplier(1);
          }
        }

        // Check Drafting Slipstream behind cars/taxis
        let vehicleAhead = false;
        for (const obs of obstaclesRef.current) {
          if ((obs.type === 'car' || obs.type === 'taxi') && obs.z > 30 && obs.z < 160) {
            const dx = Math.abs(obs.x - playerXRef.current);
            if (dx < 0.22) {
              vehicleAhead = true;
              break;
            }
          }
        }

        if (vehicleAhead) {
          draftTimerRef.current += dt;
          if (draftTimerRef.current > 0.6) {
            if (!isDraftingRef.current) {
              soundEffects.playRadarPing(950, 0.08);
            }
            isDraftingRef.current = true;
            setIsDrafting(true);
            speedRef.current = Math.min(58, speedRef.current + 12 * dt);
          }
        } else {
          draftTimerRef.current = Math.max(0, draftTimerRef.current - dt * 2);
          if (draftTimerRef.current <= 0 && isDraftingRef.current) {
            isDraftingRef.current = false;
            setIsDrafting(false);
          }
        }

        // Check Finish Line
        if (distanceRef.current >= finishDistance) {
          gameStateRef.current = 'finished';
          setGameState('finished');
          const bonusCoins = 50 + Math.round(nearMissRef.current * 3);
          coinsRef.current += bonusCoins;
          setCoinsCollected(coinsRef.current);
          if (onUpdateHighScore) {
            onUpdateHighScore(Math.round(distanceRef.current));
          }
          celebrate({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
          soundEffects.playTriumphChime(0.5);
          settleMission({ // mission settles exactly once, on route completion
            distance: distanceRef.current,
            coins: coinsRef.current,
            nearMisses: nearMissRef.current
          });
        }

        // Road curve swaying
        if (Math.random() < 0.02) {
          targetCurveRef.current = (Math.random() - 0.5) * 1.2;
        }
        curveRef.current += (targetCurveRef.current - curveRef.current) * dt * 1.5;

        // Spawn new obstacles as we advance
        nextSpawnDistance += distanceStep;
        if (nextSpawnDistance > 90) {
          nextSpawnDistance = 0;
          spawnObstacle(950 + Math.random() * 200);
        }

        // Update obstacles
        for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
          const obs = obstaclesRef.current[i];
          // Move towards player
          obs.z -= (speedRef.current * 14 - obs.speed * 8) * dt;

          // Collision or Near Miss check near player (z between -15 and 35)
          if (obs.z > -20 && obs.z < 40) {
            const dx = Math.abs(obs.x - playerXRef.current);
            if (obs.type === 'coin') {
              if (dx < 0.28) {
                // Collected Coin!
                coinsRef.current += 1 * comboMultiplierRef.current;
                soundEffects.playCoinSound();
                gamepadManager.vibrate(50, 0.4, 0.2);
                obstaclesRef.current.splice(i, 1);
                continue;
              }
            } else {
              // Hazard
              if (dx < 0.22) {
                if (speedRef.current > 30) {
                  // High-speed Wipeout Crash!
                  gameStateRef.current = 'crashed';
                  setGameState('crashed');
                  shakeRef.current = 1.0;
                  soundEffects.playStaticBurst(0.4, 0.5);
                  gamepadManager.vibrate(350, 1.0, 0.8);
                  if (onUpdateHighScore && distanceRef.current > highScore) {
                    onUpdateHighScore(Math.round(distanceRef.current));
                  }
                  break;
                } else {
                  // Minor low-speed bump
                  speedRef.current = Math.max(4, speedRef.current * 0.4);
                  shakeRef.current = 0.3;
                  soundEffects.playStaticBurst(0.1, 0.2);
                  gamepadManager.vibrate(180, 0.8, 0.6);
                  obs.z = -50; // pass player
                }
              } else if (dx < 0.38 && !obs.scared) {
                // Near miss combo chain!
                obs.scared = true;
                setNearMissCount(n => n + 1);
                comboMultiplierRef.current = Math.min(4, comboMultiplierRef.current + 1);
                comboDecayTimerRef.current = 3.0;
                setComboMultiplier(comboMultiplierRef.current);
                coinsRef.current += comboMultiplierRef.current;
                soundEffects.playRadarPing(600 + comboMultiplierRef.current * 140, 0.1);
              }
            }
          }

          // Remove passed obstacles
          if (obs.z < -40) {
            obstaclesRef.current.splice(i, 1);
          }
        }

        // Sync state to React for HUD
        setSpeed(Math.round(speedRef.current));
        setDistanceMeters(Math.round(distanceRef.current));
        setCoinsCollected(coinsRef.current);
        setCalories(Math.round(caloriesRef.current));
        setCadenceRpm(Math.round(speedRef.current * 2.8));
      }

      // ----------------------------------------------------
      // RENDER CANVAS
      // ----------------------------------------------------
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      ctx.save();
      // Apply screen shake
      if (shakeRef.current > 0) {
        shakeRef.current = Math.max(0, shakeRef.current - dt * 2.5);
        const scale = settingsStore.getShakeScale();
        const sx = (Math.random() - 0.5) * shakeRef.current * 18 * scale;
        const sy = (Math.random() - 0.5) * shakeRef.current * 18 * scale;
        ctx.translate(sx, sy);
      }

      // 1. Sky & Backdrop based on Biome
      renderSkyAndHorizon(ctx, W, H, biome, curveRef.current);

      // 2. 2.5D Pseudo-3D Road
      renderRoad(ctx, W, H, curveRef.current, distanceRef.current);

      // 3. Obstacles (sorted by z from far to near)
      const sortedObstacles = [...obstaclesRef.current].sort((a, b) => b.z - a.z);
      sortedObstacles.forEach(obs => {
        renderObstacle(ctx, W, H, obs, curveRef.current);
      });

      // 4. Bicycle Handlebars & Cyclist View (Foreground)
      renderBicycleHandlebars(
        ctx,
        W,
        H,
        playerXRef.current,
        steerInputRef.current,
        speedRef.current,
        currentTime
      );

      ctx.restore();

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isOpen, biome, highScore, onUpdateHighScore, finishDistance, settleMission]);

  // Restart Run (settles any earned coins from prior attempt before restarting)
  const handleRestart = () => {
    if (coinsRef.current > 0 && !runSettledRef.current) {
      onEarnCoins(coinsRef.current);
      runSettledRef.current = true;
    }
    speedRef.current = 14;
    obstaclesRef.current = [];
    distanceRef.current = 0;
    coinsRef.current = 0;
    playerXRef.current = 0;
    shakeRef.current = 0;
    comboMultiplierRef.current = 1;
    comboDecayTimerRef.current = 0;
    draftTimerRef.current = 0;
    isDraftingRef.current = false;
    runSettledRef.current = false;
    nearMissRef.current = 0;
    gameStateRef.current = 'riding';
    setGameState('riding');
    setSpeed(14);
    setDistanceMeters(0);
    setCoinsCollected(0);
    setNearMissCount(0);
    setComboMultiplier(1);
    setIsDrafting(false);
  };

  // Award coins on modal close (guaranteed once-only)
  const handleExit = () => {
    if (coinsRef.current > 0 && !runSettledRef.current) {
      onEarnCoins(coinsRef.current);
      runSettledRef.current = true;
    }
    if (onUpdateHighScore && distanceRef.current > highScore) {
      onUpdateHighScore(Math.round(distanceRef.current));
    }
    onClose();
  };

  // Shared modal a11y: Escape to close, focus trap, focus restore
  const { containerRef: dialogRef, dialogProps } = useModalA11y({ isOpen, onClose });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-lg flex items-center justify-center p-3 select-none">
      <div ref={dialogRef} {...dialogProps} className="relative w-full max-w-4xl bg-slate-950 border border-lime-400/40 rounded-3xl overflow-hidden shadow-2xl flex flex-col text-slate-100 max-h-[94vh]">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-900/90 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-lime-400/20 text-lime-400 border border-lime-400/30 rounded-xl">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-wide text-slate-100 uppercase">
                  {cityName} Street Cycling Grand Prix
                </h2>
                <span className="text-[10px] font-mono bg-lime-950 text-lime-400 border border-lime-500/40 px-2 py-0.5 rounded-full font-bold">
                  ARCADE MODE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Pedal through the streets of {cityName}, {countryName} • Avoid traffic & gather coins!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExit}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mission objective banner (World Expedition Command) */}
        <MissionHUD
          scenario={missionScenario}
          progressLabel={`${distanceMeters} / ${finishDistance} m`}
          secondaryLabel={`Coins ${coinsCollected} • Near-miss ${nearMissCount}`}
        />

        {/* Live Arcade Canvas Viewport */}
        <div className="relative w-full h-[300px] sm:h-[460px] bg-slate-950 flex items-center justify-center overflow-hidden">
          <canvas
            ref={canvasRef}
            width={860}
            height={460}
            className="w-full h-full object-cover"
          />

          {/* Floating On-Canvas Speed & Stats HUD */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
            {/* Speedometer Gauge */}
            <div className="bg-slate-950/80 backdrop-blur-md border border-lime-400/30 px-3.5 py-2 rounded-2xl shadow-xl flex items-center gap-3">
              <div>
                <div className="text-3xl font-black font-mono tracking-tight text-lime-400">
                  {speed} <span className="text-xs text-slate-400 font-normal">km/h</span>
                </div>
                <div className="text-[10px] font-mono text-slate-400">
                  Cadence: {cadenceRpm} RPM
                </div>
              </div>
              <div className="border-l border-slate-800 pl-3 text-right">
                <div className="text-[10px] uppercase font-bold text-slate-400">Gear</div>
                <div className="text-xl font-black font-mono text-amber-400">
                  {gear} <span className="text-xs text-slate-500 font-normal">/ 5</span>
                </div>
              </div>
            </div>

            {/* Calories & Distance */}
            <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800 px-3 py-2 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-mono">
              <div>
                <div className="text-slate-400 text-[10px]">Distance:</div>
                <div className="text-slate-100 font-bold">{distanceMeters} m</div>
              </div>
              <div className="border-l border-slate-800 pl-2">
                <div className="text-slate-400 text-[10px]">Calories:</div>
                <div className="text-amber-400 font-bold">{calories} kcal</div>
              </div>
            </div>
          </div>

          {/* Floating Score, Combo & Coins */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            {comboMultiplier > 1 && (
              <div className="bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 font-black px-3 py-1.5 rounded-2xl text-xs font-mono shadow-xl animate-pulse flex items-center gap-1 border border-amber-300">
                <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                {comboMultiplier}x COMBO!
              </div>
            )}

            <div className="bg-amber-950/80 backdrop-blur-md border border-amber-500/40 px-3.5 py-2 rounded-2xl shadow-xl flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <div>
                <div className="text-xs text-amber-300 font-bold">Coins Found:</div>
                <div className="text-xl font-black font-mono text-amber-400">+{coinsCollected}</div>
              </div>
            </div>

            {highScore > 0 && (
              <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 px-3 py-2 rounded-2xl text-xs font-mono text-slate-300 hidden sm:block">
                Best: <span className="font-bold text-lime-400">{highScore}m</span>
              </div>
            )}
          </div>

          {/* Slipstream Drafting Banner */}
          {isDrafting && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 bg-sky-500/90 text-slate-950 px-4 py-1 rounded-full font-black text-xs uppercase tracking-wider animate-bounce shadow-lg flex items-center gap-1.5 border border-sky-300">
              <Wind className="w-3.5 h-3.5" /> Drafting Slipstream +Speed!
            </div>
          )}

          {/* Course Progress Bar */}
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 w-64 bg-slate-900/80 backdrop-blur-sm border border-slate-700/60 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-lime-400 to-emerald-400 h-full transition-all duration-200"
              style={{ width: `${Math.min(100, (distanceMeters / finishDistance) * 100)}%` }}
            />
          </div>

          {/* Quick Arcade Touch / On-screen Controls */}
          {gameState === 'riding' && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
              <button
                onMouseDown={() => (steerInputRef.current = -1)}
                onMouseUp={() => (steerInputRef.current = 0)}
                onTouchStart={() => (steerInputRef.current = -1)}
                onTouchEnd={() => (steerInputRef.current = 0)}
                className="px-4 py-2.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-2xl text-xs font-bold active:scale-95 shadow-lg"
              >
                ◀ Steer Left (A)
              </button>

              <button
                onClick={handlePedalPush}
                className="px-6 py-3 bg-gradient-to-r from-lime-400 to-emerald-400 hover:from-lime-300 hover:to-emerald-300 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-lime-400/20 active:scale-90 flex items-center gap-1.5"
              >
                <Zap className="w-4 h-4 fill-slate-950" /> PEDAL! (Tap W / Space)
              </button>

              <button
                onMouseDown={() => (steerInputRef.current = 1)}
                onMouseUp={() => (steerInputRef.current = 0)}
                onTouchStart={() => (steerInputRef.current = 1)}
                onTouchEnd={() => (steerInputRef.current = 0)}
                className="px-4 py-2.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-2xl text-xs font-bold active:scale-95 shadow-lg"
              >
                Steer Right (D) ▶
              </button>

              <button
                onClick={ringBell}
                className={`p-3 rounded-2xl border text-xs font-bold transition flex items-center justify-center active:scale-90 shadow-lg ${
                  bellActive
                    ? 'bg-amber-400 text-slate-950 border-amber-300 scale-105'
                    : 'bg-slate-900/90 hover:bg-slate-800 text-amber-400 border-amber-500/30'
                }`}
                title="Ring Bell (B)"
              >
                <Bell className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Crashed Game Over Overlay */}
          {gameState === 'crashed' && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md z-20 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
              <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-full mb-3 text-rose-400">
                <AlertTriangle className="w-10 h-10 animate-bounce" />
              </div>
              <h2 className="text-2xl font-black text-rose-400 mb-1 tracking-wide uppercase">
                High-Speed Wipeout!
              </h2>
              <p className="text-xs text-slate-300 max-w-sm mb-4">
                You collided with street traffic while speeding over 30 km/h. Dust yourself off and hop back in the saddle!
              </p>
              <div className="flex items-center gap-6 bg-slate-900/90 border border-slate-800 px-6 py-3 rounded-2xl text-xs font-mono mb-5">
                <div>
                  <div className="text-slate-400 text-[10px]">DISTANCE</div>
                  <div className="text-base font-bold text-white">{distanceMeters} m</div>
                </div>
                <div className="border-l border-slate-800 pl-4">
                  <div className="text-slate-400 text-[10px]">NEAR MISSES</div>
                  <div className="text-base font-bold text-purple-400">{nearMissCount}</div>
                </div>
                <div className="border-l border-slate-800 pl-4">
                  <div className="text-slate-400 text-[10px]">COINS SAVED</div>
                  <div className="text-base font-bold text-amber-400">+{coinsCollected}</div>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleRestart}
                  className="px-5 py-2.5 bg-lime-400 hover:bg-lime-300 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" /> Ride Again
                </button>
                <button
                  onClick={handleExit}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
                >
                  Finish & Bank Coins
                </button>
              </div>
            </div>
          )}

          {/* Finished Grand Prix Victory Overlay */}
          {gameState === 'finished' && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md z-20 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
              <div className="p-3 bg-lime-400/20 border border-lime-400/40 rounded-full mb-3 text-lime-400">
                <Trophy className="w-10 h-10 animate-bounce" />
              </div>
              <h2 className="text-2xl font-black text-lime-400 mb-1 tracking-wide uppercase">
                Grand Prix Finished!
              </h2>
              <p className="text-xs text-slate-300 max-w-sm mb-4">
                You navigated {finishDistance.toLocaleString()} meters of urban traffic through the bustling avenues of {cityName}!
              </p>
              <div className="flex items-center gap-6 bg-slate-900/90 border border-slate-800 px-6 py-3 rounded-2xl text-xs font-mono mb-5">
                <div>
                  <div className="text-slate-400 text-[10px]">TOTAL DISTANCE</div>
                  <div className="text-base font-bold text-lime-400">{distanceMeters} m</div>
                </div>
                <div className="border-l border-slate-800 pl-4">
                  <div className="text-slate-400 text-[10px]">NEAR MISSES</div>
                  <div className="text-base font-bold text-purple-400">{nearMissCount}</div>
                </div>
                <div className="border-l border-slate-800 pl-4">
                  <div className="text-slate-400 text-[10px]">TOTAL COINS</div>
                  <div className="text-base font-bold text-amber-400">+{coinsCollected}</div>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleRestart}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" /> Ride Again
                </button>
                <button
                  onClick={handleExit}
                  className="px-6 py-2.5 bg-lime-400 hover:bg-lime-300 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition"
                >
                  Bank Coins & Exit
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Control Deck */}
        <div className="px-5 py-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-slate-300">
              <Wind className="w-3.5 h-3.5 text-lime-400" /> Controls: <strong>WASD / Arrows / Gamepad</strong>
            </span>
            <span>•</span>
            <span>Keys 1-5: Shift Gears</span>
            <span>•</span>
            <span>B: Ring Bicycle Bell</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExit}
              className="px-4 py-1.5 bg-lime-400 hover:bg-lime-300 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow"
            >
              <Trophy className="w-3.5 h-3.5" /> Finish & Bank Coins
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// RENDER HELPERS (Canvas Drawing)
// ----------------------------------------------------------------------

function renderSkyAndHorizon(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  biome: EnvironmentType,
  curve: number
) {
  const horizonY = H * 0.42;

  // Sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
  if (biome === 'desert') {
    skyGrad.addColorStop(0, '#7c2d12');
    skyGrad.addColorStop(0.7, '#f97316');
    skyGrad.addColorStop(1, '#fed7aa');
  } else if (biome === 'alpine') {
    skyGrad.addColorStop(0, '#0c4a6e');
    skyGrad.addColorStop(0.6, '#0284c7');
    skyGrad.addColorStop(1, '#bae6fd');
  } else {
    // Urban / Coastal dusk
    skyGrad.addColorStop(0, '#0f172a');
    skyGrad.addColorStop(0.6, '#1e1b4b');
    skyGrad.addColorStop(1, '#38bdf8');
  }
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, horizonY);

  // Background Skyline Silhouettes
  ctx.save();
  ctx.translate(curve * 30, 0);

  if (biome === 'alpine') {
    // Snowy mountain peaks
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    ctx.lineTo(80, horizonY - 90);
    ctx.lineTo(160, horizonY);
    ctx.lineTo(240, horizonY - 120);
    ctx.lineTo(340, horizonY);
    ctx.lineTo(480, horizonY - 140);
    ctx.lineTo(600, horizonY);
    ctx.lineTo(720, horizonY - 100);
    ctx.lineTo(W, horizonY);
    ctx.fill();

    // Snow caps
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(70, horizonY - 78);
    ctx.lineTo(80, horizonY - 90);
    ctx.lineTo(90, horizonY - 78);
    ctx.moveTo(225, horizonY - 105);
    ctx.lineTo(240, horizonY - 120);
    ctx.lineTo(255, horizonY - 105);
    ctx.moveTo(460, horizonY - 122);
    ctx.lineTo(480, horizonY - 140);
    ctx.lineTo(500, horizonY - 122);
    ctx.fill();
  } else if (biome === 'desert') {
    // Sand Dunes
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    ctx.quadraticCurveTo(150, horizonY - 50, 300, horizonY);
    ctx.quadraticCurveTo(450, horizonY - 70, 650, horizonY);
    ctx.quadraticCurveTo(750, horizonY - 40, W, horizonY);
    ctx.fill();
  } else {
    // City Skyscraper Silhouettes
    ctx.fillStyle = '#090d16';
    const numBuildings = 16;
    const bWidth = W / numBuildings;
    for (let i = 0; i < numBuildings; i++) {
      const bHeight = 35 + ((i * 37) % 85);
      ctx.fillRect(i * bWidth, horizonY - bHeight, bWidth - 4, bHeight);

      // Warm illuminated window dots
      ctx.fillStyle = (i % 2 === 0) ? '#fde047' : '#38bdf8';
      for (let w = 0; w < 4; w++) {
        ctx.fillRect(i * bWidth + 5 + w * 10, horizonY - bHeight + 12 + w * 14, 3, 4);
      }
      ctx.fillStyle = '#090d16';
    }
  }

  ctx.restore();

  // Ground Grass / Sidewalk
  const groundGrad = ctx.createLinearGradient(0, horizonY, 0, H);
  if (biome === 'desert') {
    groundGrad.addColorStop(0, '#c2410c');
    groundGrad.addColorStop(1, '#7c2d12');
  } else if (biome === 'alpine') {
    groundGrad.addColorStop(0, '#15803d');
    groundGrad.addColorStop(1, '#064e3b');
  } else {
    groundGrad.addColorStop(0, '#1e293b');
    groundGrad.addColorStop(1, '#0f172a');
  }
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, horizonY, W, H - horizonY);
}

function renderRoad(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  curve: number,
  distance: number
) {
  const horizonY = H * 0.42;
  const roadBottomWidth = W * 0.75;
  const roadTopWidth = 40;
  const centerX = W / 2 + curve * 90;

  // Road asphalt polygon
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.moveTo(W / 2 + curve * 40 - roadTopWidth / 2, horizonY);
  ctx.lineTo(W / 2 + curve * 40 + roadTopWidth / 2, horizonY);
  ctx.lineTo(centerX + roadBottomWidth / 2, H);
  ctx.lineTo(centerX - roadBottomWidth / 2, H);
  ctx.closePath();
  ctx.fill();

  // Curbs / Sidewalk strips
  ctx.strokeStyle = '#a3e635';
  ctx.lineWidth = 6;
  ctx.stroke();

  // Dashed Center Lanes (simulating forward movement)
  const segments = 14;
  const scrollOffset = (distance % 30) / 30;

  for (let i = 0; i < segments; i++) {
    const t1 = (i + scrollOffset) / segments;
    const t2 = (i + scrollOffset + 0.45) / segments;

    if (t1 > 1 || t2 > 1) continue;

    const y1 = horizonY + (H - horizonY) * Math.pow(t1, 2);
    const y2 = horizonY + (H - horizonY) * Math.pow(t2, 2);

    const xOffset1 = curve * 40 + (centerX - (W / 2 + curve * 40)) * t1;
    const xOffset2 = curve * 40 + (centerX - (W / 2 + curve * 40)) * t2;

    const laneX1 = W / 2 + xOffset1;
    const laneX2 = W / 2 + xOffset2;

    const lineWidth = 1.5 + t1 * 6;

    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(laneX1, y1);
    ctx.lineTo(laneX2, y2);
    ctx.stroke();
  }
}

function renderObstacle(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  obs: Obstacle,
  curve: number
) {
  const horizonY = H * 0.42;
  // Normalized depth (0 = at player screen bottom, 1000 = horizon)
  const depthFactor = Math.max(0, Math.min(1, 1 - obs.z / 950));
  const scale = Math.pow(depthFactor, 2.2);

  if (scale <= 0.04) return;

  const y = horizonY + (H - horizonY) * scale;
  const roadWidthAtDepth = 40 + (W * 0.75 - 40) * scale;
  const centerX = W / 2 + curve * 40 + (W / 2 + curve * 90 - (W / 2 + curve * 40)) * scale;
  const x = centerX + (obs.x * (roadWidthAtDepth / 2));

  const drawW = obs.width * scale * 1.8;
  const drawH = obs.height * scale * 1.8;

  ctx.save();
  ctx.translate(x, y - drawH);

  if (obs.type === 'coin') {
    // Spinning Golden Traveler Coin
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(3, drawW * 0.5), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner star
    ctx.fillStyle = '#78350f';
    ctx.font = `bold ${Math.max(8, drawW * 0.6)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', 0, 0);
  } else if (obs.type === 'car' || obs.type === 'taxi') {
    // 2.5D Car rear view
    ctx.fillStyle = obs.color;
    ctx.beginPath();
    ctx.roundRect(-drawW / 2, -drawH, drawW, drawH, [6 * scale]);
    ctx.fill();

    // Windshield
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-drawW * 0.4, -drawH * 0.9, drawW * 0.8, drawH * 0.45);

    // Taillights
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-drawW * 0.45, -drawH * 0.35, drawW * 0.25, drawH * 0.25);
    ctx.fillRect(drawW * 0.2, -drawH * 0.35, drawW * 0.25, drawH * 0.25);

    if (obs.type === 'taxi') {
      // Taxi roof light
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-drawW * 0.2, -drawH * 1.15, drawW * 0.4, drawH * 0.2);
    }
  } else if (obs.type === 'pedestrian') {
    // Pedestrian silhouette with bag
    ctx.fillStyle = obs.scared ? '#f43f5e' : '#38bdf8';
    ctx.beginPath();
    ctx.arc(0, -drawH * 0.8, drawW * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-drawW * 0.3, -drawH * 0.6, drawW * 0.6, drawH * 0.6);
  } else {
    // Traffic Cone
    ctx.fillStyle = obs.color;
    ctx.beginPath();
    ctx.moveTo(0, -drawH);
    ctx.lineTo(drawW * 0.4, 0);
    ctx.lineTo(-drawW * 0.4, 0);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function renderBicycleHandlebars(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  playerX: number,
  steerInput: number,
  speed: number,
  currentTime: number
) {
  const baseX = W / 2 + playerX * (W * 0.35);
  const baseY = H - 20;

  // Gentle pedal cadence bob
  const pedalBob = Math.sin(currentTime * (0.012 + speed * 0.0006)) * (speed > 1 ? 5 : 1);
  const steerTilt = steerInput * 12;

  ctx.save();
  ctx.translate(baseX, baseY + pedalBob);
  ctx.rotate((steerTilt * Math.PI) / 180);

  // Front wheel tire top
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-6, -110, 12, 60);

  // Stem & Fork (Lime green / metallic)
  ctx.strokeStyle = '#a3e635';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -70);
  ctx.stroke();

  // Horizontal Handlebar Bar
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(-130, -75);
  ctx.lineTo(130, -75);
  ctx.stroke();

  // Grips & Brake levers
  ctx.fillStyle = '#a3e635';
  ctx.fillRect(-135, -82, 35, 14);
  ctx.fillRect(100, -82, 35, 14);

  // Bell mounted on left handlebar
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.arc(-70, -86, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#854d0e';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Hands on Grips
  ctx.fillStyle = '#f87171'; // rider gloves
  ctx.beginPath();
  ctx.arc(-115, -75, 18, 0, Math.PI * 2);
  ctx.arc(115, -75, 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
