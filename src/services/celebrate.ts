import confetti from 'canvas-confetti';
import type { Options } from 'canvas-confetti';
import { settingsStore } from './settingsStore.ts';

/**
 * Confetti wrapper that respects the accessibility settings: particle bursts
 * are a fast-moving, flashing effect, so they are skipped entirely when the
 * player asked for reduced motion or reduced flashes.
 */
export function celebrate(options: Options): void {
  if (settingsStore.celebrationBlocked()) return;
  try {
    confetti(options);
  } catch {
    // canvas-confetti failures are never fatal
  }
}
