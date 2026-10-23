// Spell strength from gear, in one place (PR-01, PR-04): the staff in hand, its element bonuses (which reach every spell of
// that element), its forge level and the gems in it. playerMagic reads spellGear(spell) and spellCostGear(spell).
import { S } from './state.js';
import { ITEMS } from '../data/items.js';

// Which element each spell belongs to. A staff's elemMul / spellCost keyed by an element reaches every spell of it.
export const SPELL_ELEM = { fire: 'fire', embernova: 'fire', meteor: 'fire', sunbeam: 'fire', frost: 'frost', nova: 'frost', glacier: 'frost', shock: 'shock' };
export const FROST_SPELLS = Object.keys(SPELL_ELEM).filter((k) => SPELL_ELEM[k] === 'frost');

const staff = () => ITEMS[S.equip?.weapon] || {};
// The gear multiplier on a spell's damage (skill, perks and crits are applied by the caller).
export function spellGear(spell, w = staff()) {
  return (w.spellMul ?? 1) * (w.elemMul?.[SPELL_ELEM[spell]] ?? w.elemMul?.[spell] ?? 1);
}
// The gear multiplier on a spell's mana cost: a per-spell entry wins over a per-element one.
export function spellCostGear(spell, w = staff()) {
  return (w.manaCostMul ?? 1) * (w.spellCost?.[spell] ?? w.spellCost?.[SPELL_ELEM[spell]] ?? 1);
}
