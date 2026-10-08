// Performance budgets: CPU cost of the game update loop with a crowd, and scene object counts.
import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=forest&spawn=west&seed=424242');
await h.sleep(1500);
const G = (fn, a) => h.ev(fn, a);

const m = await G(async () => {
  const g = window.__ff.game.scene.getScene('Game');
  g.player.hurt = () => {};   // immortal: we are timing the loop, not testing survival
  const kinds = ['wolf', 'draugr', 'bandit', 'wight'];
  for (let i = 0; i < 30; i++) g.addEnemy(kinds[i % 4], g.player.x + 60 + (i % 10) * 24, g.player.y + 40 + Math.floor(i / 10) * 30);
  const orig = g.sys.sceneUpdate; let n = 0, tot = 0, worst = 0;
  g.sys.sceneUpdate = function (t, ms) { const a = performance.now(); orig.call(g, t, ms); const d = performance.now() - a; n++; tot += d; worst = Math.max(worst, d); };
  await new Promise((r) => setTimeout(r, 4000));
  g.sys.sceneUpdate = orig;
  return { frames: n, avg: tot / Math.max(1, n), worst, objs: g.children.list.length, enemies: g.enemies?.getLength?.() ?? 0 };
});
console.log(JSON.stringify(m));
check('the crowd was really there', m.enemies >= 25 && m.objs > 200, JSON.stringify(m));
check('the game loop ran during the measurement', m.frames > 30, JSON.stringify(m));
check('average update stays under budget with 30 enemies (ms)', m.avg < 4, m.avg.toFixed(2));
check('scene object count stays under budget', m.objs < 4000, String(m.objs));
// the new regions are just as cheap
for (const map of ['fens', 'highlands']) {
  await h.open(`scene=game&map=${map}&spawn=entry&seed=424242`); await h.sleep(1500);
  const r = await G(async () => {
    const g = window.__ff.game.scene.getScene('Game'); g.player.hurt = () => {}; window.__ff.S.time = 23 * 60;
    for (let i = 0; i < 30; i++) g.addEnemy(['werewolf', 'ghost', 'leech', 'nomad'][i % 4], g.player.x + 60 + (i % 10) * 24, g.player.y + 40 + Math.floor(i / 10) * 30);
    const orig = g.sys.sceneUpdate; let n = 0, tot = 0;
    g.sys.sceneUpdate = function (t, ms) { const a = performance.now(); orig.call(g, t, ms); tot += performance.now() - a; n++; };
    await new Promise((r) => setTimeout(r, 3500)); g.sys.sceneUpdate = orig;
    return { frames: n, avg: tot / Math.max(1, n), objs: g.children.list.length };
  });
  console.log(map, JSON.stringify(r));
  check(`${map}: 30 enemies at night stay under the update budget (ms)`, r.frames > 30 && r.avg < 4 && r.objs < 4000, JSON.stringify(r));
}
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'PERF FAILED' : 'PERF PASSED');
