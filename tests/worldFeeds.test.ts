import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeKp, distanceKm } from '../src/services/worldFeeds.ts';

test('describeKp maps Kp values to storm interpretations', () => {
  assert.equal(describeKp(0), 'Quiet — no geomagnetic activity');
  assert.equal(describeKp(3.67), 'Quiet — no geomagnetic activity');
  assert.equal(describeKp(4), 'Unsettled — faint aurora possible at high latitudes');
  assert.equal(describeKp(5), 'Geomagnetic storm — aurora visible at high latitudes');
  assert.equal(describeKp(6.33), 'Geomagnetic storm — aurora visible at high latitudes');
  assert.equal(describeKp(7), 'Strong storm — vivid aurora, radio/GPS disturbance likely');
  assert.equal(describeKp(8), 'Extreme storm — aurora visible at low latitudes');
  assert.equal(describeKp(9), 'Extreme storm — aurora visible at low latitudes');
});

test('distanceKm computes haversine distances', () => {
  // Same point is zero distance
  assert.equal(distanceKm(35.6595, 139.7005, 35.6595, 139.7005), 0);

  // Tokyo (Shibuya) to Paris (Eiffel) is roughly 9,700 km
  const d = distanceKm(35.6595, 139.7005, 48.8584, 2.2945);
  assert.ok(d > 9400 && d < 10000, `expected ~9,700 km, got ${d}`);

  // One degree of latitude is ~111 km
  assert.equal(distanceKm(0, 0, 1, 0), 111);
});
