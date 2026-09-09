import React from 'react';
import { HelpCircle, MapPin, CheckCircle2, Sparkles } from 'lucide-react';
import type { DetectiveState } from '../types';

interface DetectiveHUDProps {
  detectiveState: DetectiveState;
  onGuessCoords: (coords: { lat: number; lng: number }) => void;
  onNewMystery: () => void;
  mysteryClue: string;
}

export const DetectiveHUD: React.FC<DetectiveHUDProps> = ({
  detectiveState,
  onGuessCoords,
  onNewMystery,
  mysteryClue
}) => {
  const { targetStation, revealed, distanceKm, score } = detectiveState;

  return (
    <div className="absolute top-20 left-6 z-30 w-88 bg-slate-900/90 backdrop-blur-md border border-purple-500/40 rounded-2xl p-4 shadow-2xl text-slate-100 flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-purple-500/20 pb-2">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-purple-400" />
          <span className="font-bold text-sm tracking-wide text-purple-300 uppercase">Radio Detective</span>
        </div>
        <span className="text-xs font-mono text-purple-400/90 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30">
          Score: {score}
        </span>
      </div>

      <div className="text-xs text-slate-300 leading-relaxed bg-slate-950/50 p-3 rounded-xl border border-slate-800">
        <div className="text-[10px] uppercase font-bold text-purple-400 mb-1 flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> Audio & Street Clue
        </div>
        "{mysteryClue || 'Listen to the broadcast dialect, watch the street architecture, and determine where you are.'}"
      </div>

      {!revealed ? (
        <div className="flex flex-col gap-2">
          <div className="text-xs text-slate-400">
            Click anywhere on the world globe or street map to place your guess pin.
          </div>
          <button
            onClick={() => {
              // Quick guess button or trigger confirmation
              if (targetStation) {
                // If user clicks ready to guess, reveal
                onGuessCoords({ lat: targetStation.geo_lat + (Math.random() - 0.5) * 5, lng: targetStation.geo_long + (Math.random() - 0.5) * 5 });
              }
            }}
            className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2"
          >
            <MapPin className="w-4 h-4" /> Lock In My Guess
          </button>
        </div>
      ) : (
        <div className="p-3 bg-purple-950/60 border border-purple-500/50 rounded-xl flex flex-col gap-2">
          <div className="flex items-center gap-2 text-purple-300 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            Mystery Revealed!
          </div>
          <div className="text-xs text-slate-200">
            You were tuned into <strong className="text-cyan-300">{targetStation?.name}</strong> in{' '}
            <strong className="text-yellow-300">{targetStation?.place || targetStation?.country}, {targetStation?.country}</strong>.
          </div>
          {distanceKm !== null && (
            <div className="text-xs font-mono text-purple-300">
              Offset: {Math.round(distanceKm)} km from exact transmitter
            </div>
          )}
          <button
            onClick={onNewMystery}
            className="mt-2 w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
          >
            Next Mystery Location →
          </button>
        </div>
      )}
    </div>
  );
};
