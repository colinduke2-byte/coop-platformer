// Collecting the eight Hollow Relics (data/relics.js).
import { S } from './state.js';
import { RELICS } from '../data/relics.js';
import { addItem } from './inventory.js';
import { bus } from './bus.js';
import { sfx } from '../audio/sfx.js';
import { recalc } from './stats.js';

export const relicCount = () => RELICS.filter((r) => S.lore?.[r.id]).length;
// Bonuses that come with the collection (read by stats.recalc).
export const relicBonus = () => { const n = relicCount(); return { hp: n >= 3 ? 10 : 0, mp: n >= 6 ? 15 : 0 }; };

// Hand the player a random relic they do not own yet. Returns the relic or null.
export function grantRelic(scene) {
  const left = RELICS.filter((r) => !S.lore?.[r.id]);
  if (!left.length) return null;
  const r = left[Math.floor(Math.random() * left.length)];
  S.lore[r.id] = true;
  addItem(r.id, 1, true);
  const n = relicCount();
  bus.emit('toast', `RELIC FOUND: ${r.name.toUpperCase()} (${n}/8)`, 13); sfx.play('quest');
  if (n === 3) bus.emit('toast', 'RELIC SET: +10 MAX HEALTH', 8);
  if (n === 6) bus.emit('toast', 'RELIC SET: +15 MAX MANA', 8);
  if (n === 8) { addItem('hollow_crown', 1); bus.emit('toast', 'THE HOLLOW CROWN IS YOURS', 13); }
  recalc();
  return r;
}
export const maybeRelic = (scene, chance) => (Math.random() < chance ? grantRelic(scene) : null);
