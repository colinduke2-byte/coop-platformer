// Combat pass, fixes (docs/audit/combat.md): CB2 input through hit-stop, CB6 exact aim, CB7 phase-3 tells, CB8 attackers on
// sweeps and shots, CB10 parry lockout, CB11/CB24 style heavies, CB12 minimum tell, CB13 crush mark, CB15 no off-screen shots,
// CB16 lock-on, CB18 boss attack slot, CB19 strafing at walls, CB1/CB9 hyper-armour, danger marks at their real size.
import { launch, check, failCount, FRAME_MS } from './harness.mjs';
const h = await launch();
await h.open('scene=game');
await h.pause();
const F = (ms) => Math.max(1, Math.round(ms / FRAME_MS));
const wait = (ms) => h.frames(F(ms));
await wait(700);
const G = (fn, a) => h.ev(fn, a);
const reset = (weapon = null) => G((w) => {
  const g = window.__ff.game.scene.getScene('Game'); const S = window.__ff.S;
  g.enemies.getChildren().slice().forEach((e) => e.destroy()); g.enemies.clear(); g.pend.length = 0;
  g.shots.clear(true, true); g.eshots.clear(true, true);
  const p = g.player; p.setPosition(300, 250); p.body.setVelocity(0, 0); p.mode = 'free'; p.stunT = 0; p.lockT = 0; p.invuln = 0; p.iframes = 0; p.swing = null; p.face = { x: 1, y: 0 }; p.ward = null; p.blocking = false; p.target = null; p.rollCd = 0; p.counterT = 0; p.lastPerfect = -9; p.charging = null; p.comboT = 0; p.parryLockUntil = -9;
  S.hp = 100; S.mp = 100; S.sp = 100; S.arrows = 20; S.blessing = null; S.equip.charm = null;
  S.inv[w || 'rusty_sword'] = 1; S.equip.weapon = w || 'rusty_sword'; S.equip.offhand = null;
  g.hitStopT = 0;
}, weapon);
const add = (kind, dx, dy = 0, extra = {}) => G(([kind, dx, dy, extra]) => {
  const g = window.__ff.game.scene.getScene('Game'); const e = g.addEnemy(kind, g.player.x + dx, g.player.y + dy);
  e.cfg = { ...e.cfg, detect: 0, speed: 0, chase: 0, ...extra }; if (e.wander) { e.wander.t = 99; e.wander.dx = 0; e.wander.dy = 0; } return g.enemies.getChildren().length - 1;
}, [kind, dx, dy, extra]);

// ---- CB2: a roll tapped during a hit-stop freeze still happens
await reset('iron_greatsword'); await add('draugr', 18);
await G(() => { const e = window.__ff.game.scene.getScene('Game').enemies.getChildren()[0]; e.hp = e.maxHp = 5000; });
await h.tap('KeyJ', 2, 0);
const stopped = await h.until(() => window.__ff.game.scene.getScene('Game').hitStopT > 0, 90);
await h.tap('Space', 2, 0);
const stillStopped = await G(() => window.__ff.game.scene.getScene('Game').hitStopT > 0);
const rolled = await h.until(() => window.__ff.game.scene.getScene('Game').player.mode === 'roll', 40);
check('a roll pressed during a hit-stop is buffered and happens after it (CB2)', stopped.ok && rolled.ok, JSON.stringify({ stopped, stillStopped, rolled }));

// ---- CB3: a greatsword hits later in its swing than a dagger
const firstHit = async (w) => {
  await reset(w); await add('draugr', 16);
  await G(() => { const e = window.__ff.game.scene.getScene('Game').enemies.getChildren()[0]; e.hp = e.maxHp = 5000; });
  await h.press('KeyJ');
  const r = await h.until(() => { const e = window.__ff.game.scene.getScene('Game').enemies.getChildren()[0]; return e.hp < e.maxHp; }, 120);
  await h.release('KeyJ'); await wait(900);
  return r.frames;
};
const tDag = await firstHit('skinning_knife'), tSword = await firstHit('iron_sword'), tGreat = await firstHit('iron_greatsword'), tHam = await firstHit('warhammer');
check('heavier weapons land their blow later in the swing (CB3)', tDag <= tSword && tSword < tGreat && tGreat <= tHam, JSON.stringify({ tDag, tSword, tGreat, tHam }));

