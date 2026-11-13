/* Écran de sélection : cases-portraits au centre, personnage en entier de chaque côté. */
import { playSfx } from '../audio/audio';
import { rgba, shade } from '../core/color';
import { clamp, pick } from '../core/math';
import { escapeHtml } from '../core/text';
import { roster } from '../data/roster';
import type { Character } from '../data/types';
import { drawCharacter, drawPortrait } from '../render/character-draw';
import { arcadeText } from '../render/text';
import { game, type GameMode } from './actions';
import { $, $$, newCanvas, on } from './dom';
import { currentScreen, showScreen } from './screens';

export const SELECT_HTML = `
  <div class="screen" id="s-select">
    <h2 id="selTitle"></h2>
    <div class="selWrap">
      <div class="side" id="side0"><canvas width="300" height="360"></canvas><div class="pname"></div><div class="ptag">JOUEUR 1</div></div>
      <div class="mid"><div id="selGrid"></div><div id="selInfo"></div></div>
      <div class="side" id="side1"><canvas width="300" height="360"></canvas><div class="pname"></div><div class="ptag" id="tag1"></div></div>
    </div>
    <div class="foot">
      <button class="nav sm alt" id="selBack">◀ RETOUR</button>
      <button class="nav sm" id="selOk">VALIDER ▶</button>
    </div>
  </div>`;

interface Selection {
  mode: GameMode;
  /** 0 = le joueur 1 choisit, 1 = choix de l'adversaire / du joueur 2. */
  step: 0 | 1;
  picks: [Character | null, Character | null];
  /** Case survolée par chaque côté ; la dernière case (index = roster.length) est « au hasard ». */
  cursor: [number, number];
  /** Frames de flash restantes après une validation. */
  flash: [number, number];
}

const PREVIEW_W = 300;
const PREVIEW_H = 360;
/** Délai avant de lancer le combat, le temps de voir la pose de victoire. */
const CONFIRM_DELAY_MS = 650;

let sel: Selection | null = null;
let time = 0;

/** Ce qu'il faut montrer d'un côté : un personnage, « au hasard », ou rien. */
function shown(side: 0 | 1): Character | 'random' | null {
  const s = sel!;
  if (s.picks[side]) return s.picks[side];
  if (s.step !== side) return null;
  return roster[s.cursor[side]] ?? 'random';
}

function statBar(label: string, value: number): string {
  const percent = Math.round(clamp(value, 0.08, 1) * 100);
  return `<div class="stat"><span>${label}</span><i><b style="width:${percent}%"></b></i></div>`;
}

function refresh(): void {
  const s = sel!;
  const duo = s.mode === 'duo';
  $('#selTitle').textContent =
    s.step === 0
      ? duo
        ? 'JOUEUR 1 : CHOISIS TON COMBATTANT'
        : 'CHOISIS TON COMBATTANT'
      : duo
        ? 'JOUEUR 2 : CHOISIS TON COMBATTANT'
        : "CHOISIS L'ADVERSAIRE";
  $$('#selGrid .tile').forEach((tile, i) => {
    tile.classList.toggle('c0', s.cursor[0] === i && (s.step === 0 || !!s.picks[0]));
    tile.classList.toggle('c1', s.step === 1 && s.cursor[1] === i);
  });
  for (const side of [0, 1] as const) {
    const who = shown(side);
    const box = $(`#side${side}`);
    const hiddenOpponents = !who && s.mode === 'arcade' && side === 1;
    $('.pname', box).textContent =
      who === 'random' ? 'AU HASARD' : who ? who.name : hiddenOpponents ? '? ? ?' : '';
    box.style.setProperty('--c', who && who !== 'random' ? who.color : '#555555');
    box.classList.toggle('active', s.step === side);
  }

  const char = roster[s.cursor[s.step]];
  const info = $('#selInfo');
  if (!char) {
    info.innerHTML = '<div class="iname">AU HASARD</div><div class="ititle">Laisse le destin choisir</div>';
    return;
  }
  const { stats, label, hint } = char.style;
  info.innerHTML = `
    <div class="iname" style="color:${char.color}">${escapeHtml(char.name)}</div>
    <div class="ititle">${escapeHtml(char.title)} — style ${label.toLowerCase()}</div>
    <div class="stats">
      ${statBar('Vie', (stats.hp - 780) / 400)}
      ${statBar('Vitesse', (stats.speed - 3.2) / 2.7)}
      ${statBar('Puissance', (stats.power - 0.8) / 0.38)}
    </div>
    <div class="ihint">${escapeHtml(hint)}</div>`;
}

