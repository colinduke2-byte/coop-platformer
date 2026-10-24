// Status effects you can see on enemies (VX-06), driven only by the bus: 'status:on' (target, kind, duration) and
// 'status:off' (target, kind). Each frame, for enemies on screen:
//   burn    1-2 orange and gold pixels rise off the body          poison  green drips fall from it
//   bleed   red drips                                              chill   cyan flecks drift down, and 1-3 pips under the feet
//   shock   a tiny gold spark arcs on the body                     root    green tendrils at the feet
//   freeze  the creature turns pale ice (a palette-remapped copy of its sheet) inside a crust of ice shards
// Particles come from the scene's Fx pool; pips, tendrils and crusts are one Graphics per scene, redrawn only while someone
// has a status. Nothing here changes what a status does.
import { registerListener, registerTicker } from '../scenes/gameHooks.js';
import { CORE_ORDER } from '../scenes/gameTickers.js';
import { C } from '../config.js';
import { TUNE } from '../data/tuning.js';

const ART = () => TUNE.art?.status || { burn: 0.11, drip: 0.28, chill: 0.2, shock: 0.32 };
const FREEZE_TINT = 0xc8f0ff;
const state = new WeakMap();          // scene -> { on: Map(target -> Set(kind)), g }
const st = (sc) => { let s = state.get(sc); if (!s) state.set(sc, (s = { on: new Map(), g: null })); return s; };

registerListener('status:on', (sc, t, kind) => {
  if (!t || t.isPlayer || t === sc.player) return;
  const s = st(sc); let set = s.on.get(t);
  if (!set) s.on.set(t, (set = new Set()));
  set.add(kind);
}, 'artStatusOn');
registerListener('status:off', (sc, t, kind) => {
  const s = state.get(sc), set = s?.on.get(t);
  if (!set) return;
  set.delete(kind);
  if (kind === 'freeze' && t.active && t._frozenLook) { t._frozenLook = false; t.clearTint(); }
  if (!set.size) s.on.delete(t);
}, 'artStatusOff');

const rnd = (a, b) => a + Math.random() * (b - a);
function emit(fx, col, x, y, vx, vy, life, grav = 0) {
  const sp = fx.acquire(col, Math.round(x), Math.round(y));
  sp.setDepth(99010);
  fx.parts.push({ sp, vx, vy, t: life, life, grav });
}

registerTicker('artStatus', (sc, dt) => {
  const s = state.get(sc);
  if (!s || (!s.on.size && !s.drawn)) return;
  if (!s.g || !s.g.scene) s.g = sc.add.graphics().setDepth(99020);
  const g = s.g, fx = sc.fx, view = sc.cameras.main.worldView, R = ART();
  g.clear(); s.drawn = false;
  for (const [t, set] of s.on) {
    if (!t.active || t.dead || !t.statuses) { s.on.delete(t); continue; }
    for (const k of set) if (!t.statuses[k]) set.delete(k);
    if (!set.size) { s.on.delete(t); if (t._frozenLook) { t._frozenLook = false; t.clearTint(); } continue; }
    if (t.x < view.x - 24 || t.x > view.right + 24 || t.y < view.y - 32 || t.y > view.bottom + 24) continue;     // off screen: nothing
    const b = t.body, w = b ? Math.max(6, b.width) : 10, top = b ? b.y - 4 : t.y - 10, foot = b ? b.bottom : t.y + 6, cx = b ? b.center.x : t.x;
    const tm = (t._stT ||= {});
    const due = (k, every) => { tm[k] = (tm[k] || 0) - dt; if (tm[k] > 0) return false; tm[k] = every * rnd(0.7, 1.3); return true; };
    if (set.has('burn') && due('burn', R.burn)) emit(fx, Math.random() < 0.6 ? 12 : Math.random() < 0.5 ? 13 : 11, cx + rnd(-w / 2, w / 2), rnd(top + 2, foot - 4), rnd(-4, 4), -rnd(18, 30), 0.45);
    if (set.has('poison') && due('poison', R.drip)) emit(fx, Math.random() < 0.7 ? 8 : 7, cx + rnd(-w / 2, w / 2), rnd(top + 4, foot - 4), 0, 6, 0.5, 70);
    if (set.has('bleed') && due('bleed', R.drip)) emit(fx, 11, cx + rnd(-w / 3, w / 3), rnd(top + 4, foot - 6), 0, 4, 0.45, 90);
    if (set.has('chill') && due('chill', R.chill / (t.statuses.chill?.stacks || 1))) emit(fx, Math.random() < 0.5 ? 15 : 6, cx + rnd(-w / 2 - 2, w / 2 + 2), top + rnd(0, 6), rnd(-6, 6), 10, 0.6);
    if (set.has('shock') && due('shock', R.shock)) fx.fork(cx + rnd(-w / 3, w / 3), rnd(top + 3, foot - 3));
    if (set.has('chill')) {                                       // how close to a freeze: one pip per stack (3 freezes)
      const n = t.statuses.chill?.stacks || 1, x0 = Math.round(cx - (n * 3 - 1) / 2), y0 = Math.round(foot + 3);
      for (let i = 0; i < 3; i++) { g.fillStyle(C[i < n ? 15 : 2], 1); g.fillRect(x0 + i * 3, y0, 2, 2); }
      g.fillStyle(C[0], 1); g.fillRect(x0 - 1, y0 + 2, 9, 1);
      s.drawn = true;
    }
    if (set.has('root')) {
      g.fillStyle(C[8], 1);
      for (const dx of [-w / 2, 0, w / 2]) { const x = Math.round(cx + dx); g.fillRect(x, foot - 3, 1, 4); g.fillRect(x - 1, foot - 2, 1, 1); g.fillRect(x + 1, foot - 4, 1, 1); }
      s.drawn = true;
    }
    if (set.has('freeze')) {
      if (!(t.flashT > 0)) { t.setTint(FREEZE_TINT); t._frozenLook = true; }
      // a crust of ice shards around the body: two bars and four spikes in frost and white, outlined dark
      const x0 = Math.round(cx - w / 2 - 2), x1 = Math.round(cx + w / 2 + 1), y1 = Math.round(foot);
      g.fillStyle(C[3], 1); g.fillRect(x0, y1 - 1, x1 - x0 + 1, 2);
      g.fillStyle(C[15], 1); g.fillRect(x0 + 1, y1 - 1, x1 - x0 - 1, 1);
      for (const [x, h] of [[x0, 6], [x0 + 2, 4], [x1, 7], [x1 - 2, 3]]) { g.fillStyle(C[3], 1); g.fillRect(x, y1 - h, 1, h); g.fillStyle(C[6], 1); g.fillRect(x, y1 - h, 1, 1); }
      s.drawn = true;
    }
  }
}, CORE_ORDER.enemies + 41);
