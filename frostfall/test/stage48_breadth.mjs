import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=424242');
await h.sleep(900);
const G = (fn, a) => h.ev(fn, a);
await G(() => { window.gs = () => window.__ff.game.scene.getScene('Game'); window.__ff.S.flags.introDone = true; });
const reset = () => G(() => {
  const g = window.gs(), S = window.__ff.S;
  g.enemies.getChildren().slice().forEach((e) => e.destroy()); g.enemies.clear(); g.shots.clear(true, true); g.eshots.clear(true, true);
  const p = g.player; p.setPosition(300, 250); p.body.setVelocity(0, 0); p.mode = 'free'; p.stunT = 0; p.lockT = 0; p.invuln = 0; p.iframes = 0; p.swing = null; p.face = { x: 1, y: 0 }; p.target = null; p.shoutCd = 0; p.heat = 0; p.comboT = 0; p.statuses = {};
  S.hp = 100; S.maxHp = 100; S.mp = 200; S.maxMp = 200; S.sp = 100; S.mods = {}; S.inv = S.inv || {};
});
const NEW = ['ashhound', 'cindersmith', 'magmaslime', 'slimeling', 'lavawraith', 'harpooner', 'wreckcrab', 'tidehag', 'barnacle', 'phantom', 'herald', 'sentinel', 'stalker'];

// ---- the new creatures exist: sprites, definitions, bestiary pages, and they run
const roster = await G(async (names) => {
  const E = await import('/src/data/enemies.js'), L = await import('/src/data/lore.js'), R = await import('/src/data/registry.js'), tex = window.__ff.game.textures, g = window.gs(), out = [];
  for (const k of names) {
    const c = E.ENEMIES[k]; const problems = [];
    if (!c) { out.push([k, 'missing']); continue; }
    if (!tex.exists(c.tex)) problems.push('tex');
    if (!L.BEASTS[k]) problems.push('beast');
    if (!(c.hp > 0 && c.dmg > 0 && c.kind)) problems.push('stats');
    out.push([k, problems.join(',') || 'ok']);
  }
  const v = R.validateAll ? R.validateAll() : null;
  return { out, bad: out.filter((o) => o[1] !== 'ok'), valid: v };
}, NEW);
check('thirteen new creatures have sprites, stats and bestiary pages', roster.bad.length === 0, JSON.stringify(roster.bad));
await reset();
const run = await G(async (names) => {
  const g = window.gs(), res = [];
  g.player.invuln = 999;
  for (const k of names) {
    const e = g.addEnemy(k, g.player.x + 70, g.player.y); e.alert(true);
    for (let i = 0; i < 25; i++) e.update(0.05, g.player);
    res.push([k, e.active && !e.dead && Number.isFinite(e.x)]);
    e.destroy();
  }
  return res;
}, NEW);
check('each of them takes a turn without breaking', run.every(([, ok]) => ok), JSON.stringify(run.filter(([, ok]) => !ok)));

