// Ordinary enemies get stronger the further you are into the game. Pure maths on top of the region tier and the story flags.
//   r = region tier / 3        s = main-story milestones done / total        f = regionW * r + storyW * s
//   health x (1 + hp * f)      damage x (1 + dmg * f)      gold x (1 + gold * f)      (x3 health, x2 damage at f = 1)
// So the starting woods are weakest, the last region strongest, and going back to an early area late in the game finds it
// somewhat tougher (never trivial) but still easier than new ground. Bosses and passive animals are not scaled. See docs/ENEMY_SCALING_PLAN.md.
import { TUNE } from '../data/tuning.js';
import { S } from './state.js';

// One flag per boss of the main story, set when that boss is beaten.
export const STORY_FLAGS = [
  'bossDead', 'grimfangDone', 'wyrmDead', 'warlordDead', 'tideDead', 'rootDead', 'dragonDead', 'kragnarDead', 'sovereignDead',
  'admiralDead', 'hollowKingDead', 'mireMotherDead', 'stormGiantDead', 'hartKingDead', 'lodeColossusDead', 'brinegutDead', 'winterDead',
];
export const MAX_TIER = 3;

export const storyFraction = (flags = S.flags || {}) => STORY_FLAGS.filter((k) => flags[k]).length / STORY_FLAGS.length;
export const regionFraction = (tier) => Math.max(0, Math.min(MAX_TIER, tier || 0)) / MAX_TIER;
// 0 at the very start of the world, 1 in the last region once the story is finished.
export const progress = (tier, story = storyFraction()) => {
  const C = TUNE.scaling;
  return Math.max(0, Math.min(1, C.regionW * regionFraction(tier) + C.storyW * story));
};
const shaped = (f) => Math.pow(Math.max(0, f), TUNE.scaling.curve || 1);   // curve > 1 keeps the first regions gentle and the last ones steep
export const hpMul = (f) => 1 + TUNE.scaling.hp * shaped(f);
export const dmgMul = (f) => 1 + TUNE.scaling.dmg * shaped(f);
export const goldMul = (f) => 1 + TUNE.scaling.gold * f;
export const eliteMul = (f) => 1 + TUNE.scaling.elite * f;
