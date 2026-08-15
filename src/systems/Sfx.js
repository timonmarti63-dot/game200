// Tiny procedural sound-effect synth built on the raw Web Audio API - no
// external audio assets required. Tones/noise bursts are generated on the
// fly with oscillators + short exponential gain envelopes ("retro bleep"
// style), matching the hand-drawn-everything approach used for the sprites.

let ctx = null;

function getCtx() {
  if (typeof window === 'undefined') return null;
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return null;
  if (!ctx) ctx = new AudioCtor();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone({ freq = 440, freqEnd, duration = 0.12, type = 'square', gain = 0.14, delay = 0 }) {
  const ac = getCtx();
  if (!ac) return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(1, freq), t0);
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + duration);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

function noiseBurst({ duration = 0.12, gain = 0.12, delay = 0 }) {
  const ac = getCtx();
  if (!ac) return;
  const t0 = ac.currentTime + delay;
  const bufferSize = Math.max(1, Math.floor(ac.sampleRate * duration));
  const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  src.connect(g).connect(ac.destination);
  src.start(t0);
}

export const Sfx = {
  unlock() {
    getCtx();
  },
  swing() {
    tone({ freq: 520, freqEnd: 300, duration: 0.08, type: 'triangle', gain: 0.11 });
  },
  hit() {
    tone({ freq: 180, freqEnd: 60, duration: 0.11, type: 'square', gain: 0.16 });
    noiseBurst({ duration: 0.05, gain: 0.08 });
  },
  critHit() {
    tone({ freq: 280, freqEnd: 70, duration: 0.16, type: 'sawtooth', gain: 0.19 });
    noiseBurst({ duration: 0.07, gain: 0.1 });
  },
  dodge() {
    tone({ freq: 340, freqEnd: 640, duration: 0.13, type: 'sine', gain: 0.09 });
  },
  parrySuccess() {
    tone({ freq: 660, duration: 0.06, type: 'square', gain: 0.14 });
    tone({ freq: 880, duration: 0.12, type: 'square', gain: 0.14, delay: 0.06 });
  },
  pickup() {
    tone({ freq: 520, freqEnd: 900, duration: 0.09, type: 'square', gain: 0.11 });
  },
  chestOpen() {
    tone({ freq: 300, duration: 0.07, type: 'square', gain: 0.12 });
    tone({ freq: 500, duration: 0.1, type: 'square', gain: 0.12, delay: 0.07 });
  },
  heal() {
    tone({ freq: 440, freqEnd: 700, duration: 0.2, type: 'sine', gain: 0.11 });
  },
  throwItem() {
    tone({ freq: 400, freqEnd: 240, duration: 0.07, type: 'triangle', gain: 0.09 });
  },
  grapple() {
    tone({ freq: 180, freqEnd: 700, duration: 0.16, type: 'sawtooth', gain: 0.1 });
  },
  enemyDeath() {
    tone({ freq: 200, freqEnd: 40, duration: 0.22, type: 'sawtooth', gain: 0.13 });
  },
  bossDefeat() {
    [0, 0.12, 0.24].forEach((delay, i) => tone({ freq: 330 + i * 110, duration: 0.2, type: 'square', gain: 0.15, delay }));
  },
  bossExhausted() {
    tone({ freq: 480, freqEnd: 110, duration: 0.5, type: 'sine', gain: 0.12 });
  },
  gateOpen() {
    tone({ freq: 120, freqEnd: 180, duration: 0.4, type: 'sine', gain: 0.13 });
  },
  playerHurt() {
    tone({ freq: 150, freqEnd: 70, duration: 0.14, type: 'sawtooth', gain: 0.15 });
  },
  playerDeath() {
    [220, 180, 140, 90].forEach((freq, i) => tone({ freq, duration: 0.24, type: 'sawtooth', gain: 0.14, delay: i * 0.17 }));
  },
  uiToggle() {
    tone({ freq: 300, duration: 0.05, type: 'square', gain: 0.07 });
  },
};
