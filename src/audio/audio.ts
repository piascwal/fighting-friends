/* Point d'entrée du son : effets sonores et musique (petit séquenceur 16 pas). */
import { settings } from '../core/settings';
import type { MusicName, SfxName } from '../core/sfx';
import { SOUNDS } from './sounds';
import { createSynth, noise, tone, type Synth } from './synth';

interface Song {
  bpm: number;
  /** Notes en demi-tons au-dessus du la grave ; -1 = silence. */
  bass: readonly number[];
  lead: readonly number[];
  /** k = grosse caisse, s = caisse claire, h = charleston, - = rien */
  drums: string;
}

const SONGS: Record<MusicName, Song> = {
  menu: {
    bpm: 112,
    bass: [0, -1, 0, -1, 3, -1, 3, -1, 5, -1, 5, -1, 7, -1, 3, -1],
    lead: [12, -1, 15, 19, -1, 15, 12, -1, 17, -1, 20, 24, -1, 19, 15, -1],
    drums: 'k--hs--hk-khs--h',
  },
  fight: {
    bpm: 152,
    bass: [0, 0, 12, 0, 0, 12, 0, 10, 3, 3, 15, 3, 5, 5, 17, 7],
    lead: [24, -1, 27, 24, 31, -1, 27, 24, 22, -1, 27, 22, 29, 27, 24, 22],
    drums: 'k-hhs-hkk-hhs-hs',
  },
  ending: {
    bpm: 96,
    bass: [0, -1, -1, 7, 5, -1, -1, 5, 8, -1, -1, 8, 10, -1, 7, -1],
    lead: [24, -1, 19, 24, 27, -1, 24, 27, 29, -1, 27, 24, 31, -1, 29, -1],
    drums: 'k---s---k-k-s---',
  },
};
/** Transposition appliquée à chaque mesure, pour que la boucle ne soit pas trop répétitive. */
const BAR_SHIFTS = [0, 0, -2, 3];
const noteHz = (semitones: number) => 55 * Math.pow(2, semitones / 12);

let synth: Synth | null = null;
let wanted: MusicName | null = null;
let playing: MusicName | null = null;
let timer: ReturnType<typeof setInterval> | undefined;
let step = 0;
let nextTime = 0;

/** Les navigateurs n'autorisent le son qu'après un geste du joueur : à appeler au premier toucher. */
export function unlockAudio(): void {
  synth ??= createSynth();
  if (synth?.ctx.state === 'suspended') void synth.ctx.resume();
  if (wanted !== playing) startMusic();
}

export function playSfx(name: SfxName): void {
  if (!synth || !settings.sfx) return;
  try {
    SOUNDS[name](synth);
  } catch {
    // un son raté ne doit jamais interrompre le jeu
  }
}

/** Programme en avance les notes des prochaines millisecondes. */
function schedule(): void {
  if (!synth || !playing) return;
  const song = SONGS[playing];
  const stepDur = 60 / song.bpm / 4;
  while (nextTime < synth.ctx.currentTime + 0.12) {
    const i = step % 16;
    const bar = Math.floor(step / 16);
    const shift = BAR_SHIFTS[bar % 4]! + 12;
    const out = synth.music;
    const bass = song.bass[i]!;
    const lead = song.lead[i]!;
    if (bass >= 0)
      tone(synth, {
        type: 'sawtooth',
        from: noteHz(bass + shift),
        dur: stepDur * 1.6,
        vol: 0.5,
        at: nextTime,
        out,
      });
    // la mélodie n'entre qu'après deux mesures d'introduction
    if (lead >= 0 && bar % 8 >= 2)
      tone(synth, {
        type: 'square',
        from: noteHz(lead + shift),
        dur: stepDur * 1.4,
        vol: 0.22,
        at: nextTime,
        out,
      });
    const drum = song.drums[i];
    if (drum === 'k')
      tone(synth, { type: 'sine', from: 150, to: 40, dur: 0.14, vol: 1.2, at: nextTime, out });
    if (drum === 's') noise(synth, { dur: 0.12, vol: 0.8, freq: 1800, q: 0.7, at: nextTime, out });
    if (drum === 'h')
      noise(synth, { dur: 0.03, vol: 0.3, freq: 7000, q: 2, filter: 'highpass', at: nextTime, out });
    step++;
    nextTime += stepDur;
  }
}

function startMusic(): void {
  clearInterval(timer);
  playing = null;
  if (!synth || !settings.music || !wanted) return;
  playing = wanted;
  step = 0;
  nextTime = synth.ctx.currentTime + 0.05;
  timer = setInterval(schedule, 40);
}

/**
 * Coupe tout le son quand le jeu passe en arrière-plan (autre appli, écran verrouillé), et le rétablit au retour.
 * Le contexte audio est suspendu : la musique reprend exactement où elle en était.
 */
export function setBackground(hidden: boolean): void {
  if (!synth) return;
  if (hidden) void synth.ctx.suspend();
  else void synth.ctx.resume();
}

/** Change de musique (null = silence). Sans effet si c'est déjà celle qui joue. */
export function playMusic(name: MusicName | null): void {
  wanted = name;
  if (name !== playing) startMusic();
}

/** À appeler quand le réglage « musique » change. */
export function refreshMusic(): void {
  startMusic();
}
