// World audit fixes in the running game (WQ items): quest markers point somewhere useful, events keep their own marker,
// weather belongs to its region, fast travel from the fire menu, and the rest.
//   node test/stage103_world.mjs
import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=8919');
await h.sleep(1200);
const G = (fn, a) => h.ev(fn, a);

// ---- WQ2: the hunt quests point at tracks of their own beast, not a fixed empty spot
const hunt = await G(async () => {
  const Q = await import('/src/data/quests.js'), M = await import('/src/data/maps.js'), S = window.__ff.S;
  S.flags.sawTracks = false;
  const reach = M.getReach(), out = {};
  for (const [qid, who] of [['trail', 'elk'], ['toll', 'troll']]) {
    S.quests[qid].status = 'active';
    const t = Q.TARGETS[qid](S.quests[qid]);
    const tracks = reach.entities.filter((e) => e.t === 'track' && e.who === who);
    const nearest = Math.min(...tracks.map((e) => Math.hypot(e.x - t.x, e.y - t.y)));
    out[qid] = { map: t.map, onTrack: nearest === 0, old: Math.min(...tracks.map((e) => Math.hypot(e.x - 60, e.y - 40))) };
  }
  S.flags.sawTracks = true;
  const t2 = Q.TARGETS.trail(S.quests.trail);
  out.follows = !!t2 && !(t2.x === 60 && t2.y === 40);
  S.flags.sawTracks = false; S.quests.trail.status = 'inactive'; S.quests.toll.status = 'inactive';
  return out;
});
check('WQ2: The Hunter\'s Trail and the Troll\'s Toll mark a footprint of their own beast', hunt.trail.onTrack && hunt.toll.onTrack && hunt.trail.map === 'forest', JSON.stringify(hunt));
check('WQ2: once the tracks are seen, the marker follows the beast', hunt.follows, JSON.stringify(hunt));

// ---- WQ4: side quests mark the nearest place, not the first in the list
const near = await G(async () => {
  const Q = await import('/src/data/quests.js'), M = await import('/src/data/maps.js'), qm = await import('/src/world/questmarks.js');
  await import('/src/data/sidequests.js');
  const reach = M.getReach(), out = {};
  qm.notePlayer('forest', 4, 15);
  for (const [qid, kind] of [['barrows3', 'barrow'], ['denmother', 'den'], ['towerwatch', 'tower']]) {
    const t = Q.TARGETS[qid]();
    const ds = reach.pois.filter((p) => p.kind === kind).map((p) => Math.hypot(p.x - 4, p.y - 15));
    out[qid] = Math.abs(Math.hypot(t.x - 4, t.y - 15) - Math.min(...ds)) < 0.01;
  }
  // from the far east the nearest barrow changes
  qm.notePlayer('forest', 500, 300);
  const far = Q.TARGETS.barrows3(), dsFar = reach.pois.filter((p) => p.kind === 'barrow').map((p) => Math.hypot(p.x - 500, p.y - 300));
  out.fromHere = Math.abs(Math.hypot(far.x - 500, far.y - 300) - Math.min(...dsFar)) < 0.01;
  qm.notePlayer('village', 0, 0);
  return out;
});
check('WQ4: side-quest markers pick the nearest uncleared place, measured from where you stand', near.barrows3 && near.denmother && near.towerwatch && near.fromHere, JSON.stringify(near));

// ---- WQ5: kill and collect steps have a marker where the creature or item is
const where = await G(async () => {
  const Q = await import('/src/data/quests.js'), S = window.__ff.S;
  await import('/src/data/regions2_story.js'); await import('/src/data/regions3_story.js'); const R4 = await import('/src/data/regions4_story.js');
  const out = {}, none = [];
  for (const id of ['leeches', 'glimmers', 'weavers', 'channel', 'moonlit', 'pearls', 'saltrun', 'feathers', 'glowcaps', 'bloom']) {
    S.quests[id] = S.quests[id] || {}; S.quests[id].status = 'active';
    out[id] = Q.TARGETS[id](S.quests[id]);
    if (!out[id]) none.push(id);
    S.quests[id].status = 'inactive';
  }
  let chainSteps = 0, chainNull = [];
  for (const c of R4.CHAINS) for (const st of c.steps) {
    if (!st.goal.kills && !(st.goal.have && st.goal.have[1] > 0)) continue;
    chainSteps++;
    const q = { status: 'active', base: 1e9 };
    if (!Q.TARGETS[st.qid](q)) chainNull.push(st.qid);
  }
  return { none, leeches: out.leeches, moon: out.moonlit, chainSteps, chainNull };
});
check('WQ5: kill and collect quests in the older regions point at the creature or the item', where.none.length === 0 && where.leeches?.map === 'fens' && where.moon?.map === 'forest', JSON.stringify(where));
check('WQ5: every kill and collect step in the Vale and Sunscorch chains has a marker', where.chainSteps >= 15 && where.chainNull.length === 0, JSON.stringify(where));

