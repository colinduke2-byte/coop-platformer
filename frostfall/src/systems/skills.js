import { S, SKILLS } from './state.js';
import { bus } from './bus.js';
import { charLevelFor } from './damage.js';
import { perkById, forkMate, MASTERY } from '../data/perks.js';
import { TUNE } from '../data/tuning.js';

export const MAX_LVL = 20;
export const SKILL_DEFS = {
  oneHanded: { name: 'One-Handed', short: '1H', perk: 'Melee damage +5%, swings cost 3% less stamina' },
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

// PR-20: mastery rewards a skill grants by itself at 15 and 20. Multipliers multiply, additive keys (bowCrit, sneakAttack) add.
const ADD = new Set(['bowCrit', 'sneakAttack']);
export function mastery(key) {
  let v = ADD.has(key) ? 0 : 1;
  for (const [skill, list] of Object.entries(MASTERY)) for (const m of list) if (S.skills[skill]?.lvl >= m.lvl && m.fx[key] != null) v = ADD.has(key) ? v + m.fx[key] : v * m.fx[key];
  return v;
}
export const nextMastery = (skill) => MASTERY[skill]?.find((m) => S.skills[skill].lvl < m.lvl) || null;

// All gameplay bonuses derived from skill levels, in one place.
export const bonus = {
  melee: () => (1 + 0.05 * L('oneHanded')) * mastery('melee'),
  swingCost: () => Math.max(0.5, 1 - 0.03 * L('oneHanded')) * mastery('swingCost'),
  arrow: () => 1 + 0.05 * L('archery'),
  drawTime: () => Math.max(0.3, Math.max(0.4, (1 - 0.05 * L('archery')) * (S.perks.steadyhand ? 0.8 : 1)) * (S.perks.quickdraw ? 0.85 : 1) * mastery('draw')),
  spell: () => (1 + 0.05 * L('destruction')) * mastery('spell'),
  manaCost: () => Math.max(0.5, 1 - 0.03 * L('destruction')) * mastery('manaCost'),
  detect: () => Math.max(0.25, (1 - 0.03 * L('sneak')) * (S.perks.shadowstep ? 0.8 : 1)) * mastery('detect'),
  sneakAttack: () => 0.2 * L('sneak') + mastery('sneakAttack'),
  heal: () => (1 + 0.1 * L('restoration')) * mastery('heal'),
  ward: () => (1 + 0.12 * L('restoration')) * mastery('ward'),
};
export { SKILLS };

// Can this perk be bought right now? 'owned' | 'taken' (the other option of its fork is owned) | 'locked' | 'available' | 'nopoints'
const reqMet = (p) => !p.req || (Array.isArray(p.req) ? p.req : [p.req]).some((r) => S.perks[r]);
export function perkState(id) {
  const p = perkById[id];
  if (S.perks[id]) return 'owned';
  const mate = forkMate(id);
  if (mate && S.perks[mate]) return 'taken';
  if (lvl(p.skill) < p.lvl || !reqMet(p)) return 'locked';
  return (S.perkPoints || 0) > 0 ? 'available' : 'nopoints';
}
export function buyPerk(id) {
  if (perkState(id) !== 'available') return false;
  S.perks[id] = true; S.perkPoints--;
  bus.emit('toast', 'PERK: ' + perkById[id].name.toUpperCase(), 13);
  return true;
}
// Respec (PR-18): unlearn every perk and get the points back, for gold (at a shrine). The price grows with what you unlearn.
export const respecCost = () => { const R = TUNE.economy.respec, n = Object.keys(S.perks || {}).filter((k) => S.perks[k]).length; return n ? R.base + R.perPerk * n : 0; };
export function respec() {
  const n = Object.keys(S.perks || {}).filter((k) => S.perks[k] && perkById[k]).length, cost = respecCost();
  if (!n || S.gold < cost) return false;
  S.gold -= cost; S.perks = {}; S.perkPoints = (S.perkPoints || 0) + n;
  bus.emit('toast', `PERKS UNLEARNED: ${n} POINTS BACK`, 15);
  return true;
}