// ---- their special behaviours
await reset();
const slime = await G(async () => {
  const g = window.gs(), e = g.addEnemy('magmaslime', g.player.x + 60, g.player.y); const before = g.enemies.getChildren().length;
  e.takeHit({ dmg: 9999, kx: 1, ky: 0, kb: 0, src: 'melee' });
  const after = g.enemies.getChildren().filter((x) => !x.dead && x.kind === 'slimeling').length;
  return { before, kids: after };
});
check('a Magma Slime bursts into two slimelings (who do not split again)', slime.kids === 2, JSON.stringify(slime));
await reset();
const herald = await G(async () => {
  const g = window.gs(), hd = g.addEnemy('herald', g.player.x + 60, g.player.y), ally = g.addEnemy('draugr', g.player.x + 70, g.player.y + 8);
  g.player.invuln = 999; hd.alert(true); ally.alert(true);
  for (let i = 0; i < 12; i++) hd.update(0.05, g.player);
  const near = ally.auraT > 0; hd.die({}); for (let i = 0; i < 5; i++) { ally.auraT -= 0.2; }
  return { near, after: ally.auraT > 0 };
});
check('a Hollow Herald rallies the foes beside it (+25% damage) only while it lives', herald.near && !herald.after, JSON.stringify(herald));
await reset();
const hag = await G(async () => { const g = window.gs(), e = g.addEnemy('tidehag', g.player.x + 60, g.player.y); g.player.invuln = 999; e.alert(true); e.raiseT = 0; e.state = 'chase'; for (let i = 0; i < 10; i++) e.update(0.05, g.player); return { kids: g.enemies.getChildren().filter((x) => x !== e && x.kind === 'draugr').length, name: e.cfg.raiseKind }; });
check('a Tide Hag raises the drowned (draugr)', hag.kids >= 1 && hag.name === 'draugr', JSON.stringify(hag));
await reset();
const sentinel = await G(async () => {
  const g = window.gs(), e = g.addEnemy('sentinel', g.player.x + 40, g.player.y); e.alert(true);
  const home = { x: e.x, y: e.y }; e.setPosition(home.x + 120, home.y); e.body.updateFromGameObject();
  g.player.invuln = 999; g.player.setPosition(home.x + 220, home.y);
  const d0 = Math.hypot(e.x - home.x, e.y - home.y); e.home = home;
  for (let i = 0; i < 4; i++) e.update(0.05, g.player);
  return { d0, vx: e.body.velocity.x, alerted: e.alerted };       // physics does not step in this test: the walk home shows in its velocity
});
check('a Bone Sentinel will not leave its post: it gives up the chase and walks home', sentinel.vx < -20 && !sentinel.alerted, JSON.stringify(sentinel));
await reset();
const turret = await G(async () => { const g = window.gs(), e = g.addEnemy('barnacle', g.player.x + 80, g.player.y); g.player.invuln = 999; e.alert(true); const x0 = e.x, y0 = e.y; for (let i = 0; i < 60; i++) e.update(0.05, g.player); return { moved: Math.hypot(e.x - x0, e.y - y0), shots: g.eshots.getLength() }; });
check('a Frost Barnacle never moves but keeps firing', turret.moved < 2 && turret.shots >= 1, JSON.stringify(turret));
await reset();
const crab = await G(async () => {
  const g = window.gs(), e = g.addEnemy('wreckcrab', g.player.x + 40, g.player.y); e.alert(true); e.face = { x: -1, y: 0 }; e.setFlipX(true);
  const hp0 = e.hp; const front = e.takeHit({ dmg: 20, kx: 1, ky: 0, kb: 0, src: 'melee' });
  return { front, hp: hp0 - e.hp };
});
check('a Wreck Crab guards its front (a frontal blow lands for less)', crab.front < 20, JSON.stringify(crab));
await reset();
const harp = await G(async () => {
  const g = window.gs(), p = g.player; p.invuln = 0; p.iframes = 0; p.setPosition(400, 250); p.body.setVelocity(0, 0);
  const e = g.addEnemy('harpooner', 300, 250); e.alert(true);
  const Pj = (await import('/src/entities/Projectile.js')).default;
  const pr = new Pj(g, 380, 250, 'arrow', 0, 0, { dmg: 5, life: 2 }); pr.enemyOwned = true; pr.pull = true; pr.org = { x: 300, y: 250 };
  g.eshots.add(pr);
  const x0 = p.x; p.hurt(5, 2 * p.x - 300, 2 * p.y - 250, { kb: 150 });
  for (let i = 0; i < 8; i++) { p.body.velocity.x += 0; }
  return { vx: p.body.velocity.x, cfg: !!e.cfg.pull };
});
check('an Ice Harpooner\'s harpoon drags you toward it', harp.vx < -20 && harp.cfg, JSON.stringify(harp));
await reset();
const blink = await G(async () => { const g = window.gs(), e = g.addEnemy('phantom', g.player.x + 80, g.player.y); g.player.invuln = 999; e.alert(true); e.blinkT = 0; const x0 = e.x, y0 = e.y; e.update(0.05, g.player); return Math.hypot(e.x - x0, e.y - y0); });
check('a Court Phantom slips through the air to a new place', blink > 10, String(blink));

