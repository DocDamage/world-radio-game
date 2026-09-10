import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { BackpackItem } from '../src/types.ts';

// Stub a localStorage sandbox BEFORE the store module loads (its constructor
// reads storage). Each test file runs in its own process, so this is safe.
const backing = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (backing.has(k) ? backing.get(k)! : null),
  setItem: (k: string, v: string) => void backing.set(k, v),
  removeItem: (k: string) => void backing.delete(k),
  clear: () => backing.clear(),
  key: (i: number) => Array.from(backing.keys())[i] ?? null,
  get length() {
    return backing.size;
  }
};

// Seed corrupt v2 data: the store must recover to clean defaults, never throw
backing.set('world_radio_traveler_v2', '{not valid json');

const { travelerState } = await import('../src/services/travelerState.ts');

const makeItem = (id: string, priceCoins?: number): BackpackItem => ({
  id,
  name: `Item ${id}`,
  category: 'photo',
  icon: '📸',
  city: 'Tokyo',
  country: 'Japan',
  description: 'test item',
  acquiredAt: new Date().toISOString(),
  ...(priceCoins !== undefined ? { priceCoins } : {})
});

test('corrupt v2 save data recovers to clean defaults without throwing', () => {
  const s = travelerState.getState();
  assert.equal(s.version, 2);
  assert.equal(s.coins, 250);
  assert.deepEqual(s.passport, []);
  assert.deepEqual(s.backpack, []);
  assert.deepEqual(s.settledTransactions, []);
});

test('settleReward pays coins/xp exactly once per transaction id', () => {
  const before = travelerState.getState();

  const first = travelerState.settleReward('tx-mission-1', {
    coins: 40,
    xp: 60,
    missionId: 'bike-last-mile',
    gameId: 'bike',
    medal: 'silver',
    score: 2000
  });
  assert.equal(first.success, true);
  assert.equal(first.alreadySettled, false);
  assert.equal(first.coinsAwarded, 40);

  // Replay of the same transaction (e.g. a duplicated game-end event) must pay nothing
  const dup = travelerState.settleReward('tx-mission-1', {
    coins: 40,
    xp: 60,
    missionId: 'bike-last-mile',
    gameId: 'bike',
    medal: 'silver',
    score: 2000
  });
  assert.equal(dup.success, false);
  assert.equal(dup.alreadySettled, true);
  assert.equal(dup.coinsAwarded, 0);

  const s = travelerState.getState();
  assert.equal(s.coins, before.coins + 40);
  assert.equal(s.xp, before.xp + 60);
  assert.ok(s.completedMissions['bike-last-mile'], 'mission record should be written');
  assert.equal(s.completedMissions['bike-last-mile'].medal, 'silver');
});

test('selling an item that is not owned fails and pays nothing', () => {
  const res = travelerState.sellItem('ghost-item');
  assert.equal(res.success, false);
  assert.equal(res.coinsEarned, 0);
});

test('selling an owned item pays its value exactly once', () => {
  travelerState.settleReward('tx-item-1', { backpackItem: makeItem('item-a', 35) });
  const coinsBefore = travelerState.getState().coins;

  const sale = travelerState.sellItem('item-a');
  assert.equal(sale.success, true);
  assert.equal(sale.coinsEarned, 35);
  assert.equal(travelerState.getState().coins, coinsBefore + 35);
  assert.equal(travelerState.getState().backpack.some(i => i.id === 'item-a'), false);

  // Selling the same item again must not pay a second time
  const resale = travelerState.sellItem('item-a');
  assert.equal(resale.success, false);
  assert.equal(resale.coinsEarned, 0);
  assert.equal(travelerState.getState().coins, coinsBefore + 35);
});

test('purchaseItem blocks duplicates and insufficient funds', () => {
  // Reset to a low-coin state via import
  const reset = JSON.stringify({ ...travelerState.getState(), coins: 10 });
  assert.equal(travelerState.importJson(reset), true);
  assert.equal(travelerState.getState().coins, 10);

  assert.equal(travelerState.purchaseItem(makeItem('item-b', 20), 50), false, 'insufficient funds must reject');

  travelerState.addCoins(240); // back to 250
  assert.equal(travelerState.purchaseItem(makeItem('item-b', 20), 50), true);
  assert.equal(travelerState.getState().coins, 200);

  // Duplicate purchase of the same item is blocked
  assert.equal(travelerState.purchaseItem(makeItem('item-b', 20), 50), false);
  assert.equal(travelerState.getState().coins, 200);
});

test('updateHighScore only accepts strictly higher scores', () => {
  assert.equal(travelerState.updateHighScore('bike', 500), true);
  assert.equal(travelerState.updateHighScore('bike', 500), false, 'equal score is not a record');
  assert.equal(travelerState.updateHighScore('bike', 200), false);
  assert.equal(travelerState.updateHighScore('bike', 900), true);
  assert.equal(travelerState.getState().highScores.bike, 900);
});