// ---- WQ8: a marker on another map points at the first exit on the way there
const way = await G(async () => {
  const X = await import('/src/world/exitgraph.js');
  const t0 = performance.now(), a = X.exitToward('village', 'reedwick'), b = X.exitToward('forest', 'reedwick'), c = X.exitToward('fens', 'reedwick');
  return { a: a?.to, b: b?.to, c: c?.to, ms: Math.round(performance.now() - t0) };
});
check('WQ8: from the village, "Tell Ilse" leads to the Reach, then the Fen Road, then the Reedwick gate', way.a === 'forest' && way.b === 'fens' && way.c === 'reedwick', JSON.stringify(way));

// ---- WQ10: hamlets outside the Reach have their own people
const folk = await G(async () => {
  const M = await import('/src/data/maps.js'), D = await import('/src/data/dialogue.js'), out = {};
  for (const rid of ['ashen', 'fens', 'highlands', 'glasswood', 'vale', 'kingdom']) {
    const ids = M.getRegion(rid).entities.filter((e) => e.t === 'npc' && /^hf_|^(trapper|fisher|prospector)$/.test(e.id)).map((e) => e.id);
    out[rid] = ids.map((id) => id + (D.NPC_DEFS[id] && typeof D.SCRIPTS[id] === 'function' ? '' : '!'));
  }
  return out;
});
check('WQ10: hamlets outside the Reach have their own folk with a name and a script', Object.values(folk).flat().every((x) => x.startsWith('hf_') && !x.endsWith('!')) && Object.values(folk).flat().length >= 5, JSON.stringify(folk));

// ---- WQ11: a read page gives way to an unread one of its family
const pages = await G(async () => {
  const L = await import('/src/world/lorepool.js'), S = window.__ff.S;
  S.lore = { stone0: true, stone1: true, hidden0: true };
  const books = [{ id: 'stone0' }, { id: 'stone1' }, { id: 'hidden0' }, { id: 'ruin0' }];
  L.freshPages(books);
  const ids = books.map((b) => b.id); S.lore = {};
  return ids;
});
check('WQ11: a read page gives way to an unread one of its family, never twice the same', pages[0] === 'stone2' && pages[1] === 'stone1' && pages[2].startsWith('hidden') && pages[2] !== 'hidden0' && pages[3] === 'ruin0', JSON.stringify(pages));

// ---- WQ12 / WQ24: charting half a region is announced, and a chartmaker pays it
const surv = await G(async () => {
  const S = window.__ff.S, M = await import('/src/data/maps.js'), SV = await import('/src/world/survey.js'), D = await import('/src/data/dialogue.js'), dlg = await import('/src/systems/dialogue.js');
  const pois = M.getRegion('fens').pois; S.discovered = {};
  pois.slice(0, Math.ceil(pois.length / 2)).forEach((p) => { S.discovered['fens:' + p.id] = 1; });
  const fresh = SV.newMilestones('fens'), gold0 = S.gold, said = [], real = dlg.dialogue.hud;
  dlg.dialogue.hud = { say: async (n, t) => { said.push(t); }, choose: async (o) => o.length - 1, hideBox() {}, scene: real.scene };
  await D.SCRIPTS.wick_map();
  dlg.dialogue.hud = real;
  const paid = S.gold - gold0, again = SV.owed().length;
  S.discovered = {}; delete S.flags.survey;
  return { fresh, paid, again, said: said.slice(0, 2) };
});
check('WQ12/WQ24: half the Fens charted is a milestone, and the Reedwick chartmaker pays it once and reports the survey', surv.fresh.includes('half') && surv.paid > 0 && surv.again === 0 && surv.said.some((t) => /survey/i.test(t)), JSON.stringify(surv));

// ---- WQ13 / NP4: fast travel from the campfire menu lists every fire you found, the village and dungeon fires included
const trav = await G(async () => {
  const S = window.__ff.S, TR = await import('/src/world/travel.js');
  S.flags.fires = { 'forest:46,23': true, 'maw:14,51': true, 'reedwick:5,5': true };
  const all = TR.knownFires(), sc = window.__ff.game.scene.getScene('Game');
  const { RestSpot } = await import('/src/entities/Props.js'), dlg = await import('/src/systems/dialogue.js'), real = dlg.dialogue.hud;
  const offered = []; let n = 0;
  dlg.dialogue.hud = { say: async () => {}, choose: async (o) => { offered.push(o); n++; return n === 1 ? o.indexOf('Travel to another fire') : n === 2 ? 0 : o.length - 1; }, hideBox() {}, scene: real.scene };
  await new RestSpot(sc, 100, 100).interact();
  dlg.dialogue.hud = real; S.flags.fires = {};
  return { regions: Object.keys(all), reach: all.reach?.map((f) => f.name), offered };
});
check('NP4/WQ13: the fire menu offers "Travel to another fire", then the regions, then the fires (Hollowfrost and a dungeon fire included)', trav.offered[0]?.includes('Travel to another fire') && trav.reach?.includes('HOLLOWFROST') && trav.reach.length === 3 && trav.offered[1]?.length >= 2, JSON.stringify(trav));

