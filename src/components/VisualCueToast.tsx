import { useEffect, useRef, useState } from 'react';
import { Ear } from 'lucide-react';
import { settingsStore } from '../services/settingsStore';

/**
 * Visual equivalent for sound-only cues: listens for `world-radio-cue` events
 * dispatched by the audio engine and shows a small, polite badge so players
 * who can't hear (or have muted) the effects still know one just played.
 * The badge replaces itself when a new cue fires and hides after 1.6 s.
 */
export function VisualCueToast() {
  const [cue, setCue] = useState<string>('');
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const onCue = (e: Event) => {
      const detail = (e as CustomEvent<{ label?: string }>).detail;
      if (!detail?.label) return;
      setCue(detail.label);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setCue(''), 1600);
    };
    window.addEventListener('world-radio-cue', onCue);
    return () => {
      window.removeEventListener('world-radio-cue', onCue);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!cue || !settingsStore.cuesEnabled()) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-24 right-3 sm:right-6 z-40 pointer-events-none flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-emerald-400/40 shadow-lg"
    >
      <Ear className="w-4 h-4 text-emerald-400" />
      <span className="text-[11px] font-mono font-bold text-emerald-300">{cue}</span>
    </div>
  );
}
