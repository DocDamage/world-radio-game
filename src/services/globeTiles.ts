/**
 * Google Photorealistic 3D Tiles integration for the globe.gl viewport.
 *
 * The heavy rendering stack (3d-tiles-renderer plus the Draco/KTX2 codecs) is
 * imported dynamically when a layer is created. That keeps it out of the main
 * bundle and lets this module load cleanly under Node for the unit tests in
 * tests/globeTiles.test.ts — everything exported at module scope is pure
 * geometry / state logic with zero side effects.
 */
import type * as THREE from 'three';

/** Root of Google's Photorealistic 3D Tiles tileset (Map Tiles API). */
export const GOOGLE_TILES_URL = 'https://tile.googleapis.com/v1/3dtiles/root.json';

/** WGS84 semi-major axis in meters — the ellipsoid Google's tiles are authored on. */
export const WGS84_SEMI_MAJOR_AXIS_METERS = 6_378_137;

/** three.js version whose bundled Draco/KTX2 decoder builds we stream from the CDN. */
export const THREE_DECODER_VERSION = '0.186.0';

export const DRACO_DECODER_PATH = `https://cdn.jsdelivr.net/npm/three@${THREE_DECODER_VERSION}/examples/jsm/libs/draco/gltf/`;
export const BASIS_TRANSCODER_PATH = `https://cdn.jsdelivr.net/npm/three@${THREE_DECODER_VERSION}/examples/jsm/libs/basis/`;

/**
 * Rotation mapping the tileset's ECEF frame onto the globe.gl scene frame:
 *
 *   ECEF (3D tiles)        globe.gl
 *   +Z = north pole   →    +Y = north pole
 *   +X = 0°N 0°E      →    +Z = 0°N 0°E
 *   +Y = 0°N 90°E     →    +X = 0°N 90°E
 *
 * Stored as an axis/angle pair (a −120° rotation about the (1,1,1) diagonal)
 * so the spec stays verifiable in Node without importing three.js.
 */
export const ECEF_TO_GLOBE_AXIS: readonly [number, number, number] = [1, 1, 1];
export const ECEF_TO_GLOBE_ANGLE_RAD = -Math.PI * (2 / 3);

/** Uniform scale converting tile meters into globe.gl world units. */
export function tilesScaleForGlobeRadius(globeRadius: number): number {
  if (!Number.isFinite(globeRadius) || globeRadius <= 0) {
    throw new Error(`globeRadius must be a positive finite number (got ${globeRadius})`);
  }
  return globeRadius / WGS84_SEMI_MAJOR_AXIS_METERS;
}

/** A key is usable once it contains any non-whitespace character. */
export function isGlobeTilesKeyUsable(apiKey: string | null | undefined): boolean {
  return typeof apiKey === 'string' && apiKey.trim().length > 0;
}

/** Lifecycle of the tiles layer, surfaced to the UI. */
export type GlobeTilesStatus =
  | { phase: 'disabled' }
  | { phase: 'loading' }
  | { phase: 'ready'; attribution?: string }
  | { phase: 'error'; message: string };

export type GlobeTilesEvent =
  | { type: 'enable' }
  | { type: 'disable' }
  | { type: 'root-loaded' }
  | { type: 'tile-error'; message: string }
  | { type: 'fatal-error'; message: string }
  | { type: 'attribution'; attribution: string };

/** Pure reducer driving GlobeTilesStatus from layer events. */
export function reduceGlobeTilesStatus(status: GlobeTilesStatus, event: GlobeTilesEvent): GlobeTilesStatus {
  switch (event.type) {
    case 'enable':
      return status.phase === 'disabled' ? { phase: 'loading' } : status;
    case 'disable':
      return { phase: 'disabled' };
    case 'root-loaded':
      return status.phase === 'loading' ? { phase: 'ready' } : status;
    case 'tile-error':
      // Individual tiles failing while streaming is expected (view moves,
      // quota throttling); only a root tileset failure flips to error.
      return status;
    case 'fatal-error':
      return { phase: 'error', message: event.message };
    case 'attribution':
      if (status.phase === 'ready' && event.attribution !== status.attribution) {
        return { ...status, attribution: event.attribution };
      }
      return status;
  }
}

/** Structural slice of the globe.gl API the tiles layer needs. */
export interface GlobeView {
  scene(): THREE.Scene;
  camera(): THREE.PerspectiveCamera;
  renderer(): THREE.WebGLRenderer;
  controls(): { autoRotate: boolean; minDistance: number };
  getGlobeRadius(): number;
  globeMaterial(): THREE.Material;
}

/** Handle over a live tiles layer; call dispose() to tear it down. */
export interface GlobeTilesLayer {
  dispose(): void;
}

export interface CreateGlobeTilesLayerOptions {
  apiKey: string;
  globe: GlobeView;
  onStatus?: (status: GlobeTilesStatus) => void;
}

/**
 * Creates a Google Photorealistic 3D Tiles layer inside a globe.gl viewport.
 *
 * The tileset is authored in ECEF meters on the WGS84 ellipsoid, so the
 * renderer's group is wrapped in an outer group that rotates the ECEF frame
 * onto globe.gl's and scales meters down to the globe's 100-unit radius
 * (3d-tiles-renderer explicitly supports transformed containers — its error
 * and frustum math run through the group's matrixWorldInverse).
 */
