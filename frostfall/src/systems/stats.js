import { S } from './state.js';
import { classMix } from './burden.js';
import { ITEMS } from '../data/items.js';
import { blessing } from './bless.js';
import { foodVal } from './food.js';
import { elixirVal } from './elixir.js';
import { relicBonus } from './relics.js';
import { modMul, modSum } from '../data/mods.js';
import { isBroken, BROKEN_MUL } from './durability.js';
import { gemBonus, runeElem, runeBonus } from './sockets.js';
import { TUNE } from '../data/tuning.js';
import { setBonus } from './sets.js';
import { upgraded } from './upgrades.js';
const blessMul = (k) => blessing()?.[k] ?? 1;

const eq = (slot) => ITEMS[S.equip[slot]] || null;
const upg = (id) => (S.upgrades && S.upgrades[id]) || 0;

// The trophy wall at home (once bought) grants +5 health for every 3 trophies.
const trophyHp = () => (S.flags?.furn?.trophywall ? Math.floor(Object.keys(S.trophies || {}).length / 3) * 5 : 0);

const CLASS_TRAIT = { moveMul: 'move', detectMul: 'detect', manaCostMul: 'spell' };   // armour class effects folded into the set traits
export const stats = {
  weapon: () => eq('weapon'),
  bow: () => eq('bow'),
  weight: () => eq('armor')?.weight || 'medium',
  // damage gems count in the item they sit in (PR-05): the weapon's (and the weapon rune's) for the weapon, the bow's for the bow
  weaponDmg: () => { const w = eq('weapon'); return (w ? upgraded('weapon', upg(S.equip.weapon), w.dmg) + gemBonus('dmg', ['weapon']) + runeBonus('dmg') : 3) * (isBroken(S.equip.weapon) ? BROKEN_MUL.weapon : 1); },
  is2H: () => eq('weapon')?.type === 'weapon2h',
  offhand: () => eq('offhand'),
  // off-hand 1H weapon (dual wield) damage, or 0
  offhandDmg: () => { const o = eq('offhand'); return o && o.type === 'weapon' ? upgraded('weapon', upg(S.equip.offhand), o.dmg) + gemBonus('dmg', ['offhand']) : 0; },
  shield: () => { const o = eq('offhand'); return o && o.type === 'shield' ? { id: S.equip.offhand, block: upgraded('shield', upg(S.equip.offhand), o.block) * (isBroken(S.equip.offhand) ? BROKEN_MUL.shield : 1), cost: o.cost } : null; },
  bowDmg: () => { const b = eq('bow'); return b ? upgraded('bow', upg(S.equip.bow), b.dmg) + gemBonus('dmg', ['bow']) : 4; },
  // Crit chance (PR-05), capped at TUNE.economy.critCap. Melee: the weapon, an off-hand weapon, helmet, armour, charm, sets
  // and the gems in the weapons and armour. The bow: the bow, helmet, armour, charm, sets and the bow's gems.
  meleeCrit: () => critOf(['weapon', ...(eq('offhand')?.type === 'weapon' ? ['offhand'] : []), 'head', 'armor', 'charm'], ['weapon', 'offhand', 'armor']),
  bowCrit: () => critOf(['bow', 'head', 'armor', 'charm'], ['bow', 'armor']),
  armor: () => { const a = eq('armor'), h = eq('head'); return (a ? (upgraded('armor', upg(S.equip.armor), a.armor) + gemBonus('armor')) * (isBroken(S.equip.armor) ? BROKEN_MUL.armor : 1) : 0) + (h ? upgraded('helm', upg(S.equip.head), h.armor) * (isBroken(S.equip.head) ? BROKEN_MUL.armor : 1) : 0) + (S.hearts?.iron ? 0.08 : 0) + setBonus('armor'); },
  // armour-set traits: multipliers default to 1
  trait: (k) => (eq('armor')?.[k] ?? 1) * (eq('head')?.[k] ?? 1) * (CLASS_TRAIT[k] ? classMix()[CLASS_TRAIT[k]] : 1) * (k === 'moveMul' ? blessMul('moveMul') * foodVal('moveMul', 1) * elixirVal('moveMul', 1) * modMul('moveMul') : k === 'manaCostMul' ? blessMul('manaCostMul') * (S.weather === 'aurora' ? 0.8 : 1) : 1),
  // sum of a numeric property over everything equipped (crit, lifesteal, goldMul...)
  sum: (k) => setBonus(k) + gemBonus(k) + modSum(k) + ['weapon', 'offhand', 'bow', 'head', 'armor', 'charm'].reduce((a, sl) => a + (eq(sl)?.[k] || 0), 0) + (blessing()?.[k] && k !== 'goldMul' ? blessing()[k] : 0),
  mul: (k) => ['weapon', 'offhand', 'bow', 'head', 'armor', 'charm'].reduce((a, sl) => a * (eq(sl)?.[k] ?? 1), 1) * (k === 'goldMul' && S.follower && S.companion === 'pell' ? 1.1 : 1) * (blessing()?.[k] ?? 1),
  // Gold find (PR-06, PR-25): every source adds its bonus (an item's goldMul 1.15 adds +15%, the Court set +15%, Pell +10%,
  // the Fox blessing +30%), capped at TUNE.economy.goldFindCap. Challenge modifiers (modMul) multiply on top, in addGold.
  goldFind: () => {
    const items = ['weapon', 'offhand', 'bow', 'head', 'armor', 'charm'].reduce((a, sl) => a + Math.max(0, (eq(sl)?.goldMul ?? 1) - 1), 0);
    const add = items + setBonus('goldMul') + (S.follower && S.companion === 'pell' ? TUNE.economy.pellGold : 0) + Math.max(0, (blessing()?.goldMul ?? 1) - 1);
    return 1 + Math.min(TUNE.economy.goldFindCap, add);
  },
  // PR-13: how the element your weapon hits with fares against an enemy: 'WEAK', 'RESISTS' or ''
  elemVs: (cfg) => { const en = stats.enchant(); const m = en && cfg?.weak ? cfg.weak[en.type] ?? 1 : 1; return m > 1 ? 'WEAK' : m < 1 ? 'RESISTS' : ''; },
  enchant: () => S.enchants?.[S.equip.weapon] || eq('weapon')?.elem || runeElem(),
};

