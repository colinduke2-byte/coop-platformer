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
const SCRIPT = (name) => G(async (n) => { await import('/src/data/regions2_story.js'); const d = await import('/src/data/dialogue.js'); await d.SCRIPTS[n](); }, name);

// ---- both regions build on many seeds, are walkable and hold their own places
const gen = await G(async () => {
  const M = await import('/src/data/maps.js'), CF = await import('/src/config.js'), St = window.__ff.S, solid = new Set(CF.SOLID_TILES), WG = await import('/src/world/worldgen.js'), out = [];
  for (const seed of [2, 77, 424242, 31337, 99999]) for (const rid of ['fens', 'highlands']) {
    St.seed = seed; const t0 = performance.now(), b = M.getRegion(rid), ms = Math.round(performance.now() - t0), st = WG.REGION_DEFS[rid].start;
    const seen = new Uint8Array(b.w * b.h), q = [[st.x, st.y]]; seen[st.y * b.w + st.x] = 1;
    for (let i = 0; i < q.length; i++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = q[i][0] + dx, y = q[i][1] + dy; if (x < 0 || y < 0 || x >= b.w || y >= b.h || seen[y * b.w + x] || solid.has(b.grid[y][x])) continue; seen[y * b.w + x] = 1; q.push([x, y]); }
    const near = (p) => { for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (seen[(p.y + dy) * b.w + p.x + dx]) return true; return false; };
    const k = {}; b.pois.forEach((p) => { k[p.kind] = (k[p.kind] || 0) + 1; });
    out.push({ seed, rid, ms, k, stranded: b.pois.filter((p) => !near(p)).map((p) => p.id), roam: b.entities.filter((e) => e.t === 'roamboss').length, exit: b.entities.find((e) => e.t === 'exit' && e.x === 3)?.spawn });
  }
  St.seed = 424242; return out;
});
check('both regions build on every seed in time with a road home', gen.every((r) => r.ms < 1500 && r.exit), JSON.stringify(gen.map((r) => [r.rid, r.ms, r.exit])));
check('every place can be walked to', gen.every((r) => r.stranded.length === 0), JSON.stringify(gen.filter((r) => r.stranded.length)));
const need = { fens: { reedwick: 1, mirebarrow: 1, peatfire: 3, hagshut: 2, drownedshrine: 2, cave: 2, camp: 2, rest: 6 }, highlands: { skarnhold: 1, stormspire: 1, hearthcamp: 2, giantcairn: 2, stormcircle: 2, cave: 2, camp: 3, rest: 6 } };
const lacking = gen.flatMap((r) => Object.entries(need[r.rid]).filter(([kind, n]) => (r.k[kind] || 0) < n).map(([kind, n]) => `${r.seed}/${r.rid}/${kind}<${n}`));
check('each region holds its hub, its boss dungeon and its own three kinds of place', lacking.length === 0, JSON.stringify(lacking.slice(0, 8)));
check('each region has a roaming world boss', gen.every((r) => r.roam >= 1), JSON.stringify(gen.map((r) => [r.rid, r.roam])));

// ---- the gates in the Reach
const gates = await G(async () => {
  const M = await import('/src/data/maps.js'), St = window.__ff.S, R = await import('/src/data/regions.js');
  St.seed = 424242; const reach = M.getReach(), fens = M.getRegion('fens'), high = M.getRegion('highlands');
  const fe = reach.entities.find((e) => e.t === 'exit' && e.to === 'fens'), he = reach.entities.find((e) => e.t === 'exit' && e.to === 'highlands');
  return { fe: fe?.needs ?? null, he: he?.needs ?? null, feSp: reach.entities.some((e) => e.t === 'spawn' && e.name === 'fenroad'), heSp: reach.entities.some((e) => e.t === 'spawn' && e.name === 'stormroad'),
    back: [fens.entities.find((e) => e.x === 3 && e.t === 'exit')?.spawn, high.entities.find((e) => e.x === 3 && e.t === 'exit')?.spawn], open: R.unlockedRegions().join(), fx: !!fe, hx: !!he,
    hubs: [fens.entities.find((e) => e.t === 'exit' && e.to === 'reedwick')?.spawn, high.entities.find((e) => e.t === 'exit' && e.to === 'skarnhold')?.spawn], hubSp: [fens.entities.some((e) => e.t === 'spawn' && e.name === 'reedwick'), high.entities.some((e) => e.t === 'spawn' && e.name === 'skarnhold')] };
});
check('both roads leave the Reach, open from the start, with matching spawns', gates.fx && gates.hx && gates.fe == null && gates.he == null && gates.feSp && gates.heSp && gates.back[0] === 'fenroad' && gates.back[1] === 'stormroad' && gates.open.includes('fens') && gates.open.includes('highlands'), JSON.stringify(gates));
check('the hubs have matching spawns', gates.hubs.every(Boolean) && gates.hubSp.every(Boolean), JSON.stringify(gates));

