// Spell tomes: reading one teaches a spell for good, whatever your skill level.
import { S } from './state.js';
import { ITEMS } from '../data/items.js';
import { bus } from './bus.js';
import { sfx } from '../audio/sfx.js';

export const tomeKnown = (spell) => !!S.tomes?.[spell];
export function readTome(id) {
  const it = ITEMS[id];
  if (!it?.teach || !S.inv[id]) return false;
  if (tomeKnown(it.teach)) { bus.emit('toast', 'YOU ALREADY KNOW THAT SPELL', 4); sfx.play('nostamina'); return false; }
  S.inv[id]--; if (S.inv[id] <= 0) delete S.inv[id];
  S.tomes = { ...(S.tomes || {}), [it.teach]: true };
  bus.emit('toast', `YOU LEARN ${it.name.replace('Tome of ', '').toUpperCase()}`, 14); sfx.play('levelup');
  return true;
}
