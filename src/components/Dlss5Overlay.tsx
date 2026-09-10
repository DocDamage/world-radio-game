import React, { useState, useEffect } from 'react';
import { Zap, Activity } from 'lucide-react';
import { dlss5 } from '../services/dlss5Engine';
import type { GpuArchitectureInfo } from '../services/dlss5Engine';

interface Dlss5OverlayProps {
  gpuInfo: GpuArchitectureInfo;
  onOpenModal: () => void;
  configVersion: number;
}

export const Dlss5Overlay: React.FC<Dlss5OverlayProps> = ({
  gpuInfo,
  onOpenModal,
  configVersion: _configVersion
}) => {
  const [fps, setFps] = useState<number>(60);
  const config = dlss5.getConfig();

  // Real FPS & Frame Time calculation loop
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animId: number;

    const calcFps = (now: number) => {
      frameCount++;
      if (now - lastTime >= 1000) {
        const rawFps = Math.round((frameCount * 1000) / (now - lastTime));
        setFps(rawFps);
        frameCount = 0;
        lastTime = now;
      }
      animId = requestAnimationFrame(calcFps);
    };

    animId = requestAnimationFrame(calcFps);
    return () => cancelAnimationFrame(animId);
  }, []);

  if (!config.enabled) {
    return (
      <button
        onClick={onOpenModal}
        className="fixed bottom-24 right-6 z-30 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 border border-slate-700/80 rounded-2xl px-3 py-1.5 text-xs font-mono font-bold transition flex items-center gap-1.5 shadow-lg backdrop-blur-md"
        title="Open Graphics & Performance Settings"
      >
        <Zap className="w-3.5 h-3.5 text-slate-500" /> GPU: NATIVE
      </button>
    );
  }

  const renderW = Math.round(window.innerWidth * config.renderScale);
  const renderH = Math.round(window.innerHeight * config.renderScale);
  const frameTimeMs = (1000 / Math.max(1, fps)).toFixed(1);

  return (
    <div
      onClick={onOpenModal}
      className="fixed bottom-24 right-6 z-30 bg-slate-950/85 hover:bg-slate-900/95 cursor-pointer backdrop-blur-md border border-emerald-500/40 hover:border-emerald-400 rounded-2xl p-2.5 px-3.5 text-[11px] font-mono text-slate-200 transition shadow-2xl flex flex-col gap-1 select-none group"
      title="Click to configure Graphics & Rendering Performance"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
          <Zap className="w-3.5 h-3.5 fill-emerald-400 animate-pulse" />
          <span>GRAPHICS {config.mode.toUpperCase()}</span>
        </div>
        <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.2 rounded font-bold">
          {gpuInfo.architectureSm ? gpuInfo.architectureSm.toUpperCase() : 'UNIVERSAL'}
        </span>
      </div>

      <div className="flex items-center justify-between gap-4 text-slate-400 text-[10px]">
        <span className="flex items-center gap-1 text-slate-100 font-bold">
          <Activity className="w-3 h-3 text-emerald-400" />
          {fps} FPS • {frameTimeMs}ms
        </span>
        <span>
          {renderW}x{renderH} ({Math.round(config.renderScale * 100)}%)
        </span>
      </div>
    </div>
  );
};
