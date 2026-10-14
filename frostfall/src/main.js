import Phaser from 'phaser';
import { W, H } from './config.js';
import { installKeys, keys } from './systems/keys.js';
import { S, resetState, loadInto } from './systems/state.js';
import BootScene from './scenes/BootScene.js';
import TitleScene from './scenes/TitleScene.js';
import { ArenaSetupScene, ArenaResultsScene } from './arena/ArenaScenes.js';
import GameScene from './scenes/GameScene.js';
import HudScene from './scenes/HudScene.js';
import MenuScene from './scenes/MenuScene.js';
import ShopScene from './scenes/ShopScene.js';
import IntroScene from './scenes/IntroScene.js';
import EndingScene from './scenes/EndingScene.js';
import { wireQuests } from './systems/quests.js';
import { unlock, setHidden } from './audio/sfx.js';
import { saveGame, probeStorage } from './systems/save.js';
import { ui } from './systems/ui.js';
import { settings } from './systems/settings.js';
import { installTouch } from './ui/touch.js';
import { loadPack } from './data/registry.js';
import { TIER_MOBS } from './world/worldgen.js';
import { installErrorLog, guardGame } from './systems/debug.js';
import { updateRotate, rotated } from './systems/rotate.js';
import { applyCvd } from './systems/access.js';
installErrorLog();

const q = new URLSearchParams(location.search);

const game = new Phaser.Game({
  type: q.get('renderer') === 'canvas' ? Phaser.CANVAS : Phaser.AUTO,
  width: W,
  height: H,
  parent: 'game',
  backgroundColor: '#0b0e1a',
  pixelArt: true,
  antialias: false,
  roundPixels: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { debug: q.get('physics') === '1' } },
  audio: { noAudio: true },                  // all sound is our own Web Audio synth (audio/sfx.js): no second, idle AudioContext
  scene: [BootScene, TitleScene, ArenaSetupScene, ArenaResultsScene, IntroScene, GameScene, HudScene, MenuScene, ShopScene, EndingScene],
});

guardGame(Phaser, game);
installKeys(game);
installTouch();

// Integer (pixel-perfect) scaling option: whole-number zoom with letterboxing.
export function applyScaling() {
  const sc = game.scale;
  if (rotated()) {
    // turned sideways: Phaser's FIT cannot measure a rotated parent, so size the canvas ourselves and let the flex box centre it
    const z = Math.min(window.innerHeight / W, window.innerWidth / H);
    sc.autoCenter = Phaser.Scale.NO_CENTER;
    sc.scaleMode = Phaser.Scale.NONE;
    const zz = settings.intScale ? Math.max(1, Math.floor(z)) : z;
    sc.setZoom(zz);
    sc.canvas.style.width = Math.round(W * zz) + 'px'; sc.canvas.style.height = Math.round(H * zz) + 'px';
    sc.canvas.style.marginLeft = sc.canvas.style.marginTop = '0px';
    return;
  }
  sc.autoCenter = Phaser.Scale.CENTER_BOTH;
  if (settings.intScale) {
    const [vw, vh] = rotated() ? [window.innerHeight, window.innerWidth] : [window.innerWidth, window.innerHeight];
    const z = Math.max(1, Math.floor(Math.min(vw / W, vh / H)));
    sc.setGameSize(W, H);
    sc.scaleMode = Phaser.Scale.NONE;
    sc.setZoom(z);
  } else {
    sc.setZoom(1);
    sc.scaleMode = Phaser.Scale.FIT;
    sc.refresh();
  }
}
window.addEventListener('resize', () => { settings.intScale && applyScaling(); updateRotate(applyScaling); });
window.addEventListener('orientationchange', () => setTimeout(() => updateRotate(applyScaling), 200));
setInterval(() => updateRotate(applyScaling), 300);
window.__updateRotate = () => updateRotate(applyScaling);
game.events.once('ready', () => applyScaling());
window.__applyScaling = applyScaling;
applyCvd();
probeStorage();
// Audio may only start inside a user gesture; iOS ignores pointerdown from touch, so listen to the release events as well.
for (const ev of ['keydown', 'pointerdown', 'pointerup', 'touchend', 'click']) window.addEventListener(ev, unlock, { passive: true });
// Alt-tabbing away opens the pause menu so you never get ambushed.
const pauseIfPlaying = () => {
  const gs = game.scene.getScene('Game');
  if (gs && game.scene.isActive('Game') && !ui.modal && gs.player?.mode === 'free') gs.openMenu(-1, 'SYSTEM');
};
window.addEventListener('blur', pauseIfPlaying);
// A quiet save (keeping your position) whenever the page may be about to disappear: tab hidden, app switched, tab closed.
const quietSave = () => {
  const gs = game.scene.getScene('Game');
  if (gs && game.scene.isActive('Game') && gs.safeToSave?.()) saveGame(gs, { quiet: true });
};
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { quietSave(); pauseIfPlaying(); setHidden(true); } else setHidden(false);
});
window.addEventListener('pagehide', quietSave);
wireQuests();

// Handy handle for the console and the automated tests.
window.__ff = { game, S, keys, resetState, loadInto, loadPack: (pack) => loadContentPack(pack) };
// ?pack=<url> loads a JSON content pack (see src/data/registry.js) before the world is built
function loadContentPack(pack) {
  const r = loadPack(pack, TIER_MOBS);
  console.log(`[pack ${r.name}] added ${r.added.length}, rejected ${r.rejected.length}`, r.rejected.length ? r.rejected : '');
  return r;
}
const packUrl = new URLSearchParams(location.search).get('pack');
if (packUrl) fetch(packUrl).then((r) => r.json()).then(loadContentPack).catch((e) => console.warn('pack failed', e));

// Offline play: a tiny service worker (public/sw.js) keeps the game in the browser after the first visit. Quietly skipped when the
// page is not served over http(s) (a single-file copy, a sandboxed frame) or while developing.
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !import.meta.env.DEV && window.top === window) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
