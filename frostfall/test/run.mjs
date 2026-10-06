// Runs every stage test in order. Usage: npm test
import { spawnSync } from 'node:child_process';
const tests = ['unit/unit', 'unit/world', 'stage1', 'stage2', 'stage3', 'stage4', 'stage5', 'stage6', 'stage7', 'stage8', 'stage9_death', 'stage10_polish', 'stage11_combat', 'stage12_progress', 'stage13_world', 'stage14_ux', 'stage15_controls', 'stage16_tutorial', 'stage17_ui', 'stage18_enemies', 'stage19_dungeon', 'stage20_home', 'stage21_companion', 'stage22_openworld', 'stage23_combat2', 'stage24_pad', 'stage25_maw', 'webgl'];
let failed = 0;
for (const t of tests) {
  console.log(`\n=== ${t} ===`);
  const r = spawnSync('node', [new URL(`./${t}.mjs`, import.meta.url).pathname], { stdio: 'inherit' });
  if (r.status !== 0) failed++;
}
console.log(failed ? `\n${failed} test file(s) FAILED` : '\nALL STAGE TESTS PASSED');
process.exit(failed ? 1 : 0);
