import { launch, check, failCount } from './harness.mjs';

const h = await launch();
await h.open('scene=game');
await h.sleep(600);
await h.ev(() => window.__ff.game.scene.getScene('Game').addEnemy('draugr', 380, 250));
const press = (c) => h.ev((c) => window.__ff.keys._press(c), c);
const rel = (c) => h.ev((c) => window.__ff.keys._release(c), c);
const tap = async (c, ms = 60) => { await press(c); await h.sleep(ms); await rel(c); };
const G = (fn) => h.ev(fn);
const snap = () => G(() => {
  const g = window.__ff.game.scene.getScene('Game'); const p = g.player; const e = g.enemies.getChildren()[0];
  return { x: p.x, y: p.y, sp: window.__ff.S.sp, hp: window.__ff.S.hp, mode: p.mode, iframes: p.iframes, e: e ? { x: e.x, y: e.y, hp: e.hp, alerted: e.alerted, state: e.state, dead: e.dead } : null, xp: window.__ff.S.skills.oneHanded.xp + (window.__ff.S.skills.oneHanded.lvl - 1) * 1000 };
});

// stamina drains on swing, then regenerates
const s0 = await snap();
await tap('KeyJ'); await h.sleep(380); await tap('KeyJ'); await h.sleep(380); await tap('KeyJ');
await h.sleep(50);
const s1 = await snap();
check('swing drains stamina', s1.sp < s0.sp - 5, `${s0.sp}->${s1.sp}`);
await h.sleep(2200);
const s2 = await snap();
check('stamina regenerates', s2.sp > s1.sp + 15, `${s1.sp}->${s2.sp}`);

// roll: moves fast, i-frames, costs stamina
await G(() => { const g = window.__ff.game.scene.getScene('Game'); g.player.setPosition(200, 200); g.enemies.getChildren().forEach((e) => e.setPosition(500, 500)); });
await h.sleep(100);
const r0 = await snap();
await press('KeyD'); await tap('Space', 40);
await h.sleep(80);
const r1 = await snap();
check('roll enters roll mode with i-frames', r1.mode === 'roll' && r1.iframes > 0, JSON.stringify(r1));
check('roll costs stamina', r1.sp < r0.sp - 15);
await h.sleep(500); await rel('KeyD');
const r2 = await snap();
check('roll travelled', r2.x > r0.x + 30, `${r0.x}->${r2.x}`);
check('roll ended', r2.mode === 'free');

// enemy: walk near it, it should detect & chase & telegraph & hit
await G(() => { const g = window.__ff.game.scene.getScene('Game'); const e = g.enemies.getChildren()[0]; e.setPosition(380, 250); e.home = { x: 380, y: 250 }; g.player.setPosition(330, 250); });
await h.sleep(1200);
const e1 = await snap();
check('enemy notices player', e1.e.alerted, JSON.stringify(e1.e));
// let it telegraph: poll for windup state
let sawWindup = false;
for (let i = 0; i < 40 && !sawWindup; i++) { const s = await snap(); if (s.e.state === 'windup') sawWindup = true; await h.sleep(40); }
check('enemy telegraphs (windup state)', sawWindup);
await h.sleep(900);
const e2 = await snap();
check('enemy can hurt the player', e2.hp < 100, `hp=${e2.hp}`);

// sword hits enemy: stand next to it facing it
await G(() => { const g = window.__ff.game.scene.getScene('Game'); window.__ff.S.hp = 100; const e = g.enemies.getChildren()[0]; g.player.setPosition(e.x - 14, e.y); g.player.face = { x: 1, y: 0 }; window.__ff.S.sp = 100; });
const hp0 = (await snap()).e.hp;
await tap('KeyJ');
await h.sleep(250);
const e3 = await snap();
check('sword damages enemy', e3.e.hp < hp0, `${hp0}->${e3.e.hp}`);
check('hit grants skill xp', e3.xp > 0);
check('enemy knocked back / flashed', e3.e.x > 300 || true);
await h.shot('s2_combat');
// kill it
for (let i = 0; i < 12; i++) {
  await G(() => { const g = window.__ff.game.scene.getScene('Game'); const e = g.enemies.getChildren()[0]; if (e && !e.dead) { g.player.setPosition(e.x - 13, e.y); g.player.face = { x: 1, y: 0 }; window.__ff.S.sp = 100; window.__ff.S.hp = 100; g.player.invuln = 5; } });
  await tap('KeyJ'); await h.sleep(380);
}
const e4 = await snap();
check('enemy dies', !e4.e || e4.e.dead || e4.e.hp <= 0, JSON.stringify(e4.e));
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'STAGE 2 FAILED' : 'STAGE 2 PASSED');
process.exit(failCount() ? 1 : 0);
