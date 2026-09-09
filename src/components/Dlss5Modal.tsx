import React, { useState } from 'react';
import { Cpu, X, Zap, Sliders, CheckCircle2, ExternalLink, ShieldCheck, Activity } from 'lucide-react';
import { dlss5 } from '../services/dlss5Engine';
import type { GpuArchitectureInfo, DlssMode } from '../services/dlss5Engine';

interface Dlss5ModalProps {
  isOpen: boolean;
  onClose: () => void;
  gpuInfo: GpuArchitectureInfo;
  onConfigChange: () => void;
}

export const Dlss5Modal: React.FC<Dlss5ModalProps> = ({
  isOpen,
  onClose,
  gpuInfo,
  onConfigChange
}) => {
  const [mode, setMode] = useState<DlssMode>(dlss5.getConfig().mode);
  const [frameGen, setFrameGen] = useState<boolean>(dlss5.getConfig().frameGen);
  const [multiplier, setMultiplier] = useState<number>(dlss5.getConfig().frameGenMultiplier);
  const [sharpness, setSharpness] = useState<number>(dlss5.getConfig().sharpness);
  const [hdrUplift, setHdrUplift] = useState<boolean>(dlss5.getConfig().hdrUplift);

  if (!isOpen) return null;

  const handleModeChange = (newMode: DlssMode) => {
    setMode(newMode);
    dlss5.setMode(newMode);
    onConfigChange();
  };

  const handleFrameGenToggle = (enabled: boolean) => {
    setFrameGen(enabled);
    dlss5.setFrameGen(enabled, multiplier);
    onConfigChange();
  };

  const handleMultiplierChange = (m: number) => {
    setMultiplier(m);
    dlss5.setFrameGen(frameGen, m);
    onConfigChange();
  };

  const handleSharpnessChange = (s: number) => {
    setSharpness(s);
    dlss5.setSharpness(s);
    onConfigChange();
  };

  const handleHdrToggle = (h: boolean) => {
    setHdrUplift(h);
    dlss5.setHdrUplift(h);
    onConfigChange();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-xl bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-400/50 rounded-3xl p-6 shadow-2xl flex flex-col gap-5 text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-950/80 border border-emerald-400/50 rounded-2xl text-emerald-400 shadow-lg shadow-emerald-950/50">
              <Zap className="w-6 h-6 fill-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-100 tracking-wide font-sans">
                  NVIDIA DLSS 5 Neural Rendering
                </h2>
                <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-2 py-0.5 rounded-full">
                  RTX 30+ READY
                </span>
              </div>
              <p className="text-xs text-slate-400">
                AI Super Resolution, Neural Reconstruction & Multi Frame Gen
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* GPU Hardware Diagnostics Card */}
        <div className="bg-slate-950/80 border border-emerald-500/30 rounded-2xl p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 flex items-center gap-1.5 font-mono">
              <Cpu className="w-4 h-4 text-emerald-400" /> Detected GPU Hardware
            </span>
            <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/40">
              {gpuInfo.architectureSm ? `${gpuInfo.architectureSm.toUpperCase()} Kernel` : 'UNIVERSAL'}
            </span>
          </div>

          <div className="font-bold text-sm text-slate-200">
            {gpuInfo.renderer || 'NVIDIA GeForce RTX'}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-800 text-[11px] font-mono">
            <div>
              <span className="text-slate-500 block">Generation:</span>
              <span className="text-slate-300 font-bold">{gpuInfo.generation || 'RTX 30/40/50 Series'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">DLSS 5 Support:</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Hardware Ready
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Frame Generation:</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Multi-Frame Unlocked
              </span>
            </div>
          </div>
        </div>

        {/* DLSS Mode Selector */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-emerald-400" /> Super Resolution Quality Mode
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'dlaa', label: 'DLAA', desc: '100% Native + Neural AA' },
              { id: 'quality', label: 'Quality', desc: '67% Render (1.5x Upscale)' },
              { id: 'balanced', label: 'Balanced', desc: '58% Render (1.7x Upscale)' },
              { id: 'performance', label: 'Performance', desc: '50% Render (2.0x Upscale)' },
              { id: 'ultra_performance', label: 'Ultra Perf', desc: '33% Render (3.0x Upscale)' },
              { id: 'off', label: 'Off', desc: 'Bilinear Native' }
            ].map(m => (
              <button
                key={m.id}
                onClick={() => handleModeChange(m.id as DlssMode)}
                className={`p-2.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                  mode === m.id
                    ? 'bg-emerald-950/80 border-emerald-400 text-white shadow-lg shadow-emerald-500/10'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span className="font-bold text-xs">{m.label}</span>
                <span className="text-[10px] text-slate-400 leading-tight mt-1">{m.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Multi Frame Generation (RTX 30 & 40 & 50) */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-400" /> Multi Frame Generation Patch
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Generates AI interpolated frames to double or triple viewport smoothness
              </p>
            </div>
            <button
              onClick={() => handleFrameGenToggle(!frameGen)}
              className={`w-12 h-6 rounded-full transition p-1 flex items-center ${
                frameGen ? 'bg-emerald-500 justify-end' : 'bg-slate-800 justify-start'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-md" />
            </button>
          </div>

          {frameGen && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <span className="text-xs text-slate-400">Multiplier:</span>
              {[2, 3, 4, 6].map(m => (
                <button
                  key={m}
                  onClick={() => handleMultiplierChange(m)}
                  className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition border ${
                    multiplier === m
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {m}x
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sliders: Sharpness & RenoDX HDR Uplift */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Neural Reconstruction Sharpness</span>
              <span className="font-mono text-emerald-400">{Math.round(sharpness * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={sharpness}
              onChange={e => handleSharpnessChange(parseFloat(e.target.value))}
              className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>

          <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
            <div>
              <span className="text-xs font-bold text-slate-200">RenoDX ToneMap & HDR Uplift</span>
              <span className="block text-[11px] text-slate-400">Expanded dynamic contrast for city night lights</span>
            </div>
            <button
              onClick={() => handleHdrToggle(!hdrUplift)}
              className={`w-12 h-6 rounded-full transition p-1 flex items-center ${
                hdrUplift ? 'bg-emerald-500 justify-end' : 'bg-slate-800 justify-start'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-md" />
            </button>
          </div>
        </div>

        {/* Footer & DocDamage dlss5-launcher Link */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Neural Uplift Active</span>
          </div>
          <a
            href="https://github.com/DocDamage/dlss5-launcher"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-slate-400 hover:text-emerald-300 transition"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Powered by dlss5-launcher
          </a>
        </div>
      </div>
    </div>
  );
};
