// New Game+ with things to earn (PR-17, PR-24, PR-26). One place for every NG+ rule:
//   - enemies: early regions never drop below a floor of progress, and bosses scale too (Enemy.js reads ngProgress / ngBoss);
//   - loot: generated items roll ng tiers higher, and the Mythic rarity exists only in NG+ (genloot);
//   - the Great Anvil goes past +10 (to +12, "Ascended") with Winter's Echo, a material only NG+ bosses drop (upgrades.maxLevel);
//   - each NG cycle has its trophy and cloak colour (achievements).
import { S } from './state.js';
import { TUNE } from '../data/tuning.js';

export const ngLevel = () => (S.quick || S.daily ? 0 : S.ngPlus || 0);
// Ordinary enemies: the region / story progress f, raised to at least floor[0] + floor[1] x (ng - 1) in NG+ (at most 1).
export function ngProgress(f) {
  const ng = ngLevel(), F = TUNE.economy.ng.floor;
  return ng > 0 ? Math.min(1, Math.max(f, F[0] + F[1] * (ng - 1))) : f;
}
// Bosses and named foes: health and damage multipliers per NG cycle (they were not scaled at all before PR-17).
export function ngBoss() {
  const ng = ngLevel(), B = TUNE.economy.ng;
  return { hp: 1 + B.bossHp * ng, dmg: 1 + B.bossDmg * ng };
}
// Generated loot rolls this many tiers higher.
export const ngLootTiers = () => ngLevel() * TUNE.economy.ng.lootTiers;
// The Winter's Echo drop (every titled boss beaten in NG+) lives in features/economy_hooks.js: importing inventory here
// would pull ngplus and upgrades into the stats import cycle (docs/AGENT_RULES.md, section 8).
