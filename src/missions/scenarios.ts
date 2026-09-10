import type { MissionDefinition, MissionScenario } from './types';

/**
 * Converts a mission definition plus the chosen approach into bounded run
 * parameters for the target mini-game. Pure and deterministic: the same inputs
 * always produce the same scenario, so reward tuning stays auditable and
 * testable. Returns null when no game-specific scenario exists yet.
 */
export function buildScenario(mission: MissionDefinition, choiceId?: string): MissionScenario | null {
  const choice = mission.choices.find(c => c.id === choiceId) ?? mission.choices[0];
  if (!choice) return null;

  switch (mission.id) {
    case 'bike-last-mile': {
      const climb = choice.id === 'climb';
      return {
        missionId: mission.id,
        gameId: mission.gameId,
        title: mission.title,
        choiceLabel: choice.label,
        objectiveLabel: 'Deliver the broadcast cartridges to the finish line',
        finishDistance: climb ? 1600 : 2200,
        trafficDensity: climb ? 0.6 : 1.3,
        coinDensity: climb ? 1.5 : 0.8,
        accelScale: climb ? 0.85 : 1.0,
        scoreWeights: { coin: 5, nearMiss: 10 }
      };
    }
    case 'boat-harbor-run': {
      const sheltered = choice.id === 'sheltered';
      return {
        missionId: mission.id,
        gameId: mission.gameId,
        title: mission.title,
        choiceLabel: choice.label,
        objectiveLabel: 'Salvage both transmitter crates, then berth at the marina dock',
        ferrySpeed: sheltered ? 12 : 30,
        ferryCount: sheltered ? 1 : 2,
        quayMargin: sheltered ? 92 : 70,
        scoreWeights: { coin: 2, hull: 2, dockBonus: 100 }
      };
    }
    default:
      // No playable scenario implemented for this mission yet.
      return null;
  }
}