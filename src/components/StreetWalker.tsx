import React, { useState, useEffect, useCallback } from 'react';
import { Compass, Footprints, ExternalLink, Navigation, Bike, Ship, Fish, ShoppingBag, Camera, Backpack, Disc, Flame } from 'lucide-react';
import type { RadioStation, LocationEnvironment } from '../types';

interface StreetWalkerProps {
  station: RadioStation;
  playerCoords: { lat: number; lng: number };
  environment: LocationEnvironment;
  onMovePlayer?: (newCoords: { lat: number; lng: number }) => void;
  geminiApiKey: string;
  onStartBicycle?: () => void;
  onStartBoating?: () => void;
  onOpenFishing?: () => void;
  onOpenMarket?: () => void;
  onTakePhoto?: () => void;
  onOpenBackpack?: () => void;
  onOpenRooftopBeat?: () => void;
  onStartDesertBuggy?: () => void;
}

export const StreetWalker: React.FC<StreetWalkerProps> = ({
  station: _station,
  playerCoords,
  environment,
  onMovePlayer,
  geminiApiKey: _geminiApiKey,
  onStartBicycle,
  onStartBoating,
  onOpenFishing,
  onOpenMarket,
  onTakePhoto,
  onOpenBackpack,
  onOpenRooftopBeat,
  onStartDesertBuggy
}) => {
  const [heading, setHeading] = useState<number>(0);
  const [pitch, setPitch] = useState<number>(5);
  const [stepCount, setStepCount] = useState<number>(0);

  // Fallback direct Google Maps 3D URL if user wants full unconstrained 3D walk
  const fullGoogleMapsUrl = `https://www.google.com/maps/@${playerCoords.lat},${playerCoords.lng},18z/data=!3m1!1e3`;

  // Step forward/backward in the current heading direction
  const handleWalk = useCallback((direction: 'forward' | 'backward' | 'left' | 'right') => {
    // 0.00018 deg is approx 20 meters
    const stepSize = 0.00018;
    let rad = (heading * Math.PI) / 180;

    if (direction === 'backward') rad += Math.PI;
    if (direction === 'left') rad -= Math.PI / 2;
    if (direction === 'right') rad += Math.PI / 2;

    const deltaLat = Math.cos(rad) * stepSize;
    const deltaLng = (Math.sin(rad) * stepSize) / Math.cos((playerCoords.lat * Math.PI) / 180);

    const newPos = {
      lat: playerCoords.lat + deltaLat,
      lng: playerCoords.lng + deltaLng
    };

    setStepCount(prev => prev + 1);
    if (onMovePlayer) {
      onMovePlayer(newPos);
    }
  }, [heading, playerCoords, onMovePlayer]);

  const handleTurn = useCallback((degrees: number) => {
    setHeading(prev => (prev + degrees + 360) % 360);
  }, []);

  // Gamepad analog look listener (GTA-style right stick camera)
  useEffect(() => {
    const onGamepadLook = (e: Event) => {
      const custom = e as CustomEvent<{ dh: number; dp: number }>;
      if (custom.detail) {
        setHeading(prev => (prev + custom.detail.dh + 360) % 360);
        setPitch(prev => Math.max(-40, Math.min(60, prev + custom.detail.dp)));
      }
    };

    window.addEventListener('gamepad-look', onGamepadLook);
    return () => window.removeEventListener('gamepad-look', onGamepadLook);
  }, []);

  // Keyboard navigation listener (WASD and Arrow keys)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
        handleWalk('forward');
      } else if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') {
        handleWalk('backward');
      } else if (e.key === 'a' || e.key === 'A') {
        handleTurn(-30);
      } else if (e.key === 'd' || e.key === 'D') {
        handleTurn(30);
      } else if (e.key === 'ArrowLeft') {
        handleTurn(-45);
      } else if (e.key === 'ArrowRight') {
        handleTurn(45);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleWalk, handleTurn]);

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950">
      {/* 3D Street View Canvas / Embed */}
      <div className="relative w-full h-full overflow-hidden">
        <iframe
          title="Street View"
          src={`https://maps.google.com/maps?q=${playerCoords.lat},${playerCoords.lng}&layer=c&cbll=${playerCoords.lat},${playerCoords.lng}&cbp=11,${heading},0,${pitch},0&source=embed&output=svembed`}
          className="w-full h-full border-0 select-none"
          allowFullScreen
          loading="lazy"
        />

        {/* Ambient Overlay Vignette */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/40" />
      </div>

      {/* Floating HUD Controls for Walking & Looking Around */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2">
        {/* Floating Street Activity Dock */}
        <div className="flex flex-col items-center gap-1.5 bg-slate-900/95 backdrop-blur-md border border-lime-400/40 rounded-2xl p-2 shadow-2xl">
          <div className="text-[10px] font-mono font-bold text-lime-300 flex items-center gap-1.5 px-2 py-0.5 bg-slate-950/80 rounded-full border border-lime-500/20">
            <span>{environment.badge}</span>
            {environment.waterwayName && <span className="text-sky-300">• {environment.waterwayName}</span>}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            {/* Bike: available in almost all biomes */}
            {onStartBicycle && environment.availableActivities.includes('bike') && (
              <button
                onClick={onStartBicycle}
                className="px-3 py-1.5 bg-slate-800/80 hover:bg-lime-400/20 text-lime-300 hover:text-lime-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95 border border-lime-500/20"
                title="Ride Bicycle Arcade Game in this city"
              >
                <Bike className="w-3.5 h-3.5" /> Bike Grand Prix
              </button>
            )}

            {/* Boating: ONLY in coastal or river biomes */}
            {onStartBoating && environment.availableActivities.includes('boat') && (
              <button
                onClick={onStartBoating}
                className="px-3 py-1.5 bg-slate-800/80 hover:bg-sky-400/20 text-sky-300 hover:text-sky-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95 border border-sky-500/20"
                title="Waterway & Naval Cruise Simulation"
              >
                <Ship className="w-3.5 h-3.5" /> Boat Nav
              </button>
            )}

            {/* Fishing: ONLY where there is water (coastal, river, alpine stream) */}
            {onOpenFishing && environment.availableActivities.includes('fishing') && (
              <button
                onClick={onOpenFishing}
                className="px-3 py-1.5 bg-slate-800/80 hover:bg-sky-400/20 text-sky-300 hover:text-sky-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95 border border-sky-500/20"
                title="Deep Cast & Catch Fishing Simulator"
              >
                <Fish className="w-3.5 h-3.5" /> Angling Sim
              </button>
            )}

            {/* Rooftop DJ: In inland metropolises! */}
            {onOpenRooftopBeat && environment.availableActivities.includes('dj') && (
              <button
                onClick={onOpenRooftopBeat}
                className="px-3 py-1.5 bg-slate-800/80 hover:bg-purple-400/20 text-purple-300 hover:text-purple-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95 border border-purple-500/20"
                title="Rooftop Vinyl Radio Jam & Beat Machine"
              >
                <Disc className="w-3.5 h-3.5" /> Rooftop DJ Jam
              </button>
            )}

            {/* Desert Dune Buggy: In desert biomes! */}
            {onStartDesertBuggy && environment.availableActivities.includes('buggy') && (
              <button
                onClick={onStartDesertBuggy}
                className="px-3 py-1.5 bg-slate-800/80 hover:bg-orange-400/20 text-orange-300 hover:text-orange-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95 border border-orange-500/20"
                title="Desert Dune Buggy Cruiser"
              >
                <Flame className="w-3.5 h-3.5" /> Dune Buggy
              </button>
            )}

            {/* Market */}
            {onOpenMarket && (
              <button
                onClick={onOpenMarket}
                className="px-3 py-1.5 bg-slate-800/80 hover:bg-amber-400/20 text-amber-300 hover:text-amber-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95 border border-amber-500/20"
                title="Visit Local Market & Bakery"
              >
                <ShoppingBag className="w-3.5 h-3.5" /> Market
              </button>
            )}

            {/* Photo Postcard */}
            {onTakePhoto && (
              <button
                onClick={onTakePhoto}
                className="px-3 py-1.5 bg-slate-800/80 hover:bg-pink-400/20 text-pink-300 hover:text-pink-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95 border border-pink-500/20"
                title="Snap Postcard Photo"
              >
                <Camera className="w-3.5 h-3.5" /> Photo
              </button>
            )}

            {/* Backpack */}
            {onOpenBackpack && (
              <button
                onClick={onOpenBackpack}
                className="px-3 py-1.5 bg-slate-800/80 hover:bg-emerald-400/20 text-emerald-300 hover:text-emerald-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95 border border-emerald-500/20"
                title="Open Adventure Backpack"
              >
                <Backpack className="w-3.5 h-3.5" /> Backpack
              </button>
            )}
          </div>
        </div>

        <div className="bg-slate-900/90 backdrop-blur-md border border-lime-400/30 rounded-2xl p-3 shadow-2xl flex items-center gap-4">
          {/* Turn Left */}
          <button
            onClick={() => handleTurn(-45)}
            className="p-3 bg-slate-800 hover:bg-lime-400/20 text-lime-300 rounded-xl transition border border-lime-400/20 active:scale-95 flex items-center justify-center font-bold"
            title="Turn Left 45° (or press A / Left Arrow)"
          >
            ↺ 45°
          </button>

          {/* D-Pad Movement */}
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={() => handleWalk('forward')}
              className="px-5 py-2.5 bg-lime-400 hover:bg-lime-300 text-slate-950 font-bold rounded-xl transition shadow-lg shadow-lime-400/20 active:scale-95 flex items-center gap-1.5"
              title="Step Forward (or press W / Up Arrow)"
            >
              <Navigation className="w-4 h-4 fill-slate-950" /> Step Forward
            </button>
            <div className="flex gap-1.5">
              <button
                onClick={() => handleWalk('left')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition"
              >
                Strafe Left
              </button>
              <button
                onClick={() => handleWalk('backward')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition"
                title="Step Backward (or press S / Down Arrow)"
              >
                Back
              </button>
              <button
                onClick={() => handleWalk('right')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition"
              >
                Strafe Right
              </button>
            </div>
          </div>

          {/* Turn Right */}
          <button
            onClick={() => handleTurn(45)}
            className="p-3 bg-slate-800 hover:bg-lime-400/20 text-lime-300 rounded-xl transition border border-lime-400/20 active:scale-95 flex items-center justify-center font-bold"
            title="Turn Right 45° (or press D / Right Arrow)"
          >
            ↻ 45°
          </button>
        </div>

        {/* Steps & Compass stats */}
        <div className="flex items-center gap-3 text-xs font-mono text-lime-400/90 bg-slate-950/80 px-3 py-1 rounded-full border border-lime-400/20">
          <span className="flex items-center gap-1">
            <Footprints className="w-3.5 h-3.5" /> {stepCount} steps walked
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Compass className="w-3.5 h-3.5" /> {Math.round(heading)}°
          </span>
          <span>•</span>
          <span className="text-slate-400 text-[11px]">WASD to walk & turn</span>
          <span>•</span>
          <a
            href={fullGoogleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-sky-400 hover:underline"
          >
            <ExternalLink className="w-3 h-3" /> Open in Google Earth 3D
          </a>
        </div>
      </div>
    </div>
  );
};
