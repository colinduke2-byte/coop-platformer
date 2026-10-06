// Cooked food gives a five-minute buff (measured in play time, so it survives saving).
import { S } from './state.js';
import { ITEMS } from '../data/items.js';
import { bus } from './bus.js';
import { sfx } from '../audio/sfx.js';
import { recalc } from './stats.js';

export const FOOD_SECONDS = 300;

export function activeFood() {
  const id = S.flags.food;
  return id && S.flags.foodUntil > (S.playtime || 0) && ITEMS[id]?.food ? ITEMS[id].food : null;
}
export const foodVal = (k, none = 0) => activeFood()?.[k] ?? none;

export function eatFood(id, gs) {
  const it = ITEMS[id];
  if (!it?.food || !S.inv[id]) { sfx.play('nostamina'); return false; }
  S.inv[id]--; if (S.inv[id] <= 0) delete S.inv[id];
  S.flags.food = id; S.flags.foodUntil = (S.playtime || 0) + FOOD_SECONDS;
  recalc();
  const f = it.food;
  if (f.heal) S.hp = Math.min(S.maxHp, S.hp + f.heal);
  if (f.healSp) S.sp = Math.min(S.maxSp, S.sp + f.healSp);
  sfx.play('potion');
  if (gs?.player) gs.fx.puff(gs.player.x, gs.player.y, 12, 8, 30, 0.5);
  bus.emit('toast', it.name.toUpperCase() + '!', 12);
  return true;
}

// Call every frame: ends the buff when it runs out.
export function foodTick() {
  if (S.flags.food && !(S.flags.foodUntil > (S.playtime || 0))) {
    delete S.flags.food; delete S.flags.foodUntil; recalc();
    bus.emit('toast', 'YOU FEEL HUNGRY AGAIN', 4);
  }
}

// ---- cooking at campfires
// Recipes that combine ingredients (single raw fish cook on their own, see ITEMS[...].cook)
export const COMBOS = [
  { from: ['venison', 'snowberry'], to: 'hunters_stew' },
  { from: ['raw_trout', 'snowberry'], to: 'fish_stew' },
  { from: ['snowberry', 'snowberry', 'frost_lily'], to: 'berry_tart' },
  { from: ['venison', 'wolf_fang'], to: 'spiced_venison' },
  { from: ['raw_eel', 'raw_trout'], to: 'ember_chowder' },
  { from: ['raw_pike', 'raw_pike'], to: 'pike_feast' },
];
export const COOKABLE = () => {
  const out = [];
  for (const [id, n] of Object.entries(S.inv)) if (n > 0 && ITEMS[id]?.cook) out.push({ from: [id], to: ITEMS[id].cook, label: ITEMS[id].name });
  for (const c of COMBOS) if (c.from.every((id) => (S.inv[id] || 0) >= c.from.filter((x) => x === id).length)) out.push({ ...c, label: c.from.map((id) => ITEMS[id].name).filter((v, i, a) => a.indexOf(v) === i).join(' + ') });
  return out;
};
export function cook(r) {
  for (const id of r.from) { S.inv[id]--; if (S.inv[id] <= 0) delete S.inv[id]; }
  S.inv[r.to] = (S.inv[r.to] || 0) + 1;
  S.fish ||= {}; S.fish.cooked = (S.fish.cooked || 0) + 1;
  sfx.play('potion');
  bus.emit('toast', 'COOKED: ' + ITEMS[r.to].name.toUpperCase(), 12);
}
