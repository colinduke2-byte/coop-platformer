import { S } from './state.js';
import { ITEMS } from '../data/items.js';

const eq = (slot) => ITEMS[S.equip[slot]] || null;

export const stats = {
  weaponDmg: () => eq('weapon')?.dmg ?? 3,
  bowDmg: () => eq('bow')?.dmg ?? 4,
  armor: () => eq('armor')?.armor ?? 0,
};

// Recompute max pools from equipment (call after equip changes / load).
export function recalc() {
  const ch = eq('charm') || {};
  S.maxHp = 100 + (ch.maxHp || 0);
  S.maxMp = 100 + (ch.maxMp || 0);
  S.maxSp = 100 + (ch.maxSp || 0);
  S.hp = Math.min(S.hp, S.maxHp);
  S.mp = Math.min(S.mp, S.maxMp);
  S.sp = Math.min(S.sp, S.maxSp);
}