function critOf(slots, gemSlots) {
  const c = setBonus('crit') + gemBonus('crit', gemSlots) + runeBonus('crit') + modSum('crit') + (blessing()?.crit || 0) + slots.reduce((a, sl) => a + (eq(sl)?.crit || 0), 0);
  return Math.min(TUNE.economy.critCap, c);
}

// Recompute max pools from equipment, level-up choices and perks (call after equip changes / load).
export function recalc() {
  const ch = eq('charm') || {}, ar = eq('armor') || {}, he = eq('head') || {};
  const bl = blessing() || {};
  const rested = S.flags && S.flags.restedUntil > (S.playtime || 0) ? 25 : 0;
  S.maxHp = 100 + (bl.maxHp || 0) + rested + (ch.maxHp || 0) + (ar.maxHp || 0) + (he.maxHp || 0) + (S.bonusHp || 0) + (S.flags?.choiceGrove === 'keep' ? 20 : 0) + foodVal('maxHp') + relicBonus().hp + trophyHp() + modSum('maxHp') + gemBonus('maxHp') + setBonus('maxHp');
  S.maxHp = Math.round(S.maxHp * modMul('maxHpMul'));
  S.maxMp = 100 + (bl.maxMp || 0) + (ch.maxMp || 0) + (ar.maxMp || 0) + (he.maxMp || 0) + (S.bonusMp || 0) + foodVal('maxMp') + relicBonus().mp + modSum('maxMp') + gemBonus('maxMp') + setBonus('maxMp');
  S.maxSp = 100 + (S.hearts?.rime ? 20 : 0) + (ch.maxSp || 0) + (ar.maxSp || 0) + (he.maxSp || 0) + (S.bonusSp || 0) + foodVal('maxSp') + modSum('maxSp') + gemBonus('maxSp') + setBonus('maxSp');
  S.hp = Math.min(S.hp, S.maxHp);
  S.mp = Math.min(S.mp, S.maxMp);
  S.sp = Math.min(S.sp, S.maxSp);
}
