import Phaser from 'phaser';
import { W, H } from './config.js';
import { installKeys, keys } from './systems/keys.js';
import { S, resetState, loadInto } from './systems/state.js';
import BootScene from './scenes/BootScene.js';
import TitleScene from './scenes/TitleScene.js';
import GameScene from './scenes/GameScene.js';
import HudScene from './scenes/HudScene.js';
import MenuScene from './scenes/MenuScene.js';
import ShopScene from './scenes/ShopScene.js';
import IntroScene from './scenes/IntroScene.js';
import EndingScene from './scenes/EndingScene.js';
import { wireQuests } from './systems/quests.js';
import { unlock } from './audio/sfx.js';
import { ui } from './systems/ui.js';
import { settings } from './systems/settings.js';
import { installTouch } from './ui/touch.js';
import { loadPack } from './data/registry.js';
import { TIER_MOBS } from './world/worldgen.js';
import { installErrorLog } from './systems/debug.js';
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
  scene: [BootScene, TitleScene, IntroScene, GameScene, HudScene, MenuScene, ShopScene, EndingScene],
});

installKeys(game);
installTouch();

// Integer (pixel-perfect) scaling option: whole-number zoom with letterboxing.
export function applyScaling() {
  const sc = game.scale;
  if (settings.intScale) {
    const z = Math.max(1, Math.floor(Math.min(window.innerWidth / W, window.innerHeight / H)));
    sc.setGameSize(W, H);
    sc.scaleMode = Phaser.Scale.NONE;
    sc.setZoom(z);
  } else {
    sc.setZoom(1);
    sc.scaleMode = Phaser.Scale.FIT;
    sc.refresh();
  }
}
window.addEventListener('resize', () => settings.intScale && applyScaling());
game.events.once('ready', () => applyScaling());
window.__applyScaling = applyScaling;
applyCvd();
window.addEventListener('keydown', unlock);
window.addEventListener('pointerdown', unlock);
// Alt-tabbing away opens the pause menu so you never get ambushed.
window.addEventListener('blur', () => {
  const gs = game.scene.getScene('Game');
  if (gs && game.scene.isActive('Game') && !ui.modal && gs.player?.mode === 'free') gs.openMenu(-1, 'SYSTEM');
});
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
