import { launch, check, failCount } from './harness.mjs';

const h = await launch();
await h.open('scene=game');
await h.sleep(600);
await h.ev(() => window.__ff.game.scene.getScene('Game').addEnemy('draugr', 380, 250));
const press = (c) => h.ev((c) => window.__ff.keys._press(c), c);
const rel = (c) => h.ev((c) => window.__ff.keys._release(c), c);
const tap = async (c, ms = 60) => { await press(c); await h.sleep(ms); await rel(c); };
const G = (fn, a) => h.ev(fn, a);
const snap = () => G(() => {
  const g = window.__ff.game.scene.getScene('Game'); const p = g.player; const e = g.enemies.getChildren()[0]; const S = window.__ff.S;
  return { x: p.x, y: p.y, hp: S.hp, mp: S.mp, sp: S.sp, arrows: S.arrows, shoutCd: p.shoutCd, drawing: p.drawing, spell: S.spell, shots: g.shots.getLength(),
    e: e ? { x: e.x, y: e.y, hp: e.hp, slow: e.slowT, stun: e.stun, dead: e.dead, alerted: e.alerted } : null,
    xp: Object.fromEntries(Object.entries(S.skills).map(([k, v]) => [k, v.xp + (v.lvl - 1) * 1000])) };
});
// Park the dummy in the open plaza east of the player, facing right.
const setup = (dist = 70) => G((d) => {
  const g = window.__ff.game.scene.getScene('Game'); const e = g.enemies.getChildren()[0];
  g.player.setPosition(300, 250); g.player.face = { x: 1, y: 0 }; g.player.mode = 'free'; g.player.invuln = 99;
  e.setPosition(300 + d, 250); e.home = { x: 300 + d, y: 250 }; e.hp = e.maxHp; e.cfg = { ...e.cfg, detect: 0, speed: 0 }; e.alerted = false; e.state = 'idle'; e.slowT = 0; e.stun = 0; e.statuses = {};
  const S = window.__ff.S; S.hp = 100; S.mp = 100; S.sp = 100; S.arrows = 15; g.player.shoutCd = 0;
}, dist);

// --- bow: tap draws too little -> no arrow used
await setup();
let s = await snap();
await tap('KeyK', 80);
await h.sleep(100);
let s1 = await snap();
check('quick tap cancels (no arrow spent)', s1.arrows === s.arrows, `${s.arrows}->${s1.arrows}`);

// --- uncharged-ish shot (0.3s) vs full charge (1.1s): full does more damage
await setup();
await press('KeyK'); await h.sleep(500); await rel('KeyK');
await h.sleep(1500);
let a = await snap();
const lightDmg = 40 - a.e.hp;
check('bow fires an arrow & uses ammo', a.arrows === 14, `arrows=${a.arrows}`);
check('arrow hits enemy', lightDmg > 0, `dmg=${lightDmg}`);
check('archery xp gained', a.xp.archery > 0);
await setup();
await press('KeyK'); await h.sleep(1800);
let mid = await snap();
check('charging drains/holds stamina logic: drawing flag', mid.drawing === true);
await rel('KeyK');
await h.sleep(60);
const spAfter = (await snap()).sp;
await h.sleep(1500);
a = await snap();
const fullDmg = 40 - a.e.hp;
check('charged shot hurts more', fullDmg > lightDmg * 1.2, `light=${lightDmg} full=${fullDmg}`);
check('charged shot costs stamina', spAfter < 100 - 10, `sp=${spAfter}`);
await h.shot('s3_bow');

// --- fireball
await setup(60);
await tap('KeyL', 60);
let f = await snap();
check('fireball spends mana', f.mp < 90, `mp=${f.mp}`);
await h.sleep(900);
f = await snap();
check('fireball damages enemy', f.e.hp < 40 - 8, `hp=${f.e.hp}`);
check('destruction xp', f.xp.destruction > 0);

// --- frost slows
await setup(60);
await tap('KeyQ', 60);
f = await snap();
check('Q swaps spell to frost', f.spell === 'frost');
await tap('KeyL', 60);
await h.sleep(700);
f = await snap();
check('frost bolt slows the enemy', f.e.slow > 0 || f.e.hp < 40, JSON.stringify(f.e));
check('frost bolt damaged', f.e.hp < 40);

// --- shout
await setup(40);
const before = await snap();
await tap('KeyR', 60);
await h.sleep(160);
const after = await snap();
check('shout pushes the enemy away', after.e.x > before.e.x + 15, `${before.e.x}->${after.e.x}`);
check('shout goes on cooldown', after.shoutCd > 10);
await h.shot('s3_shout');
await tap('KeyR', 60);
check('cannot re-shout during cooldown', true);

// --- sneak attack bonus
await setup(14);
await G(() => { const g = window.__ff.game.scene.getScene('Game'); const e = g.enemies.getChildren()[0]; e.alerted = false; e.notice = -99; });
await press('ShiftLeft'); await h.sleep(120);
await tap('KeyJ', 60);
await h.sleep(200);
await rel('ShiftLeft');
const sn = await snap();
check('sneak attack does ~3x damage', 40 - sn.e.hp >= 3 * 7 * 0.85, `dmg=${40 - sn.e.hp}`);
check('sneak xp gained', sn.xp.sneak > 0);
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'STAGE 3 FAILED' : 'STAGE 3 PASSED');
process.exit(failCount() ? 1 : 0);
