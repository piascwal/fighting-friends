/* Briques de synthèse sonore (WebAudio) : une note, un souffle de bruit. Aucun fichier audio dans le jeu. */

export interface Synth {
  ctx: AudioContext;
  /** Sortie des effets sonores. */
  master: GainNode;
  /** Sortie de la musique (plus discrète). */
  music: GainNode;
  noise: AudioBuffer;
}

export function createSynth(): Synth | null {
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  const ctx = new Ctor();
  const master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
  const music = ctx.createGain();
  music.gain.value = 0.16;
  music.connect(master);
  const noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
  const samples = noise.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
  return { ctx, master, music, noise };
}

export interface ToneOptions {
  type: OscillatorType;
  /** Fréquence de départ (Hz). */
  from: number;
  /** Fréquence d'arrivée : la note glisse. 0 = note tenue. */
  to?: number;
  /** Durée en secondes. */
  dur: number;
  vol: number;
  /** Retard avant le début, en secondes. */
  delay?: number;
  /** Instant absolu de départ (prioritaire sur `delay`), pour le séquenceur. */
  at?: number;
  out?: AudioNode;
}

export function tone(s: Synth, o: ToneOptions): void {
  const start = o.at ?? s.ctx.currentTime + (o.delay ?? 0);
  const osc = s.ctx.createOscillator();
  const gain = s.ctx.createGain();
  osc.type = o.type;
  osc.frequency.setValueAtTime(o.from, start);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), start + o.dur);
  gain.gain.setValueAtTime(o.vol, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + o.dur);
  osc.connect(gain);
  gain.connect(o.out ?? s.master);
  osc.start(start);
  osc.stop(start + o.dur + 0.02);
}

export interface NoiseOptions {
  dur: number;
  vol: number;
  /** Fréquence du filtre (Hz) : grave = choc sourd, aigu = sifflement. */
  freq: number;
  q?: number;
  filter?: BiquadFilterType;
  delay?: number;
  at?: number;
  out?: AudioNode;
}

export function noise(s: Synth, o: NoiseOptions): void {
  const start = o.at ?? s.ctx.currentTime + (o.delay ?? 0);
  const source = s.ctx.createBufferSource();
  const filter = s.ctx.createBiquadFilter();
  const gain = s.ctx.createGain();
  source.buffer = s.noise;
  filter.type = o.filter ?? 'bandpass';
  filter.frequency.value = o.freq;
  filter.Q.value = o.q ?? 1;
  gain.gain.setValueAtTime(o.vol, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + o.dur);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(o.out ?? s.master);
  source.start(start, Math.random() * 0.2, o.dur + 0.02);
}
