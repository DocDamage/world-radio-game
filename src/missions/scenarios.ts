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
    case 'fishing-field-journal': {
      const deep = choice.id === 'deep-channel';
      return {
        missionId: mission.id,
        gameId: mission.gameId,
        title: mission.title,
        choiceLabel: choice.label,
        objectiveLabel: 'Land 5 specimen for the river field journal',
        biteDelayScale: deep ? 1.4 : 0.7,
        fightTensionScale: deep ? 1.25 : 0.85,
        catchTarget: 5
      };
    }
    case 'dj-orbit-rooftop': {
      const breakbeat = choice.id === 'breakbeat';
      return {
        missionId: mission.id,
        gameId: mission.gameId,
        title: mission.title,
        choiceLabel: choice.label,
        objectiveLabel: 'Land 48 on-beat hits to complete the rooftop set',
        bpm: breakbeat ? 140 : 120,
        timingWindowScale: breakbeat ? 0.6 : 1.0,
        targetBeats: 48
      };
    }
    case 'chef-night-market': {
      const express = choice.id === 'express';
      return {
        missionId: mission.id,
        gameId: mission.gameId,
        title: mission.title,
        choiceLabel: choice.label,
        objectiveLabel: 'Serve 2 dishes for the festival radio crew',
        tempSwingScale: express ? 1.6 : 1.0,
        zoneScale: express ? 0.6 : 1.0,
        coinBonusScale: express ? 2 : 1,
        dishesTarget: 2
      };
    }
    case 'photo-correspondent': {
      const detail = choice.id === 'street-detail';
      return {
        missionId: mission.id,
        gameId: mission.gameId,
        title: mission.title,
        choiceLabel: choice.label,
        objectiveLabel: detail
          ? 'Capture a 50–85mm transit landmark close-up for the atlas'
          : 'Capture a 24–35mm architectural skyline for the atlas',
        briefFocalMin: detail ? 50 : 24,
        briefFocalMax: detail ? 85 : 35,
        briefBonus: detail ? 7 : 0
      };
    }
    case 'buggy-solar-rally': {
      const ridge = choice.id === 'dune-ridge';
      return {
        missionId: mission.id,
        gameId: mission.gameId,
        title: mission.title,
        choiceLabel: choice.label,
        objectiveLabel: 'Reach the solar relay towers before the night broadcast',
        finishDistance: ridge ? 2600 : 3000,
        rampDensity: ridge ? 1.8 : 0.6,
        hazardDensity: ridge ? 0.8 : 1.3,
        airBonusScale: ridge ? 1.5 : 1.0,
        scoreWeights: { coin: 5 }
      };
    }
    case 'ski-mountain-courier': {
      const technical = choice.id === 'technical-slalom';
      return {
        missionId: mission.id,
        gameId: mission.gameId,
        title: mission.title,
        choiceLabel: choice.label,
        objectiveLabel: 'Carve the slalom gates to deliver the telemetry',
        finishDistance: technical ? 2500 : 3000,
        gateSpacing: technical ? 55 : 85,
        gateBonusScale: technical ? 1.5 : 1.0,
        maxSpeed: technical ? 78 : 95,
        scoreWeights: { gate: 80 }
      };
    }
    case 'surf-swell-window': {
      const tubeMaster = choice.id === 'tube-master';
      return {
        missionId: mission.id,
        gameId: mission.gameId,
        title: mission.title,
        choiceLabel: choice.label,
        objectiveLabel: 'Ride out on the open shoulder to close the swell window',
        tubeScoreScale: tubeMaster ? 1.3 : 0.8,
        trickScoreScale: tubeMaster ? 1.0 : 1.3
      };
    }
    case 'hunt-lost-relay': {
      const yagi = choice.id === 'yagi';
      return {
        missionId: mission.id,
        gameId: mission.gameId,
        title: mission.title,
        choiceLabel: choice.label,
        objectiveLabel: 'Triangulate and capture the clandestine transmitter',
        beamExponent: yagi ? 3.8 : 1.3
      };
    }
    case 'detective-missing-broadcast': {
      return {
        missionId: mission.id,
        gameId: mission.gameId,
        title: mission.title,
        choiceLabel: choice.label,
        objectiveLabel: 'Pinpoint the broadcast city within 1,250 km to close the case',
        clueFocus: choice.id === 'forensic-grid' ? 'grid' : 'cultural',
        caseCloseRangeKm: 1250
      };
    }
    default:
      // No playable scenario implemented for this mission yet.
      return null;
  }
}