function confirm(): void {
  const s = sel!;
  const step = s.step;
  let char = roster[s.cursor[step]];
  if (!char) {
    // « au hasard » : n'importe qui sauf, si possible, le personnage du joueur 1
    const others = roster.filter((c) => c !== s.picks[0]);
    char = pick(others.length ? others : roster);
    s.cursor[step] = roster.indexOf(char);
  }
  s.picks[step] = char;
  s.flash[step] = 14;
  playSfx('ok');

  if (step === 0 && s.mode !== 'arcade') {
    s.step = 1;
    if (s.cursor[1] === s.cursor[0]) s.cursor[1] = (s.cursor[0] + 1) % roster.length;
    refresh();
    return;
  }
  refresh();
  const ok = $<HTMLButtonElement>('#selOk');
  ok.disabled = true;
  setTimeout(() => {
    ok.disabled = false;
    if (currentScreen() === 'select' && sel === s) game().startGame(s.mode, s.picks[0]!, s.picks[1]);
  }, CONFIRM_DELAY_MS);
}

function buildTile(char: Character | undefined, index: number): HTMLButtonElement {
  const tile = document.createElement('button');
  tile.className = 'nav tile';
  if (char) {
    const [canvas, ctx] = newCanvas(120);
    drawPortrait(ctx, char, 120);
    tile.appendChild(canvas);
  } else {
    tile.textContent = '?';
    tile.classList.add('rnd');
  }
  // un premier appui montre le personnage, un second sur la même case le valide.
  // (un appui déclenche aussi « focus » : on l'ignore pour ne pas valider d'un seul geste)
  let pointerDown = false;
  tile.addEventListener('pointerdown', () => (pointerDown = true));
  tile.addEventListener('click', () => {
    pointerDown = false;
    const s = sel!;
    if (s.cursor[s.step] === index) return confirm();
    s.cursor[s.step] = index;
    playSfx('move');
    refresh();
  });
  tile.addEventListener('focus', () => {
    const s = sel!;
    if (pointerDown || s.cursor[s.step] === index) return;
    s.cursor[s.step] = index;
    refresh();
  });
  return tile;
}

export function openSelect(mode: GameMode): void {
  sel = { mode, step: 0, picks: [null, null], cursor: [0, Math.min(1, roster.length - 1)], flash: [0, 0] };
  $('#tag1').textContent = mode === 'duo' ? 'JOUEUR 2' : mode === 'arcade' ? 'ADVERSAIRES' : 'ADVERSAIRE';
  const grid = $('#selGrid');
  grid.innerHTML = '';
  [...roster, undefined].forEach((char, i) => grid.appendChild(buildTile(char, i)));
  showScreen('select');
  refresh();
}

function drawPreview(side: 0 | 1): void {
  const s = sel!;
  const ctx = $<HTMLCanvasElement>(`#side${side} canvas`).getContext('2d')!;
  const who = shown(side);
  const color = who && who !== 'random' ? who.color : '#666666';
  ctx.clearRect(0, 0, PREVIEW_W, PREVIEW_H);
  const bg = ctx.createLinearGradient(0, 0, 0, PREVIEW_H);
  bg.addColorStop(0, rgba('#000000', 0));
  bg.addColorStop(1, shade(color, -0.3));
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, PREVIEW_W, PREVIEW_H);
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath();
  ctx.ellipse(PREVIEW_W / 2, PREVIEW_H - 22, 90, 12, 0, 0, 7);
  ctx.fill();

  const mystery = who === 'random' || (!who && s.mode === 'arcade' && side === 1);
  if (mystery) {
    arcadeText(ctx, '?', PREVIEW_W / 2, PREVIEW_H / 2, 200, { colors: ['#fff', '#bbb', '#666'] });
  } else if (who) {
    const facing = side ? -1 : 1;
    const pose = s.picks[side] ? 'win' : 'idle';
    drawCharacter(ctx, who, pose, PREVIEW_W / 2 - facing * 10, PREVIEW_H - 24, facing, 1.42, time, {
      flash: s.flash[side] > 8,
    });
  }
  if (s.flash[side] > 0) {
    ctx.fillStyle = `rgba(255,255,255,${s.flash[side] / 20})`;
    ctx.fillRect(0, 0, PREVIEW_W, PREVIEW_H);
    s.flash[side]--;
  }
}

/** Anime les deux aperçus ; appelé à chaque image tant que l'écran est affiché. */
export function tickSelect(): void {
  if (!sel) return;
  time++;
  drawPreview(0);
  drawPreview(1);
}

export function backFromSelect(): void {
  const s = sel!;
  playSfx('back');
  if (s.step === 1) {
    s.step = 0;
    s.picks[0] = null;
    refresh();
  } else {
    showScreen('menu');
  }
}

export function initSelect(): void {
  on('#selOk', confirm);
  on('#selBack', backFromSelect);
}
