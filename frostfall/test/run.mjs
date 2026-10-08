// Runs every stage test in order. Usage: npm test
import { spawnSync } from 'node:child_process';
const tests = ['unit/unit', 'unit/world', 'unit/power', 'unit/spacing', 'stage1', 'stage2', 'stage3', 'stage4', 'stage5', 'stage6', 'stage7', 'stage8', 'stage9_death', 'stage10_polish', 'stage11_combat', 'stage12_progress', 'stage13_world', 'stage14_ux', 'stage15_controls', 'stage16_tutorial', 'stage17_ui', 'stage18_enemies', 'stage19_dungeon', 'stage20_home', 'stage21_companion', 'stage22_openworld', 'stage23_combat2', 'stage24_pad', 'stage25_maw', 'stage26_guardians', 'stage27_powers', 'stage28_poses', 'stage29_bestiary', 'stage30_dragon', 'stage31_life', 'stage32_arena', 'stage33_status', 'stage34_audio', 'stage35_polish', 'stage36_combat3', 'stage37_world4', 'stage38_items', 'stage39_story', 'stage40_replay', 'stage41_access', 'reach_hash', 'stage42_regions', 'stage43_emberhold', 'stage44_bigworld', 'stage45_chapter3', 'stage46_regions3', 'stage47_campaign', 'stage48_breadth', 'stage49_arena', 'stage50_arena2', 'monkey_arena', 'stage51_rotate', 'stage52_death', 'stage53_danger', 'stage54_pony', 'stage55_discovery', 'perf', 'stress_transitions', 'art_baseline', 'webgl'];
let failed = 0;
for (const t of tests) {
  console.log(`\n=== ${t} ===`);
  const r = spawnSync('node', [new URL(`./${t}.mjs`, import.meta.url).pathname], { stdio: 'inherit' });
  if (r.status !== 0) failed++;
}
console.log(failed ? `\n${failed} test file(s) FAILED` : '\nALL STAGE TESTS PASSED');
process.exit(failed ? 1 : 0);