// ---- hubs, people and delves
const hubs = await G(async () => {
  const M = await import('/src/data/maps.js'), D = await import('/src/data/dialogue.js'), out = {};
  await import('/src/data/regions2_story.js');
  for (const id of ['reedwick', 'skarnhold']) {
    const b = M.MAPS[id].build(), npcs = b.entities.filter((e) => e.t === 'npc');
    out[id] = { n: npcs.length, missing: npcs.filter((e) => !D.NPC_DEFS[e.id] || !D.SCRIPTS[e.id]).map((e) => e.id), fire: b.entities.some((e) => e.t === 'fire' && e.rest), exit: b.entities.find((e) => e.t === 'exit')?.to, spawn: b.entities.some((e) => e.t === 'spawn' && e.name === 'entry') };
  }
  const mb = M.getMireBarrow(), ss = M.getStormspire();
  out.mb = { boss: mb.entities.find((e) => e.t === 'boss')?.kind, exit: mb.entities.find((e) => e.t === 'exit')?.to, room: !!mb.bossRoom, foes: mb.entities.filter((e) => e.t === 'enemy').length };
  out.ss = { boss: ss.entities.find((e) => e.t === 'boss')?.kind, exit: ss.entities.find((e) => e.t === 'exit')?.to, room: !!ss.bossRoom, foes: ss.entities.filter((e) => e.t === 'enemy').length };
  const caves = [];
  for (const rid of ['fens', 'highlands']) for (const p of M.getRegion(rid).pois.filter((q) => q.kind === 'cave')) { const d = M.MAPS[p.id]?.build(); caves.push({ id: p.id, ok: !!d, foes: d?.entities.filter((e) => e.t === 'enemy').length, back: d?.entities.some((e) => e.t === 'exit' && e.to === rid) }); }
  out.caves = caves;
  return out;
});
check('Reedwick and Skarn Hold have ten named people each, a fire and a way out', hubs.reedwick.n === 10 && hubs.skarnhold.n === 10 && !hubs.reedwick.missing.length && !hubs.skarnhold.missing.length && hubs.reedwick.fire && hubs.skarnhold.fire && hubs.reedwick.exit === 'fens' && hubs.skarnhold.exit === 'highlands' && hubs.reedwick.spawn && hubs.skarnhold.spawn, JSON.stringify(hubs));
check('the Sunken Barrow ends in the Mire Mother, the Stormspire in the Storm Giant', hubs.mb.boss === 'miremother' && hubs.mb.exit === 'fens' && hubs.mb.room && hubs.mb.foes >= 8 && hubs.ss.boss === 'stormgiant' && hubs.ss.exit === 'highlands' && hubs.ss.room && hubs.ss.foes >= 8, JSON.stringify([hubs.mb, hubs.ss]));
check('every cave in the two regions builds, has foes and leads home', hubs.caves.length >= 4 && hubs.caves.every((c) => c.ok && c.foes >= 4 && c.back), JSON.stringify(hubs.caves));

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
const mm = await boss('mirebarrow', 'miremother', 'mireMotherDead');
check('the Mire Mother wakes, changes phase and falls', mm.has && mm.engaged && mm.name === 'The Mire Mother' && mm.ph >= 2 && mm.dead, JSON.stringify(mm));
const sg = await boss('stormspire', 'stormgiant', 'stormGiantDead');
check('the Storm Giant wakes, changes phase and falls', sg.has && sg.engaged && sg.name === 'The Storm Giant' && sg.ph >= 2 && sg.dead, JSON.stringify(sg));

