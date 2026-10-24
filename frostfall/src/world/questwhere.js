// WQ5: a "where" for kill and collect quest steps. A kill step points at the nearest place whose crew has that creature
// (uncleared camps first), else at the nearest one roaming the wild; a collect step at the nearest herb of that kind, else
// at the nearest creature that drops it. All of it is read from the region as it was built, so it follows the seed.
import { S } from '../systems/state.js';
import { getRegion } from '../data/maps.js';
import { ENEMIES } from '../data/enemies.js';
import { REGIONS } from '../data/regions.js';
import { REGION_DEFS } from './worldgen.js';
import { fromOn, nearestOf } from './questmarks.js';
import { routePos } from './roamers.js';

const mapOf = (rid) => REGIONS[rid]?.map || rid;
const from = (rid) => fromOn(mapOf(rid), REGION_DEFS[rid]?.start);
const at = (rid, p) => (p ? { map: mapOf(rid), x: p.x, y: p.y } : null);

// places (or roaming spots) where creatures of `kinds` live in region `rid`
export function huntSpots(rid, kinds) {
  const want = new Set(Array.isArray(kinds) ? kinds : [kinds]), reg = getRegion(rid);
  const camps = new Map(), roam = [];
  for (const e of reg.entities) {
    if (e.t !== 'enemy' || !want.has(e.kind)) continue;
    if (e.camp) { if (!S.bounty?.[e.camp] && !camps.has(e.camp)) { const p = reg.pois.find((q) => q.id === e.camp); if (p) camps.set(e.camp, { x: p.x, y: p.y + 2 }); } }
    else roam.push({ x: e.x, y: e.y });
  }
  return camps.size ? [...camps.values()] : roam;
}
export const huntTarget = (rid, kinds) => at(rid, nearestOf(huntSpots(rid, kinds), from(rid)));

// creatures that drop an item
export const droppers = (item) => Object.keys(ENEMIES).filter((k) => ENEMIES[k]?.loot?.drops?.some((d) => d[0] === item));

export function gatherTarget(rid, item) {
  const reg = getRegion(rid);
  const night = item === 'moonpetal';           // moonpetals are the Reach's every ninth herb, and only show after dark
  const herbs = reg.entities.filter((e, i) => e.t === 'herb' && (night ? i % 9 === 0 : e.item === item));
  if (herbs.length) return at(rid, nearestOf(herbs, from(rid)));
  const ks = droppers(item);
  return ks.length ? huntTarget(rid, ks) : null;
}

// the marker for a quest step goal { kills: [kind, n] } / { have: [item, n] } in region `rid`
export function goalWhere(goal, rid) {
  if (goal.kills) return huntTarget(rid, goal.kills[0]);
  if (goal.have && goal.have[1] > 0) return gatherTarget(rid, goal.have[0]);
  return null;
}

// a roaming beast (Old Greytusk...): where its loop puts it right now
export function roamerTarget(rid, id) {
  const b = getRegion(rid).entities.find((e) => e.t === 'roamboss' && e.id === id);
  if (!b) return null;
  const p = routePos(b.route, S.playtime || 0, b.phase);
  return { map: mapOf(rid), x: Math.floor(p.x / 16), y: Math.floor(p.y / 16) };
}
