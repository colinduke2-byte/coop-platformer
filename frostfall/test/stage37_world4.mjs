import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=forest&spawn=west&seed=424242');
await h.sleep(900);
const G = (fn, a) => h.ev(fn, a);
await G(() => { window.gs = () => window.__ff.game.scene.getScene('Game'); window.__ff.S.flags.introDone = true; window.__ff.S.weather = 'snow'; window.__ff.S.time = 12 * 60; });
const tp = (x, y) => G(([x, y]) => { const g = window.gs(); g.player.setPosition(x, y); g.player.mode = 'free'; g.player.invuln = 999; g.player.body.setVelocity(0, 0); }, [x, y]);
const clear = () => G(() => { const g = window.gs(); g.enemies.getChildren().forEach((e) => e.destroy()); g.pend.length = 0; });

// ---- the world holds the new content
const w = await G(() => { const g = window.gs(), k = {}; g.built.pois.forEach((p) => { k[p.kind] = (k[p.kind] || 0) + 1; }); const rb = g.built.entities.filter((e) => e.t === 'roamboss').map((e) => e.id); return { k, rb, tracks: g.built.entities.filter((e) => e.t === 'track').length, w: g.built.w, springs: (g.springs || []).length }; });
check('bear dens, hot springs, two roaming bosses and their tracks exist', w.k.beardn >= 2 && w.k.spring >= 2 && w.rb.includes('elk') && w.rb.includes('troll') && w.tracks > 20 && w.w >= 190, JSON.stringify(w));

// ---- bear den: hurting a cub enrages the mother
const den = await G(() => { const g = window.gs(); const p = g.built.pois.find((q) => q.kind === 'beardn'); return { x: p.x, y: p.y, id: p.id }; });
await tp(den.x * 16 + 8, (den.y + 9) * 16);
await h.sleep(1100);
const dn = await G(([id]) => { const g = window.gs(); const m = g.enemies.getChildren().filter((e) => e.spec && e.spec.camp === id); return { mother: m.filter((e) => e.spec.mother).length, cubs: m.filter((e) => e.spec.cub).length }; }, [den.id]);
check('a den has a mother bear and two cubs', dn.mother === 1 && dn.cubs === 2, JSON.stringify(dn));
const rage = await G(([id]) => { const g = window.gs(); const m = g.enemies.getChildren().filter((e) => e.spec && e.spec.camp === id); const cub = m.find((e) => e.spec.cub), mom = m.find((e) => e.spec.mother); const d0 = mom.cfg.dmg; mom.alerted = false; cub.takeHit({ dmg: 1, kx: 1, ky: 0, kb: 0, src: 'melee' }); return { enraged: !!mom.enraged, alert: mom.alerted, d0, d1: mom.cfg.dmg }; }, [den.id]);
check('hurting a cub enrages and alerts the mother', rage.enraged && rage.alert && rage.d1 > rage.d0, JSON.stringify(rage));
const adopt = await G(([id]) => {
  const g = window.gs(), S = window.__ff.S;
  const mom = g.enemies.getChildren().find((e) => e.spec && e.spec.mother && e.spec.camp === id);
  mom.takeHit({ dmg: 99999, kx: 1, ky: 0, kb: 0, src: 'melee' });
  const orphan = g.interactables.find((i) => i.constructor.name === 'OrphanCub');
  const cubsLeft = g.enemies.getChildren().filter((e) => e.spec && e.spec.cub && e.spec.camp === id && !e.dead).length;
  return { orphan: !!orphan, cubsLeft, bounty: !!S.bounty[id] };
}, [den.id]);
await h.sleep(1200);
check('when the mother falls the cubs are orphaned and one can be adopted', adopt.orphan && adopt.cubsLeft === 0, JSON.stringify(adopt));
check('clearing the den pays its bounty', await G(([id]) => !!window.__ff.S.bounty[id], [den.id]));
const pet = await G(async () => {
  const g = window.gs(), S = window.__ff.S;
  S.flags.cubOwned = true; S.pet = 'cub'; S.flags.houndOwned = true; g.spawnHound(true);
  const a = g.hound.kind; S.hp = 50; const hp0 = S.hp; g.hound.update(1, g.player); const healed = S.hp > hp0;
  const sw = g.swapPet(); const b = g.hound.kind; g.swapPet(); const c = g.hound.kind;
  return { a, b, c, sw, healed };
});
check('the cub heals you, and the whistle swaps cub and hound', pet.a === 'cub' && pet.b === 'hound' && pet.c === 'cub' && pet.sw && pet.healed, JSON.stringify(pet));

