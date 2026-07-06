// Procedural electronic beat + a lookahead scheduler, so gameplay timing can
// be driven off AudioContext.currentTime (the same clock the sounds are
// scheduled against) rather than requestAnimationFrame/Date.now(), which
// would drift out of sync with what the player actually hears.

export const BPM = 128;
export const SECONDS_PER_BEAT = 60 / BPM;
const LOOKAHEAD_SECONDS = 2.2; // must exceed the block travel time
const SCHEDULER_INTERVAL_MS = 100;

type AudioContextCtor = typeof AudioContext;

export class RhythmAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private schedulerId: number | null = null;
  private nextBeatTime = 0;
  private beatIndex = 0;

  onBeat: ((time: number, beatIndex: number) => void) | null = null;

  start() {
    const Ctor: AudioContextCtor =
      window.AudioContext || (window as unknown as { webkitAudioContext: AudioContextCtor }).webkitAudioContext;
    this.ctx = new Ctor();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.25;
    this.masterGain.connect(this.ctx.destination);
    this.nextBeatTime = this.ctx.currentTime + 0.3;
    this.beatIndex = 0;
    this.scheduler();
    this.schedulerId = window.setInterval(() => this.scheduler(), SCHEDULER_INTERVAL_MS);
  }

  private scheduler() {
    if (!this.ctx) return;
    while (this.nextBeatTime < this.ctx.currentTime + LOOKAHEAD_SECONDS) {
      this.playDrumStep(this.nextBeatTime, this.beatIndex);
      this.onBeat?.(this.nextBeatTime, this.beatIndex);
      this.beatIndex++;
      this.nextBeatTime += SECONDS_PER_BEAT;
    }
  }

  private playDrumStep(t: number, beatIndex: number) {
    const ctx = this.ctx;
    const master = this.masterGain;
    if (!ctx || !master) return;

    // Kick every beat
    const kick = ctx.createOscillator();
    const kickGain = ctx.createGain();
    kick.frequency.setValueAtTime(140, t);
    kick.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    kickGain.gain.setValueAtTime(0.55, t);
    kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    kick.connect(kickGain).connect(master);
    kick.start(t);
    kick.stop(t + 0.15);

    // Hi-hat on off-beats
    if (beatIndex % 2 === 1) {
      const bufLen = Math.floor(ctx.sampleRate * 0.04);
      const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const hhGain = ctx.createGain();
      const hhFilter = ctx.createBiquadFilter();
      hhFilter.type = "highpass";
      hhFilter.frequency.value = 6000;
      hhGain.gain.setValueAtTime(0.16, t);
      hhGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      src.connect(hhFilter).connect(hhGain).connect(master);
      src.start(t);
      src.stop(t + 0.04);
    }

    // Synth arpeggio blip every 4 beats
    if (beatIndex % 4 === 0) {
      const notes = [261.63, 329.63, 392.0, 523.25];
      const freq = notes[Math.floor(beatIndex / 4) % notes.length];
      const synth = ctx.createOscillator();
      const synthGain = ctx.createGain();
      synth.type = "sawtooth";
      synth.frequency.value = freq;
      synthGain.gain.setValueAtTime(0.001, t);
      synthGain.gain.linearRampToValueAtTime(0.13, t + 0.02);
      synthGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      synth.connect(synthGain).connect(master);
      synth.start(t);
      synth.stop(t + 0.3);
    }
  }

  playHitSound(perfect: boolean) {
    const ctx = this.ctx;
    const master = this.masterGain;
    if (!ctx || !master) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = perfect ? 880 : 660;
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain).connect(master);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  playMissSound() {
    const ctx = this.ctx;
    const master = this.masterGain;
    if (!ctx || !master) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.2);
    gain.gain.setValueAtTime(0.14, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain).connect(master);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  now(): number {
    return this.ctx?.currentTime ?? 0;
  }

  stop() {
    if (this.schedulerId !== null) {
      clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
    this.onBeat = null;
    try {
      this.ctx?.close();
    } catch {
      /* ignore */
    }
    this.ctx = null;
    this.masterGain = null;
  }
}
