// The refinement pass: regression tests for the bugs it fixed and the small features it added.
//   node test/stage80_refine.mjs
import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=sunscorch&spawn=entry&seed=4242');
await h.sleep(1500);
const G = (fn, a) => h.ev(fn, a);
await G(() => { window.gs = () => window.__ff.game.scene.getScene('Game'); window.__ff.S.flags.introDone = true; });
const tap = async (c) => { await G((k) => window.__ff.keys._press(k), c); await h.sleep(70); await G((k) => window.__ff.keys._release(k), c); await h.sleep(90); };

// ---- a Dune Raider dies without freezing the game, many times (its arrow drop used to crash about one kill in five)
const raid = await G(async () => {
  const g = window.gs(), p = g.player; let n = 0, err = null;
  for (let i = 0; i < 40; i++) {
    const e = g.addEnemy('duneraider', p.x + 60, p.y);
    try { e.takeHit({ dmg: 9999, kx: 1, ky: 0, kb: 0, src: 'sword' }); n++; } catch (x) { err = x.message; break; }
  }
  const pk = g.pickups.filter((x) => x.spec.type === 'arrows').map((x) => x.spec.n);
  return { n, err, arrows: pk.length, bad: pk.filter((v) => !(v >= 2 && v <= 4)).length };
});
check('forty Dune Raiders die cleanly; their arrow drops carry 2-4 arrows', raid.n === 40 && !raid.err && raid.bad === 0, JSON.stringify(raid));

// ---- the cutpurse: no theft through a parry or block; a clean hit steals; the kill returns exactly what was taken
const thief = await G(async () => {
  const g = window.gs(), p = g.player, S = window.__ff.S;
  for (const pk of g.pickups.slice()) pk.collect?.();
  const e = g.addEnemy('cutpurse', p.x + 10, p.y); e.alert(true);
  S.gold = 1000; S.hp = S.maxHp;
  const real = p.hurt.bind(p);
  p.hurt = () => true;                           // a parried or fully blocked hit: "landed" but no health lost
  e.hitDone = false; e.face = { x: -1, y: 0 }; e.attackTick(0.016, p);
  const afterBlock = S.gold;
  p.hurt = real;
  p.iframes = 0; p.invuln = 0; e.hitDone = false; e.attackTick(0.016, p);
  const stolen = 1000 - S.gold, state = e.state;
  const gold0 = S.gold;
  e.takeHit({ dmg: 9999, kx: 1, ky: 0, kb: 0, src: 'sword' });
  const pk = g.pickups.filter((x) => x.spec.type === 'gold' && x.spec.raw).map((x) => x.spec.n);
  for (const x of g.pickups.filter((x) => x.spec.raw)) x.collect();
  return { afterBlock, stolen, state, back: S.gold - gold0, pk };
});
check('a blocked or parried cutpurse steals nothing', thief.afterBlock === 1000, JSON.stringify(thief));
check('a clean hit steals and the thief switches to fleeing', thief.stolen > 0 && thief.state === 'flee', JSON.stringify(thief));
check('killing the thief returns exactly what it took (no gold-find bonus on top)', thief.back === thief.stolen, JSON.stringify(thief));

// ---- a dew sprite heals a wounded wolf, but not a boss, and not while frozen
const heal = await G(async () => {
  const g = window.gs(), p = g.player;
  const sp = g.addEnemy('dewsprite', p.x + 80, p.y); sp.alert(true);
  const w = g.addEnemy('wolf', p.x + 90, p.y); w.hp = w.maxHp * 0.3;
  sp.healT = 0; sp.update(0.016, p); const healedWolf = w.hp > w.maxHp * 0.3;
  w.hp = w.maxHp * 0.3; sp.stun = 1; sp.healT = 0; sp.update(0.016, p); const whileStunned = w.hp > w.maxHp * 0.3;
  w.despawn(); sp.stun = 0;
  const fake = g.addEnemy('wolf', p.x + 90, p.y); fake.isBoss = true; fake.hp = fake.maxHp * 0.3;
  sp.healT = 0; sp.update(0.016, p); const healedBoss = fake.hp > fake.maxHp * 0.3;
  fake.despawn(); sp.despawn();
  return { healedWolf, whileStunned, healedBoss };
});
check('a dew sprite heals a wounded creature', heal.healedWolf, JSON.stringify(heal));
check('it does not heal while stunned, and never heals a boss', !heal.whileStunned && !heal.healedBoss, JSON.stringify(heal));

// ---- Queen Vespera calls hornets at half health
const queen = await G(async () => {
  const g = window.gs(), p = g.player;
  const q = g.addEnemy('hornetqueen', p.x + 70, p.y); q.alert(true);
  const before = g.enemies.getChildren().filter((e) => e.kind === 'hornet').length;
  q.takeHit({ dmg: q.maxHp * 0.6, kx: 1, ky: 0, kb: 0, src: 'sword' });
  const after = g.enemies.getChildren().filter((e) => e.kind === 'hornet').length;
  return { before, after };
});
check('Queen Vespera calls hornets when hurt', queen.after > queen.before, JSON.stringify(queen));