// ---- roaming bosses: deterministic position, spawn on route, walk, fall
const roam = await G(async () => {
  const g = window.gs(), S = window.__ff.S, R = await import('/src/world/roamers.js');
  const e = g.built.entities.find((x) => x.t === 'roamboss' && x.id === 'elk');
  const a = R.routePos(e.route, 0, e.phase), b = R.routePos(e.route, 100, e.phase), c = R.routePos(e.route, 100, e.phase);
  const q = R.routePos(e.route, 20, e.phase), moved = Math.hypot(a.x - q.x, a.y - q.y) > 100, same = b.x === c.x && b.y === c.y;
  const wrap = R.routePos(e.route, R.loopLength(e.route) / R.ROAM_SPEED, e.phase);
  return { moved, same, closed: Math.hypot(wrap.x - R.routePos(e.route, 0, e.phase).x, wrap.y - R.routePos(e.route, 0, e.phase).y) < 2 };
});
check('a roaming boss route is a closed, deterministic loop', roam.moved && roam.same && roam.closed, JSON.stringify(roam));
await clear();
const spawn = await G(async () => {
  const g = window.gs(), S = window.__ff.S, R = await import('/src/world/roamers.js');
  const p = g.pend.length; g.pend.length = 0; for (const e of g.built.entities.filter((x) => x.t === 'roamboss')) g.spawnEntity(e);
  const item = g.pend.find((q) => q.spec.rid === 'elk'); const pos = R.routePos(item.spec.roamRoute, S.playtime || 0, item.spec.roamPhase);
  g.player.setPosition(pos.x + 100, pos.y); g.player.invuln = 999;
  return { has: !!item, pos };
});
await h.sleep(1200);
const elk = await G(() => { const g = window.gs(); const e = g.enemies.getChildren().find((x) => x.spec && x.spec.rid === 'elk'); return e ? { name: e.displayName, hp: e.maxHp, wb: e.worldBoss } : null; });
check('the Winter Elk streams in near its route with a name', spawn.has && elk && /Frostbrow/.test(elk.name) && elk.hp > 250 && elk.wb, JSON.stringify(elk));
const fall = await G(() => {
  const g = window.gs(), S = window.__ff.S;
  const e = g.enemies.getChildren().find((x) => x.spec && x.spec.rid === 'elk'); const gold0 = S.gold, picks0 = g.pickups.length;
  e.takeHit({ dmg: 99999, kx: 1, ky: 0, kb: 0, src: 'melee' });
  return { flag: !!S.flags.rb_elk, gold: S.gold - gold0, picks: g.pickups.length - picks0 };
});
check('the elk drops a legendary, gold, and stays dead', fall.flag && fall.gold >= 200 && fall.picks >= 1, JSON.stringify(fall));
check('a killed world boss does not return', await G(async () => { const g = window.gs(); g.pend.length = 0; for (const e of g.built.entities.filter((x) => x.t === 'roamboss')) g.spawnEntity(e); return !g.pend.some((q) => q.spec.rid === 'elk') && g.pend.some((q) => q.spec.rid === 'troll'); }));

