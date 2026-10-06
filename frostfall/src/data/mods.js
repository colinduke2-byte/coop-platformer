// Run modifiers (the daily challenge picks two) and the temporary boons of the arena's Boon Trial.
// modMul('dealMul') etc. multiplies every active source together.
import { S } from '../systems/state.js';

export const MODS = {
  glass: { name: 'Glass Cannon', desc: 'You deal and take 50% more damage.', dealMul: 1.5, takenMul: 1.5 },
  winter: { name: 'Endless Winter', desc: 'The blizzard never ends.' },
  hunted: { name: 'Hunted', desc: 'Elite foes are twice as common.', eliteMul: 2 },
  famine: { name: 'Famine', desc: 'Potions heal half as much, but you have 25 more stamina.', potionMul: 0.5, maxSp: 25 },
  frail: { name: 'Frail', desc: 'You have 30% less health, but your hits stagger much harder.', maxHpMul: 0.7, poiseMul: 1.6 },
};
export const MOD_IDS = Object.keys(MODS);

export const BOONS = {
  fury: { name: 'Fury', desc: '+10% damage', dealMul: 1.1 },
  bulwark: { name: 'Bulwark', desc: 'Take 8% less damage', takenMul: 0.92 },
  fleet: { name: 'Fleet Feet', desc: '+6% move speed', moveMul: 1.06 },
  vigor: { name: 'Vigor', desc: '+20 max health', maxHp: 20 },
  focus: { name: 'Focus', desc: '+25 max mana', maxMp: 25 },
  endurance: { name: 'Endurance', desc: '+25 max stamina', maxSp: 25 },
  lifeblood: { name: 'Lifeblood', desc: 'Heal 15% after each wave', waveHeal: 0.15 },
  gilded: { name: 'Gilded', desc: '+30% wave gold', goldMul: 1.3 },
  keen: { name: 'Keen Edge', desc: '+8% crit chance', crit: 0.08 },
};
export const BOON_IDS = Object.keys(BOONS);

// Product of a key over active modifiers and boons (stacks multiply); `none` when absent.
export function modMul(key, none = 1) {
  let v = none, hit = false;
  for (const id of Object.keys(S.mods || {})) if (S.mods[id] && MODS[id]?.[key] != null) { v *= MODS[id][key]; hit = true; }
  for (const [id, n] of Object.entries(S.boons || {})) if (BOONS[id]?.[key] != null) { v *= Math.pow(BOONS[id][key], n); hit = true; }
  return hit ? v : none;
}
// Sum of an additive key (max health / mana / stamina, crit).
export function modSum(key) {
  let v = 0;
  for (const id of Object.keys(S.mods || {})) if (S.mods[id] && MODS[id]?.[key] != null) v += MODS[id][key];
  for (const [id, n] of Object.entries(S.boons || {})) if (BOONS[id]?.[key] != null) v += BOONS[id][key] * n;
  return v;
}
export const hasMod = (id) => !!S.mods?.[id];
