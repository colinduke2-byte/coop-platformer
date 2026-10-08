import { S, SKILLS } from './state.js';
import { bus } from './bus.js';
import { charLevelFor } from './damage.js';
import { perkById } from '../data/perks.js';

export const MAX_LVL = 20;
export const SKILL_DEFS = {
  oneHanded: { name: 'One-Handed', short: '1H', perk: 'Sword damage +5%, swings cost 3% less stamina' },
  archery: { name: 'Archery', short: 'ARC', perk: 'Arrow damage +5%, bow draws 5% faster' },
  destruction: { name: 'Destruction', short: 'DES', perk: 'Spell damage +5%, spells cost 3% less mana' },
  restoration: { name: 'Restoration', short: 'RES', perk: 'Healing +10%, wards absorb 12% more' },
  sneak: { name: 'Sneak', short: 'SNK', perk: 'Detection range -3%, sneak attacks hit 0.2x harder' },
};
// A steep curve: level 5 is ~125 sword hits, level 10 ~900, level 20 several thousand. Mastery is earned.
export const xpNeeded = (lvl) => Math.round(25 + 12 * Math.pow(lvl, 1.6));
export const lvl = (k) => S.skills[k].lvl;
const L = (k) => lvl(k) - 1;

export function addXp(skill, amt) {
  const s = S.skills[skill];
  if (!s || s.lvl >= MAX_LVL) return;
  s.xp += amt;
  while (s.lvl < MAX_LVL && s.xp >= xpNeeded(s.lvl)) {
    s.xp -= xpNeeded(s.lvl);
    s.lvl++;
    S.skillUps = (S.skillUps || 0) + 1;
    bus.emit('levelup', skill, s.lvl);
    const cl = charLevelFor(S.skillUps);
    if (cl > (S.charLevel || 1)) {
      S.charLevel = cl; S.perkPoints = (S.perkPoints || 0) + 1; S.pendingStat = (S.pendingStat || 0) + 1;
      bus.emit('charlevel', cl);
    }
  }
}

// All gameplay bonuses derived from skill levels, in one place.
export const bonus = {
  melee: () => 1 + 0.05 * L('oneHanded'),
  swingCost: () => Math.max(0.5, 1 - 0.03 * L('oneHanded')),
  arrow: () => 1 + 0.05 * L('archery'),
  drawTime: () => Math.max(0.4, (1 - 0.05 * L('archery')) * (S.perks.steadyhand ? 0.8 : 1)),
  spell: () => 1 + 0.05 * L('destruction'),
  manaCost: () => Math.max(0.5, 1 - 0.03 * L('destruction')),
  detect: () => Math.max(0.25, (1 - 0.03 * L('sneak')) * (S.perks.shadowstep ? 0.8 : 1)),
  sneakAttack: () => 0.2 * L('sneak'),
  heal: () => 1 + 0.1 * L('restoration'),
  ward: () => 1 + 0.12 * L('restoration'),
};
export { SKILLS };

// Can this perk be bought right now?
export function perkState(id) {
  const p = perkById[id];
  if (S.perks[id]) return 'owned';
  if (lvl(p.skill) < p.lvl || (p.req && !S.perks[p.req])) return 'locked';
  return (S.perkPoints || 0) > 0 ? 'available' : 'nopoints';
}
export function buyPerk(id) {
  if (perkState(id) !== 'available') return false;
  S.perks[id] = true; S.perkPoints--;
  bus.emit('toast', 'PERK: ' + perkById[id].name.toUpperCase(), 13);
  return true;
}
