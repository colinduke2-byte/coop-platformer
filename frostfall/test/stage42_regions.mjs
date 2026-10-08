import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=424242');
await h.sleep(900);
const G = (fn, a) => h.ev(fn, a);

// ---- every region builds for several seeds, has an entrance and its places, all reachable from the entrance
const gen = await G(async () => {
  const M = await import('/src/data/maps.js'), CF = await import('/src/config.js'), S = window.__ff.S, WG = await import('/src/world/worldgen.js');
  const solid = new Set(CF.SOLID_TILES), out = [];
  for (const seed of [3, 11, 424242, 987654]) {
    S.seed = seed;
    const b = M.getRegion('ashen'), def = WG.ASHEN, st = def.start, seen = new Uint8Array(b.w * b.h), q = [[st.x, st.y]]; seen[st.y * b.w + st.x] = 1;
    for (let i = 0; i < q.length; i++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = q[i][0] + dx, y = q[i][1] + dy; if (x < 0 || y < 0 || x >= b.w || y >= b.h || seen[y * b.w + x] || solid.has(b.grid[y][x])) continue; seen[y * b.w + x] = 1; q.push([x, y]); }
    const kinds = {}; b.pois.forEach((p) => { kinds[p.kind] = (kinds[p.kind] || 0) + 1; });
    out.push({ seed, entry: b.entities.some((e) => e.t === 'spawn' && e.name === 'entry'), exit: b.entities.some((e) => e.t === 'exit' && e.to === 'forest'), camps: kinds.camp, rests: kinds.rest, champs: kinds.champion, reach: b.pois.every((p) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) if (seen[(p.y + dy) * b.w + p.x + dx]) return true; return false; }), size: b.w + 'x' + b.h });
  }
  return out;
});
check('the Ashen Peaks builds for every seed with an entrance and exit', gen.every((r) => r.entry && r.exit && r.size === '240x180'), JSON.stringify(gen));
check('it has its camps, campfires and champions, all reachable on foot', gen.every((r) => r.camps >= 3 && r.rests >= 4 && r.champs >= 2 && r.reach), JSON.stringify(gen));

// ---- the registry
const reg = await G(async () => {
  const R = await import('/src/data/regions.js'), S = window.__ff.S; S.flags.regions = {};
  const before = R.unlockedRegions().join();
  R.unlockRegion('ashen');
  return { before, after: R.unlockedRegions().join(), ofForest: R.regionOfMap('forest'), ofVillage: R.regionOfMap('village'), ofAshen: R.regionOfMap('ashen') };
});
check('regions start locked and unlock by flag', reg.before === 'reach' && reg.after === 'reach,ashen' && reg.ofAshen === 'ashen' && reg.ofVillage === 'reach', JSON.stringify(reg));

// ---- the map tab switches between regions
await h.open('scene=game&map=forest&spawn=west&seed=424242');
await h.sleep(1500);
const tap = async (c, ms = 80) => { await G((c) => window.__ff.keys._press(c), c); await h.sleep(ms); await G((c) => window.__ff.keys._release(c), c); await h.sleep(120); };
await G(async () => { const R = await import('/src/data/regions.js'); R.unlockRegion('ashen'); const g = window.__ff.game.scene.getScene('Game'); g.openMenu(-1, 'MAP'); });
await h.sleep(700);
const v0 = await G(() => window.__ff.game.scene.getScene('Menu').tabs.find((t) => t.name === 'MAP').viewId());
await tap('KeyR'); await h.sleep(200);
const v1 = await G(() => window.__ff.game.scene.getScene('Menu').tabs.find((t) => t.name === 'MAP').viewId());
await h.shot('s42_map_ashen');
await tap('KeyR'); await h.sleep(200);
const v2 = await G(() => window.__ff.game.scene.getScene('Menu').tabs.find((t) => t.name === 'MAP').viewId());
check('R cycles the map between regions and back', v0 === 'forest' && v1 === 'ashen' && v2 === 'forest', `${v0} ${v1} ${v2}`);

// ---- fast travel to a found campfire in another region
await G(() => window.__ff.game.scene.getScene('Menu').close?.());
await h.sleep(400);
const ft = await G(async () => {
  const M = await import('/src/data/maps.js'), S = window.__ff.S, g = window.__ff.game.scene.getScene('Game');
  g.enemies.getChildren().forEach((e) => e.destroy());
  const b = M.getRegion('ashen'), e = b.entities.find((x) => x.t === 'fire' && x.rest && x.id !== 'ashenfire') || b.entities.find((x) => x.t === 'fire' && x.rest);
  S.flags.fires = S.flags.fires || {}; S.flags.fires[`ashen:${e.x},${e.y}`] = true;
  const f = { x: (e.x + 0.5) * 16, y: (e.y + 0.5) * 16, tx: e.x, ty: e.y, key: `ashen:${e.x},${e.y}`, map: 'ashen' };
  const ok = g.fastTravel(f);
  return { ok, fx: e.x, fy: e.y };
});
await h.sleep(2500);
const arrived = await G(() => { const g = window.__ff.game.scene.getScene('Game'), S = window.__ff.S; return { map: g.mapId, px: Math.round(g.player.x / 16), py: Math.round(g.player.y / 16), smap: S.map }; });
check('fast travel crosses regions and lands at the campfire', ft.ok && arrived.map === 'ashen' && Math.abs(arrived.px - ft.fx) <= 3 && Math.abs(arrived.py - ft.fy) <= 3, JSON.stringify({ ft, arrived }));

// ---- time passes outdoors, saves and loads inside a region, the Reach still streams enemies
const t0 = await G(() => window.__ff.S.time);
await h.sleep(2500);
const t1 = await G(() => window.__ff.S.time);
check('time of day runs in the Ashen Peaks', t1 !== t0, `${t0}->${t1}`);
const sv = await G(async () => { const sg = await import('/src/systems/save.js'), S = window.__ff.S, g = window.__ff.game.scene.getScene('Game'); sg.saveGame(g); const ok = sg.loadGame(); return { ok, map: S.map }; });
check('a save made in another region loads back into it', sv.ok && sv.map === 'ashen', JSON.stringify(sv));

// ---- performance budget in the new region with a crowd
await h.open('scene=game&map=ashen&spawn=entry&seed=424242');
await h.sleep(1500);
const perf = await G(async () => {
  const g = window.__ff.game.scene.getScene('Game'); g.player.hurt = () => {};
  const kinds = ['golem', 'imp', 'bandit', 'wight'];
  for (let i = 0; i < 30; i++) g.addEnemy(kinds[i % 4], g.player.x + 60 + (i % 10) * 24, g.player.y + 40 + Math.floor(i / 10) * 30);
  const orig = g.sys.sceneUpdate; let n = 0, tot = 0;
  g.sys.sceneUpdate = function (t, ms) { const a = performance.now(); orig.call(g, t, ms); tot += performance.now() - a; n++; };
  await new Promise((r) => setTimeout(r, 3500));
  g.sys.sceneUpdate = orig;
  return { frames: n, avg: tot / Math.max(1, n), objs: g.children.list.length };
});
check('the Ashen Peaks stays under the update budget with 30 enemies', perf.frames > 30 && perf.avg < 4 && perf.objs < 4000, JSON.stringify(perf));
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'REGIONS FAILED' : 'REGIONS PASSED');
