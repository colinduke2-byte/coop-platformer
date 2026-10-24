// Danger marks (boss slams, tail rings, leap targets, ground bursts) drawn at their real size: one texture per radius, so
// their pixels sit on the same grid as everything else instead of a 64 px disc scaled by r / 32 (VX-11).
import { PAL } from '../config.js';

const WHITE = PAL[6];                     // the colour the old 'disc' / 'ring' textures were drawn in (they are tinted)

export function dangerKey(scene, r, ringOnly = false) {
  const R = Math.max(2, Math.round(r));
  const key = (ringOnly ? 'dz_ring_' : 'dz_disc_') + R;
  if (scene.textures.exists(key)) return key;
  const size = R * 2 + 1, th = R >= 24 ? 2 : 1;
  const ct = scene.textures.createCanvas(key, size, size), g = ct.getContext();
  g.fillStyle = WHITE;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - R, y - R);
      if (d <= R + 0.3 && (!ringOnly || d > R - th)) g.fillRect(x, y, 1, 1);
    }
  }
  ct.refresh();
  return key;
}

// A filled disc and its outline at (x, y), radius r: the pair every circular boss telegraph uses.
export function dangerMark(scene, x, y, r, tint, discAlpha, ringAlpha = 0.8) {
  const disc = scene.add.image(x, y, dangerKey(scene, r)).setTint(tint).setAlpha(discAlpha).setDepth(5);
  const ring = scene.add.image(x, y, dangerKey(scene, r, true)).setTint(tint).setAlpha(ringAlpha).setDepth(6);
  ring.ringy = true;
  return [disc, ring];
}
