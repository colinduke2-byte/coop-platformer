// Engine-level savings that every scene shares.

// setDepth() always asks the scene to re-sort its whole display list, even when the depth did not change. Standing
// characters, resting pickups and NPCs call it every frame, so a scene with ~1,200 objects was re-sorted every frame.
// Here a call that changes nothing (within half a pixel of y-based depth) does nothing.
export function installDepthGuard(Phaser) {
  const G = Phaser.GameObjects;
  for (const name of Object.keys(G)) {
    const proto = G[name]?.prototype;
    if (!proto || typeof proto.setDepth !== 'function' || proto.setDepth.__guarded) continue;
    const orig = proto.setDepth;
    const guarded = function (value) {
      if (value === this._depth || (value !== undefined && Math.abs(value - this._depth) < 0.5 && Math.abs(value) < 90000)) return this;
      return orig.call(this, value);
    };
    guarded.__guarded = true;
    proto.setDepth = guarded;
  }
}

// Physics runs on the real frame time (fixedStep off) so 120 / 144 Hz screens move bodies every frame instead of every
// other one. A long frame (a hitch, a background tab) is clamped to 50 ms so nothing can tunnel through a wall.
export function installPhysicsClamp(Phaser) {
  const World = Phaser.Physics?.Arcade?.World?.prototype;
  if (!World || World.update.__clamped) return;
  const up = World.update;
  World.update = function (time, delta) { return up.call(this, time, Math.min(delta, 50)); };
  World.update.__clamped = true;
}

// Frame-rate cap from settings (0 = match the screen). Changing it restarts the frame loop with the new pacing.
export function applyFpsCap(game, cap) {
  const loop = game.loop;
  const n = cap > 0 ? cap : 0;
  if (loop.fpsLimit === n) return;
  loop.fpsLimit = n; loop.hasFpsLimit = n > 0; loop._limitRate = n > 0 ? 1000 / n : 0;
  if (loop.running) { loop.sleep(); loop.wake(); }
}

// Off-screen culling for a scene's world-space images and sprites. Phaser only culls tilemaps; in the Hollow Reach
// ~1,190 of ~1,210 objects are off screen at any moment and were still batched every frame. Culled objects get the
// camera in their cameraFilter, which skips them in rendering without touching their own visible flag (so game code
// that hides or shows things keeps working). Checked every frame: moving objects are always right.
export function cullScene(scene, margin = 40) {
  const cam = scene.cameras.main;
  const v = cam.worldView;
  const x0 = v.x - margin, y0 = v.y - margin, x1 = v.right + margin, y1 = v.bottom + margin;
  const id = cam.id;
  const list = scene.children.list;
  let shown = 0;
  for (let i = 0; i < list.length; i++) {
    const o = list[i];
    const t = o.type;
    if ((t !== 'Image' && t !== 'Sprite') || o.scrollFactorX !== 1 || o.noCull) continue;
    const w = o.displayWidth, h = o.displayHeight;
    const left = o.x - w * o.originX, top = o.y - h * o.originY;
    const out = left > x1 || top > y1 || left + w < x0 || top + h < y0;
    if (out) { if (o.cameraFilter !== id) o.cameraFilter = id; } else { if (o.cameraFilter === id) o.cameraFilter = 0; shown++; }
  }
  return shown;
}
// true when the object is currently skipped by the main camera (its per-frame animation can wait)
export const culled = (o) => o.cameraFilter !== 0 && o.cameraFilter !== undefined;
