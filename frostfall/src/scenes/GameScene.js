import Phaser from 'phaser';
import { T, SOLID_TILES, C, W, H } from '../config.js';
import { MAPS } from '../data/maps.js';
import { S } from '../systems/state.js';
import { ui } from '../systems/ui.js';
import { SnowFx } from '../art/snow.js';
import Player from '../entities/Player.js';

export default class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) {
    this.mapId = data.map || S.map;
    this.spawnName = data.spawn || S.spawn || 'start';
    this.startPos = data.pos || null;
  }

  create() {
    ui.modal = false;
    const def = this.def = MAPS[this.mapId];
    const built = this.built = def.build();
    S.map = this.mapId;
    this.cameras.main.setBackgroundColor(C[0]);

    // --- tilemap (collision from the solid tile list)
    const map = this.make.tilemap({ data: built.grid, tileWidth: T, tileHeight: T });
    const ts = map.addTilesetImage('tiles', 'tiles', T, T, 0, 0);
    this.layer = map.createLayer(0, ts, 0, 0);
    this.layer.setCollision(SOLID_TILES);
    this.worldW = built.w * T;
    this.worldH = built.h * T;
    this.physics.world.setBounds(0, 0, this.worldW, this.worldH);

    // --- spawn points
    const sp = built.entities.find((e) => e.t === 'spawn' && e.name === this.spawnName)
      || built.entities.find((e) => e.t === 'spawn');
    const px = this.startPos ? this.startPos.x : (sp.x + 0.5) * T;
    const py = this.startPos ? this.startPos.y : (sp.y + 0.5) * T;

    this.player = new Player(this, px, py);
    this.physics.add.collider(this.player, this.layer);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.worldW, this.worldH);
    cam.startFollow(this.player, true, 0.14, 0.14);
    cam.roundPixels = true;

    this.snow = def.snow ? new SnowFx(this, 55) : null;
    this.scene.launch('Hud');
    this.events.once('shutdown', () => { this.snow?.destroy(); });
  }

  update(time, ms) {
    const dt = Math.min(ms, 50) / 1000;
    if (ui.modal) { this.physics.world.pause(); return; }
    this.physics.world.resume();
    S.playtime += dt;
    this.player.update(dt);
    this.snow?.update(dt);
  }
}
