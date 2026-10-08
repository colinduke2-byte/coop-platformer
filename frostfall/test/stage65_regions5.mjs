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
const SCRIPT = (name) => G(async (n) => { await import('/src/data/regions3_story.js'); const d = await import('/src/data/dialogue.js'); await d.SCRIPTS[n](); }, name);

// ---- the two new regions build on many seeds, are walkable and hold their own places
const gen = await G(async () => {
  const M = await import('/src/data/maps.js'), CF = await import('/src/config.js'), St = window.__ff.S, solid = new Set(CF.SOLID_TILES), WG = await import('/src/world/worldgen.js'), out = [];
  for (const seed of [2, 77, 424242, 31337, 99999]) for (const rid of ['glasswood', 'underdeep']) {
    St.seed = seed; const t0 = performance.now(), b = M.getRegion(rid), ms = Math.round(performance.now() - t0), st = WG.REGION_DEFS[rid].start;
    const seen = new Uint8Array(b.w * b.h), q = [[st.x, st.y]]; seen[st.y * b.w + st.x] = 1;
    for (let i = 0; i < q.length; i++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = q[i][0] + dx, y = q[i][1] + dy; if (x < 0 || y < 0 || x >= b.w || y >= b.h || seen[y * b.w + x] || solid.has(b.grid[y][x])) continue; seen[y * b.w + x] = 1; q.push([x, y]); }
    const near = (p) => { for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (seen[(p.y + dy) * b.w + p.x + dx]) return true; return false; };
    const k = {}; b.pois.forEach((p) => { k[p.kind] = (k[p.kind] || 0) + 1; });
    out.push({ seed, rid, ms, k, stranded: b.pois.filter((p) => !near(p)).map((p) => p.id), roam: b.entities.filter((e) => e.t === 'roamboss').length, exit: b.entities.find((e) => e.t === 'exit' && e.x === 3)?.spawn });
  }
  St.seed = 424242; return out;
});
check('both regions build on every seed in time with a road home', gen.every((r) => r.ms < 1800 && r.exit), JSON.stringify(gen.map((r) => [r.rid, r.ms, r.exit])));
check('every place can be walked to', gen.every((r) => r.stranded.length === 0), JSON.stringify(gen.filter((r) => r.stranded.length)));
const need = { glasswood: { lanternglade: 1, hartspire: 1, crystalgrove: 2, glimmerpool: 2, antlerstone: 2, cave: 2, camp: 2, rest: 6 }, underdeep: { lanternfall: 1, lodenest: 1, glowcapgrove: 2, weavernest: 2, lodevein: 2, cave: 2, camp: 2, rest: 6 } };
const lacking = gen.flatMap((r) => Object.entries(need[r.rid]).filter(([kind, n]) => (r.k[kind] || 0) < n).map(([kind, n]) => `${r.seed}/${r.rid}/${kind}<${n}`));
check('each region holds its hub, its boss dungeon and its own three kinds of place', lacking.length === 0, JSON.stringify(lacking.slice(0, 8)));
check('each region has a roaming world boss', gen.every((r) => r.roam >= 1), JSON.stringify(gen.map((r) => [r.rid, r.roam])));

// ---- the gates: the Reach to the Glasswood, the Ashen Peaks to the Underdeep, the Coast to Saltmarket and the Cove
const gates = await G(async () => {
  const M = await import('/src/data/maps.js'), St = window.__ff.S, R = await import('/src/data/regions.js');
  const out = {};
  for (const seed of [424242, 7]) {
    St.seed = seed;
    const reach = M.getReach(), ashen = M.getRegion('ashen'), coast = M.getRegion('coast'), glass = M.getRegion('glasswood'), deep = M.getRegion('underdeep');
    const ex = (b, to) => b.entities.find((e) => e.t === 'exit' && e.to === to), sp = (b, n) => b.entities.some((e) => e.t === 'spawn' && e.name === n);
    out[seed] = {
      glass: !!ex(reach, 'glasswood') && sp(reach, 'glassroad') && glass.entities.find((e) => e.t === 'exit' && e.x === 3)?.spawn === 'glassroad',
      deep: !!ex(ashen, 'underdeep') && sp(ashen, 'deepdoor') && deep.entities.find((e) => e.t === 'exit' && e.x === 3)?.spawn === 'deepdoor',
      salt: !!ex(coast, 'saltmarket') && sp(coast, 'saltgate'), cove: !!ex(coast, 'smugglercove') && sp(coast, 'smugglercove'),
      glassOpen: ex(reach, 'glasswood')?.needs ?? null,
      hubs: [!!ex(glass, 'lanternglade') && sp(glass, 'lanternglade'), !!ex(deep, 'lanternfall') && sp(deep, 'lanternfall'), !!ex(glass, 'hartspire'), !!ex(deep, 'lodenest')],
    };
  }
  St.seed = 424242;
  out.open = R.unlockedRegions().join();
  return out;
});
check('the Glasswood road, the Deep Stair, Saltmarket and the Cove all exist with matching spawns on every seed', [424242, 7].every((s) => gates[s].glass && gates[s].deep && gates[s].salt && gates[s].cove && gates[s].hubs.every(Boolean)), JSON.stringify(gates));
check('the Glasswood is open from the start', gates[424242].glassOpen == null && gates.open.includes('glasswood'), gates.open);

