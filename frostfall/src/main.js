import Phaser from 'phaser';
import { W, H, BUILD } from './config.js';
import { installKeys, keys, setMenuMode, onPadChange } from './systems/keys.js';
import { bus } from './systems/bus.js';
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
import { setContrast } from './art/font.js';
import { installTouch } from './ui/touch.js';
import { loadPack } from './data/registry.js';
import { TIER_MOBS } from './world/worldgen.js';
import { installErrorLog, guardGame, onCrash } from './systems/debug.js';
import { showCrash } from './ui/crash.js';
import { installDepthGuard, installPhysicsClamp, applyFpsCap, installFontGuard } from './systems/perf.js';
import { updateRotate, rotated } from './systems/rotate.js';
import { applyCvd } from './systems/access.js';
setContrast(settings.highContrast);      // high contrast lifts dim text everywhere
installErrorLog();
onCrash(showCrash);
installDepthGuard(Phaser);
installPhysicsClamp(Phaser);
installFontGuard(Phaser);

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
  physics: { default: 'arcade', arcade: { debug: q.get('physics') === '1', fixedStep: false } },
  fps: settings.fpsCap > 0 ? { limit: settings.fpsCap } : {},
  render: { powerPreference: 'low-power' },  // a 320x180 picture never needs the big GPU (battery on laptops)
  audio: { noAudio: true },                  // all sound is our own Web Audio synth (audio/sfx.js): no second, idle AudioContext
  scene: [BootScene, TitleScene, ArenaSetupScene, ArenaResultsScene, IntroScene, GameScene, HudScene, MenuScene, ShopScene, EndingScene],
});

guardGame(Phaser, game);
window.__applyFps = () => applyFpsCap(game, settings.fpsCap);
// "a menu has the keys": anything but free play in the game world (title, pause menu, shops, dialogue, cut scenes)
setMenuMode(() => ui.modal || !game.scene.isActive('Game') || game.scene.isPaused('Game') || game.scene.isActive('Menu') || game.scene.isActive('Shop'));
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
window.addEventListener('resize', () => { settings.intScale && applyScaling(); updateRotate(applyScaling); setTimeout(() => updateRotate(applyScaling), 200); });   // again after Phaser's own resize pass
window.addEventListener('orientationchange', () => setTimeout(() => updateRotate(applyScaling), 200));
// no polling: the picture is re-fitted when the window, the orientation or the device in use changes
onPadChange((on) => { updateRotate(applyScaling); document.body.classList.toggle('pad', on); });
try { matchMedia('(orientation: portrait)').addEventListener('change', () => updateRotate(applyScaling)); } catch { /* old browser */ }
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
bus.on('pad:lost', pauseIfPlaying);           // a controller dropped out mid-fight: stop the world until you are back
// A quiet save (keeping your position) whenever the page may be about to disappear: tab hidden, app switched, tab closed.
const quietSave = () => {
  const gs = game.scene.getScene('Game');
  if (gs && game.scene.isActive('Game') && gs.safeToSave?.()) saveGame(gs, { quiet: true });
};
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { quietSave(); pauseIfPlaying(); setHidden(true); } else setHidden(false);
});
window.addEventListener('pagehide', quietSave);

// Fullscreen: say so when the browser or the frame cannot (iPhone Safari, the artifact frame); on phones lock landscape.
game.events.once('ready', () => {
  const sc = game.scale;
  sc.on('fullscreenunsupported', () => bus.emit('toast', 'FULLSCREEN IS NOT AVAILABLE HERE. ADD THE GAME TO YOUR HOME SCREEN', 11));
  sc.on('fullscreenfailed', () => bus.emit('toast', 'FULLSCREEN WAS BLOCKED BY THE BROWSER', 11));
  sc.on('enterfullscreen', () => { try { screen.orientation?.lock?.('landscape').catch(() => {}); } catch { /* not supported */ } });
});

// Keep the screen awake while playing (a phone with a controller gets no touches, so it would dim and lock).
let wake = null;
const wantWake = () => game.scene.isActive('Game') && !document.hidden;
async function syncWake() {
  try {
    if (wantWake() && !wake && navigator.wakeLock) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); }
    else if (!wantWake() && wake) { await wake.release(); wake = null; }
  } catch { wake = null; }                     // refused (battery saver, iframe): nothing to do
}
document.addEventListener('visibilitychange', syncWake);
bus.on('scene:game', syncWake); bus.on('scene:title', syncWake);
wireQuests();

// Handy handle for the console and the automated tests.
window.__ff = { game, S, keys, resetState, loadInto, build: BUILD, loadPack: (pack) => loadContentPack(pack) };
// ?pack=<url> loads a JSON content pack (see src/data/registry.js) before the world is built
function loadContentPack(pack) {
  const r = loadPack(pack, TIER_MOBS);
  console.log(`[pack ${r.name}] added ${r.added.length}, rejected ${r.rejected.length}`, r.rejected.length ? r.rejected : '');
  return r;
}
const packUrl = new URLSearchParams(location.search).get('pack');
// only packs from this same site (or any while developing): a shared link must not be able to change someone's game
const packOk = (u) => { try { return import.meta.env.DEV || new URL(u, location.href).origin === location.origin; } catch { return false; } };
if (packUrl && !packOk(packUrl)) console.warn('pack ignored: not from this site', packUrl);
else if (packUrl) fetch(packUrl).then((r) => r.json()).then(loadContentPack).catch((e) => console.warn('pack failed', e));

// Offline play + updates: public/sw.js keeps the game in the browser (see docs/PUBLISHING.md). Skipped off http(s), in frames, in dev.
// When a newer build is waiting, a button offers to reload into it (saving first).
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !import.meta.env.DEV && window.top === window) {
  const askBuild = (w) => new Promise((res) => {
    const ch = new MessageChannel();
    ch.port1.onmessage = (e) => res(e.data && e.data.build);
    w.postMessage({ type: 'GET_BUILD' }, [ch.port2]);
    setTimeout(() => res(null), 3000);
  });
  const showUpdateToast = (worker) => {
    if (document.getElementById('ff-update')) return;
    const b = document.createElement('button');
    b.id = 'ff-update'; b.type = 'button'; b.textContent = 'UPDATE READY - SAVE AND RELOAD';
    b.style.cssText = 'position:fixed;left:50%;bottom:max(12px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:40;'
      + 'font:700 12px/1 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.1em;color:#0b0e1a;background:#f4d460;border:0;padding:10px 16px;cursor:pointer';
    b.addEventListener('click', () => { quietSave(); window.__ffReloadOnSwap = true; b.disabled = true; b.textContent = 'UPDATING...'; worker.postMessage({ type: 'SKIP_WAITING' }); });
    document.body.appendChild(b);
  };
  const offer = (w) => {
    if (!w) return;
    const ready = () => {
      if (w.state !== 'installed' || !navigator.serviceWorker.controller) return;
      w.removeEventListener('statechange', ready);
      askBuild(w).then((b) => (b === BUILD ? w.postMessage({ type: 'SKIP_WAITING' }) : showUpdateToast(w)));
    };
    ready(); w.addEventListener('statechange', ready);
  };
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (window.__ffReloadOnSwap) { window.__ffReloadOnSwap = false; location.reload(); } });
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').then((reg) => {
    offer(reg.waiting);
    reg.addEventListener('updatefound', () => offer(reg.installing));
    setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);   // long sessions notice new builds too
  }).catch(() => {}));
}
