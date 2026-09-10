import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, X, MapPin, Radio, Eye, Download } from 'lucide-react';
import { soundEffects } from '../services/audioEffects';
import { gamepadManager } from '../services/gamepadManager';
import { MissionHUD } from './MissionHUD';
import { useModalA11y } from '../hooks/useModalA11y';
import type { MissionScenario, MissionResultPayload } from '../missions/types';
import type { BackpackItem } from '../types';
import confetti from 'canvas-confetti';

interface PhotoSnapModalProps {
  isOpen: boolean;
  onClose: () => void;
  stationName: string;
  cityName: string;
  countryName: string;
  coords: { lat: number; lng: number };
  onSaveToBackpack: (item: BackpackItem) => void;
  /** Active World Expedition mission scenario (null = free postcards) */
  missionScenario?: MissionScenario | null;
  /** Emitted exactly once when an active mission run settles */
  onMissionResult?: (payload: MissionResultPayload) => void;
}

type PhotoFilter = 'vintage' | 'neon' | 'golden' | 'bw' | 'normal';

export const PhotoSnapModal: React.FC<PhotoSnapModalProps> = ({
  isOpen,
  onClose,
  stationName,
  cityName,
  countryName,
  coords,
  onSaveToBackpack,
  missionScenario,
  onMissionResult
}) => {
  const [filter, setFilter] = useState<PhotoFilter>('golden');
  const [focalLength, setFocalLength] = useState<number>(35); // 24mm, 35mm, 50mm, 85mm
  const [aperture, setAperture] = useState<number>(2.8); // f/1.4, f/2.8, f/8.0
  const [shutterSpeed] = useState<string>('1/250s');
  const [captured, setCaptured] = useState<boolean>(false);
  const [flashStrobe, setFlashStrobe] = useState<boolean>(false);
  const [photoScore, setPhotoScore] = useState<number>(0);
  const [savedDataUrl, setSavedDataUrl] = useState<string>('');
  const [compositionFeedback, setCompositionFeedback] = useState<string>('');

  const hiddenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Mission context (World Expedition Command), read fresh by handlers.
  const scenarioRef = useRef<MissionScenario | null | undefined>(undefined);
  useEffect(() => {
    scenarioRef.current = missionScenario;
  });
  const missionSettledRef = useRef<boolean>(false);

  // Reset mission bookkeeping once per open
  useEffect(() => {
    if (!isOpen) return;
    missionSettledRef.current = false;
  }, [isOpen]);

  // Settle the active mission exactly once — only when a capture honors the
  // composition brief. Off-brief shots and early exits never settle.
  const settleMission = useCallback(
    (compositionScore: number, focal: number) => {
      const scenario = scenarioRef.current;
      if (!scenario || missionSettledRef.current) return;
      missionSettledRef.current = true;
      onMissionResult?.({
        missionId: scenario.missionId,
        gameId: scenario.gameId,
        score: Math.min(100, Math.round(compositionScore + (scenario.briefBonus ?? 0))),
        outcome: 'completed',
        stats: {
          composition: compositionScore,
          focalLength: focal
        }
      });
    },
    [onMissionResult]
  );

  // Shared modal a11y: Escape to close, focus trap, focus restore
  const { containerRef: dialogRef, dialogProps } = useModalA11y({ isOpen, onClose });

  if (!isOpen) return null;

  const renderPostcardCanvas = (): string => {
    const canvas = hiddenCanvasRef.current || document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    const W = 1200;
    const H = 800;

    // 1. Sky Gradient based on filter
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.7);
    if (filter === 'golden') {
      skyGrad.addColorStop(0, '#1e1b4b');
      skyGrad.addColorStop(0.5, '#b45309');
      skyGrad.addColorStop(1, '#fde047');
    } else if (filter === 'neon') {
      skyGrad.addColorStop(0, '#0f172a');
      skyGrad.addColorStop(0.6, '#4c1d95');
      skyGrad.addColorStop(1, '#ec4899');
    } else if (filter === 'vintage') {
      skyGrad.addColorStop(0, '#422006');
      skyGrad.addColorStop(0.6, '#854d0e');
      skyGrad.addColorStop(1, '#fef08a');
    } else if (filter === 'bw') {
      skyGrad.addColorStop(0, '#09090b');
      skyGrad.addColorStop(0.6, '#27272a');
      skyGrad.addColorStop(1, '#a1a1aa');
    } else {
      skyGrad.addColorStop(0, '#0284c7');
      skyGrad.addColorStop(0.7, '#38bdf8');
      skyGrad.addColorStop(1, '#bae6fd');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    // 2. Distant Sun / Celestial Light
    ctx.save();
    ctx.beginPath();
    ctx.arc(W * 0.75, H * 0.35, focalLength >= 50 ? 120 : 70, 0, Math.PI * 2);
    ctx.fillStyle = filter === 'neon' ? 'rgba(236, 72, 153, 0.4)' : 'rgba(254, 240, 138, 0.5)';
    ctx.shadowColor = filter === 'neon' ? '#ec4899' : '#fde047';
    ctx.shadowBlur = 40;
    ctx.fill();
    ctx.restore();

    // 3. City Architectural Skyline Silhouettes
    const zoomScale = focalLength / 35; // 24mm (0.68x) to 85mm (2.4x)
    ctx.fillStyle = filter === 'vintage' ? '#291804' : filter === 'bw' ? '#18181b' : '#090d16';

    const bldCount = 18;
    const bldWidth = (W / bldCount) * (1 / Math.min(1.5, zoomScale));
    for (let i = 0; i < bldCount + 4; i++) {
      const hSeed = Math.sin(i * 1.7) * 0.5 + 0.5;
      const bHeight = 180 + hSeed * 240 * zoomScale;
      const bx = i * (bldWidth * 0.95) - 40;
      const by = H * 0.72 - bHeight;

      ctx.fillRect(bx, by, bldWidth, bHeight + 100);

      // Lit windows
      if (filter !== 'bw') {
        ctx.fillStyle = Math.random() > 0.4 ? 'rgba(253, 224, 71, 0.75)' : 'rgba(244, 114, 182, 0.6)';
        for (let wy = by + 20; wy < H * 0.7; wy += 35) {
          ctx.fillRect(bx + 12, wy, 8, 14);
          ctx.fillRect(bx + bldWidth - 20, wy, 8, 14);
        }
        ctx.fillStyle = filter === 'vintage' ? '#291804' : '#090d16';
      }
    }

    // 4. Radio Broadcast Tower Antenna
    const towerX = W * 0.38;
    const towerY = H * 0.2;
    ctx.strokeStyle = '#c8f65a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(towerX, H * 0.72);
    ctx.lineTo(towerX - 35, H * 0.72);
    ctx.lineTo(towerX, towerY);
    ctx.lineTo(towerX + 35, H * 0.72);
    ctx.stroke();

    // Radiating concentric radio broadcast arcs
    ctx.strokeStyle = 'rgba(200, 246, 90, 0.6)';
    ctx.lineWidth = 2;
    for (let r = 25; r <= 85; r += 20) {
      ctx.beginPath();
      ctx.arc(towerX, towerY, r, -Math.PI * 0.8, -Math.PI * 0.2);
      ctx.stroke();
    }

    // 5. Ground / Waterfront reflection
    const groundGrad = ctx.createLinearGradient(0, H * 0.72, 0, H);
    groundGrad.addColorStop(0, '#040711');
    groundGrad.addColorStop(1, '#020408');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, H * 0.72, W, H * 0.28);

    // 6. Postcard Frame & Classic Postal Franking Stamp
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 14;
    ctx.strokeRect(20, 20, W - 40, H - 40);

    // Vintage Postmark Stamp (Top Right)
    ctx.save();
    ctx.translate(W - 180, 110);
    ctx.rotate(-0.08);
    ctx.strokeStyle = filter === 'golden' ? '#f59e0b' : '#38bdf8';
    ctx.lineWidth = 3;
    ctx.strokeRect(-65, -45, 130, 90);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TERRAWAVE POST', 0, -20);
    ctx.font = '11px monospace';
    ctx.fillText(cityName.toUpperCase(), 0, 5);
    ctx.fillText(new Date().toISOString().slice(0, 10), 0, 25);
    ctx.restore();

    // Bottom Typography Banner
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${cityName.toUpperCase()} • ${countryName.toUpperCase()}`, 55, H - 75);

    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#c8f65a';
    ctx.fillText(`AIRWAVE: ${stationName} | ${coords.lat.toFixed(4)}°N, ${coords.lng.toFixed(4)}°E`, 55, H - 45);

    return canvas.toDataURL('image/png');
  };

  const handleShutterSnap = () => {
    setFlashStrobe(true);
    soundEffects.playCameraShutter();
    gamepadManager.vibrate(150, 0.7, 0.4);
    setTimeout(() => setFlashStrobe(false), 120);

    // Deterministic composition score calculation
    let score = 70;
    let feedback = '';

    // Focal length matching
    if (focalLength === 35 || focalLength === 24) {
      score += 15;
      feedback += 'Great wide architectural perspective. ';
    } else {
      score += 8;
      feedback += 'Tight telephoto framing. ';
    }

    // Aperture matching
    if (aperture >= 2.8) {
      score += 10;
      feedback += 'Crisp depth of field across the skyline. ';
    } else {
      score += 5;
      feedback += 'Shallow bokeh focus. ';
    }

    // Filter mood
    if (filter === 'golden' || filter === 'vintage') {
      score += 5;
      feedback += 'Warm atmospheric emulsion.';
    }

    score = Math.min(98, score);
    setPhotoScore(score);
    setCompositionFeedback(feedback);

    // Mission: the run settles when the capture honors the composition brief
    const scenario = scenarioRef.current;
    if (scenario && !missionSettledRef.current) {
      const inBrief =
        focalLength >= (scenario.briefFocalMin ?? 24) && focalLength <= (scenario.briefFocalMax ?? 85);
      if (inBrief) {
        settleMission(score, focalLength);
      }
    }

    // Generate real image data URL
    const dataUrl = renderPostcardCanvas();
    setSavedDataUrl(dataUrl);
    setCaptured(true);

    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.5 }
    });

    onSaveToBackpack({
      id: `photo-${Date.now()}`,
      name: `${cityName} Viewfinder Postcard`,
      category: 'photo',
      icon: '📸',
      city: cityName,
      country: countryName,
      description: `Authentic ${focalLength}mm ƒ/${aperture} capture tuned to ${stationName}. Score: ${score}/100. ${feedback}`,
      acquiredAt: new Date().toISOString(),
      photoUrl: dataUrl,
      priceCoins: 35 // Balanced sale value
    });
  };

  const handleDownload = () => {
    if (!savedDataUrl) return;
    const a = document.createElement('a');
    a.href = savedDataUrl;
    a.download = `${cityName.toLowerCase().replace(/\s+/g, '_')}_postcard.png`;
    a.click();
    soundEffects.playUiClick(0.2);
  };

  const handleRetake = () => {
    setCaptured(false);
  };

  // CSS filter for the live street-view frame, mirroring the film emulsion presets
  const getFilterStyle = (): React.CSSProperties => {
    switch (filter) {
      case 'vintage':
        return { filter: 'sepia(0.55) contrast(0.92) brightness(0.96) saturate(0.85)' };
      case 'golden':
        return { filter: 'sepia(0.28) saturate(1.35) contrast(1.05) brightness(1.06) hue-rotate(-8deg)' };
      case 'neon':
        return { filter: 'saturate(1.7) contrast(1.22) brightness(0.95) hue-rotate(14deg)' };
      case 'bw':
        return { filter: 'grayscale(1) contrast(1.15) brightness(1.02)' };
      default:
        return { filter: 'none' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center p-3 select-none">
      <div ref={dialogRef} {...dialogProps} className="relative w-full max-w-2xl bg-slate-950 border border-lime-400/40 rounded-3xl overflow-hidden shadow-2xl flex flex-col text-slate-100 max-h-[94vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-900/90 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-lime-500/20 text-lime-400 border border-lime-500/30 rounded-xl">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-wide text-slate-100 uppercase">
                  Pro SLR Viewfinder & Composition Mode
                </h2>
                <span className="text-[10px] font-mono bg-lime-950 text-lime-300 border border-lime-500/40 px-2 py-0.5 rounded-full font-bold">
                  PHOTOGRAPHY LAB
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Frame street moments in {cityName}, {countryName} • Adjust aperture & focal length
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mission objective banner (World Expedition Command) */}
        <MissionHUD
          scenario={missionScenario}
          progressLabel={`${focalLength}mm ƒ/${aperture}`}
          secondaryLabel={
            missionScenario
              ? `Brief: ${missionScenario.briefFocalMin ?? 24}–${missionScenario.briefFocalMax ?? 85}mm`
              : undefined
          }
        />

        {/* SLR Viewfinder Viewport */}
        <div className="relative h-80 bg-slate-950 overflow-hidden flex items-center justify-center">
          {/* Flash Strobe Flash Overlay */}
          {flashStrobe && (
            <div className="absolute inset-0 z-40 bg-white opacity-90 transition-opacity duration-100 pointer-events-none" />
          )}

          {/* Embedded Street View Feed */}
          <iframe
            title="Photo Preview"
            src={`https://maps.google.com/maps?q=${coords.lat},${coords.lng}&layer=c&cbll=${coords.lat},${coords.lng}&source=embed&output=svembed`}
            className="w-full h-full border-0 pointer-events-none"
            style={getFilterStyle()}
          />

          {/* SLR Rule-of-Thirds Grid Overlay */}
          <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border-2 border-white/20">
            <div className="border-r border-b border-white/20" />
            <div className="border-r border-b border-white/20" />
            <div className="border-b border-white/20" />
            <div className="border-r border-b border-white/20" />
            <div className="border-r border-b border-white/20 flex items-center justify-center">
              {/* Center Autofocus Reticle */}
              <div className="w-12 h-12 border-2 border-lime-400/80 rounded-lg flex items-center justify-center">
                <div className="w-2 h-2 bg-lime-400 rounded-full animate-pulse" />
              </div>
            </div>
            <div className="border-b border-white/20" />
            <div className="border-r border-white/20" />
            <div className="border-r border-white/20" />
            <div />
          </div>

          {/* Top SLR Telemetry Bar (Aperture, Shutter, ISO) */}
          <div className="absolute top-3 inset-x-4 flex items-center justify-between pointer-events-none text-xs font-mono font-bold text-lime-400 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-lime-400/30">
            <div className="flex items-center gap-3">
              <span>ƒ/{aperture}</span>
              <span>{shutterSpeed}</span>
              <span>ISO 200</span>
              <span>{focalLength}mm</span>
            </div>

            <div className="flex items-center gap-1.5 text-amber-400">
              <Eye className="w-3.5 h-3.5" /> AF LOCKED [●]
            </div>
          </div>

          {/* Bottom Watermark Strip */}
          <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-end justify-between pointer-events-none text-xs font-mono">
            <div>
              <div className="flex items-center gap-1 text-lime-300 font-bold">
                <MapPin className="w-3.5 h-3.5 text-lime-400" /> {cityName}, {countryName}
              </div>
              <div className="text-[11px] text-slate-300 flex items-center gap-1 mt-0.5">
                <Radio className="w-3 h-3 text-amber-400" /> {stationName}
              </div>
            </div>

            <div className="text-right text-[10px] text-slate-400">
              <div>{coords.lat.toFixed(4)}°N, {coords.lng.toFixed(4)}°E</div>
              <div className="text-lime-400 font-bold">{new Date().toLocaleDateString()}</div>
            </div>
          </div>
        </div>

        {/* Camera Control Deck */}
        <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex flex-col gap-3">
          {captured ? (
            <div className="bg-emerald-950/80 border border-emerald-500/50 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3">
                {savedDataUrl && (
                  <img
                    src={savedDataUrl}
                    alt="Captured Postcard"
                    className="w-20 h-14 object-cover rounded-xl border border-emerald-400/40 shadow-md"
                  />
                )}
                <div>
                  <div className="text-sm font-black text-emerald-300">
                    Postcard Captured & Saved in Backpack!
                  </div>
                  <div className="text-xs text-slate-300">
                    Composition Rating: <strong className="text-amber-400">{photoScore}/100</strong> • {compositionFeedback}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow"
                >
                  <Download className="w-3.5 h-3.5" /> Download (.PNG)
                </button>
                <button
                  onClick={handleRetake}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl"
                >
                  Retake
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-1.5 bg-lime-400 hover:bg-lime-300 text-slate-950 text-xs font-black rounded-xl"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Lens Controls (Focal Length & Film Emulsion) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                {/* Focal Length */}
                <div className="flex flex-col gap-1">
                  <span className="text-slate-400">Lens Focal:</span>
                  <div className="grid grid-cols-4 gap-1">
                    {[24, 35, 50, 85].map(mm => (
                      <button
                        key={mm}
                        onClick={() => setFocalLength(mm)}
                        className={`py-1 rounded-lg font-bold transition border ${
                          focalLength === mm
                            ? 'bg-lime-400 text-slate-950 border-lime-300'
                            : missionScenario &&
                                mm >= (missionScenario.briefFocalMin ?? 24) &&
                                mm <= (missionScenario.briefFocalMax ?? 85)
                              ? 'bg-slate-800 text-lime-300 border-lime-500/50'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {mm}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Aperture */}
                <div className="flex flex-col gap-1">
                  <span className="text-slate-400">Aperture (DoF):</span>
                  <div className="grid grid-cols-3 gap-1">
                    {[1.4, 2.8, 8.0].map(f => (
                      <button
                        key={f}
                        onClick={() => setAperture(f)}
                        className={`py-1 rounded-lg font-bold transition border ${
                          aperture === f
                            ? 'bg-lime-400 text-slate-950 border-lime-300'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        ƒ/{f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Film Filter */}
                <div className="col-span-2 flex flex-col gap-1">
                  <span className="text-slate-400">Film Emulsion:</span>
                  <div className="grid grid-cols-5 gap-1">
                    {[
                      { id: 'vintage', label: 'Vintage' },
                      { id: 'golden', label: 'Golden' },
                      { id: 'neon', label: 'Neon' },
                      { id: 'bw', label: 'B&W' },
                      { id: 'normal', label: 'Natural' }
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => setFilter(f.id as PhotoFilter)}
                        className={`py-1 rounded-lg font-bold transition border ${
                          filter === f.id
                            ? 'bg-lime-400 text-slate-950 border-lime-300'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Shutter Button */}
              <button
                onClick={handleShutterSnap}
                className="w-full py-3 bg-gradient-to-r from-lime-400 to-emerald-400 hover:from-lime-300 hover:to-emerald-300 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-lime-400/20 active:scale-95 flex items-center justify-center gap-2"
              >
                <Camera className="w-5 h-5 fill-slate-950" />
                PRESS SHUTTER (CLICK!) & PRINT POSTCARD
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
