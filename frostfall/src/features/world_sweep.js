// World sweep: small fixes found while looking at every map.
import { registerListener } from '../scenes/gameHooks.js';
import { TUNE } from '../data/tuning.js';

// A room smaller than the screen (the cottage, the lodge, the shop) used to sit in the top-left corner, half under the
// health bars, with the rest of the screen empty. Its camera bounds now grow evenly round it, so it sits in the middle.
export function centerSmallMap(sc) {
  const cam = sc.cameras?.main;
  if (!cam || !sc.worldW || !sc.worldH) return;
  const vw = cam.width / cam.zoom, vh = cam.height / cam.zoom;
  if (sc.worldW >= vw && sc.worldH >= vh) return;
  const w = Math.max(sc.worldW, vw), h = Math.max(sc.worldH, vh);
  cam.setBounds(Math.round((sc.worldW - w) / 2), Math.round((sc.worldH - h) / 2), w, h);
}
registerListener('scene:game', (sc) => centerSmallMap(sc));

// Arriving in a region shows its title card across the middle of the screen; the landmark sightings (world/discovery.js)
// wait until it has gone instead of stacking toasts under it.
registerListener('scene:game', (sc) => { sc.sightHoldUntil = sc.time.now + TUNE.sweep.sightDelay * 1000; });
