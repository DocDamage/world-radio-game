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
    const s = buildScenario(m, m.choices[0]?.id);
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
  }
});

test('missions without an implemented scenario return null (honest planning)', () => {
  assert.equal(buildScenario(byId('dj-orbit-rooftop'), 'synths'), null);
  assert.equal(buildScenario(byId('chef-night-market'), 'classic'), null);
});

test('unknown choice id falls back to the mission first choice', () => {
  const s = buildScenario(byId('bike-last-mile'), 'does-not-exist')!;
  assert.ok(s);
  assert.equal(s.finishDistance, 1600, 'first choice for bike mission is the climb route');
});
