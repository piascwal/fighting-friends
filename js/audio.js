/* Sons synthétisés (WebAudio) : aucun fichier audio nécessaire */
(function () {
  const FF = window.FF;
  let ac = null, master = null, musicGain = null, noiseBuf = null, musicTimer = null, song = null, step = 0, nextT = 0;
  const A = (FF.Audio = {});

  A.unlock = function () {
    if (!ac) {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
      ac = new C(); master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination);
      musicGain = ac.createGain(); musicGain.gain.value = 0.16; musicGain.connect(master);
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate); const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === 'suspended') ac.resume();
  };
  function tone(type, f0, f1, dur, vol, t0, dest) {
    const t = t0 || ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, freq, q, t0, type, dest) {
    const t = t0 || ac.currentTime, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || master); s.start(t, Math.random() * 0.2, dur + 0.02);
  }
  const SFX = {
    hitL() { noise(0.09, 0.7, 1800, 0.8); tone('square', 220, 80, 0.08, 0.25); },
    hitH() { noise(0.18, 0.9, 900, 0.6); tone('sawtooth', 160, 40, 0.2, 0.4); tone('sine', 90, 35, 0.25, 0.6); },
    block() { noise(0.07, 0.4, 3200, 2); tone('triangle', 520, 300, 0.06, 0.2); },
    whoosh() { noise(0.12, 0.22, 1200, 1.2, 0, 'highpass'); },
    jump() { tone('sine', 260, 520, 0.12, 0.12); },
    land() { noise(0.08, 0.3, 300, 1, 0, 'lowpass'); },
    fire() { noise(0.35, 0.5, 700, 0.7); tone('sawtooth', 320, 90, 0.35, 0.22); },
    elec() { tone('square', 1400, 300, 0.18, 0.16); noise(0.2, 0.4, 4000, 3); },
    earth() { noise(0.45, 0.9, 140, 0.8, 0, 'lowpass'); tone('sine', 70, 30, 0.45, 0.7); },
    slash() { noise(0.14, 0.5, 5200, 2.5, 0, 'highpass'); tone('sawtooth', 1800, 500, 0.1, 0.1); },
    special() { tone('sawtooth', 200, 700, 0.2, 0.2); noise(0.2, 0.25, 2000, 1); },
    super() { const t = ac.currentTime; [0, 0.07, 0.14, 0.21].forEach((d, i) => tone('square', 330 * Math.pow(1.26, i), 0, 0.3, 0.16, t + d)); noise(0.7, 0.4, 500, 0.5, t, 'lowpass'); },
    ko() { const t = ac.currentTime; noise(0.6, 1, 400, 0.5, t, 'lowpass'); tone('sawtooth', 300, 40, 0.8, 0.5, t); tone('sine', 120, 30, 1, 0.8, t); },
    move() { tone('square', 660, 0, 0.05, 0.1); },
    ok() { const t = ac.currentTime; tone('square', 660, 0, 0.08, 0.14, t); tone('square', 990, 0, 0.14, 0.14, t + 0.07); },
    back() { tone('square', 330, 220, 0.1, 0.12); },
    vs() { const t = ac.currentTime; noise(0.5, 0.9, 200, 0.6, t, 'lowpass'); tone('sawtooth', 110, 55, 0.6, 0.5, t); tone('square', 880, 440, 0.3, 0.12, t); },
    round() { const t = ac.currentTime; tone('square', 440, 0, 0.12, 0.16, t); tone('square', 440, 0, 0.12, 0.16, t + 0.16); tone('square', 880, 0, 0.3, 0.16, t + 0.32); },
    fight() { const t = ac.currentTime; tone('sawtooth', 220, 880, 0.25, 0.3, t); noise(0.3, 0.5, 1500, 0.7, t); },
    win() { const t = ac.currentTime; [523, 659, 784, 1047].forEach((f, i) => tone('square', f, 0, 0.22, 0.15, t + i * 0.12)); },
  };
  A.play = function (name) { if (!ac || !FF.settings.sfx || !SFX[name]) return; try { SFX[name](); } catch (e) {} };

  /* ---------- musique : petit séquenceur 16 pas ---------- */
  const N = (n) => 55 * Math.pow(2, n / 12);
  const SONGS = {
    menu: { bpm: 112, bass: [0, -1, 0, -1, 3, -1, 3, -1, 5, -1, 5, -1, 7, -1, 3, -1], lead: [12, -1, 15, 19, -1, 15, 12, -1, 17, -1, 20, 24, -1, 19, 15, -1], drums: 'k--hs--hk-khs--h' },
    fight: { bpm: 152, bass: [0, 0, 12, 0, 0, 12, 0, 10, 3, 3, 15, 3, 5, 5, 17, 7], lead: [24, -1, 27, 24, 31, -1, 27, 24, 22, -1, 27, 22, 29, 27, 24, 22], drums: 'k-hhs-hkk-hhs-hs' },
    ending: { bpm: 96, bass: [0, -1, -1, 7, 5, -1, -1, 5, 8, -1, -1, 8, 10, -1, 7, -1], lead: [24, -1, 19, 24, 27, -1, 24, 27, 29, -1, 27, 24, 31, -1, 29, -1], drums: 'k---s---k-k-s---' },
  };
  function tick() {
    if (!song || !ac) return;
    const sp = 60 / song.bpm / 4;
    while (nextT < ac.currentTime + 0.12) {
      const i = step % 16, bar = (step / 16) | 0, tr = [0, 0, -2, 3][bar % 4];
      const b = song.bass[i], l = song.lead[i], d = song.drums[i];
      if (b >= 0) tone('sawtooth', N(b + tr + 12), 0, sp * 1.6, 0.5, nextT, musicGain);
      if (l >= 0 && bar % 8 >= 2) tone('square', N(l + tr + 12), 0, sp * 1.4, 0.22, nextT, musicGain);
      if (d === 'k') tone('sine', 150, 40, 0.14, 1.2, nextT, musicGain);
      if (d === 's') noise(0.12, 0.8, 1800, 0.7, nextT, 'bandpass', musicGain);
      if (d === 'h') noise(0.03, 0.3, 7000, 2, nextT, 'highpass', musicGain);
      step++; nextT += sp;
    }
  }
  A.music = function (name) {
    if (A.current === name && musicTimer) return;
    A.current = name; clearInterval(musicTimer); musicTimer = null; song = null;
    if (!ac || !FF.settings.music || !name) return;
    song = SONGS[name]; step = 0; nextT = ac.currentTime + 0.05; musicTimer = setInterval(tick, 40);
  };
  A.refresh = function () { const n = A.current; A.current = null; A.music(FF.settings.music ? n : null); A.current = n; };
})();
