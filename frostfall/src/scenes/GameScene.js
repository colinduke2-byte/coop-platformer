import Phaser from 'phaser';
import { T, SOLID_TILES, C } from '../config.js';
import { MAPS } from '../data/maps.js';
import { ITEMS } from '../data/items.js';
import { S, resetState } from '../systems/state.js';
import { bus } from '../systems/bus.js';
import { ui } from '../systems/ui.js';
import { recalc } from '../systems/stats.js';
import { bonus } from '../systems/skills.js';
import { SnowFx } from '../art/snow.js';
import { Fx } from '../art/fx.js';
import Player from '../entities/Player.js';
import Enemy from '../entities/Enemy.js';
import { P } from '../entities/Player.js';

export default class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) {
    this.mapId = data.map || S.map;
    this.spawnName = data.spawn || S.spawn || 'start';
    this.startPos = data.pos || null;
    this.opts = data;
  }

  create() {
    ui.modal = false;
    this.items = ITEMS;
    this.hitStopT = 0;
    this.deadT = 0;
    this.listeners = [];
    const def = this.def = MAPS[this.mapId];
    const built = this.built = def.build();
    S.map = this.mapId;
    recalc();
    this.cameras.main.setBackgroundColor(C[0]);

    // --- tilemap (collision from the solid tile list)
    const map = this.make.tilemap({ data: built.grid, tileWidth: T, tileHeight: T });
    const ts = map.addTilesetImage('tiles', 'tiles', T, T, 0, 0);
    this.layer = map.createLayer(0, ts, 0, 0);
    this.layer.setCollision(SOLID_TILES);
    this.solid = built.grid.map((row) => row.map((t) => SOLID_TILES.includes(t)));
    this.worldW = built.w * T;
    this.worldH = built.h * T;
    this.physics.world.setBounds(0, 0, this.worldW, this.worldH);

    this.fx = new Fx(this);
    this.enemies = this.physics.add.group();
    this.shots = this.physics.add.group({ allowGravity: false });
    this.eshots = this.physics.add.group({ allowGravity: false });
    this.barGfx = this.add.graphics().setDepth(99200);

    // --- spawn points
    const sp = built.entities.find((e) => e.t === 'spawn' && e.name === this.spawnName)
      || built.entities.find((e) => e.t === 'spawn');
    const px = this.startPos ? this.startPos.x : (sp.x + 0.5) * T;
    const py = this.startPos ? this.startPos.y : (sp.y + 0.5) * T;

    this.player = new Player(this, px, py);
    this.physics.add.collider(this.player, this.layer);
    this.physics.add.collider(this.enemies, this.layer);
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.collider(this.shots, this.layer, (sh) => sh.wall());
    this.physics.add.collider(this.eshots, this.layer, (sh) => sh.wall());
    this.physics.add.overlap(this.shots, this.enemies, (sh, en) => sh.hitEnemy(en));
    this.physics.add.overlap(this.eshots, this.player, (a, b) => {
      const sh = a.enemyOwned ? a : b;
      sh.hitPlayer(this.player);
    });

    for (const e of built.entities) this.spawnEntity(e);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.worldW, this.worldH);
    cam.startFollow(this.player, true, 0.14, 0.14);
    cam.roundPixels = true;
    cam.fadeIn(350, 11, 14, 26);

    this.snow = def.snow ? new SnowFx(this, 55) : null;
    this.on('player:dead', () => { this.deadT = 0.001; });
    if (!this.scene.isActive('Hud')) this.scene.launch('Hud');
    this.events.once('shutdown', () => {
      this.snow?.destroy();
      this.fx.clear();
      this.listeners.forEach(([ev, fn]) => bus.off(ev, fn));
    });
  }

  on(ev, fn) { bus.on(ev, fn); this.listeners.push([ev, fn]); }

  spawnEntity(e) {
    const wx = (e.x + 0.5) * T, wy = (e.y + 0.5) * T;
    switch (e.t) {
      case 'enemy': this.enemies.add(new Enemy(this, wx, wy, e.kind)); break;
      default: break;
    }
  }

  // ------------------------------------------------------------ helpers
  hitStop(s) { this.hitStopT = Math.max(this.hitStopT, s); }
  shake(ms, amt) { this.cameras.main.shake(ms, amt); }

  solidAt(px, py) {
    const x = Math.floor(px / T), y = Math.floor(py / T);
    return this.solid[y]?.[x] ?? true;
  }

  // Tile-based line of sight (trees and walls block it).
  hasLOS(ax, ay, bx, by) {
    const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 6);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      if (this.solidAt(ax + (bx - ax) * t, ay + (by - ay) * t)) return false;
    }
    return true;
  }

  // Line is clear for a body ~8px wide (centre ray + two side rays).
  clearLine(ax, ay, bx, by, half = 4) {
    const l = Math.hypot(bx - ax, by - ay) || 1;
    const nx = -(by - ay) / l * half, ny = (bx - ax) / l * half;
    return this.hasLOS(ax, ay, bx, by) && this.hasLOS(ax + nx, ay + ny, bx + nx, by + ny) && this.hasLOS(ax - nx, ay - ny, bx - nx, by - ny);
  }

  // BFS on the tile grid; returns the next point to steer toward, or null.
  nextWaypoint(ax, ay, bx, by) {
    const w = this.built.w, h = this.built.h;
    const sx = Phaser.Math.Clamp(Math.floor(ax / T), 0, w - 1), sy = Phaser.Math.Clamp(Math.floor(ay / T), 0, h - 1);
    let gx = Phaser.Math.Clamp(Math.floor(bx / T), 0, w - 1), gy = Phaser.Math.Clamp(Math.floor(by / T), 0, h - 1);
    const free = (x, y) => x >= 0 && y >= 0 && x < w && y < h && !this.solid[y][x];
    if (!free(gx, gy)) {
      let found = false;
      for (let r = 1; r < 3 && !found; r++) for (let dy = -r; dy <= r && !found; dy++) for (let dx = -r; dx <= r && !found; dx++) {
        if (free(gx + dx, gy + dy)) { gx += dx; gy += dy; found = true; }
      }
      if (!found) return null;
    }
    const prev = new Int32Array(w * h).fill(-2);
    const q = [sy * w + sx];
    prev[q[0]] = -1;
    const goal = gy * w + gx;
    let qi = 0, hit = false;
    while (qi < q.length && q.length < 2500) {
      const cur = q[qi++];
      if (cur === goal) { hit = true; break; }
      const cx = cur % w, cy = (cur / w) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cx + dx, ny = cy + dy;
        if (!free(nx, ny) || prev[ny * w + nx] !== -2) continue;
        if (dx && dy && (!free(cx + dx, cy) || !free(cx, cy + dy))) continue;
        prev[ny * w + nx] = cur; q.push(ny * w + nx);
      }
    }
    if (!hit) return null;
    const path = [];
    for (let c = goal; c !== -1; c = prev[c]) path.push(c);
    path.reverse(); // start..goal
    let best = path[Math.min(1, path.length - 1)];
    for (let i = 1; i < Math.min(path.length, 8); i++) {
      const px = (path[i] % w + 0.5) * T, py = (((path[i] / w) | 0) + 0.5) * T;
      if (this.clearLine(ax, ay, px, py, 3)) best = path[i];
    }
    return { x: (best % w + 0.5) * T, y: (((best / w) | 0) + 0.5) * T };
  }

  onEnemyKilled(enemy, info) { /* loot + quests: stage 4+ */ }

  drawBars() {
    const g = this.barGfx;
    g.clear();
    const pl = this.player;
    if (pl.drawing) {
      const k = Math.min(1, pl.drawT / (P.bow.fullDraw * bonus.drawTime()));
      const x = Math.round(pl.x - 8), y = Math.round(pl.y + 13);
      g.fillStyle(C[0]); g.fillRect(x - 1, y - 1, 18, 5);
      g.fillStyle(C[2]); g.fillRect(x, y, 16, 3);
      g.fillStyle(k >= 1 ? C[13] : C[12]); g.fillRect(x, y, Math.round(16 * k), 3);
    }
    for (const e of this.enemies.getChildren()) {
      if (e.dead || e.hp >= e.maxHp || e.isBoss) continue;
      const w = 14, x = Math.round(e.x - w / 2), y = Math.round(e.y - 14);
      g.fillStyle(C[0]); g.fillRect(x - 1, y - 1, w + 2, 4);
      g.fillStyle(C[1]); g.fillRect(x, y, w, 2);
      g.fillStyle(C[11]); g.fillRect(x, y, Math.max(1, Math.round((w * e.hp) / e.maxHp)), 2);
    }
  }

  update(time, ms) {
    const dt = Math.min(ms, 50) / 1000;
    if (ui.modal) { this.physics.world.pause(); return; }
    if (this.hitStopT > 0) { this.hitStopT -= dt; this.physics.world.pause(); return; }
    this.physics.world.resume();
    S.playtime += dt;
    this.player.update(dt);
    for (const e of this.enemies.getChildren()) e.update(dt, this.player);
    for (const sh of this.shots.getChildren()) sh.update(dt);
    for (const sh of this.eshots.getChildren()) sh.update(dt);
    this.fx.update(dt);
    this.snow?.update(dt);
    this.drawBars();
    if (this.deadT > 0) {
      this.deadT += dt;
      if (this.deadT > 2.4 && !this.respawning) this.respawn();
    }
  }

  respawn() {
    this.respawning = true;
    this.cameras.main.fadeOut(500, 11, 14, 26);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      S.hp = S.maxHp; S.mp = S.maxMp; S.sp = S.maxSp;
      S.gold = Math.floor(S.gold * 0.9);
      this.scene.restart({ map: 'village', spawn: 'start' });
    });
  }
}
