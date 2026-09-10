import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MISSION_CATALOG } from '../src/missions/catalog.ts';
import { buildScenario } from '../src/missions/scenarios.ts';

const byId = (id: string) => {
  const m = MISSION_CATALOG.find(x => x.id === id);
  assert.ok(m, `mission ${id} must exist in the catalog`);
  return m!;
};

test('bike mission: highland incline is shorter, sparser traffic, richer coins', () => {
  const s = buildScenario(byId('bike-last-mile'), 'climb')!;
  assert.ok(s);
  assert.equal(s.missionId, 'bike-last-mile');
  assert.equal(s.gameId, 'bike');
  assert.equal(s.finishDistance, 1600);
  assert.equal(s.trafficDensity, 0.6);
  assert.equal(s.coinDensity, 1.5);
  assert.equal(s.accelScale, 0.85);
});

test('bike mission: avenue corridor is longer with denser traffic', () => {
  const s = buildScenario(byId('bike-last-mile'), 'flat')!;
  assert.ok(s);
  assert.equal(s.finishDistance, 2200);
  assert.equal(s.trafficDensity, 1.3);
  assert.equal(s.coinDensity, 0.8);
});

test('boat mission: sheltered ring channel is slower, one ferry, tighter quays', () => {
  const s = buildScenario(byId('boat-harbor-run'), 'sheltered')!;
  assert.ok(s);
  assert.equal(s.ferrySpeed, 12);
  assert.equal(s.ferryCount, 1);
  assert.equal(s.quayMargin, 92);
});

test('boat mission: open harbor crossing is fast with two ferries', () => {
  const s = buildScenario(byId('boat-harbor-run'), 'exposed')!;
  assert.ok(s);
  assert.equal(s.ferrySpeed, 30);
  assert.equal(s.ferryCount, 2);
  assert.equal(s.quayMargin, 70);
});

test('scenario building is deterministic: same inputs, same output', () => {
  assert.deepEqual(buildScenario(byId('bike-last-mile'), 'climb'), buildScenario(byId('bike-last-mile'), 'climb'));
  assert.deepEqual(buildScenario(byId('boat-harbor-run'), 'exposed'), buildScenario(byId('boat-harbor-run'), 'exposed'));
});

