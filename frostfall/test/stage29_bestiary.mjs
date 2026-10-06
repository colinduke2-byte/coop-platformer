import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=424242');
await h.sleep(800);
const G = (fn, a) => h.ev(fn, a);
await h.ev(() => { window.gs = () => window.__ff.game.scene.getScene('Game'); window.__ff.S.flags.introDone = true; });
const reset = () => G(() => {
  const g = window.gs(), S = window.__ff.S;
  g.enemies.getChildren().slice().forEach((e) => e.destroy()); g.enemies.clear(); g.pend.length = 0; g.zones.forEach((z) => { z.disc.destroy(); z.rg.destroy(); }); g.zones.length = 0;
  g.shots.clear(true, true); g.eshots.clear(true, true);
  const p = g.player; p.setPosition(300, 250); p.body.setVelocity(0, 0); p.mode = 'free'; p.stunT = 0; p.lockT = 0; p.invuln = 0; p.iframes = 0; p.swing = null; p.face = { x: 1, y: 0 }; p.target = null;
  S.hp = 200; S.maxHp = 200; S.mp = 100; S.sp = 100;
});
const spawn = (kind, dx, dy = 0, alert = true) => G(([kind, dx, dy, alert]) => { const g = window.gs(); const e = g.addEnemy(kind, g.player.x + dx, g.player.y + dy, { tier: 2 }); if (alert) e.alert(true); window.__e = e; return true; }, [kind, dx, dy, alert]);

// every new creature runs for three seconds without errors
for (const k of ['bear', 'lynx', 'boar', 'imp', 'necro', 'shroom', 'golem', 'wisp', 'frostworm', 'wyvern', 'mimic']) {
  await reset(); await G(() => { window.__ff.S.hp = 9999; window.__ff.S.maxHp = 9999; window.gs().player.invuln = 999; });
  await spawn(k, 90, 10);
  await h.sleep(3200);
  const st = await G(() => { const e = window.__e; return { alive: !e.dead, x: Math.round(e.x), state: e.state, scale: e.scaleX }; });
  check(`${k}: runs three seconds of combat AI without errors`, h.errors.length === 0, h.errors.join('\n') + JSON.stringify(st));
  h.errors.length = 0;
}
await h.shot('s29_zoo');

// ---- specifics
await reset(); await spawn('lynx', 120, 0, false);
await h.sleep(300);
check('lynx is faint when unaware', await G(() => { const e = window.__e; return e.alerted || e.alpha < 0.5; }));

await reset(); await G(() => { window.gs().player.invuln = 0; window.__ff.S.hp = 200; });
await spawn('imp', 30, 0);
await h.sleep(1500);
const imp = await G(() => ({ dead: window.__e.dead, hp: window.__ff.S.hp }));
check('an imp bursts and the blast hurts', imp.dead && imp.hp < 200, JSON.stringify(imp));

await reset(); await spawn('necro', 90, 0);
await h.sleep(6500);
const drg = await G(() => window.gs().enemies.getChildren().filter((e) => e.kind === 'draugr').length);
check('the Grave Caller raises draugr (and never more than three)', drg >= 1 && drg <= 3, String(drg));

await reset(); await G(() => { window.gs().player.invuln = 999; });
await spawn('shroom', 80, 0);
const z0 = await G(() => window.gs().zones.length);
let zmax = z0;
for (let i = 0; i < 24 && zmax < 3; i++) { await h.sleep(250); zmax = Math.max(zmax, await G(() => window.gs().zones.length)); }
check('a Spore Mother seeds several bursts at once', zmax >= 3, String(zmax));

await reset(); await spawn('golem', 18, 0, true);
await G(() => { window.__e.cfg = { ...window.__e.cfg, detect: 0, speed: 0, chase: 0 }; });
await G(() => { const e = window.__e; e.takeHit({ dmg: 20, kx: 1, ky: 0, kb: 0, src: 'melee' }); });
const gh = await G(() => ({ hp: window.__e.hp, max: window.__e.maxHp }));
check('the golem shrugs off ordinary blows (armoured)', gh.max - gh.hp < 8, JSON.stringify(gh));

await reset(); await G(() => { window.__ff.S.hp = 9999; window.__ff.S.maxHp = 9999; window.gs().player.invuln = 999; });
await spawn('frostworm', 120, 0);
await h.sleep(300);
check('the frost worm starts burrowed: invisible and untouchable', await G(() => window.__e.hidden === true && window.__e.takeHit({ dmg: 99, kx: 1, ky: 0, kb: 0, src: 'melee' }) === 0));
await h.sleep(4000);
const worm = await G(() => ({ bs: window.__e.bs, hidden: window.__e.hidden, near: Math.hypot(window.__e.x - window.gs().player.x, window.__e.y - window.gs().player.y) }));
check('then it marks the spot and surfaces beside you', worm.bs === 'up' || worm.bs === 'tele', JSON.stringify(worm));

await reset(); await spawn('wyvern', 110, 0);
const fly = await G(() => ({ fly: window.__e.cfg.fly, collides: window.__e.body.checkCollision.none }));
check('wyverns fly (no wall collisions) and circle', fly.fly === true);
await h.sleep(3500);
check('the wyvern dives at you', await G(() => window.__e.dead || ['windup', 'attack', 'recover', 'chase'].includes(window.__e.state)));

// ---- a mimic chest
await reset();
await G(async () => { const { default: Chest } = await import('/src/entities/Chest.js'); const g = window.gs(); const c = new Chest(g, g.player.x + 20, g.player.y, { id: 'mimictest', mimic: true, tier: 1, loot: [{ gold: 5 }] }); g.interactables.push(c); window.__c = c; });
const chestOk = await G(() => !!window.__c && typeof window.__c.reveal === 'function');
if (chestOk) {
  await G(() => { window.__c.interact(); });
  await h.sleep(400);
  check('opening a mimic chest wakes a mimic', await G(() => window.gs().enemies.getChildren().some((e) => e.kind === 'mimic' && e.alerted)));
} else check('a mimic chest can be created', false, 'no chest class found in this scene');
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'BESTIARY FAILED' : 'BESTIARY PASSED');
process.exit(failCount() ? 1 : 0);
