import type { EnvironmentType } from '../types';

export type GameId = 'bike' | 'boat' | 'fishing' | 'dj' | 'market' | 'photo' | 'buggy' | 'ski' | 'surf' | 'hunt' | 'detective';

/** Whether a mission is playable in a live game yet (honest feature labeling). */
export type MissionStatus = 'live' | 'planned';

export interface MissionChoice {
  id: string;
  label: string;
  description: string;
  modifier: string; // e.g. 'flatter route, +15% traffic' or 'steep incline, less traffic'
}

export interface MissionDefinition {
  id: string;
  gameId: GameId;
  title: string;
  subtitle: string;
  durationMin: number;
  description: string;
  choices: MissionChoice[];
  medalThresholds: {
    bronze: number; // base objective completed
    silver: number; // optional skill goal
    gold: number;   // full mastery goal
  };
  rewards: {
    coins: number;
    xp: number;
  };
  supportedBiomes?: EnvironmentType[];
  contextLabel: string;
  expansionRef: string; // e.g. 'O01/O18' or 'O04/O17'
  /** 'live' = playable end-to-end; 'planned' = catalog entry not yet wired into a game */
  status?: MissionStatus;
}

export interface ExpeditionDefinition {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  stageMissionIds: string[];
  finalReward: {
    coins: number;
    xp: number;
    badgeName: string;
    badgeIcon: string;
  };
}

export interface ActiveMissionSession {
  sessionId: string;
  mission: MissionDefinition;
  chosenOptionId: string;
  gameId: GameId;
  startedAt: string;
  completed: boolean;
  score: number;
  medal?: 'bronze' | 'silver' | 'gold';
  expeditionId?: string;
  expeditionStageIndex?: number;
}

/**
 * Bounded, game-agnostic run parameters derived from a mission definition and
 * the player's chosen approach. Games consume these knobs to shape a run; the
 * weights define how the game's raw stats map onto the mission score that
 * medal thresholds are evaluated against.
 */
export interface MissionScenario {
  missionId: string;
  gameId: GameId;
  title: string;
  choiceLabel: string;
  objectiveLabel: string; // short in-game HUD objective line

  // Bicycle knobs
  finishDistance?: number;   // meters to complete the route
  trafficDensity?: number;   // 1.0 = standard traffic; <1 sparser, >1 denser
  coinDensity?: number;      // 1.0 = standard coin frequency
  accelScale?: number;       // pedal acceleration multiplier

  // Boating knobs
  ferrySpeed?: number;       // lateral ferry speed (px/sec)
  ferryCount?: number;       // moving ferries in the channel
  quayMargin?: number;       // px margin from channel walls (larger = tighter)

  // Scoring weights (game stats -> mission score)
  scoreWeights?: {
    coin?: number;
    nearMiss?: number;
    hull?: number;
    dockBonus?: number;
  };
}

/** Typed result emitted by a game exactly once when a mission run settles. */
export interface MissionResultPayload {
  missionId: string;
  gameId: GameId;
  score: number;
  outcome: 'completed' | 'failed' | 'abandoned';
  stats: Record<string, number>;
}