test('scenario parameters stay bounded', () => {
  for (const m of MISSION_CATALOG) {
    for (const choice of m.choices) {
      const s = buildScenario(m, choice.id);
      if (!s) continue;
      if (s.finishDistance !== undefined) {
        assert.ok(s.finishDistance >= 1000 && s.finishDistance <= 3000, `${m.id} finishDistance out of bounds`);
      }
      if (s.trafficDensity !== undefined) assert.ok(s.trafficDensity > 0 && s.trafficDensity <= 2, `${m.id} trafficDensity`);
      if (s.coinDensity !== undefined) assert.ok(s.coinDensity > 0 && s.coinDensity <= 2, `${m.id} coinDensity`);
      if (s.accelScale !== undefined) assert.ok(s.accelScale > 0 && s.accelScale <= 2, `${m.id} accelScale`);
      if (s.ferrySpeed !== undefined) assert.ok(s.ferrySpeed > 0 && s.ferrySpeed <= 60, `${m.id} ferrySpeed`);
      if (s.ferryCount !== undefined) assert.ok(s.ferryCount >= 1 && s.ferryCount <= 3, `${m.id} ferryCount`);
      if (s.quayMargin !== undefined) assert.ok(s.quayMargin >= 60 && s.quayMargin <= 120, `${m.id} quayMargin`);
      if (s.biteDelayScale !== undefined) assert.ok(s.biteDelayScale > 0 && s.biteDelayScale <= 2, `${m.id} biteDelayScale`);
      if (s.fightTensionScale !== undefined) assert.ok(s.fightTensionScale > 0 && s.fightTensionScale <= 2, `${m.id} fightTensionScale`);
      if (s.catchTarget !== undefined) assert.ok(s.catchTarget >= 2 && s.catchTarget <= 8, `${m.id} catchTarget`);
      if (s.bpm !== undefined) assert.ok(s.bpm >= 60 && s.bpm <= 200, `${m.id} bpm`);
      if (s.timingWindowScale !== undefined) assert.ok(s.timingWindowScale > 0 && s.timingWindowScale <= 2, `${m.id} timingWindowScale`);
      if (s.targetBeats !== undefined) assert.ok(s.targetBeats >= 8 && s.targetBeats <= 128, `${m.id} targetBeats`);
      if (s.tempSwingScale !== undefined) assert.ok(s.tempSwingScale > 0 && s.tempSwingScale <= 2, `${m.id} tempSwingScale`);
      if (s.zoneScale !== undefined) assert.ok(s.zoneScale > 0 && s.zoneScale <= 2, `${m.id} zoneScale`);
      if (s.coinBonusScale !== undefined) assert.ok(s.coinBonusScale > 0 && s.coinBonusScale <= 2, `${m.id} coinBonusScale`);
      if (s.dishesTarget !== undefined) assert.ok(s.dishesTarget >= 1 && s.dishesTarget <= 6, `${m.id} dishesTarget`);
      if (s.briefFocalMin !== undefined) assert.ok(s.briefFocalMin >= 24 && s.briefFocalMin <= 85, `${m.id} briefFocalMin`);
      if (s.briefFocalMax !== undefined) assert.ok(s.briefFocalMax >= 24 && s.briefFocalMax <= 85, `${m.id} briefFocalMax`);
      if (s.briefBonus !== undefined) assert.ok(s.briefBonus >= 0 && s.briefBonus <= 20, `${m.id} briefBonus`);
      if (s.rampDensity !== undefined) assert.ok(s.rampDensity > 0 && s.rampDensity <= 2, `${m.id} rampDensity`);
      if (s.hazardDensity !== undefined) assert.ok(s.hazardDensity > 0 && s.hazardDensity <= 2, `${m.id} hazardDensity`);
      if (s.airBonusScale !== undefined) assert.ok(s.airBonusScale > 0 && s.airBonusScale <= 2, `${m.id} airBonusScale`);
      if (s.gateSpacing !== undefined) assert.ok(s.gateSpacing >= 40 && s.gateSpacing <= 120, `${m.id} gateSpacing`);
      if (s.gateBonusScale !== undefined) assert.ok(s.gateBonusScale > 0 && s.gateBonusScale <= 2, `${m.id} gateBonusScale`);
      if (s.maxSpeed !== undefined) assert.ok(s.maxSpeed >= 40 && s.maxSpeed <= 120, `${m.id} maxSpeed`);
      if (s.tubeScoreScale !== undefined) assert.ok(s.tubeScoreScale > 0 && s.tubeScoreScale <= 2, `${m.id} tubeScoreScale`);
      if (s.trickScoreScale !== undefined) assert.ok(s.trickScoreScale > 0 && s.trickScoreScale <= 2, `${m.id} trickScoreScale`);
      if (s.beamExponent !== undefined) assert.ok(s.beamExponent >= 1 && s.beamExponent <= 4, `${m.id} beamExponent`);
      if (s.caseCloseRangeKm !== undefined) assert.ok(s.caseCloseRangeKm >= 100 && s.caseCloseRangeKm <= 2500, `${m.id} caseCloseRangeKm`);
      if (s.briefFocalMin !== undefined && s.briefFocalMax !== undefined) {
        assert.ok(s.briefFocalMin <= s.briefFocalMax, `${m.id} brief focal range is inverted`);
      }
    }
  }
});

test('every cataloged mission builds a playable scenario (no unwired entries)', () => {
  for (const m of MISSION_CATALOG) {
    const s = buildScenario(m, m.choices[0]?.id);
    assert.ok(s, `${m.id} must build a scenario now that it is marked live`);
    assert.equal(s!.missionId, m.id);
    assert.equal(s!.gameId, m.gameId);
    assert.ok(s!.objectiveLabel.length > 0, `${m.id} needs an objective label`);
  }
});

test('unknown choice id falls back to the mission first choice', () => {
  const s = buildScenario(byId('bike-last-mile'), 'does-not-exist')!;
  assert.ok(s);
  assert.equal(s.finishDistance, 1600, 'first choice for bike mission is the climb route');
});

