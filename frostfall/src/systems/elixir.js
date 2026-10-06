// Elixirs: stronger, shorter potions with a price. One active at a time; meals (systems/food.js) stack with them.
import { S } from './state.js';
import { ITEMS } from '../data/items.js';
import { bus } from './bus.js';
import { sfx } from '../audio/sfx.js';

export function activeElixir() {
  const id = S.flags.elixir;
  return id && S.flags.elixirUntil > (S.playtime || 0) && ITEMS[id]?.elixir ? ITEMS[id].elixir : null;
}
export const elixirVal = (k, none = 0) => activeElixir()?.[k] ?? none;

export function drinkElixir(id, gs) {
  const it = ITEMS[id];
  if (!it?.elixir || !S.inv[id]) { sfx.play('nostamina'); return false; }
  S.inv[id]--; if (S.inv[id] <= 0) delete S.inv[id];
  S.flags.elixir = id; S.flags.elixirUntil = (S.playtime || 0) + it.elixir.dur;
  sfx.play('potion');
  if (gs?.player) gs.fx.puff(gs.player.x, gs.player.y, 14, 10, 34, 0.5);
  bus.emit('toast', it.name.toUpperCase() + '!', 14);
  return true;
}
export function elixirTick() {
  if (S.flags.elixir && !(S.flags.elixirUntil > (S.playtime || 0))) { delete S.flags.elixir; delete S.flags.elixirUntil; bus.emit('toast', 'THE ELIXIR WEARS OFF', 4); }
}
