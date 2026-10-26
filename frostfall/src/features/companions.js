// Companions in the fight (see entities/companionAI.js): foes now and then turn on a companion instead of you, and enemy
// shots and ground zones hurt companions too. Numbers: TUNE.companion.aggro.
import { registerTicker } from '../scenes/gameHooks.js';
import { CORE_ORDER } from '../scenes/gameTickers.js';
import { TUNE } from '../data/tuning.js';
import { companionsOf } from '../entities/companionAI.js';

// Before the enemies move: each alerted foe rethinks its target every `every` seconds. A modest chance to go after the
// nearest companion in range, more when that companion is closer than you or has just hit it. Bosses keep their eyes on you.
export function aggroTick(sc, dt) {
  const A = TUNE.companion.aggro, pl = sc.player;
  const comps = companionsOf(sc).filter((c) => !c.downed);
  const on = new Map();
  for (const e of sc.enemies.getChildren()) if (e.foe) on.set(e.foe, (on.get(e.foe) || 0) + 1);
  for (const e of sc.enemies.getChildren()) {
    if (e.foe && (e.dead || !e.alerted || sc.t > e.foeUntil || !e.foe.active || e.foe.downed || e.foe.dead)) e.foe = null;
    if (e.dead || !e.alerted || e.isBoss || e.cfg.passive || e.foe) continue;
    e.aggroT = (e.aggroT ?? Math.random() * A.every) - dt;
    if (e.aggroT > 0 || !comps.length) continue;
    e.aggroT = A.every;
    let best = null, bd = A.range;
    for (const c of comps) {
      const d = Math.hypot(c.x - e.x, c.y - e.y);
      if (d < bd && (on.get(c) || 0) < A.max) { bd = d; best = c; }
    }
    if (!best) continue;
    let p = A.base;
    if (bd < Math.hypot(pl.x - e.x, pl.y - e.y)) p += A.near;
    if (e.allyHitBy === best && sc.t - (e.allyHitAt ?? -99) < A.hitWindow) p += A.hit;
    if (e.named) p *= A.named;
    if (Math.random() < p) { e.foe = best; e.foeUntil = sc.t + A.hold; on.set(best, (on.get(best) || 0) + 1); }
  }
}
registerTicker('companionAggro', aggroTick, CORE_ORDER.enemies - 37);

// Enemy shots that meet a companion hit it (aimed at it or not).
registerTicker('companionShots', (sc) => {
  const comps = companionsOf(sc).filter((c) => !c.downed && c.hurt);
  if (!comps.length) return;
  for (const sh of sc.eshots.getChildren()) {
    if (sh.done || !sh.enemyOwned || !sh.body) continue;
    const b = sh.body;
    for (const c of comps) {
      const r = c.hurtRect;
      if (b.right < r.x || b.x > r.right || b.bottom < r.y || b.y > r.bottom) continue;
      if (c.hurt(sh.dmg, sh.x - b.velocity.x * 0.1, sh.y - b.velocity.y * 0.1, { kb: 70 })) { sh.finish(); break; }
    }
  }
}, CORE_ORDER.enemyShots + 37);

// Ground zones (casters' bursts, boss slams, trap plates) that go off this frame catch companions standing in them.
registerTicker('companionZones', (sc, dt) => {
  if (!sc.zones?.length) return;
  const comps = companionsOf(sc).filter((c) => !c.downed && c.hurt);
  if (!comps.length) return;
  for (const z of sc.zones) {
    if (z.compDone || z.t - dt > 0) continue;
    z.compDone = true;
    for (const c of comps) if (Math.hypot(c.body.center.x - z.x, c.body.center.y - z.y) < z.r + 3) c.hurt(z.dmg, z.x, z.y, { kb: 110 });
  }
}, CORE_ORDER.zones - 3);
