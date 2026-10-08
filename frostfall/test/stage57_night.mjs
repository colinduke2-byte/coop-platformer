import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=forest&spawn=west&seed=424242'); await h.sleep(1500);
const G = (fn, a) => h.ev(fn, a);
await G(() => { window.__ff.S.flags.introDone = true; });

// the calendar and the moon
const m = await G(async () => {
  const M = await import('/src/systems/moon.js'), S = window.__ff.S;
  const out = {};
  S.days = 0; out.new0 = M.isNew(); S.days = 4; out.full4 = M.isFull() && !M.isBlood(); S.days = 12; out.blood = M.isBlood(); S.days = 20; out.notBlood = M.isFull() && !M.isBlood();
  S.days = 3; S.time = 1430; M.advanceTime(20); out.rolled = S.days === 4 && S.time === 10;
  return out;
});
check('moon phases cycle and the clock counts days', m.new0 && m.full4 && m.blood && m.notBlood && m.rolled, JSON.stringify(m));

// creature swaps
const sw = await G(async () => {
  const g = window.__ff.game.scene.getScene('Game'), S = window.__ff.S, N = await import('/src/world/nightlife.js'), M = await import('/src/systems/moon.js');
  let wolves = 0, were = 0, ghosts = 0, deer = 0;
  S.time = 22 * 60; S.days = 4;                         // full moon, deep night
  for (let i = 0; i < 100; i++) { const k = N.nightKind(g, 'wolf', { spec: { tier: 2 }, key: 'k' + i }); if (k === 'werewolf') were++; else wolves++; if (N.nightKind(g, 'deer', { spec: {}, key: 'd' + i }) === 'deer') deer++; if (N.nightKind(g, 'draugr', { spec: {}, key: 'g' + i }) === 'ghost') ghosts++; }
  S.time = 12 * 60; let dayWere = 0; for (let i = 0; i < 50; i++) if (N.nightKind(g, 'wolf', { spec: {}, key: 'k' + i }) !== 'wolf') dayWere++;
  const same = N.nightKind(g, 'wolf', { spec: {}, key: 'x' }) === N.nightKind(g, 'wolf', { spec: {}, key: 'x' });
  return { were, wolves, ghosts, deer, dayWere, same };
});
check('at night wolves become werewolves (mostly on a full moon), the dead become ghosts, deer stay', sw.were > 70 && sw.ghosts > 10 && sw.ghosts < 55 && sw.deer === 100 && sw.dayWere === 0 && sw.same, JSON.stringify(sw));

// the creatures exist and behave
const mk = await G(() => {
  const g = window.__ff.game.scene.getScene('Game'), p = g.player, out = {};
  const w = g.addEnemy('werewolf', p.x + 90, p.y, { tier: 0 }), gh = g.addEnemy('ghost', p.x - 90, p.y, { tier: 0 });
  out.w = w.maxHp > 48 && w.scaleX > 1.2; out.g = gh.cfg.ghostly === true && gh.alpha < 1.01;
  return out;
});
check('werewolves are bigger and tougher; ghosts are translucent', mk.w && mk.g, JSON.stringify(mk));
await h.sleep(1500);

// blood moon alpha pays out
const bl = await G(() => {
  const g = window.__ff.game.scene.getScene('Game'), S = window.__ff.S;
  S.days = 12; S.time = 23 * 60; S.gold = 0; g.bloodDay = null; g.enemies.getChildren().forEach((e) => e.destroy());
  g.spawnBloodAlpha(1); const alpha = g.enemies.getChildren().find((e) => e.spec?.blood);
  const ok = !!alpha && alpha.champion;
  alpha.die({}); g.markKilled(alpha);
  return { ok, gold: S.gold, again: g.bloodDay === 12 };
});
check('a blood moon brings a great wolf, once a night, with a big bounty', bl.ok && bl.gold >= 200 && bl.again, JSON.stringify(bl));

// waiting at a fire
const wt = await G(async () => {
  const g = window.__ff.game.scene.getScene('Game'), S = window.__ff.S, dlg = await import('/src/systems/dialogue.js'), { RestSpot } = await import('/src/entities/Props.js');
  S.time = 10 * 60; S.days = 1;
  const real = dlg.dialogue.hud; let opts; dlg.dialogue.hud = { say: async () => {}, choose: async (o) => { opts = o; return o.indexOf('Wait until dusk'); }, hideBox() {}, scene: real.scene };
  const r = new RestSpot(g, g.player.x, g.player.y); r.interact();
  await new Promise((res) => setTimeout(res, 2500)); dlg.dialogue.hud = real;
  return { opts, time: S.time, days: S.days };
});
check('a campfire lets you wait until dusk', wt.opts?.includes('Wait until dusk') && Math.abs(wt.time - 20.5 * 60) < 3 && wt.days === 1, JSON.stringify(wt));

// lantern
const ln = await G(() => { const g = window.__ff.game.scene.getScene('Game'), S = window.__ff.S; S.time = 22 * 60; S.inv.lantern = 0; const a = g.player.detectMult(); S.inv.lantern = 1; const b = g.player.detectMult(); return { a, b }; });
check('the lantern costs stealth at night', ln.b > ln.a * 1.2, JSON.stringify(ln));

await G(() => { window.__ff.S.time = 22 * 60; window.__ff.S.days = 4; });
await h.sleep(500);
await h.shot('s57_night_hud');
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'NIGHT FAILED' : 'NIGHT PASSED');
process.exit(failCount() ? 1 : 0);
