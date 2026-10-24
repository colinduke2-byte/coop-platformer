// Arena Mode unlocks (PR-24): hero cloaks bought with your best score and run modifiers opened by your best wave.
// All of it is derived from the arena records on this device (records.js); the last pick is kept there as `_pick`.
// Nothing here changes the campaign's economy: the one thing that crosses over is a cloak colour (achievements CLOAKS).
import { loadRecords, saveRecords, bestWave, bestScore } from './records.js';

// cloak colours (palette indexes, the same sheets as the campaign's cloaks). `score` = best score in any mode,
// `wave` = best wave in a wave mode. Champion's Pale is the arena's own prize, and the campaign gets it too.
export const ARENA_CLOAKS = [
  { col: 11, name: 'EMBER RED' },
  { col: 15, name: 'FROST BLUE', score: 600 },
  { col: 8, name: 'PINE GREEN', score: 1200 },
  { col: 14, name: 'HEART VIOLET', score: 2000 },
  { col: 13, name: 'DRAGON GOLD', score: 3000 },
  { col: 5, name: "CHAMPION'S PALE", wave: 15 },
];
export const CHAMPION_CLOAK = { col: 5, wave: 15 };

// run modifiers: harder runs for a better score. `mods` are campaign challenge modifiers (data/mods.js) switched on for
// the run; `emberfall` and `chaos` are handled in quickRun.js. The Daily Arena keeps its own two modifiers.
export const ARENA_MODS = [
  { id: 'none', name: 'NONE', desc: 'THE ARENA AS IT IS.', mul: 1 },
  { id: 'glass', name: 'GLASS CANNON', desc: 'DEAL, TAKE 50% MORE.', wave: 5, mul: 1.25, mods: ['glass'] },
  { id: 'brittle', name: 'BRITTLE BONES', desc: 'TAKE +30%, FOES -25% HP.', wave: 8, mul: 1.15, mods: ['brittle'] },
  { id: 'emberfall', name: 'EMBERFALL', desc: 'EMBERS RAIN IN ANY ROOM.', wave: 12, mul: 1.2 },
  { id: 'chaos', name: 'CHAOS', desc: 'A TWIST EVERY WAVE.', wave: 16, mul: 1.25 },
  { id: 'frail', name: 'FRAIL', desc: '-30% HP, HARDER STAGGER.', wave: 20, mul: 1.3, mods: ['frail'] },
];
export const arenaModById = (id) => ARENA_MODS.find((m) => m.id === id) || ARENA_MODS[0];

const open = (u, r) => (!u.wave || bestWave(r) >= u.wave) && (!u.score || bestScore(r) >= u.score);
export const cloakOpen = (c, r = loadRecords()) => open(c, r);
export const modOpen = (m, r = loadRecords()) => open(m, r);
// "LOCKED: REACH WAVE 12" / "LOCKED: SCORE 1200"
export const lockHint = (u) => (u.wave ? `LOCKED: REACH WAVE ${u.wave}` : `LOCKED: SCORE ${u.score}`);

// every unlock that is open now, as names, so the results card can say what a run just opened
export function openUnlocks(r = loadRecords()) {
  return [...ARENA_CLOAKS.filter((c) => (c.wave || c.score) && cloakOpen(c, r)).map((c) => `${c.name} CLOAK`),
    ...ARENA_MODS.filter((m) => m.wave && modOpen(m, r)).map((m) => `${m.name} MODIFIER`)];
}

// the last cloak and modifier you started with (kept in the records)
export const lastPick = () => ({ cloak: 11, mod: 'none', ...(loadRecords()._pick || {}) });
export function savePick(pick) { const r = loadRecords(); r._pick = { ...lastPick(), ...pick }; saveRecords(r); }
