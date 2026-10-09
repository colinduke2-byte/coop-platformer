import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game');
await h.sleep(700);
const G = (fn, a) => h.ev(fn, a);
const press = (c) => h.ev((c) => window.__ff.keys._press(c), c);
const rel = (c) => h.ev((c) => window.__ff.keys._release(c), c);
const tap = async (c, ms = 80) => { await press(c); await h.sleep(ms); await rel(c); await h.sleep(70); };
const reset = () => G(() => {
  const g = window.__ff.game.scene.getScene('Game'); const S = window.__ff.S;
  g.enemies.getChildren().slice().forEach((e) => e.destroy()); g.enemies.clear(); g.pend.length = 0;
  g.shots.clear(true, true); g.eshots.clear(true, true);
  const p = g.player; p.setPosition(300, 250); p.body.setVelocity(0, 0); p.mode = 'free'; p.stunT = 0; p.lockT = 0; p.invuln = 0; p.iframes = 0; p.swing = null; p.face = { x: 1, y: 0 }; p.ward = null; p.blocking = false; p.target = null; p.rollCd = 0; p.counterT = 0; p.lastPerfect = -9;
  S.hp = 100; S.mp = 100; S.sp = 100; S.arrows = 20; S.blessing = null; S.equip.charm = null;
});
const dummy = (kind, dx, extra = {}) => G(([kind, dx, extra]) => {
  const g = window.__ff.game.scene.getScene('Game'); const e = g.addEnemy(kind, g.player.x + dx, g.player.y);
  e.cfg = { ...e.cfg, detect: 0, speed: 0, chase: 0, ...extra }; return true;
}, [kind, dx, extra]);
const E = () => G(() => { const e = window.__ff.game.scene.getScene('Game').enemies.getChildren()[0]; return e && { hp: e.hp, max: e.maxHp, poise: e.poise, stag: e.staggerT, state: e.state }; });

// ---- poise: enough hits stagger an enemy and open it up
await reset(); await dummy('draugr', 16);
for (let i = 0; i < 4; i++) { await tap('KeyJ', 40); await h.sleep(330); }
let e = await E();
check('chipping poise staggers the enemy', e.stag > 0 || e.hp < e.max, JSON.stringify(e));

// ---- heavy attack: slow, big, staggers
await reset(); await dummy('draugr', 18);
const sp0 = await G(() => window.__ff.S.sp);
await tap('KeyU', 50); await h.sleep(150);
check('heavy attack winds up (no hit yet)', (await E()).hp === (await E()).max);
await h.sleep(450);
e = await E();
check('heavy attack lands big and staggers', e.hp < e.max * 0.85 && e.stag > 0, JSON.stringify(e));
check('heavy attack costs stamina', (await G(() => window.__ff.S.sp)) < sp0 - 15);

// ---- perfect dodge: roll just before the hit connects
await reset();
await G(() => {
  const g = window.__ff.game.scene.getScene('Game'); const e = g.addEnemy('draugr', g.player.x + 16, g.player.y);
  e.alerted = true; e.cfg = { ...e.cfg, chase: 0, speed: 0, windup: 0.5, dmg: 20 }; e.startWindup({ x: -1, y: 0 }); e.stateT = 0.5;
});
await h.sleep(400);                // hit lands at ~0.5 + attack frame
await tap('Space', 30);
await h.sleep(500);
const pd = await G(() => { const p = window.__ff.game.scene.getScene('Game').player; return { counter: p.counterT, hp: window.__ff.S.hp }; });
check('rolling at the last moment is a perfect dodge (counter window, no damage)', pd.counter > 0 && pd.hp === 100, JSON.stringify(pd));
// counter bonus
await G(() => { const g = window.__ff.game.scene.getScene('Game'); const e = g.enemies.getChildren()[0]; e.stun = 0; e.hp = e.maxHp; g.player.counterT = 2; g.player.face = { x: 1, y: 0 }; g.player.setPosition(e.x - 16, e.y); g.player.mode = 'free'; });
const hp1 = (await E()).hp;
await tap('KeyJ', 40); await h.sleep(350);
const dmgCounter = hp1 - (await E()).hp;
await reset(); await dummy('draugr', 16);
const hp2 = (await E()).hp; await tap('KeyJ', 40); await h.sleep(350);
const dmgPlain = hp2 - (await E()).hp;
check('the counter-attack hits harder', dmgCounter > dmgPlain * 1.15, `${dmgCounter} vs ${dmgPlain}`);

// ---- crit & lifesteal from gear
await reset();
await G(async () => {
  const gl = await import('/src/systems/genloot.js');
  const id = 'g_test'; gl.registerGen(id, { name: 'Test Blade', type: 'weapon', icon: ['sword', 13], dmg: 14, crit: 1, lifesteal: 0.5, rarity: 'rare', gen: true, affixLines: [] });
  window.__ff.S.inv[id] = 1; window.__ff.S.equip.weapon = id; window.__ff.S.hp = 50;
});
await dummy('draugr', 16);
await tap('KeyJ', 40); await h.sleep(350);
check('gear lifesteal heals on hit', (await G(() => window.__ff.S.hp)) > 50);
const crits = await G(() => window.__ff.game.scene.getScene('Game').fx.texts.some((t) => t.t.main && t.t.main.text === 'CRIT'));
check('gear crit chance shows CRIT', crits);

// ---- elite affixes
await reset();
const el = await G(async () => {
  const g = window.__ff.game.scene.getScene('Game');
  const base = g.addEnemy('draugr', g.player.x + 80, g.player.y, {}); const baseHp = base.maxHp; base.destroy();
  const e = g.addEnemy('draugr', g.player.x + 80, g.player.y, { elite: true, _i: 3 });
  return { aff: e.affixes, name: e.displayName, hp: e.maxHp, baseHp };
});
check('elites have an affix, a name and more health', el.aff.length === 1 && el.hp > el.baseHp * 1.5 && el.name.split(' ').length >= 2, JSON.stringify(el));

check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'COMBAT2 FAILED' : 'COMBAT2 PASSED');
process.exit(failCount() ? 1 : 0);