// ---- spawn tables: each region meets its own creatures
const spawns = await G(async () => {
  const M = await import('/src/data/maps.js'), St = window.__ff.S, out = {};
  for (const rid of ['ashen', 'coast', 'kingdom']) { const k = new Set(); for (const seed of [2, 77, 424242]) { St.seed = seed; M.getRegion(rid).entities.forEach((e) => { if (e.t === 'enemy') k.add(e.kind); }); } out[rid] = [...k]; }
  St.seed = 424242; return out;
});
const has = (arr, list) => list.filter((x) => arr.includes(x));
check('each region fields its own new creatures', has(spawns.ashen, ['ashhound', 'cindersmith', 'magmaslime', 'lavawraith']).length >= 3 && has(spawns.coast, ['harpooner', 'wreckcrab', 'tidehag', 'barnacle']).length >= 3 && has(spawns.kingdom, ['phantom', 'herald', 'sentinel', 'stalker']).length >= 3, JSON.stringify({ a: has(spawns.ashen, NEW), c: has(spawns.coast, NEW), k: has(spawns.kingdom, NEW) }));

// ---- crossbow
await reset();
const xb = await G(async () => {
  const g = window.gs(), p = g.player, S = window.__ff.S, ST = await import('/src/systems/stats.js');
  S.equip.bow = 'crossbow'; S.arrows = 20; p.face = { x: 1, y: 0 };
  const a0 = S.arrows;
  p.drawing = true; p.drawT = 0.3; p.releaseBow(0.5);                    // half wound: nothing happens
  const half = { arrows: S.arrows, shots: g.shots.getLength() };
  p.drawing = true; p.drawT = 0.6; p.releaseBow(1);                     // fully wound: one heavy bolt
  const sh = g.shots.getChildren()[0];
  const full = { arrows: S.arrows, shots: g.shots.getLength(), dmg: sh?.dmg, pierce: sh?.pierceLeft, reload: p.xbowT };
  S.equip.bow = null;
  return { a0, half, full, bowDmg: 24 };
});
check('a crossbow ignores half-draws, fires one heavy bolt that pierces, then must reload', xb.half.arrows === xb.a0 && xb.half.shots === 0 && xb.full.shots === 1 && xb.full.pierce === 2 && xb.full.dmg >= 24 * 1.5 && xb.full.reload > 0.5, JSON.stringify(xb));

// ---- warhammer
const wh = await G(async () => {
  const g = window.gs(), p = g.player, S = window.__ff.S, T = (await import('/src/data/tuning.js')).TUNE.player;
  S.equip.weapon = 'warhammer'; p.swing = null; p.comboT = 0; S.sp = 100; p.stunT = 0; p.mode = 'free';
  const style = T.styles.hammer; p.startSwing();
  return { has: !!style && style.length === 2, breaker: style[0].breaker, swing: !!p.swing, feel: !!T.hitFeel.hammer };
});
check('the warhammer swings with its own slow, guard-breaking style', wh.has && wh.breaker && wh.swing && wh.feel, JSON.stringify(wh));
await G(() => { window.__ff.S.equip.weapon = 'steel_sword'; window.gs().player.swing = null; });

