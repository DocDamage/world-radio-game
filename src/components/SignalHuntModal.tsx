import React, { useRef, useEffect, useState, useCallback } from 'react';
import { X, Trophy, Compass, Crosshair } from 'lucide-react';
import type { SignalHuntState, RadioStation } from '../types';
import { soundEffects } from '../services/audioEffects';
import { MissionHUD } from './MissionHUD';
import type { MissionScenario, MissionResultPayload } from '../missions/types';
import confetti from 'canvas-confetti';

interface SignalHuntModalProps {
  isOpen: boolean;
  onClose: () => void;
  huntState: SignalHuntState;
  activeStation: RadioStation | null;
  onStepCloser: (direction: 'north' | 'south' | 'east' | 'west') => void;
  onClaimVictory: () => void;
  /** Active World Expedition mission scenario (null = free fox hunt) */
  missionScenario?: MissionScenario | null;
  /** Emitted exactly once when an active mission run settles */
  onMissionResult?: (payload: MissionResultPayload) => void;
}

interface BearingLine {
  originX: number;
  originY: number;
  angleDeg: number;
  label: string;
}

export const SignalHuntModal: React.FC<SignalHuntModalProps> = ({
  isOpen,
  onClose,
  huntState,
  activeStation,
  onStepCloser,
  onClaimVictory,
  missionScenario,
  onMissionResult
}) => {
  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Mission context (World Expedition Command), read fresh by handlers.
  const scenarioRef = useRef<MissionScenario | null | undefined>(undefined);
  scenarioRef.current = missionScenario;
  const missionSettledRef = useRef<boolean>(false);
  const stepsTakenRef = useRef<number>(0);
  const lobErrorsRef = useRef<number[]>([]);
  const [missionSteps, setMissionSteps] = useState<number>(0);

  // Reset mission bookkeeping once per open
  useEffect(() => {
    if (!isOpen) return;
    missionSettledRef.current = false;
    stepsTakenRef.current = 0;
    lobErrorsRef.current = [];
    setMissionSteps(0);
  }, [isOpen]);

  // Settle the active mission exactly once — only when the clandestine
  // transmitter is captured. Score rewards triangulation quality: capture
  // (60) + line-of-bearing accuracy bonus (0–40) − step penalty (0–10).
  const settleMission = useCallback(() => {
    const scenario = scenarioRef.current;
    if (!scenario || missionSettledRef.current) return;
    missionSettledRef.current = true;
    const lobErrors = lobErrorsRef.current;
    let lobBonus = 0;
    let avgErr = 0;
    if (lobErrors.length > 0) {
      avgErr = lobErrors.reduce((a, b) => a + b, 0) / lobErrors.length;
      lobBonus = avgErr <= 10 ? 40 : avgErr <= 20 ? 30 : avgErr <= 30 ? 20 : 10;
    }
    const stepPenalty = Math.min(10, Math.floor(stepsTakenRef.current / 20));
    const score = Math.max(0, Math.min(100, 60 + lobBonus - stepPenalty));
    onMissionResult?.({
      missionId: scenario.missionId,
      gameId: scenario.gameId,
      score,
      outcome: 'completed',
      stats: {
        steps: stepsTakenRef.current,
        lobPlots: lobErrors.length,
        avgLobErrorDeg: Math.round(avgErr)
      }
    });
  }, [onMissionResult]);

  // Count every pace for the mission step penalty
  const handleStep = (direction: 'north' | 'south' | 'east' | 'west') => {
    stepsTakenRef.current += 1;
    setMissionSteps(stepsTakenRef.current);
    onStepCloser(direction);
  };

  // Antenna azimuth (0 to 360 degrees, 0 = North, 90 = East)
  const [azimuthDeg, setAzimuthDeg] = useState(0);
  const [attenuatorDb, setAttenuatorDb] = useState(0); // 0, 10, 20, 30, 40 dB
  const [needlePos, setNeedlePos] = useState(10); // 0 to 100 on S-meter scale
  const [bearingPlots, setBearingPlots] = useState<BearingLine[]>([]);
  const [audioPinging, setAudioPinging] = useState(true);
  const [isBeaconUnlocked, setIsBeaconUnlocked] = useState(false);

  const { distanceMeters, playerPos, targetPos, found } = huntState;

  // Calculate true bearing from player to target beacon in degrees
  const dLat = targetPos.lat - playerPos.lat;
  const dLng = targetPos.lng - playerPos.lng;
  const trueBearingRad = Math.atan2(dLng, dLat);
  const trueBearingDeg = (trueBearingRad * (180 / Math.PI) + 360) % 360;

  // Calculate directional gain using a 3-element Yagi beam pattern:
  // Calculate shortest angular difference correctly wrapping around 0/360° boundary
  let diffDeg = Math.abs(azimuthDeg - trueBearingDeg) % 360;
  if (diffDeg > 180) diffDeg = 360 - diffDeg;
  const angleDiffRad = (diffDeg * Math.PI) / 180;
  // Beam lobe formula: cos(angleDiff/2)^exponent gives high forward peak and
  // deep side/back nulls. Mission scenarios tune the directivity — a yagi
  // array is razor sharp while the attenuated loop sensor sweeps wide.
  const beamExponent = scenarioRef.current?.beamExponent ?? 3.8;
  const directionalGain = Math.pow(Math.max(0, Math.cos(angleDiffRad / 2)), beamExponent);

  // Proximity signal: inverted distance curve
  // Under 40m is 100%, 800m is ~10%
  const baseProximity = Math.max(0.05, Math.min(1, 1 - (distanceMeters / 750)));

  // Attenuator reduction: each 10dB reduces effective voltage
  const attenuationFactor = Math.pow(10, -attenuatorDb / 20);

  // Raw signal power into receiver
  const rawSignalPercent = Math.min(100, baseProximity * directionalGain * attenuationFactor * 120);

  // Animate needle ballistics smoothly (only when modal is actually open)
  useEffect(() => {
    if (!isOpen) return;
    let frameId: number;
    const animateNeedle = () => {
      setNeedlePos(prev => {
        const target = rawSignalPercent;
        const diff = target - prev;
        return prev + diff * 0.25;
      });
      frameId = requestAnimationFrame(animateNeedle);
    };
    frameId = requestAnimationFrame(animateNeedle);
    return () => cancelAnimationFrame(frameId);
  }, [isOpen, rawSignalPercent]);

  // Audio Heterodyne BFO Synthesizer
  useEffect(() => {
    if (!isOpen || !audioPinging || found || isBeaconUnlocked) return;

    // Pitch rises between 400Hz and 1800Hz with received RF power
    const freq = 450 + Math.pow(rawSignalPercent / 100, 1.5) * 1400;
    // Ping interval shortens as signal peaks
    const intervalMs = Math.max(160, 1400 - (rawSignalPercent / 100) * 1100);

    const timer = setInterval(() => {
      soundEffects.playRadarPing(freq, 0.08);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isOpen, audioPinging, rawSignalPercent, found, isBeaconUnlocked]);

  // Handle Antenna Rotation
  const rotateAntenna = (deltaDeg: number) => {
    setAzimuthDeg(prev => (prev + deltaDeg + 360) % 360);
    soundEffects.playUiClick(0.15);
  };

  // Plot Line of Bearing (LOB) onto tactical radar
  const handlePlotBearing = () => {
    // Track LOB accuracy vs the true bearing for mission triangulation scoring
    let err = Math.abs(azimuthDeg - trueBearingDeg) % 360;
    if (err > 180) err = 360 - err;
    lobErrorsRef.current.push(err);

    const newBearing: BearingLine = {
      originX: 200, // Center of radar
      originY: 200,
      angleDeg: azimuthDeg,
      label: `LOB #${bearingPlots.length + 1} (${Math.round(azimuthDeg)}°)`
    };
    setBearingPlots(prev => [...prev.slice(-3), newBearing]);
    soundEffects.playRadarPing(1200, 0.2);
  };

  // Unlock beacon when close
  const handleUnscrambleBeacon = () => {
    if (distanceMeters < 50) {
      setIsBeaconUnlocked(true);
      soundEffects.playTriumphChime(0.5);
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
      onClaimVictory();
      settleMission(); // mission settles exactly once, on transmitter capture
    }
  };

  // Draw Tactical Radar Map
  useEffect(() => {
    const canvas = radarCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);

    // Dark radar screen
    const radarBg = ctx.createRadialGradient(cx, cy, 10, cx, cy, cx);
    radarBg.addColorStop(0, '#042f2e');
    radarBg.addColorStop(0.8, '#022c22');
    radarBg.addColorStop(1, '#064e3b');
    ctx.fillStyle = radarBg;
    ctx.fillRect(0, 0, w, h);

    // Range rings (200m, 400m, 600m)
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.35)';
    ctx.lineWidth = 1.5;
    for (let r = 40; r <= 160; r += 40) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(52, 211, 153, 0.6)';
      ctx.font = '9px monospace';
      ctx.fillText(`${r * 4}m`, cx + 4, cy - r + 10);
    }

    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(cx, 10);
    ctx.lineTo(cx, h - 10);
    ctx.moveTo(10, cy);
    ctx.lineTo(w - 10, cy);
    ctx.stroke();

    // Cardinal labels
    ctx.fillStyle = '#6ee7b7';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', cx, 18);
    ctx.fillText('S', cx, h - 18);
    ctx.fillText('E', w - 18, cy);
    ctx.fillText('W', 18, cy);

    // Draw previous plotted LOBs
    ctx.lineWidth = 2;
    bearingPlots.forEach((lob, i) => {
      ctx.strokeStyle = i === bearingPlots.length - 1 ? '#facc15' : 'rgba(250, 204, 21, 0.4)';
      const rad = ((lob.angleDeg - 90) * Math.PI) / 180;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(rad) * 190, cy + Math.sin(rad) * 190);
      ctx.stroke();
    });

    // Draw active antenna beam heading
    const activeRad = ((azimuthDeg - 90) * Math.PI) / 180;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(activeRad) * 180, cy + Math.sin(activeRad) * 180);
    ctx.stroke();

    // Antenna cardioid beam cone (wider lobe for the attenuated loop sensor)
    const lobeHalfWidth = 0.35 * (3.8 / beamExponent);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, 175, activeRad - lobeHalfWidth, activeRad + lobeHalfWidth);
    ctx.closePath();
    ctx.fill();

    // Player position at center
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // If target beacon is within close detection (<120m), show glowing ping
    if (distanceMeters < 120 || isBeaconUnlocked) {
      const scale = 160 / 640; // 640m map radius
      const beaconX = cx + (dLng * 111000 * Math.cos(playerPos.lat * (Math.PI / 180))) * scale;
      const beaconY = cy - (dLat * 111000) * scale;

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(beaconX, beaconY, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#f87171';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('📡 TX', beaconX + 10, beaconY + 3);
    }
  }, [azimuthDeg, bearingPlots, distanceMeters, isBeaconUnlocked, dLat, dLng, playerPos.lat]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-md">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-emerald-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-emerald-500/30 flex items-center justify-between bg-gradient-to-r from-emerald-950/90 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <Compass className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-100">
                  ARDF Radio Direction Finder (Fox Hunt)
                </h3>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                  Amateur Radio DF
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Aim Yagi antenna, listen to heterodyne pitch, and triangulate the hidden transmitter in{' '}
                <strong className="text-emerald-300">{activeStation?.place || activeStation?.country}</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAudioPinging(p => !p)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition border ${
                audioPinging
                  ? 'bg-emerald-900/60 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              BFO Audio: {audioPinging ? 'ON' : 'MUTE'}
            </button>
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
          progressLabel={isBeaconUnlocked ? 'Transmitter captured ✓' : `${Math.round(distanceMeters)}m away`}
          secondaryLabel={`Steps ${missionSteps} • LOBs ${bearingPlots.length}`}
        />

        {/* Main Workstation Layout */}
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950">
          {/* LEFT: Tactical CRT Radar Screen */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs font-mono text-emerald-400">
              <span className="flex items-center gap-1.5">
                <Crosshair className="w-4 h-4 text-emerald-400" />
                TACTICAL AZIMUTH RADAR
              </span>
              <span className="text-slate-400">
                Approx Dist: <strong className="text-yellow-400 font-bold">{Math.round(distanceMeters)}m</strong>
              </span>
            </div>

            <div className="relative aspect-square max-w-[360px] mx-auto rounded-3xl overflow-hidden border-2 border-emerald-500/50 shadow-inner shadow-emerald-950">
              <canvas
                ref={radarCanvasRef}
                width={360}
                height={360}
                className="w-full h-full block cursor-crosshair"
                onClick={handlePlotBearing}
              />
            </div>

            {/* Stepping D-Pad in the Field */}
            <div className="flex items-center justify-between bg-slate-900/80 p-2.5 rounded-2xl border border-emerald-500/20 text-xs">
              <span className="font-mono text-slate-400">Walk District:</span>
              <div className="flex items-center gap-1.5 font-bold font-mono">
                <button
                  onClick={() => handleStep('north')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-emerald-500/30 text-emerald-300 rounded border border-emerald-500/30 active:scale-95"
                >
                  N ↑
                </button>
                <button
                  onClick={() => handleStep('south')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-emerald-500/30 text-emerald-300 rounded border border-emerald-500/30 active:scale-95"
                >
                  S ↓
                </button>
                <button
                  onClick={() => handleStep('west')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-emerald-500/30 text-emerald-300 rounded border border-emerald-500/30 active:scale-95"
                >
                  W ←
                </button>
                <button
                  onClick={() => handleStep('east')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-emerald-500/30 text-emerald-300 rounded border border-emerald-500/30 active:scale-95"
                >
                  E →
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: Analog Receiver Console */}
          <div className="flex flex-col gap-4 bg-slate-900/80 p-5 rounded-3xl border border-emerald-500/30">
            {/* Analog S-Meter / Microammeter */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col gap-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>ANALOG RF S-METER</span>
                <span className="text-emerald-400 font-bold">{Math.round(needlePos)}% VOLTS</span>
              </div>

              {/* Gauge Graphic */}
              <div className="relative w-full h-24 bg-gradient-to-b from-amber-100 to-amber-200 rounded-xl overflow-hidden p-2 shadow-inner border border-amber-300/40">
                {/* Scale Markings */}
                <div className="flex justify-between text-[9px] font-mono text-slate-800 font-bold px-4 pt-1">
                  <span>S1</span>
                  <span>S3</span>
                  <span>S5</span>
                  <span>S7</span>
                  <span>S9</span>
                  <span className="text-red-600">+10dB</span>
                  <span className="text-red-600">+20dB</span>
                  <span className="text-red-600">+30dB</span>
                </div>

                {/* Color Zone Arc */}
                <div className="w-full h-1.5 bg-gradient-to-r from-emerald-600 via-yellow-500 to-red-600 rounded-full mt-2" />

                {/* Meter Pivot Needle */}
                <div
                  className="absolute bottom-0 left-1/2 w-1 h-20 bg-red-600 origin-bottom transition-transform duration-75 ease-out shadow"
                  style={{
                    transform: `translateX(-50%) rotate(${((needlePos / 100) * 80) - 40}deg)`
                  }}
                />
                {/* Pivot Cap */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-600" />
              </div>

              <div className="text-[10px] text-slate-400 text-center">
                {needlePos > 90
                  ? '⚡ Needle PINNED! Switch RF Attenuator down to regain directional lobe sensitivity.'
                  : needlePos > 40
                  ? '📡 Strong directional peak detected on current bearing!'
                  : 'Faint static. Sweep antenna azimuth to acquire carrier wave.'}
              </div>
            </div>

            {/* Azimuth Steering Dial */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                <span>ANTENNA AZIMUTH BEARING:</span>
                <span className="text-sky-300 font-bold text-sm bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
                  {Math.round(azimuthDeg)}°
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => rotateAntenna(-45)}
                  className="py-2 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded-xl font-mono text-xs font-bold border border-sky-500/20 active:scale-95"
                >
                  -45°
                </button>
                <button
                  onClick={() => rotateAntenna(-10)}
                  className="py-2 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded-xl font-mono text-xs font-bold border border-sky-500/20 active:scale-95"
                >
                  -10°
                </button>
                <button
                  onClick={() => rotateAntenna(10)}
                  className="py-2 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded-xl font-mono text-xs font-bold border border-sky-500/20 active:scale-95"
                >
                  +10°
                </button>
                <button
                  onClick={() => rotateAntenna(45)}
                  className="py-2 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded-xl font-mono text-xs font-bold border border-sky-500/20 active:scale-95"
                >
                  +45°
                </button>
              </div>

              <button
                onClick={handlePlotBearing}
                className="w-full py-2 bg-slate-800 hover:bg-yellow-500/20 text-yellow-300 rounded-xl font-mono text-xs font-bold border border-yellow-500/30 transition flex items-center justify-center gap-2"
              >
                <Crosshair className="w-4 h-4 text-yellow-400" />
                Plot Line of Bearing (LOB) to Radar
              </button>
            </div>

            {/* Stepped RF Attenuator Control */}
            <div className="flex items-center justify-between bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <div className="text-xs font-mono text-slate-300">
                <div className="font-bold">RF ATTENUATOR:</div>
                <div className="text-[10px] text-slate-500">Prevent receiver saturation</div>
              </div>

              <div className="flex gap-1">
                {[0, 10, 20, 30, 40].map(db => (
                  <button
                    key={db}
                    onClick={() => {
                      setAttenuatorDb(db);
                      soundEffects.playUiClick(0.2);
                    }}
                    className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg border transition ${
                      attenuatorDb === db
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    -{db}dB
                  </button>
                ))}
              </div>
            </div>

            {/* Beacon Decrypt / Claim Victory */}
            {distanceMeters < 50 ? (
              <div className="p-3 bg-emerald-950/70 border-2 border-emerald-500 rounded-2xl flex flex-col items-center gap-2 animate-pulse">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  Transmitter Mast Within 50 Meters!
                </div>
                <p className="text-xs text-slate-300 text-center">
                  You are standing right outside the hidden transmitter bunker. Unscramble the carrier frequency to capture the pirate broadcast!
                </p>
                <button
                  onClick={handleUnscrambleBeacon}
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/30 transition active:scale-95"
                >
                  📡 Unscramble & Capture Pirate Frequency!
                </button>
              </div>
            ) : (
              <div className="text-center text-[11px] font-mono text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                Navigate the streets closer until transmitter is within 50m to decrypt.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
