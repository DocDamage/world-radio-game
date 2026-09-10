import React from 'react';
import { X, Radio, ExternalLink, Footprints, Flame, Heart, ShoppingBag, Fish, Bike, Ship, Camera, Disc, Mountain, Waves } from 'lucide-react';
import type { RadioStation, Place, LocationEnvironment } from '../types';
import { useModalA11y } from '../hooks/useModalA11y';

interface CityDrawerProps {
  place: Place | null;
  environment?: LocationEnvironment | null;
  stations: RadioStation[];
  activeStation: RadioStation | null;
  isPlaying: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSelectStation: (station: RadioStation) => void;
  onWalkCity: () => void;
  onStartHunt: () => void;
  favorites: Record<string, RadioStation>;
  onToggleFavorite: (station: RadioStation) => void;
  onOpenMarket?: () => void;
  onOpenFishing?: () => void;
  onStartBicycle?: () => void;
  onStartBoating?: () => void;
  onStartSurfing?: () => void;
  onTakePhoto?: () => void;
  onOpenRooftopBeat?: () => void;
  onStartDesertBuggy?: () => void;
  onStartAlpineSki?: () => void;
}

export const CityDrawer: React.FC<CityDrawerProps> = ({
  place,
  environment,
  stations,
  activeStation,
  isPlaying,
  isOpen,
  onClose,
  onSelectStation,
  onWalkCity,
  onStartHunt,
  favorites,
  onToggleFavorite,
  onOpenMarket,
  onOpenFishing,
  onStartBicycle,
  onStartBoating,
  onStartSurfing,
  onTakePhoto,
  onOpenRooftopBeat,
  onStartDesertBuggy,
  onStartAlpineSki
}) => {
  // Shared modal a11y: Escape to close, focus trap, focus restore
  const { containerRef: dialogRef, dialogProps } = useModalA11y<HTMLElement>({ isOpen, onClose });

  if (!isOpen || !place) return null;

  return (
    <aside
      ref={dialogRef}
      {...dialogProps}
      className="absolute top-20 left-6 bottom-28 z-40 w-96 max-w-[calc(100vw-3rem)] bg-slate-900/95 backdrop-blur-xl border border-lime-400/30 rounded-3xl p-5 shadow-2xl flex flex-col gap-3.5 text-slate-100 animate-in fade-in slide-in-from-left duration-250 select-none overflow-y-auto overscroll-contain"
      aria-label="Stations in the selected place"
    >
      {/* City Header */}
      <div className="flex items-start justify-between border-b border-slate-800 pb-3">
        <div>
          <span className="text-[11px] font-mono text-lime-400 font-bold uppercase tracking-wider">
            {place.country}
          </span>
          <h2 className="text-xl font-black text-slate-100 tracking-tight leading-tight">
            {place.title}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {stations.length} station{stations.length === 1 ? '' : 's'} broadcasting live
          </p>
          {environment && (
            <div className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] font-mono bg-slate-950/80 px-2 py-0.5 rounded-md text-lime-300 border border-lime-500/20">
              <span>{environment.badge}</span>
              {environment.waterwayName && <span className="text-sky-300">• {environment.waterwayName}</span>}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Action Navigation Grid for this City */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={onWalkCity}
            className="flex-1 py-2 px-3 bg-lime-400 hover:bg-lime-300 text-slate-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-lg shadow-lime-400/20 active:scale-95"
          >
            <Footprints className="w-4 h-4 fill-slate-950" /> Walk 3D Streets
          </button>
          <button
            onClick={onStartHunt}
            className="py-2 px-3 bg-slate-800 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 active:scale-95"
            title="Hunt antenna in this city"
          >
            <Flame className="w-4 h-4 text-amber-400" /> Hunt
          </button>
        </div>

        {/* Local Location-Appropriate Activity Buttons */}
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
          {/* Shop */}
          <button
            onClick={onOpenMarket}
            className="p-2 bg-slate-950/80 hover:bg-slate-800 border border-amber-500/30 hover:border-amber-400 rounded-xl text-amber-300 flex flex-col items-center gap-1 text-[10px] font-bold transition active:scale-95"
            title="Local Markets & Stores"
          >
            <ShoppingBag className="w-4 h-4 text-amber-400" /> Shop
          </button>

          {/* Bike (if allowed) */}
          {(!environment || environment.availableActivities.includes('bike')) && (
            <button
              onClick={onStartBicycle}
              className="p-2 bg-slate-950/80 hover:bg-slate-800 border border-lime-500/30 hover:border-lime-400 rounded-xl text-lime-300 flex flex-col items-center gap-1 text-[10px] font-bold transition active:scale-95"
              title="Arcade Street Cycling"
            >
              <Bike className="w-4 h-4 text-lime-400" /> Bike
            </button>
          )}

          {/* Boat (ONLY if water available) */}
          {(!environment || environment.availableActivities.includes('boat')) && (
            <button
              onClick={onStartBoating}
              className="p-2 bg-slate-950/80 hover:bg-slate-800 border border-cyan-500/30 hover:border-cyan-400 rounded-xl text-cyan-300 flex flex-col items-center gap-1 text-[10px] font-bold transition active:scale-95"
              title="Waterway Naval Navigation"
            >
              <Ship className="w-4 h-4 text-cyan-400" /> Boat
            </button>
          )}

          {/* Ocean Surfing (ONLY in coastal biome) */}
          {environment?.availableActivities.includes('surf') && (
            <button
              onClick={onStartSurfing}
              className="p-2 bg-slate-950/80 hover:bg-slate-800 border border-teal-500/30 hover:border-teal-400 rounded-xl text-teal-300 flex flex-col items-center gap-1 text-[10px] font-bold transition active:scale-95"
              title="Ocean Swell Surfing Simulation"
            >
              <Waves className="w-4 h-4 text-teal-400" /> Surf
            </button>
          )}

          {/* Fishing (ONLY if water available) */}
          {(!environment || environment.availableActivities.includes('fishing')) && (
            <button
              onClick={onOpenFishing}
              className="p-2 bg-slate-950/80 hover:bg-slate-800 border border-sky-500/30 hover:border-sky-400 rounded-xl text-sky-300 flex flex-col items-center gap-1 text-[10px] font-bold transition active:scale-95"
              title="Angling Simulator"
            >
              <Fish className="w-4 h-4 text-sky-400" /> Fish
            </button>
          )}

          {/* Rooftop DJ (if urban metropolis) */}
          {environment?.availableActivities.includes('dj') && (
            <button
              onClick={onOpenRooftopBeat}
              className="p-2 bg-slate-950/80 hover:bg-slate-800 border border-purple-500/30 hover:border-purple-400 rounded-xl text-purple-300 flex flex-col items-center gap-1 text-[10px] font-bold transition active:scale-95"
              title="Rooftop Vinyl Radio Jam"
            >
              <Disc className="w-4 h-4 text-purple-400" /> DJ Jam
            </button>
          )}

          {/* Desert Dune Buggy (if desert) */}
          {environment?.availableActivities.includes('buggy') && (
            <button
              onClick={onStartDesertBuggy}
              className="p-2 bg-slate-950/80 hover:bg-slate-800 border border-orange-500/30 hover:border-orange-400 rounded-xl text-orange-300 flex flex-col items-center gap-1 text-[10px] font-bold transition active:scale-95"
              title="Desert Dune Buggy Cruiser"
            >
              <Flame className="w-4 h-4 text-orange-400" /> Buggy
            </button>
          )}

          {/* Alpine Slalom Ski (if alpine) */}
          {environment?.availableActivities.includes('ski') && (
            <button
              onClick={onStartAlpineSki}
              className="p-2 bg-slate-950/80 hover:bg-slate-800 border border-sky-500/30 hover:border-sky-400 rounded-xl text-sky-300 flex flex-col items-center gap-1 text-[10px] font-bold transition active:scale-95"
              title="Alpine Slalom & Mountain Descent"
            >
              <Mountain className="w-4 h-4 text-sky-400" /> Slalom
            </button>
          )}

          {/* Postcard Photo */}
          <button
            onClick={onTakePhoto}
            className="p-2 bg-slate-950/80 hover:bg-slate-800 border border-pink-500/30 hover:border-pink-400 rounded-xl text-pink-300 flex flex-col items-center gap-1 text-[10px] font-bold transition active:scale-95"
            title="Snap Postcard Photo"
          >
            <Camera className="w-4 h-4 text-pink-400" /> Photo
          </button>
        </div>
      </div>

      {/* Station List */}
      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2">
        {stations.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">
            Loading stations in {place.title}...
          </div>
        ) : (
          stations.map(station => {
            const isCurrent = activeStation?.id === station.id;
            const isFav = !!favorites[station.id];

            return (
              <div
                key={station.id}
                onClick={() => onSelectStation(station)}
                className={`p-3 rounded-2xl border transition flex items-center justify-between cursor-pointer group ${
                  isCurrent
                    ? 'bg-lime-950/60 border-lime-400/60 shadow-lg shadow-lime-500/10'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className={`p-2 rounded-xl flex items-center justify-center ${
                      isCurrent
                        ? 'bg-lime-400 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'
                    }`}
                  >
                    <Radio className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-xs text-slate-100 truncate group-hover:text-lime-300 transition">
                        {station.name}
                      </h4>
                      {isCurrent && isPlaying && (
                        <span className="text-[9px] font-mono text-amber-400 font-bold bg-amber-950/80 px-1 py-0.2 rounded border border-amber-500/30">
                          ON AIR
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                      {station.place || place.title}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onToggleFavorite(station);
                    }}
                    className={`p-2 rounded-lg transition ${
                      isFav ? 'text-rose-500' : 'text-slate-500 hover:text-slate-300'
                    }`}
                    title={isFav ? 'Remove from favorites' : 'Save to favorites'}
                  >
                    <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-500' : ''}`} />
                  </button>

                  {station.website && (
                    <a
                      href={station.website}
                      target="_blank"
                      rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="p-2 text-slate-500 hover:text-slate-300 transition"
                      title="Visit station website"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
