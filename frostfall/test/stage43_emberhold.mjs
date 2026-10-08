import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=424242');
await h.sleep(900);
const G = (fn, a) => h.ev(fn, a);
await G(() => { window.gs = () => window.__ff.game.scene.getScene('Game'); window.__ff.S.flags.introDone = true; });
const stub = (answers) => G(async (a) => {
  const dlg = await import('/src/systems/dialogue.js'); window.__dlg = dlg.dialogue;
  if (!window.__realHud) window.__realHud = dlg.dialogue.hud;
  window.__answers = [...a]; window.__said = [];
  dlg.dialogue.hud = { say: async (n, t) => { window.__said.push(t); }, choose: async (o) => (window.__answers.length ? window.__answers.shift() : o.length - 1), hideBox() {}, scene: window.__realHud.scene };
}, answers);
const unstub = () => G(() => { window.__dlg.hud = window.__realHud; });
const S = (fn) => G(fn);

// ---- the maps all build; every person has a sprite, a definition and a script
const maps = await G(async () => {
  const M = await import('/src/data/maps.js'), D = await import('/src/data/dialogue.js'), EH = await import('/src/data/emberhold_map.js');
  await import('/src/data/emberhold.js');
  const ids = ['emberhold', ...Object.keys(EH.EMBER_INTERIORS)], npcs = new Set(), problems = [];
  for (const id of ids) {
    const b = M.MAPS[id].build();
    for (const e of b.entities) if (e.t === 'npc') npcs.add(e.id);
    for (const e of b.entities.filter((x) => x.t === 'exit' || x.t === 'door')) if (!M.MAPS[e.to]) problems.push(`${id}->${e.to}`);
  }
  const tex = window.__ff.game.textures;
  for (const n of npcs) { if (!D.NPC_DEFS[n]) problems.push('def ' + n); else if (!tex.exists(D.NPC_DEFS[n].tex)) problems.push('tex ' + n); if (!D.SCRIPTS[n]) problems.push('script ' + n); }
  return { n: npcs.size, problems };
});
check('Emberhold, its 7 halls and the mines all build, and every exit leads somewhere real', maps.problems.length === 0, JSON.stringify(maps));
check('twenty-one named people live in the city', maps.n === 21, String(maps.n));

// ---- everything in the city is reachable on foot from the gate
const reach = await G(async () => {
  const M = await import('/src/data/maps.js'), CF = await import('/src/config.js'), EH = await import('/src/data/emberhold_map.js'), solid = new Set(CF.SOLID_TILES);
  const bfs = (b, sx, sy) => { const seen = new Uint8Array(b.w * b.h), q = [[sx, sy]]; seen[sy * b.w + sx] = 1; for (let i = 0; i < q.length; i++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = q[i][0] + dx, y = q[i][1] + dy; if (x < 0 || y < 0 || x >= b.w || y >= b.h || seen[y * b.w + x] || solid.has(b.grid[y][x])) continue; seen[y * b.w + x] = 1; q.push([x, y]); } return seen; };
  const near = (seen, b, x, y) => { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (seen[(y + dy) * b.w + x + dx]) return true; return false; };
  const out = { city: [], halls: [] }, c = M.MAPS.emberhold.build(), seen = bfs(c, EH.EMBERHOLD.gate.x, EH.EMBERHOLD.gate.y);
  for (const e of c.entities) if (['door', 'exit', 'npc', 'fire'].includes(e.t) && !near(seen, c, e.x, e.y)) out.city.push(`${e.t}:${e.id || e.to || ''}@${e.x},${e.y}`);
  for (const id of Object.keys(EH.EMBER_INTERIORS)) { const b = M.MAPS[id].build(), sp = b.entities.find((e) => e.t === 'spawn' && e.name === 'in'), sn = bfs(b, sp.x, sp.y); for (const e of b.entities) if (['npc', 'exit', 'fire'].includes(e.t) && !near(sn, b, e.x, e.y)) out.halls.push(`${id}:${e.t}:${e.id || ''}`); }
  return out;
});
check('every door, person and fire in the city and its halls can be reached', reach.city.length === 0 && reach.halls.length === 0, JSON.stringify(reach));

