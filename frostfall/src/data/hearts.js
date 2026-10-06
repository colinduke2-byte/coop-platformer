// The Hearts: relics the Hollow Kings bound the Long Winter with. Each one you take gives a lasting power.
import { S } from '../systems/state.js';

export const HEARTS = {
  rime: { name: 'Rime Heart', place: 'THE GLACIAL MAW', desc: 'Frost runs in your veins: +20 max stamina, and a perfect dodge freezes everything around you.' },
  iron: { name: 'Iron Heart', place: 'IRONWATCH KEEP', desc: 'Your skin hardens: +8% armour and +10% melee damage.' },
  tide: { name: 'Tide Heart', place: 'THE DROWNED CHAPEL', desc: 'The tide carries you: rolls cost 35% less stamina and stamina returns 25% faster.' },
  root: { name: 'Root Heart', place: 'THE ROOTVAULT', desc: 'Life clings to you: you slowly regain health, and potions heal 25% more.' },
};
export const HEART_ORDER = ['rime', 'iron', 'tide', 'root'];
export const HEART_COUNT = 4;
export const heartsHeld = () => Object.keys(S.hearts || {}).filter((k) => S.hearts[k]).length;
export const hasHeart = (k) => !!(S.hearts && S.hearts[k]);
// which dungeon holds each Heart: the world POI id and the map id
export const HEART_SITE = { rime: { poi: 'maw0', map: 'maw' }, iron: { poi: 'fort0', map: 'keep' }, tide: { poi: 'temple0', map: 'chapel' }, root: { poi: 'rootvault0', map: 'rootvault' } };
