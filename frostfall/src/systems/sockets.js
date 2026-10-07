// Gems: equipment can carry sockets; each socketed gem adds a flat bonus while the item is equipped.
import { S } from './state.js';
import { modSum } from '../data/mods.js';
import { ITEMS } from '../data/items.js';
import { count, addItem, removeItem } from './inventory.js';

const SOCKETABLE = new Set(['weapon', 'weapon2h', 'shield', 'bow', 'armor']);
export const socketCount = (id) => { const it = ITEMS[id]; if (!it || !SOCKETABLE.has(it.type)) return 0; return it.sockets ?? ((it.value || 0) >= 250 ? 2 : (it.value || 0) >= 90 ? 1 : 0); };
export const socketed = (id) => { const a = (S.sockets?.[id] || []).slice(0, socketCount(id)); while (a.length < socketCount(id)) a.push(null); return a; };
export const gemList = () => Object.keys(ITEMS).filter((k) => ITEMS[k].type === 'gem' && count(k) > 0);

export function insertGem(itemId, gemId) {
  if (count(gemId) < 1) return false;
  const a = socketed(itemId), i = a.indexOf(null);
  if (i < 0) return false;
  removeItem(gemId, 1);
  a[i] = gemId; (S.sockets = S.sockets || {})[itemId] = a;
  return true;
}
export function removeGem(itemId, idx) {
  const a = socketed(itemId);
  if (!a[idx]) return false;
  addItem(a[idx], 1, true);
  a[idx] = null; S.sockets[itemId] = a;
  return true;
}
// Sum of one bonus (dmg, armor, maxHp, crit, ...) over every equipped item's gems.
export function gemBonus(key) {
  let n = 0;
  for (const slot of ['weapon', 'offhand', 'bow', 'armor']) {
    const id = S.equip?.[slot];
    if (!id) continue;
    for (const g of socketed(id)) if (g) n += ITEMS[g]?.gem?.[key] || 0;
  }
  return n + runeBonus(key);
}

// ---- runes: one per weapon or armour, adding an effect rather than a stat
const RUNE_ON = { weapon: 'weapon', weapon2h: 'weapon', armor: 'armor' };
export const runeSlot = (id) => RUNE_ON[ITEMS[id]?.type] || null;
export const runeOf = (id) => S.runes?.[id] || null;
export const runeFits = (itemId, runeId) => !!runeSlot(itemId) && ITEMS[runeId]?.rune?.on === runeSlot(itemId);
export const runeList = (itemId) => Object.keys(ITEMS).filter((k) => ITEMS[k].type === 'rune' && count(k) > 0 && runeFits(itemId, k));
export function setRune(itemId, runeId) {
  if (!runeFits(itemId, runeId) || count(runeId) < 1) return false;
  if (runeOf(itemId)) unsetRune(itemId);
  removeItem(runeId, 1); (S.runes = S.runes || {})[itemId] = runeId; return true;
}
export function unsetRune(itemId) {
  const r = runeOf(itemId); if (!r) return false;
  addItem(r, 1, true); delete S.runes[itemId]; return true;
}
const equippedRunes = () => ['weapon', 'armor'].map((sl) => ITEMS[runeOf(S.equip?.[sl])]?.rune).filter(Boolean);
export const runeElem = () => ITEMS[runeOf(S.equip?.weapon)]?.rune?.elem || null;
export const runeThorns = () => equippedRunes().reduce((a, r) => a + (r.thorns || 0), 0) + modSum('thorns');
export const runeBonus = (key) => equippedRunes().reduce((a, r) => a + (typeof r[key] === 'number' ? r[key] : 0), 0);
