// Gear sets: wear two or three pieces of a set together for a bonus. Pure data + lookup; stats.js reads setBonus(key).
import { S } from './state.js';

export const SETS = {
  ember: {
    name: 'Emberforged', items: ['ember_mail', 'ember_blade', 'ember_axe', 'ember_spear', 'ember_bulwark', 'ember_crown'],
    bonus: { 2: { crit: 0.04 }, 3: { armor: 0.05, maxHp: 25 } },
  },
  court: {
    name: 'Anvil Court Regalia', items: ['court_plate', 'court_hammer', 'court_signet'],
    bonus: { 2: { armor: 0.04 }, 3: { armor: 0.04, goldMul: 0.15, maxHp: 20 } },
  },
  delver: {
    name: "Delver's Kit", items: ['delver_hauberk', 'delver_pick', 'delver_charm'],
    bonus: { 2: { crit: 0.05 }, 3: { crit: 0.05, maxSp: 25, lifesteal: 0.02 } },
  },
  warden: {
    name: 'Warden Panoply', items: ['warden_cuirass', 'warden_shield', 'warden_badge'],
    bonus: { 2: { armor: 0.04 }, 3: { armor: 0.04, maxHp: 30, maxMp: 20 } },
  },
};

export const setOf = (id) => Object.keys(SETS).find((k) => SETS[k].items.includes(id)) || null;

// How many pieces of each set are worn right now.
export function wornSets() {
  const out = {};
  for (const sl of ['weapon', 'offhand', 'bow', 'armor', 'charm']) {
    const k = setOf(S.equip?.[sl]);
    if (k) out[k] = (out[k] || 0) + 1;
  }
  return out;
}
// Summed numeric bonus for a key (crit, armor, maxHp...) from every set worn.
export function setBonus(key) {
  let sum = 0;
  const worn = wornSets();
  for (const k in worn) for (const n of [2, 3]) if (worn[k] >= n) sum += SETS[k].bonus[n][key] || 0;
  return sum;
}
export function setSummary() {
  const worn = wornSets();
  return Object.keys(worn).map((k) => `${SETS[k].name} ${worn[k]}/${SETS[k].items.length}`);
}
