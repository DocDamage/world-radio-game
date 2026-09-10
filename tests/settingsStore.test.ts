import { test } from 'node:test';
import assert from 'node:assert/strict';

// Isolated in-memory localStorage mock for the test process
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

// Seed legacy volume to verify migration
backing.set('world_radio_volume', '0.72');

const { settingsStore } = await import('../src/services/settingsStore.ts');
const { celebrate } = await import('../src/services/celebrate.ts');

test('settingsStore loads defaults and migrates legacy radio volume', () => {
  const s = settingsStore.getState();
  assert.equal(s.reducedFlashes, false);
  assert.equal(s.screenShake, 'full');
  assert.equal(s.visualSoundCues, false);
  assert.equal(s.radioVolume, 0.72);
  assert.equal(s.effectsVolume, 1);
  assert.equal(typeof s.reducedMotion, 'boolean');
});

test('getShakeScale returns appropriate multipliers', () => {
  settingsStore.update({ screenShake: 'full' });
  assert.equal(settingsStore.getShakeScale(), 1);

  settingsStore.update({ screenShake: 'reduced' });
  assert.equal(settingsStore.getShakeScale(), 0.5);

  settingsStore.update({ screenShake: 'off' });
  assert.equal(settingsStore.getShakeScale(), 0);

  // Invalid value is ignored
  settingsStore.update({ screenShake: 'invalid' as any });
  assert.equal(settingsStore.getShakeScale(), 0);
});

test('celebrationBlocked honors reducedMotion and reducedFlashes', () => {
  settingsStore.update({ reducedMotion: false, reducedFlashes: false });
  assert.equal(settingsStore.celebrationBlocked(), false);

  settingsStore.update({ reducedMotion: true, reducedFlashes: false });
  assert.equal(settingsStore.celebrationBlocked(), true);

  settingsStore.update({ reducedMotion: false, reducedFlashes: true });
  assert.equal(settingsStore.celebrationBlocked(), true);

  settingsStore.update({ reducedMotion: true, reducedFlashes: true });
  assert.equal(settingsStore.celebrationBlocked(), true);

  // celebrate wrapper does not throw when blocked
  assert.doesNotThrow(() => {
    celebrate({ particleCount: 50 });
  });
});

test('cuesEnabled reflects visualSoundCues toggle', () => {
  settingsStore.update({ visualSoundCues: false });
  assert.equal(settingsStore.cuesEnabled(), false);

  settingsStore.update({ visualSoundCues: true });
  assert.equal(settingsStore.cuesEnabled(), true);
});

test('volume clamping bounds values to [0, 1] and ignores invalid values', () => {
  settingsStore.update({ radioVolume: 1.8 });
  assert.equal(settingsStore.getState().radioVolume, 1);

  settingsStore.update({ radioVolume: -0.5 });
  assert.equal(settingsStore.getState().radioVolume, 0);

  settingsStore.update({ radioVolume: 0.45 });
  assert.equal(settingsStore.getState().radioVolume, 0.45);

  // NaN / invalid should not alter current volume
  settingsStore.update({ radioVolume: NaN });
  assert.equal(settingsStore.getState().radioVolume, 0.45);

  settingsStore.update({ effectsVolume: -0.2 });
  assert.equal(settingsStore.getState().effectsVolume, 0);

  settingsStore.update({ effectsVolume: 2.5 });
  assert.equal(settingsStore.getState().effectsVolume, 1);
});

test('subscribers receive notifications and can unsubscribe', () => {
  let callCount = 0;
  const unsubscribe = settingsStore.subscribe(() => {
    callCount++;
  });

  settingsStore.update({ visualSoundCues: false });
  assert.equal(callCount, 1);

  settingsStore.update({ visualSoundCues: true });
  assert.equal(callCount, 2);

  unsubscribe();
  settingsStore.update({ visualSoundCues: false });
  assert.equal(callCount, 2);
});

test('storage failures degrade gracefully without throwing', () => {
  const origSetItem = (globalThis as any).localStorage.setItem;
  (globalThis as any).localStorage.setItem = () => {
    throw new Error('QuotaExceededError');
  };

  try {
    assert.doesNotThrow(() => {
      settingsStore.update({ radioVolume: 0.95 });
    });
    assert.equal(settingsStore.getState().radioVolume, 0.95);
  } finally {
    (globalThis as any).localStorage.setItem = origSetItem;
  }
});
