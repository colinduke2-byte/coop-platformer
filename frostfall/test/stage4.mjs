import { launch, check, failCount } from './harness.mjs';

const h = await launch();
await h.open('scene=game&map=forest&spawn=west');
await h.sleep(700);
const G = (fn, a) => h.ev(fn, a);
const press = (c) => h.ev((c) => window.__ff.keys._press(c), c);
const rel = (c) => h.ev((c) => window.__ff.keys._release(c), c);
const tap = async (c, ms = 60) => { await press(c); await h.sleep(ms); await rel(c); };

// --- map sanity: every entity on a free tile, trail connects west gate -> crypt gate
const sane = await G(() => {
  const g = window.__ff.game.scene.getScene('Game');
  const bad = g.built.entities.filter((e) => e.x != null && ['enemy', 'chest', 'pickup', 'spawn'].includes(e.t) && g.solid[e.y][e.x]).map((e) => `${e.t}:${e.kind || e.id || e.name}@${e.x},${e.y}`);
  const wp = g.nextWaypoint(3 * 16, 15 * 16, 46 * 16 + 8, 4 * 16);
  const wp2 = g.nextWaypoint(3 * 16, 15 * 16, 50 * 16 + 8, 26 * 16);
  const counts = {}; g.enemies.getChildren().forEach((e) => { counts[e.kind] = (counts[e.kind] || 0) + 1; });
  g.pend.forEach((p) => { if (!p.live) counts[p.spec.kind] = (counts[p.spec.kind] || 0) + 1; });
  return { bad, wp: !!wp, wp2: !!wp2, counts };
});
check('all entities stand on free tiles', sane.bad.length === 0, sane.bad.join(' '));
check('west gate connects to crypt gate and camp', sane.wp && sane.wp2);
check('forest has wolves, bandits and archers', sane.counts.wolf >= 5 && sane.counts.bandit >= 3 && sane.counts.archer >= 2, JSON.stringify(sane.counts));
await h.shot('s4_forest');

// helper: isolate one enemy in the open trail near the player
const duel = (kind, dx) => G(([kind, dx]) => {
  const g = window.__ff.game.scene.getScene('Game');
  g.enemies.getChildren().slice().forEach((e) => { e.destroy(); });
  g.enemies.clear(); if (g.pend) g.pend.length = 0;      // no streamed spawns joining the duel
  const p = g.player; p.setPosition(10.5 * 16, 10 * 16 + 8); p.mode = 'free'; p.stunT = 0; p.body.setVelocity(0, 0); p.invuln = 0; p.iframes = 0; p.statuses = {}; p.face = { x: 1, y: 0 };
  const S = window.__ff.S; S.hp = 100; S.sp = 100; S.weather = 'snow'; S.time = 12 * 60;      // daylight, no blizzard: sight range is the same every run
  const e = g.addEnemy(kind, p.x + dx, p.y); window.__sw = false; const sw0 = e.startWindup.bind(e); e.startWindup = (...a) => { window.__sw = true; return sw0(...a); }; e.alert(true); return true;
}, [kind, dx]);

// wolf lunges and bites
await duel('wolf', 60);
let hit = false, sawWind = false;
for (let i = 0; i < 60 && !hit; i++) {
  const r = await G(() => { const g = window.__ff.game.scene.getScene('Game'); const e = g.enemies.getChildren()[0]; return { hp: window.__ff.S.hp, st: e?.state }; });
  if (r.st === 'windup') sawWind = true;
  if (r.hp < 100) hit = true;
  await h.sleep(50);
}
sawWind = sawWind || await G(() => window.__sw);
check('wolf telegraphs then lunges to bite', sawWind && hit);

