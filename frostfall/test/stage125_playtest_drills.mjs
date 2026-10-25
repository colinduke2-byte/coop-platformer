// Playtest pass: Bjorn's drills can be passed the honest way (found by test/playtest.mjs).
//  - drill 1: raise the shield just before the dog's bite lands -> a parry
//  - drill 2: creep up on the sleeping wolf and strike. Before the fix a sneaking approach always woke it about 20 px out,
//    just before the sword could reach, so the drill could not be passed and its hint stayed up for good.
import { launch, check, failCount } from './harness.mjs';
const h = await launch({ paused: true });
await h.open('scene=game&map=village&spawn=start');
await h.frames(40);
const G = (fn, a) => h.ev(fn, a);
await G(() => { const S = window.__ff.S; S.flags.introDone = true; S.flags.tutDone = true; S.flags.tut = 'done'; S.flags.drill = 'parry'; S.inv.wooden_shield = 1; S.equip.offhand = 'wooden_shield'; });
await h.frames(5);

// drill 1: block only in the last 0.15 s of the bite's wind-up
let parried = false;
for (let i = 0; i < 900 && !parried; i++) {
  parried = await G(() => {
    if (window.__ff.S.flags.drill !== 'parry') return true;
    const g = window.__ff.game.scene.getScene('Game'), p = g.player, k = window.__ff.keys, w = g.enemies.getChildren().find((e) => e.drill && !e.dead);
    if (w) { const dd = Math.hypot(w.x - p.x, w.y - p.y), ux = (w.x - p.x) / (dd || 1), uy = (w.y - p.y) / (dd || 1); p.face = { x: Math.abs(ux) > 0.38 ? Math.sign(ux) : 0, y: Math.abs(uy) > 0.38 ? Math.sign(uy) : 0 }; if ((w.state === 'attack' && dd < 24) || (w.state === 'windup' && w.stateT < 0.1 && dd < 12)) k._press('KeyF'); else k._release('KeyF'); }
    return false;
  });
  await h.frames(2);
}
await G(() => window.__ff.keys._release('KeyF'));
check('drill 1: a well-timed block passes the parry drill', await G(() => window.__ff.S.flags.drill === 'sneak'), await G(() => window.__ff.S.flags.drill));

// drill 2: sneak straight at the sleeping wolf and strike from sword reach
const sneak = async (sneaking) => {
  let woke = 0, passed = false;
  for (let i = 0; i < 500 && !passed; i++) {
    const r = await G((sn) => {
      if (window.__ff.S.flags.drill !== 'sneak') return 'passed';
      const g = window.__ff.game.scene.getScene('Game'), p = g.player, k = window.__ff.keys, w = g.enemies.getChildren().find((e) => e.drill && !e.dead);
      if (!w) return 'none';
      const dx = w.x - p.x, dy = w.y - p.y, d = Math.hypot(dx, dy);
      k[sn ? '_press' : '_release']('KeyC');
      k[dx < -6 ? '_press' : '_release']('KeyA'); k[dx > 6 ? '_press' : '_release']('KeyD'); k[dy < -6 ? '_press' : '_release']('KeyW'); k[dy > 6 ? '_press' : '_release']('KeyS');
      if (d < 20) { ['KeyA', 'KeyD', 'KeyW', 'KeyS'].forEach((c) => k._release(c)); p.face = { x: Math.abs(dx) > Math.abs(dy) ? Math.sign(dx) : 0, y: Math.abs(dx) > Math.abs(dy) ? 0 : Math.sign(dy) }; k._press('KeyJ'); }
      return w.alerted ? 'woke' : 'ok';
    }, sneaking);
    if (r === 'passed') passed = true;
    if (r === 'woke') woke++;
    await h.frames(2);
    await G(() => window.__ff.keys._release('KeyJ'));
    await h.frames(2);
    if (woke > 40) break;
  }
  await G(() => ['KeyC', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'KeyJ'].forEach((c) => window.__ff.keys._release(c)));
  return passed;
};
check('drill 2: creeping up on the sleeping wolf and striking passes the sneak drill', await sneak(true), await G(() => window.__ff.S.flags.drill));
const det = await G(() => { const g = window.__ff.game.scene.getScene('Game'); const w = g.enemies.getChildren().find((e) => e.drill && !e.dead); return w ? w.cfg.detect : null; });
check('the next drill (the bow) is up', await G(() => window.__ff.S.flags.drill === 'bow'), String(det));
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'PLAYTEST DRILLS FAILED' : 'PLAYTEST DRILLS PASSED');
process.exit(failCount() ? 1 : 0);
