import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Radio, X, CornerDownLeft, Sparkles } from 'lucide-react';
import type { RadioStation, Place } from '../types';
import { searchStations, fetchPlaces } from '../services/radioApi';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStation: (station: RadioStation) => void;
  onSelectPlace: (place: Place) => void;
  favorites: Record<string, RadioStation>;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectStation,
  onSelectPlace,
  favorites
}) => {
  const [query, setQuery] = useState('');
  const [matchedPlaces, setMatchedPlaces] = useState<Place[]>([]);
  const [matchedStations, setMatchedStations] = useState<RadioStation[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus and initialize on open
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Search logic
  useEffect(() => {
    if (!isOpen) return;
    const q = query.trim().toLowerCase();

    let active = true;

    if (!q) {
      // Show top suggestions & favorites
      fetchPlaces().then(places => {
        if (!active) return;
        const top = places.filter(p => p.size > 20).slice(0, 6);
        setMatchedPlaces(top);
        setMatchedStations(Object.values(favorites).slice(0, 4));
      });
      return () => {
        active = false;
      };
    }

    // Match places from cache with OpenRadio priority scoring
    fetchPlaces().then(places => {
      const scored: { place: Place; score: number }[] = [];
      for (const p of places) {
        const title = (p.title || '').toLowerCase();
        const country = (p.country || '').toLowerCase();
        let score = -1;
        if (title === q) score = 0;
        else if (title.startsWith(q)) score = 1;
        else if (country.startsWith(q)) score = 2;
        else if (title.includes(q)) score = 3;
        else if (country.includes(q)) score = 4;

        if (score >= 0) {
          scored.push({ place: p, score });
        }
      }

      scored.sort((a, b) => a.score - b.score || (b.place.size || 0) - (a.place.size || 0));
      setMatchedPlaces(scored.slice(0, 6).map(s => s.place));
    });

    // Match stations
    const timer = setTimeout(async () => {
      const stations = await searchStations(q);
      setMatchedStations(stations.slice(0, 6));
    }, 150);

    return () => clearTimeout(timer);
  }, [query, isOpen, favorites]);

  // Keyboard navigation
  const allItemsCount = matchedPlaces.length + matchedStations.length;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % (allItemsCount || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + allItemsCount) % (allItemsCount || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex < matchedPlaces.length) {
        const place = matchedPlaces[selectedIndex];
        if (place) {
          onSelectPlace(place);
          onClose();
        }
      } else {
        const stationIdx = selectedIndex - matchedPlaces.length;
        const station = matchedStations[stationIdx];
        if (station) {
          onSelectStation(station);
          onClose();
        }
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-start justify-center pt-24 px-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-slate-900 border border-lime-400/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800 gap-3">
          <Search className="w-5 h-5 text-lime-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search 12,000+ cities, countries, or stations..."
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 text-sm focus:outline-none font-medium"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-500 hover:text-slate-300 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
          {/* Places Section */}
          {matchedPlaces.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-lime-400/80 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Cities & Broadcast Hubs
              </div>
              {matchedPlaces.map((place, idx) => {
                const isActive = selectedIndex === idx;
                return (
                  <div
                    key={place.id}
                    onClick={() => {
                      onSelectPlace(place);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`px-3 py-2.5 rounded-xl flex items-center justify-between cursor-pointer transition ${
                      isActive
                        ? 'bg-lime-400 text-slate-950 font-semibold'
                        : 'text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <MapPin className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-slate-950' : 'text-lime-400'}`} />
                      <div className="truncate">
                        <span className="font-bold text-sm">{place.title}</span>
                        <span className={`text-xs ml-1.5 ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>
                          {place.country}
                        </span>
                      </div>
                    </div>
                    <div className={`text-xs font-mono flex items-center gap-1 ${isActive ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>
                      {place.size} stations
                      {isActive && <CornerDownLeft className="w-3.5 h-3.5 ml-1" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Stations Section */}
          {matchedStations.length > 0 && (
            <div className="mt-2">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-400/80 flex items-center gap-1">
                <Radio className="w-3 h-3" /> Radio Stations
              </div>
              {matchedStations.map((station, idx) => {
                const itemIdx = matchedPlaces.length + idx;
                const isActive = selectedIndex === itemIdx;
                return (
                  <div
                    key={station.id}
                    onClick={() => {
                      onSelectStation(station);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(itemIdx)}
                    className={`px-3 py-2.5 rounded-xl flex items-center justify-between cursor-pointer transition ${
                      isActive
                        ? 'bg-amber-400 text-slate-950 font-semibold'
                        : 'text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Radio className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-slate-950' : 'text-amber-400'}`} />
                      <div className="truncate">
                        <span className="font-bold text-sm">{station.name}</span>
                        <span className={`text-xs ml-1.5 ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>
                          {station.place || station.country}
                        </span>
                      </div>
                    </div>
                    {isActive && <CornerDownLeft className="w-3.5 h-3.5 text-slate-950" />}
                  </div>
                );
              })}
            </div>
          )}

          {allItemsCount === 0 && (
            <div className="text-center py-12 text-slate-500 text-xs">
              No matching cities or stations found for "{query}".
            </div>
          )}
        </div>

        {/* Footer Shortcut Bar */}
        <div className="px-4 py-2 border-t border-slate-800 bg-slate-950/60 text-[11px] text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
          <span className="text-lime-400/90 flex items-center gap-1 font-mono text-[10px]">
            <Sparkles className="w-3 h-3" /> OpenRadio Atlas Command Engine
          </span>
        </div>
      </div>
    </div>
  );
};
