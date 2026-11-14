/* Recettes des effets sonores : chaque son est un mélange de notes et de bruit. */
import type { SfxName } from '../core/sfx';
import { noise, tone, type Synth } from './synth';

export const SOUNDS: Record<SfxName, (s: Synth) => void> = {
  hitL(s) {
    noise(s, { dur: 0.09, vol: 0.7, freq: 1800, q: 0.8 });
    tone(s, { type: 'square', from: 220, to: 80, dur: 0.08, vol: 0.25 });
  },
  hitH(s) {
    noise(s, { dur: 0.18, vol: 0.9, freq: 900, q: 0.6 });
    tone(s, { type: 'sawtooth', from: 160, to: 40, dur: 0.2, vol: 0.4 });
    tone(s, { type: 'sine', from: 90, to: 35, dur: 0.25, vol: 0.6 });
  },
  block(s) {
    noise(s, { dur: 0.07, vol: 0.4, freq: 3200, q: 2 });
    tone(s, { type: 'triangle', from: 520, to: 300, dur: 0.06, vol: 0.2 });
  },
  whoosh(s) {
    noise(s, { dur: 0.12, vol: 0.22, freq: 1200, q: 1.2, filter: 'highpass' });
  },
  jump(s) {
    tone(s, { type: 'sine', from: 260, to: 520, dur: 0.12, vol: 0.12 });
  },
  land(s) {
    noise(s, { dur: 0.08, vol: 0.3, freq: 300, filter: 'lowpass' });
  },
  fire(s) {
    noise(s, { dur: 0.35, vol: 0.5, freq: 700, q: 0.7 });
    tone(s, { type: 'sawtooth', from: 320, to: 90, dur: 0.35, vol: 0.22 });
  },
  elec(s) {
    tone(s, { type: 'square', from: 1400, to: 300, dur: 0.18, vol: 0.16 });
    noise(s, { dur: 0.2, vol: 0.4, freq: 4000, q: 3 });
  },
  earth(s) {
    noise(s, { dur: 0.45, vol: 0.9, freq: 140, q: 0.8, filter: 'lowpass' });
    tone(s, { type: 'sine', from: 70, to: 30, dur: 0.45, vol: 0.7 });
  },
  slash(s) {
    noise(s, { dur: 0.14, vol: 0.5, freq: 5200, q: 2.5, filter: 'highpass' });
    tone(s, { type: 'sawtooth', from: 1800, to: 500, dur: 0.1, vol: 0.1 });
  },
  ice(s) {
    // cristal qui se brise
    tone(s, { type: 'triangle', from: 2400, to: 1200, dur: 0.18, vol: 0.14 });
    tone(s, { type: 'triangle', from: 3100, to: 1600, dur: 0.14, vol: 0.1, delay: 0.03 });
    noise(s, { dur: 0.16, vol: 0.35, freq: 6000, q: 2, filter: 'highpass' });
  },
  special(s) {
    tone(s, { type: 'sawtooth', from: 200, to: 700, dur: 0.2, vol: 0.2 });
    noise(s, { dur: 0.2, vol: 0.25, freq: 2000 });
  },
  super(s) {
    // quatre notes montantes
    for (let i = 0; i < 4; i++) {
      tone(s, { type: 'square', from: 330 * Math.pow(1.26, i), dur: 0.3, vol: 0.16, delay: i * 0.07 });
    }
    noise(s, { dur: 0.7, vol: 0.4, freq: 500, q: 0.5, filter: 'lowpass' });
  },
  ko(s) {
    noise(s, { dur: 0.6, vol: 1, freq: 400, q: 0.5, filter: 'lowpass' });
    tone(s, { type: 'sawtooth', from: 300, to: 40, dur: 0.8, vol: 0.5 });
    tone(s, { type: 'sine', from: 120, to: 30, dur: 1, vol: 0.8 });
  },
  move(s) {
    tone(s, { type: 'square', from: 660, dur: 0.05, vol: 0.1 });
  },
  ok(s) {
    tone(s, { type: 'square', from: 660, dur: 0.08, vol: 0.14 });
    tone(s, { type: 'square', from: 990, dur: 0.14, vol: 0.14, delay: 0.07 });
  },
  back(s) {
    tone(s, { type: 'square', from: 330, to: 220, dur: 0.1, vol: 0.12 });
  },
  vs(s) {
    noise(s, { dur: 0.5, vol: 0.9, freq: 200, q: 0.6, filter: 'lowpass' });
    tone(s, { type: 'sawtooth', from: 110, to: 55, dur: 0.6, vol: 0.5 });
    tone(s, { type: 'square', from: 880, to: 440, dur: 0.3, vol: 0.12 });
  },
  round(s) {
    tone(s, { type: 'square', from: 440, dur: 0.12, vol: 0.16 });
    tone(s, { type: 'square', from: 440, dur: 0.12, vol: 0.16, delay: 0.16 });
    tone(s, { type: 'square', from: 880, dur: 0.3, vol: 0.16, delay: 0.32 });
  },
  fight(s) {
    tone(s, { type: 'sawtooth', from: 220, to: 880, dur: 0.25, vol: 0.3 });
    noise(s, { dur: 0.3, vol: 0.5, freq: 1500, q: 0.7 });
  },
  win(s) {
    [523, 659, 784, 1047].forEach((freq, i) =>
      tone(s, { type: 'square', from: freq, dur: 0.22, vol: 0.15, delay: i * 0.12 }),
    );
  },
};