// ---- creatures
const mk = await G(async () => {
  const g = window.gs(), E = await import('/src/data/enemies.js'), out = {};
  window.__ff.S.flags.introDone = true;
  await new Promise((r) => setTimeout(r, 300));
  for (const k of ['bogwraith', 'boghag', 'leech', 'mudlurker', 'thunderbird', 'mammoth', 'nomad', 'nomadshaman', 'stonegiant', 'werewolf', 'ghost']) { const e = g.addEnemy(k, g.player.x + 60, g.player.y + 20, { tier: 1 }); out[k] = !!e && e.maxHp > 0; e.destroy(); }
  return out;
});
check('all the new creatures can be spawned', Object.values(mk).every(Boolean), JSON.stringify(mk));

// ---- quests
await G(() => { const St = window.__ff.S; for (const q of ['miremother', 'leeches', 'orchids', 'stormgiant', 'feathers', 'greytusk']) St.quests[q].status = 'inactive'; St.flags.mireMotherDead = false; St.flags.stormGiantDead = false; St.gold = 0; St.inv = {}; });
await stub([0]); await SCRIPT('wick_elder'); await unstub();
check('Ilse sends you to the Sunken Barrow', await G(() => window.__ff.S.quests.miremother.status === 'active'));
await G(() => { window.__ff.S.flags.mireMotherDead = true; });
await stub([]); await SCRIPT('wick_elder'); await unstub();
const iq = await G(() => { const s = window.__ff.S; return { q: s.quests.miremother.status, mail: !!s.inv.peat_mail, hook: !!s.inv.drowned_hook, gold: s.gold }; });
check('finishing it pays Peat-Warden Mail, the Drowned Hook and gold', iq.q === 'done' && iq.mail && iq.hook && iq.gold === 520, JSON.stringify(iq));
await stub([0]); await SCRIPT('wick_hunter'); await unstub();
await G(() => { window.__ff.S.kills.leech = (window.__ff.S.kills.leech || 0) + 10; });
await stub([]); await SCRIPT('wick_hunter'); await unstub();
check('Brann pays for ten leeches', await G(() => window.__ff.S.quests.leeches.status === 'done'));
await stub([0]); await SCRIPT('wick_herbalist'); await unstub();
await G(() => { window.__ff.S.inv.marsh_orchid = 5; });
await stub([]); await SCRIPT('wick_herbalist'); await unstub();
check('Maud trades a draught for five marsh orchids', await G(() => window.__ff.S.quests.orchids.status === 'done' && !window.__ff.S.inv.marsh_orchid));
await stub([0]); await SCRIPT('skarn_chief'); await unstub();
await G(() => { window.__ff.S.flags.stormGiantDead = true; window.__ff.S.gold = 0; });
await stub([]); await SCRIPT('skarn_chief'); await unstub();
const uq = await G(() => { const s = window.__ff.S; return { q: s.quests.stormgiant.status, maul: !!s.inv.giants_maul, furs: !!s.inv.clan_furs, gold: s.gold }; });
check('Ulfar pays Clan Furs, the Giant\'s Maul and gold for the Storm Giant', uq.q === 'done' && uq.maul && uq.furs && uq.gold === 640, JSON.stringify(uq));
await stub([0]); await SCRIPT('skarn_shaman'); await unstub();
await G(() => { window.__ff.S.inv.storm_feather = 5; });
await stub([]); await SCRIPT('skarn_shaman'); await unstub();
check('Veda trades for five storm feathers', await G(() => window.__ff.S.quests.feathers.status === 'done'));
await stub([0]); await SCRIPT('skarn_herder'); await unstub();
await G(() => { window.__ff.S.flags.rb_greytusk = true; });
await stub([]); await SCRIPT('skarn_herder'); await unstub();
check('Halldor thanks you for Old Greytusk', await G(() => window.__ff.S.quests.greytusk.status === 'done'));
// all the other talkers run without errors
for (const n of ['wick_trader', 'wick_smith', 'wick_fisher', 'wick_child', 'wick_watch', 'skarn_trader', 'skarn_smith', 'skarn_scout', 'skarn_child', 'skarn_bard', 'clantrader']) { await stub([]); await SCRIPT(n); await unstub(); }
check('every villager has something to say', true);

