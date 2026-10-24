// The Hollow Arena's rewards (PR-24): wave gold that grows with your progress, and milestone prizes that exist nowhere else.
import { S } from './state.js';
import { TUNE } from '../data/tuning.js';
import { bus } from './bus.js';
import { addGold, addItem } from './inventory.js';
import { goldMul, storyFraction } from './enemyscale.js';
import { sfx } from '../audio/sfx.js';

// Gold for clearing wave w (paid through addGold, so gold find and modifiers apply): base + per wave, x the Gauntlet's bonus,
// x the same progress scaling ordinary enemies' gold gets (story share).
export function waveGold(w, mode) {
  const R = TUNE.economy.rewards;
  return addGold((R.arenaWave[0] + w * R.arenaWave[1]) * (mode === 'gauntlet' ? R.gauntlet : 1) * goldMul(storyFraction()), { quiet: true });
}
// Best-wave milestones: each prize once per run (arena records start over in New Game+, so a new cycle can win them again).
export const ARENA_PRIZES = [[10, 'arena_token'], [20, 'arena_crown'], [30, 'champion_blade']];
export function arenaMilestones(best) {
  S.arena ||= { best: 0 };
  const got = (S.arena.prizes ||= {}), out = [];
  for (const [w, id] of ARENA_PRIZES) if (best >= w && !got[w]) { got[w] = true; addItem(id, 1, true); out.push(id); }
  if (out.length) { bus.emit('toast', 'ARENA PRIZE: ' + out.map((id) => id.replace(/_/g, ' ').toUpperCase()).join(', '), 13); sfx.play('levelup'); }
  return out;
}
