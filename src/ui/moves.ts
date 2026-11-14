/* Écran « Commandes & liste des coups ». */
import { playSfx } from '../audio/audio';
import { escapeHtml } from '../core/text';
import { COMBO_EXAMPLES } from '../data/combos';
import { characterById, roster } from '../data/roster';
import type { Button, Character, MoveDef } from '../data/types';
import { $, on } from './dom';
import { showScreen, type ScreenName } from './screens';

export const MOVES_HTML = `
  <div class="screen panel" id="s-moves">
    <div class="bar"><button class="nav sm alt" id="mvBack">◀ RETOUR</button><h2>COMMANDES &amp; COUPS</h2></div>
    <div class="scroll"><div class="row"><select id="mvSel"></select></div><div id="mvBody"></div></div>
  </div>`;

// pastilles des 4 boutons et touches de clavier
const A = '<i class="b pa">A</i>';
const B = '<i class="b pb">B</i>';
const C = '<i class="b ka">C</i>';
const D = '<i class="b kb">D</i>';
const key = (label: string) => `<kbd>${label}</kbd>`;
const row = (left: string, right: string) => `<tr><td>${left}</td><td>${right}</td></tr>`;
const or = (text: string) => `&nbsp;<span class="or">${text}</span>&nbsp;`;

/** Remplace les lettres A B C D d'une suite de coups par leurs pastilles. */
const withBadges = (inputs: string) =>
  escapeHtml(inputs).replace(/\bA\b/g, A).replace(/\bB\b/g, B).replace(/\bC\b/g, C).replace(/\bD\b/g, D);

let shownChar: Character | null = null;

const BADGES: Record<Button, string> = { lp: A, hp: B, lk: C, hk: D };

/** Manipulation des deux coups spéciaux : quart de cercle, ou charge pour les styles à charge. */
function specialInputs(char: Character): { s1: string; s2: string } {
  if (char.style.input === 'charge') {
    return {
      s1: `<b>← tenu</b> ½ s, puis <b>→</b> + ${A} ou ${B}`,
      s2: `<b>↓ tenu</b> ½ s, puis <b>↑</b> + ${C} ou ${D}`,
    };
  }
  return { s1: `<b>↓ ↘ →</b> + ${A} ou ${B}`, s2: `<b>↓ ↙ ←</b> + ${C} ou ${D}` };
}

/** Suites des coups spéciaux (enchaînements en plusieurs temps, sorties de posture), récursivement. */
function followUpRows(char: Character): string {
  const rows: string[] = [];
  const visit = (move: MoveDef, depth: number) => {
    const followUps = move.followUps;
    if (!followUps || depth > 3) return;
    const when = followUps.onHit ? 'quand il touche' : 'pendant la posture';
    const seen = new Set<string>();
    for (const next of Object.values(followUps.moves)) {
      const key = next.name;
      const buttons = (Object.entries(followUps.moves) as [Button, MoveDef][])
        .filter(([, m]) => m.name === next.name)
        .map(([b]) => BADGES[b])
        .join(' ou ');
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push(
        row(`après <b>${escapeHtml(move.name)}</b>, ${when} : ${buttons}`, `<b>${escapeHtml(next.name)}</b>`),
      );
      visit(next, depth + 1);
    }
  };
  visit(char.style.moves.s1h, 0);
  visit(char.style.moves.s2h, 0);
  return rows.join('');
}
let returnTo: ScreenName = 'options';

function render(): void {
  const char = shownChar ?? roster[0]!;
  const { names } = char.style;
  const select = $<HTMLSelectElement>('#mvSel');
  select.innerHTML = roster
    .map((c) => `<option value="${c.id}">${escapeHtml(c.name)} — ${c.style.label}</option>`)
    .join('');
  select.value = char.id;

  $('#mvBody').innerHTML = `
    <h3>Commandes</h3>
    <table>
      ${row('Tactile', `Joystick à gauche (il apparaît sous ton pouce) · boutons ${A} ${B} ${C} ${D} à droite. Un seul bouton à la fois suffit pour tout faire.`)}
      ${row('Clavier (1 joueur)', `Déplacement ${key('Z Q S D')} / ${key('W A S D')} ou flèches · ${A} ${key('U')} ${B} ${key('I')} ${C} ${key('J')} ${D} ${key('K')} · pause ${key('Échap')}`)}
      ${row('Clavier (2 joueurs)', `J1 : ${key('ZQSD')} + ${key('F')} ${key('G')} ${key('V')} ${key('B')} — J2 : flèches + ${key('O')} ${key('P')} ${key('L')} ${key('M / ;')}`)}
      ${row('Manette', 'Croix ou stick · X/Y = poings · A/B = pieds · Start = pause')}
    </table>
    <h3>Bases</h3>
    <table>
      ${row(`${A} poing léger · ${B} poing fort`, `${C} pied léger · ${D} pied fort`)}
      ${row('Se protéger', 'Maintiens <b>← (arrière)</b>. Les coups bas se bloquent accroupi <b>↙</b>, les coups sautés et le marteau se bloquent debout.')}
      ${row("Sauter / s'accroupir", "<b>↑</b> / <b>↓</b> — tous les boutons marchent aussi en l'air et accroupi")}
      ${row('Ruée', '<b>→ →</b> rapidement (ou <b>← ←</b> pour une esquive arrière invincible)')}
      ${row(`↓ + ${B}`, "Uppercut : <b>lance l'adversaire en l'air</b>. Maintiens ↑ pour le suivre et continuer le combo.")}
      ${row(`↓ + ${D}`, 'Balayette : fait tomber')}
      ${row(`→ + ${B}`, 'Marteau : touche les adversaires accroupis en garde')}
    </table>
    <h3>Coups spéciaux de ${escapeHtml(char.name)}</h3>
    <table>
      ${row(`${specialInputs(char).s1}${or('ou en combo')}${B} puis ${B}`, `<b>${escapeHtml(names.s1)}</b>`)}
      ${row(`${specialInputs(char).s2}${or('ou en combo')}${D} puis ${D}`, `<b>${escapeHtml(names.s2)}</b>`)}
      ${followUpRows(char)}
      ${row(`<b>↓ ↓</b> + ${A}/${B}${or('ou en combo')}encore ${B} ou ${D} après un coup spécial`, `<b class="sup">${escapeHtml(names.super)}</b> — jauge SUPER pleine`)}
    </table>
    <h3>Combos</h3>
    <p class="note">Règle d'or : quand un coup <b>touche</b>, appuie tout de suite sur un autre bouton. Les 4 boutons s'enchaînent dans l'ordre que tu veux (une fois chacun, les légers jusqu'à 3 fois). Rappuyer sur le <b>même bouton fort</b> déclenche le coup spécial, et une 3ᵉ fois le SUPER si la jauge est pleine.</p>
    <table>${COMBO_EXAMPLES.map(([title, inputs]) => row(escapeHtml(title), withBadges(inputs))).join('')}</table>`;
}

/** @param from écran auquel revenir avec le bouton Retour */
export function openMoves(from: ScreenName, char: Character | null = null): void {
  returnTo = from;
  if (char) shownChar = char;
  render();
  showScreen('moves');
}

export function backFromMoves(): void {
  playSfx('back');
  showScreen(returnTo);
}

export function initMoves(): void {
  on('#mvBack', backFromMoves);
  on(
    '#mvSel',
    (event) => {
      shownChar = characterById((event.target as HTMLSelectElement).value) ?? null;
      render();
    },
    'change',
  );
}
