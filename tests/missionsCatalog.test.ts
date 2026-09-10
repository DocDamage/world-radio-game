import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MISSION_CATALOG, EXPEDITIONS } from '../src/missions/catalog.ts';

const VALID_GAME_IDS = ['bike', 'boat', 'fishing', 'dj', 'market', 'photo', 'buggy', 'ski', 'surf', 'hunt', 'detective'];

test('mission ids are unique', () => {
  const ids = MISSION_CATALOG.map(m => m.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('every mission uses a known game id', () => {
  for (const m of MISSION_CATALOG) {
    assert.ok(VALID_GAME_IDS.includes(m.gameId), `${m.id} has unknown gameId ${m.gameId}`);
  }
});

test('medal thresholds are strictly ordered and positive', () => {
  for (const m of MISSION_CATALOG) {
    const { bronze, silver, gold } = m.medalThresholds;
    assert.ok(bronze > 0, `${m.id} bronze must be positive`);
    assert.ok(bronze < silver, `${m.id}: bronze < silver violated`);
    assert.ok(silver < gold, `${m.id}: silver < gold violated`);
  }
});

test('every expedition leg references an existing mission', () => {
  const ids = new Set(MISSION_CATALOG.map(m => m.id));
  for (const e of EXPEDITIONS) {
    assert.ok(e.stageMissionIds.length >= 2, `${e.id} must have multiple legs`);
    for (const id of e.stageMissionIds) {
      assert.ok(ids.has(id), `${e.id} references unknown mission ${id}`);
    }
  }
});

test('every mission in the catalog is wired live end-to-end', () => {
  const live = MISSION_CATALOG.filter(m => m.status === 'live').map(m => m.id).sort();
  assert.deepEqual(live, [
    'bike-last-mile',
    'boat-harbor-run',
    'buggy-solar-rally',
    'chef-night-market',
    'detective-missing-broadcast',
    'dj-orbit-rooftop',
    'fishing-field-journal',
    'hunt-lost-relay',
    'photo-correspondent',
    'ski-mountain-courier',
    'surf-swell-window'
  ]);
});

test('every mission offers at least one approach choice', () => {
  for (const m of MISSION_CATALOG) {
    assert.ok(m.choices.length >= 1, `${m.id} has no choices`);
  }
});
