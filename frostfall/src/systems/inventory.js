import { TUNE } from '../data/tuning.js';
import { S } from './state.js';
import { modMul } from '../data/mods.js';
import { bus } from './bus.js';
import { ITEMS, SLOT_OF } from '../data/items.js';
import { recalc, stats } from './stats.js';
import { sfx } from '../audio/sfx.js';
import { tip } from './tips.js';

export const count = (id) => S.inv[id] || 0;

export function addItem(id, n = 1, quiet = false) {
  S.inv[id] = (S.inv[id] || 0) + n;
  (S.found ||= {})[id] = true;
  if (!quiet) bus.emit('toast', `+${n > 1 ? n + ' ' : ''}${ITEMS[id].name}`, 6);
  bus.emit('item:added', id, n);
}

export function removeItem(id, n = 1) {
  if (count(id) < n) return false;
  S.inv[id] -= n;
  if (S.inv[id] <= 0) {
    delete S.inv[id];
    const slot = SLOT_OF[ITEMS[id].type];
    if (slot && S.equip[slot] === id) S.equip[slot] = null;
  }
  recalc();
  return true;
}

export function addGold(n) {
  n = Math.round(n * stats.mul('goldMul') * modMul('goldMul'));
  S.gold += n;
  bus.emit('toast', `+${n} GOLD`, 13);
}

export function addArrows(n) {
  const room = Math.max(0, TUNE.player.bow.maxArrows - S.arrows);
  const got = Math.min(n, room);
  S.arrows += got;
  bus.emit('toast', got ? `+${got} ARROWS${got < n ? ' (FULL)' : ''}` : 'QUIVER FULL', got ? 5 : 4);
  return got;
}

export function equip(id, forceSlot = null) {
  const it = ITEMS[id];
  let slot = SLOT_OF[it?.type];
  if (!slot || !count(id)) return false;
  if (forceSlot === 'offhand' && it.type === 'weapon') slot = 'offhand';
  const main = ITEMS[S.equip.weapon];
  if (slot === 'offhand' && main?.type === 'weapon2h') { bus.emit('toast', 'TWO-HANDED WEAPON EQUIPPED', 11); sfx.play('nostamina'); return false; }
  if (it.type === 'weapon2h') S.equip.offhand = null;       // greatswords need both hands
  if (slot === 'weapon' && S.equip.offhand === id && count(id) < 2) S.equip.offhand = null;
  S.equip[slot] = id;
  if (it.type === 'shield') tip('block');
  recalc();
  sfx.play('equip');
  return true;
}
export function unequip(slot) {
  if (!S.equip[slot]) return false;
  S.equip[slot] = null;
  recalc();
  sfx.play('back');
  return true;
}