// ---- hubs, people and delves
const hubs = await G(async () => {
  const M = await import('/src/data/maps.js'), D = await import('/src/data/dialogue.js'), CF = await import('/src/config.js'), solid = new Set(CF.SOLID_TILES), out = {};
  await import('/src/data/regions3_story.js');
  for (const id of ['lanternglade', 'lanternfall', 'saltmarket']) {
    const b = M.MAPS[id].build(), npcs = b.entities.filter((e) => e.t === 'npc');
    out[id] = { n: npcs.length, missing: npcs.filter((e) => !D.NPC_DEFS[e.id] || !D.SCRIPTS[e.id]).map((e) => e.id), fire: b.entities.some((e) => e.t === 'fire' && e.rest), exit: b.entities.find((e) => e.t === 'exit')?.to, spawn: b.entities.some((e) => e.t === 'spawn' && e.name === 'entry'),
      stuck: b.entities.filter((e) => ['npc', 'pot', 'sign', 'prop', 'lore'].includes(e.t) && solid.has(b.grid[e.y][e.x])).map((e) => e.id || e.t) };
  }
  const hs = M.getHartSpire(), ln = M.getLodeNest(), sc = M.getSmugglerCove();
  const info = (d, to) => ({ boss: d.entities.find((e) => e.t === 'boss')?.kind, exit: d.entities.find((e) => e.t === 'exit')?.to, room: !!d.bossRoom, foes: d.entities.filter((e) => e.t === 'enemy').length, to });
  out.hs = info(hs, 'glasswood'); out.ln = info(ln, 'underdeep'); out.sc = info(sc, 'coast');
  const caves = [];
  for (const rid of ['glasswood', 'underdeep']) for (const p of M.getRegion(rid).pois.filter((q) => q.kind === 'cave')) { const d = M.MAPS[p.id]?.build(); caves.push({ id: p.id, ok: !!d, foes: d?.entities.filter((e) => e.t === 'enemy').length, back: d?.entities.find((e) => e.t === 'exit')?.to === rid }); }
  out.caves = caves;
  return out;
});
check('the three hubs have named people with scripts, a fire, a way out and nobody standing in a wall', ['lanternglade', 'lanternfall', 'saltmarket'].every((id) => hubs[id].n >= 10 && !hubs[id].missing.length && hubs[id].fire && hubs[id].spawn && !hubs[id].stuck.length) && hubs.lanternglade.exit === 'glasswood' && hubs.lanternfall.exit === 'underdeep' && hubs.saltmarket.exit === 'coast', JSON.stringify(hubs));
check('the Hart Spire, Lode Chasm and Seaweed Cove each end in their own boss', hubs.hs.boss === 'hartking' && hubs.ln.boss === 'lodecolossus' && hubs.sc.boss === 'brinegut' && [hubs.hs, hubs.ln, hubs.sc].every((d) => d.room && d.foes >= 8 && d.exit === d.to), JSON.stringify([hubs.hs, hubs.ln, hubs.sc]));
check('every cave in the two regions builds, has foes and leads home', hubs.caves.length >= 4 && hubs.caves.every((c) => c.ok && c.foes >= 3 && c.back), JSON.stringify(hubs.caves));