// ---- CB4: only the finisher counts as heavy (no HEAVY text on a first greatsword swing; hit-stop capped)
await reset('iron_greatsword'); await add('draugr', 18);
await G(() => { const g = window.__ff.game.scene.getScene('Game'); const e = g.enemies.getChildren()[0]; e.hp = e.maxHp = 5000; g.fx.texts.forEach((t) => { t.life = 0; }); });
await h.tap('KeyJ', 2, 0);
await h.until(() => window.__ff.game.scene.getScene('Game').hitStopT > 0, 90);
const hs1 = await G(() => { const g = window.__ff.game.scene.getScene('Game'); return { stop: g.hitStopT, heavyTxt: g.fx.texts.some((t) => t.t.main && t.t.main.text === 'HEAVY' && t.life > 0) }; });
check('a first greatsword swing is not a "heavy" and its hit-stop is capped (CB4)', !hs1.heavyTxt && hs1.stop <= 0.0901, JSON.stringify(hs1));
await wait(900);

// ---- CB6: an arrow locked on a target 30 degrees off the 8-way line hits it
await reset(); await add('draugr', 90, 52);   // atan(52/90) = 30 degrees
await G(() => { const g = window.__ff.game.scene.getScene('Game'); const e = g.enemies.getChildren()[0]; e.hp = e.maxHp = 500; g.player.target = e; window.__ff.S.inv.hunting_bow = 1; window.__ff.S.equip.bow = 'hunting_bow'; });
await h.tap('KeyK', F(500), 0);
const aim = await G(() => {
  const g = window.__ff.game.scene.getScene('Game'), s = g.shots.getChildren()[0], e = g.enemies.getChildren()[0];
  if (!s) return null;
  const a1 = Math.atan2(s.body.velocity.y, s.body.velocity.x), a2 = Math.atan2(e.body.center.y - s.y, e.body.center.x - s.x);
  return { err: Math.abs(a1 - a2) * 180 / Math.PI };
});
check('a locked-on arrow flies straight at a target off the 45-degree lines (CB6)', aim && aim.err < 3, JSON.stringify(aim));

// ---- CB16: lock-on skips deer, needs a line of sight, switches, and moves on after a kill
await reset(); await add('deer', 30); await add('draugr', 70);
await h.tap('KeyT', 2, 1);
const lock1 = await G(() => window.__ff.game.scene.getScene('Game').player.target?.kind);
check('lock-on picks the foe, not the nearer deer (CB16)', lock1 === 'draugr', String(lock1));
await add('wolf', -60);
await h.press('KeyA'); await h.tap('KeyT', 2, 1); await h.release('KeyA');
const lock2 = await G(() => window.__ff.game.scene.getScene('Game').player.target?.kind);
check('T while holding a direction switches the lock that way (CB16)', lock2 === 'wolf', String(lock2));
await G(() => { const g = window.__ff.game.scene.getScene('Game'); g.player.target.takeHit({ dmg: 99999, kx: 1, ky: 0, src: 'melee' }); });
await wait(100);
const lock3 = await G(() => window.__ff.game.scene.getScene('Game').player.target?.kind);
check('a kill hands the lock to the next foe (CB16)', lock3 === 'draugr', String(lock3));

// ---- CB7: the third phase tells faster than the second
const ph = await G(() => import('/src/entities/Boss.js').then(({ default: Boss }) => {
  const wf = Boss.prototype.windupFor, rf = Boss.prototype.recoverFor;
  const B = { sweep: { windup: 0.6, recover: 0.7 }, nova: { windup: 1.0, recover: 1.0 } };
  const at = (bphase, a) => ({ w: wf.call({ B, bphase }, a), r: rf.call({ B, bphase }, a) });
  return { p1: at(1, 'nova'), p2: at(2, 'nova'), p3: at(3, 'nova'), s3: at(3, 'sweep') };
}));
check('boss phase 3 tells and recovers faster than phase 2 (CB7)', ph.p3.w < ph.p2.w && ph.p2.w < ph.p1.w && ph.p3.r < ph.p2.r && ph.s3.w >= 0.4, JSON.stringify(ph));

