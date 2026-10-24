// VX-25: the intro ends in white, and the village fades in from that white (the snow the Dreamer wakes in) instead of
// from black. GameScene.startIntro starts a fade from black; this fade replaces it (a camera fadeIn always restarts).
// With FLASHES off it stays the gentle fade from black.
import { registerListener } from '../scenes/gameHooks.js';
import { settings } from '../systems/settings.js';
import { TUNE } from '../data/tuning.js';

export const SNOW_WHITE = [234, 242, 248];          // palette 6
registerListener('scene:game', (sc) => {
  if (!sc.opts?.intro || settings.flashes === false) return;
  sc.cameras.main.fadeIn(TUNE.hud.introWhiteIn, ...SNOW_WHITE);
});
