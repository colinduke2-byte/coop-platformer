// Quest-marker helpers (WQ2, WQ4, WQ5): where the player is, and which place of a list is nearest to them.
// Pure module (no Phaser, no data imports), so quest data files can use it without import cycles. The live position is
// written by a ticker in features/world.js; it is not saved (after a load it starts at the map's entrance).
import { onStateReset } from '../systems/state.js';

const here = { map: null, x: 0, y: 0 };
onStateReset(() => { here.map = null; here.x = 0; here.y = 0; });

// tiles; called every frame by the world ticker
export function notePlayer(map, x, y) { here.map = map; here.x = x; here.y = y; }
export const playerSpot = () => ({ ...here });

// Where to measure from on map `map`: the player when they are on it, else the map's way in (the Reach: the village edge).
export function fromOn(map, entry = { x: 4, y: 15 }) { return here.map === map ? { x: here.x, y: here.y } : entry; }

// The place of `list` nearest to `from` (tiles), or null.
export function nearestOf(list, from) {
  let best = null, bd = Infinity;
  for (const p of list) { const d = Math.hypot(p.x - from.x, p.y - from.y); if (d < bd) { bd = d; best = p; } }
  return best;
}
