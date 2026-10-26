// Companions (Colin: "why does it keep saying PARRIED while my pet is just attacking?"): a companion's blow never sets off
// the Duellist's parry, never stuns you and never freezes the game (hit-stop); your own third combo blow still is parried.
import { launch, check, failCount } from './harness.mjs';
const h = await launch({ paused: true });
await h.open('scene=game&map=village&spawn=start');
await h.wait(700);
const G = (fn, a) => h.ev(fn, a);
await G(() => {
  const g = window.__ff.game.scene.getScene('Game'), S = window.__ff.S;
  S.flags.introDone = true;
  g.enemies.getChildren().slice().forEach((e) => e.destroy()); g.enemies.clear(); g.pend.length = 0;
  const p = g.player; p.setPosition(300, 250); p.invuln = 99;
  window.__texts = []; const ot = g.fx.text.bind(g.fx); g.fx.text = (x, y, s, ...r) => { window.__texts.push([String(s), r[0]]); return ot(x, y, s, ...r); };
});
// a Duellist knight facing you, you in the middle of a combo (third blow next), and each companion striking it
const res = await G(async () => {
  const g = window.__ff.game.scene.getScene('Game'), S = window.__ff.S, p = g.player;
  const { allyHit } = await import('/src/entities/companionAI.js');
  const e = g.addEnemy('knight', p.x + 16, p.y); e.duellist = true; e.alerted = true; e.hp = e.maxHp = 5000; e.face = { x: -1, y: 0 }; e.stun = 0; e.state = 'chase';
  S.follower = true; S.companion = 'pell'; g.spawnFollower(); g.follower.setPosition(p.x + 30, p.y);
  S.flags.houndOwned = true; g.spawnHound(true); g.summonSpiritWolf(p);
  const out = [];
  for (const c of [g.follower, g.hound, g.spirit]) {
    p.comboN = 2; p.mode = 'free'; p.stunT = 0; e.stun = 0; e.state = 'chase'; e.allyStaggerT = -99; g.hitStopT = 0;
    const d = allyHit(c, e, { dmg: 5, kx: 1, ky: 0, kb: 0, stun: 0.1 });
    out.push({ who: c.kind, d, stunT: p.stunT, mode: p.mode, stop: g.hitStopT });
  }
  // and Ragna's arrow (an ally projectile owned by her)
  p.comboN = 2; e.stun = 0; e.allyStaggerT = -99;
  const { default: Projectile } = await import('/src/entities/Projectile.js');
  const pr = new Projectile(g, e.x - 8, e.y, 'arrow', 200, 0, { dmg: 6, ally: true, owner: g.follower }); g.shots.add(pr); pr.hitEnemy(e);
  out.push({ who: 'arrow', stunT: p.stunT, mode: p.mode, stop: g.hitStopT, by: e.allyHitBy === g.follower });
  // your own third combo blow: still parried (the Duellist works as designed)
  p.comboN = 2; e.stun = 0; e.state = 'chase'; e.face = { x: -1, y: 0 };
  const mine = e.takeHit({ dmg: 5, kx: 1, ky: 0, kb: 0, src: 'melee' });
  out.push({ who: 'player', d: mine, stunT: p.stunT, mode: p.mode });
  return { out, parried: window.__texts.filter((t) => t[0] === 'PARRIED').length, cols: window.__texts.filter((t) => /^\d+$/.test(t[0])).map((t) => t[1]) };
});
const comp = res.out.filter((o) => o.who !== 'player');
check('no companion blow (Pell, hound, Spirit Wolf, Ragna\'s arrow) is parried', comp.every((o) => o.who === 'arrow' || o.d > 0) && res.parried === 1, JSON.stringify(res));
check('a companion blow never stuns you or puts you in a hurt state', comp.every((o) => o.stunT <= 0 && o.mode === 'free'), JSON.stringify(comp));
check('a companion blow gives no hit-stop', comp.every((o) => !(o.stop > 0)), JSON.stringify(comp));
check('the arrow knows its archer', res.out.find((o) => o.who === 'arrow').by, JSON.stringify(res.out));
check('your own third combo blow is still parried by a Duellist', res.out.at(-1).d === 0 && res.out.at(-1).stunT > 0, JSON.stringify(res.out.at(-1)));
check('companion damage numbers have their own colour (not your white)', res.cols.length >= 3 && res.cols.every((c) => c === 8), JSON.stringify(res.cols));

// stagger cooldown: a second companion blow right after a stunning one does not stun again, and does not break a wind-up
const lock = await G(async () => {
  const g = window.__ff.game.scene.getScene('Game'), p = g.player;
  const { allyHit } = await import('/src/entities/companionAI.js');
  const e = g.addEnemy('bandit', p.x - 20, p.y); e.alerted = true; e.hp = e.maxHp = 5000; e.stun = 0; e.allyStaggerT = -99;
  const a = allyHit(g.follower, e, { dmg: 3, kx: -1, ky: 0, kb: 0, stun: 0.3 }); const s1 = e.stun;
  e.stun = 0; e.setState('windup', 0.6);
  allyHit(g.hound, e, { dmg: 3, kx: -1, ky: 0, kb: 0, stun: 0.3 });
  return { a, s1, s2: e.stun, state: e.state };
});
check('companions cannot stun-lock: the second blow inside the cooldown neither stuns nor cancels the wind-up', lock.s1 > 0.2 && lock.s2 === 0 && lock.state === 'windup', JSON.stringify(lock));

// UNFLINCHING: an armoured wind-up keeps going through a companion's light blow, exactly as through yours
const unf = await G(async () => {
  const g = window.__ff.game.scene.getScene('Game'), p = g.player;
  const { allyHit } = await import('/src/entities/companionAI.js');
  const e = g.addEnemy('knight', p.x, p.y - 24); e.alerted = true; e.hp = e.maxHp = 5000; e.windupArmor = 0.3; e.setState('windup', 0.6);
  allyHit(g.follower, e, { dmg: 3, kx: 0, ky: -1, kb: 0, stun: 0.3 });
  return { state: e.state, stun: e.stun };
});
check('a companion blow respects wind-up armour (UNFLINCHING)', unf.state === 'windup' && unf.stun <= 0, JSON.stringify(unf));

// a second Spirit Wolf cast after the first one faded on its own no longer throws
const recast = await G(() => {
  const g = window.__ff.game.scene.getScene('Game');
  try { g.spirit.fade(); g.summonSpiritWolf(g.player); g.spirit.fade(); g.summonSpiritWolf(g.player); return 'ok'; } catch (err) { return String(err); }
});
check('casting the Spirit Wolf again after one faded works', recast === 'ok', recast);
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'COMPANION PARRY FAILED' : 'COMPANION PARRY PASSED');
process.exit(failCount() ? 1 : 0);
