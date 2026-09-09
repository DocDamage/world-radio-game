import React, { useState } from 'react';
import { Camera, X, MapPin, Radio, Eye, Award } from 'lucide-react';
import { soundEffects } from '../services/audioEffects';
import { gamepadManager } from '../services/gamepadManager';
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
}

type PhotoFilter = 'vintage' | 'neon' | 'golden' | 'bw' | 'normal';

export const PhotoSnapModal: React.FC<PhotoSnapModalProps> = ({
  isOpen,
  onClose,
  stationName,
  cityName,
  countryName,
  coords,
  onSaveToBackpack
}) => {
  const [filter, setFilter] = useState<PhotoFilter>('vintage');
  const [focalLength, setFocalLength] = useState<number>(35); // 24mm, 35mm, 50mm, 85mm
  const [aperture, setAperture] = useState<number>(2.8); // f/1.4 to f/11
  const [shutterSpeed] = useState<string>('1/250s');
  const [captured, setCaptured] = useState<boolean>(false);
  const [flashStrobe, setFlashStrobe] = useState<boolean>(false);
  const [photoScore, setPhotoScore] = useState<number>(0);

  if (!isOpen) return null;

  const getFilterStyle = (): React.CSSProperties => {
    let base = '';
    switch (filter) {
      case 'vintage':
        base = 'sepia(0.35) contrast(1.1) brightness(0.95)';
        break;
      case 'neon':
        base = 'hue-rotate(180deg) saturate(1.8) contrast(1.2)';
        break;
      case 'golden':
        base = 'sepia(0.2) saturate(1.4) brightness(1.05)';
        break;
      case 'bw':
        base = 'grayscale(1) contrast(1.25)';
        break;
      default:
        base = 'none';
        break;
    }

    // Aperture blur effect for depth of field
    const blurPx = aperture < 2.0 ? 'blur(0.8px)' : 'none';
    return {
      filter: base,
      backdropFilter: blurPx
    };
  };

  const handleShutterSnap = () => {
    // Flash strobe
    setFlashStrobe(true);
    soundEffects.playCameraShutter();
    gamepadManager.vibrate(150, 0.7, 0.4);

    setTimeout(() => setFlashStrobe(false), 120);

    // Calculate composition score
    const baseScore = 80 + Math.floor(Math.random() * 19);
    setPhotoScore(baseScore);
    setCaptured(true);

    confetti({
      particleCount: 50,
      spread: 50,
      origin: { y: 0.5 }
    });

    // Save to backpack
    onSaveToBackpack({
      id: `photo-${Date.now()}`,
      name: `${cityName} Street Viewfinder Postcard`,
      category: 'souvenir',
      icon: '📸',
      city: cityName,
      country: countryName,
      description: `Pro SLR ${focalLength}mm f/${aperture} capture tuned to ${stationName}. Composition Score: ${baseScore}/100. Filter: ${filter}.`,
      acquiredAt: new Date().toISOString()
    });
  };

  const handleRetake = () => {
    setCaptured(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center p-3 select-none">
      <div className="relative w-full max-w-2xl bg-slate-950 border border-lime-400/40 rounded-3xl overflow-hidden shadow-2xl flex flex-col text-slate-100">
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
            <div className="bg-emerald-950/80 border border-emerald-500/50 p-4 rounded-2xl flex items-center justify-between animate-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/40">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm font-black text-emerald-300">
                    Postcard Captured & Saved in Backpack!
                  </div>
                  <div className="text-xs text-slate-300">
                    Composition Rating: <strong className="text-amber-400">{photoScore}/100</strong> • Stashed in Backpack
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRetake}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl"
                >
                  Retake Shot
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl"
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
