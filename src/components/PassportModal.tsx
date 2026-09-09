import React from 'react';
import { BookOpen, X, MapPin, Radio, Calendar, Award } from 'lucide-react';
import type { PassportEntry } from '../types';

interface PassportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: PassportEntry[];
}

export const PassportModal: React.FC<PassportModalProps> = ({
  isOpen,
  onClose,
  entries
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-cyan-500/30 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-950/60 border border-cyan-500/40 rounded-2xl text-cyan-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-100 tracking-wide uppercase">
                World Listener Passport
              </h2>
              <p className="text-xs text-slate-400">
                {entries.length} Stations & Neighborhoods Stamped
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/80 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stamps Grid */}
        <div className="flex-1 overflow-y-auto py-4 grid grid-cols-1 sm:grid-cols-2 gap-3 pr-1">
          {entries.length === 0 ? (
            <div className="col-span-2 py-12 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
              <Award className="w-10 h-10 text-slate-600 mb-1" />
              <div>Your passport has no stamps yet.</div>
              <div className="text-xs text-slate-500">
                Tune into radio stations or explore streets to collect your stamps!
              </div>
            </div>
          ) : (
            entries.map((entry, idx) => (
              <div
                key={`${entry.stationUuid}-${idx}`}
                className="relative bg-slate-900/60 border border-cyan-500/20 rounded-2xl p-4 flex flex-col justify-between hover:border-cyan-400/50 transition group overflow-hidden"
              >
                {/* Stamp visual water-mark */}
                <div className="absolute right-2 -bottom-2 opacity-10 group-hover:opacity-20 transition text-5xl font-black select-none pointer-events-none uppercase text-cyan-400">
                  {entry.countryCode || 'WORLD'}
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-mono text-cyan-400 mb-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {entry.city || entry.country}
                    </span>
                    <span className="text-[10px] bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30">
                      {entry.countryCode}
                    </span>
                  </div>

                  <div className="font-bold text-slate-100 text-sm line-clamp-1 mb-1">
                    {entry.stationName}
                  </div>

                  <div className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Radio className="w-3 h-3 text-lime-400" />
                    <span>{entry.genre || 'Live Radio'}</span>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {new Date(entry.visitedAt).toLocaleDateString()}
                  </span>
                  <span className="text-lime-400 font-semibold text-[10px] uppercase tracking-wider">
                    VERIFIED
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
