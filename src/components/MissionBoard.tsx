import React, { useState } from 'react';
import { Compass, Award, Play, X, CheckCircle2, Zap } from 'lucide-react';
import { MISSION_CATALOG, EXPEDITIONS } from '../missions/catalog';
import type { MissionDefinition, ExpeditionDefinition, GameId } from '../missions/types';
import { missionSession } from '../missions/session';
import { travelerState } from '../services/travelerState';
import { soundEffects } from '../services/audioEffects';

interface MissionBoardProps {
  isOpen: boolean;
  onClose: () => void;
  currentCity: string;
  currentCountry: string;
  onLaunchGame: (gameId: GameId, missionId?: string) => void;
}

export const MissionBoard: React.FC<MissionBoardProps> = ({
  isOpen,
  onClose,
  currentCity,
  currentCountry,
  onLaunchGame
}) => {
  const [activeTab, setActiveTab] = useState<'missions' | 'expeditions'>('missions');
  const [selectedMission, setSelectedMission] = useState<MissionDefinition>(MISSION_CATALOG[0]);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string>(MISSION_CATALOG[0].choices[0]?.id || 'default');
  const [selectedExpedition, setSelectedExpedition] = useState<ExpeditionDefinition>(EXPEDITIONS[0]);

  if (!isOpen) return null;

  const completedMissions = travelerState.getState().completedMissions;
  const completedExpeditions = travelerState.getState().completedExpeditions;

  const handleStartMission = (mission: MissionDefinition, choiceId: string) => {
    missionSession.startMission(mission.id, choiceId);
    soundEffects.playUiClick(0.2);
    onLaunchGame(mission.gameId, mission.id);
    onClose();
  };

  const handleStartExpedition = (exp: ExpeditionDefinition) => {
    const res = missionSession.startExpedition(exp.id);
    if (res.success && res.firstMissionId) {
      const firstMission = MISSION_CATALOG.find(m => m.id === res.firstMissionId);
      if (firstMission) {
        missionSession.startMission(firstMission.id, firstMission.choices[0]?.id, exp.id, 0);
        soundEffects.playUiClick(0.2);
        onLaunchGame(firstMission.gameId, firstMission.id);
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none">
      <div className="relative w-full max-w-5xl bg-slate-950 border border-lime-400/40 rounded-3xl overflow-hidden shadow-2xl flex flex-col text-slate-100 max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900/90 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-lime-400/20 text-lime-400 border border-lime-400/30 rounded-2xl shadow-lg shadow-lime-500/10">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-wide text-slate-100 uppercase">
                  World Expedition Command
                </h2>
                <span className="text-[10px] font-mono bg-lime-950 text-lime-400 border border-lime-500/40 px-2 py-0.5 rounded-full font-bold">
                  {currentCity ? `${currentCity}, ${currentCountry}` : 'Global Network'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Turn world radio exploration and sensor context into playable objectives
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800">
              <button
                onClick={() => setActiveTab('missions')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeTab === 'missions'
                    ? 'bg-lime-400 text-slate-950 shadow-md shadow-lime-400/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Missions ({MISSION_CATALOG.length})
              </button>
              <button
                onClick={() => setActiveTab('expeditions')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeTab === 'expeditions'
                    ? 'bg-lime-400 text-slate-950 shadow-md shadow-lime-400/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Expeditions ({EXPEDITIONS.length})
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Left List */}
          <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-800 overflow-y-auto p-4 space-y-2 bg-slate-950/60">
            {activeTab === 'missions' ? (
              MISSION_CATALOG.map(mission => {
                const isSelected = selectedMission.id === mission.id;
                const record = completedMissions[mission.id];
                return (
                  <button
                    key={mission.id}
                    onClick={() => {
                      setSelectedMission(mission);
                      setSelectedChoiceId(mission.choices[0]?.id || 'default');
                      soundEffects.playUiClick(0.1);
                    }}
                    className={`w-full text-left p-3 rounded-2xl transition border flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-lime-400/15 border-lime-400/60 shadow-md'
                        : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          {mission.gameId}
                        </span>
                        <h4 className="text-xs font-bold text-slate-100 truncate">
                          {mission.title}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {mission.subtitle}
                      </p>
                    </div>

                    {record ? (
                      <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1">
                        <Award className="w-4 h-4" />
                        {record.medal.toUpperCase()}
                      </span>
                    ) : (
                      <span className="text-[11px] text-lime-400/80 font-mono font-bold">
                        +{mission.rewards.coins}¢
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              EXPEDITIONS.map(exp => {
                const isSelected = selectedExpedition.id === exp.id;
                const isDone = completedExpeditions.includes(exp.id);
                return (
                  <button
                    key={exp.id}
                    onClick={() => {
                      setSelectedExpedition(exp);
                      soundEffects.playUiClick(0.1);
                    }}
                    className={`w-full text-left p-3 rounded-2xl transition border flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-lime-400/15 border-lime-400/60 shadow-md'
                        : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{exp.finalReward.badgeIcon}</span>
                        <h4 className="text-xs font-bold text-slate-100 truncate">
                          {exp.title}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {exp.stageMissionIds.length} Linked Stages
                      </p>
                    </div>
                    {isDone ? (
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> DONE
                      </span>
                    ) : (
                      <span className="text-[11px] text-lime-400 font-mono font-bold">
                        +{exp.finalReward.coins}¢
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Right Detail Pane */}
          <div className="flex-1 p-6 overflow-y-auto space-y-5 bg-gradient-to-b from-slate-900/40 to-slate-950">
            {activeTab === 'missions' ? (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase text-lime-400 font-bold tracking-wider flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" /> Stage Activity • {selectedMission.gameId.toUpperCase()} • ~{selectedMission.durationMin} MIN
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                      Ref {selectedMission.expansionRef}
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-slate-100">
                    {selectedMission.title}
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {selectedMission.description}
                  </p>
                  <p className="text-xs text-slate-400 italic">
                    {selectedMission.contextLabel}
                  </p>
                </div>

                {/* Meaningful Tactical Choice */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    1. Choose Operational Approach
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedMission.choices.map(choice => {
                      const isChosen = selectedChoiceId === choice.id;
                      return (
                        <div
                          key={choice.id}
                          onClick={() => setSelectedChoiceId(choice.id)}
                          className={`p-3.5 rounded-2xl cursor-pointer transition border flex flex-col justify-between gap-2 ${
                            isChosen
                              ? 'bg-lime-400/15 border-lime-400 shadow-md shadow-lime-400/10'
                              : 'bg-slate-900/80 hover:bg-slate-800/80 border-slate-800 text-slate-300'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-xs text-slate-100 flex items-center justify-between">
                              {choice.label}
                              {isChosen && <span className="w-2 h-2 rounded-full bg-lime-400" />}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1">
                              {choice.description}
                            </p>
                          </div>
                          <span className="text-[10px] font-mono text-lime-400/90 bg-slate-950/80 px-2 py-1 rounded-xl border border-slate-800">
                            {choice.modifier}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Medal Thresholds & Rewards */}
                <div className="grid grid-cols-3 gap-3 bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 text-center">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-amber-600 uppercase">Bronze Medal</span>
                    <div className="text-xs font-mono font-bold text-slate-200">
                      Score {selectedMission.medalThresholds.bronze}+
                    </div>
                    <span className="text-[10px] text-slate-400">Complete Run</span>
                  </div>

                  <div className="space-y-1 border-x border-slate-800">
                    <span className="text-[10px] font-bold text-slate-300 uppercase">Silver Medal</span>
                    <div className="text-xs font-mono font-bold text-slate-100">
                      Score {selectedMission.medalThresholds.silver}+
                    </div>
                    <span className="text-[10px] text-slate-400">Skill Goal</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-amber-400 uppercase">Gold Medal</span>
                    <div className="text-xs font-mono font-bold text-amber-300">
                      Score {selectedMission.medalThresholds.gold}+
                    </div>
                    <span className="text-[10px] text-slate-400">Full Mastery</span>
                  </div>
                </div>

                {/* Action Launcher */}
                <div className="pt-2 flex items-center justify-between">
                  <div className="text-xs text-slate-400">
                    Base Reward: <span className="text-lime-400 font-bold">+{selectedMission.rewards.coins} Traveler Coins</span> •{' '}
                    <span className="text-sky-400 font-bold">+{selectedMission.rewards.xp} XP</span>
                  </div>

                  <button
                    onClick={() => handleStartMission(selectedMission, selectedChoiceId)}
                    className="px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider bg-lime-400 hover:bg-lime-300 text-slate-950 shadow-lg shadow-lime-400/20 flex items-center gap-2 transition active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-slate-950" /> Start Mission
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-lime-400 font-mono font-bold">
                    <span>{selectedExpedition.finalReward.badgeIcon}</span>
                    <span>MULTI-STAGE CONNECTED EXPEDITION</span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-100">
                    {selectedExpedition.title}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedExpedition.subtitle}
                  </p>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {selectedExpedition.description}
                  </p>
                </div>

                {/* Stage Steps */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Expedition Sequence ({selectedExpedition.stageMissionIds.length} Legs)
                  </h4>
                  <div className="space-y-2">
                    {selectedExpedition.stageMissionIds.map((mId, idx) => {
                      const m = MISSION_CATALOG.find(x => x.id === mId);
                      if (!m) return null;
                      return (
                        <div
                          key={mId}
                          className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-slate-800 text-lime-400 flex items-center justify-center font-mono font-bold text-xs">
                              {idx + 1}
                            </span>
                            <div>
                              <div className="font-bold text-slate-200">{m.title}</div>
                              <div className="text-[11px] text-slate-400 capitalize">{m.gameId} mini-game • ~{m.durationMin}m</div>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">
                            +{m.rewards.coins}¢
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Finale Bonus */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-lime-950/40 via-emerald-950/30 to-slate-900 border border-lime-400/30 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-lime-400 uppercase font-bold">Grand Finale Bonus</span>
                    <div className="text-sm font-bold text-slate-100 flex items-center gap-1.5 mt-0.5">
                      <span>{selectedExpedition.finalReward.badgeIcon}</span>
                      <span>{selectedExpedition.finalReward.badgeName}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black text-lime-400">+{selectedExpedition.finalReward.coins} Coins</span>
                    <div className="text-[11px] text-sky-400 font-bold">+{selectedExpedition.finalReward.xp} XP</div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => handleStartExpedition(selectedExpedition)}
                    className="px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider bg-lime-400 hover:bg-lime-300 text-slate-950 shadow-lg shadow-lime-400/20 flex items-center gap-2 transition active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-slate-950" /> Begin Expedition
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
