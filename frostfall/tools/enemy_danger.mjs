// Prints how dangerous each creature is (cost of two of them as a share of health) to the expected player of each region tier.
//   node tools/enemy_danger.mjs
import { ENEMIES } from '../src/data/enemies.js';
import { playerOf, costAgainst, EXPECTED, dangerFromCost, DANGER_NAMES } from '../src/systems/powercurve.js';
const kinds = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(ENEMIES).filter((k) => ENEMIES[k].kind !== 'boss' && !ENEMIES[k].title);
const rows = kinds.map((k) => {
  const e = ENEMIES[k];
  const cols = [0, 1, 2, 3].map((t) => {
    const ex = EXPECTED[t], p = playerOf({ level: ex.level, gear: ex.gear, upg: ex.upg });
    const hp = e.hp * (1 + 0.28 * t), dmg = e.dmg * (1 + 0.13 * t), c = costAgainst(p, { hp, dmg });
    return `${Math.round(c * 100)}% ${DANGER_NAMES[dangerFromCost(c)][0]}`;
  });
  return `${k.padEnd(12)} hp ${String(e.hp).padStart(4)} dmg ${String(e.dmg).padStart(2)}   ${cols.map((c) => c.padStart(9)).join('')}`;
});
console.log('creature                       tier0    tier1    tier2    tier3   (expected player of that tier, two of them)');
console.log(rows.join('\n'));
