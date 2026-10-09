// Optional gear wear (Pause > System > DURABILITY). Off by default. Worn-out gear works at a fraction of its strength until repaired.
import { S } from './state.js';
import { TUNE } from '../data/tuning.js';
import { ITEMS } from '../data/items.js';
import { settings } from './settings.js';
import { bus } from './bus.js';

export const durOn = () => { const d = TUNE.difficulty[settings.difficulty]?.durability; return d === 'hard' ? settings.durabilityHard !== false : d == null ? !!settings.durability : d; };   // Easy: off, Hard: on, Normal: your option
const BASE = { common: 60, uncommon: 80, rare: 100, legend: 140 };
export const durMax = (id) => { const it = ITEMS[id]; return it ? (BASE[it.rarity] || 70) + (S.upgrades?.[id] || 0) * 12 : 0; };
export const durOf = (id) => (S.dur && S.dur[id] != null ? S.dur[id] : durMax(id));
export const isBroken = (id) => durOn() && !!id && !!ITEMS[id] && durOf(id) <= 0;
export const BROKEN_MUL = { weapon: 0.6, armor: 0.5, shield: 0.5 };

export function wear(id, n = 1) {
  if (!durOn() || !id || !ITEMS[id]) return;
  S.dur = S.dur || {};
  const was = durOf(id);
  S.dur[id] = Math.max(0, was - n);
  if (was > 0 && S.dur[id] === 0) bus.emit('toast', `YOUR ${ITEMS[id].name.toUpperCase()} IS BROKEN`, 11);
  else if (was > durMax(id) * 0.25 && S.dur[id] <= durMax(id) * 0.25) bus.emit('toast', `${ITEMS[id].name.toUpperCase()} IS WEARING THIN`, 12);
}
export const repairCost = (id) => Math.ceil((durMax(id) - durOf(id)) * (0.15 + (ITEMS[id]?.value || 10) / 400));
export function repairItem(id) { if (S.dur) delete S.dur[id]; }
export const damaged = () => Object.values(S.equip).filter((id) => id && ITEMS[id] && durOf(id) < durMax(id));