// ---- hot spring
await clear();
const spr = await G(async () => {
  const g = window.gs(), S = window.__ff.S, m = await import('/src/systems/status.js');
  const sp = g.springs[0]; g.player.setPosition(sp.x, sp.y + 16); g.player.invuln = 0; S.hp = 20; m.applyStatus(g.player, 'bleed', { t: 30, dps: 1 }); m.applyStatus(g.player, 'poison', { t: 30, dps: 1 });
  sp.interact();
  return 1;
});
await h.sleep(5200);
const soaked = await G(() => { const S = window.__ff.S, p = window.gs().player; return { hp: S.hp, max: S.maxHp, bleed: !!(p.statuses && p.statuses.bleed), warm: S.flags.food === 'warmth' }; });
check('soaking in a hot spring heals fully, cures ailments and warms you', soaked.hp >= soaked.max - 1 && !soaked.bleed && soaked.warm, JSON.stringify(soaked));

// ---- ambient life
await G(() => { const g = window.gs(); g.raventT = 0; g.player.setPosition(300, 300); });
await h.sleep(700);
let rv = await G(() => window.gs().ravens.length);
for (let i = 0; i < 6 && !rv; i++) { await G(() => { window.gs().raventT = 0; }); await h.sleep(500); rv = await G(() => window.gs().ravens.length); }
check('ravens perch in the snow by day', rv >= 1, String(rv));
const flee = await G(() => { const g = window.gs(), r = g.ravens[0]; if (!r) return null; g.player.setPosition(r.img.x - 20, r.img.y); return true; });
await h.sleep(500);
check('ravens scatter when you come close', await G(() => window.gs().ravens.some((r) => r.fly) || window.gs().ravens.length === 0));
const prints = await G(async () => { const g = window.gs(), p = g.player; p.body.setVelocity(100, 0); for (let i = 0; i < 20; i++) { g.printT = 0; g.ambientLife(0.05); } return g.prints.length; });
check('walking on snow leaves footprints', prints >= 1, String(prints));

// ---- weather: whiteout and aurora
const wx = await G(async () => {
  const g = window.gs(), S = window.__ff.S, st = (await import('/src/systems/stats.js')).stats; const out = {};
  S.weather = 'snow'; out.snowStealth = g.stealthEnv(); out.snowWind = g.windX(); out.mana0 = st.trait('manaCostMul');
  S.weather = 'whiteout'; g.applyWeather(); out.whiteStealth = g.stealthEnv(); out.whiteWind = g.windX(); out.alpha = g.ambient().alpha;
  S.weather = 'aurora'; g.applyWeather(); out.mana1 = st.trait('manaCostMul'); g.drawAurora(0.5);
  S.weather = 'snow'; g.applyWeather();
  return out;
});
check('a whiteout halves sight, blows arrows sideways and veils the screen', wx.whiteStealth <= 0.5 && wx.whiteWind > wx.snowWind && wx.alpha >= 0.5, JSON.stringify(wx));
check('the aurora makes spells cheaper', wx.mana1 < wx.mana0, JSON.stringify(wx));
const arrow = await G(async () => {
  const g = window.gs(), S = window.__ff.S, P = (await import('/src/entities/Projectile.js')).default;
  S.weather = 'whiteout'; const a = new P(g, 300, 300, 'arrow', 200, 0, { ally: true }); g.shots.add(a); a.body.setVelocity(200, 0);
  for (let i = 0; i < 10; i++) a.update(0.05);
  const vx = a.body.velocity.x; a.finish(); S.weather = 'snow'; return { vx };
});
check('wind pushes arrows in a whiteout', arrow.vx > 200, JSON.stringify(arrow));
const aw = await G(() => { const g = window.gs(); g.enemies.getChildren().forEach((e) => e.destroy()); g.auroraWisps(); return g.enemies.getChildren().filter((e) => e.kind === 'wisp').length; });
check('an aurora brings a pack of spirit wisps', aw >= 2, String(aw));

check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'WORLD4 FAILED' : 'WORLD4 PASSED');
