// The Hearts: relics the Hollow Kings bound the Long Winter with. Each one you take gives a lasting power.
import { S } from '../systems/state.js';

export const HEARTS = {
  rime: { name: 'Rime Heart', place: 'THE GLACIAL MAW', desc: 'Frost runs in your veins: +20 max stamina, and a perfect dodge freezes everything around you.' },
};
export const HEART_COUNT = 4;
export const heartsHeld = () => Object.keys(S.hearts || {}).filter((k) => S.hearts[k]).length;