// ---- the bosses
const boss = async (map, kind, flag) => {
  await G((f) => { window.__ff.S.flags[f] = false; }, flag);
  await G((m) => { window.gs().changeMap(m, 'entry', 'door'); }, map);
  await h.sleep(2000);
  await G(() => { const g = window.gs(); g.enemies.getChildren().filter((e) => !e.isBoss).forEach((e) => e.destroy()); g.player.invuln = 999; g.player.setPosition(g.boss.x, g.boss.y + 90); });
  await h.sleep(1500);
  const a = await G(() => { const b = window.gs().boss; return { has: !!b, engaged: !!b?.engaged, name: b?.cfg?.name, hp: b?.maxHp }; });
  await G(() => { const b = window.gs().boss; b.invulnerable = false; b.state = 'chase'; b.takeHit({ dmg: b.hp - b.maxHp * 0.3, kx: 0, ky: 0, kb: 0, src: 'melee' }); });
  await h.sleep(2200);
  const ph = await G(() => window.gs().boss.bphase);
  await G(() => { const g = window.gs(); g.enemies.getChildren().filter((e) => !e.isBoss).forEach((e) => e.destroy()); const b = g.boss; b.invulnerable = false; b.takeHit({ dmg: 999999, kx: 0, ky: 0, kb: 0, src: 'melee' }); });
  await h.sleep(2200);
  return { ...a, ph, dead: await G((f) => !!window.__ff.S.flags[f], flag) };
};
const hk = await boss('hartspire', 'hartking', 'hartKingDead');
check('the Hartking wakes, changes phase and falls', hk.has && hk.engaged && hk.name === 'The Hartking' && hk.ph >= 2 && hk.dead, JSON.stringify(hk));
const lc = await boss('lodenest', 'lodecolossus', 'lodeColossusDead');
check('the Lode Colossus wakes, changes phase and falls', lc.has && lc.engaged && lc.name === 'The Lode Colossus' && lc.ph >= 2 && lc.dead, JSON.stringify(lc));
const bg = await boss('smugglercove', 'brinegut', 'brinegutDead');
check('Captain Brinegut wakes, changes phase and falls', bg.has && bg.engaged && bg.name === 'Captain Brinegut' && bg.ph >= 2 && bg.dead, JSON.stringify(bg));

// ---- the key puzzle: the deepest hall is barred until you find the key in the first hall
await G((m) => { window.gs().changeMap(m, 'entry', 'door'); }, 'hartspire');
await h.sleep(2000);
const kp = await G(async () => {
  const g = window.gs(), S = window.__ff.S, M = await import('/src/data/maps.js'), d = M.getHartSpire(), out = {};
  const kg = d.entities.find((e) => e.t === 'keygate'), ch = d.entities.find((e) => e.t === 'chest' && e.loot.some((l) => l.item === 'delve_key'));
  out.placed = !!kg && !!ch;
  S.flags[kg.id] = false; g.changeMap('hartspire', 'entry', 'door');
  return { out, id: kg.id, x: kg.x, y: kg.y, w: kg.w };
});
await h.sleep(2000);
const kp2 = await G((k) => {
  const g = window.gs(), S = window.__ff.S, out = {};
  const gate = g.interactables.find((i) => i.e && i.e.id === k.id);
  out.exists = !!gate; out.closed = g.solid[k.y][k.x] === true && g.solid[k.y][k.x + 1] === true;
  delete S.inv.delve_key; gate.interact(); out.stays = g.solid[k.y][k.x] === true && !S.flags[k.id];
  S.inv.delve_key = 1; gate.interact(); out.opens = g.solid[k.y][k.x] === false && !!S.flags[k.id] && !S.inv.delve_key;
  return out;
}, kp);
check('the Hart Spire gate is barred until the key from the first hall opens it', kp.out.placed && kp2.exists && kp2.closed && kp2.stays && kp2.opens, JSON.stringify([kp, kp2]));

// ---- creatures
const mk = await G(async () => {
  const g = window.gs(), out = {};
  window.__ff.S.flags.introDone = true;
  await new Promise((r) => setTimeout(r, 300));
  for (const k of ['glimmerkin', 'crystalgolem', 'glassstag', 'caveweaver', 'lodeling', 'deepdelver', 'gloomcap']) { const e = g.addEnemy(k, g.player.x + 60, g.player.y + 20, { tier: 1 }); out[k] = !!e && e.maxHp > 10; }
  return out;
});
check('all the new creatures can be spawned', Object.values(mk).every(Boolean), JSON.stringify(mk));

