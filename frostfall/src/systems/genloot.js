// Procedurally generated gear: a base item, a rarity and a few random affixes.
// Generated items are registered in ITEMS at runtime (id "g_<n>") and their definitions are kept in S.gen
// so they survive saving and loading.
import { ITEMS } from '../data/items.js';
import { S } from './state.js';

export const RARITY = [
  { id: 'common', name: 'Common', col: 5, affixes: 0, mult: 1, weight: 58 },
  { id: 'magic', name: 'Magic', col: 15, affixes: 1, mult: 1.12, weight: 28 },
  { id: 'rare', name: 'Rare', col: 13, affixes: 2, mult: 1.25, weight: 11 },
  { id: 'legend', name: 'Legendary', col: 14, affixes: 3, mult: 1.45, weight: 3 },
];

// slot -> base templates (stats at tier 0; they grow with tier)
const BASES = {
  weapon: [
    { name: 'Sword', type: 'weapon', icon: ['sword', 4], dmg: 12 },
    { name: 'Axe', type: 'weapon', icon: ['sword', 10], dmg: 14, swing: 1.1, costMul: 1.1 },
    { name: 'Dagger', type: 'weapon', icon: ['sword', 5], dmg: 8, swing: 0.75, costMul: 0.75 },
    { name: 'Greatsword', type: 'weapon2h', icon: ['sword', 15], dmg: 20, swing: 1.35, costMul: 1.5, sizeAdd: 5 },
  ],
  bow: [{ name: 'Bow', type: 'bow', icon: ['bow', 10], dmg: 9 }, { name: 'Longbow', type: 'bow', icon: ['bow', 8], dmg: 12 }],
  shield: [{ name: 'Buckler', type: 'shield', icon: ['shield', 9], block: 0.55, cost: 0.8 }, { name: 'Kite Shield', type: 'shield', icon: ['shield', 4], block: 0.68, cost: 0.9 }],
  armor: [
    { name: 'Jerkin', type: 'armor', icon: ['armor', 9], armor: 0.09 },
    { name: 'Hauberk', type: 'armor', icon: ['armor', 4], armor: 0.18 },
    { name: 'Plate', type: 'armor', icon: ['armor', 3], armor: 0.28, moveMul: 0.94 },
  ],
  charm: [{ name: 'Charm', type: 'charm', icon: ['charm', 12] }, { name: 'Ring', type: 'charm', icon: ['charm', 14] }, { name: 'Amulet', type: 'charm', icon: ['charm', 10] }],
};
const SLOT_WEIGHT = [['weapon', 34], ['bow', 12], ['shield', 12], ['armor', 26], ['charm', 16]];

// Affixes: where they may roll, how they change the item, and their name part.
const AFFIXES = [
  { id: 'keen', slots: ['weapon', 'bow'], pre: 'Keen', apply: (it, k) => { it.dmg = Math.round(it.dmg * (1.08 + 0.05 * k)); }, line: (it) => `+${Math.round((1.08 - 1) * 100)}%+ DAMAGE` },
  { id: 'crit', slots: ['weapon', 'bow', 'charm'], suf: 'of Precision', apply: (it, k) => { it.crit = +(0.06 + 0.03 * k).toFixed(2); }, line: (it) => `${Math.round(it.crit * 100)}% CRIT CHANCE` },
  { id: 'vamp', slots: ['weapon', 'charm'], pre: 'Vampiric', apply: (it, k) => { it.lifesteal = +(0.05 + 0.02 * k).toFixed(2); }, line: (it) => `${Math.round(it.lifesteal * 100)}% LIFESTEAL` },
  { id: 'ember', slots: ['weapon'], suf: 'of Embers', apply: (it, k) => { it.elem = { type: 'fire', power: 3 + 2 * k }; }, line: (it) => `FIRE +${it.elem.power}` },
  { id: 'rime', slots: ['weapon'], suf: 'of Rime', apply: (it, k) => { it.elem = { type: 'frost', power: 3 + 2 * k }; }, line: (it) => `FROST +${it.elem.power}, SLOWS` },
  { id: 'storm', slots: ['weapon'], suf: 'of Storms', apply: (it, k) => { it.elem = { type: 'shock', power: 4 + 2 * k }; }, line: (it) => `SHOCK +${it.elem.power}` },
  { id: 'swift', slots: ['weapon'], pre: 'Swift', apply: (it) => { it.swing = +((it.swing || 1) * 0.88).toFixed(2); }, line: () => 'FASTER SWINGS' },
  { id: 'light', slots: ['weapon', 'bow', 'armor'], pre: 'Light', apply: (it) => { it.costMul = +((it.costMul || 1) * 0.85).toFixed(2); it.moveMul = +((it.moveMul || 1) * 1.04).toFixed(2); }, line: () => 'CHEAPER, QUICKER' },
  { id: 'hardy', slots: ['armor', 'charm', 'shield'], pre: 'Hardy', apply: (it, k) => { it.maxHp = (it.maxHp || 0) + 15 + 8 * k; }, line: (it) => `+${it.maxHp} HEALTH` },
  { id: 'arcane', slots: ['armor', 'charm'], pre: 'Arcane', apply: (it, k) => { it.maxMp = (it.maxMp || 0) + 18 + 8 * k; }, line: (it) => `+${it.maxMp} MANA` },
  { id: 'vigor', slots: ['armor', 'charm'], pre: 'Vigorous', apply: (it, k) => { it.maxSp = (it.maxSp || 0) + 18 + 8 * k; }, line: (it) => `+${it.maxSp} STAMINA` },
  { id: 'ward', slots: ['armor', 'shield'], suf: 'of the Bear', apply: (it, k) => { if (it.armor != null) it.armor = +(it.armor + 0.04 + 0.02 * k).toFixed(2); else it.block = +Math.min(0.9, it.block + 0.06).toFixed(2); }, line: () => 'TOUGHER' },
  { id: 'shadow', slots: ['armor', 'charm'], suf: 'of Shadows', apply: (it) => { it.detectMul = 0.8; }, line: () => 'HARDER TO SPOT' },
  { id: 'greed', slots: ['charm', 'armor'], suf: 'of Plenty', apply: (it) => { it.goldMul = 1.25; }, line: () => '+25% GOLD FOUND' },
];

