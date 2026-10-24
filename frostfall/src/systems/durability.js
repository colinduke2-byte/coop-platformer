// Optional gear wear (Pause > System > DURABILITY). Off by default. Worn-out gear works at a fraction of its strength until repaired.
import { S } from './state.js';
import { TUNE } from '../data/tuning.js';
import { ITEMS } from '../data/items.js';
import { settings } from './settings.js';
import { bus } from './bus.js';
import { own } from './instances.js';
import { sfx } from '../audio/sfx.js';

export const durOn = () => { const d = TUNE.difficulty[settings.difficulty]?.durability; return d === 'hard' ? settings.durabilityHard !== false : d == null ? !!settings.durability : d; };   // Easy: off, Hard: on, Normal: your option
const BASE = { common: 60, magic: 80, rare: 100, legend: 140, mythic: 160 };   // generated rarities (PR-07: was 'uncommon', which no item has)
export const durMax = (id) => { const it = ITEMS[id]; return it ? (BASE[it.rarity] || 70) + (S.upgrades?.[id] || 0) * 12 : 0; };
export const durOf = (id) => (S.dur && S.dur[id] != null ? S.dur[id] : durMax(id));
export const durShown = (id) => Math.ceil(durOf(id));            // bows and staves wear by fractions (PR-12)
export const isBroken = (id) => durOn() && !!id && !!ITEMS[id] && durOf(id) <= 0;
export const BROKEN_MUL = { weapon: 0.6, armor: 0.5, shield: 0.5 };

export function wear(id, n = 1) {
  if (!durOn() || !id || !ITEMS[id]) return;
  S.dur = S.dur || {};
  const was = durOf(id);
  id = own(id);                                          // PR-08: wear belongs to this copy
  S.dur[id] = Math.max(0, was - n);
  if (was > 0 && S.dur[id] === 0) { bus.emit('toast', `YOUR ${ITEMS[id].name.toUpperCase()} IS BROKEN`, 11); sfx.play('break'); }
  else if (was > durMax(id) * 0.25 && S.dur[id] <= durMax(id) * 0.25) bus.emit('toast', `${ITEMS[id].name.toUpperCase()} IS WEARING THIN`, 12);
}
// Repair (PR-12): per point of wear, a base plus a share per forge level plus a little of the item's value (capped), about a
// third of the old value-only price late on (a +10 Sunbreaker: 884 -> about 330 gold for a full repair).
export const repairCost = (id) => { const R = TUNE.economy.repair; return Math.ceil((durMax(id) - durOf(id)) * (R.base + R.perLevel * (S.upgrades?.[id] || 0) + Math.min(R.valueCap, (ITEMS[id]?.value || 10) / R.valueDiv))); };
export function repairItem(id) { if (S.dur) delete S.dur[id]; }
export const damaged = () => Object.values(S.equip).filter((id) => id && ITEMS[id] && durOf(id) < durMax(id));
