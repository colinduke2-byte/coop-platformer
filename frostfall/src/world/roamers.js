// Roaming world bosses walk a closed loop between points of interest. Where one is at any moment is a pure function of
// the play clock, so it keeps wandering while you are far away and is always where the footprints say it should be.
export const ROAM_SPEED = 12;     // pixels per second

// Expand waypoints (tiles) into a closed, axis-aligned loop: A -> (midX, A.y) -> (midX, B.y) -> B ... -> A
export function buildLoop(way) {
  const pts = [];
  for (let i = 0; i < way.length; i++) {
    const a = way[i], b = way[(i + 1) % way.length], mx = Math.round((a.x + b.x) / 2);
    pts.push({ x: a.x, y: a.y }, { x: mx, y: a.y }, { x: mx, y: b.y });
  }
  return pts;
}

const px = (p) => ({ x: (p.x + 0.5) * 16, y: (p.y + 0.5) * 16 });
export function loopLength(loop) {
  let L = 0;
  for (let i = 0; i < loop.length; i++) { const a = px(loop[i]), b = px(loop[(i + 1) % loop.length]); L += Math.hypot(b.x - a.x, b.y - a.y); }
  return L;
}

// Position in pixels after `secs` seconds on the loop (phase = starting distance along it, in pixels).
export function routePos(loop, secs, phase = 0, speed = ROAM_SPEED) {
  const L = loopLength(loop) || 1;
  let s = (((secs * speed + phase) % L) + L) % L;
  for (let i = 0; i < loop.length; i++) {
    const a = px(loop[i]), b = px(loop[(i + 1) % loop.length]), seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (s <= seg || i === loop.length - 1) { const k = seg ? s / seg : 0; return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }; }
    s -= seg;
  }
  return px(loop[0]);
}

// Footprint spots (tiles) every `step` pixels along the loop.
export function trackSpots(loop, step = 110) {
  const L = loopLength(loop), out = [];
  for (let s = 0; s < L; s += step) { const p = routePos(loop, 0, s); out.push({ x: Math.floor(p.x / 16), y: Math.floor(p.y / 16) }); }
  return out;
}
