import type { ActiveMissionSession } from './types';
import { getMissionById, getExpeditionById } from './catalog';
import { travelerState } from '../services/travelerState';

class MissionSessionManager {
  private currentSession: ActiveMissionSession | null = null;
  private activeExpeditionId: string | null = null;
  private expeditionStageIndex: number = 0;

  public startMission(missionId: string, choiceId?: string, expeditionId?: string, stageIndex?: number): ActiveMissionSession | null {
    const mission = getMissionById(missionId);
    if (!mission) return null;

    const chosenOptionId = choiceId || (mission.choices[0] ? mission.choices[0].id : 'default');

    this.currentSession = {
      sessionId: `ms_${mission.id}_${Date.now()}`,
      mission,
      chosenOptionId,
      gameId: mission.gameId,
      startedAt: new Date().toISOString(),
      completed: false,
      score: 0,
      expeditionId,
      expeditionStageIndex: stageIndex
    };

    return this.currentSession;
  }

  public getCurrentSession(): ActiveMissionSession | null {
    return this.currentSession;
  }

  public startExpedition(expeditionId: string): { success: boolean; firstMissionId?: string } {
    const exp = getExpeditionById(expeditionId);
    if (!exp || exp.stageMissionIds.length === 0) return { success: false };

    this.activeExpeditionId = expeditionId;
    this.expeditionStageIndex = 0;
    const firstMissionId = exp.stageMissionIds[0];
    return { success: true, firstMissionId };
  }

  public getActiveExpedition(): { expeditionId: string; stageIndex: number } | null {
    if (!this.activeExpeditionId) return null;
    return {
      expeditionId: this.activeExpeditionId,
      stageIndex: this.expeditionStageIndex
    };
  }

  // Complete the current mission with a score and settle rewards once
  public completeCurrentMission(score: number): {
    success: boolean;
    medal: 'bronze' | 'silver' | 'gold';
    coinsAwarded: number;
    xpAwarded: number;
    isExpeditionComplete: boolean;
    nextMissionId?: string;
  } {
    if (!this.currentSession || this.currentSession.completed) {
      return {
        success: false,
        medal: 'bronze',
        coinsAwarded: 0,
        xpAwarded: 0,
        isExpeditionComplete: false
      };
    }

    const { mission, sessionId } = this.currentSession;
    let medal: 'bronze' | 'silver' | 'gold' = 'bronze';
    if (score >= mission.medalThresholds.gold) {
      medal = 'gold';
    } else if (score >= mission.medalThresholds.silver) {
      medal = 'silver';
    }

    const medalMultiplier = medal === 'gold' ? 1.5 : medal === 'silver' ? 1.2 : 1.0;
    const baseCoins = Math.round(mission.rewards.coins * medalMultiplier);
    const baseProgressXp = Math.round(mission.rewards.xp * medalMultiplier);

    // Commit once-only transaction through traveler state
    const settlementResult = travelerState.settleReward(sessionId, {
      coins: baseCoins,
      xp: baseProgressXp,
      missionId: mission.id,
      gameId: mission.gameId,
      medal,
      score
    });

    this.currentSession.completed = true;
    this.currentSession.score = score;
    this.currentSession.medal = medal;

    // Check if this was part of an active expedition
    let isExpeditionComplete = false;
    let nextMissionId: string | undefined = undefined;

    if (this.activeExpeditionId) {
      const exp = getExpeditionById(this.activeExpeditionId);
      if (exp) {
        const nextIndex = this.expeditionStageIndex + 1;
        if (nextIndex < exp.stageMissionIds.length) {
          this.expeditionStageIndex = nextIndex;
          nextMissionId = exp.stageMissionIds[nextIndex];
        } else {
          // Expedition completed! Award finale bonus
          isExpeditionComplete = true;
          travelerState.completeExpedition(exp.id, exp.finalReward.coins, exp.finalReward.xp);
          this.activeExpeditionId = null;
          this.expeditionStageIndex = 0;
        }
      }
    }

    return {
      success: settlementResult.success,
      medal,
      coinsAwarded: settlementResult.coinsAwarded,
      xpAwarded: settlementResult.xpAwarded,
      isExpeditionComplete,
      nextMissionId
    };
  }

  public clearSession() {
    this.currentSession = null;
  }
}

export const missionSession = new MissionSessionManager();
