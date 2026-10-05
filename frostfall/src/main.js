import Phaser from 'phaser';
import { W, H } from './config.js';
import { installKeys, keys } from './systems/keys.js';
import { S } from './systems/state.js';
import BootScene from './scenes/BootScene.js';
import TitleScene from './scenes/TitleScene.js';
import GameScene from './scenes/GameScene.js';
import HudScene from './scenes/HudScene.js';

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
  scene: [BootScene, TitleScene, GameScene, HudScene],
});

installKeys(game);

// Handy handle for the console and the automated tests.
window.__ff = { game, S, keys };
