import React from 'react';
import { Gamepad2 } from 'lucide-react';

interface GamepadHUDProps {
  controllerName: string;
  isStreetMode: boolean;
  isRecording: boolean;
}

export const GamepadHUD: React.FC<GamepadHUDProps> = ({
  controllerName,
  isStreetMode,
  isRecording
}) => {
  return (
    <div className="fixed top-20 right-6 z-30 pointer-events-none hidden lg:flex flex-col items-end gap-1.5 animate-in fade-in slide-in-from-right duration-300">
      <div className="bg-slate-900/90 backdrop-blur-md border border-lime-400/40 px-3 py-1.5 rounded-2xl flex items-center gap-2 shadow-xl shadow-black/60">
        <Gamepad2 className="w-4 h-4 text-lime-400 animate-pulse" />
        <span className="text-xs font-bold text-slate-100 font-mono">
          {controllerName ? 'Controller Active' : 'GTA Pad Enabled'}
        </span>
      </div>

      {/* GTA-style Controller Button Map */}
      <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-2xl p-2.5 text-[10px] text-slate-300 flex flex-col gap-1 shadow-lg font-mono">
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-400">L-Stick</span>
          <span className="text-lime-300 font-bold">{isStreetMode ? 'Walk / Strafe' : 'Orbit Spin'}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-400">R-Stick</span>
          <span className="text-lime-300 font-bold">Free Camera Look</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-400">RT / (A)</span>
          <span className="text-emerald-400 font-bold">Sprint / Run</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-400">LB / RB</span>
          <span className="text-amber-400 font-bold">GTA Radio Wheel</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-400">(Y)</span>
          <span className="text-cyan-400 font-bold">{isStreetMode ? 'Exit to Orbit' : 'Enter Streets'}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-400">(X)</span>
          <span className={`font-bold ${isRecording ? 'text-rose-400 animate-pulse' : 'text-slate-200'}`}>
            {isRecording ? 'Stop Recording' : 'Record Audio'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-400">D-Pad</span>
          <span className="text-slate-300">Station / Volume</span>
        </div>
      </div>
    </div>
  );
};
