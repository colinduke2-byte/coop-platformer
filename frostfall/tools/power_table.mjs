// Prints the power-curve tables used by docs/POWER_CURVE.md.   node tools/power_table.mjs
import { GEAR, EXPECTED, costFor, playerOf, fightCost, dangerFromCost } from '../src/systems/powercurve.js';
const pc = (x) => `${Math.round(x * 100)}%`;
const rows = [];
rows.push('| Region tier | Expected gear | Level | Normal | Easy | Hard | +5 levels | -5 levels | Gear -1 | Gear +1 |');
rows.push('|---|---|---|---|---|---|---|---|---|---|');
EXPECTED.forEach((e, t) => rows.push(`| ${t} | ${GEAR[e.gear].name} +${e.upg} | ${e.level} | ${pc(costFor(t))} | ${pc(costFor(t, { diff: 'easy' }))} | ${pc(costFor(t, { diff: 'hard' }))} | ${pc(costFor(t, { dLevel: 5 }))} | ${pc(costFor(t, { dLevel: -5 }))} | ${pc(costFor(t, { dGear: -1 }))} | ${pc(costFor(t, { dGear: 1 }))} |`));
console.log(rows.join('\n'));
console.log('\nMax level (20) in starter gear against each tier (Normal):');
console.log([0, 1, 2, 3].map((t) => `tier ${t}: ${pc(fightCost(playerOf({ level: 20, gear: 0 }), t))}`).join('   '));
console.log('Level 1 with Forged gear +3 against each tier (Normal):');
console.log([0, 1, 2, 3].map((t) => `tier ${t}: ${pc(fightCost(playerOf({ level: 1, gear: 4, upg: 3 }), t))}`).join('   '));
