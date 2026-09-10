import type { EnvironmentType } from '../types';

export type GameId = 'bike' | 'boat' | 'fishing' | 'dj' | 'market' | 'photo' | 'buggy' | 'ski' | 'surf' | 'hunt' | 'detective';

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