// ---- WQ6: a random event marks itself, and never touches the player's waypoint
await h.open('scene=game&map=forest&spawn=start&seed=8919');
await h.sleep(1500);
const ev = await G(async () => {
  const S = window.__ff.S, sc = window.__ff.game.scene.getScene('Game'), qm = await import('/src/world/questmarks.js');
  S.flags.waypoint = { map: 'forest', x: 30, y: 30 };
  sc.spawnTrader();
  const during = { wp: { ...S.flags.waypoint }, em: qm.eventMark() };
  sc.removeTrader();
  sc.spawnWounded(0); const wounded = qm.eventMark(); sc.removeWounded();
  return { during, after: S.flags.waypoint, emAfter: qm.eventMark(), wounded: wounded?.tag };
});
check('WQ6: a trader marks itself in its own marker and leaves your waypoint alone', ev.during.wp.x === 30 && ev.during.em?.map === 'forest' && ev.after?.x === 30 && !ev.emAfter && ev.wounded === 'wounded', JSON.stringify(ev));

// ---- WQ17: minor finds fill the Reach: a cairn rests you, a snared fox can be freed
const finds = await G(async () => {
  const S = window.__ff.S, sc = window.__ff.game.scene.getScene('Game');
  const ents = sc.built.entities, cairns = ents.filter((e) => e.t === 'cairn').length, snares = ents.filter((e) => e.t === 'snare').length, packs = ents.filter((e) => e.t === 'chest' && /minor/.test(e.id)).length;
  const c = sc.interactables.find((i) => i.label?.() === 'E: ADD A STONE'), f = sc.interactables.find((i) => i.label?.() === 'E: FREE THE FOX');
  const g0 = S.gold; c?.interact(); f?.interact();
  return { cairns, snares, packs, rested: S.flags.restedUntil > S.playtime, again: c?.canInteract(), gold: S.gold - g0 };
});
check('WQ17: the Reach has minor finds; a cairn rests you once a day and a freed fox pays', finds.cairns + finds.snares + finds.packs >= 20 && finds.rested && finds.again === false && finds.gold > 0, JSON.stringify(finds));

// ---- WQ18: each landmark has a secret: a riddle answered right pays, a wrong one does not; a fire spell thaws the Frozen Fall
const sec = await G(async () => {
  const S = window.__ff.S, sc = window.__ff.game.scene.getScene('Game'), dlg = await import('/src/systems/dialogue.js'), real = dlg.dialogue.hud;
  const all = sc.interactables.filter((i) => i.s && i.e?.lm), kinds = all.map((i) => i.e.lm);
  const out = { kinds };
  const statue = all.find((i) => i.e.lm === 'fallenstatue');
  if (statue) {
    let answer = 0; dlg.dialogue.hud = { say: async () => {}, choose: async () => answer, hideBox() {}, scene: real.scene };
    const g0 = S.gold; await statue.interact(); out.wrong = S.gold - g0;
    answer = statue.s.right; await statue.interact(); out.right = S.gold - g0;
    dlg.dialogue.hud = real;
  }
  const fall = all.find((i) => i.e.lm === 'frozenfall');
  if (fall) { const g0 = S.gold; const fake = { kind: 'fire', x: fall.ix + 10, y: fall.iy }; const orig = sc.shots.getChildren; sc.shots.getChildren = () => [fake]; fall.tick(0.1, sc); sc.shots.getChildren = orig; out.thaw = S.gold - g0; }
  return out;
});
check('WQ18: the Reach\'s landmarks carry secrets; a riddle pays only for the right answer; fire thaws the Frozen Fall', sec.kinds.length >= 4 && (sec.wrong ?? 0) === 0 && (sec.right ?? 1) > 0 && (sec.thaw ?? 1) > 0, JSON.stringify(sec));

