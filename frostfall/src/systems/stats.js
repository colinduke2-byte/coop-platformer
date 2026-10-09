import { S } from './state.js';
import { ITEMS } from '../data/items.js';
import { blessing } from './bless.js';
import { foodVal } from './food.js';
import { elixirVal } from './elixir.js';
import { relicBonus } from './relics.js';
import { modMul, modSum } from '../data/mods.js';
import { isBroken, BROKEN_MUL } from './durability.js';
import { gemBonus, runeElem } from './sockets.js';
import { setBonus } from './sets.js';
const blessMul = (k) => blessing()?.[k] ?? 1;

const eq = (slot) => ITEMS[S.equip[slot]] || null;
const upg = (id) => (S.upgrades && S.upgrades[id]) || 0;

// The trophy wall at home (once bought) grants +5 health for every 3 trophies.
const trophyHp = () => (S.flags?.furn?.trophywall ? Math.floor(Object.keys(S.trophies || {}).length / 3) * 5 : 0);

export const stats = {
  weapon: () => eq('weapon'),
  bow: () => eq('bow'),
  weight: () => eq('armor')?.weight || 'medium',
  weaponDmg: () => { const w = eq('weapon'); return (w ? w.dmg + upg(S.equip.weapon) * 2 + gemBonus('dmg') : 3) * (isBroken(S.equip.weapon) ? BROKEN_MUL.weapon : 1); },
  is2H: () => eq('weapon')?.type === 'weapon2h',
  offhand: () => eq('offhand'),
  // off-hand 1H weapon (dual wield) damage, or 0
  offhandDmg: () => { const o = eq('offhand'); return o && o.type === 'weapon' ? o.dmg + upg(S.equip.offhand) * 2 : 0; },
  shield: () => { const o = eq('offhand'); return o && o.type === 'shield' ? { id: S.equip.offhand, block: (o.block + upg(S.equip.offhand) * 0.02) * (isBroken(S.equip.offhand) ? BROKEN_MUL.shield : 1), cost: o.cost } : null; },
  bowDmg: () => { const b = eq('bow'); return b ? b.dmg + upg(S.equip.bow) * 1.5 : 4; },
  armor: () => { const a = eq('armor'), h = eq('head'); return (a ? (a.armor + upg(S.equip.armor) * 0.02 + gemBonus('armor')) * (isBroken(S.equip.armor) ? BROKEN_MUL.armor : 1) : 0) + (h ? h.armor * (isBroken(S.equip.head) ? BROKEN_MUL.armor : 1) : 0) + (S.hearts?.iron ? 0.08 : 0) + setBonus('armor'); },
  // armour-set traits: multipliers default to 1
  trait: (k) => (eq('armor')?.[k] ?? 1) * (eq('head')?.[k] ?? 1) * (k === 'moveMul' ? blessMul('moveMul') * foodVal('moveMul', 1) * elixirVal('moveMul', 1) * modMul('moveMul') : k === 'manaCostMul' ? blessMul('manaCostMul') * (S.weather === 'aurora' ? 0.8 : 1) : 1),
  // sum of a numeric property over everything equipped (crit, lifesteal, goldMul...)
  sum: (k) => setBonus(k) + gemBonus(k) + modSum(k) + ['weapon', 'offhand', 'bow', 'head', 'armor', 'charm'].reduce((a, sl) => a + (eq(sl)?.[k] || 0), 0) + (blessing()?.[k] && k !== 'goldMul' ? blessing()[k] : 0),
  mul: (k) => ['weapon', 'offhand', 'bow', 'head', 'armor', 'charm'].reduce((a, sl) => a * (eq(sl)?.[k] ?? 1), 1) * (k === 'goldMul' && S.follower && S.companion === 'pell' ? 1.1 : 1) * (blessing()?.[k] ?? 1),
  enchant: () => S.enchants?.[S.equip.weapon] || eq('weapon')?.elem || runeElem(),
};

// Recompute max pools from equipment, level-up choices and perks (call after equip changes / load).
export function recalc() {
  const ch = eq('charm') || {}, ar = eq('armor') || {}, he = eq('head') || {};
  const bl = blessing() || {};
  const rested = S.flags && S.flags.restedUntil > (S.playtime || 0) ? 25 : 0;
  S.maxHp = 100 + (bl.maxHp || 0) + rested + (ch.maxHp || 0) + (ar.maxHp || 0) + (he.maxHp || 0) + (S.bonusHp || 0) + foodVal('maxHp') + relicBonus().hp + trophyHp() + modSum('maxHp') + gemBonus('maxHp') + setBonus('maxHp');
  S.maxHp = Math.round(S.maxHp * modMul('maxHpMul'));
  S.maxMp = 100 + (bl.maxMp || 0) + (ch.maxMp || 0) + (ar.maxMp || 0) + (he.maxMp || 0) + (S.bonusMp || 0) + foodVal('maxMp') + relicBonus().mp + modSum('maxMp') + gemBonus('maxMp') + setBonus('maxMp');
  S.maxSp = 100 + (S.hearts?.rime ? 20 : 0) + (ch.maxSp || 0) + (ar.maxSp || 0) + (he.maxSp || 0) + (S.bonusSp || 0) + foodVal('maxSp') + modSum('maxSp') + gemBonus('maxSp') + setBonus('maxSp');
  S.hp = Math.min(S.hp, S.maxHp);
  S.mp = Math.min(S.mp, S.maxMp);
  S.sp = Math.min(S.sp, S.maxSp);
}
