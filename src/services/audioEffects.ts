// Web Audio API Synthesizer for Analog Radio Effects
class RadioAudioEngine {
  private audioCtx: AudioContext | null = null;

  private init() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
  }

  // Plays a burst of analog tuning white noise
  public playStaticBurst(durationSeconds = 0.35, maxGain = 0.15) {
    try {
      this.init();
      if (!this.audioCtx) return;
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
      filter.frequency.value = 1200;
      filter.Q.value = 3.0;

      const gain = this.audioCtx.createGain();
      gain.gain.setValueAtTime(maxGain, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + durationSeconds);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.audioCtx.destination);

      whiteNoise.start();
    } catch {
      // Audio autoplay policy fallback
    }
  }

  // Sonar radar ping for Signal Scavenger Hunt
  public playRadarPing(frequency = 880, duration = 0.15) {
    try {
      this.init();
      if (!this.audioCtx) return;
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
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch {
      // Ignore
    }
  }

  // Bicycle Bell ("Ding-Ding!")
  public playBikeBell() {
    try {
      this.init();
      if (!this.audioCtx) return;
      [2200, 2600].forEach((freq, idx) => {
        setTimeout(() => {
          if (!this.audioCtx) return;
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
          gain.gain.setValueAtTime(0.18, this.audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.35);
          osc.connect(gain);
          gain.connect(this.audioCtx.destination);
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
    try {
      this.init();
      if (!this.audioCtx) return;
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
      gain.connect(this.audioCtx.destination);
      noise.start();
    } catch {
      // Ignore
    }
  }

  // Cash register / Store purchase chime
  public playCoinSound() {
    try {
      this.init();
      if (!this.audioCtx) return;
      [987.77, 1318.51].forEach((freq, idx) => {
        setTimeout(() => {
          if (!this.audioCtx) return;
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
          gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.25);
          osc.connect(gain);
          gain.connect(this.audioCtx.destination);
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
    try {
      this.init();
      if (!this.audioCtx) return;
      this.playStaticBurst(0.08, 0.2);
      setTimeout(() => this.playStaticBurst(0.06, 0.15), 100);
    } catch {
      // Ignore
    }
  }

  // Victory fanfare chime when station is discovered or guessed
  public playTriumphChime(_volume = 0.25) {
    try {
      this.init();
      if (!this.audioCtx) return;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          this.playRadarPing(freq, 0.25);
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
      if (!this.audioCtx) return;
      this.playRadarPing(1600, 0.03);
    } catch {
      // Ignore
    }
  }
}

export const soundEffects = new RadioAudioEngine();