// ---- quests
await G(() => { const St = window.__ff.S; for (const q of ['hartking', 'glimmers', 'bloom', 'moonlit', 'lodecolossus', 'weavers', 'glowcaps', 'brinegut', 'pearls', 'channel', 'saltrun']) St.quests[q].status = 'inactive'; St.flags.hartKingDead = false; St.flags.lodeColossusDead = false; St.flags.brinegutDead = false; St.gold = 0; });
const pair = async (npc, qid, prep, check1) => {
  await stub([0]); await SCRIPT(npc); await unstub();
  const started = await G((q) => window.__ff.S.quests[q].status === 'active', qid);
  await G(prep); await stub([]); await SCRIPT(npc); await unstub();
  return { started, done: await G((q) => window.__ff.S.quests[q].status === 'done', qid) };
};
let r = await pair('glade_warden', 'hartking', () => { window.__ff.S.flags.hartKingDead = true; });
const wq = await G(() => { const s = window.__ff.S; return { mail: !!s.inv.prism_mail, blade: !!s.inv.shardblade, gold: s.gold }; });
check('Ysolt sends you to the Hart Spire and pays Prism Mail, the Shardblade and gold', r.started && r.done && wq.mail && wq.blade && wq.gold >= 660, JSON.stringify([r, wq]));
r = await pair('glade_hunter', 'glimmers', () => { window.__ff.S.kills.glimmerkin = (window.__ff.S.kills.glimmerkin || 0) + 8; });
check('Kestrel pays for eight glimmerkin', r.started && r.done, JSON.stringify(r));
r = await pair('glade_herbalist', 'bloom', () => { window.__ff.S.inv.glass_bloom = 5; });
check('Orrel trades a draught for five glass bloom', r.started && r.done && !(await G(() => window.__ff.S.inv.glass_bloom)), JSON.stringify(r));
// the Moon-Reader only speaks at night
await G(() => { window.__ff.S.time = 12 * 60; });
await stub([0]); await SCRIPT('glade_sage'); await unstub();
const dayQ = await G(() => window.__ff.S.quests.moonlit.status);
await G(() => { window.__ff.S.time = 23 * 60; });
r = await pair('glade_sage', 'moonlit', () => { window.__ff.S.inv.moonpetal = 3; });
check('the Moon-Reader gives her quest only after dark', dayQ === 'inactive' && r.started && r.done, JSON.stringify([dayQ, r]));
r = await pair('fall_foreman', 'lodecolossus', () => { window.__ff.S.flags.lodeColossusDead = true; });
const dq = await G(() => { const s = window.__ff.S; return { plate: !!s.inv.deep_plate, pick: !!s.inv.lode_pick, lamp: !!(s.inv.deep_lamp || s.equip.charm === 'deep_lamp') }; });
check('Dagna pays Deepforged Plate, the Lode Pick and a lamp for the Colossus', r.started && r.done && dq.plate && dq.pick && dq.lamp, JSON.stringify([r, dq]));
r = await pair('fall_scout', 'weavers', () => { window.__ff.S.kills.caveweaver = (window.__ff.S.kills.caveweaver || 0) + 8; });
check('Tallow pays for eight cave weavers', r.started && r.done, JSON.stringify(r));
r = await pair('fall_fungalist', 'glowcaps', () => { window.__ff.S.inv.glowcap = 5; });
check('Cap trades for five glowcaps', r.started && r.done, JSON.stringify(r));
r = await pair('salt_harbourmaster', 'brinegut', () => { window.__ff.S.flags.brinegutDead = true; });
const rep0 = await G(async () => (await import('/src/data/factions.js')).rep('tide'));
check('Vess pays the Tide Blade and Coat and raises Guild standing for closing the Cove', r.started && r.done && rep0 >= 30, JSON.stringify([r, rep0]));
r = await pair('salt_sailor', 'pearls', () => { window.__ff.S.inv.pearl = 4; });
check('Bryn trades smoked pike for four pearls', r.started && r.done, JSON.stringify(r));
await stub([0]); await SCRIPT('salt_guildmaster'); await unstub();
await G(() => { window.__ff.S.kills.harpooner = (window.__ff.S.kills.harpooner || 0) + 6; });
await stub([]); await SCRIPT('salt_guildmaster'); await unstub();
check('Anneke pays for six harpooners', await G(() => window.__ff.S.quests.channel.status === 'done'));
// the Smugglers are the Guild's rivals: helping them costs standing with the Guild
const before = await G(async () => (await import('/src/data/factions.js')).rep('tide'));
await stub([0]); await SCRIPT('salt_smuggler'); await unstub();
await G(() => { window.__ff.S.inv.salt_crystal = 4; });
await stub([]); await SCRIPT('salt_smuggler'); await unstub();
const after = await G(async () => { const F = await import('/src/data/factions.js'); return { tide: F.rep('tide'), sm: F.rep('smugglers'), q: window.__ff.S.quests.saltrun.status }; });
check('the Smugglers pay for salt crystals, and the Guild notices', after.q === 'done' && after.sm >= 20 && after.tide < before, JSON.stringify([before, after]));
// guild ranks and armoury
const rank = await G(async () => {
  const S = window.__ff.S, F = await import('/src/data/factions.js'), R = await import('/src/data/regions3_story.js'), E = await import('/src/data/emberhold.js'), dlg = await import('/src/systems/dialogue.js');
  const real = dlg.dialogue.hud; dlg.dialogue.hud = { say: async () => {}, choose: async () => 0, hideBox() {}, scene: real.scene };
  S.rep.tide = 50; S.gold = 2000; S.flags.rankGifts = {};
  const g0 = S.gold; await R.guildRankMenu('Anneke', 'tide');
  const gifted = S.gold > g0 && !!(S.inv.tide_charm || S.equip.charm === 'tide_charm');
  const again = S.gold; await R.guildRankMenu('Anneke', 'tide'); const once = S.gold === again;
  const lock = E.buyArmoury('tide_charm') === 'locked'; const buy = E.buyArmoury('tide_coat') === 'ok';
  dlg.dialogue.hud = real; return { gifted, once, lock, buy };
});
check('Guild ranks hand out one gift per standing, and the armoury is gated by standing', Object.values(rank).every(Boolean), JSON.stringify(rank));
// the rest talk without errors
for (const n of ['glade_trader', 'glade_smith', 'glade_child', 'glade_watch', 'fall_trader', 'fall_smith', 'fall_child', 'fall_watch', 'salt_trader', 'salt_smith', 'salt_tailor', 'salt_child', 'salt_watch', 'salt_bard']) { await stub([]); await SCRIPT(n); await unstub(); }
check('every villager has something to say', true);

