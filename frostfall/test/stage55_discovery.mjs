import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=forest&spawn=west&seed=424242'); await h.sleep(1500);
const G = (fn, a) => h.ev(fn, a);
const info = await G(() => { const g = window.__ff.game.scene.getScene('Game'), k = {}; g.built.pois.forEach((p) => { k[p.kind] = (k[p.kind] || 0) + 1; }); return { k, n: g.built.pois.length, disc: Object.keys(window.__ff.S.discovered || {}).length }; });
check('the Reach holds hidden caches, hermits and ancient trees', info.k.cache >= 6 && info.k.hermit >= 3 && info.k.ancient >= 3, JSON.stringify(info.k));
check('nothing starts discovered (except what you stand beside)', info.disc <= 2, String(info.disc));

// walking up to a place discovers it, once
const d = await G(() => {
  const g = window.__ff.game.scene.getScene('Game'), S = window.__ff.S, ev = []; const bus = window.__ff.bus;
  window.__events = []; (window.__bus = window.__bus) ;
  const p = g.built.pois.find((q) => q.kind === 'camp'); S.gold = 0;
  g.player.setPosition(p.x * 16, p.y * 16 + 20);
  g.discoverTick(); const first = Object.keys(S.discovered).length; const gold1 = S.gold; g.discoverTick();
  return { id: p.id, first, again: Object.keys(S.discovered).length, gold1, gold2: S.gold, has: !!S.discovered['forest:' + p.id] };
});
check('arriving at a place discovers it once and pays a little', d.has && d.first >= 1 && d.again === d.first && d.gold1 > 0 && d.gold2 === d.gold1, JSON.stringify(d));
const far = await G(() => { const g = window.__ff.game.scene.getScene('Game'), S = window.__ff.S; const p = g.built.pois.filter((q) => q.kind === 'barrow').sort((a, b) => Math.hypot(b.x - g.player.x / 16, b.y - g.player.y / 16) - Math.hypot(a.x - g.player.x / 16, a.y - g.player.y / 16))[0]; g.player.setPosition(g.player.x, g.player.y); g.discoverTick(); return !S.discovered['forest:' + p.id]; });
check('places far away stay undiscovered', far);

// hidden places have a short range
const hid = await G(() => { const g = window.__ff.game.scene.getScene('Game'), S = window.__ff.S; const p = g.built.pois.find((q) => q.kind === 'cache'); g.player.setPosition((p.x + 11) * 16, p.y * 16); g.discoverTick(); const farMiss = !S.discovered['forest:' + p.id]; g.player.setPosition((p.x + 3) * 16, p.y * 16); g.discoverTick(); return { farMiss, near: !!S.discovered['forest:' + p.id] }; });
check('a hidden cache is only found by getting close', hid.farMiss && hid.near, JSON.stringify(hid));

// the hermit's rumour
const rum = await G(async () => {
  const g = window.__ff.game.scene.getScene('Game'), S = window.__ff.S, dlg = await import('/src/systems/dialogue.js'), { SCRIPTS } = await import('/src/data/dialogue.js');
  const real = dlg.dialogue.hud; let step = 0; dlg.dialogue.hud = { say: async () => {}, choose: async (o) => (step++ === 0 ? 0 : o.length - 1), hideBox() {}, scene: real.scene };
  const before = Object.keys(S.discovered).length; delete S.flags.waypoint;
  await SCRIPTS.hermit(); dlg.dialogue.hud = real;
  return { gained: Object.keys(S.discovered).length - before, wp: !!S.flags.waypoint };
});
check('a hermit\'s rumour reveals a place and sets a waypoint', rum.gained === 1 && rum.wp, JSON.stringify(rum));

// the compass strip is gone from the top of the screen
check('there is no compass strip', await G(() => window.__ff.game.scene.getScene('Hud').compassOn === undefined));

// fast travel takes time
const ft = await G(() => { const g = window.__ff.game.scene.getScene('Game'), S = window.__ff.S; const f = g.fires?.[0]; if (!f) return null; S.time = 600; g.enemies.getChildren().slice().forEach((e) => e.destroy()); const t0 = S.time; g.player.setPosition(60, 60); g.fastTravel({ x: f.x, y: f.y, key: f.key }); return { dt: (S.time - t0 + 1440) % 1440, dist: Math.hypot(f.x - 60, f.y - 60) / 16 }; });
check('fast travel makes the clock move on by the walk skipped', ft && ft.dt > 0 && Math.abs(ft.dt - Math.round(ft.dist / 4.5 * 2)) <= 2, JSON.stringify(ft));
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'DISCOVERY FAILED' : 'DISCOVERY PASSED');
