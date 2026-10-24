// Carry weight. Every item has a weight (explicit `wt` on the item, else a default by type); equipped gear counts at half.
// Soft limits only: over the capacity you are Burdened (slower, slower stamina regen), far over you are Overloaded (slow, no rolling).
// Nothing is ever refused or deleted. Gold, quest items and notes weigh nothing. See docs/WORLD_EXPANSION_PLAN.md.
import { TUNE } from '../data/tuning.js';
import { ITEMS } from '../data/items.js';
import { S } from './state.js';
import { bus } from './bus.js';
import { sfx } from '../audio/sfx.js';
import { tip } from './tips.js';

const BY_TYPE = {
  potion: 0.5, elixir: 0.5, tome: 0.5, gem: 0.5, rune: 0.5, charm: 0.5, misc: 0.5, whistle: 0.5,
  food: 0.25, ingredient: 0.25, ammo: 0.05, bleed: 0.25, fire: 0.25, frost: 0.25, poison: 0.25, shock: 0.25,
  weapon: 4, weapon2h: 9, bow: 3, shield: 5, quest: 0, note: 0, map: 0,
};
const ARMOR = { light: 4, medium: 8, heavy: 14 };
const HELM = { light: 2, medium: 4, heavy: 6 };

export function itemWeight(id) {
  const it = ITEMS[id];
  if (!it) return 0;
  if (it.wt != null) return it.wt;
  if (it.type === 'armor') return ARMOR[it.weight] ?? 8;
  if (it.type === 'helmet') return HELM[it.weight] ?? 4;
  if (it.style === 'dagger' || it.style === 'staff') return 2;
  return BY_TYPE[it.type] ?? 0.5;
}

// total carried weight (equipped items count once, at half; the rest at full)
export function carried() {
  const B = TUNE.burden, eq = new Set(Object.values(S.equip || {}).filter(Boolean));
  let w = 0;
  for (const [id, n] of Object.entries(S.inv || {})) {
    if (!n || !ITEMS[id]) continue;
    const per = itemWeight(id);
    const wornN = eq.has(id) ? Math.min(n, Object.values(S.equip).filter((e) => e === id).length) : 0;   // one dagger in each hand counts twice
    w += per * (n - wornN) + per * wornN * B.equipHalf;
  }
  return w + (S.arrows || 0) * BY_TYPE.ammo;
}

const classOf = (id) => (TUNE.player.weights[ITEMS[id]?.weight] ? ITEMS[id].weight : null);   // unknown classes count as medium
export function capacity() {
  const B = TUNE.burden, W = TUNE.player.weights;
  const arm = W[classOf(S.equip?.armor) || 'medium'].carry, helm = S.equip?.head ? W[classOf(S.equip.head) || 'medium'].carry * 0.5 : 0;
  return Math.round(B.base + Math.max(0, (S.maxSp || 100) - 100) * B.perSp + arm + helm + (S.mounted ? B.pony : 0));
}

// 'ok' | 'burdened' | 'over'. Read several times a frame (movement, regen, HUD), so it is worked out at most ten times a second.
let cacheT = -1, cacheL = 'ok', cacheInv = null, cacheEq = null, lastSeen = 'ok';
export function level() {
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (now - cacheT < 100 && cacheT >= 0 && cacheInv === S.inv && cacheEq === S.equip) return cacheL;
  const c = carried(), cap = capacity();
  cacheT = now; cacheInv = S.inv; cacheEq = S.equip; cacheL = c <= cap ? 'ok' : c <= cap * TUNE.burden.over ? 'burdened' : 'over';
  return cacheL;
}
export const invalidate = () => { cacheT = -1; };
// Called every frame by the player: a warning the moment you tip over a line, whatever caused it (loot, selling, gear, food wearing off).
export function watch() {
  const l = level();
  if (l !== lastSeen && l !== 'ok') tip('burden');
  if (l !== lastSeen && l !== 'ok' && (lastSeen === 'ok' || l === 'over')) { bus.emit('toast', l === 'over' ? 'OVERLOADED: NO ROLLING. SELL OR STASH SOMETHING' : 'BURDENED: YOU MOVE SLOWER', 12); sfx.play('heavy'); }
  lastSeen = l;
}
export const moveMul = () => { const l = level(), B = TUNE.burden; return l === 'ok' ? 1 : l === 'burdened' ? B.burdened.move : B.overMove; };
export const regenMul = () => { const l = level(), B = TUNE.burden; return l === 'ok' ? 1 : l === 'burdened' ? B.burdened.regen : B.overRegen; };
export const canRoll = () => level() !== 'over';
export const moveFloor = () => (level() === 'over' ? TUNE.burden.overFloor : TUNE.burden.floor);
export const burden = { carried, capacity, level, moveMul, regenMul, canRoll, itemWeight, watch, invalidate, moveFloor };

// The armour-class effects: body armour in full, helmet at half strength. Unarmoured counts as medium.
export function classMix() {
  const W = TUNE.player.weights, a = W[classOf(S.equip?.armor) || 'medium'], hc = S.equip?.head ? classOf(S.equip.head) : null, h = hc ? W[hc] : W.medium;
  const out = {};
  for (const k of ['roll', 'knock', 'sp', 'move', 'detect', 'spell']) out[k] = a[k] * (1 + (h[k] - 1) * 0.5);
  return out;
}
