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
    return { arrived, seen: [...seen], chilled: !before && !!sc.player.statuses?.chill, stealth: (S.weather = allowed[1], sc.stealthEnv()) };
  }, allowed);
  check(`WQ3/WQ19: ${map} turns a blizzard into its own weather and only rolls ${allowed.join('/')}`, r.arrived === 'clear' && r.seen.every((k) => allowed.includes(k)) && r.seen.length >= 2 && !r.chilled, JSON.stringify(r));
}
const sand = await G(() => window.__ff.game.scene.getScene('Game').stealthEnv());
check('WQ19: a storm of the region hides you (stealth multiplier below 1)', sand < 1, String(sand));

await h.close();
console.log(failCount() ? 'STAGE 103 FAILED' : 'STAGE 103 PASSED');