// ---- WQ20: cleared camps are retaken every few days by a tougher crew with a named lieutenant; hub boards post them
await G(async () => {
  const S = window.__ff.S, M = await import('/src/data/maps.js');
  const camp = M.getReach().pois.find((p) => p.kind === 'camp' && p.tier === 0) || M.getReach().pois.find((p) => p.kind === 'camp');
  window.__camp = camp.id; S.bounty[camp.id] = true; S.flags.retakeDay = Math.floor(S.days || 0) - 10;
  window.__ff.game.scene.getScene('Game').scene.restart({ map: 'forest', spawn: 'start' });
});
await h.sleep(2500);
const ret = await G(async () => {
  const S = window.__ff.S, R = await import('/src/world/reoccupy.js'), sc = window.__ff.game.scene.getScene('Game');
  const held = R.retakenOn('forest'), r = held.find((x) => x.id === window.__camp) || held[0];
  const crew = sc.pend.filter((p) => p.spec.camp === r?.id), lt = sc.pend.find((p) => p.key?.includes(':lt:'));
  const board = R.boardOf('fens');
  return { held: held.length, r, crewTier: crew.map((p) => p.spec.tier), base: (await import('/src/data/maps.js')).getReach().pois.find((p) => p.id === r?.id)?.tier, lt: lt?.spec.named, board: board.offers.length };
});
check('WQ20: a cleared camp is retaken: its crew is a tier tougher, with a named lieutenant', ret.held >= 1 && ret.crewTier.length > 0 && ret.crewTier.every((t) => t > ret.base || t === 3) && !!ret.lt, JSON.stringify(ret));
check('WQ20: the Fens board (Reedwick) posts contracts for its region', ret.board > 0, JSON.stringify(ret));

// ---- WQ3 / WQ19: weather belongs to its region
const reachW = await G(async () => {
  const S = window.__ff.S, sc = window.__ff.game.scene.getScene('Game'), { bus } = await import('/src/systems/bus.js');
  const seen = []; const f = (k, r) => seen.push(k + '@' + r); bus.on('weather', f);
  S.weather = 'blizzard'; sc.applyWeather();
  bus.off('weather', f);
  return { w: S.weather, seen };
});
check('WQ3: the Reach keeps its blizzards, and says so on the bus', reachW.w === 'blizzard' && reachW.seen.includes('blizzard@reach'), JSON.stringify(reachW));
for (const [map, allowed] of [['sunscorch', ['clear', 'sandstorm']], ['fens', ['clear', 'rain', 'fog']], ['ashen', ['clear', 'ash']], ['vale', ['clear', 'rain']]]) {
  await h.open(`scene=game&map=${map}&spawn=entry&seed=8919`);
  await h.sleep(1500);
  const r = await G(async (allowed) => {
    const S = window.__ff.S, sc = window.__ff.game.scene.getScene('Game'), { bus } = await import('/src/systems/bus.js');
    const seen = new Set(); const f = (k) => seen.add(k); bus.on('weather', f);
    S.weather = 'blizzard'; sc.applyWeather(); const arrived = S.weather;
    for (let i = 0; i < 60; i++) { sc.weatherT = 0; sc.updateClock(0.001); }
    S.weather = 'blizzard'; sc._cold = 0; const before = sc.player.statuses?.chill; sc.stormCold(30);
    bus.off('weather', f);
    const evKinds = []; for (const k of { sunscorch: ['caravan'], fens: ['wisplure'], ashen: ['ashhunt'], vale: ['hivewar'] }[location.search.match(/map=(\w+)/)[1]] || []) { sc.raidEvt = null; sc.spawnLocal(k, 1); evKinds.push(sc.raidEvt?.foes.map((e) => e.kind).join('+')); sc.raidEvt = null; }
    return { evKinds, arrived, seen: [...seen], chilled: !before && !!sc.player.statuses?.chill, stealth: (S.weather = allowed[1], sc.stealthEnv()) };
  }, allowed);
  check(`WQ3/WQ19: ${map} turns a blizzard into its own weather and only rolls ${allowed.join('/')}`, r.arrived === 'clear' && r.seen.every((k) => allowed.includes(k)) && r.seen.length >= 2 && !r.chilled, JSON.stringify(r));
  check(`WQ27: ${map} has its own event with its own creatures`, r.evKinds.length === 1 && !!r.evKinds[0], JSON.stringify(r.evKinds));
}
const sand = await G(() => window.__ff.game.scene.getScene('Game').stealthEnv());
check('WQ19: a storm of the region hides you (stealth multiplier below 1)', sand < 1, String(sand));

await h.open('scene=game&map=reedwick&spawn=entry&seed=8919');
await h.sleep(1500);
const hubBoard = await G(() => window.__ff.game.scene.getScene('Game').interactables.filter((i) => i.rid === 'fens' && i.label?.() === 'E: BOUNTY BOARD').length);
check('WQ20: Reedwick has a bounty board for the Fens', hubBoard === 1, String(hubBoard));

await h.close();
console.log(failCount() ? 'STAGE 103 FAILED' : 'STAGE 103 PASSED');
