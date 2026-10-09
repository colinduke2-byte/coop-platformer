// Daily shop rotation and buy-back. The stock changes every in-game day and differs per run seed.
import { S } from '../systems/state.js';
import { today } from '../systems/bless.js';
import { ITEMS } from './items.js';

const rngFor = (who) => {
  let h = ((S.seed || 1) ^ (today() * 2654435761) ^ [...who].reduce((a, c) => a * 31 + c.charCodeAt(0), 7)) >>> 0;
  return () => { h = (Math.imul(h ^ (h >>> 15), 2246822507) + 3266489917) >>> 0; return h / 4294967296; };
};

export const POOLS = {
  Hilda: [['woodsmans_bill', 1.9], ['iron_halberd', 1.8], ['warhammer', 1.9], ['crossbow', 1.8], ['hand_axe', 1.9], ['hunting_spear', 1.9], ['iron_mace', 1.9], ['bearded_axe', 2.1], ['ash_spear', 2.1], ['war_mace', 2.1], ['steel_sword', 1.9], ['hunter_garb', 1.9], ['bulwark_plate', 1.7], ['iron_shield', 1.9], ['iron_greatsword', 1.8], ['skinning_knife', 1.9], ['fire_arrow', 2, 6]],
  Mirra: [['walking_staff', 2], ['hazel_staff', 1.6], ['tome_embernova', 1.5], ['tome_glacier', 1.5], ['tome_blink', 1.6], ['tome_shock', 1.6], ['tome_nova', 1.6], ['tome_wolf', 1.6], ['tome_meteor', 1.5], ['berserker_draught', 2], ['quicksilver_tonic', 2], ['nightsight_elixir', 2], ['ironhide_brew', 2], ['frostward_tonic', 2], ['mp_potion_g', 2], ['hp_potion_g', 2]],
};

// n wares for today: [{ id, price, once?, n?, name? }]
export function dailyWares(who, n = 3) {
  const pool = (POOLS[who] || []).slice(), R = rngFor(who), out = [];
  while (out.length < n && pool.length) {
    const [id, mul, qty] = pool.splice(Math.floor(R() * pool.length), 1)[0];
    if (!ITEMS[id]) continue;
    const price = Math.round(ITEMS[id].value * mul);
    out.push(qty ? { id, price: Math.round(price * qty * 0.8), n: qty, name: `${ITEMS[id].name} x${qty}` } : { id, price, once: !(ITEMS[id].type === 'potion' || ITEMS[id].type === 'elixir' || ITEMS[id].type === 'ammo') });
  }
  return out;
}

// Sold items you may buy back (last 8), at 120% of what you were paid.
export function noteSold(id, n, paid) {
  S.buyback = S.buyback || [];
  const row = S.buyback.find((r) => r.id === id);
  if (row) { row.n += n; row.paid += paid; } else S.buyback.unshift({ id, n, paid });
  S.buyback = S.buyback.slice(0, 8);
}
