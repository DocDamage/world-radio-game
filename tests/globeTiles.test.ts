import { test } from 'node:test';
import assert from 'node:assert/strict';

// The service module is side-effect free at import time (the heavy 3D stack is
// only pulled in dynamically by createGlobeTilesLayer), so it loads in Node.
const {
  ECEF_TO_GLOBE_AXIS,
  ECEF_TO_GLOBE_ANGLE_RAD,
  WGS84_SEMI_MAJOR_AXIS_METERS,
  tilesScaleForGlobeRadius,
  isGlobeTilesKeyUsable,
  reduceGlobeTilesStatus,
} = await import('../src/services/globeTiles.ts');

// Rodrigues rotation, used to validate the ECEF→globe axis/angle spec without
// importing three.js.
function rotate(axis: readonly [number, number, number], angle: number, v: readonly [number, number, number]): [number, number, number] {
  const len = Math.hypot(...axis);
  const k: [number, number, number] = [axis[0] / len, axis[1] / len, axis[2] / len];
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dot = k[0] * v[0] + k[1] * v[1] + k[2] * v[2];
  const cross: [number, number, number] = [
    k[1] * v[2] - k[2] * v[1],
    k[2] * v[0] - k[0] * v[2],
    k[0] * v[1] - k[1] * v[0]
  ];
  return [
    v[0] * cos + cross[0] * sin + k[0] * dot * (1 - cos),
    v[1] * cos + cross[1] * sin + k[1] * dot * (1 - cos),
    v[2] * cos + cross[2] * sin + k[2] * dot * (1 - cos)
  ];
}

function assertVecClose(actual: [number, number, number], expected: readonly [number, number, number]) {
  const dist = Math.hypot(actual[0] - expected[0], actual[1] - expected[1], actual[2] - expected[2]);
  assert.ok(dist < 1e-9, `expected [${expected}], got [${actual}] (distance ${dist})`);
}

test('ECEF→globe rotation maps the ECEF basis onto globe.gl axes', () => {
  // ECEF: +X = 0°N 0°E, +Y = 0°N 90°E, +Z = north pole
  // globe.gl: +Z = 0°N 0°E, +X = 0°N 90°E, +Y = north pole
  const ex = rotate(ECEF_TO_GLOBE_AXIS, ECEF_TO_GLOBE_ANGLE_RAD, [1, 0, 0]);
  const ey = rotate(ECEF_TO_GLOBE_AXIS, ECEF_TO_GLOBE_ANGLE_RAD, [0, 1, 0]);
  const ez = rotate(ECEF_TO_GLOBE_AXIS, ECEF_TO_GLOBE_ANGLE_RAD, [0, 0, 1]);

  assertVecClose(ex, [0, 0, 1]); // 0°N 0°E → +Z
  assertVecClose(ey, [1, 0, 0]); // 0°N 90°E → +X
  assertVecClose(ez, [0, 1, 0]); // north pole → +Y
});

test('tilesScaleForGlobeRadius converts ECEF meters into globe units', () => {
  const scale = tilesScaleForGlobeRadius(100);
  assert.ok(Math.abs(scale - 100 / WGS84_SEMI_MAJOR_AXIS_METERS) < 1e-12);
  assert.ok(scale > 1.5e-5 && scale < 1.6e-5); // ≈1.5686e-5 units per meter

  assert.throws(() => tilesScaleForGlobeRadius(0), /positive finite/);
  assert.throws(() => tilesScaleForGlobeRadius(-100), /positive finite/);
  assert.throws(() => tilesScaleForGlobeRadius(Number.NaN), /positive finite/);
});

test('isGlobeTilesKeyUsable rejects empty and whitespace-only keys', () => {
  assert.equal(isGlobeTilesKeyUsable(null), false);
  assert.equal(isGlobeTilesKeyUsable(undefined), false);
  assert.equal(isGlobeTilesKeyUsable(''), false);
  assert.equal(isGlobeTilesKeyUsable('    '), false);
  assert.equal(isGlobeTilesKeyUsable('AIzaSyExample'), true);
});

test('status reducer walks the happy path disabled → loading → ready', () => {
  let s = reduceGlobeTilesStatus({ phase: 'disabled' }, { type: 'enable' });
  assert.deepEqual(s, { phase: 'loading' });

  s = reduceGlobeTilesStatus(s, { type: 'root-loaded' });
  assert.deepEqual(s, { phase: 'ready' });

  s = reduceGlobeTilesStatus(s, { type: 'attribution', attribution: 'Data © Google' });
  assert.deepEqual(s, { phase: 'ready', attribution: 'Data © Google' });

  // Re-publishing the same attribution is a no-op (stable object identity).
  const unchanged = reduceGlobeTilesStatus(s, { type: 'attribution', attribution: 'Data © Google' });
  assert.equal(unchanged, s);

  s = reduceGlobeTilesStatus(s, { type: 'disable' });
  assert.deepEqual(s, { phase: 'disabled' });
});

test('root-loaded is ignored unless the layer is loading', () => {
  const s = reduceGlobeTilesStatus({ phase: 'disabled' }, { type: 'root-loaded' });
  assert.deepEqual(s, { phase: 'disabled' });
});

test('child tile failures never break the layer, root failures do', () => {
  let s: ReturnType<typeof reduceGlobeTilesStatus> = { phase: 'disabled' };
  s = reduceGlobeTilesStatus(s, { type: 'enable' });
  s = reduceGlobeTilesStatus(s, { type: 'tile-error', message: '403 on one mesh' });
  assert.equal(s.phase, 'loading'); // streaming tolerates individual tile errors

  s = reduceGlobeTilesStatus(s, { type: 'root-loaded' });
  s = reduceGlobeTilesStatus(s, { type: 'tile-error', message: '403 on one mesh' });
  assert.equal(s.phase, 'ready'); // still fine once ready

  s = reduceGlobeTilesStatus(s, {
    type: 'fatal-error',
    message: 'Could not load Google 3D Tiles (401).'
  });
  assert.deepEqual(s, { phase: 'error', message: 'Could not load Google 3D Tiles (401).' });
});

test('attribution updates are ignored while not ready', () => {
  const s = reduceGlobeTilesStatus({ phase: 'loading' }, { type: 'attribution', attribution: 'x' });
  assert.deepEqual(s, { phase: 'loading' });
});
