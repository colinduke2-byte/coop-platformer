// Gear upgrades, +1 to +10, in three material tiers. Pure maths and tables: no game state in here (see data/services.js for the smiths).
//   weapons and bows: more damage (a percent of the item's own damage)
//   body armour, helmets, shields: more armour / block (points)
// Tier I (+1 to +3) is the village smith, tier II (+4 to +6) the Emberhold smith, tier III (+7 to +10) the Great Anvil. See docs/UPGRADE_PLAN.md.
export const MAX_LEVEL = 10;
export const TIER_OF = (lv) => (lv <= 3 ? 1 : lv <= 6 ? 2 : 3);

// What buying level `lv` (1..10) costs: gold, a material and how many, and an optional second material.
export const UPGRADE_COST = [
  null,
  { gold: 50, mat: 'iron_ingot', n: 1 }, { gold: 90, mat: 'iron_ingot', n: 2 }, { gold: 140, mat: 'iron_ingot', n: 3 },
  { gold: 220, mat: 'ash_iron', n: 2 }, { gold: 300, mat: 'ash_iron', n: 3 }, { gold: 400, mat: 'ash_iron', n: 4 },
  { gold: 550, mat: 'ember_ore', n: 2 }, { gold: 700, mat: 'ember_ore', n: 3 },
  { gold: 900, mat: 'ember_ore', n: 4, mat2: 'heart_shard', n2: 1 }, { gold: 1200, mat: 'ember_ore', n: 5, mat2: 'heart_shard', n2: 1 },
];
// The highest level each kind of smith can do.
export const SMITH_CAP = { village: 3, emberhold: 6, anvil: 10 };

// Gain per level in each tier (index 0 = tier I). Weapons: fraction of base damage; the rest: points of armour or block.
const GAIN = {
  weapon: [0.05, 0.06, 0.08], bow: [0.05, 0.06, 0.08],
  armor: [0.015, 0.02, 0.025], helm: [0.005, 0.007, 0.01], shield: [0.015, 0.015, 0.015],
};
// Total gain after `level` upgrades.
export function totalGain(kind, level) {
  const g = GAIN[kind];
  if (!g) return 0;
  let sum = 0;
  for (let lv = 1; lv <= Math.min(MAX_LEVEL, Math.max(0, level | 0)); lv++) sum += g[TIER_OF(lv) - 1];
  return sum;
}
// The upgrade kind for an item type.
export const KIND_OF_TYPE = { weapon: 'weapon', weapon2h: 'weapon', bow: 'bow', armor: 'armor', helmet: 'helm', shield: 'shield' };
// The item's stat after upgrading: weapons and bows scale, armour/helmets/shields add points. `base` is the item's own number.
export function upgraded(kind, level, base) {
  const g = totalGain(kind, level);
  if (kind === 'weapon' || kind === 'bow') return base * (1 + g);
  if (kind === 'shield') return Math.min(0.9, base + g);
  return base + g;
}
// Which equipment slot each menu choice upgrades.
export const UPGRADE_SLOTS = [['weapon', 'WEAPON'], ['offhand', 'OFF-HAND / SHIELD'], ['bow', 'BOW'], ['armor', 'ARMOUR'], ['head', 'HELMET']];
// The stat itself, before and after the next level ("DAMAGE 9 -> 9.5"), for the forge screen.
export function gainBeforeAfter(kind, level, base) {
  if (!base) return null;
  const a = upgraded(kind, level, base), b = upgraded(kind, level + 1, base);
  if (kind === 'weapon' || kind === 'bow') return `DAMAGE ${Math.round(a * 10) / 10} -> ${Math.round(b * 10) / 10}`;
  const pct = (v) => (v * 100).toFixed(1).replace('.0', '') + '%';
  return `${kind === 'shield' ? 'BLOCK' : 'ARMOR'} ${pct(a)} -> ${pct(b)}`;
}
// A plain-words line for the next level's gain.
export function gainText(kind, level) {
  const next = totalGain(kind, level + 1) - totalGain(kind, level);
  return kind === 'weapon' || kind === 'bow' ? `+${Math.round(next * 100)}% DAMAGE` : kind === 'shield' ? `+${(next * 100).toFixed(1).replace('.0', '')}% BLOCK` : `+${(next * 100).toFixed(1).replace('.0', '')}% ARMOR`;
}
