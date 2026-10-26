// Ragna never shoots through you: while you stand in her line of fire she holds the arrow and steps sideways for a clear
// shot; once the line is clear she shoots again.
import { launch, check, failCount } from './harness.mjs';
const h = await launch({ paused: true });
await h.open('scene=game&map=forest&spawn=west');
await h.wait(700);
const setup = await h.ev(() => {
  const g = window.__ff.game.scene.getScene('Game'), S = window.__ff.S;
  S.flags.introDone = true; S.followMode = 'follow';
  g.enemies.getChildren().slice().forEach((e) => e.destroy()); g.enemies.clear(); g.pend.length = 0;
  const p = g.player; p.setPosition(10.5 * 16, 10 * 16); p.invuln = 999;
  const e = g.addEnemy('bandit', p.x + 50, p.y); e.alerted = true; e.hp = e.maxHp = 99999; e.cfg = { ...e.cfg, chase: 0, speed: 0, range: 0 }; e.cd = 999;
  S.follower = true; S.companion = 'ragna'; g.spawnFollower(); const r = g.follower; r.setPosition(p.x - 30, p.y); r.cd = 0;
  window.__shots = [];
  const add = g.shots.add.bind(g.shots);
  g.shots.add = (pr) => { if (pr.owner === r) window.__shots.push({ inLine: r.inLine(g.player, e), t: g.t }); return add(pr); };
  window.__e = e;
  return { solid: g.solidAt(p.x + 50, p.y) || g.solidAt(p.x - 30, p.y) };
});
// 1) you keep stepping into her line (to the middle of her shot) for three seconds
const held = await h.ev(async () => {
  const g = window.__ff.game.scene.getScene('Game'), r = g.follower, e = window.__e, p = g.player;
  const start = { x: r.x, y: r.y };
  let maxSide = 0;
  for (let f = 0; f < 180; f++) {
    p.setPosition((r.x + e.x) / 2, (r.y + e.y) / 2); p.body.setVelocity(0, 0);
    await window.__ffStep.frames(1, 1000 / 60);
    maxSide = Math.max(maxSide, Math.hypot(r.x - start.x, r.y - start.y));
  }
  return { shots: window.__shots.length, moved: Math.round(maxSide), hold: r.holdT > 0 };
});
check('with you in her line of fire Ragna does not shoot', held.shots === 0, JSON.stringify(held));
check('...and she moves to find a clear shot instead of standing still', held.moved >= 12, JSON.stringify(held));
// 2) you stay where you are: she gets a clear line and shoots, never with you in the line
await h.wait(2500);
const after = await h.ev(() => ({ shots: window.__shots.length, through: window.__shots.filter((s) => s.inLine).length }));
check('once the line is clear she shoots', after.shots >= 1, JSON.stringify(after));
check('she never loosed an arrow with you in the line', after.through === 0, JSON.stringify(after));
check('the test map spot is open ground', !setup.solid, JSON.stringify(setup));
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'RAGNA LINE FAILED' : 'RAGNA LINE PASSED');
process.exit(failCount() ? 1 : 0);
