// Web Audio API synthesized sound effects – no external files needed
const audioCtx = () => {
  if (!(window as any).__audioCtx) {
    (window as any).__audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return (window as any).__audioCtx as AudioContext;
};

const SOUND_ENABLED_KEY = "sound_enabled";
let _enabled: boolean | null = null;

const isEnabled = () => {
  if (_enabled === null) {
    _enabled = localStorage.getItem(SOUND_ENABLED_KEY) !== "false";
  }
  return _enabled;
};

export const setSoundEnabled = (v: boolean) => {
  _enabled = v;
  localStorage.setItem(SOUND_ENABLED_KEY, String(v));
};

export const isSoundEnabled = isEnabled;

// ─── Synthesized sounds ───

const play = (fn: (ctx: AudioContext) => void) => {
  if (!isEnabled()) return;
  try {
    const ctx = audioCtx();
    if (ctx.state === "suspended") ctx.resume();
    fn(ctx);
  } catch {
    // audio blocked
  }
};

/** Short UI click / tap */
export const playClick = () =>
  play((ctx) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(800, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.08);
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.08);
  });

/** Success / correct */
export const playSuccess = () =>
  play((ctx) => {
    [523, 659, 784].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.12);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.25);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.12);
      o.stop(ctx.currentTime + i * 0.12 + 0.25);
    });
  });

/** Error / wrong */
export const playError = () =>
  play((ctx) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "square";
    o.frequency.setValueAtTime(200, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.3);
    g.gain.setValueAtTime(0.1, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.3);
  });

/** Whoosh / transition */
export const playWhoosh = () =>
  play((ctx) => {
    const bufferSize = ctx.sampleRate * 0.2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1000, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(4000, ctx.currentTime + 0.15);
    filter.Q.value = 0.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.2, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    src.connect(filter).connect(g).connect(ctx.destination);
    src.start();
    src.stop(ctx.currentTime + 0.2);
  });

/** Pop – bubble / notification */
export const playPop = () =>
  play((ctx) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(400, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.05);
    o.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.12);
    g.gain.setValueAtTime(0.2, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.12);
  });

/** Countdown tick */
export const playTick = () =>
  play((ctx) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 1000;
    g.gain.setValueAtTime(0.08, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.04);
  });

/** Reveal / dramatic */
export const playReveal = () =>
  play((ctx) => {
    [392, 494, 587, 784].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.4);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.1);
      o.stop(ctx.currentTime + i * 0.1 + 0.4);
    });
  });

/** Level up fanfare */
export const playLevelUp = () =>
  play((ctx) => {
    [523, 659, 784, 1047].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.15);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.4);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.15);
      o.stop(ctx.currentTime + i * 0.15 + 0.4);
    });
  });

/** Vote / select */
export const playVote = () =>
  play((ctx) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(500, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.1);
    g.gain.setValueAtTime(0.12, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.15);
  });

/** Player joined – cheerful ascending arpeggio */
export const playPlayerJoined = () =>
  play((ctx) => {
    [660, 880, 1100].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.18, ctx.currentTime + i * 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.2);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.08);
      o.stop(ctx.currentTime + i * 0.08 + 0.2);
    });
  });

/** Drumroll – suspense before reveal */
export const playDrumroll = () =>
  play((ctx) => {
    const duration = 2.5;
    const hits = 30;
    for (let i = 0; i < hits; i++) {
      const t = (i / hits) * duration;
      const volume = 0.05 + (i / hits) * 0.15;
      const bufLen = ctx.sampleRate * 0.04;
      const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let j = 0; j < bufLen; j++) d[j] = (Math.random() * 2 - 1) * (1 - j / bufLen);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      g.gain.setValueAtTime(volume, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.04);
      src.connect(g).connect(ctx.destination);
      src.start(ctx.currentTime + t);
      src.stop(ctx.currentTime + t + 0.05);
    }
  });

/** Caught / busted – dramatic descending */
export const playCaught = () =>
  play((ctx) => {
    [784, 659, 523, 392].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sawtooth";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.12);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.3);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.12);
      o.stop(ctx.currentTime + i * 0.12 + 0.3);
    });
  });

/** Escaped / survived – sneaky ascending */
export const playEscaped = () =>
  play((ctx) => {
    [262, 330, 392, 523, 659].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.3);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.1);
      o.stop(ctx.currentTime + i * 0.1 + 0.3);
    });
  });

/** Revive – dramatic magical resurrection */
export const playReviveSound = () =>
  play((ctx) => {
    const t = ctx.currentTime;
    // Rising sine sweep
    const sweep = ctx.createOscillator();
    const sg = ctx.createGain();
    sweep.type = "sine";
    sweep.frequency.setValueAtTime(200, t);
    sweep.frequency.exponentialRampToValueAtTime(1200, t + 0.6);
    sg.gain.setValueAtTime(0.12, t);
    sg.gain.linearRampToValueAtTime(0.18, t + 0.3);
    sg.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    sweep.connect(sg).connect(ctx.destination);
    sweep.start(t);
    sweep.stop(t + 0.8);
    // Bright triangle arpeggio
    [523, 784, 1047, 1319].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.14, t + i * 0.12);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.35);
      o.connect(g).connect(ctx.destination);
      o.start(t + i * 0.12);
      o.stop(t + i * 0.12 + 0.35);
    });
    // Soft noise shimmer
    const bufLen = ctx.sampleRate * 0.3;
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let j = 0; j < bufLen; j++) d[j] = (Math.random() * 2 - 1) * (1 - j / bufLen);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 3000;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.06, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    src.connect(filter).connect(ng).connect(ctx.destination);
    src.start(t + 0.1);
    src.stop(t + 0.4);
  });
