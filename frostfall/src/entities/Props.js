import { S } from '../systems/state.js';
import { bus } from '../systems/bus.js';
import { say } from '../systems/dialogue.js';
import { runScript } from '../systems/dialogue.js';
import { saveGame } from '../systems/save.js';
import { sfx } from '../audio/sfx.js';
import Phaser from 'phaser';
import { addItem } from '../systems/inventory.js';

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
      saveGame(sc);
      bus.emit('toast', 'RESTED BY THE FIRE', 12);
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
