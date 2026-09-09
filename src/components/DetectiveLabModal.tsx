import React, { useRef, useEffect, useState } from 'react';
import { X, Search, HelpCircle, CheckCircle2, Award, Zap } from 'lucide-react';
import type { DetectiveState, RadioStation } from '../types';
import { soundEffects } from '../services/audioEffects';
import confetti from 'canvas-confetti';

interface DetectiveLabModalProps {
  isOpen: boolean;
  onClose: () => void;
  detectiveState: DetectiveState;
  activeStation: RadioStation | null;
  onGuessCoords: (coords: { lat: number; lng: number }) => void;
  onNewMystery: () => void;
  mysteryClue: string;
  onAddCoins?: (amount: number) => void;
}

// Forensic profiles based on country keywords
interface ForensicProfile {
  powerGridHz: '50 Hz' | '60 Hz';
  drivingSide: 'Left (RHD)' | 'Right (LHD)';
  writingScript: string;
  utcOffsetHint: string;
  climateZone: string;
}

function getForensicProfile(countryName: string): ForensicProfile {
  const c = (countryName || '').toLowerCase();

  // Driving side: Left-hand drive countries
  const leftDrive = ['united kingdom', 'uk', 'japan', 'australia', 'new zealand', 'south africa', 'india', 'ireland', 'thailand', 'malaysia', 'singapore', 'indonesia', 'kenya', 'cyprus', 'malta'];
  const isLeft = leftDrive.some(k => c.includes(k));

  // Power grid: 60Hz countries
  const sixtyHz = ['united states', 'usa', 'canada', 'mexico', 'brazil', 'colombia', 'peru', 'philippines', 'taiwan', 'south korea', 'saudi arabia'];
  const is60 = sixtyHz.some(k => c.includes(k));

  // Script
  let script = 'Latin Alphabet';
  if (c.includes('russia') || c.includes('ukraine') || c.includes('serbia') || c.includes('bulgaria')) script = 'Cyrillic Script';
  else if (c.includes('japan')) script = 'Kanji & Kana';
  else if (c.includes('china') || c.includes('hong kong') || c.includes('taiwan')) script = 'Hanzi (Chinese)';
  else if (c.includes('korea')) script = 'Hangul';
  else if (c.includes('egypt') || c.includes('arab') || c.includes('morocco') || c.includes('qatar')) script = 'Arabic Script';
  else if (c.includes('greece')) script = 'Greek Alphabet';
  else if (c.includes('india')) script = 'Devanagari & Regional Indic';
  else if (c.includes('thailand')) script = 'Thai Script';
  else if (c.includes('israel')) script = 'Hebrew Script';

  return {
    powerGridHz: is60 ? '60 Hz' : '50 Hz',
    drivingSide: isLeft ? 'Left (RHD)' : 'Right (LHD)',
    writingScript: script,
    utcOffsetHint: 'Solar noon aligned with meridian transit',
    climateZone: c.includes('brazil') || c.includes('indonesia') || c.includes('thailand') ? 'Tropical / Maritime' : 'Temperate'
  };
}

