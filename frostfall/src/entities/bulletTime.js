// CB27: the perfect dodge's slow motion slows the enemies and their shots, not you. Each enemy and enemy shot runs its
// update with a scaled dt, and its velocity is scaled for the physics step (and restored before its next update).
const warp = { scene: null, end: -1, scale: 1 };

export function startWarp(sc, scale, secs) { warp.scene = sc; warp.scale = scale; warp.end = sc.t + secs; }
export const warpK = (sc) => (warp.scene === sc && sc.t < warp.end ? warp.scale : 1);

// Wrap an object's update(dt, ...) so it follows the warp.
export function warpable(o) {
  const inner = o.update;
  o.update = function (dt, ...rest) {
    const k = warpK(this.scene), b = this.body;
    if (this._wk && this._wk !== 1 && b?.velocity) b.velocity.scale(1 / this._wk);
    const r = inner.call(this, dt * k, ...rest);
    if (k !== 1 && b?.velocity && !this.dead && !this.done) b.velocity.scale(k);
    this._wk = k;
    return r;
  };
}

// The enemies' side of the world follows the warp too: their ground zones (sc.zones with an owner), their tweens (a leap, a
// charge: any tween whose target is an enemy) and their delayed blows (enemyTimer). The player's own tweens, the fx and the
// weather zones keep full speed. warpWorld runs as a ticker just before the zones tick (features/combatHooks.js).
// per map (scene fields are cleared on every map load): the enemy timers and the tweens the warp has slowed
export function enemyTimer(sc, ms, fn) { const ev = sc.time.delayedCall(ms, fn); ev.timeScale = warpK(sc); (sc.warpTimers ||= new Set()).add(ev); return ev; }
const isFoe = (sc, o) => !!o && (o.isBoss || (!!o.cfg && sc.enemies?.contains?.(o)));
export function warpWorld(sc, dt) {
  const k = warpK(sc), tweened = (sc.warpTweens ||= new Set());
  // zones tick with the world's dt; give an enemy zone back the part of the frame the warp takes away
  if (k !== 1) for (const z of sc.zones || []) if (z.owner) z.t += dt * (1 - k);
  if (k !== 1) for (const tw of sc.tweens.getTweens()) if (tw.targets?.some((o) => isFoe(sc, o))) { tw.timeScale = k; tweened.add(tw); }
  if (k === 1 && tweened.size) { for (const tw of tweened) tw.timeScale = 1; tweened.clear(); }
  for (const ev of sc.warpTimers || []) { if (ev.hasDispatched) sc.warpTimers.delete(ev); else ev.timeScale = k; }
}