// ---- CB8 + CB27: an enemy shot carries its shooter; rolling through it at the last moment is a perfect dodge
await reset(); await add('archer', 60);
const pd = await G(() => {
  const g = window.__ff.game.scene.getScene('Game'), p = g.player, e = g.enemies.getChildren()[0];
  p.mode = 'roll'; p.rollT = 0.3; p.iframes = 0.3; p.rollStart = g.t; p.rollDir = { x: 0, y: 1 };
  return import('/src/entities/Projectile.js').then(({ default: Projectile }) => {
    const pr = new Projectile(g, p.x + 6, p.y, 'bolt', -100, 0, { dmg: 10, owner: e }); g.eshots.add(pr);
    pr.hitPlayer(p);
    return { counter: p.counterT > 0, owner: pr.owner === e, hp: window.__ff.S.hp, archerStun: e.stun };
  });
});
check('a dodged arrow knows its archer: perfect dodge, no stun at range (CB8)', pd.counter && pd.owner && pd.hp === 100 && !(pd.archerStun > 0.5), JSON.stringify(pd));
await wait(600);

// ---- CB10: a whiffed parry locks out the next parry window
await reset(); await G(() => { const S = window.__ff.S; S.inv.wooden_shield = 1; S.equip.offhand = 'wooden_shield'; });
await h.tap('KeyF', 3, 2);
const lk = await G(() => { const g = window.__ff.game.scene.getScene('Game'); return g.player.parryLockUntil - g.t; });
await h.press('KeyF'); await wait(30);
const bt = await G(() => window.__ff.game.scene.getScene('Game').player.blockT);
await h.release('KeyF');
check('a parry that caught nothing locks the next parry window out (CB10)', lk > 0.2 && bt > 0.18, JSON.stringify({ lk, bt }));

// ---- CB25: parrying a shot sends it back
await reset(); await G(() => { const S = window.__ff.S; S.inv.wooden_shield = 1; S.equip.offhand = 'wooden_shield'; });
await add('archer', 80);
await h.press('KeyF'); await wait(30);
const defl = await G(() => {
  const g = window.__ff.game.scene.getScene('Game'), p = g.player, e = g.enemies.getChildren()[0];
  return import('/src/entities/Projectile.js').then(({ default: Projectile }) => {
    const pr = new Projectile(g, p.x + 8, p.y + 3, 'bolt', -120, 0, { dmg: 12, owner: e }); g.eshots.add(pr);
    pr.hitPlayer(p);
    const back = g.shots.getChildren().find((s) => s.deflected);
    return { hp: window.__ff.S.hp, back: !!back, vx: back ? back.body.velocity.x : 0 };
  });
});
await h.release('KeyF');
const archerHurt = await h.until(() => { const e = window.__ff.game.scene.getScene('Game').enemies.getChildren()[0]; return e && e.hp < e.maxHp; }, 90);
check('a parried arrow flies back and hits the archer (CB25)', defl.hp === 100 && defl.back && defl.vx > 0 && archerHurt.ok, JSON.stringify(defl));

// ---- CB11 / CB24: a spear's heavy reaches like a spear and pins
await reset('hunting_spear'); await add('draugr', 30);
await G(() => { const e = window.__ff.game.scene.getScene('Game').enemies.getChildren()[0]; e.hp = e.maxHp = 5000; });
await h.tap('KeyU', 2, 0);
const spear = await h.until(() => { const e = window.__ff.game.scene.getScene('Game').enemies.getChildren()[0]; return e.hp < e.maxHp; }, 60);
const pinned = await G(() => !!window.__ff.game.scene.getScene('Game').enemies.getChildren()[0].statuses?.root);
check('a spear heavy reaches past sword range and pins (CB11, CB24)', spear.ok && pinned, JSON.stringify({ spear, pinned }));
await wait(800);

// ---- CB1: a troll keeps its swing through light sword taps; a heavy still interrupts
await reset('iron_sword'); await add('troll', 20);
await G(() => { const g = window.__ff.game.scene.getScene('Game'), e = g.enemies.getChildren()[0]; e.hp = e.maxHp = 5000; e.alerted = true; e.startWindup({ x: -1, y: 0 }); window.__ff.S.hp = 1000; window.__ff.S.maxHp = 1000; });
for (let i = 0; i < 3; i++) { await h.tap('KeyJ', 2, 0); await wait(120); }
const troll = await G(() => window.__ff.game.scene.getScene('Game').enemies.getChildren()[0].state);
check('a troll mid-wind-up shrugs off three sword taps (CB1)', troll === 'windup' || troll === 'attack' || troll === 'recover', troll);
await reset('iron_sword'); await add('troll', 20);
await G(() => { const g = window.__ff.game.scene.getScene('Game'), e = g.enemies.getChildren()[0]; e.hp = e.maxHp = 5000; e.alerted = true; e.startWindup({ x: -1, y: 0 }); e.stateT = 2; });
await h.tap('KeyU', 2, 0); await wait(500);
const troll2 = await G(() => window.__ff.game.scene.getScene('Game').enemies.getChildren()[0].state);
check('...but a heavy attack still breaks the wind-up (CB1)', troll2 !== 'windup', troll2);
await G(() => { window.__ff.S.maxHp = 100; });

