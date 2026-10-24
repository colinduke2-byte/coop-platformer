// WQ8: the way to another map. Every map's exits form a graph (map -> exit tile -> destination map); a marker for a place
// on another map points at the first exit of the shortest map path there. Maps are built lazily, once per world seed.
import { S } from '../systems/state.js';
import { MAPS } from '../data/maps.js';

let cache = { seed: null, exits: {} };
function exitsOf(id) {
  if (cache.seed !== S.seed) cache = { seed: S.seed, exits: {} };
  if (cache.exits[id]) return cache.exits[id];
  let out = [];
  try {
    const b = MAPS[id]?.build?.();
    out = (b?.entities || []).filter((e) => e.t === 'exit' && e.to && MAPS[e.to]).map((e) => ({ to: e.to, x: e.x + ((e.w || 1) >> 1), y: e.y + ((e.h || 1) >> 1) }));
  } catch { out = []; }
  return (cache.exits[id] = out);
}

// The exit on map `from` that starts the shortest walk (fewest map changes) to map `to`, or null.
export function exitToward(from, to, maxMaps = 60) {
  if (from === to || !MAPS[from] || !MAPS[to]) return null;
  const first = new Map([[from, null]]), q = [from];
  for (let i = 0; i < q.length && i < maxMaps; i++) {
    const m = q[i];
    for (const ex of exitsOf(m)) {
      if (first.has(ex.to)) continue;
      first.set(ex.to, m === from ? ex : first.get(m));
      if (ex.to === to) return first.get(to);
      q.push(ex.to);
    }
  }
  return null;
}
