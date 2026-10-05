import { launch, check, failCount } from './harness.mjs';

const h = await launch();
await h.open('scene=game&map=crypt&spawn=entry');
await h.sleep(900);
const G = (fn, a) => h.ev(fn, a);
const press = (c) => h.ev((c) => window.__ff.keys._press(c), c);
const rel = (c) => h.ev((c) => window.__ff.keys._release(c), c);
const tap = async (c, ms = 80) => { await press(c); await h.sleep(ms); await rel(c); await h.sleep(60); };

const sane = await G(() => {
  const g = window.__ff.game.scene.getScene('Game');
  const bad = g.built.entities.filter((e) => e.x != null && ['enemy', 'chest', 'pickup', 'spawn', 'boss'].includes(e.t) && g.solid[e.y][e.x]).map((e) => `${e.t}:${e.kind || e.id || e.name}@${e.x},${e.y}`);
  const wp = g.nextWaypoint(15.5 * 16, 50 * 16, 15.5 * 16, 4 * 16);
  const counts = {}; g.enemies.getChildren().forEach((e) => { counts[e.kind] = (counts[e.kind] || 0) + 1; });
  return { bad, path: !!wp, counts, flag: window.__ff.S.flags.crypt, boss: !!g.boss, dim: g.def.dim };
});
check('crypt entities stand on free tiles', sane.bad.length === 0, sane.bad.join(' '));
check('entry connects to the boss hall', sane.path);
check('crypt has draugr, wights and a boss', (sane.counts.draugr + (sane.counts.warden||0)) >= 8 && (sane.counts.wight + (sane.counts.conjurer||0)) >= 3 && sane.boss, JSON.stringify(sane.counts));
check('entering sets the crypt quest flag', sane.flag === true);
await h.shot('s7_entry');

// walk into the boss hall -> gate closes, boss engages
await G(() => { const g = window.__ff.game.scene.getScene('Game'); g.enemies.getChildren().forEach((e) => { if (!e.isBoss) { e.destroy(); } }); g.enemies.getChildren().filter((e) => !e.isBoss).forEach((e) => g.enemies.remove(e)); g.player.setPosition(15.5 * 16, 11 * 16); window.__ff.S.hp = 100; g.player.invuln = 0; });
await press('KeyW'); await h.sleep(900); await rel('KeyW');
let b = await G(() => { const g = window.__ff.game.scene.getScene('Game'); return { eng: g.boss.engaged, gate: g.gate.closed, solid: g.solid[9][15], st: g.boss.state, inv: g.boss.invulnerable }; });
check('boss engages when the player crosses the gate', b.eng && b.gate && b.solid, JSON.stringify(b));
await h.sleep(2300);
await h.shot('s7_boss');
// boss can't be hurt during roar; after the roar it attacks and telegraphs
const seenAtk = new Set(); let tele = false, hurtBoss = false;
await G(() => { window.__ff.game.scene.getScene('Game').player.invuln = 999; });
for (let i = 0; i < 500 && !(tele && seenAtk.size >= 2); i++) {
  const r = await G(() => { const g = window.__ff.game.scene.getScene('Game'); const bs = g.boss; return { st: bs.state, atk: bs.atk, hp: bs.hp, tele: bs.tele.length, ph: bs.bphase }; });
  if (r.st === 'windup') { seenAtk.add(r.atk); if (r.tele) tele = true; }
  await h.sleep(60);
  // keep distance: stay in the hall, don't die
  if (i % 20 === 0) await G(() => { const g = window.__ff.game.scene.getScene('Game'); g.player.setPosition(15.5 * 16, 7.8 * 16 + 40 * (Math.random() - 0.3)); window.__ff.S.hp = 100; });
}
check('boss telegraphs attacks (windup + danger zone)', tele && seenAtk.size >= 2, [...seenAtk].join());

// phase 2 at <=50%
await G(() => { const g = window.__ff.game.scene.getScene('Game'); const bs = g.boss; bs.invulnerable = false; bs.state = 'chase'; bs.takeHit({ dmg: bs.hp - bs.maxHp * 0.49, kx: 0, ky: 0, kb: 0 }); });
await h.sleep(300);
let ph = await G(() => { const bs = window.__ff.game.scene.getScene('Game').boss; return { ph: bs.bphase, st: bs.state, inv: bs.invulnerable, sp: bs.speedMul }; });
check('boss enters phase 2 (roar, invulnerable, faster)', ph.ph === 2 && ph.inv && ph.sp > 1, JSON.stringify(ph));
await h.sleep(2600);
const adds = await G(() => window.__ff.game.scene.getScene('Game').enemies.getChildren().filter((e) => e.kind === 'draugr').length);
check('phase 2 summons draugr', adds >= 2, `adds=${adds}`);
// phase 2 attacks include nova or charge eventually
const seen2 = new Set();
for (let i = 0; i < 600 && !(seen2.has('nova') || seen2.has('charge')); i++) {
  const r = await G(() => { const bs = window.__ff.game.scene.getScene('Game').boss; return { st: bs.state, atk: bs.atk }; });
  if (r.st === 'windup' || r.st === 'attack') seen2.add(r.atk);
  await h.sleep(60);
  if (i % 15 === 0) await G(() => { const g = window.__ff.game.scene.getScene('Game'); g.player.setPosition(15.5 * 16, 7.8 * 16 + 40 * Math.random()); window.__ff.S.hp = 100; });
}
check('phase 2 uses new attacks (nova/charge)', seen2.has('nova') || seen2.has('charge'), [...seen2].join());
await h.shot('s7_phase2');

// kill the boss
await G(() => { const g = window.__ff.game.scene.getScene('Game'); const bs = g.boss; bs.invulnerable = false; bs.takeHit({ dmg: 9999, kx: 0, ky: 0, kb: 0 }); window.__ff.S.quests.king.status = 'active'; });
await h.sleep(500);
let st = await G(() => { const g = window.__ff.game.scene.getScene('Game'); return { dead: g.boss.dead, gate: g.gate.closed, flag: window.__ff.S.flags.bossDead, pk: g.pickups.length }; });
check('boss dies, gate reopens, loot drops', st.dead && !st.gate && st.flag && st.pk > 0, JSON.stringify(st));
await G(() => { const g = window.__ff.game.scene.getScene('Game'); g.player.setPosition(15.5 * 16, 6 * 16); });
await h.sleep(4500);
const fin = await G(() => ({ heart: window.__ff.S.inv.frostheart || 0, q: window.__ff.S.quests.king.status, blade: window.__ff.S.inv.nordic_blade || 0 }));
check('Frostheart drops and advances the quest', fin.heart === 1 && fin.q === 'relic', JSON.stringify(fin));
check('boss drops the Nordic Blade', fin.blade >= 1);
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'STAGE 7 FAILED' : 'STAGE 7 PASSED');
process.exit(failCount() ? 1 : 0);
