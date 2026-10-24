// The economy budget (PR-22): income against sinks per story tier stays in a band. The table: node tools/economy_table.mjs
import assert from 'node:assert/strict';
import { budget, TIERS } from '../../tools/economy_table.mjs';
let n = 0, failed = 0;
const t = (name, fn) => { try { fn(); n++; console.log('  ok   ' + name); } catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + e.message.split('\n')[0]); } };
const b = budget();
// Gold should cover the forge and the big buys with room to spare (players miss quests, die, buy potions), but not drown them:
// past about x3 per tier, gold stops meaning anything. Today the game runs at about x2 (a mild flood the late sinks soak up).
t('every tier pays for its forge levels and big buys, with room but no flood (x1.2 to x3.5)', () => {
  for (const tier of TIERS) { const r = b.income[tier] / b.sinks[tier]; assert.ok(r > 1.2 && r < 3.5, `tier ${tier}: income ${b.income[tier]} / sinks ${b.sinks[tier]} = ${r.toFixed(2)}`); }
});
t('the whole campaign runs between x1.4 and x3', () => {
  const r = b.income.reduce((a, x) => a + x, 0) / b.sinks.reduce((a, x) => a + x, 0);
  assert.ok(r > 1.4 && r < 3, `x${r.toFixed(2)}`);
});
t('the guardians drop enough Heart Shards for a full +10 set', () => assert.ok(b.shardsIn >= b.mats.heart_shard, `${b.shardsIn} shards for ${b.mats.heart_shard}`));
t('quests and bosses alone pay for at least a third of the forge', () => {
  const g = TIERS.reduce((a, x) => a + b.quests[x] + b.bosses[x], 0), f = b.forge.reduce((a, x) => a + x, 0);
  assert.ok(g > f / 3, `${g} vs ${f}`);
});
console.log(failed ? 'BUDGET FAILED' : `BUDGET PASSED (${n} tests)`);
process.exit(failed ? 1 : 0);
