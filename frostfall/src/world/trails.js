// WQ22: treasure trails that link the hidden places. In each region three hidden places (caches, hermits' hollows, ancient
// trees) form a trail: a weathered mark at each one names the next in words only ("SOUTH-EAST, ABOUT 120 PACES, WHERE NO
// ROAD GOES"), with no waypoint. The third hides a box with one of the Hollow Relics (or gold once all eight are found).
import { S } from '../systems/state.js';
import { getRegion } from '../data/maps.js';
import { REGION_DEFS } from './worldgen.js';
import { HIDDEN } from './discovery.js';

const DIRS = ['EAST', 'SOUTH-EAST', 'SOUTH', 'SOUTH-WEST', 'WEST', 'NORTH-WEST', 'NORTH', 'NORTH-EAST'];
const dirOf = (a, b) => DIRS[(Math.round(Math.atan2(b.y - a.y, b.x - a.x) / (Math.PI / 4)) + 8) % 8];
const WHAT = { cache: 'UNDER A HEAP OF ROCKS', hermit: 'BY A HERMIT\'S FIRE', ancient: 'AT THE ROOTS OF AN OLD TREE' };

// the three stops of a region's trail, nearest to the entrance first, each next one at least 30 tiles on
export function trailOf(rid) {
  const reg = getRegion(rid), st = REGION_DEFS[rid]?.start || { x: 4, y: 15 };
  const hid = reg.pois.filter((p) => HIDDEN.has(p.kind));
  const out = [];
  let at = st;
  while (out.length < 3) {
    const next = hid.filter((p) => !out.includes(p) && (out.length === 0 || Math.hypot(p.x - at.x, p.y - at.y) >= 30)).sort((a, b) => Math.hypot(a.x - at.x, a.y - at.y) - Math.hypot(b.x - at.x, b.y - at.y))[0];
    if (!next) break;
    out.push(next); at = next;
  }
  return out.length === 3 ? out : [];
}
export const trailStep = (rid) => S.flags.trail?.[rid] || 0;      // how many marks you have read (3 = the box is open to you)
export function readMark(rid, i) { const t = (S.flags.trail ||= {}); if ((t[rid] || 0) === i) t[rid] = i + 1; }
// the words of the mark at stop i (pointing at stop i + 1)
export function markText(stops, i) {
  const a = stops[i], b = stops[i + 1];
  if (!b) return ['A WEATHERED MARK, AND FRESH-TURNED EARTH.', 'WHATEVER THE MARKS WERE LEADING TO IS HERE. DIG.'];
  const paces = Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 5) * 5;
  return ['A WEATHERED MARK, CUT BY THE SAME HAND AS THE LAST.' , `${dirOf(a, b)}, ABOUT ${paces} PACES, WHERE NO ROAD GOES. ${WHAT[b.kind] || ''}.`];
}
export const trailDone = (rid) => !!S.flags.trailBox?.[rid];
export const markBox = (rid) => { (S.flags.trailBox ||= {})[rid] = 1; };