export const DetectiveLabModal: React.FC<DetectiveLabModalProps> = ({
  isOpen,
  onClose,
  detectiveState,
  activeStation,
  onGuessCoords,
  onNewMystery,
  mysteryClue,
  onAddCoins
}) => {
  const mapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const spectrumCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [selectedPin, setSelectedPin] = useState<{ lat: number; lng: number } | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [rankTitle, setRankTitle] = useState('');
  const [coinsAwarded, setCoinsAwarded] = useState(0);

  const targetStation = detectiveState.targetStation || activeStation;
  const forensic = getForensicProfile(targetStation?.country || '');

  // Reset local state when a new mystery begins
  useEffect(() => {
    if (isOpen) {
      setSelectedPin(null);
      setRevealed(false);
      setDistanceKm(null);
      setCoinsAwarded(0);
    }
  }, [isOpen, detectiveState.targetStation]);

  // Audio Spectrogram Animation
  useEffect(() => {
    if (!isOpen) return;
    const canvas = spectrumCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let phase = 0;

    const render = () => {
      phase += 0.08;
      const w = canvas.width;
      const h = canvas.height;

      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, w, h);

      // FFT frequency bars
      const bars = 32;
      const barWidth = (w / bars) - 2;

      for (let i = 0; i < bars; i++) {
        const heightFactor = Math.abs(Math.sin(phase + i * 0.45) * Math.cos(phase * 0.7 + i * 0.2));
        const barHeight = 8 + heightFactor * (h - 16);

        const grad = ctx.createLinearGradient(0, h, 0, 0);
        grad.addColorStop(0, '#06b6d4');
        grad.addColorStop(0.6, '#8b5cf6');
        grad.addColorStop(1, '#f43f5e');

        ctx.fillStyle = grad;
        ctx.fillRect(i * (barWidth + 2), h - barHeight, barWidth, barHeight);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isOpen]);

  // Render World Map Canvas with interactive coordinates
  useEffect(() => {
    const canvas = mapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Projection helpers: Equirectangular
    const toCanvas = (lat: number, lng: number) => {
      const x = ((lng + 180) / 360) * w;
      const y = ((90 - lat) / 180) * h;
      return { x, y };
    };

    // 1. Ocean Background
    ctx.fillStyle = '#0b132b';
    ctx.fillRect(0, 0, w, h);

    // 2. Latitude/Longitude Grid Lines
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.3)';
    ctx.lineWidth = 1;
    for (let lat = -60; lat <= 60; lat += 30) {
      const { y } = toCanvas(lat, 0);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let lng = -180; lng <= 180; lng += 60) {
      const { x } = toCanvas(0, lng);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // Equator & Prime Meridian
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
    const eq = toCanvas(0, 0);
    ctx.beginPath();
    ctx.moveTo(0, eq.y);
    ctx.lineTo(w, eq.y);
    ctx.moveTo(eq.x, 0);
    ctx.lineTo(eq.x, h);
    ctx.stroke();

    // 3. Simplified Continents Vector
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;

    // North America
    ctx.beginPath();
    const na = [
      toCanvas(70, -165), toCanvas(72, -90), toCanvas(50, -55),
      toCanvas(30, -80), toCanvas(18, -100), toCanvas(32, -120), toCanvas(58, -140)
    ];
    ctx.moveTo(na[0].x, na[0].y);
    na.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // South America
    ctx.beginPath();
    const sa = [
      toCanvas(12, -75), toCanvas(-5, -35), toCanvas(-22, -40),
      toCanvas(-55, -68), toCanvas(-40, -73), toCanvas(-5, -80)
    ];
    ctx.moveTo(sa[0].x, sa[0].y);
    sa.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Eurasia
    ctx.beginPath();
    const eu = [
      toCanvas(70, 10), toCanvas(75, 100), toCanvas(65, 170),
      toCanvas(38, 140), toCanvas(22, 115), toCanvas(10, 100),
      toCanvas(25, 60), toCanvas(35, 30), toCanvas(40, -5), toCanvas(60, 5)
    ];
    ctx.moveTo(eu[0].x, eu[0].y);
    eu.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Africa
    ctx.beginPath();
    const af = [
      toCanvas(36, -5), toCanvas(32, 32), toCanvas(12, 50),
      toCanvas(-34, 20), toCanvas(-34, 18), toCanvas(5, 8), toCanvas(15, -17)
    ];
    ctx.moveTo(af[0].x, af[0].y);
    af.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Australia
    ctx.beginPath();
    const au = [
      toCanvas(-12, 130), toCanvas(-15, 145), toCanvas(-35, 150),
      toCanvas(-38, 140), toCanvas(-32, 115), toCanvas(-20, 115)
    ];
    ctx.moveTo(au[0].x, au[0].y);
    au.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 4. Draw Selected Guess Pin
    if (selectedPin) {
      const pinPos = toCanvas(selectedPin.lat, selectedPin.lng);
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(pinPos.x, pinPos.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Pulsing ring around guess pin
      ctx.strokeStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(pinPos.x, pinPos.y, 14, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('YOUR GUESS', pinPos.x + 8, pinPos.y - 8);
    }

    // 5. Draw Revealed Target and Connection Arc
    if (revealed && targetStation) {
      const targetPos = toCanvas(targetStation.geo_lat, targetStation.geo_long);

      // Target Pin
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(targetPos.x, targetPos.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ecfdf5';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#6ee7b7';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(`📍 ${targetStation.place || targetStation.country}`, targetPos.x + 10, targetPos.y + 4);

      // Great-circle line between guess and target
      if (selectedPin) {
        const pinPos = toCanvas(selectedPin.lat, selectedPin.lng);
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(pinPos.x, pinPos.y);
        ctx.lineTo(targetPos.x, targetPos.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }, [selectedPin, revealed, targetStation]);

  // Handle map click to place pin
  const handleMapClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (revealed) return;
    const canvas = mapCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    // Convert canvas XY to Lat/Lng
    const lng = (x / canvas.width) * 360 - 180;
    const lat = 90 - (y / canvas.height) * 180;

    setSelectedPin({ lat, lng });
    soundEffects.playUiClick(0.2);
  };

  // Lock In Forensic Guess
  const handleLockInGuess = () => {
    if (!selectedPin || !targetStation) return;

    // Haversine distance in km
    const R = 6371; // km
    const dLat = ((targetStation.geo_lat - selectedPin.lat) * Math.PI) / 180;
    const dLon = ((targetStation.geo_long - selectedPin.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((selectedPin.lat * Math.PI) / 180) *
        Math.cos((targetStation.geo_lat * Math.PI) / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = Math.round(R * c);

    setDistanceKm(dist);
    setRevealed(true);

    let rank = 'Street Informant';
    let coins = 15;
    if (dist < 150) {
      rank = 'Interpol Grandmaster';
      coins = 150;
    } else if (dist < 500) {
      rank = 'Scotland Yard Chief Inspector';
      coins = 90;
    } else if (dist < 1500) {
      rank = 'Senior Forensics Detective';
      coins = 50;
    } else if (dist < 3000) {
      rank = 'Investigative Constable';
      coins = 25;
    }

    setRankTitle(rank);
    setCoinsAwarded(coins);
    if (onAddCoins) onAddCoins(coins);

    onGuessCoords(selectedPin);
    soundEffects.playTriumphChime(0.4);
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-md">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-purple-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-purple-500/30 flex items-center justify-between bg-gradient-to-r from-purple-950/90 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/20 text-purple-400 rounded-2xl border border-purple-500/30">
              <Search className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-100">
                  Geospatial & Audio Forensics Crime Lab
                </h3>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-400 border border-purple-500/30">
                  Radio Detective
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Analyze broadcast spectrum, examine cultural forensics, and pinpoint coordinates on the geodesic radar.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right font-mono">
              <div className="text-[10px] uppercase text-slate-400">Detective Score</div>
              <div className="text-base font-bold text-purple-300">{detectiveState.score} PTS</div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Workstation Content */}
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950">
          {/* LEFT: Forensic Dossier & Audio Spectrum */}
          <div className="flex flex-col gap-4">
            {/* Audio Spectrum Analyzer */}
            <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-purple-500/30 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-mono text-purple-300">
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  AUDIO HARMONIC SPECTROGRAM
                </span>
                <span className="text-[10px] text-slate-400 font-bold">STREAM LIVE</span>
              </div>
              <div className="rounded-xl overflow-hidden border border-slate-800">
                <canvas ref={spectrumCanvasRef} width={380} height={70} className="w-full h-[70px] block" />
              </div>
            </div>

            {/* Cultural Forensic Dossier */}
            <div className="bg-slate-900/80 p-4 rounded-2xl border border-purple-500/20 flex flex-col gap-2.5">
              <div className="text-xs font-mono font-bold text-purple-300 uppercase tracking-wider">
                Investigative Forensic Clues:
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">GRID FREQUENCY</span>
                  <strong className="text-amber-300">{forensic.powerGridHz}</strong>
                </div>
                <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">TRAFFIC RULE</span>
                  <strong className="text-cyan-300">{forensic.drivingSide}</strong>
                </div>
                <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">STREET SCRIPT</span>
                  <strong className="text-purple-300">{forensic.writingScript}</strong>
                </div>
                <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">CLIMATE ZONE</span>
                  <strong className="text-emerald-300">{forensic.climateZone}</strong>
                </div>
              </div>

              {/* Mystery Commentary Clue */}
              <div className="bg-slate-950/90 p-3 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed italic">
                "{mysteryClue || 'Listen to the broadcast phonemes, observe architectural cues, and identify the city origin.'}"
              </div>
            </div>

            {/* Action Bar / Status */}
            {!revealed ? (
              <button
                onClick={handleLockInGuess}
                disabled={!selectedPin}
                className={`w-full py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg ${
                  selectedPin
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/30 active:scale-95'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
              >
                <HelpCircle className="w-4 h-4" />
                {selectedPin ? 'Commit Forensic Guess' : 'Place Pin on World Radar Map to Guess'}
              </button>
            ) : (
              <div className="p-4 bg-purple-950/70 border-2 border-purple-500/60 rounded-2xl flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-purple-200 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    Mystery Solved!
                  </div>
                  <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
                    +{coinsAwarded} Coins
                  </span>
                </div>

                <div className="text-xs text-slate-200">
                  Location: <strong className="text-yellow-300">{targetStation?.place || targetStation?.country}, {targetStation?.country}</strong>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Station: <strong className="text-cyan-300">{targetStation?.name}</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-mono text-purple-300 bg-slate-950/60 p-2 rounded-lg">
                  <span>Offset: <strong>{distanceKm?.toLocaleString()} km</strong></span>
                  <span className="flex items-center gap-1 text-yellow-400">
                    <Award className="w-3.5 h-3.5" /> {rankTitle}
                  </span>
                </div>

                <button
                  onClick={onNewMystery}
                  className="mt-1 w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white font-bold text-xs rounded-xl transition shadow"
                >
                  Next Mystery Location →
                </button>
              </div>
            )}
          </div>

          {/* RIGHT: Interactive World Geodesic Targeter Map */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>GEODESIC RADAR TARGETER</span>
              <span>{selectedPin ? `${Math.round(selectedPin.lat)}°, ${Math.round(selectedPin.lng)}°` : 'Click to place target pin'}</span>
            </div>

            <div className="relative aspect-[16/10] w-full rounded-3xl overflow-hidden border-2 border-purple-500/40 shadow-inner bg-slate-950">
              <canvas
                ref={mapCanvasRef}
                width={480}
                height={300}
                className="w-full h-full block cursor-crosshair"
                onClick={handleMapClick}
              />
            </div>

            <div className="text-[11px] text-slate-400 text-center font-mono">
              Equirectangular Projection • Click map to pinpoint mystery origin
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