// ---- the Deep Mines: three floors, linked, with a boss room, all reachable
const mines = await G(async () => {
  const M = await import('/src/data/maps.js'), CF = await import('/src/config.js'), solid = new Set(CF.SOLID_TILES), S0 = window.__ff.S, out = [];
  for (const seed of [5, 424242, 31337]) {
    S0.seed = seed;
    for (let f = 0; f < 3; f++) {
      const b = M.getMines(f), sp = b.entities.find((e) => e.t === 'spawn' && e.name === 'entry'), seen = new Uint8Array(b.w * b.h), q = [[sp.x, sp.y]]; seen[sp.y * b.w + sp.x] = 1;
      for (let i = 0; i < q.length; i++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = q[i][0] + dx, y = q[i][1] + dy; if (x < 0 || y < 0 || x >= b.w || y >= b.h || seen[y * b.w + x] || solid.has(b.grid[y][x])) continue; seen[y * b.w + x] = 1; q.push([x, y]); }
      const ex = b.entities.filter((e) => e.t === 'exit'), boss = b.entities.find((e) => e.t === 'boss');
      out.push({ seed, f, exits: ex.map((e) => e.to).join(), boss: boss?.kind || null, foes: b.entities.filter((e) => e.t === 'enemy').length + b.entities.filter((e) => e.t === 'ambush').reduce((a, e) => a + e.n, 0), reach: b.entities.filter((e) => ['exit', 'boss'].includes(e.t)).every((e) => { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (seen[(e.y + dy) * b.w + e.x + dx]) return true; return false; }) });
    }
  }
  S0.seed = 424242;
  return out;
});
check('the mines have three linked floors with Kragnar at the bottom', mines.every((m) => m.reach && m.foes >= 3) && mines.filter((m) => m.f === 2).every((m) => m.boss === 'kragnar') && mines.filter((m) => m.f < 2).every((m) => m.boss === null) && mines.find((m) => m.f === 0).exits.includes('emberhold') && mines.find((m) => m.f === 1).exits.includes('mines0') && mines.find((m) => m.f === 1).exits.includes('mines2'), JSON.stringify(mines.slice(0, 3)));

// ---- the road from the Ashen Peaks to the city
const road = await G(async () => { const M = await import('/src/data/maps.js'), b = M.getRegion('ashen'); const city = b.pois.find((p) => p.kind === 'city'); const ex = b.entities.find((e) => e.t === 'exit' && e.to === 'emberhold'); const sp = b.entities.find((e) => e.t === 'spawn' && e.name === 'emberhold'); return { city: !!city, ex: !!ex, sp: !!sp, ids: b.pois.every((p) => p.id.startsWith('ashen_')) }; });
check('the Ashen Peaks has a gate to Emberhold and its places have their own ids', road.city && road.ex && road.sp && road.ids, JSON.stringify(road));

// ---- gems
await G(() => { const S = window.__ff.S; S.equip.weapon = 'ember_blade'; S.equip.armor = 'nordic_plate'; S.inv.gem_ruby = 2; S.inv.gem_emerald = 1; S.inv.gem_topaz = 1; S.sockets = {}; });
const gems = await G(async () => {
  const SK = await import('/src/systems/sockets.js'), ST = await import('/src/systems/stats.js'), S0 = window.__ff.S;
  ST.recalc(); const d0 = ST.stats.weaponDmg(), hp0 = S0.maxHp, cr0 = ST.stats.sum('crit');
  const a = SK.insertGem('ember_blade', 'gem_ruby'), b = SK.insertGem('ember_blade', 'gem_topaz'), c = SK.insertGem('ember_blade', 'gem_ruby');   // 3rd fails (2 sockets)
  const e = SK.insertGem('nordic_plate', 'gem_emerald'); ST.recalc();
  const after = { dmg: ST.stats.weaponDmg(), hp: S0.maxHp, crit: ST.stats.sum('crit') };
  const rm = SK.removeGem('ember_blade', 0); ST.recalc();
  return { a, b, c, e, d0, hp0, cr0, after, rm, back: S0.inv.gem_ruby, dmgAfterRemove: ST.stats.weaponDmg(), sockets: SK.socketCount('ember_blade') };
});
check('gems fit into sockets (two on a sword) and add their bonuses', gems.a && gems.b && !gems.c && gems.e && gems.after.dmg >= gems.d0 + 3 && gems.after.hp === gems.hp0 + 15 && gems.after.crit > gems.cr0 + 0.025 && gems.sockets === 2, JSON.stringify(gems));
check('a gem can be taken back out and its bonus goes with it', gems.rm && gems.back === 2 && gems.dmgAfterRemove < gems.after.dmg, JSON.stringify(gems));