const pickW = (list, r) => { let t = list.reduce((a, [, w]) => a + w, 0) * r; for (const [v, w] of list) { t -= w; if (t <= 0) return v; } return list[0][0]; };

let counter = 0;
export function genItem(tier = 0, rnd = Math.random, forceRarity = null) {
  const slot = pickW(SLOT_WEIGHT, rnd());
  const base = BASES[slot][Math.floor(rnd() * BASES[slot].length)];
  // rarity: higher tiers shift odds upward
  let rar = forceRarity != null ? RARITY[forceRarity] : null;
  if (!rar) {
    const ws = RARITY.map((r, i) => [r, r.weight * (i === 0 ? Math.max(0.3, 1 - 0.2 * tier) : 1 + 0.55 * tier * i)]);
    rar = pickW(ws, rnd());
  }
  const scale = 1 + 0.22 * tier;
  const it = { ...base, rarity: rar.id, gen: true, tier };
  if (it.dmg) it.dmg = Math.round(it.dmg * scale * rar.mult);
  if (it.armor != null) it.armor = +Math.min(0.5, it.armor * (1 + 0.1 * tier) * (0.9 + 0.1 * rar.mult)).toFixed(2);
  if (it.block != null) it.block = +Math.min(0.88, it.block + 0.03 * tier).toFixed(2);
  if (slot === 'charm') { const k = ['maxHp', 'maxMp', 'maxSp'][Math.floor(rnd() * 3)]; it[k] = Math.round((20 + 8 * tier) * rar.mult); }
  // affixes
  const pool = AFFIXES.filter((a) => a.slots.includes(slot));
  const used = [];
  const prefixes = [], suffixes = [];
  for (let i = 0; i < rar.affixes && pool.length; i++) {
    const a = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
    if (a.pre && prefixes.length) { if (a.suf && !suffixes.length) { /* fall through */ } else continue; }
    if (a.suf && suffixes.length && !a.pre) continue;
    a.apply(it, Math.min(2, tier));
    used.push(a); if (a.pre && !prefixes.length) prefixes.push(a.pre); else if (a.suf) suffixes.push(a.suf);
  }
  it.affixLines = used.map((a) => a.line(it));
  it.name = `${prefixes[0] ? prefixes[0] + ' ' : ''}${it.name}${suffixes[0] ? ' ' + suffixes[0] : ''}`;
  if (slot === 'charm' && !prefixes.length) it.name = `${['Frost', 'Wolf', 'Raven', 'Ember', 'Oak'][Math.floor(rnd() * 5)]} ${it.name}`;
  it.value = Math.round(((it.dmg || 0) * 6 + (it.armor || 0) * 400 + (it.block || 0) * 120 + (it.maxHp || 0) + (it.maxMp || 0) + (it.maxSp || 0) + 20) * (1 + used.length * 0.5));
  it.icon = [it.icon[0], rar.id === 'common' ? it.icon[1] : rar.col];
  it.desc = describe(it);
  return it;
}

function describe(it) {
  const parts = [];
  if (it.dmg) parts.push(`DAMAGE ${it.dmg}`);
  if (it.armor != null) parts.push(`ARMOR ${Math.round(it.armor * 100)}%`);
  if (it.block != null) parts.push(`BLOCKS ${Math.round(it.block * 100)}%`);
  for (const l of it.affixLines || []) parts.push(l);
  if (it.maxHp && !(it.affixLines || []).some((l) => l.includes('HEALTH'))) parts.push(`+${it.maxHp} HEALTH`);
  if (it.maxMp && !(it.affixLines || []).some((l) => l.includes('MANA'))) parts.push(`+${it.maxMp} MANA`);
  if (it.maxSp && !(it.affixLines || []).some((l) => l.includes('STAMINA'))) parts.push(`+${it.maxSp} STAMINA`);
  return `${(RARITY.find((r) => r.id === it.rarity) || RARITY[0]).name.toUpperCase()}. ` + parts.join('. ') + '.';
}

// Create, register and return the id of a freshly generated item.
export function makeGenItem(tier = 0, rnd = Math.random, forceRarity = null) {
  const it = genItem(tier, rnd, forceRarity);
  const id = `g_${Date.now().toString(36)}${(counter++).toString(36)}`;
  registerGen(id, it);
  return id;
}
export function registerGen(id, def) {
  ITEMS[id] = def;
  S.gen = S.gen || {};
  S.gen[id] = def;
}
// Re-register every generated item from a loaded save.
export function rehydrateGen() {
  for (const [id, def] of Object.entries(S.gen || {})) ITEMS[id] = def;
}
export const rarityOf = (id) => RARITY.find((r) => r.id === ITEMS[id]?.rarity) || null;
