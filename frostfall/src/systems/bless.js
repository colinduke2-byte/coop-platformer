// Shrine blessings and pacts: one is active at a time and changes how a run plays.
import { S } from './state.js';

export const BLESSINGS = {
  wolf: { name: 'Wolf', kind: 'blessing', desc: '+12% speed, 8% crit chance.', fx: { moveMul: 1.12, crit: 0.08 } },
  bear: { name: 'Bear', kind: 'blessing', desc: '+45 max health, 10% less damage taken.', fx: { maxHp: 45, takenMul: 0.9 } },
  raven: { name: 'Raven', kind: 'blessing', desc: '+50 max mana, spells cost 20% less.', fx: { maxMp: 50, manaCostMul: 0.8 } },
  fox: { name: 'Fox', kind: 'blessing', desc: '+30% gold found, 6% lifesteal.', fx: { goldMul: 1.3, lifesteal: 0.06 } },
  blood: { name: 'Blood Pact', kind: 'pact', desc: 'Deal +30% damage, take +25% damage.', fx: { dmgMul: 1.3, takenMul: 1.25 } },
  glass: { name: 'Glass Pact', kind: 'pact', desc: 'Deal +60% damage, max health -45.', fx: { dmgMul: 1.6, maxHp: -45 } },
  hunger: { name: 'Hunger Pact', kind: 'pact', desc: '15% lifesteal, but stamina regenerates 30% slower.', fx: { lifesteal: 0.15, spRegenMul: 0.7 } },
};
export const blessing = () => (S.blessing && BLESSINGS[S.blessing] ? BLESSINGS[S.blessing].fx : null);
export const bl = (k, d = 0) => blessing()?.[k] ?? d;
export const blMul = (k) => blessing()?.[k] ?? 1;
// Three offers, seeded by the shrine and the day so a shrine shows the same choices all day.
export function offersFor(shrineId, day) {
  const ids = Object.keys(BLESSINGS);
  let h = 0; for (const c of `${shrineId}:${day}:${S.seed}`) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const out = [];
  const blessings = ids.filter((i) => BLESSINGS[i].kind === 'blessing'), pacts = ids.filter((i) => BLESSINGS[i].kind === 'pact');
  out.push(blessings[h % blessings.length]);
  out.push(blessings[(h >>> 3) % blessings.length] === out[0] ? blessings[((h >>> 3) + 1) % blessings.length] : blessings[(h >>> 3) % blessings.length]);
  out.push(pacts[(h >>> 6) % pacts.length]);
  return out;
}

// The in-game day number (a day is 12 real minutes of play).
export const today = () => Math.floor((S.playtime || 0) / 720);
// S.killed[key]: -1 = gone for good, otherwise the day it was taken (it comes back the next day).
export function isGone(key) {
  const v = S.killed?.[key];
  return v === -1 || (v !== undefined && v === today());
}
export function markGone(key, permanent) { S.killed = S.killed || {}; S.killed[key] = permanent ? -1 : today(); }