// ---- the Blight Mother's pods drop nothing
const pod = await G(async () => {
  const g = window.gs(), p = g.player, n0 = g.pickups.length;
  for (let i = 0; i < 10; i++) g.addEnemy('blightpod', p.x + 60, p.y).takeHit({ dmg: 9999, kx: 1, ky: 0, kb: 0, src: 'sword' });
  return { dropped: g.pickups.length - n0 };
});
check('Rootbound Pods drop no loot', pod.dropped === 0, JSON.stringify(pod));

// ---- the Long Winter keeps the Sunbreaker's faster strikes into phases 2 and 3
const lw = await G(async () => {
  const { LongWinter } = await import('/src/entities/Guardians.js'), S = window.__ff.S, g = window.gs();
  S.flags.choiceVault = 'sunbreaker';
  const b = new LongWinter(g, g.player.x + 200, g.player.y); const c1 = b.cdMul;
  b.bphase = 2; b.phase2Stats(); const c2 = b.cdMul; b.bphase = 3; b.phase2Stats(); const c3 = b.cdMul;
  b.despawn?.() || b.destroy();
  delete S.flags.choiceVault;
  return { c1, c2, c3 };
});
check('Sunbreaker: the Long Winter strikes 10% faster in every phase', Math.abs(lw.c1 - 0.9) < 1e-6 && Math.abs(lw.c2 - 0.63) < 1e-6 && Math.abs(lw.c3 - 0.45) < 1e-6, JSON.stringify(lw));

// ---- the pack: V twice drops the selected stack at your feet; it is not sucked straight back; equipped items stay
const drop = await G(async () => {
  const S = window.__ff.S, g = window.gs(); const { addItem } = await import('/src/systems/inventory.js');
  for (const pk of g.pickups.slice()) pk.collect?.();
  S.inv = { iron_ingot: 7, rusty_sword: 1 }; S.equip.weapon = 'rusty_sword';
  g.openMenu(0); return true;
});
await h.sleep(500);
const sel = await G(() => { const m = window.__ff.game.scene.getScene('Menu'); const l = m.inventory(); m.cursor = l.indexOf('iron_ingot'); m.dirty = true; return l; });
await tap('KeyV'); const armed = await G(() => window.__ff.S.inv.iron_ingot);
await tap('KeyV');
const dropped = await G(() => ({ inv: window.__ff.S.inv.iron_ingot || 0, pk: window.gs().pickups.filter((x) => x.spec.dropped && x.spec.id === 'iron_ingot').map((x) => x.spec.n) }));
await G(() => { const m = window.__ff.game.scene.getScene('Menu'); m.cursor = m.inventory().indexOf('rusty_sword'); m.dirty = true; });
await tap('KeyV'); await tap('KeyV');
const kept = await G(() => window.__ff.S.inv.rusty_sword || 0);
await tap('Escape'); await h.sleep(300);
await h.sleep(900);
const stillThere = await G(() => window.gs().pickups.some((x) => x.spec.dropped && !x.done));
await G(() => { const p = window.gs().player; p.setPosition(p.x + 120, p.y); });
await h.sleep(400);
await G(() => { const p = window.gs().player, d = window.gs().pickups.find((x) => x.spec.dropped && !x.done); if (d) p.setPosition(d.gx, d.gy - 3); });
await h.sleep(600);
const back = await G(() => window.__ff.S.inv.iron_ingot || 0);
check('V once only asks; V twice drops the whole stack on the ground', armed === 7 && dropped.inv === 0 && dropped.pk[0] === 7, JSON.stringify({ armed, dropped, sel }));
check('an equipped item cannot be dropped', kept === 1);
check('a dropped stack stays put until you walk away, then can be picked up again', stillThere && back === 7, JSON.stringify({ stillThere, back }));

// ---- chain quests: a turn-in marker once the goal is met, and a one-time "quest ready" notice
const chain = await G(async () => {
  const { TARGETS } = await import('/src/data/quests.js'), S = window.__ff.S, { bus } = await import('/src/systems/bus.js');
  await import('/src/data/regions4_story.js');
  const toasts = []; const on = (t) => toasts.push(t); bus.on('toast', on);
  S.quests.burrowers1 = { status: 'active', base: S.kills.sandburrower || 0 };
  const before = TARGETS.burrowers1(S.quests.burrowers1);
  for (let i = 0; i < 5; i++) bus.emit('enemy:killed', 'sandburrower');
  await new Promise((r) => setTimeout(r, 50));
  const after = TARGETS.burrowers1(S.quests.burrowers1);
  bus.off('toast', on);
  return { before, after, ready: toasts.filter((t) => /QUEST READY/.test(t)) };
});
check('a met chain goal points the marker at the giver in Amberwell and says so once', chain.before === null && chain.after?.map === 'amberwell' && chain.ready.length === 1, JSON.stringify(chain));

check('no page errors', h.errors.length === 0, h.errors.slice(0, 5).join('\n'));
await h.close();
console.log(failCount() ? 'REFINE FAILED' : 'REFINE PASSED');
process.exit(failCount() ? 1 : 0);
