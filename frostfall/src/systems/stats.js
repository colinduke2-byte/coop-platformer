import { S } from './state.js';
import { ITEMS } from '../data/items.js';
import { blessing } from './bless.js';
const blessMul = (k) => blessing()?.[k] ?? 1;

const eq = (slot) => ITEMS[S.equip[slot]] || null;
const upg = (id) => (S.upgrades && S.upgrades[id]) || 0;

export const stats = {
  weapon: () => eq('weapon'),
  weaponDmg: () => { const w = eq('weapon'); return w ? w.dmg + upg(S.equip.weapon) * 2 : 3; },
  is2H: () => eq('weapon')?.type === 'weapon2h',
  offhand: () => eq('offhand'),
  // off-hand 1H weapon (dual wield) damage, or 0
  offhandDmg: () => { const o = eq('offhand'); return o && o.type === 'weapon' ? o.dmg + upg(S.equip.offhand) * 2 : 0; },
  shield: () => { const o = eq('offhand'); return o && o.type === 'shield' ? { id: S.equip.offhand, block: o.block + upg(S.equip.offhand) * 0.02, cost: o.cost } : null; },
  bowDmg: () => { const b = eq('bow'); return b ? b.dmg + upg(S.equip.bow) * 1.5 : 4; },
  armor: () => { const a = eq('armor'); return a ? a.armor + upg(S.equip.armor) * 0.02 : 0; },
  // armour-set traits: multipliers default to 1
  trait: (k) => (eq('armor')?.[k] ?? 1) * (k === 'moveMul' ? blessMul('moveMul') : k === 'manaCostMul' ? blessMul('manaCostMul') : 1),
  // sum of a numeric property over everything equipped (crit, lifesteal, goldMul...)
  sum: (k) => ['weapon', 'offhand', 'bow', 'armor', 'charm'].reduce((a, sl) => a + (eq(sl)?.[k] || 0), 0) + (blessing()?.[k] && k !== 'goldMul' ? blessing()[k] : 0),
  mul: (k) => ['weapon', 'offhand', 'bow', 'armor', 'charm'].reduce((a, sl) => a * (eq(sl)?.[k] ?? 1), 1) * (blessing()?.[k] ?? 1),
  enchant: () => S.enchants?.[S.equip.weapon] || eq('weapon')?.elem || null,
};

// Recompute max pools from equipment, level-up choices and perks (call after equip changes / load).
export function recalc() {
  const ch = eq('charm') || {}, ar = eq('armor') || {};
  const bl = blessing() || {};
  const rested = S.flags && S.flags.restedUntil > (S.playtime || 0) ? 25 : 0;
  S.maxHp = 100 + (bl.maxHp || 0) + rested + (ch.maxHp || 0) + (ar.maxHp || 0) + (S.bonusHp || 0);
  S.maxMp = 100 + (bl.maxMp || 0) + (ch.maxMp || 0) + (ar.maxMp || 0) + (S.bonusMp || 0);
  S.maxSp = 100 + (ch.maxSp || 0) + (ar.maxSp || 0) + (S.bonusSp || 0);
  S.hp = Math.min(S.hp, S.maxHp);
  S.mp = Math.min(S.mp, S.maxMp);
  S.sp = Math.min(S.sp, S.maxSp);
}
