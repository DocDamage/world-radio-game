import React, { useState } from 'react';
import { Camera, X, MapPin, Radio, Check } from 'lucide-react';
import { soundEffects } from '../services/audioEffects';
import type { BackpackItem } from '../types';

interface PhotoSnapModalProps {
  isOpen: boolean;
  onClose: () => void;
  stationName: string;
  cityName: string;
  countryName: string;
  coords: { lat: number; lng: number };
  onSaveToBackpack: (item: BackpackItem) => void;
}

type PhotoFilter = 'normal' | 'vintage' | 'neon' | 'golden' | 'bw';

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
  const [saved, setSaved] = useState<boolean>(false);

  if (!isOpen) return null;

  const getFilterStyle = (): React.CSSProperties => {
    switch (filter) {
      case 'vintage':
        return { filter: 'sepia(0.35) contrast(1.1) brightness(0.95)' };
      case 'neon':
        return { filter: 'hue-rotate(180deg) saturate(1.8) contrast(1.2)' };
      case 'golden':
        return { filter: 'sepia(0.2) saturate(1.4) brightness(1.05)' };
      case 'bw':
        return { filter: 'grayscale(1) contrast(1.25)' };
      default:
        return {};
    }
  };

  const handleCaptureSave = () => {
    soundEffects.playCameraShutter();
    setSaved(true);

    onSaveToBackpack({
      id: `photo-${Date.now()}`,
      name: `${cityName} Street Snapshot`,
      category: 'souvenir',
      icon: '📸',
      city: cityName,
      country: countryName,
      description: `Postcard snapshot captured while tuned into ${stationName} at ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)} (${filter} film filter).`,
      acquiredAt: new Date().toISOString()
    });

    setTimeout(() => {
      onClose();
      setSaved(false);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-slate-900 to-slate-950 border border-lime-400/40 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-lime-950/80 border border-lime-400/50 rounded-2xl text-lime-400">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-100 tracking-wide font-sans">
                Postcard Photo Mode
              </h2>
              <p className="text-xs text-slate-400">
                Capture street moments with local station watermarks
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

        {/* Postcard Frame Viewport */}
        <div className="relative h-64 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-slate-950">
          {/* Street View snapshot background */}
          <iframe
            title="Photo Preview"
            src={`https://maps.google.com/maps?q=${coords.lat},${coords.lng}&layer=c&cbll=${coords.lat},${coords.lng}&source=embed&output=svembed`}
            className="w-full h-full border-0 pointer-events-none"
            style={getFilterStyle()}
          />

          {/* Watermark Stamp Overlay */}
          <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-end justify-between pointer-events-none">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-lime-400">
                <MapPin className="w-3.5 h-3.5" /> {cityName}, {countryName}
              </div>
              <div className="text-[11px] text-slate-300 flex items-center gap-1 mt-0.5">
                <Radio className="w-3 h-3 text-amber-400" /> {stationName}
              </div>
            </div>

            <div className="text-right text-[10px] font-mono text-slate-400">
              <div>{coords.lat.toFixed(4)}°N, {coords.lng.toFixed(4)}°E</div>
              <div className="text-lime-300/80 font-bold">{new Date().toLocaleDateString()}</div>
            </div>
          </div>
        </div>

        {/* Film Filter Selector */}
        <div className="flex items-center justify-between gap-1.5">
          <span className="text-xs text-slate-400 font-mono">Film:</span>
          {[
            { id: 'vintage', label: 'Vintage 35mm' },
            { id: 'golden', label: 'Golden Hour' },
            { id: 'neon', label: 'Cyberpunk' },
            { id: 'bw', label: 'Monochrome' },
            { id: 'normal', label: 'Natural' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as PhotoFilter)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition border ${
                filter === f.id
                  ? 'bg-lime-400 text-slate-950 border-lime-300'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Capture & Save Button */}
        <button
          onClick={handleCaptureSave}
          disabled={saved}
          className={`w-full py-3 rounded-2xl font-black text-sm transition flex items-center justify-center gap-2 shadow-lg active:scale-95 ${
            saved
              ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/30'
              : 'bg-lime-400 hover:bg-lime-300 text-slate-950 shadow-lime-400/20'
          }`}
        >
          {saved ? (
            <>
              <Check className="w-4 h-4" /> Saved into Backpack!
            </>
          ) : (
            <>
              <Camera className="w-4 h-4 fill-slate-950" /> Snap Postcard & Stash in Backpack
            </>
          )}
        </button>
      </div>
    </div>
  );
};
