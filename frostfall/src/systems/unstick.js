// Never stuck: if the player ends up inside something solid, or boxed into a pocket they cannot walk out of, they are freed.
//  - embedded in a tree, wall or prop for a moment: nudged out to the nearest open spot
//  - pushing to move for a while without getting anywhere, and boxed in: sent back to the last safe spot
//  - Pause > System > UNSTUCK does the same on demand
// The player's body is an 8x7 box; "free" means that box overlaps no collidable tile and no solid prop, chest, NPC or breakable.
import { bus } from './bus.js';

const STEP = 2;            // search / flood-fill grid, in pixels
const SOLID_GROUPS = ['staticBodies'];          // every solid prop, chest, breakable and NPC (GameScene keeps them in one group)

// Is the body box with top-left (x, y) clear of everything solid?
export function boxFree(sc, x, y, w, h) {
  if (sc.layer) {
    const tiles = sc.layer.getTilesWithinWorldXY(x + 0.5, y + 0.5, w - 1, h - 1, { isColliding: true });
    if (tiles.length) return false;
  }
  const bodies = sc.physics.overlapRect(x + 0.5, y + 0.5, w - 1, h - 1, false, true);
  for (const b of bodies) {
    const go = b.gameObject;
    if (go && SOLID_GROUPS.some((g) => sc[g]?.contains?.(go))) return false;
  }
  return true;
}

const bodyOf = (p) => ({ x: p.body.x, y: p.body.y, w: p.body.width, h: p.body.height });

export const isEmbedded = (sc, p) => { const b = bodyOf(p); return !boxFree(sc, b.x, b.y, b.w, b.h); };

// Can the player walk from here to somewhere at least `need` pixels away? Grid flood fill with the real body size.
export function canEscape(sc, p, need = 40) { const b = bodyOf(p); return canEscapeAt(sc, b.x, b.y, b.w, b.h, need); }
export function canEscapeAt(sc, sx, sy, w, h, need = 40) {
  const b = { w, h };
  const seen = new Set([0 + ',' + 0]), q = [[0, 0]];
  while (q.length) {
    const [cx, cy] = q.pop();
    if (Math.hypot(cx, cy) >= need) return true;
    for (const [dx, dy] of [[STEP, 0], [-STEP, 0], [0, STEP], [0, -STEP]]) {
      const nx = cx + dx, ny = cy + dy, k = nx + ',' + ny;
      if (seen.has(k) || Math.abs(nx) > need + STEP || Math.abs(ny) > need + STEP) continue;
      seen.add(k);
      if (boxFree(sc, sx + nx, sy + ny, b.w, b.h)) q.push([nx, ny]);
    }
  }
  return false;
}

// A spot with room around it: free here and in all four directions a little way out.
const roomy = (sc, p, x, y) => {
  const b = bodyOf(p);
  if (!boxFree(sc, x, y, b.w, b.h)) return false;
  let open = 0;
  for (const [dx, dy] of [[10, 0], [-10, 0], [0, 10], [0, -10]]) if (boxFree(sc, x + dx, y + dy, b.w, b.h)) open++;
  return open >= 3;
};

function moveTo(p, bx, by) {
  const b = bodyOf(p);
  p.x += bx - b.x; p.y += by - b.y;
  p.body.reset(p.x, p.y);
}

// Nearest roomy spot to the player (rings of growing size), or null.
export function nearestOpen(sc, p, maxR = 120) {
  const b = bodyOf(p);
  for (let r = 0; r <= maxR; r += STEP) {
    for (let a = 0; a < (r === 0 ? 1 : Math.max(8, r)); a++) {
      const ang = (a / Math.max(8, r)) * Math.PI * 2;
      const x = Math.round((b.x + Math.cos(ang) * r) / STEP) * STEP, y = Math.round((b.y + Math.sin(ang) * r) / STEP) * STEP;
      const wb = sc.physics.world.bounds;
      if (x < wb.x + 8 || y < wb.y + 8 || x + b.w > wb.right - 8 || y + b.h > wb.bottom - 8) continue;     // stay inside the map
      if (roomy(sc, p, x, y) && canEscapeAt(sc, x, y, b.w, b.h)) return { x, y };      // open, and not just another pocket
    }
  }
  return null;
}

// Free the player now: to the nearest open spot, else the last remembered safe spot. Returns true if they moved.
export function unstick(sc, p, why = 'manual') {
  const bb = bodyOf(p);
  if (boxFree(sc, bb.x, bb.y, bb.w, bb.h) && canEscapeAt(sc, bb.x, bb.y, bb.w, bb.h) && why === 'manual') return false;     // not stuck: leave them be
  let to = nearestOpen(sc, p);
  if (!to && p.lastSafe && canEscapeAt(sc, p.lastSafe.x, p.lastSafe.y, bb.w, bb.h)) to = p.lastSafe;
  if (!to) return false;
  const was = bodyOf(p);
  if (Math.hypot(to.x - was.x, to.y - was.y) < 1) return false;
  moveTo(p, to.x, to.y);
  p.body.setVelocity(0, 0);
  p.stuckT = 0; p.embedT = 0; p.idleT = 0;
  bus.emit('toast', why === 'manual' ? 'FREED' : 'YOU SLIP FREE', 15);
  return true;
}

// Called every frame from Player.update. ix/iy: how hard the player is pushing to move.
export function watchStuck(sc, p, dt, ix, iy) {
  if (p.mode !== 'free' && p.mode !== 'roll' && p.mode !== 'hurt') return;
  p.scanT = (p.scanT || 0) - dt;
  if (p.scanT > 0) return;
  p.scanT = 0.15;
  const b = bodyOf(p);
  // 1. inside something solid for a moment: nudge out
  if (!boxFree(sc, b.x, b.y, b.w, b.h)) {
    p.embedT = (p.embedT || 0) + 0.15;
    if (p.embedT >= 0.3) { unstick(sc, p, 'embedded'); }
    return;
  }
  p.embedT = 0;
  // remember safe spots (roomy, not mid-roll) to return to
  if (p.mode === 'free' && roomy(sc, p, b.x, b.y)) p.lastSafe = { x: b.x, y: b.y };
  // 2. pushing hard for a while and going nowhere while boxed in
  const pushing = (ix || iy) && p.mode === 'free' && !p.swing && p.lockT <= 0;
  const moved = Math.hypot(b.x - (p.lastX ?? b.x), b.y - (p.lastY ?? b.y));
  p.lastX = b.x; p.lastY = b.y;
  if (pushing && moved < 0.6) p.idleT = (p.idleT || 0) + 0.15; else p.idleT = 0;
  if (p.idleT >= 1.5) {
    p.idleT = 0;
    if (!canEscape(sc, p)) {
      // the last safe spot is only good if it is still open ground (it may have been walled in since)
      if (p.lastSafe && !canEscapeAt(sc, p.lastSafe.x, p.lastSafe.y, b.w, b.h)) p.lastSafe = null;
      if (p.lastSafe && Math.hypot(p.lastSafe.x - b.x, p.lastSafe.y - b.y) > 4) { moveTo(p, p.lastSafe.x, p.lastSafe.y); p.body.setVelocity(0, 0); bus.emit('toast', 'YOU SLIP FREE', 15); }
      else unstick(sc, p, 'boxed');
    }
  }
}