// ---- factions
const fac = await G(async () => {
  const F = await import('/src/data/factions.js'), S0 = window.__ff.S; S0.rep = { anvil: 0, delvers: 0, wardens: 0 };
  F.addRep('anvil', 50, true); const a = { anvil: F.rep('anvil'), delvers: F.rep('delvers'), tier: F.repTier('anvil') };
  F.addRep('delvers', 80, true); const b = { anvil: F.rep('anvil'), delvers: F.rep('delvers'), tier: F.repTier('delvers') };
  F.addRep('wardens', 200, true);
  return { a, b, cap: F.rep('wardens') };
});
check('reputation has tiers, a cap, and helping one house costs a little with its rival', fac.a.anvil === 50 && fac.a.tier === 'TRUSTED' && fac.b.delvers === 80 && fac.b.tier === 'HONOURED' && fac.b.anvil === 30 && fac.cap === 100, JSON.stringify(fac));

// ---- the Emberforge
await G(async () => { const S = window.__ff.S; S.rep = { anvil: 0, delvers: 0, wardens: 0 }; S.flags.emberforged = false; S.gold = 5000; S.inv.ash_iron = 30; S.inv.ember_ore = 10; });
const forge = await G(async () => {
  const E = await import('/src/data/emberhold.js'), F = await import('/src/data/factions.js'), S0 = window.__ff.S, out = {};
  out.locked = E.forgeEmber('ember_blade');
  S0.flags.emberforged = true;
  out.axeNoRep = E.forgeEmber('ember_axe');
  out.blade = E.forgeEmber('ember_blade'); out.bladeHave = !!S0.inv.ember_blade; out.iron = S0.inv.ash_iron; out.gold = S0.gold;
  F.addRep('delvers', 25, true); out.axe = E.forgeEmber('ember_axe');
  S0.gold = 10; out.poor = E.forgeEmber('ember_spear');
  return out;
});
check('the Emberforge needs the core, then the right faction trust, then materials', forge.locked === 'locked' && forge.axeNoRep === 'locked' && forge.blade === 'ok' && forge.bladeHave && forge.iron === 24 && forge.axe === 'ok' && forge.poor === 'locked', JSON.stringify(forge));

