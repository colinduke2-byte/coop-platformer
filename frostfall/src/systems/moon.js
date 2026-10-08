// The calendar and the moon: a day count (S.days) and an eight-phase moon. The full moon wakes the werewolves,
// the new moon is the darkest night, and a blood moon (rare) brings a great wolf.
import { S } from './state.js';

export const PHASES = ['NEW MOON', 'WAXING CRESCENT', 'FIRST QUARTER', 'WAXING GIBBOUS', 'FULL MOON', 'WANING GIBBOUS', 'LAST QUARTER', 'WANING CRESCENT'];
export const moonPhase = () => (Math.floor(S.days || 0) % 8 + 8) % 8;
export const isFull = () => moonPhase() === 4;
export const isNew = () => moonPhase() === 0;
export const isBlood = () => isFull() && Math.floor((S.days || 0) / 8) % 3 === 1;     // every third full moon
export const moonName = () => (isBlood() ? 'BLOOD MOON' : PHASES[moonPhase()]);
// Move the clock forward, counting the midnights crossed.
export function advanceTime(mins) {
  const t = (S.time || 0) + mins;
  S.days = (S.days || 0) + Math.floor(t / 1440);
  S.time = ((t % 1440) + 1440) % 1440;
}
// How many creatures swap: more on a full moon.
export const wolfChance = () => (isBlood() ? 1 : isFull() ? 0.9 : 0.5);
export const ghostChance = () => (isNew() ? 0.65 : 0.3);
