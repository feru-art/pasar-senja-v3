// Sound: tiny WebAudio synth, no audio files. A sizzle when food hits the pan,
// a coin chime when a customer pays, a chime when an order arrives, a low buzz
// when a customer storms off. Mute lives here too.

let context = null;
let muted = false;

/** Unlock audio on the first user gesture (browsers demand it). */
export function unlockAudio() {
  try {
    if (!context) context = new (window.AudioContext ?? window.webkitAudioContext)();
    if (context.state === 'suspended') void context.resume();
  } catch {
    context = null;
  }
}

/** Toggle mute; returns the new muted state. */
export function toggleMute() {
  muted = !muted;
  return muted;
}

function tone(frequency, duration, type, gainValue, when = 0) {
  if (!context || muted) return;
  try {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(gainValue, context.currentTime + when);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + when + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(context.currentTime + when);
    oscillator.stop(context.currentTime + when + duration);
  } catch {
    // Audio is decoration: a failure here must never break the game.
  }
}

function noiseBurst(duration, gainValue) {
  if (!context || muted) return;
  try {
    const length = Math.floor(context.sampleRate * duration);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const gain = context.createGain();
    gain.gain.value = gainValue;
    const filter = context.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 3000;
    source.connect(filter).connect(gain).connect(context.destination);
    source.start();
  } catch {
    // Audio is decoration.
  }
}

/** Food hits the pan: a short sizzle. */
export function playSizzleSound() {
  noiseBurst(0.25, 0.12);
}

/** A customer pays: two bright coin notes. */
export function playCoinSound() {
  tone(1318, 0.09, 'sine', 0.12);
  tone(1760, 0.14, 'sine', 0.12, 0.08);
}

/** A new order arrives: a soft chime. */
export function playOrderChime() {
  tone(880, 0.12, 'triangle', 0.08);
  tone(1174, 0.16, 'triangle', 0.08, 0.1);
}

/** A customer storms off: a low disappointed buzz. */
export function playAngrySound() {
  tone(160, 0.3, 'sawtooth', 0.08);
  tone(120, 0.35, 'sawtooth', 0.08, 0.12);
}

/** A night begins: a warm horn. */
export function playNightHorn() {
  tone(523, 0.25, 'triangle', 0.1);
  tone(784, 0.3, 'triangle', 0.1, 0.15);
}

/** The festival is won: a little fanfare. */
export function playVictorySound() {
  tone(523, 0.2, 'triangle', 0.12);
  tone(659, 0.2, 'triangle', 0.12, 0.15);
  tone(784, 0.2, 'triangle', 0.12, 0.3);
  tone(1046, 0.4, 'triangle', 0.12, 0.45);
}

/** The market goes quiet: a low closing note. */
export function playDefeatSound() {
  tone(392, 0.4, 'triangle', 0.1);
  tone(262, 0.6, 'triangle', 0.1, 0.3);
}
