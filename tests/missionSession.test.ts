import { test } from 'node:test';
import assert from 'node:assert/strict';

// Stub a localStorage sandbox BEFORE the store module loads (its constructor
// reads storage). Each test file runs in its own process, so this is safe.
const backing = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (backing.has(k) ? backing.get(k)! : null),
  setItem: (k: string, v: string) => void backing.set(k, v),
  removeItem: (k: string) => backing.delete(k),
  clear: () => backing.clear(),
  key: (i: number) => Array.from(backing.keys())[i] ?? null,
  get length() {
    return backing.size;
  }
};

const { missionSession } = await import('../src/missions/session.ts');
const { travelerState } = await import('../src/services/travelerState.ts');
const { getMissionById, getExpeditionById } = await import('../src/missions/catalog.ts');

test('mission settles exactly once with medal-scaled rewards (detective gold run)', () => {
  const mission = getMissionById('detective-missing-broadcast')!;
  const session = missionSession.startMission(mission.id, 'forensic-grid');
  assert.ok(session);
  const coinsBefore = travelerState.getState().coins;

  // 4,800 pts is the gold line for the detective mission
  const result = missionSession.completeCurrentMission(4800);
  assert.equal(result.success, true);
  assert.equal(result.medal, 'gold');
  assert.equal(result.coinsAwarded, Math.round(mission.rewards.coins * 1.5));
  assert.equal(travelerState.getState().coins, coinsBefore + result.coinsAwarded);

  // A second settlement attempt must be refused — no double payout
  const again = missionSession.completeCurrentMission(4800);
  assert.equal(again.success, false);
  assert.equal(again.coinsAwarded, 0);
  assert.equal(travelerState.getState().coins, coinsBefore + result.coinsAwarded);

  // The mission is recorded as completed with its medal
  const record = travelerState.getState().completedMissions[mission.id];
  assert.ok(record, 'completed mission record must exist');
  assert.equal(record.medal, 'gold');
  assert.equal(record.score, 4800);
});

test('hunt mission pays out bronze baseline at minimum score', () => {
  const mission = getMissionById('hunt-lost-relay')!;
  const coinsBefore = travelerState.getState().coins;

  missionSession.startMission(mission.id, 'yagi');
  const result = missionSession.completeCurrentMission(50); // bronze line
  assert.equal(result.success, true);
  assert.equal(result.medal, 'bronze');
  assert.equal(result.coinsAwarded, mission.rewards.coins);
  assert.equal(travelerState.getState().coins, coinsBefore + mission.rewards.coins);
});

test('expedition legs chain through the newly wired world-mode games', () => {
  const exp = getExpeditionById('exp-silent-frequency')!;
  const started = missionSession.startExpedition(exp.id);
  assert.equal(started.success, true);
  assert.equal(started.firstMissionId, 'hunt-lost-relay');

  // Leg 1: hunt completes -> next leg should be the photo mission
  missionSession.startMission('hunt-lost-relay', 'yagi', exp.id, 0);
  const leg1 = missionSession.completeCurrentMission(90);
  assert.equal(leg1.success, true);
  assert.equal(leg1.nextMissionId, 'photo-correspondent');
  assert.equal(leg1.isExpeditionComplete, false);

  // Leg 2: photo completes -> final leg is the detective mission
  missionSession.startMission('photo-correspondent', 'skyline', exp.id, 1);
  const leg2 = missionSession.completeCurrentMission(95);
  assert.equal(leg2.nextMissionId, 'detective-missing-broadcast');

  // Leg 3: detective completes the expedition and pays the finale bonus
  const coinsBefore = travelerState.getState().coins;
  const xpBefore = travelerState.getState().xp;
  missionSession.startMission('detective-missing-broadcast', 'forensic-grid', exp.id, 2);
  const leg3 = missionSession.completeCurrentMission(4000);
  assert.equal(leg3.isExpeditionComplete, true);
  assert.ok(travelerState.getState().coins > coinsBefore, 'finale bonus coins awarded');
  assert.ok(travelerState.getState().xp > xpBefore, 'finale bonus xp awarded');
  assert.ok(travelerState.getState().completedExpeditions.includes(exp.id));

  // The expedition is cleared once complete
  assert.equal(missionSession.getActiveExpedition(), null);
});
