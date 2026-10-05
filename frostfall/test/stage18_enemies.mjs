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
  g.enemies.getChildren().slice().forEach((e) => e.destroy()); g.enemies.clear();
  g.shots.clear(true, true); g.eshots.clear(true, true);
  const p = g.player; p.setPosition(300, 250); p.body.setVelocity(0, 0); p.mode = 'free'; p.stunT = 0; p.lockT = 0; p.invuln = 0; p.iframes = 0; p.swing = null; p.face = { x: 1, y: 0 }; p.ward = null; p.blocking = false; p.target = null; p.rollCd = 0;
  S.hp = 100; S.mp = 100; S.sp = 100; S.arrows = 20;
});
const spawn = (kind, dx, extra = {}) => G(([kind, dx, extra]) => {
  const g = window.__ff.game.scene.getScene('Game'); const e = g.addEnemy(kind, g.player.x + dx, g.player.y);
  e.cfg = { ...e.cfg, detect: 0, speed: 0, chase: 0, ...extra }; return true;
}, [kind, dx, extra]);
const E = () => G(() => { const e = window.__ff.game.scene.getScene('Game').enemies.getChildren()[0]; return e && { hp: e.hp, max: e.maxHp, open: e.openT, state: e.state, evade: e.evade, x: e.x }; });

// ---- knight: ordinary hits bounce, an opened knight takes much more
await reset(); await spawn('knight', 16);
await tap('KeyJ', 60); await h.sleep(300);
const e1 = await E(); const bounce = e1.max - e1.hp;
await G(() => { window.__ff.game.scene.getScene('Game').enemies.getChildren()[0].hp = window.__ff.game.scene.getScene('Game').enemies.getChildren()[0].maxHp; });
await reset(); await spawn('knight', 16);
await G(() => { window.__ff.game.scene.getScene('Game').enemies.getChildren()[0].openT = 2; });
await h.sleep(200);
await tap('KeyJ', 60); await h.sleep(300);
const e2 = await E(); const open = e2.max - e2.hp;
check('armoured knight shrugs off ordinary hits', bounce > 0 && bounce < open / 3, `bounce=${bounce} open=${open}`);

// ---- a parry opens the knight
await reset(); await G(() => { const S = window.__ff.S; S.inv.wooden_shield = 1; S.equip.shield = 'wooden_shield'; S.equip.offhand = 'wooden_shield'; });
await G(() => { const g = window.__ff.game.scene.getScene('Game'); const e = g.addEnemy('knight', g.player.x + 16, g.player.y); e.cfg = { ...e.cfg, detect: 0 }; window.__k = e; const p = g.player; p.blocking = true; p.blockT = 0.05; p.face = { x: 1, y: 0 }; p.onParry(e, e.x, e.y); });
check('a parry opens the knight up', (await E()).open > 1);
await G(() => { window.__ff.game.scene.getScene('Game').player.blocking = false; window.__ff.S.equip.offhand = null; });

// ---- fencer dodges a swing, then can be hit
await reset(); await spawn('fencer', 18);
await G(() => { const e = window.__ff.game.scene.getScene('Game').enemies.getChildren()[0]; e.alerted = true; e.state = 'chase'; e.cfg = { ...e.cfg, dmg: 0 }; });
await tap('KeyJ', 40); await h.sleep(60);
const fe = await E();
check('fencer sidesteps the first swing', fe.evade > 0 || fe.hp === fe.max, JSON.stringify(fe));
await h.sleep(500);
check('fencer took no damage from the dodged swing', (await E()).hp === fe.max);

// ---- reaver holds its swing while you roll
await reset(); await spawn('reaver', 16);
await G(() => { const g = window.__ff.game.scene.getScene('Game'); const e = g.enemies.getChildren()[0]; e.alerted = true; e.cfg = { ...e.cfg, dmg: 5 }; e.startWindup({ x: -1, y: 0 }); e.stateT = 0.2; });
await G(() => { const p = window.__ff.game.scene.getScene('Game').player; p.mode = 'roll'; p.rollT = 0.45; p.iframes = 0.3; });
await h.sleep(300);
check('reaver is still winding up while the roll is on', (await E()).state === 'windup');
await h.sleep(900);
check('reaver strikes after the roll ends', (await E()).state !== 'windup');

// ---- arrow cap, special arrows, burning / bleeding
await reset();
const capped = await G(async () => { const inv = await import('/src/systems/inventory.js'); window.__ff.S.arrows = 28; const got = inv.addArrows(10); return [got, window.__ff.S.arrows]; });
check('quiver is capped at 30 arrows', capped[0] === 2 && capped[1] === 30, JSON.stringify(capped));
await reset(); await spawn('draugr', 60);
await G(() => { const S = window.__ff.S; S.inv.fire_arrow = 3; S.ammo = 'fire_arrow'; });
await tap('KeyV', 50);
check('V cycles ammo back to plain arrows', (await G(() => window.__ff.S.ammo)) === 'arrow');
await tap('KeyV', 50);
check('V cycles to fire arrows', (await G(() => window.__ff.S.ammo)) === 'fire_arrow');
await press('KeyK'); await h.sleep(500); await rel('KeyK'); await h.sleep(700);
check('firing a special arrow uses one from the stack', (await G(() => window.__ff.S.inv.fire_arrow)) === 2);
const hit = await G(() => { const e = window.__ff.game.scene.getScene('Game').enemies.getChildren()[0]; return { hp: e.hp, max: e.maxHp, dot: !!e.dot }; });
check('a fire arrow sets the target burning', hit.hp < hit.max && hit.dot, JSON.stringify(hit));
await h.sleep(1200);
const hit2 = await G(() => window.__ff.game.scene.getScene('Game').enemies.getChildren()[0].hp);
check('burning keeps ticking damage', hit2 < hit.hp, `${hit.hp} -> ${hit2}`);

// ---- loud noises wake sleepers; sneaking up does not
await reset(); await spawn('draugr', 60);
const calm = await G(() => { const g = window.__ff.game.scene.getScene('Game'); const e = g.enemies.getChildren()[0]; e.alerted = false; g.noise(g.player.x, g.player.y, 30); return e.alerted; });
check('a quiet noise out of range does not wake them', calm === false);
const woke = await G(() => { const g = window.__ff.game.scene.getScene('Game'); const e = g.enemies.getChildren()[0]; g.noise(g.player.x, g.player.y, 90); return e.alerted; });
check('a shout-sized noise wakes sleepers', woke === true);

console.log(h.errors.length ? 'ERRORS:\n' + h.errors.join('\n') : 'no console errors');
check('no console errors', h.errors.length === 0);
await h.close();
process.exit(failCount() ? 1 : 0);
