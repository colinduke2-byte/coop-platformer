// Performance budgets: CPU cost of the game update loop with a crowd, and scene object counts.
// Also measured (with the same crowd): render time per frame, depth sorts per frame, and the JS allocation rate.
// test/run.mjs runs this file alone, so the timings are not disturbed by other tests.
import { launch, check, failCount } from './harness.mjs';
// precise heap numbers and gc() for the allocation measurement
const h = await launch({ args: ['--no-sandbox', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
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

// ---- render cost, depth sorting and allocations with the same crowd on screen
const rm = await G(async () => {
  const game = window.__ff.game, g = game.scene.getScene('Game'), r = game.renderer, dl = g.sys.displayList;
  const origRender = r.render, origSort = dl.depthSort, origQueue = dl.queueDepthSort;
  let frames = 0, renderMs = 0, worstFrame = 0, frameMs = 0, sortCalls = 0, sorts = 0, sortMs = 0, queued = 0;
  r.render = function (...a) { const t = performance.now(); const out = origRender.apply(this, a); frameMs += performance.now() - t; return out; };
  dl.depthSort = function () { sortCalls++; if (this.sortChildrenFlag) { sorts++; const t = performance.now(); origSort.call(this); sortMs += performance.now() - t; } else origSort.call(this); };
  dl.queueDepthSort = function () { queued++; return origQueue.call(this); };
  const onPost = () => { frames++; renderMs += frameMs; worstFrame = Math.max(worstFrame, frameMs); frameMs = 0; };
  game.events.on('postrender', onPost);
  // allocation rate: add up every rise of the JS heap between frames (a drop is a GC); precise numbers need --enable-precise-memory-info
  const mem = () => performance.memory?.usedJSHeapSize ?? 0;
  if (window.gc) window.gc();
  let last = mem(), grown = 0, gcs = 0;
  const onMem = () => { const m = mem(); if (m >= last) grown += m - last; else gcs++; last = m; };
  game.events.on('postrender', onMem);
  const t0 = performance.now();
  await new Promise((res) => setTimeout(res, 4000));
  const secs = (performance.now() - t0) / 1000;
  game.events.off('postrender', onPost); game.events.off('postrender', onMem);
  r.render = origRender; delete dl.depthSort; delete dl.queueDepthSort;     // back to the prototype's methods
  return {
    renderer: r.type === 1 ? 'canvas' : 'webgl', frames, renderAvg: renderMs / Math.max(1, frames), renderWorst: worstFrame,
    sortsPerFrame: sorts / Math.max(1, frames), sortCallsPerFrame: sortCalls / Math.max(1, frames), queuedPerFrame: queued / Math.max(1, frames),
    sortMsPerFrame: sortMs / Math.max(1, frames), allocMBs: grown / 1048576 / secs, gcs, precise: !!window.gc && mem() > 0, objs: g.children.list.length,
  };
});
console.log(`render ${rm.renderer}: ${rm.renderAvg.toFixed(2)} ms/frame avg, ${rm.renderWorst.toFixed(2)} ms worst over ${rm.frames} frames (${rm.objs} objects)`);
console.log(`depth sorts: ${rm.sortsPerFrame.toFixed(2)}/frame (${rm.sortMsPerFrame.toFixed(3)} ms/frame), queueDepthSort calls ${rm.queuedPerFrame.toFixed(1)}/frame`);
console.log(`allocation: ~${rm.allocMBs.toFixed(2)} MB/s of JS heap growth, ${rm.gcs} heap drops (GCs)` + (rm.precise ? '' : ' (imprecise: no precise memory info)'));
check('render ran during the measurement', rm.frames > 30, JSON.stringify(rm));
// loose budgets: today's code passes them; tighten as the renderer gets faster
check('average render time with 30 enemies stays under budget (ms, canvas)', rm.renderAvg < 8, rm.renderAvg.toFixed(2));
check('allocation rate stays under 64 MB/s', rm.allocMBs < 64, rm.allocMBs.toFixed(2));
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
process.exit(failCount() ? 1 : 0);
