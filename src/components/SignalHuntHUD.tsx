import React, { useEffect } from 'react';
import { Radio, Trophy, Flame } from 'lucide-react';
import type { SignalHuntState } from '../types';
import { soundEffects } from '../services/audioEffects';
import confetti from 'canvas-confetti';

interface SignalHuntHUDProps {
  huntState: SignalHuntState;
  onStepCloser: (direction: 'north' | 'south' | 'east' | 'west') => void;
  onClaimVictory: () => void;
}

export const SignalHuntHUD: React.FC<SignalHuntHUDProps> = ({
  huntState,
  onStepCloser,
  onClaimVictory
}) => {
  const { distanceMeters, signalStrength, found } = huntState;

  useEffect(() => {
    // Sonar beep interval depending on signal strength
    const intervalTime = Math.max(250, 2000 - signalStrength * 18);
    const timer = setInterval(() => {
      if (!found) {
        soundEffects.playRadarPing(600 + signalStrength * 6, 0.12);
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [signalStrength, found]);

  useEffect(() => {
    if (found) {
      soundEffects.playTriumphChime();
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [found]);

  return (
    <div className="absolute top-20 right-6 z-30 w-80 bg-slate-900/90 backdrop-blur-md border border-amber-500/40 rounded-2xl p-4 shadow-2xl text-slate-100 flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
          <span className="font-bold text-sm tracking-wide text-amber-300 uppercase">Transmitter Hunt</span>
        </div>
        <span className="text-xs font-mono text-amber-400/80 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
          {Math.round(distanceMeters)}m away
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-xs text-slate-400">
          <span>RF Signal Strength</span>
          <span className="font-mono text-amber-400">{Math.round(signalStrength)}%</span>
        </div>
        {/* Retro VU Meter Bar */}
        <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800 flex">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              signalStrength > 80
                ? 'bg-gradient-to-r from-yellow-500 to-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)]'
                : signalStrength > 45
                ? 'bg-gradient-to-r from-emerald-500 to-yellow-400'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(100, Math.max(5, signalStrength))}%` }}
          />
        </div>
      </div>

      {found ? (
        <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-center flex flex-col items-center gap-2">
          <Trophy className="w-8 h-8 text-yellow-400 animate-bounce" />
          <div className="font-bold text-emerald-300 text-sm">Transmitter Tower Found!</div>
          <div className="text-xs text-slate-300">Signal tuned with 100% clarity. Added to your trophy collection!</div>
          <button
            onClick={onClaimVictory}
            className="mt-1 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition shadow"
          >
            Claim Passport Stamp
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="text-xs text-slate-400 text-center">
            {distanceMeters < 50
              ? '🔥 Scorching hot! The transmitter is right around this building!'
              : distanceMeters < 250
              ? '⚡ Getting warmer! Look around the streets and rooftops.'
              : '❄️ Faint static... walk towards stronger reception.'}
          </div>

          {/* D-Pad for directional hunting steps */}
          <div className="grid grid-cols-3 gap-1 w-36 mx-auto mt-1">
            <div />
            <button
              onClick={() => onStepCloser('north')}
              className="p-2 bg-slate-800 hover:bg-amber-500/30 text-amber-300 rounded font-bold text-xs border border-amber-500/20 active:scale-90"
            >
              N
            </button>
            <div />
            <button
              onClick={() => onStepCloser('west')}
              className="p-2 bg-slate-800 hover:bg-amber-500/30 text-amber-300 rounded font-bold text-xs border border-amber-500/20 active:scale-90"
            >
              W
            </button>
            <div className="flex items-center justify-center">
              <Radio className="w-4 h-4 text-amber-400" />
            </div>
            <button
              onClick={() => onStepCloser('east')}
              className="p-2 bg-slate-800 hover:bg-amber-500/30 text-amber-300 rounded font-bold text-xs border border-amber-500/20 active:scale-90"
            >
              E
            </button>
            <div />
            <button
              onClick={() => onStepCloser('south')}
              className="p-2 bg-slate-800 hover:bg-amber-500/30 text-amber-300 rounded font-bold text-xs border border-amber-500/20 active:scale-90"
            >
              S
            </button>
            <div />
          </div>
        </div>
      )}
    </div>
  );
};
