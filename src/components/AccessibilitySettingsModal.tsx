import React, { useEffect, useState } from 'react';
import { X, Accessibility, Vibrate, Zap, Ear, Volume2, Music, Sparkles } from 'lucide-react';
import { useModalA11y } from '../hooks/useModalA11y';
import { settingsStore, type AppSettings, type ScreenShakeSetting } from '../services/settingsStore';
import { soundEffects } from '../services/audioEffects';

interface AccessibilitySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  icon
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 rounded-2xl p-3">
      <div className="flex items-start gap-3 min-w-0">
        <div className="p-2 bg-slate-950 text-emerald-400 rounded-xl border border-slate-800 shrink-0">{icon}</div>
        <div className="min-w-0">
          <div className="text-xs font-bold text-slate-100">{label}</div>
          <div className="text-[10px] text-slate-400 leading-relaxed">{description}</div>
        </div>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition shrink-0 ${checked ? 'bg-emerald-500' : 'bg-slate-700'}`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`}
        />
      </button>
    </div>
  );
}

export const AccessibilitySettingsModal: React.FC<AccessibilitySettingsModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<AppSettings>(() => settingsStore.getState());

  useEffect(() => {
    return settingsStore.subscribe(() => setSettings(settingsStore.getState()));
  }, []);

  const update = (patch: Partial<AppSettings>) => settingsStore.update(patch);

  // Shared modal a11y: Escape to close, focus trap, focus restore
  const { containerRef: dialogRef, dialogProps } = useModalA11y({ isOpen, onClose });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md">
      <div
        ref={dialogRef}
        {...dialogProps}
        aria-label="Accessibility and playback settings"
        className="relative w-full max-w-lg bg-slate-950 border border-emerald-400/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-900/90 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-400/20 text-emerald-400 border border-emerald-400/30 rounded-2xl">
              <Accessibility className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-wide text-slate-100 uppercase">Accessibility &amp; Sound</h2>
              <p className="text-[11px] text-slate-400">Comfort and playback controls — saved for future visits</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 space-y-3">
          <ToggleRow
            label="Reduced motion"
            description="Stops globe auto-rotation, celebratory particles, and CSS animations."
            checked={settings.reducedMotion}
            onChange={next => update({ reducedMotion: next })}
            icon={<Vibrate className="w-4 h-4" />}
          />
          <ToggleRow
            label="Reduce flashes"
            description="Skips bright, fast-flashing effects like confetti bursts."
            checked={settings.reducedFlashes}
            onChange={next => update({ reducedFlashes: next })}
            icon={<Zap className="w-4 h-4" />}
          />
          <ToggleRow
            label="Visual sound cues"
            description="Shows a small badge whenever a sound effect plays — a visual equivalent for audio-only cues."
            checked={settings.visualSoundCues}
            onChange={next => update({ visualSoundCues: next })}
            icon={<Ear className="w-4 h-4" />}
          />

          {/* Screen shake */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-950 text-emerald-400 rounded-xl border border-slate-800 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-100">Screen shake</div>
                <div className="text-[10px] text-slate-400">Camera shake strength in the mini games.</div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Screen shake strength">
              {(['off', 'reduced', 'full'] as ScreenShakeSetting[]).map(level => (
                <button
                  key={level}
                  role="radio"
                  aria-checked={settings.screenShake === level}
                  onClick={() => update({ screenShake: level })}
                  className={`px-3 py-2 rounded-xl text-xs font-bold capitalize transition border ${
                    settings.screenShake === level
                      ? 'bg-emerald-400 text-slate-950 border-emerald-300'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Volumes */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-100">
                  <Music className="w-4 h-4 text-lime-400" /> Radio volume
                </div>
                <span className="text-[10px] font-mono text-slate-400">{Math.round(settings.radioVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.radioVolume}
                onChange={e => update({ radioVolume: Number(e.target.value) })}
                aria-label="Radio volume"
                className="w-full accent-lime-400"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-100">
                  <Volume2 className="w-4 h-4 text-emerald-400" /> Sound effects volume
                </div>
                <span className="text-[10px] font-mono text-slate-400">{Math.round(settings.effectsVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.effectsVolume}
                onChange={e => {
                  update({ effectsVolume: Number(e.target.value) });
                  soundEffects.setVolume(Number(e.target.value));
                }}
                aria-label="Sound effects volume"
                className="w-full accent-emerald-400"
              />
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Radio and sound effects have separate volume controls, so music keeps playing at your preferred level while game
              cues can be quieter or muted.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
