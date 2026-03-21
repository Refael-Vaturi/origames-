// Procedural epic background music for Iron Dome that intensifies with wave level

export class GameMusic {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bassOsc: OscillatorNode | null = null;
  private padOscs: OscillatorNode[] = [];
  private bassGain: GainNode | null = null;
  private padGain: GainNode | null = null;
  private drumInterval: number | null = null;
  private playing = false;
  private intensity = 1; // 1-10

  start(wave: number = 1) {
    if (this.playing) {
      this.setIntensity(wave);
      return;
    }

    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.12;
      this.masterGain.connect(this.ctx.destination);

      this.intensity = Math.min(10, wave);
      this.startBass();
      this.startPads();
      this.startDrums();
      this.playing = true;
    } catch {}
  }

  private startBass() {
    if (!this.ctx || !this.masterGain) return;
    this.bassGain = this.ctx.createGain();
    this.bassGain.gain.value = 0.4;
    this.bassGain.connect(this.masterGain);

    // Sub bass drone
    this.bassOsc = this.ctx.createOscillator();
    this.bassOsc.type = 'sawtooth';
    this.bassOsc.frequency.value = 55; // A1

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 120;
    filter.Q.value = 8;

    this.bassOsc.connect(filter);
    filter.connect(this.bassGain);
    this.bassOsc.start();

    // Bass pattern LFO
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 0.5 + this.intensity * 0.15;
    lfoGain.gain.value = 20;
    lfo.connect(lfoGain);
    lfoGain.connect(this.bassOsc.frequency);
    lfo.start();
  }

  private startPads() {
    if (!this.ctx || !this.masterGain) return;
    this.padGain = this.ctx.createGain();
    this.padGain.gain.value = 0.15;
    this.padGain.connect(this.masterGain);

    // Dark cinematic chord: Am (A, C, E) with octave variations
    const baseNotes = [110, 130.81, 164.81]; // A2, C3, E3
    const highNotes = [220, 261.63, 329.63]; // A3, C4, E4
    const notes = this.intensity > 5 ? [...baseNotes, ...highNotes] : baseNotes;

    const reverb = this.ctx.createConvolver();
    const reverbLen = this.ctx.sampleRate * 2;
    const reverbBuf = this.ctx.createBuffer(2, reverbLen, this.ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = reverbBuf.getChannelData(ch);
      for (let i = 0; i < reverbLen; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.8));
      }
    }
    reverb.buffer = reverbBuf;
    reverb.connect(this.padGain);

    notes.forEach(freq => {
      const osc = this.ctx!.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      // Slow detune for movement
      const detuneLfo = this.ctx!.createOscillator();
      const detuneGain = this.ctx!.createGain();
      detuneLfo.frequency.value = 0.1 + Math.random() * 0.2;
      detuneGain.gain.value = 5 + this.intensity;
      detuneLfo.connect(detuneGain);
      detuneGain.connect(osc.detune);
      detuneLfo.start();

      const oscGain = this.ctx!.createGain();
      oscGain.gain.value = 0.08;
      osc.connect(oscGain);
      oscGain.connect(reverb);
      osc.start();
      this.padOscs.push(osc);
    });
  }

  private startDrums() {
    if (!this.ctx || !this.masterGain) return;

    const bpm = 80 + this.intensity * 12;
    const beatMs = (60 / bpm) * 1000;
    let beat = 0;

    this.drumInterval = window.setInterval(() => {
      if (!this.ctx || !this.masterGain) return;
      const t = this.ctx.currentTime;

      // Kick on beats 1, 3
      if (beat % 4 === 0 || beat % 4 === 2) {
        const kickOsc = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kickOsc.frequency.setValueAtTime(150, t);
        kickOsc.frequency.exponentialRampToValueAtTime(30, t + 0.15);
        kickGain.gain.setValueAtTime(0.5 + this.intensity * 0.03, t);
        kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        kickOsc.connect(kickGain);
        kickGain.connect(this.masterGain);
        kickOsc.start(t);
        kickOsc.stop(t + 0.2);
      }

      // Hi-hat on every beat (more frequent at higher intensity)
      if (this.intensity > 3 || beat % 2 === 0) {
        const bufLen = this.ctx.sampleRate * 0.05;
        const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < bufLen; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const hhGain = this.ctx.createGain();
        const hhFilter = this.ctx.createBiquadFilter();
        hhFilter.type = 'highpass';
        hhFilter.frequency.value = 7000;
        hhGain.gain.setValueAtTime(0.06 + this.intensity * 0.008, t);
        hhGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        src.connect(hhFilter).connect(hhGain).connect(this.masterGain);
        src.start(t);
        src.stop(t + 0.05);
      }

      // Snare on beat 2, 4 (only at intensity > 4)
      if (this.intensity > 4 && (beat % 4 === 1 || beat % 4 === 3)) {
        const snareLen = this.ctx.sampleRate * 0.1;
        const buf = this.ctx.createBuffer(1, snareLen, this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < snareLen; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / snareLen);
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const snGain = this.ctx.createGain();
        const snFilter = this.ctx.createBiquadFilter();
        snFilter.type = 'bandpass';
        snFilter.frequency.value = 3000;
        snFilter.Q.value = 1;
        snGain.gain.setValueAtTime(0.12, t);
        snGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        src.connect(snFilter).connect(snGain).connect(this.masterGain);
        src.start(t);
        src.stop(t + 0.1);
      }

      beat++;
    }, beatMs);
  }

  setIntensity(wave: number) {
    this.intensity = Math.min(10, wave);

    // Restart drums with new BPM
    if (this.drumInterval) {
      clearInterval(this.drumInterval);
      this.startDrums();
    }

    // Add more pad volume at higher intensity
    if (this.padGain) {
      this.padGain.gain.value = 0.1 + this.intensity * 0.02;
    }
    if (this.bassGain) {
      this.bassGain.gain.value = 0.3 + this.intensity * 0.04;
    }
  }

  stop() {
    if (this.drumInterval) {
      clearInterval(this.drumInterval);
      this.drumInterval = null;
    }
    this.bassOsc?.stop();
    this.padOscs.forEach(o => { try { o.stop(); } catch {} });
    this.padOscs = [];
    this.ctx?.close();
    this.ctx = null;
    this.masterGain = null;
    this.bassOsc = null;
    this.bassGain = null;
    this.padGain = null;
    this.playing = false;
  }

  setVolume(vol: number) {
    if (this.masterGain) this.masterGain.gain.value = vol;
  }

  isPlaying() { return this.playing; }
}
