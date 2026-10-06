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
export const COOKABLE = () => {
  const out = [];
  for (const [id, n] of Object.entries(S.inv)) if (n > 0 && ITEMS[id]?.cook) out.push({ from: [id], to: ITEMS[id].cook, label: ITEMS[id].name });
  if (S.inv.venison > 0 && S.inv.snowberry > 0) out.push({ from: ['venison', 'snowberry'], to: 'hunters_stew', label: 'Venison + Snowberry' });
  return out;
};
export function cook(r) {
  for (const id of r.from) { S.inv[id]--; if (S.inv[id] <= 0) delete S.inv[id]; }
  S.inv[r.to] = (S.inv[r.to] || 0) + 1;
  S.fish ||= {}; S.fish.cooked = (S.fish.cooked || 0) + 1;
  sfx.play('potion');
  bus.emit('toast', 'COOKED: ' + ITEMS[r.to].name.toUpperCase(), 12);
}
