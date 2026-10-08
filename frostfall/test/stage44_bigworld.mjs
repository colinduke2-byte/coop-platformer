import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=forest&spawn=west&seed=424242');
await h.sleep(1500);
const G = (fn, a) => h.ev(fn, a);

// ---- size, content counts and reachability over many seeds
const gen = await G(async () => {
  const M = await import('/src/data/maps.js'), CF = await import('/src/config.js'), S = window.__ff.S, solid = new Set(CF.SOLID_TILES), out = [];
  for (const seed of [2, 9, 77, 424242, 182137, 31415, 8080, 99991, 5, 123456, 654321, 7777]) {
    S.seed = seed; const t0 = performance.now(), b = M.getReach(), ms = performance.now() - t0;
    const k = {}; b.pois.forEach((p) => { k[p.kind] = (k[p.kind] || 0) + 1; });
    const seen = new Uint8Array(b.w * b.h), q = [[4, 15]]; seen[15 * b.w + 4] = 1;
    for (let i = 0; i < q.length; i++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = q[i][0] + dx, y = q[i][1] + dy; if (x < 0 || y < 0 || x >= b.w || y >= b.h || seen[y * b.w + x] || solid.has(b.grid[y][x])) continue; seen[y * b.w + x] = 1; q.push([x, y]); }
    const near = (x, y) => { for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (seen[(y + dy) * b.w + x + dx]) return true; return false; };
    const stranded = b.pois.filter((p) => !near(p.x, p.y)).map((p) => p.id);
    const exits = ['maw', 'keep', 'chapel', 'rootvault', 'throne', 'nest'].filter((to) => { const e = b.entities.find((x) => x.t === 'exit' && x.to === to); return !e || !(seen[e.y * b.w + e.x] || seen[(e.y + 1) * b.w + e.x]); });
    out.push({ seed, w: b.w, h: b.h, ms: Math.round(ms), camps: k.camp, barrows: k.barrow, hamlets: k.hamlet, standing: k.standing, rest: k.rest, champs: k.champion, stranded, badExits: exits, ents: b.entities.length });
  }
  S.seed = 424242;
  return out;
});
check('the Reach is 540x378 on every seed', gen.every((r) => r.w === 540 && r.h === 378), JSON.stringify(gen.map((r) => r.w + 'x' + r.h)));
check('it holds the expected amount of things to find on every seed', gen.every((r) => r.camps >= 8 && r.barrows >= 6 && r.hamlets >= 3 && r.standing >= 4 && r.rest >= 12 && r.champs >= 6), JSON.stringify(gen.map((r) => [r.seed, r.camps, r.barrows, r.hamlets, r.standing, r.rest, r.champs])));
check('every place, and all six dungeon doors, can be walked to', gen.every((r) => r.stranded.length === 0 && r.badExits.length === 0), JSON.stringify(gen.filter((r) => r.stranded.length || r.badExits.length)));
check('the world builds fast enough (under 1.5 s each)', gen.every((r) => r.ms < 1500), JSON.stringify(gen.map((r) => r.ms)));

// ---- hamlets: people, shops, lines
const ham = await G(async () => {
  const D = await import('/src/data/dialogue.js'), dlg = (await import('/src/systems/dialogue.js')).dialogue, tex = window.__ff.game.textures;
  await import('/src/data/hamlets.js');
  const out = {}; const real = dlg.hud; window.__realHud = real;
  dlg.hud = { say: async () => {}, choose: async (o) => o.length - 1, hideBox() {}, scene: real.scene };
  for (const id of ['trapper', 'fisher', 'prospector']) { out[id] = { def: !!D.NPC_DEFS[id], tex: tex.exists(D.NPC_DEFS[id].tex), script: !!D.SCRIPTS[id] }; await D.SCRIPTS[id](); }
  dlg.hud = real;
  return out;
});
check('hamlet traders have sprites, shops and lines (and say goodbye)', Object.values(ham).every((v) => v.def && v.tex && v.script), JSON.stringify(ham));

// ---- all eight barrows build and lead home
const bar = await G(async () => {
  const M = await import('/src/data/maps.js'), out = [];
  for (let i = 0; i < 8; i++) { const b = M.MAPS['barrow' + i].build(); out.push({ i, back: b.entities.some((e) => e.t === 'exit' && e.to === 'forest'), foes: b.entities.filter((e) => e.t === 'enemy').length }); }
  return out;
});
check('all eight barrows exist, with a way out and foes inside', bar.length === 8 && bar.every((b) => b.back && b.foes >= 5), JSON.stringify(bar));

// ---- the map tab: whole-map overview from a baked texture, zoom steps, region fog
await G(async () => {
  const S = window.__ff.S, M = await import('/src/data/maps.js'), b = M.getReach(), W = await import('/src/scenes/menuMap.js');
  const cw = Math.ceil(b.w / 2), ch = Math.ceil(b.h / 2); S.fog = S.fog || {}; S.fog.forest = '1'.repeat(cw * ch);
  window.__ff.game.scene.getScene('Game').openMenu(-1, 'MAP');
});
await h.sleep(900);
const mp = await G(() => { const m = window.__ff.game.scene.getScene('Menu'); return { bake: !!m._bake, key: m._bake?.key, terrain: m.mapTerrain?.length, tex: m._bake && m.textures.exists(m._bake.key) }; });
check('the map screen draws the big overworld from one baked texture', mp.bake && mp.tex && mp.terrain === 1, JSON.stringify(mp));
await h.shot('s44_overview');
const frames = await G(async () => {
  const m = window.__ff.game.scene.getScene('Menu'); const t0 = performance.now(); let n = 0;
  for (let i = 0; i < 30; i++) { m.dirty = true; m.draw(); n++; }
  return { ms: (performance.now() - t0) / n };
});
check('redrawing the explored map is cheap (under 8 ms a frame)', frames.ms < 8, frames.ms.toFixed(2));
await G(() => window.__ff.keys._press('KeyQ')); await h.sleep(120); await G(() => window.__ff.keys._release('KeyQ')); await h.sleep(400);
await h.shot('s44_zoom1');
check('no page errors', h.errors.length === 0, h.errors.slice(0, 3).join('\n'));
await h.close();
console.log(failCount() ? 'BIG WORLD FAILED' : 'BIG WORLD PASSED');