export async function createGlobeTilesLayer(options: CreateGlobeTilesLayerOptions): Promise<GlobeTilesLayer> {
  const { apiKey, globe, onStatus } = options;
  if (!isGlobeTilesKeyUsable(apiKey)) {
    throw new Error('A Google Maps Platform API key with the Map Tiles API enabled is required.');
  }

  let status: GlobeTilesStatus = reduceGlobeTilesStatus({ phase: 'disabled' }, { type: 'enable' });
  const emit = (event: GlobeTilesEvent) => {
    status = reduceGlobeTilesStatus(status, event);
    onStatus?.(status);
  };
  onStatus?.(status);

  // Heavy stack: only pulled in when the user actually enables the layer.
  const [
    { TilesRenderer },
    { GoogleCloudAuthPlugin, GLTFExtensionsPlugin },
    THREE,
    { DRACOLoader },
    { KTX2Loader },
  ] = await Promise.all([
    import('3d-tiles-renderer'),
    import('3d-tiles-renderer/plugins'),
    import('three'),
    import('three/examples/jsm/loaders/DRACOLoader.js'),
    import('three/examples/jsm/loaders/KTX2Loader.js'),
  ]);

  const scene = globe.scene();
  const camera = globe.camera();
  const renderer = globe.renderer();
  const controls = globe.controls();
  const globeRadius = globe.getGlobeRadius();
  const scale = tilesScaleForGlobeRadius(globeRadius);

  const dracoLoader = new DRACOLoader().setDecoderPath(DRACO_DECODER_PATH);
  const ktxLoader = new KTX2Loader().setTranscoderPath(BASIS_TRANSCODER_PATH).detectSupport(renderer);

  const tiles = new TilesRenderer(GOOGLE_TILES_URL);
  tiles.registerPlugin(new GoogleCloudAuthPlugin({ apiToken: apiKey.trim() }));
  tiles.registerPlugin(new GLTFExtensionsPlugin({ dracoLoader, ktxLoader }));

  // ECEF meters → globe.gl units, with the frame rotation documented above.
  const alignGroup = new THREE.Group();
  alignGroup.quaternion.setFromAxisAngle(
    new THREE.Vector3(...ECEF_TO_GLOBE_AXIS).normalize(),
    ECEF_TO_GLOBE_ANGLE_RAD
  );
  alignGroup.scale.setScalar(scale);
  alignGroup.add(tiles.group);
  scene.add(alignGroup);

  tiles.setCamera(camera);
  tiles.setResolutionFromRenderer(camera, renderer);

  // While the photorealistic layer is up: hide the textured sphere (the tiles
  // bring their own imagery and terrain), stop the spin for street-level
  // navigation, and relax the surface-adjacent camera limits (~200 m altitude).
  const globeMaterial = globe.globeMaterial();
  const prevGlobeVisible = globeMaterial.visible;
  const prevAutoRotate = controls.autoRotate;
  const prevMinDistance = controls.minDistance;
  const prevNear = camera.near;
  globeMaterial.visible = false;
  controls.autoRotate = false;
  controls.minDistance = globeRadius + (200 / WGS84_SEMI_MAJOR_AXIS_METERS) * globeRadius;
  camera.near = Math.min(prevNear, scale * 10); // ~10 m of tile geometry in front of the lens
  camera.updateProjectionMatrix();

  const onLoadRootTileset = () => emit({ type: 'root-loaded' });
  const onLoadError = (event: { tile: unknown; error: unknown }) => {
    const raw = event.error instanceof Error ? event.error.message : String(event.error ?? 'unknown error');
    // A null tile means the root tileset itself failed (auth, quota, network).
    emit(
      event.tile == null
        ? {
            type: 'fatal-error',
            message: `Could not load Google 3D Tiles (${raw}). Check that your key has the Map Tiles API enabled and that billing is active.`
          }
        : { type: 'tile-error', message: raw }
    );
  };
  tiles.addEventListener('load-root-tileset', onLoadRootTileset);
  tiles.addEventListener('load-error', onLoadError);

  // Google's terms require visible attribution; entries accumulate as tiles
  // stream in, so poll while active and republish when they change.
  let lastAttribution = '';
  const attributionTimer = window.setInterval(() => {
    const parts = tiles
      .getAttributions()
      .map((entry) => String(entry.value ?? '').trim())
      .filter(Boolean);
    const attribution = Array.from(new Set(parts)).join(' • ');
    if (attribution !== lastAttribution) {
      lastAttribution = attribution;
      emit({ type: 'attribution', attribution });
    }
  }, 2_000);

  // globe.gl owns its render loop; a parallel frame loop keeps tile scheduling
  // in step without reaching into the globe's internals.
  let rafId = requestAnimationFrame(function tick() {
    tiles.update();
    rafId = requestAnimationFrame(tick);
  });

  const onResize = () => {
    tiles.setResolutionFromRenderer(camera, renderer);
  };
  window.addEventListener('resize', onResize);

  return {
    dispose() {
      window.clearInterval(attributionTimer);
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      tiles.removeEventListener('load-root-tileset', onLoadRootTileset);
      tiles.removeEventListener('load-error', onLoadError);
      alignGroup.removeFromParent();
      // Also disposes plugins; GLTFExtensionsPlugin releases the codec loaders.
      tiles.dispose();
      globeMaterial.visible = prevGlobeVisible;
      controls.autoRotate = prevAutoRotate;
      controls.minDistance = prevMinDistance;
      camera.near = prevNear;
      camera.updateProjectionMatrix();
      emit({ type: 'disable' });
    }
  };
}

