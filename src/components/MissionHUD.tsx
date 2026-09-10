import React from 'react';
import { Compass, Target } from 'lucide-react';
import type { MissionScenario } from '../missions/types';

interface MissionHUDProps {
  scenario: MissionScenario | null | undefined;
  /** Primary progress readout, e.g. "1,420 / 2,200 m" */
  progressLabel: string;
  /** Optional secondary objectives, e.g. "Crates 1/2 • Hull 84%" */
  secondaryLabel?: string;
}

/**
 * Compact in-game mission banner shown while a World Expedition Command
 * mission is active. Renders nothing when no scenario is provided, so games
 * can mount it unconditionally.
 */
export const MissionHUD: React.FC<MissionHUDProps> = ({ scenario, progressLabel, secondaryLabel }) => {
  if (!scenario) return null;

  return (
    <div className="px-4 py-2 bg-gradient-to-r from-lime-950/70 via-slate-900/90 to-sky-950/70 border-b border-lime-500/30 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] select-none">
      <div className="flex items-center gap-1.5 text-lime-300 font-black uppercase tracking-wide whitespace-nowrap">
        <Compass className="w-3.5 h-3.5 shrink-0" /> {scenario.title}
      </div>
      <div className="text-slate-400 font-mono border-l border-slate-700 pl-4 truncate max-w-[180px]" title={scenario.choiceLabel}>
        {scenario.choiceLabel}
      </div>
      <div className="flex items-center gap-1.5 text-slate-300 flex-1 min-w-[160px]">
        <Target className="w-3.5 h-3.5 text-sky-400 shrink-0" />
        <span className="truncate">{scenario.objectiveLabel}</span>
      </div>
      <div className="font-mono font-bold text-lime-300 whitespace-nowrap">{progressLabel}</div>
      {secondaryLabel && (
        <div className="font-mono text-slate-400 border-l border-slate-700 pl-4 whitespace-nowrap">
          {secondaryLabel}
        </div>
      )}
    </div>
  );
};
