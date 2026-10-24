// H: HUD and first hour. The first trip out of the village (NP11, NP25).
// - NP11 (smallest hook; spawn placement itself is the world agent's): while you are new (below TUNE.hud.safeLevel), foes
//   waiting within TUNE.hud.safeR px of a village exit when you arrive are moved out to that radius, before the first
//   moments of the fade-in. Worldgen is untouched (the Reach hash does not move).
// - NP25: the first time you step out, a one-line warning, and the nearest campfire is set as your waypoint.
import { registerListener, registerTicker } from '../scenes/gameHooks.js';
import { CORE_ORDER } from '../scenes/gameTickers.js';
import { S, onStateReset } from '../systems/state.js';
import { bus } from '../systems/bus.js';
import { padHint } from '../systems/access.js';
import { TUNE } from '../data/tuning.js';

const T = 16;
export function villageExitNear(sc, px, py, r) {
  return (sc.built?.entities || []).find((e) => e.t === 'exit' && e.to === 'village' && Math.hypot((e.x + e.w / 2) * T - px, (e.y + e.h / 2) * T - py) < r);
}

export function clearExit(sc) {
  const pl = sc.player, R = TUNE.hud.safeR;
  if (!pl || S.quick || !sc.def?.stream || (S.charLevel || 1) >= TUNE.hud.safeLevel) return 0;
  const ex = villageExitNear(sc, pl.x, pl.y, 12 * T);
  if (!ex) return 0;
  const cx = (ex.x + ex.w / 2) * T, cy = (ex.y + ex.h / 2) * T;
  let moved = 0;
  for (const e of sc.enemies.getChildren()) {
    if (e.dead || e.cfg.passive || e.isBoss || e.tutorial) continue;
    const d = Math.hypot(e.x - cx, e.y - cy);
    if (d >= R) continue;
    const ux = d > 1 ? (e.x - cx) / d : 1, uy = d > 1 ? (e.y - cy) / d : 0;
    // push it out along its own direction; try a few angles if that spot is solid
    for (let k = 0; k < 8; k++) {
      const a = Math.atan2(uy, ux) + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.4;
      const nx = cx + Math.cos(a) * R, ny = cy + Math.sin(a) * R;
      if (sc.solidAt?.(nx, ny)) continue;
      e.setPosition(nx, ny); e.body?.reset?.(nx, ny); if (e.home) e.home = { x: nx, y: ny };
      moved++; break;
    }
  }
  return moved;
}

export function firstTrip(sc) {
  const pl = sc.player;
  if (!pl || S.quick || S.daily || !sc.def?.stream || S.flags.firstTrip) return false;
  if (!villageExitNear(sc, pl.x, pl.y, 12 * T)) return false;
  S.flags.firstTrip = true;
  bus.emit('hint', padHint('THE REACH: STAY ON THE ROAD. CAMPFIRES ARE SAFE.\nNAMES IN ORANGE OR RED: FOES BEYOND YOU. TURN BACK.'), true);
  const fires = (sc.built.entities || []).filter((e) => e.t === 'fire' && e.rest);
  const near = fires.sort((a, b) => Math.hypot(a.x * T - pl.x, a.y * T - pl.y) - Math.hypot(b.x * T - pl.x, b.y * T - pl.y))[0];
  if (near && !S.flags.waypoint) { S.flags.waypoint = { map: sc.mapId, x: near.x, y: near.y }; bus.emit('toast', 'THE NEAREST CAMPFIRE IS MARKED', 12); }
  return true;
}

// only when you have just walked out of the village (not after a load or a fast travel)
const memory = { last: null, fromVillage: false };
onStateReset(() => { memory.last = null; memory.fromVillage = false; });
registerListener('scene:game', (sc) => { memory.fromVillage = memory.last === 'village'; memory.last = sc.mapId; firstTrip(sc); });
// the open world streams its foes in over the first frames, while the screen is still fading in: clear them as they come
registerTicker('hudSafeExit', (sc) => { if (memory.fromVillage && (sc.t || 0) < TUNE.hud.safeWindow) clearExit(sc); }, CORE_ORDER.enemies - 10);
