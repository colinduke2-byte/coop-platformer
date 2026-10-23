// Spell strength from gear, in one place (PR-01, PR-04): the staff in hand, its element bonuses (which reach every spell of
// that element), its forge level and the gems in it. playerMagic reads spellGear(spell) and spellCostGear(spell).
import { S } from './state.js';
import { ITEMS } from '../data/items.js';
import { TUNE } from '../data/tuning.js';
import { upgraded } from './upgrades.js';
import { socketed } from './sockets.js';
import { isBroken, BROKEN_MUL } from './durability.js';

// Which element each spell belongs to. A staff's elemMul / spellCost keyed by an element reaches every spell of it.
export const SPELL_ELEM = { fire: 'fire', embernova: 'fire', meteor: 'fire', sunbeam: 'fire', frost: 'frost', nova: 'frost', glacier: 'frost', shock: 'shock' };
export const FROST_SPELLS = Object.keys(SPELL_ELEM).filter((k) => SPELL_ELEM[k] === 'frost');

const staff = () => ITEMS[S.equip?.weapon] || {};
// The staff's own spell power with its forge level (PR-01: a staff's upgrades raise spells the way a sword's raise its damage)
// and the rubies in it (each point of a gem's damage is TUNE.economy.staffRubyPct of spell power).
export function staffPower(id = S.equip?.weapon) {
  const w = ITEMS[id] || {};
  if (w.style !== 'staff') return w.spellMul ?? 1;
  const gems = socketed(id).reduce((a, g) => a + (ITEMS[g]?.gem?.dmg || 0), 0);
  return upgraded('staff', S.upgrades?.[id] || 0, w.spellMul ?? 1) * (1 + gems * TUNE.economy.staffRubyPct) * (isBroken(id) ? BROKEN_MUL.weapon : 1);
}
// The gear multiplier on a spell's damage (skill, perks and crits are applied by the caller). Pass `w` to rate an item that
// is not the one in hand (its forge level and gems are then left out).
export function spellGear(spell, w = null) {
  const own = !w; w = w || staff();
  return (own ? staffPower() : w.spellMul ?? 1) * (w.elemMul?.[SPELL_ELEM[spell]] ?? w.elemMul?.[spell] ?? 1);
}
// The perk on a spell's damage (PR-18): Pyromancer for fire spells, Cryomancer for frost spells.
export const spellPerk = (spell) => (SPELL_ELEM[spell] === 'fire' && S.perks?.pyromancer) || (SPELL_ELEM[spell] === 'frost' && S.perks?.cryomancer) ? 1.15 : 1;
// The gear multiplier on a spell's mana cost: a per-spell entry wins over a per-element one.
export function spellCostGear(spell, w = staff()) {
  return (w.manaCostMul ?? 1) * (w.spellCost?.[spell] ?? w.spellCost?.[SPELL_ELEM[spell]] ?? 1);
}