// ---- round 7: inn, cartographer, full-service smith, sell-all-junk
const svc = await G(async () => {
  const g = window.gs(), St = window.__ff.S, SV = await import('/src/data/services2.js');
  await import('/src/data/regions2_story.js');
  window.gs().changeMap('fens', 'entry', 'door');
  return true;
});
await h.sleep(2200);
const rum = await G(async () => {
  const g = window.gs(), St = window.__ff.S, SV = await import('/src/data/services2.js'), dlg = await import('/src/systems/dialogue.js');
  const real = dlg.dialogue.hud; dlg.dialogue.hud = { say: async () => {}, choose: async () => 0, hideBox() {}, scene: real.scene };
  St.gold = 100; delete St.flags.waypoint; const before = Object.keys(St.discovered || {}).length;
  const ok = await SV.rumour('Marit', 30);
  const after = Object.keys(St.discovered || {}).length;
  dlg.dialogue.hud = real;
  return { ok, gained: after - before, gold: St.gold, wp: !!St.flags.waypoint };
});
check('an innkeeper sells a rumour: a place is marked, a waypoint set, 30 gold paid', rum.ok && rum.gained === 1 && rum.gold >= 70 && rum.gold <= 90 && rum.wp, JSON.stringify(rum));
const chart = await G(async () => {
  const g = window.gs(), St = window.__ff.S, SV = await import('/src/data/services2.js');
  const fogBefore = (St.fog.fens || '').split('').filter((c) => c === '1').length, dBefore = Object.keys(St.discovered || {}).length;
  const r = SV.revealChart(g, 60);
  const fogAfter = (St.fog.fens || '').split('').filter((c) => c === '1').length;
  return { fog: fogAfter - fogBefore, places: Object.keys(St.discovered || {}).length - dBefore, r };
});
check('a chart reveals the map and marks the places inside its radius', chart.fog > 100 && chart.places >= 2, JSON.stringify(chart));
const inn = await G(async () => {
  const g = window.gs(), St = window.__ff.S, SV = await import('/src/data/services2.js'), dlg = await import('/src/systems/dialogue.js');
  const real = dlg.dialogue.hud; dlg.dialogue.hud = { say: async () => {}, choose: async (o) => (o.some((x) => /Room/.test(x)) ? 0 : 3), hideBox() {}, scene: real.scene };
  St.gold = 100; St.hp = 5; St.time = 14 * 60; const day0 = St.days || 0;
  await SV.innMenu('Marit', { room: 22 });
  dlg.dialogue.hud = real;
  return { hp: St.hp, max: St.maxHp, t: St.time, days: (St.days || 0) - day0, gold: St.gold, resp: St.respawn.map };
});
check('a room heals, saves, sets the respawn point and sleeps until morning', inn.hp === inn.max && Math.abs(inn.t - 420) < 10 && inn.days === 1 && inn.gold === 78 && inn.resp === 'fens', JSON.stringify(inn));
const junk = await G(async () => {
  const St = window.__ff.S, SV = await import('/src/data/services.js'), { ITEMS } = await import('/src/data/items.js');
  St.inv = { hide: 3, mammoth_tusk: 2, hp_potion: 2 }; St.gold = 0;
  const j = SV.junkItems(); const r = SV.sellJunk();
  return { j, r, left: Object.keys(St.inv).sort().join(), gold: St.gold };
});
check('sell-all-junk sells hides and tusks and keeps potions', junk.j.length === 2 && junk.r.n === 5 && junk.gold >= 90 && junk.left === 'hp_potion', JSON.stringify(junk));
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'REGIONS4 FAILED' : 'REGIONS4 PASSED');
process.exit(failCount() ? 1 : 0);
