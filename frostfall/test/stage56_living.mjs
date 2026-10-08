import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=forest&spawn=west&seed=424242'); await h.sleep(1500);
const G = (fn, a) => h.ev(fn, a);
await G(() => { window.__ff.S.flags.introDone = true; });

// wounded traveller: helping costs a potion and pays
const w = await G(async () => {
  const g = window.__ff.game.scene.getScene('Game'), S = window.__ff.S, dlg = await import('/src/systems/dialogue.js'), { SCRIPTS } = await import('/src/data/dialogue.js');
  g.player.setPosition(60 * 16, 60 * 16);
  g.spawnWounded(1);
  const made = !!g.woundedEvt; S.inv.hp_potion = 2; S.gold = 0;
  const real = dlg.dialogue.hud; dlg.dialogue.hud = { say: async () => {}, choose: async () => 0, hideBox() {}, scene: real.scene };
  await SCRIPTS.wounded(); dlg.dialogue.hud = real;
  return { made, pots: S.inv.hp_potion, gold: S.gold, done: g.woundedEvt.done };
});
check('a wounded traveller appears; a potion buys gold and thanks', w.made && w.pots === 1 && w.gold > 0 && w.done, JSON.stringify(w));
await G(() => window.__ff.game.scene.getScene('Game').removeWounded());
check('the traveller leaves afterwards', await G(() => !window.__ff.game.scene.getScene('Game').woundedEvt));

// a hunt: wolves and a deer
const hu = await G(() => { const g = window.__ff.game.scene.getScene('Game'); g.spawnHunt(0); return { ok: !!g.huntEvt, wolves: g.huntEvt?.wolves.length }; });
check('wolves hunt a deer nearby', hu.ok && hu.wolves >= 2, JSON.stringify(hu));

// raid on a hamlet: stand near one
const rd = await G(() => {
  const g = window.__ff.game.scene.getScene('Game'), S = window.__ff.S;
  const p = g.built.pois.find((q) => q.kind === 'hamlet'); g.player.setPosition((p.x + 30) * 16, p.y * 16);
  if (g.solidAt(g.player.x, g.player.y)) g.player.setPosition((p.x - 30) * 16, p.y * 16);
  const ok = g.spawnRaid(1); const n = g.raidEvt?.foes.length || 0;
  S.gold = 0; for (const e of g.raidEvt.foes) e.die({});
  return { ok, n };
});
check('raiders attack a hamlet in reach', rd.ok && rd.n >= 3, JSON.stringify(rd));
await h.sleep(500);
await G(() => { window.__ff.game.scene.getScene('Game').livingTick(1); });
const after = await G(() => { const g = window.__ff.game.scene.getScene('Game'); return { gold: window.__ff.S.gold, raid: !!g.raidEvt, n: (window.__ff.S.flags.raidsStopped || 0) }; });
check('stopping the raid pays and ends the event', !after.raid && after.gold > 0 && after.n === 1, JSON.stringify(after));

// camp reoccupation
const rc = await G(async () => {
  const { markGone, isGone, RESETTLE } = await import('/src/systems/bless.js'), S = window.__ff.S;
  S.playtime = 720 * 3; markGone('forest:99', 'camp'); const a = isGone('forest:99');
  S.playtime = 720 * (3 + RESETTLE - 1); const b = isGone('forest:99');
  S.playtime = 720 * (3 + RESETTLE); const c = isGone('forest:99');
  markGone('forest:98', true); S.playtime = 720 * 99; const d = isGone('forest:98');
  return { a, b, c, d };
});
check('camps are reoccupied after a few days; champions stay dead', rc.a && rc.b && !rc.c && rc.d, JSON.stringify(rc));

// delivery contract
const dl = await G(async () => {
  const g = window.__ff.game.scene.getScene('Game'), S = window.__ff.S, c = await import('/src/data/contracts.js');
  S.playtime = 0; delete S.contracts;
  const p = g.built.pois.find((q) => q.kind === 'hamlet');
  const cs = c.ensureContracts(); cs.offers[0] = { id: p.id, kind: 'hamlet', x: p.x, y: p.y, tier: 0, gold: 50, gear: 0 }; cs.active = [p.id];
  S.gold = 0; g.player.setPosition(p.x * 16, p.y * 16 + 20); g.livingTick(0.1);
  return { gold: S.gold, done: !!S.contracts.done[p.id] };
});
check('a delivery job pays when you reach the hamlet', dl.done && dl.gold >= 50, JSON.stringify(dl));
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'LIVING FAILED' : 'LIVING PASSED');
process.exit(failCount() ? 1 : 0);
