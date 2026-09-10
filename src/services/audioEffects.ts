// Web Audio API Synthesizer for Analog Radio Effects
import { settingsStore } from './settingsStore.ts';

class RadioAudioEngine {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  private init() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
      // All effects route through a master gain so the effects volume
      // setting can be applied without touching each synth call.
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.value = settingsStore.getState().effectsVolume;
      this.masterGain.connect(this.audioCtx.destination);
    }
  }

  /** Apply the effects volume setting (0–1). Safe to call before first play. */
  public setVolume(volume: number) {
    try {
      this.init();
      if (this.masterGain && this.audioCtx) {
        this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
      }
    } catch {
      // Audio may be unavailable; nothing to adjust.
    }
  }

  /** Visual equivalent for this sound cue, when the setting is enabled. */
  private cue(label: string) {
    if (!settingsStore.cuesEnabled()) return;
    try {
      window.dispatchEvent(new CustomEvent('world-radio-cue', { detail: { label } }));
    } catch {
      // Never let cue emission break audio playback.
    }
  }

  // Plays a burst of analog tuning white noise
  public playStaticBurst(durationSeconds = 0.35, maxGain = 0.15, emitCue = true) {
    if (emitCue) this.cue('Static burst');
    try {
      this.init();
      if (!this.audioCtx || !this.masterGain) return;
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const bufferSize = this.audioCtx.sampleRate * durationSeconds;
      const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.audioCtx.createBufferSource();
      whiteNoise.buffer = buffer;

      // Bandpass filter to sound like an AM/FM tuner
      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1000, this.audioCtx.currentTime);
      filter.Q.setValueAtTime(1.5, this.audioCtx.currentTime);

      const gain = this.audioCtx.createGain();
      gain.gain.setValueAtTime(maxGain, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + durationSeconds);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      whiteNoise.start();
    } catch {
      // AudioContext may be suspended or blocked by user gesture policy
    }
  }

  // Sonar radar ping for Signal Scavenger Hunt
  public playRadarPing(frequency = 880, duration = 0.15, emitCue = true) {
    if (emitCue) this.cue('Radar ping');
    try {
      this.init();
      if (!this.audioCtx || !this.masterGain) return;
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(frequency * 0.5, this.audioCtx.currentTime + duration);

      gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch {
      // Ignore
    }
  }

  // Bicycle Bell ("Ding-Ding!")
  public playBikeBell() {
    this.cue('Bike bell');
    try {
      this.init();
      if (!this.audioCtx || !this.masterGain) return;
      [2200, 2600].forEach((freq, idx) => {
        setTimeout(() => {
          if (!this.audioCtx || !this.masterGain) return;
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
          gain.gain.setValueAtTime(0.18, this.audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.35);
          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start();
          osc.stop(this.audioCtx.currentTime + 0.35);
        }, idx * 110);
      });
    } catch {
      // Ignore
    }
  }

  // Water splash / fishing bobber drop
  public playSplash() {
    this.cue('Splash');
    try {
      this.init();
      if (!this.audioCtx || !this.masterGain) return;
      const bufferSize = this.audioCtx.sampleRate * 0.3;
      const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
      }
      const noise = this.audioCtx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, this.audioCtx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(150, this.audioCtx.currentTime + 0.3);
      const gain = this.audioCtx.createGain();
      gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      noise.start();
    } catch {
      // Ignore
    }
  }

  // Cash register / Store purchase chime
  public playCoinSound() {
    this.cue('Coin chime');
    try {
      this.init();
      if (!this.audioCtx || !this.masterGain) return;
      [987.77, 1318.51].forEach((freq, idx) => {
        setTimeout(() => {
          if (!this.audioCtx || !this.masterGain) return;
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
          gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.25);
          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start();
          osc.stop(this.audioCtx.currentTime + 0.25);
        }, idx * 80);
      });
    } catch {
      // Ignore
    }
  }

  // Camera shutter snap
  public playCameraShutter() {
    this.cue('Camera shutter');
    try {
      this.init();
      if (!this.audioCtx || !this.masterGain) return;
      this.playStaticBurst(0.08, 0.2, false);
      setTimeout(() => this.playStaticBurst(0.06, 0.15, false), 100);
    } catch {
      // Ignore
    }
  }

  // Victory fanfare chime when station is discovered or guessed
  public playTriumphChime(_volume = 0.25) {
    this.cue('Victory fanfare');
    try {
      this.init();
      if (!this.audioCtx || !this.masterGain) return;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          this.playRadarPing(freq, 0.25, false);
        }, idx * 100);
      });
    } catch {
      // Ignore
    }
  }

  // Snappy retro UI button / rotary click
  public playUiClick(_volume = 0.1) {
    try {
      this.init();
      if (!this.audioCtx || !this.masterGain) return;
      this.playRadarPing(1600, 0.03, false);
    } catch {
      // Ignore
    }
  }

  // Crowd cheer / rooftop applause synthesis
  public playCrowdCheer(duration = 2.0, maxGain = 0.18) {
    this.cue('Crowd cheer');
    try {
      this.init();
      if (!this.audioCtx || !this.masterGain) return;
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

      const bufferSize = this.audioCtx.sampleRate * duration;
      const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        // Modulated noise for human applause texture
        const t = i / this.audioCtx.sampleRate;
        const envelope = Math.sin((t / duration) * Math.PI);
        const flutter = 0.7 + 0.3 * Math.sin(t * 30) * Math.sin(t * 12);
        data[i] = (Math.random() * 2 - 1) * envelope * flutter;
      }

      const noise = this.audioCtx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, this.audioCtx.currentTime);
      filter.Q.setValueAtTime(1.2, this.audioCtx.currentTime);

      const gain = this.audioCtx.createGain();
      gain.gain.setValueAtTime(maxGain, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      noise.start();
    } catch {
      // Ignore
    }
  }

  // Cooking hot pan sizzle
  public playSkilletSizzle(duration = 0.8, maxGain = 0.14) {
    this.cue('Sizzle');
    try {
      this.init();
      if (!this.audioCtx || !this.masterGain) return;
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

      const bufferSize = this.audioCtx.sampleRate * duration;
      const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (0.8 + Math.random() * 0.4);
      }

      const noise = this.audioCtx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(2200, this.audioCtx.currentTime);

      const gain = this.audioCtx.createGain();
      gain.gain.setValueAtTime(maxGain, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      noise.start();
    } catch {
      // Ignore
    }
  }

  // Mechanical fishing reel ratchet click
  public playReelClick() {
    this.cue('Reel click');
    try {
      this.init();
      if (!this.audioCtx || !this.masterGain) return;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(2800, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(0.06, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.02);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.02);
    } catch {
      // Ignore
    }
  }
}

export const soundEffects = new RadioAudioEngine();
