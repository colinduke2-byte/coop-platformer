import Phaser from 'phaser';
import { T, SOLID_TILES, C, TILE } from '../config.js';
const TILE_DOOR = TILE.DOOR, TILE_FLOOR = TILE.CFLOOR;
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
import Pickup from '../entities/Pickup.js';
import Chest from '../entities/Chest.js';
import Npc from '../entities/Npc.js';
import Boss from '../entities/Boss.js';
import { intro as introScript } from '../data/dialogue.js';
import { runScript } from '../systems/dialogue.js';
import { keys } from '../systems/keys.js';
import { txtS } from '../art/font.js';
import { sfx, music } from '../audio/sfx.js';
import { randInt, rand, dist } from '../util.js';

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
    this.pickups = [];
    this.interactables = [];
    this.chestBodies = null;
    this.npcBodies = null;
    this.npcs = [];
    this.boss = null;
    this.gate = null;
    this.exits = [];
    this.flames = [];
    this.lights = [];
    this.target = null;
    this.t = 0;
    this.leaving = false;
    this.promptTxt = txtS(this, 0, 0, '', 6, 0).setDepth(99400).setVisible(false);

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
    if (this.npcBodies) { this.physics.add.collider(this.player, this.npcBodies); this.physics.add.collider(this.enemies, this.npcBodies); }
    if (this.chestBodies) { this.physics.add.collider(this.player, this.chestBodies); this.physics.add.collider(this.enemies, this.chestBodies); }
    if (def.dim) this.add.rectangle(0, 0, 320, 180, 0x0b0e1a, def.dim).setOrigin(0).setScrollFactor(0).setDepth(99800);
    music.play(def.music || 'village');
    if (def.crypt) {
      S.flags.crypt = true;
      if (S.flags.bossDead && S.quests.king.status === 'active' && !S.inv.frostheart) {
        this.pickups.push(new Pickup(this, 15.5 * T, 5.5 * T, { type: 'item', id: 'frostheart', big: true }));
      }
    }
    bus.emit('area', def.name);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.worldW, this.worldH);
    cam.startFollow(this.player, true, 0.14, 0.14);
    cam.roundPixels = true;
    cam.fadeIn(350, 11, 14, 26);

    this.snow = def.snow ? new SnowFx(this, 55) : null;
    this.on('player:dead', () => { this.deadT = 0.001; });
    this.on('ending', (kind) => { this.pendingEnding = kind; });
    this.events.on('ending-done', () => { this.applyEnding(); });
    this.applyEnding();
    if (this.opts.intro) this.startIntro();
    this.on('levelup', (skill, lv) => {
      sfx.play('levelup');
      this.fx.ring(this.player.x, this.player.y + 4, 0.8, 0.6, 'ring', 0xf4d460);
      this.fx.puff(this.player.x, this.player.y, 13, 14, 55, 0.7, -20);
    });
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
      case 'enemy': this.addEnemy(e.kind, wx, wy); break;
      case 'chest': { const c = new Chest(this, wx, wy, e); this.interactables.push(c); this.chestBodies = (this.chestBodies || this.physics.add.staticGroup()); this.chestBodies.add(c); break; }
      case 'npc': {
        let ax = wx, ay = wy;
        if (e.id === 'sigrid' && this.opts.intro) { ax = 21.5 * T; ay = 15.5 * T; }
        const n = new Npc(this, ax, ay, e.id);
        n.home = { x: wx, y: wy };
        this.npcs.push(n); this.interactables.push(n);
        if (!this.npcBodies) this.npcBodies = this.physics.add.staticGroup();
        this.npcBodies.add(n);
        break;
      }
      case 'boss':
        if (!S.flags.bossDead) {
          this.boss = new Boss(this, wx, wy);
          this.enemies.add(this.boss);
        }
        break;
      case 'bossgate': this.gate = { x: e.x, y: e.y, w: e.w, closed: false }; break;
      case 'pickup': this.pickups.push(new Pickup(this, wx, wy, e.spec)); break;
      case 'exit': this.exits.push({ ...e, rect: new Phaser.Geom.Rectangle(e.x * T, e.y * T, e.w * T, e.h * T) }); break;
      case 'fire': {
        const f = this.add.image(wx, wy - 3, 'flame0').setDepth(wy + 12);
        this.flames.push({ f, ph: Math.random() * 3 });
        break;
      }
      case 'glow': {
        const l = this.add.image(wx, wy, 'glow').setTint(C[e.col ?? 12]).setBlendMode(Phaser.BlendModes.ADD).setScale(e.r / 32).setAlpha(0.5).setDepth(99900);
        this.lights.push({ l, base: 0.5, ph: Math.random() * 6 });
        break;
      }
      default: break;
    }
  }

  addEnemy(kind, wx, wy) {
    const en = new Enemy(this, wx, wy, kind);
    this.enemies.add(en);
    return en;
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

  setGate(closed) {
    if (!this.gate) return;
    this.gate.closed = closed;
    for (let i = 0; i < this.gate.w; i++) {
      const x = this.gate.x + i, y = this.gate.y;
      this.layer.putTileAt(closed ? TILE_DOOR : TILE_FLOOR, x, y);
      this.solid[y][x] = closed;
    }
    if (closed) { sfx.play('door'); this.shake(300, 0.01); }
  }

  summonAdds(boss) {
    for (const [x, y] of [[9, 5], [22, 5]]) {
      const en = this.addEnemy('draugr', (x + 0.5) * T, (y + 0.5) * T);
      en.alert(true);
      this.fx.puff(en.x, en.y, 15, 10, 50, 0.5);
    }
    sfx.play('nova');
  }

  onBossDeath(boss) {
    this.onEnemyKilled(boss);
    this.setGate(false);
    music.play('crypt');
    bus.emit('toast', 'THE HOLLOW KING FALLS', 13);
    this.time.delayedCall(1500, () => {
      if (!this.scene.isActive('Game')) return;
      sfx.play('levelup');
      this.fx.ring(boss.x, boss.y + 4, 2.5, 0.8, 'ring', 0x5cc8d8);
      this.pickups.push(new Pickup(this, boss.x, boss.y + 6, { type: 'item', id: 'frostheart', big: true }));
    });
  }

  onEnemyKilled(enemy) {
    const loot = enemy.cfg.loot;
    if (!loot) return;
    const at = (spec) => this.pickups.push(new Pickup(this, enemy.x + rand(-4, 4) * (enemy.isBoss ? 3 : 1), enemy.y + 2, enemy.isBoss ? { ...spec, big: true } : spec));
    const g = randInt(loot.gold[0], loot.gold[1]);
    // split gold into a few coins
    const coins = Math.min(3, g);
    for (let i = 0; i < coins; i++) at({ type: 'gold', n: Math.floor(g / coins) + (i === 0 ? g % coins : 0) });
    for (const [id, chance, range] of loot.drops) {
      if (Math.random() > chance) continue;
      if (id === 'arrows') at({ type: 'arrows', n: randInt(range[0], range[1]) });
      else at({ type: 'item', id, n: 1 });
    }
  }

  changeMap(to, spawn, sound = 'door') {
    if (this.leaving) return;
    this.leaving = true;
    sfx.play(sound);
    ui.modal = true;
    this.cameras.main.fadeOut(280, 11, 14, 26);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      S.map = to; S.spawn = spawn; S.x = S.y = null;
      this.scene.restart({ map: to, spawn });
    });
  }

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

  applyEnding() {
    const e = S.flags.ending;
    if (this.endOverlay) { this.endOverlay.destroy(); this.endOverlay = null; }
    if (!e || this.mapId !== 'village') return;
    if (e === 'give') {
      this.endOverlay = this.add.rectangle(0, 0, 320, 180, 0xf4a040, 0.14).setOrigin(0).setScrollFactor(0).setDepth(99700).setBlendMode(Phaser.BlendModes.ADD);
      this.snow?.destroy(); this.snow = null;
    } else this.endOverlay = this.add.rectangle(0, 0, 320, 180, 0x0b0e1a, 0.34).setOrigin(0).setScrollFactor(0).setDepth(99700);
  }

  delay(ms) { return new Promise((r) => this.time.delayedCall(ms, r)); }

  async startIntro() {
    const pl = this.player;
    pl.mode = 'lying';
    pl.setPosition(pl.x, pl.y);
    this.cameras.main.fadeIn(1600, 0, 0, 0);
    await this.delay(2400);
    if (!this.scene.isActive('Game')) return;
    sfx.play('select');
    pl.mode = 'free';
    await this.delay(500);
    await runScript(introScript);
    bus.emit('hint', 'WASD MOVE  SPACE ROLL  C SNEAK  E TALK\nJ SWORD  K BOW  L SPELL  Q SWAP  R SHOUT');
    const sigrid = this.npcs.find((n) => n.id === 'sigrid');
    if (sigrid) sigrid.walkTo(sigrid.home.x, sigrid.home.y);
  }

  openMenu(tab, name) {
    ui.modal = true;
    sfx.play('select');
    this.scene.launch('Menu', { tab, name });
  }

  updateInteract() {
    const pl = this.player, c = { x: pl.x, y: pl.y + 2 };
    let best = null, bd = 25;
    if (pl.mode === 'free') {
      for (const it of this.interactables) {
        if (!it.canInteract()) continue;
        const d = dist(c.x, c.y, it.ix, it.iy);
        if (d < bd) { best = it; bd = d; }
      }
    }
    this.target = best;
    if (best) {
      this.promptTxt.setText(best.label()).setVisible(true);
      this.promptTxt.setPosition(Math.round(best.ix - best.label().length * 3), Math.round(best.iy - 22));
      if (keys.pressed('interact') && pl.lockT <= 0) { sfx.play('select'); best.interact(); }
    } else this.promptTxt.setVisible(false);
  }

  update(time, ms) {
    const dt = Math.min(ms, 50) / 1000;
    if (ui.modal) { this.physics.world.pause(); return; }
    if (this.hitStopT > 0) { this.hitStopT -= dt; this.physics.world.pause(); return; }
    this.physics.world.resume();
    S.playtime += dt;
    this.t += dt;
    this.player.update(dt);
    for (const f of this.flames) { f.ph += dt * 9; f.f.setTexture('flame' + (Math.floor(f.ph) % 3)); }
    for (const l of this.lights) { l.ph += dt * 7; l.l.setAlpha(l.base + Math.sin(l.ph) * 0.05 + Math.sin(l.ph * 2.3) * 0.03); }
    for (const n of this.npcs) n.update(dt, this.player);
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.update(dt, this.player);
      if (p.done) this.pickups.splice(i, 1);
    }
    this.updateInteract();
    if (this.pendingEnding && !ui.modal) {
      const k = this.pendingEnding; this.pendingEnding = null;
      ui.modal = true;
      this.scene.launch('Ending', { kind: k });
    }
    if (this.player.mode === 'free' && !this.leaving) {
      if (keys.pressed('inventory')) this.openMenu(0);
      else if (keys.pressed('journal')) this.openMenu(-1, 'QUESTS');
      else if (keys.pressed('pause')) this.openMenu(-1, 'SYSTEM');
    }
    if (this.t > 0.5 && !this.leaving) {
      const c = this.player.body.center;
      for (const ex of this.exits) if (ex.rect.contains(c.x, c.y)) { this.changeMap(ex.to, ex.spawn, ex.fx || 'door'); break; }
    }
    for (const e of this.enemies.getChildren()) e.update(dt, this.player);
    for (const sh of this.shots.getChildren()) sh.update(dt);
    for (const sh of this.eshots.getChildren()) sh.update(dt);
    if (this.boss && !this.boss.engaged && !this.boss.dead) {
      const pc = this.player.body.center;
      if (pc.y < 8.4 * T && pc.x > 6 * T && pc.x < 26 * T) {
        this.setGate(true);
        this.boss.engage();
        music.play('boss');
      }
    }
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
