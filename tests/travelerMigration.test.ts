import { test } from 'node:test';
import assert from 'node:assert/strict';

// Each test file runs in its own process: seed ONLY v1 legacy keys (no v2 key)
// so the store must run its one-time v1 -> v2 migration on load.
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

backing.set('world_radio_coins', '999');
backing.set(
  'world_radio_passport',
  JSON.stringify([
    {
      stationUuid: 's1',
      stationName: 'FM1',
      city: 'Oslo',
      country: 'Norway',
      countryCode: 'NO',
      genre: 'jazz',
      visitedAt: '2025-01-01T00:00:00.000Z',
      coordinates: { lat: 1, lng: 2 }
    }
  ])
);
backing.set('world_radio_backpack', JSON.stringify([]));
backing.set('world_radio_favorites', JSON.stringify({}));
backing.set('world_radio_highscores', JSON.stringify({ bike: 1234 }));

const { travelerState } = await import('../src/services/travelerState.ts');

test('v1 legacy keys migrate into the v2 store', () => {
  const s = travelerState.getState();
  assert.equal(s.version, 2);
  assert.equal(s.coins, 999);
  assert.equal(s.passport.length, 1);
  assert.equal(s.passport[0].stationUuid, 's1');
  assert.equal(s.highScores.bike, 1234);
});

test('duplicate passport stamps are ignored and award no second XP', () => {
  const xpBefore = travelerState.getState().xp;
  travelerState.addPassportEntry({
    stationUuid: 's1',
    stationName: 'FM1',
    city: 'Oslo',
    country: 'Norway',
    countryCode: 'NO',
    genre: 'jazz',
    visitedAt: new Date().toISOString(),
    coordinates: { lat: 1, lng: 2 }
  });
  assert.equal(travelerState.getState().passport.length, 1, 'duplicate stamp must not be stored');
  assert.equal(travelerState.getState().xp, xpBefore, 'duplicate stamp must not re-award XP');
});

test('a unique passport stamp awards 25 XP exactly once', () => {
  const xpBefore = travelerState.getState().xp;
  travelerState.addPassportEntry({
    stationUuid: 's2',
    stationName: 'FM2',
    city: 'Lima',
    country: 'Peru',
    countryCode: 'PE',
    genre: 'folk',
    visitedAt: new Date().toISOString(),
    coordinates: { lat: -12, lng: -77 }
  });
  assert.equal(travelerState.getState().passport.length, 2);
  assert.equal(travelerState.getState().xp, xpBefore + 25);
});

test('expedition completion bonus is paid only once', () => {
  const before = travelerState.getState();
  assert.equal(travelerState.completeExpedition('exp-test', 80, 150), true);
  assert.equal(travelerState.getState().coins, before.coins + 80);
  assert.equal(travelerState.getState().xp, before.xp + 150);

  assert.equal(travelerState.completeExpedition('exp-test', 80, 150), false);
  assert.equal(travelerState.getState().coins, before.coins + 80, 'repeat completion must not pay again');
  assert.equal(travelerState.getState().xp, before.xp + 150);
});

test('storage failures degrade gracefully to in-memory state (never throws)', () => {
  const coinsBefore = travelerState.getState().coins;
  const originalSetItem = (globalThis as any).localStorage.setItem;
  (globalThis as any).localStorage.setItem = () => {
    throw new Error('quota exceeded');
  };

  // Must not throw despite storage being unavailable
  travelerState.addCoins(50);
  assert.equal(travelerState.getState().coins, coinsBefore + 50);
  assert.equal(travelerState.isStorageWorking(), false);

  (globalThis as any).localStorage.setItem = originalSetItem;
});
