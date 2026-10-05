import { S } from '../systems/state.js';
import { bus } from '../systems/bus.js';
import { say, choose, runScript } from '../systems/dialogue.js';
import { saveGame } from '../systems/save.js';
import { sfx } from '../audio/sfx.js';
import Phaser from 'phaser';
import { addItem } from '../systems/inventory.js';
import { LORE } from '../data/lore.js';
import { tip } from '../systems/tips.js';
import { brewMenu } from '../data/services.js';
import { C } from '../config.js';

// A readable wooden sign.
export class Sign extends Phaser.GameObjects.Image {
  constructor(scene, x, y, lines) {
    super(scene, x, y, 'sign');
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.body.setSize(8, 6).setOffset(4, 9);
    this.ix = x; this.iy = y;
    this.lines = lines;
    this.setDepth(y + 6);
    scene.add.image(x, y + 7, 'shadow').setDepth(y + 5).setScale(0.7);
  }
  canInteract() { return true; }
  label() { return 'E: READ'; }
  async interact() {
    await runScript(async () => { for (const l of this.lines) await say('SIGN', l); });
  }
}

// Sit by a campfire: restore everything and save.
export class RestSpot {
  constructor(scene, x, y) {
    this.scene = scene; this.ix = x; this.iy = y;
  }
  canInteract() {
    const sc = this.scene;
    return !sc.enemies.getChildren().some((e) => e.alerted && !e.dead);
  }
  label() { return 'E: REST'; }
  async interact() {
    const sc = this.scene, cam = sc.cameras.main;
    await runScript(async () => {
      sfx.play('select');
      await new Promise((r) => { cam.once('camerafadeoutcomplete', r); cam.fadeOut(600, 11, 14, 26); });
      S.hp = S.maxHp; S.mp = S.maxMp; S.sp = S.maxSp;
      sc.player.invuln = 0.5;
      await sc.delay(500);
      S.respawn = { map: sc.mapId, x: Math.round(sc.player.x), y: Math.round(sc.player.y) };
      saveGame(sc);
      bus.emit('toast', 'RESTED BY THE FIRE', 12);
      tip('rest');
      await new Promise((r) => { cam.once('camerafadeincomplete', r); cam.fadeIn(600, 11, 14, 26); });
      sfx.play('potion');
      sc.fx.puff(sc.player.x, sc.player.y, 12, 8, 30, 0.6, -20);
    });
  }
}

// Decorative solid prop (anvil, table...).
export class Prop extends Phaser.GameObjects.Image {
  constructor(scene, x, y, tex, body = [12, 8, 2, 7]) {
    super(scene, x, y, tex);
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.body.setSize(body[0], body[1]).setOffset(body[2], body[3]);
    this.setDepth(y + 6);
    scene.add.image(x, y + 7, 'shadow').setDepth(y + 5).setScale(0.9);
  }
}

// A plant you can pick for alchemy.
export class Herb extends Phaser.GameObjects.Image {
  constructor(scene, x, y, item) {
    super(scene, x, y, item === 'snowberry' ? 'herb_berry' : 'herb_lily');
    scene.add.existing(this);
    this.item = item; this.ix = x; this.iy = y;
    this.setDepth(y + 4);
    this.gone = false;
  }
  canInteract() { return !this.gone; }
  label() { return 'E: GATHER'; }
  interact() {
    this.gone = true;
    addItem(this.item);
    sfx.play('pickup');
    this.scene.fx.puff(this.x, this.y, this.item === 'snowberry' ? 11 : 15, 6, 30, 0.4);
    this.scene.interactables = this.scene.interactables.filter((i) => i !== this);
    this.destroy();
  }
}

// Enter a building / go through a door by pressing E.
export class Door {
  constructor(scene, x, y, e) { this.scene = scene; this.ix = x; this.iy = y; this.e = e; }
  canInteract() { return true; }
  label() { return this.e.label || 'E: ENTER'; }
  interact() { this.scene.changeMap(this.e.to, this.e.spawn, 'door'); }
}

// A readable book / bookshelf. Learning it adds an entry to the Lore tab.
export class Lore extends Phaser.GameObjects.Image {
  constructor(scene, x, y, e) {
    super(scene, x, y, e.tex || 'book');
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.body.setSize(12, 8).setOffset(2, 7);
    this.ix = x; this.iy = y; this.id = e.id;
    this.setDepth(y + 6);
  }
  canInteract() { return true; }
  label() { return S.lore[this.id] ? 'E: REREAD' : 'E: READ'; }
  async interact() {
    const b = LORE[this.id];
    const first = !S.lore[this.id];
    S.lore[this.id] = true;
    if (first) { bus.emit('toast', 'NEW LORE: ' + b.title.toUpperCase(), 15); sfx.play('quest'); }
    await runScript(async () => { for (const l of b.text) await say(b.title, l); });
  }
}

// Sleep in a bed: heals, saves, sets your respawn point and skips to morning.
export class Bed {
  constructor(scene, x, y) { this.scene = scene; this.ix = x; this.iy = y; }
  canInteract() { return !this.scene.enemies.getChildren().some((e) => e.alerted && !e.dead); }
  label() { return 'E: SLEEP'; }
  async interact() {
    const sc = this.scene, cam = sc.cameras.main;
    await runScript(async () => {
      const c = await choose(['Sleep until morning', 'Cancel']);
      if (c !== 0) return;
      await new Promise((r) => { cam.once('camerafadeoutcomplete', r); cam.fadeOut(900, 0, 0, 0); });
      S.hp = S.maxHp; S.mp = S.maxMp; S.sp = S.maxSp;
      S.time = (S.time >= 7 * 60 ? S.time + (1440 - S.time) : 0) + 7 * 60; S.time %= 1440;
      S.respawn = { map: sc.mapId, x: Math.round(sc.player.x), y: Math.round(sc.player.y) };
      saveGame(sc);
      await sc.delay(700);
      bus.emit('toast', 'YOU SLEPT WELL. GAME SAVED', 13);
      await new Promise((r) => { cam.once('camerafadeincomplete', r); cam.fadeIn(900, 0, 0, 0); });
    });
  }
}

// An alchemy station (the cauldron in the lodge).
export class Cauldron {
  constructor(scene, x, y) { this.scene = scene; this.ix = x; this.iy = y; }
  canInteract() { return true; }
  label() { return 'E: BREW'; }
  async interact() {
    await runScript(async () => {
      if (!S.flags.alchemy) { await say('Cauldron', 'You do not know how to brew yet. Mirra teaches alchemy to anyone who brings her herbs.'); return; }
      await brewMenu('Cauldron');
    });
  }
}
