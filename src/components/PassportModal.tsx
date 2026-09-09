import React, { useMemo } from 'react';
import { BookOpen, X, MapPin, Radio, Calendar, Award, Compass, Play, Globe2 } from 'lucide-react';
import type { PassportEntry } from '../types';
import { soundEffects } from '../services/audioEffects';

interface PassportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: PassportEntry[];
  onFastTravel?: (entry: PassportEntry) => void;
}

export const PassportModal: React.FC<PassportModalProps> = ({
  isOpen,
  onClose,
  entries,
  onFastTravel
}) => {
  const uniqueCountries = useMemo(() => {
    return new Set(entries.map(e => e.countryCode || e.country)).size;
  }, [entries]);

  const explorerRank = useMemo(() => {
    const count = entries.length;
    if (count >= 15) return { title: 'Grand Ambassador of Sound', badge: '👑', color: 'text-amber-400 border-amber-500/40 bg-amber-950/80' };
    if (count >= 8) return { title: 'High-Frequency Nomad', badge: '🧭', color: 'text-purple-400 border-purple-500/40 bg-purple-950/80' };
    if (count >= 4) return { title: 'Globe Trotter', badge: '✈️', color: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/80' };
    return { title: 'Novice Traveler', badge: '📻', color: 'text-lime-400 border-lime-500/40 bg-lime-950/80' };
  }, [entries.length]);

  if (!isOpen) return null;

  const handleTravel = (entry: PassportEntry) => {
    soundEffects.playStaticBurst(0.2, 0.15);
    if (onFastTravel) {
      onFastTravel(entry);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-cyan-500/30 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[85vh] text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-950/60 border border-cyan-500/40 rounded-2xl text-cyan-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-100 tracking-wide uppercase font-sans">
                  World Listener Passport
                </h2>
                <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border font-bold flex items-center gap-1 ${explorerRank.color}`}>
                  <span>{explorerRank.badge}</span> {explorerRank.title}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Official travel chronicle • Click any stamped visa to fast-travel & tune in live!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/80 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Travel Statistics Bar */}
        <div className="grid grid-cols-3 gap-2 py-2 text-center text-xs font-mono">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-2.5">
            <div className="text-slate-400 text-[10px] flex items-center justify-center gap-1">
              <Radio className="w-3 h-3 text-cyan-400" /> Stations Logged
            </div>
            <div className="text-base font-black text-cyan-400 mt-0.5">{entries.length}</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-2.5">
            <div className="text-slate-400 text-[10px] flex items-center justify-center gap-1">
              <Globe2 className="w-3 h-3 text-lime-400" /> Nations Visited
            </div>
            <div className="text-base font-black text-lime-400 mt-0.5">{uniqueCountries}</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-2.5">
            <div className="text-slate-400 text-[10px] flex items-center justify-center gap-1">
              <Compass className="w-3 h-3 text-amber-400" /> Explorer Level
            </div>
            <div className="text-xs font-black text-amber-300 mt-1 truncate">
              {entries.length >= 10 ? 'Master' : entries.length >= 5 ? 'Adept' : 'Initiate'}
            </div>
          </div>
        </div>

        {/* Stamps Grid */}
        <div className="flex-1 overflow-y-auto py-2 grid grid-cols-1 sm:grid-cols-2 gap-3 pr-1">
          {entries.length === 0 ? (
            <div className="col-span-2 py-16 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
              <Award className="w-10 h-10 text-slate-600 mb-1" />
              <div>Your passport has no visa stamps yet.</div>
              <div className="text-xs text-slate-500">
                Tune into radio stations or walk streets around the globe to collect verified stamps!
              </div>
            </div>
          ) : (
            entries.map((entry, idx) => (
              <div
                key={`${entry.stationUuid}-${idx}`}
                onClick={() => handleTravel(entry)}
                className="relative bg-slate-900/70 border border-cyan-500/20 rounded-2xl p-4 flex flex-col justify-between hover:border-cyan-400 transition group overflow-hidden cursor-pointer shadow-sm hover:shadow-lg hover:shadow-cyan-500/10"
              >
                {/* Stamp visual water-mark */}
                <div className="absolute right-2 -bottom-2 opacity-10 group-hover:opacity-25 transition text-5xl font-black select-none pointer-events-none uppercase text-cyan-400">
                  {entry.countryCode || 'WORLD'}
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-mono text-cyan-400 mb-1">
                    <span className="flex items-center gap-1 font-bold">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                      {entry.city || entry.country}
                    </span>
                    <span className="text-[10px] bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30">
                      {entry.countryCode}
                    </span>
                  </div>

                  <div className="font-bold text-slate-100 text-sm line-clamp-1 mb-1 group-hover:text-cyan-300 transition">
                    {entry.stationName}
                  </div>

                  <div className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Radio className="w-3 h-3 text-lime-400 shrink-0" />
                    <span className="truncate">{entry.genre || 'Live Radio'}</span>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {new Date(entry.visitedAt).toLocaleDateString()}
                  </span>
                  <span className="text-cyan-400 group-hover:text-lime-400 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 transition">
                    <Play className="w-3 h-3 fill-current" /> Fast Travel
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
