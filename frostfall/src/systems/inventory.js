import { S } from './state.js';
import { bus } from './bus.js';
import { ITEMS, SLOT_OF } from '../data/items.js';
import { recalc } from './stats.js';
import { sfx } from '../audio/sfx.js';

export const count = (id) => S.inv[id] || 0;

export function addItem(id, n = 1, quiet = false) {
  S.inv[id] = (S.inv[id] || 0) + n;
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
  S.gold += n;
  bus.emit('toast', `+${n} GOLD`, 13);
}

export function addArrows(n) {
  S.arrows += n;
  bus.emit('toast', `+${n} ARROWS`, 5);
}

export function equip(id) {
  const slot = SLOT_OF[ITEMS[id]?.type];
  if (!slot || !count(id)) return false;
  S.equip[slot] = id;
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
