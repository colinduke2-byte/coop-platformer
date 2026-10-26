// Enemies fight back: now and then a foe turns on a nearby companion (never a boss), enemy shots and ground zones hurt
// companions, a companion at 0 HP is DOWN for a while and gets back up, and the Spirit Wolf fades early.
import { launch, check, failCount } from './harness.mjs';
const h = await launch({ paused: true });
await h.open('scene=game&map=forest&spawn=west');
await h.wait(700);
const G = (fn, a) => h.ev(fn, a);
const fight = await G(async () => {
  const g = window.__ff.game.scene.getScene('Game'), S = window.__ff.S;
  S.flags.introDone = true;
  g.enemies.getChildren().slice().forEach((e) => e.destroy()); g.enemies.clear(); g.pend.length = 0;
  const p = g.player; p.setPosition(10.5 * 16, 10 * 16); p.invuln = 999;
  const en = [];
  for (const [k, dx, dy] of [['bandit', 40, -16], ['bandit', 44, 16], ['wolf', 50, 0], ['bandit', -40, 10]]) { const e = g.addEnemy(k, p.x + dx, p.y + dy); e.alerted = true; e.state = 'chase'; e.hp = e.maxHp = 99999; en.push(e); }
  en[3].isBoss = true;                                    // stands in for a boss: it never turns away from you
  S.follower = true; S.companion = 'pell'; g.spawnFollower(); g.follower.setPosition(p.x - 14, p.y + 2);
  S.flags.houndOwned = true; g.spawnHound(true);
  let onComp = 0, total = 0, bossOff = 0, hurt = 0;
  for (const c of [g.follower, g.hound]) { const o = c.hurt.bind(c); c.hurt = (...a) => { const r = o(...a); if (r) hurt++; return r; }; }
  for (let f = 0; f < 60 * 15; f++) {
    await window.__ffStep.frames(1, 1000 / 60);
    for (const e of en) { total++; if (e.foe && e.foe !== p) onComp++; if (e.isBoss && e.foe) bossOff++; }
  }
  return { share: onComp / total, bossOff, hurt, pell: [g.follower.hp, g.follower.maxHp], hound: [g.hound.hp, g.hound.maxHp] };
});
console.log(`  foes on a companion ${Math.round(fight.share * 100)}% of the time, ${fight.hurt} blows landed on companions`);
check('foes sometimes turn on a companion', fight.share > 0.03, JSON.stringify(fight));
check('...but only a modest share of the time (you stay the main target)', fight.share < 0.45, JSON.stringify(fight));
check('a boss keeps its eyes on you', fight.bossOff === 0, JSON.stringify(fight));
check('foes that turn on a companion really hit it', fight.hurt > 0, JSON.stringify(fight));

// knocked down: lies there, cannot act or be talked to, foes leave it, and it gets back up after about 10 s at half HP
const down = await G(() => {
  const g = window.__ff.game.scene.getScene('Game'), c = g.follower;
  g.enemies.getChildren().forEach((e) => { e.foe = c; e.foeUntil = g.t + 99; });
  c.invuln = 0; c.hp = 1; c.hurt(50, c.x + 10, c.y);
  window.__downAt = { x: c.x, y: c.y };
  return { downed: c.downed, mode: c.mode, label: !!c.downLabel, talk: c.canInteract(), foes: g.enemies.getChildren().filter((e) => e.foe === c).length };
});
check('at 0 HP Pell goes DOWN, shows it, and cannot be talked to', down.downed && down.mode === 'dead' && down.label && !down.talk, JSON.stringify(down));
check('foes stop going after a downed companion', down.foes === 0, JSON.stringify(down));
await G(() => { const g = window.__ff.game.scene.getScene('Game'); g.player.setPosition(g.player.x + 60, g.player.y); });
await h.wait(4000);
const still = await G(() => { const c = window.__ff.game.scene.getScene('Game').follower; return { downed: c.downed, moved: Math.hypot(c.x - window.__downAt.x, c.y - window.__downAt.y), frame: c.frame.name }; });
check('while down Pell lies still (does not follow, fight or stand)', still.downed && still.moved < 3 && still.frame === 'dead0', JSON.stringify(still));
await h.wait(6500);
const up = await G(() => { const c = window.__ff.game.scene.getScene('Game').follower; return { downed: c.downed, hp: c.hp, max: c.maxHp, label: !!c.downLabel }; });
check('after about 10 s Pell gets back up at partial HP (never a permanent death)', !up.downed && up.hp > 0 && up.hp < up.max && !up.label, JSON.stringify(up));

// the Spirit Wolf just fades early
const wolf = await G(() => { const g = window.__ff.game.scene.getScene('Game'); g.summonSpiritWolf(g.player); const w = g.spirit; w.hp = 1; w.invuln = 0; w.hurt(99, w.x + 5, w.y); return { dead: w.dead }; });
check('the Spirit Wolf at 0 HP fades early', wolf.dead, JSON.stringify(wolf));

// danger zones and enemy shots hurt companions too
const zone = await G(async () => {
  const g = window.__ff.game.scene.getScene('Game'), c = g.hound;
  c.invuln = 0; c.hp = c.maxHp;
  g.enemies.getChildren().slice().forEach((e) => e.destroy()); g.enemies.clear();
  c.body.setVelocity(0, 0);
  g.addZone(c.body.center.x, c.body.center.y, 16, 0.15, 20, null);
  await window.__ffStep.frames(15, 1000 / 60);
  const afterZone = c.hp;
  c.invuln = 0;
  const { default: Projectile } = await import('/src/entities/Projectile.js');
  const before = c.hp;
  const pr = new Projectile(g, c.body.center.x - 20, c.body.center.y, 'bolt', 160, 0, { dmg: 10, life: 2 }); g.eshots.add(pr); pr.body.setVelocity(160, 0);
  await window.__ffStep.frames(20, 1000 / 60);
  return { max: c.maxHp, afterZone, before, afterShot: c.hp };
});
check('a ground zone that goes off under a companion hurts it', zone.afterZone < zone.max, JSON.stringify(zone));
check('an enemy shot that meets a companion hurts it', zone.afterShot < zone.before, JSON.stringify(zone));
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'COMPANION AGGRO FAILED' : 'COMPANION AGGRO PASSED');
process.exit(failCount() ? 1 : 0);
