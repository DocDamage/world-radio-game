/**
 * App-wide accessibility & playback settings, persisted to localStorage.
 *
 * Values honor the improvement plan's §3 accessibility requirements:
 * reduced motion, reduced flashes, adjustable screen shake, visual
 * equivalents for sound-only cues, and separate radio/effects volumes.
 */

export type ScreenShakeSetting = 'off' | 'reduced' | 'full';

export interface AppSettings {
  /** Kill CSS animations/transitions, auto-rotation, and confetti. */
  reducedMotion: boolean;
  /** Suppress strobing/flashing effects such as confetti bursts. */
  reducedFlashes: boolean;
  /** Scale factor applied to camera shake in the mini games. */
  screenShake: ScreenShakeSetting;
  /** Show a small visual badge whenever a sound effect plays. */
  visualSoundCues: boolean;
  /** Radio stream volume, 0–1 (independent of sound effects). */
  radioVolume: number;
  /** Synthesized sound-effect volume, 0–1. */
  effectsVolume: number;
}

const STORAGE_KEY = 'world_radio_settings_v1';
const LEGACY_VOLUME_KEY = 'world_radio_volume';

function detectDefaultReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function clampVolume(v: unknown): number | null {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(1, n));
}

function loadSettings(): AppSettings {
  // Migrate the radio volume the player bar used to own.
  const legacyVolume = clampVolume(localStorage.getItem(LEGACY_VOLUME_KEY));

  const defaults: AppSettings = {
    reducedMotion: detectDefaultReducedMotion(),
    reducedFlashes: false,
    screenShake: 'full',
    visualSoundCues: false,
    radioVolume: legacyVolume ?? 0.85,
    effectsVolume: 1
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const saved = JSON.parse(raw) as Partial<AppSettings>;
    const radioVolume = clampVolume(saved.radioVolume);
    const effectsVolume = clampVolume(saved.effectsVolume);
    return {
      reducedMotion: typeof saved.reducedMotion === 'boolean' ? saved.reducedMotion : defaults.reducedMotion,
      reducedFlashes: typeof saved.reducedFlashes === 'boolean' ? saved.reducedFlashes : defaults.reducedFlashes,
      screenShake:
        saved.screenShake === 'off' || saved.screenShake === 'reduced' || saved.screenShake === 'full'
          ? saved.screenShake
          : defaults.screenShake,
      visualSoundCues: typeof saved.visualSoundCues === 'boolean' ? saved.visualSoundCues : defaults.visualSoundCues,
      radioVolume: radioVolume ?? defaults.radioVolume,
      effectsVolume: effectsVolume ?? defaults.effectsVolume
    };
  } catch {
    return defaults;
  }
}

type Listener = () => void;

class SettingsStore {
  private settings: AppSettings = loadSettings();
  private listeners = new Set<Listener>();

  getState(): AppSettings {
    return this.settings;
  }

  update(patch: Partial<AppSettings>): void {
    const next: AppSettings = { ...this.settings };
    if (typeof patch.reducedMotion === 'boolean') next.reducedMotion = patch.reducedMotion;
    if (typeof patch.reducedFlashes === 'boolean') next.reducedFlashes = patch.reducedFlashes;
    if (patch.screenShake === 'off' || patch.screenShake === 'reduced' || patch.screenShake === 'full') {
      next.screenShake = patch.screenShake;
    }
    if (typeof patch.visualSoundCues === 'boolean') next.visualSoundCues = patch.visualSoundCues;
    const radio = clampVolume(patch.radioVolume);
    if (radio !== null) next.radioVolume = radio;
    const effects = clampVolume(patch.effectsVolume);
    if (effects !== null) next.effectsVolume = effects;

    this.settings = next;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage may be unavailable (private mode); keep in-memory settings.
    }
    for (const fn of this.listeners) fn();
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Multiplier for camera shake in game loops: 0 (off), 0.5 (reduced), 1 (full). */
  getShakeScale(): number {
    if (this.settings.screenShake === 'off') return 0;
    if (this.settings.screenShake === 'reduced') return 0.5;
    return 1;
  }

  /** True when celebratory particle bursts should be skipped. */
  celebrationBlocked(): boolean {
    return this.settings.reducedMotion || this.settings.reducedFlashes;
  }

  /** True when the audio engine should emit visual cue events. */
  cuesEnabled(): boolean {
    return this.settings.visualSoundCues;
  }
}

export const settingsStore = new SettingsStore();
