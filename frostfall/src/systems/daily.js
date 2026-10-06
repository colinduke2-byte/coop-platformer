// The daily challenge: one shared seed and two modifiers per calendar day, scored locally.
import { S, resetState } from './state.js';
import { MOD_IDS } from '../data/mods.js';
import { heartsHeld } from '../data/hearts.js';

const KEY = 'frostfall_board';
export const dayStamp = (d = new Date()) => d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
export const dailySeed = (day = dayStamp()) => ((day * 2654435761) >>> 0) % 1000000000;
export function dailyMods(day = dayStamp()) {
  let h = (day * 40503) >>> 0; const next = () => { h = (Math.imul(h ^ (h >>> 15), 2246822507) + 3266489917) >>> 0; return h; };
  const pool = MOD_IDS.slice(), out = [];
  for (let i = 0; i < 2; i++) out.push(pool.splice(next() % pool.length, 1)[0]);
  return out;
}

export function runScore() {
  const r = S.run || {};
  const bosses = ['grimfangDone', 'wyrmDead', 'warlordDead', 'tideDead', 'rootDead', 'winterDead', 'dragonDead', 'rb_elk', 'rb_troll'].filter((k) => S.flags?.[k]).length;
  return Math.max(0, (r.kills || 0) * 2 + Math.floor((S.gold || 0) / 10) + (r.champions || 0) * 25 + (r.barrows || 0) * 60 + (r.chests || 0) * 8
    + bosses * 150 + heartsHeld() * 300 + (S.arena?.best || 0) * 40 + Object.keys(S.trophies || {}).length * 10 - (r.deaths || 0) * 40);
}

export function loadBoard() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } }
function saveBoard(b) { try { localStorage.setItem(KEY, JSON.stringify(b.slice(0, 40))); } catch { /* storage full or blocked */ } }

// Record (keep the best for) today's run. Safe to call often.
export function submitScore() {
  if (!S.daily) return null;
  const score = runScore(), b = loadBoard();
  let row = b.find((e) => e.day === S.daily.day);
  if (!row) { row = { day: S.daily.day, mods: S.daily.mods, score, time: Math.round(S.playtime || 0) }; b.push(row); }
  else if (score > row.score) { row.score = score; row.time = Math.round(S.playtime || 0); }
  b.sort((x, y) => y.score - x.score);
  saveBoard(b);
  return row;
}
export const topBoard = (n = 5) => loadBoard().slice(0, n);
export const todaysBest = () => loadBoard().find((e) => e.day === dayStamp())?.score || 0;

// Begin today's run from the title screen: a fresh character in the daily world with the daily modifiers.
export function startDaily() {
  const day = dayStamp();
  resetState();
  S.seed = dailySeed(day);
  S.mods = Object.fromEntries(dailyMods(day).map((m) => [m, true]));
  S.daily = { day, mods: dailyMods(day) };
  S.flags.introDone = true; S.flags.tutDone = true;
  return S;
}
