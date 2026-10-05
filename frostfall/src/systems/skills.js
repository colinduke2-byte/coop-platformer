import { S, SKILLS } from './state.js';
import { bus } from './bus.js';

export const MAX_LVL = 20;
export const SKILL_DEFS = {
  oneHanded: { name: 'One-Handed', short: '1H', perk: 'Sword damage +10%, swings cost 3% less stamina' },
  archery: { name: 'Archery', short: 'ARC', perk: 'Arrow damage +10%, bow draws 5% faster' },
  destruction: { name: 'Destruction', short: 'DES', perk: 'Spell damage +10%, spells cost 3% less mana' },
  restoration: { name: 'Restoration', short: 'RES', perk: 'Healing +10%, wards absorb 12% more' },
  sneak: { name: 'Sneak', short: 'SNK', perk: 'Detection range -3%, sneak attacks hit 0.2x harder' },
};
export const xpNeeded = (lvl) => 10 + lvl * 10;
export const lvl = (k) => S.skills[k].lvl;
const L = (k) => lvl(k) - 1;

export function addXp(skill, amt) {
  const s = S.skills[skill];
  if (!s || s.lvl >= MAX_LVL) return;
  s.xp += amt;
  while (s.lvl < MAX_LVL && s.xp >= xpNeeded(s.lvl)) {
    s.xp -= xpNeeded(s.lvl);
    s.lvl++;
    bus.emit('levelup', skill, s.lvl);
  }
}

// All gameplay bonuses derived from skill levels, in one place.
export const bonus = {
  melee: () => 1 + 0.1 * L('oneHanded'),
  swingCost: () => Math.max(0.5, 1 - 0.03 * L('oneHanded')),
  arrow: () => 1 + 0.1 * L('archery'),
  drawTime: () => Math.max(0.5, 1 - 0.05 * L('archery')),
  spell: () => 1 + 0.1 * L('destruction'),
  manaCost: () => Math.max(0.5, 1 - 0.03 * L('destruction')),
  detect: () => Math.max(0.35, 1 - 0.03 * L('sneak')),
  sneakAttack: () => 0.2 * L('sneak'),
  heal: () => 1 + 0.1 * L('restoration'),
  ward: () => 1 + 0.12 * L('restoration'),
};
export { SKILLS };
