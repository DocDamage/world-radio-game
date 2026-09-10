import React from 'react';
import { Trophy, Coins, Zap, X, Play, Flag } from 'lucide-react';
import { soundEffects } from '../services/audioEffects';
import { useModalA11y } from '../hooks/useModalA11y';

export interface MissionExpeditionProgress {
  title: string;
  /** Number of completed legs (equals totalStages when finished) */
  stageIndex: number;
  totalStages: number;
  nextMissionId?: string;
  nextMissionTitle?: string;
  nextMissionPlayable: boolean;
  isComplete: boolean;
}

export interface MissionDebriefData {
  missionTitle: string;
  missionSubtitle: string;
  medal: 'bronze' | 'silver' | 'gold';
  score: number;
  thresholds: { bronze: number; silver: number; gold: number };
  coinsAwarded: number;
  xpAwarded: number;
  outcome: 'completed' | 'failed' | 'abandoned';
  stats: Record<string, number>;
  expedition: MissionExpeditionProgress | null;
}

interface MissionResultsProps {
  data: MissionDebriefData;
  onClose: () => void;
  onNextMission?: () => void;
}

const MEDAL_META: Record<'bronze' | 'silver' | 'gold', { icon: string; ring: string; text: string; label: string }> = {
  bronze: { icon: '🥉', ring: 'border-amber-700/60 bg-amber-900/30', text: 'text-amber-500', label: 'Bronze' },
  silver: { icon: '🥈', ring: 'border-slate-300/60 bg-slate-400/20', text: 'text-slate-200', label: 'Silver' },
  gold: { icon: '🥇', ring: 'border-yellow-400/70 bg-yellow-500/20', text: 'text-yellow-400', label: 'Gold' }
};

/**
 * Post-run mission debrief: medal earned, score vs thresholds, settled rewards,
 * and expedition progress with a continue hook for the next leg.
 */
export const MissionResults: React.FC<MissionResultsProps> = ({ data, onClose, onNextMission }) => {
  // Shared modal a11y: Escape to close, focus trap, focus restore. The debrief
  // only mounts while open, so the dialog is always "open" from its view.
  const { containerRef: dialogRef, dialogProps } = useModalA11y({ isOpen: true, onClose });

  const medal = MEDAL_META[data.medal];
  const t = data.thresholds;
  const pct = Math.min(100, Math.round((data.score / t.gold) * 100));
  const silverPct = Math.round((t.silver / t.gold) * 100);
  const bronzePct = Math.round((t.bronze / t.gold) * 100);
  const statEntries = Object.entries(data.stats);
  const exp = data.expedition;

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-lg flex items-center justify-center p-3 sm:p-5 select-none">
      <div ref={dialogRef} {...dialogProps} className="relative w-full max-w-lg bg-slate-950 border border-lime-400/50 rounded-3xl overflow-hidden shadow-2xl flex flex-col text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-900/90 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-lime-400/20 text-lime-400 border border-lime-400/30 rounded-xl">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-wide uppercase">Mission Debrief</h2>
              <p className="text-[11px] text-slate-400">{data.missionTitle} — {data.missionSubtitle}</p>
            </div>
          </div>
          <button
            onClick={() => { soundEffects.playUiClick(0.15); onClose(); }}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Medal */}
          <div className="flex items-center gap-4">
            <div className={`w-20 h-20 rounded-full border-2 flex items-center justify-center text-4xl ${medal.ring}`}>
              {medal.icon}
            </div>
            <div>
              <div className={`text-2xl font-black uppercase tracking-wide ${medal.text}`}>
                {medal.label} Medal
              </div>
              <div className="text-xs text-slate-400">
                {data.outcome === 'completed'
                  ? 'Objectives complete — rewards settled to your traveler profile'
                  : 'Run ended early'}
              </div>
              <div className="mt-1.5 flex items-center gap-3 text-xs font-mono">
                <span className="flex items-center gap-1 text-amber-400">
                  <Coins className="w-3.5 h-3.5" /> +{data.coinsAwarded}
                </span>
                <span className="flex items-center gap-1 text-sky-400">
                  <Zap className="w-3.5 h-3.5" /> +{data.xpAwarded} XP
                </span>
              </div>
            </div>
          </div>
          {/* Score vs thresholds */}
          <div>
            <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1.5">
              <span>Score <strong className="text-slate-100">{data.score}</strong></span>
              <span>Bronze {t.bronze} • Silver {t.silver} • Gold {t.gold}</span>
            </div>
            <div className="relative h-3 bg-slate-900 border border-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  data.medal === 'gold' ? 'bg-gradient-to-r from-amber-400 to-yellow-300'
                    : data.medal === 'silver' ? 'bg-gradient-to-r from-slate-400 to-slate-200'
                    : 'bg-gradient-to-r from-amber-800 to-amber-600'
                }`}
                style={{ width: `${pct}%` }}
              />
              <div className="absolute inset-y-0 left-0 flex w-full pointer-events-none">
                <div className="h-full border-r border-amber-700/70" style={{ width: `${bronzePct}%` }} />
                <div className="h-full border-r border-slate-400/70" style={{ width: `${silverPct - bronzePct}%` }} />
              </div>
            </div>
          </div>

          {/* Run stats */}
          {statEntries.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              {statEntries.map(([key, value]) => (
                <div key={key} className="bg-slate-900/70 border border-slate-800 rounded-xl px-2 py-2">
                  <div className="text-[9px] uppercase font-bold text-slate-500 tracking-wide">{key}</div>
                  <div className="text-sm font-black font-mono text-slate-200">{value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Expedition progress */}
          {exp && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase font-bold text-lime-400 flex items-center gap-1.5">
                  <Flag className="w-3.5 h-3.5" /> {exp.title}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Leg {Math.min(exp.stageIndex + 1, exp.totalStages)} / {exp.totalStages}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mb-2">
                {Array.from({ length: exp.totalStages }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full ${
                      exp.isComplete || i < exp.stageIndex
                        ? 'bg-lime-400'
                        : i === exp.stageIndex
                          ? 'bg-lime-400/40 animate-pulse'
                          : 'bg-slate-800'
                    }`}
                  />
                ))}
              </div>
              {exp.isComplete ? (
                <div className="text-xs text-emerald-300 font-bold">
                  🎉 Expedition complete! Grand finale bonus settled to your profile.
                </div>
              ) : exp.nextMissionTitle ? (
                <div className="text-[11px] text-slate-300">
                  Next leg: <strong>{exp.nextMissionTitle}</strong>
                  {!exp.nextMissionPlayable && (
                    <span className="text-amber-400"> (coming soon — not yet playable)</span>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-5 py-3.5 bg-slate-900/90 border-t border-slate-800 flex justify-end gap-2.5">
          <button
            onClick={() => { soundEffects.playUiClick(0.15); onClose(); }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition"
          >
            Close
          </button>
          {exp && !exp.isComplete && exp.nextMissionId && exp.nextMissionPlayable && (
            <button
              onClick={() => { soundEffects.playUiClick(0.2); onNextMission?.(); }}
              className="px-5 py-2 bg-lime-400 hover:bg-lime-300 text-slate-950 font-black text-xs uppercase tracking-wide rounded-xl shadow-lg shadow-lime-400/20 flex items-center gap-1.5 transition active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-slate-950" /> Next Leg
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