// ---- quests: the Silent Mines, A Core for the Anvil, The Ashen Road
await G(async () => { const S = window.__ff.S; S.rep = { anvil: 0, delvers: 0, wardens: 0 }; S.gold = 0; S.inv = {}; S.flags.minesEntered = false; S.flags.kragnarDead = false; });
const D = (name) => G(async (n) => { const d = await import('/src/data/dialogue.js'); await d.SCRIPTS[n](); }, name);
await stub([0]); await D('orrin');
check('Orrin sends you into the mines', await S(() => window.__ff.S.quests.silence.status === 'active'));
await unstub();
await S(() => { const S0 = window.__ff.S; S0.flags.minesEntered = true; S0.flags.kragnarDead = true; });
await stub([]); await D('orrin');
const sil = await S(() => { const s = window.__ff.S; return { q: s.quests.silence.status, rep: Math.round(s.rep.delvers), gold: s.gold, rubies: s.inv.gem_ruby }; });
check('reporting Kragnar\'s fall pays gold, rubies and Delvers reputation', sil.q === 'done' && sil.rep === 25 && sil.gold === 300 && sil.rubies === 2, JSON.stringify(sil));
await unstub();
await stub([0]); await D('brannoch');
check('Brannoch asks for the core', await S(() => window.__ff.S.quests.anvilcore.status === 'active'));
await unstub();
await S(() => { window.__ff.S.inv.kragnar_core = 1; });
await stub([]); await D('brannoch');
const core = await S(() => { const s = window.__ff.S; return { q: s.quests.anvilcore.status, forged: !!s.flags.emberforged, blade: !!s.inv.ember_blade, rep: Math.round(s.rep.anvil), core: s.inv.kragnar_core || 0 }; });
check('the core wakes the Great Anvil and earns Anvil Court trust and a blade', core.q === 'done' && core.forged && core.blade && core.rep === 25 && core.core === 0, JSON.stringify(core));
await unstub();
await stub([0]); await D('hesper');
check('Captain Vael sets you to clear the road', await S(() => window.__ff.S.quests.roadwatch.status === 'active'));
await unstub();
await S(() => { const s = window.__ff.S; s.bounty = { ...s.bounty, ashen_camp0: true, ashen_ruin1: true, ashen_tower2: true, camp0: true }; });
await stub([]); await D('hesper');
const road2 = await S(() => { const s = window.__ff.S; return { q: s.quests.roadwatch.status, rep: Math.round(s.rep.wardens), banner: !!s.inv.ironwatch_banner }; });
check('clearing three Ashen strongholds (not Reach ones) completes the Ashen Road', road2.q === 'done' && road2.rep === 25 && road2.banner, JSON.stringify(road2));
await unstub();

// ---- Kragnar fights like a guardian and drops his core
await G(() => { window.__ff.S.flags.kragnarDead = false; window.__ff.S.inv = {}; });
await S(() => { window.gs().changeMap('mines2', 'entry', 'door'); });
await h.sleep(1800);
await S(() => { const g = window.gs(); g.enemies.getChildren().filter((e) => !e.isBoss).forEach((e) => e.destroy()); const b = g.boss; g.player.invuln = 999; const r = b; g.player.setPosition(b.x, b.y + 90); });
await h.sleep(1500);
const kr = await S(() => { const g = window.gs(), b = g.boss; return { has: !!b, engaged: !!b?.engaged, name: b?.cfg?.name, hp: b?.maxHp }; });
check('walking into the lair wakes Kragnar', kr.has && kr.engaged && kr.name === 'Kragnar', JSON.stringify(kr));
await h.shot('s43_kragnar');
await S(() => { const g = window.gs(), b = g.boss; b.invulnerable = false; b.state = 'chase'; b.takeHit({ dmg: b.hp - b.maxHp * 0.4, kx: 0, ky: 0, kb: 0, src: 'melee' }); });
await h.sleep(2500);
check('Kragnar enters a second phase', await S(() => window.gs().boss.bphase >= 2));
await S(() => { const g = window.gs(); g.enemies.getChildren().filter((e) => !e.isBoss).forEach((e) => e.destroy()); const b = g.boss; b.invulnerable = false; b.takeHit({ dmg: 99999, kx: 0, ky: 0, kb: 0, src: 'melee' }); });
await h.sleep(2500);
const dead = await S(() => ({ flag: !!window.__ff.S.flags.kragnarDead }));
check('defeating Kragnar sets the flag', dead.flag, JSON.stringify(dead));
const stand = await S(() => { const S0 = window.__ff.S; S0.rep = { anvil: 30, delvers: 50, wardens: 5 }; const g = window.gs(); g.openMenu(-1, 'FEATS'); return true; });
await h.sleep(600); await h.shot('s43_standing');

check('no page errors', h.errors.length === 0, h.errors.slice(0, 3).join('\n'));
await h.close();
console.log(failCount() ? 'EMBERHOLD FAILED' : 'EMBERHOLD PASSED');