// ---- the ferry runs from Lanternfall up to the Ashen Peaks
await h.sleep(300);
await G(() => { window.gs().changeMap('lanternfall', 'entry', 'door'); });
await h.sleep(2200);
const fy = await G(async () => { const g = window.gs(); return { map: g.mapId, npcs: g.npcs.length, ferry: g.npcs.some((n) => n.id === 'fall_ferry'), crit: (g.critters || []).length >= 0 }; });
check('Lanternfall loads with its ferryman', fy.map === 'lanternfall' && fy.ferry, JSON.stringify(fy));
await stub([1]); await SCRIPT('fall_ferry'); await unstub();
await h.sleep(2200);
check('the ferry carries you up to the Ashen Peaks', await G(() => window.gs().mapId === 'ashen'));

// ---- new tiles draw and the gear sets
const misc = await G(async () => {
  const CF = await import('/src/config.js'), Se = await import('/src/systems/sets.js'), { ITEMS } = await import('/src/data/items.js'), out = {};
  out.tiles = CF.TILE_COUNT === 55 && ['GLASSMOSS', 'CRYSTAL', 'GLADEPATH', 'DEEPSTONE', 'GLOWCAP', 'CAVERNPOOL'].every((k) => CF.TILE[k] < CF.TILE_COUNT);
  out.solid = [CF.TILE.CRYSTAL, CF.TILE.GLOWCAP, CF.TILE.CAVERNPOOL].every((t) => CF.SOLID_TILES.includes(t));
  out.sets = Object.values(Se.SETS).every((s) => s.items.every((i) => ITEMS[i]));
  return out;
});
check('new tiles are registered and every set piece exists', Object.values(misc).every(Boolean), JSON.stringify(misc));
await h.shot('s65_underdeep');
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'REGIONS5 FAILED' : 'REGIONS5 PASSED');
process.exit(failCount() ? 1 : 0);