test('fishing mission: deep channel is slower to bite but harsher fights', () => {
  const deep = buildScenario(byId('fishing-field-journal'), 'deep-channel')!;
  const shallow = buildScenario(byId('fishing-field-journal'), 'shallows')!;
  assert.ok(deep.biteDelayScale! > shallow.biteDelayScale!);
  assert.ok(deep.fightTensionScale! > shallow.fightTensionScale!);
  assert.equal(deep.catchTarget, 5);
});

test('dj mission: breakbeat runs faster with tighter timing windows', () => {
  const synths = buildScenario(byId('dj-orbit-rooftop'), 'synths')!;
  const breakbeat = buildScenario(byId('dj-orbit-rooftop'), 'breakbeat')!;
  assert.equal(synths.bpm, 120);
  assert.equal(breakbeat.bpm, 140);
  assert.ok(breakbeat.timingWindowScale! < synths.timingWindowScale!);
  assert.equal(synths.targetBeats, 48);
});

test('chef mission: express rush swings hotter with tighter zones and double pay', () => {
  const classic = buildScenario(byId('chef-night-market'), 'classic')!;
  const express = buildScenario(byId('chef-night-market'), 'express')!;
  assert.ok(express.tempSwingScale! > classic.tempSwingScale!);
  assert.ok(express.zoneScale! < classic.zoneScale!);
  assert.equal(express.coinBonusScale, 2);
  assert.equal(classic.dishesTarget, 2);
});

test('photo mission: skyline brief wants wide glass, detail brief wants telephoto', () => {
  const skyline = buildScenario(byId('photo-correspondent'), 'skyline')!;
  const detail = buildScenario(byId('photo-correspondent'), 'street-detail')!;
  assert.deepEqual([skyline.briefFocalMin, skyline.briefFocalMax], [24, 35]);
  assert.deepEqual([detail.briefFocalMin, detail.briefFocalMax], [50, 85]);
});

test('buggy mission: dune ridge is shorter with more ramps, canyon wash rougher', () => {
  const ridge = buildScenario(byId('buggy-solar-rally'), 'dune-ridge')!;
  const wash = buildScenario(byId('buggy-solar-rally'), 'canyon-wash')!;
  assert.ok(ridge.finishDistance! < wash.finishDistance!);
  assert.ok(ridge.rampDensity! > wash.rampDensity!);
  assert.ok(wash.hazardDensity! > ridge.hazardDensity!);
});

test('ski mission: technical line is tighter gates with bonus, glacier is faster and longer', () => {
  const technical = buildScenario(byId('ski-mountain-courier'), 'technical-slalom')!;
  const glacier = buildScenario(byId('ski-mountain-courier'), 'glacier-speed')!;
  assert.ok(technical.gateSpacing! < glacier.gateSpacing!);
  assert.ok(technical.gateBonusScale! > glacier.gateBonusScale!);
  assert.ok(glacier.maxSpeed! > technical.maxSpeed!);
});

test('surf mission: tube master scores barrels, open face scores tricks', () => {
  const tube = buildScenario(byId('surf-swell-window'), 'tube-master')!;
  const openFace = buildScenario(byId('surf-swell-window'), 'open-face')!;
  assert.ok(tube.tubeScoreScale! > openFace.tubeScoreScale!);
  assert.ok(openFace.trickScoreScale! > tube.trickScoreScale!);
});

test('hunt mission: yagi is razor sharp, loop sensor sweeps wide', () => {
  const yagi = buildScenario(byId('hunt-lost-relay'), 'yagi')!;
  const omni = buildScenario(byId('hunt-lost-relay'), 'omni')!;
  assert.ok(yagi.beamExponent! > omni.beamExponent!);
});

test('detective mission: choices focus different forensic leads with a shared tolerance', () => {
  const grid = buildScenario(byId('detective-missing-broadcast'), 'forensic-grid')!;
  const cultural = buildScenario(byId('detective-missing-broadcast'), 'cultural-linguistic')!;
  assert.equal(grid.clueFocus, 'grid');
  assert.equal(cultural.clueFocus, 'cultural');
  assert.equal(grid.caseCloseRangeKm, 1250);
  assert.equal(cultural.caseCloseRangeKm, 1250);
});