// bandit swings
await duel('bandit', 50);
hit = false; sawWind = false; const trace = [];
for (let i = 0; i < 160 && !hit; i++) {
  const r = await G(() => { const g = window.__ff.game.scene.getScene('Game'); const e = g.enemies.getChildren()[0]; return { hp: window.__ff.S.hp, st: e?.state, n: g.enemies.getLength(), d: e && Math.round(Math.hypot(e.x - g.player.x, e.y - g.player.y)), pm: g.player.mode, inv: g.player.invuln }; }); trace.push(r.st + '/' + r.n + '/' + r.d + '/' + r.pm + '/' + Math.round(r.inv));
  if (r.st === 'windup') sawWind = true;
  if (r.hp < 100) hit = true;
  await h.sleep(50);
}
sawWind = sawWind || await G(() => window.__sw);
check('bandit telegraphs and hits', sawWind && hit, trace.slice(-6).join(' '));

// archer shoots a projectile
await duel('archer', 70);
let shots = 0; hit = false;
for (let i = 0; i < 100 && !hit; i++) {
  const r = await G(() => { const g = window.__ff.game.scene.getScene('Game'); return { n: g.eshots.getLength(), hp: window.__ff.S.hp }; });
  shots = Math.max(shots, r.n);
  if (r.hp < 100) hit = true;
  await h.sleep(50);
}
check('archer fires arrows that can hit', (shots > 0 || hit) && hit, `shots=${shots} hit=${hit}`);
await G(() => { window.__ff.game.scene.getScene('Game').player.invuln = 99; });

// loot: killing drops pickups
await G(() => {
  const g = window.__ff.game.scene.getScene('Game'); g.enemies.clear();
  const e = g.addEnemy('bandit', g.player.x + 12, g.player.y); e.hp = 1; e.alerted = true;
  g.player.invuln = 99; g.player.mode = 'free'; g.player.stunT = 0; g.player.lockT = 0; g.player.swing = null; g.player.face = { x: 1, y: 0 }; window.__ff.S.gold = 0; window.__ff.S.sp = 100; g.pickups.forEach((k) => { k.shadow.destroy(); k.destroy(); }); g.pickups.length = 0;
});
await tap('KeyJ');
await h.sleep(100);
await h.sleep(200);
const dropped = await G(() => window.__ff.game.scene.getScene('Game').pickups.length);
check('killed enemy drops loot', dropped > 0, `pickups=${dropped}`);
await h.sleep(1800);
const gold = await G(() => window.__ff.S.gold);
check('walking over loot collects gold', gold > 0, `gold=${gold}`);

// chest
await G(() => { const g = window.__ff.game.scene.getScene('Game'); g.enemies.clear(); g.player.setPosition(6 * 16 + 8, 6 * 16 + 20); });
await h.sleep(200);
const before = await G(() => ({ inv: window.__ff.S.inv.bear_charm || 0, arrows: window.__ff.S.arrows }));
await tap('KeyE');
await h.sleep(200);
const after = await G(() => ({ inv: window.__ff.S.inv.bear_charm || 0, arrows: window.__ff.S.arrows, flag: window.__ff.S.flags.chest_glade }));
check('chest gives loot once', after.inv === before.inv + 1 && after.arrows === before.arrows + 10 && after.flag);
await tap('KeyE'); await h.sleep(100);
const again = await G(() => window.__ff.S.inv.bear_charm);
check('chest cannot be looted twice', again === after.inv);

// map transition forest -> village via west gate, village -> forest via east gate
await G(() => { const g = window.__ff.game.scene.getScene('Game'); g.player.setPosition(2 * 16, 15.5 * 16); g.t = 1; });
await press('KeyA'); await h.sleep(1400); await rel('KeyA');
const m1 = await G(() => ({ map: window.__ff.S.map, scenes: window.__ff.game.scene.getScenes(true).map((s) => s.scene.key) }));
check('west gate leads to the village', m1.map === 'village', JSON.stringify(m1));
await h.sleep(500);
await G(() => { const g = window.__ff.game.scene.getScene('Game'); g.player.setPosition(36.5 * 16, 13.5 * 16); });
await press('KeyD'); await h.sleep(1500); await rel('KeyD');
const m2 = await G(() => window.__ff.S.map);
check('east road leads back to the forest', m2 === 'forest', m2);
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'STAGE 4 FAILED' : 'STAGE 4 PASSED');
process.exit(failCount() ? 1 : 0);
