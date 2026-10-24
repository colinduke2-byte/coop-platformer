// WQ13 + NP4: fast travel from a list. Every campfire you have stood by (on any map: the Reach's roadside fires, the region
// fires, the village, the hubs and the fires inside the dungeons) is a destination, grouped by region, with Hollowfrost always
// first. Opened from a campfire's menu ("Travel to another fire") and from the map (F with no cursor).
import { S } from '../systems/state.js';
import { T } from '../config.js';
import { MAPS } from '../data/maps.js';
import { REGIONS, REGION_ORDER, regionOfMap } from '../data/regions.js';
import { PLACE_NAME } from './discovery.js';
import { choose } from '../systems/dialogue.js';

const HOME = { key: 'village:19,13', map: 'village', tx: 19, ty: 13 };

// a fire's name: the place it belongs to, else its map
function fireName(map, tx, ty) {
  const b = MAPS[map]?.stream ? MAPS[map].build() : null;
  const p = b?.pois?.reduce((best, q) => { const d = Math.hypot(q.x - tx, q.y - ty); return d < 14 && (!best || d < best.d) ? { q, d } : best; }, null)?.q;
  if (p) return (PLACE_NAME[p.kind] || p.kind).toUpperCase() + (p.kind === 'rest' ? '' : ' FIRE');
  return (MAPS[map]?.stream ? 'THE ROAD IN' : MAPS[map]?.name || map).toUpperCase();
}

// { region: [{ key, map, tx, ty, name }] } of every fire you have found, in region order
export function knownFires() {
  const out = {};
  const keys = Object.keys(S.flags.fires || {}).filter((k) => S.flags.fires[k]);
  if (!keys.includes(HOME.key)) keys.unshift(HOME.key);
  for (const key of keys) {
    const m = key.match(/^(.+):(\d+),(\d+)$/); if (!m || !MAPS[m[1]]) continue;
    const map = m[1], tx = +m[2], ty = +m[3], rid = regionOfMap(map);
    (out[rid] ||= []).push({ key, map, tx, ty, name: key === HOME.key ? 'HOLLOWFROST' : fireName(map, tx, ty) });
  }
  return Object.fromEntries(REGION_ORDER.filter((r) => out[r]).map((r) => [r, out[r]]));
}

// the destination as fastTravel wants it (pixels; map set when it is another map)
export const travelSpot = (f) => ({ x: (f.tx + 0.5) * T, y: (f.ty + 0.5) * T, map: f.map, key: f.key });

// Ask where to go (inside a conversation or on its own), then go. Returns true when the journey started.
export async function travelMenu(sc) {
  const all = knownFires(), regions = Object.keys(all);
  for (;;) {
    const r = regions.length === 1 ? 0 : await choose([...regions.map((id) => `${REGIONS[id].name} (${all[id].length})`), 'Cancel']);
    if (r < 0 || r >= regions.length) return false;
    const list = all[regions[r]].filter((f) => !(f.map === sc.mapId && Math.hypot((f.tx + 0.5) * T - sc.player.x, (f.ty + 0.5) * T - sc.player.y) < 48));
    const c = await choose([...list.map((f) => f.name), 'Back']);
    if (c >= 0 && c < list.length) return sc.fastTravel(travelSpot(list[c]));
    if (regions.length === 1) return false;
  }
}
