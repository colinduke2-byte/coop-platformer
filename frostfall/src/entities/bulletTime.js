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