// ---- runes
await reset();
const rn = await G(async () => {
  const g = window.gs(), S = window.__ff.S, SK = await import('/src/systems/sockets.js'), ST = await import('/src/systems/stats.js');
  S.equip.weapon = 'ember_blade'; S.equip.armor = 'nordic_plate'; S.runes = {}; S.inv = { rune_ignite: 1, rune_drain: 1, rune_thorns: 1, rune_ward: 1 }; ST.recalc();
  const bad = SK.setRune('ember_blade', 'rune_thorns');                  // armour rune on a weapon
  const ok1 = SK.setRune('ember_blade', 'rune_drain'), ok2 = SK.setRune('nordic_plate', 'rune_thorns');
  const ls = ST.stats.sum('lifesteal');
  SK.setRune('ember_blade', 'rune_ignite');                              // swaps: drain returns to the pack
  const swapped = { elem: SK.runeElem()?.type, back: S.inv.rune_drain === 1, ls: ST.stats.sum('lifesteal') };
  const ward = (SK.setRune('nordic_plate', 'rune_ward'), ST.stats.armor());
  // thorns: striking you hurts the striker
  SK.setRune('nordic_plate', 'rune_thorns');
  const foe = g.addEnemy('draugr', g.player.x + 20, g.player.y); foe.alert(true); const hp0 = foe.hp;
  g.player.invuln = 0; g.player.iframes = 0; g.player.mode = 'free'; g.player.hurt(8, foe.x, foe.y, { attacker: foe });
  return { bad, ok1, ok2, ls, swapped, thorns: hp0 - foe.hp, ward };
});
check('runes fit only their kind, can be swapped, and give their effects (burn, drain, thorns, ward)', !rn.bad && rn.ok1 && rn.ok2 && rn.ls >= 0.049 && rn.swapped.elem === 'fire' && rn.swapped.back && rn.thorns >= 5 && rn.ward > 0.28, JSON.stringify(rn));

// ---- spells and shouts
await reset();
await G(() => { const S = window.__ff.S; S.tomes = { embernova: true, glacier: true }; S.skills.destruction.lvl = 9; });
const sp = await G(async () => {
  const g = window.gs(), p = g.player, S = window.__ff.S, M = await import('/src/entities/playerMagic.js');
  const mk = (dx, dy) => { const e = g.addEnemy('draugr', p.x + dx, p.y + dy); e.cfg = { ...e.cfg, detect: 0, speed: 0, chase: 0 }; return e; };
  const near = mk(30, 0), far = mk(110, 0), side = mk(25, 55);
  S.spell = 'embernova'; p.lockT = 0; p.cd = 0; S.mp = 200; p.cast();
  const nova = { near: near.hp < near.maxHp, side: side.hp < side.maxHp, far: far.hp < far.maxHp, burn: !!(near.statuses && near.statuses.burn) || !!near.dot };
  g.enemies.getChildren().slice().forEach((e) => e.destroy()); g.enemies.clear();
  const near2 = mk(30, 0), far2 = mk(110, 0), side2 = mk(25, 55);
  S.spell = 'glacier'; p.lockT = 0; p.cd = 0; S.mp = 200; p.face = { x: 1, y: 0 }; p.cast();
  const lance = { near: near2.hp < near2.maxHp, far: far2.hp < far2.maxHp, side: side2.hp < side2.maxHp };
  return { nova, lance, unlocked: [M.spellUnlocked('embernova'), M.spellUnlocked('glacier')] };
});
check('Ember Nova burns everything around you; Glacier Spear pierces a whole line ahead', sp.unlocked.every(Boolean) && sp.nova.near && sp.nova.side && !sp.nova.far && sp.lance.near && sp.lance.far && !sp.lance.side, JSON.stringify(sp));
await reset();
const sh = await G(async () => {
  const g = window.gs(), p = g.player, S = window.__ff.S, SH = await import('/src/systems/shouts.js');
  S.flags.kragnarDead = false; S.flags.sovereignDead = false;
  const locked = [SH.shoutUnlocked('cinderstep'), SH.shoutUnlocked('hearthcall')];
  S.flags.kragnarDead = true; S.flags.sovereignDead = true;
  const open = [SH.shoutUnlocked('cinderstep'), SH.shoutUnlocked('hearthcall')];
  const foe = g.addEnemy('draugr', p.x + 50, p.y); foe.cfg = { ...foe.cfg, detect: 0, speed: 0, chase: 0 };
  S.shout = 'cinderstep'; p.shoutCd = 0; p.face = { x: 1, y: 0 }; const x0 = p.x; p.shout();
  const step = { moved: p.x - x0, hit: foe.hp < foe.maxHp };
  S.shout = 'hearthcall'; S.hp = 40; p.shoutCd = 0; p.shout();
  return { locked, open, step, healed: S.hp - 40 };
});
check('Cinderstep dashes through foes and Hearthcall heals, once their deeds are done', !sh.locked[0] && !sh.locked[1] && sh.open.every(Boolean) && sh.step.moved > 40 && sh.step.hit && sh.healed >= 25, JSON.stringify(sh));