// ---- CB9: a mini-boss is neither assassinated nor executed at 28%
const mini = await G(() => {
  const g = window.__ff.game.scene.getScene('Game'), e = g.addEnemy('dustlord', 330, 250);
  return { named: e.named, armor: e.windupArmor > 0 };
});
check('mini-bosses are named and keep their swing (CB9)', mini.named && mini.armor, JSON.stringify(mini));

// ---- CB12 / CB13: no tell shorter than 0.4 s; a crushing blow shows "!!"
const tells = await G(() => {
  const g = window.__ff.game.scene.getScene('Game');
  const lynx = g.addEnemy('lynx', 360, 250), troll = g.addEnemy('troll', 360, 290);
  troll.alerted = true; troll.startWindup({ x: -1, y: 0 });
  return { lynx: lynx.cfg.windup, trollMark: troll.markStr };
});
check('the quickest regular tell is 0.4 s (CB12)', tells.lynx >= 0.4, JSON.stringify(tells));
check('a crushing wind-up is marked "!!" (CB13)', tells.trollMark === '!!', JSON.stringify(tells));

// ---- CB15: an archer outside the camera does not start its shot
await reset(); await add('archer', 200, 0, { range: 260 });
await G(() => { const e = window.__ff.game.scene.getScene('Game').enemies.getChildren()[0]; e.alerted = true; e.state = 'chase'; e.cd = 0; });
await wait(300);
const offcam = await G(() => { const g = window.__ff.game.scene.getScene('Game'), e = g.enemies.getChildren()[0]; return { st: e.state, on: e.onCamera() }; });
check('an off-screen archer walks in instead of shooting (CB15)', !offcam.on && offcam.st !== 'windup' && offcam.st !== 'attack', JSON.stringify(offcam));

// ---- CB18: a boss mid-swing takes one of the two attack slots
const tok = await G(() => {
  const g = window.__ff.game.scene.getScene('Game');
  g.enemies.getChildren().slice().forEach((e) => e.destroy()); g.enemies.clear();
  const a = g.addEnemy('draugr', 330, 250), b = g.addEnemy('draugr', 270, 250);
  const fakeBoss = g.addEnemy('draugr', 300, 300); fakeBoss.isBoss = true; fakeBoss.engaged = true; fakeBoss.state = 'windup';
  const free = g.takeToken(a);
  a.state = 'windup'; a.cfg = { ...a.cfg, kind: 'melee' };
  const second = g.takeToken(b);
  return { free, second };
});
check('while a boss winds up, only one add may strike (CB18)', tok.free && !tok.second, JSON.stringify(tok));

// ---- CB19: a foe circling into a wall does not reverse every frame
const flips = await G(() => {
  const g = window.__ff.game.scene.getScene('Game'), e = g.enemies.getChildren()[0];
  e.cfg = { ...e.cfg, chase: 40 }; e.strafeDir = 1; let n = 0, last = 1;
  for (let i = 0; i < 30; i++) { e.body.blocked.none = false; g.t += 1 / 60; e.strafe({ x: 1, y: 0 }, 36, 1); if (e.strafeDir !== last) { n++; last = e.strafeDir; } }
  return n;
});
check('a waiting foe against a wall turns at most twice a second (CB19)', flips <= 1, String(flips));

// ---- danger marks at their real size (VX-11 leftover)
const dz = await G(() => {
  const g = window.__ff.game.scene.getScene('Game');
  return import('/src/entities/danger.js').then(({ dangerMark }) => { const [d, r] = dangerMark(g, 300, 300, 30, 0xff0000, 0.3); const out = { dw: d.width, ds: d.scaleX, rw: r.width }; d.destroy(); r.destroy(); return out; });
});
check('a 30 px danger disc is a 61 px texture at scale 1', dz.dw === 61 && dz.ds === 1 && dz.rw === 61, JSON.stringify(dz));

check('no page errors', h.errors.length === 0, h.errors.join(' | '));
await h.close();
process.exit(failCount() ? 1 : 0);
