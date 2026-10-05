import { S } from './state.js';
import { ITEMS } from '../data/items.js';

const eq = (slot) => ITEMS[S.equip[slot]] || null;
const upg = (id) => (S.upgrades && S.upgrades[id]) || 0;

export const stats = {
  weapon: () => eq('weapon'),
  weaponDmg: () => { const w = eq('weapon'); return w ? w.dmg + upg(S.equip.weapon) * 2 : 3; },
  is2H: () => eq('weapon')?.type === 'weapon2h',
  offhand: () => eq('offhand'),
  // off-hand 1H weapon (dual wield) damage, or 0
  offhandDmg: () => { const o = eq('offhand'); return o && o.type === 'weapon' ? o.dmg + upg(S.equip.offhand) * 2 : 0; },
  shield: () => { const o = eq('offhand'); return o && o.type === 'shield' ? { id: S.equip.offhand, block: o.block + upg(S.equip.offhand) * 0.02, cost: o.cost } : null; },
  bowDmg: () => { const b = eq('bow'); return b ? b.dmg + upg(S.equip.bow) * 1.5 : 4; },
  armor: () => { const a = eq('armor'); return a ? a.armor + upg(S.equip.armor) * 0.02 : 0; },
  enchant: () => S.enchants?.[S.equip.weapon] || null,
};

// Recompute max pools from equipment, level-up choices and perks (call after equip changes / load).
export function recalc() {
  const ch = eq('charm') || {};
  S.maxHp = 100 + (ch.maxHp || 0) + (S.bonusHp || 0);
  S.maxMp = 100 + (ch.maxMp || 0) + (S.bonusMp || 0);
  S.maxSp = 100 + (ch.maxSp || 0) + (S.bonusSp || 0);
  S.hp = Math.min(S.hp, S.maxHp);
  S.mp = Math.min(S.mp, S.maxMp);
  S.sp = Math.min(S.sp, S.maxSp);
}