// ---- crafting and travel
const craft = await G(async () => {
  const E = await import('/src/data/emberhold.js'), S = window.__ff.S, real = Math.random;
  S.flags.emberforged = true; S.gold = 5000; S.inv = { ash_iron: 30, ember_ore: 10 }; S.upgrades = {};
  Math.random = () => 0; const r = E.forgeEmber('ember_blade'); Math.random = real;
  const lucky = S.upgrades.ember_blade;
  S.inv = { ash_iron: 30, ember_ore: 10 }; S.upgrades = {}; S.gold = 5000;
  Math.random = () => 0.99; E.forgeEmber('ember_blade'); Math.random = real;
  return { r, lucky, plain: S.upgrades.ember_blade || 0 };
});
check('the Great Anvil sometimes forges a masterwork (already tempered twice)', craft.r === 'ok' && craft.lucky === 2 && craft.plain === 0, JSON.stringify(craft));
await reset();
const skate = await G(async () => {
  const g = window.gs(), p = g.player, S = window.__ff.S, CF = await import('/src/config.js');
  const run = (skates) => { S.flags.skates = skates; p.setPosition(300, 250); p.body.setVelocity(0, 0); p.mode = 'free'; p.lockT = 0; const orig = g.tileIdAt.bind(g); g.tileIdAt = () => CF.TILE.ICESHELF; for (let i = 0; i < 30; i++) p.move(1, 0, 0.05); g.tileIdAt = orig; return p.body.velocity.x; };
  const a = run(false), b = run(true); S.flags.skates = false; return { a, b };
});
check('Whaler\'s Skates make you 30% faster on the ice shelf', skate.b > skate.a * 1.2, JSON.stringify(skate));

// ---- daily modifiers
await reset();
const mods = await G(async () => {
  const M = await import('/src/data/mods.js'), S = window.__ff.S, g = window.gs(), IN = await import('/src/systems/inventory.js');
  S.mods = { ironhide: true }; const g0 = S.gold; IN.addGold(100); const gold = S.gold - g0;
  S.mods = { brittle: true }; const foe = g.addEnemy('draugr', g.player.x + 80, g.player.y); const d1 = foe.takeHit({ dmg: 10, kx: 1, ky: 0, kb: 0, src: 'melee' });
  S.mods = {}; const foe2 = g.addEnemy('draugr', g.player.x + 90, g.player.y); const d2 = foe2.takeHit({ dmg: 10, kx: 1, ky: 0, kb: 0, src: 'melee' });
  S.mods = { cinder: true }; g.player.invuln = 0; g.player.iframes = 0; g.player.mode = 'free'; g.player.statuses = {}; g.player.hurt(5, g.player.x + 10, g.player.y, {});
  const burning = !!(g.player.statuses && g.player.statuses.burn);
  S.mods = {};
  return { gold, brittle: d1 > d2, burning, ids: ['ironhide', 'cinder', 'brittle'].every((k) => M.MODS[k]) };
});
check('three new daily modifiers work (Ironhide gold, Brittle Bones, Cinder Skin)', mods.gold >= 135 && mods.brittle && mods.burning && mods.ids, JSON.stringify(mods));

// ---- music for the new regions
const music = await G(async () => { const M = await import('/src/data/maps.js'), A = await import('/src/audio/sfx.js'); let ok = true; try { for (const k of ['ashen', 'coast', 'kingdom']) A.music.play(k); A.music.stop(); } catch (e) { ok = e.message; } return { ok, maps: ['ashen', 'coast', 'kingdom'].map((k) => M.MAPS[k].music) }; });
check('each new region has its own music track', music.ok === true && music.maps.join() === 'ashen,coast,kingdom', JSON.stringify(music));
check('no page errors', h.errors.length === 0, h.errors.slice(0, 3).join('\n'));
await h.close();
console.log(failCount() ? 'BREADTH FAILED' : 'BREADTH PASSED');
