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
import Grimfang from '../entities/Grimfang.js';
import Breakable from '../entities/Breakable.js';
import { Sign, RestSpot, Prop, Herb, Door, Lore, Bed, Cauldron } from '../entities/Props.js';
import Follower from '../entities/Follower.js';
import { intro as introScript } from '../data/dialogue.js';
import { runScript, say, choose } from '../systems/dialogue.js';
import { keys } from '../systems/keys.js';
import { txtS } from '../art/font.js';
import { sfx, music, ambience } from '../audio/sfx.js';
import { pathingMethods } from '../world/pathing.js';
import { fogMethods } from '../world/fog.js';
import { lootMethods } from '../world/loot.js';
import { zoneMethods } from '../world/zones.js';
import { lightingMethods, hourOf, isNightHour } from '../world/lighting.js';
import { randInt, rand, dist } from '../util.js';
import { saveGame } from '../systems/save.js';
import { settings } from '../systems/settings.js';
import { tip } from '../systems/tips.js';

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
    this.propBodies = null;
    this.npcBodies = null;
    this.npcs = [];
    this.breakables = [];
    this.zones = [];
    this.lastBark = -9;
    this.breakBodies = null;
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
    this.follower = null;
    if (S.follower) this.spawnFollower();
    if (this.boss && S.bossState && S.bossState.map === this.mapId) this.pendingBossRestore = true;
    this.on('follower', (on) => {
      if (on) {
        const rn = this.npcs.find((n) => n.id === 'ragna');
        if (rn) { this.npcs = this.npcs.filter((n) => n !== rn); this.interactables = this.interactables.filter((i) => i !== rn); rn.shadow.destroy(); rn.nameTxt.destroy(); rn.destroy(); }
        this.spawnFollower();
      } else if (this.follower) {
        this.follower.destroy(); this.follower = null;
        const spec = this.built.entities.find((x) => x.t === 'npc' && x.id === 'ragna');
        if (spec && this.mapId === 'village') this.spawnEntity(spec);
      }
    });
    if (this.npcBodies) { this.physics.add.collider(this.player, this.npcBodies); this.physics.add.collider(this.enemies, this.npcBodies); }
    for (const grp of [this.breakBodies, this.propBodies]) if (grp) { this.physics.add.collider(this.player, grp); this.physics.add.collider(this.enemies, grp); }
    if (this.chestBodies) { this.physics.add.collider(this.player, this.chestBodies); this.physics.add.collider(this.enemies, this.chestBodies); }
    if (this.pendingBossRestore) { this.boss.restoreState(S.bossState); this.pendingBossRestore = false; }
    music.play(def.interior ? 'interior' : (this.isNightPre ? 'night' : (def.music || 'village')));
    ambience.play(def.ambience || null);
    this.initFog();
    if (def.flag) S.flags[def.flag] = true;
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
    this.initLighting();
    this.on('player:dead', () => { this.deadT = 0.001; });
    this.on('nostamina', () => tip('stamina'));
    this.on('charlevel', () => tip('perks'));
    this.on('item:added', (id) => { if (id === 'lockpick') tip('lock'); if (S.quests.wolves.status === 'active') tip('quest'); });
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
        if (e.id === 'ragna' && S.follower) break;
        if (e.night && !isNightHour(hourOf())) break;               // indoor spot: only occupied at night
        let ax = wx, ay = wy;
        if (e.id === 'sigrid' && this.opts.intro) { ax = 21.5 * T; ay = 15.5 * T; }
        const n = new Npc(this, ax, ay, e.id);
        n.home = { x: wx, y: wy };
        n.sched = !e.night && ['sigrid', 'bjorn', 'mirra', 'child'].includes(e.id);
        if (n.sched && isNightHour(hourOf())) n.setAway(true);
        this.npcs.push(n); this.interactables.push(n);
        if (!this.npcBodies) this.npcBodies = this.physics.add.staticGroup();
        this.npcBodies.add(n);
        break;
      }
      case 'boss':
        if (!(e.kind === 'grimfang' ? S.flags.grimfangDone : S.flags.bossDead)) {
          this.boss = e.kind === 'grimfang' ? new Grimfang(this, wx, wy) : new Boss(this, wx, wy);
          this.enemies.add(this.boss);
        }
        break;
      case 'door': this.interactables.push(new Door(this, wx, wy, e)); break;
      case 'bed': this.interactables.push(new Bed(this, wx, wy)); break;
      case 'cauldron': this.interactables.push(new Cauldron(this, wx, wy)); break;
      case 'lore': {
        const lb = new Lore(this, wx, wy, e);
        this.interactables.push(lb);
        if (!this.propBodies) this.propBodies = this.physics.add.staticGroup();
        this.propBodies.add(lb);
        break;
      }
      case 'herb': { const h = new Herb(this, wx, wy, e.item); this.interactables.push(h); break; }
      case 'prop': {
        const pr = new Prop(this, wx, wy, e.tex, e.body);
        if (!this.propBodies) this.propBodies = this.physics.add.staticGroup();
        this.propBodies.add(pr);
        break;
      }
      case 'pot': {
        const b = new Breakable(this, wx, wy, e.skin);
        this.breakables.push(b);
        if (!this.breakBodies) this.breakBodies = this.physics.add.staticGroup();
        this.breakBodies.add(b);
        break;
      }
      case 'sign': {
        const sg = new Sign(this, wx, wy, e.text);
        this.interactables.push(sg);
        if (!this.propBodies) this.propBodies = this.physics.add.staticGroup();
        this.propBodies.add(sg);
        break;
      }
      case 'bossgate': this.gate = { x: e.x, y: e.y, w: e.w, closed: false }; break;
      case 'pickup': this.pickups.push(new Pickup(this, wx, wy, e.spec)); break;
      case 'exit': this.exits.push({ ...e, rect: new Phaser.Geom.Rectangle(e.x * T, e.y * T, e.w * T, e.h * T) }); break;
      case 'fire': {
        const f = this.add.image(wx, wy - 3, 'flame0').setDepth(wy + 12);
        this.flames.push({ f, ph: Math.random() * 3 });
        if (e.rest) this.interactables.push(new RestSpot(this, wx, wy));
        break;
      }
      case 'glow': {
        const l = this.add.image(wx, wy, 'glow').setTint(C[e.col ?? 12]).setBlendMode(Phaser.BlendModes.ADD).setScale(e.r / 32).setAlpha(0.5).setDepth(99900);
        this.lights.push({ l, base: 0.5, ph: Math.random() * 6, x: wx, y: wy, r: e.r });
        break;
      }
      default: break;
    }
  }

  spawnFollower() {
    if (this.follower) return;
    this.follower = new Follower(this, this.player.x - 14, this.player.y + 2);
    this.physics.add.collider(this.follower, this.layer);
  }

  addEnemy(kind, wx, wy) {
    const en = new Enemy(this, wx, wy, kind);
    this.enemies.add(en);
    return en;
  }

  // ------------------------------------------------------------ helpers
  hitStop(s) { this.hitStopT = Math.max(this.hitStopT, s); }
  shake(ms, amt) { if (settings.shake > 0) this.cameras.main.shake(ms, amt * settings.shake); }
  flashScreen(ms = 90, r = 234, g = 242, b = 248) { if (settings.flashes) this.cameras.main.flash(ms, r, g, b, true); }







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

  onBossDeath(boss) { boss.victory(this); }

  onFirstAlert() {
    tip('sneak');
    if (this.t - (this.lastCombat || -99) > 8 && !(this.boss && this.boss.engaged)) music.stinger();
  }

  // Pick the song for the situation: interior / night / zone / boss, plus the combat layer.
  updateMusic(dt) {
    this.musicT = (this.musicT || 0) - dt;
    if (this.musicT > 0) return;
    this.musicT = 1;
    const bossOn = this.boss && this.boss.engaged && !this.boss.dead && !this.boss.yieldDone;
    if (!bossOn) {
      const want = this.def.interior ? 'interior' : this.isNight() ? 'night' : (this.def.music || 'village');
      if (music.current() !== want && !(this.boss && this.boss.engaged && this.boss.yieldDone)) music.play(want);
    }
    const fight = this.enemies.getChildren().some((e) => !e.isBoss && e.alerted && !e.dead && Math.hypot(e.x - this.player.x, e.y - this.player.y) < 220);
    if (fight) this.lastCombat = this.t;
    music.setIntensity(fight && !bossOn);
  }

  summonWolves(boss) {
    for (const [dx, dy] of [[-46, 18], [46, 18], [0, -40]]) {
      const x = Phaser.Math.Clamp(boss.x + dx, 40, this.worldW - 40), y = Phaser.Math.Clamp(boss.y + dy, 40, this.worldH - 40);
      if (this.solidAt(x, y)) continue;
      const en = this.addEnemy('wolf', x, y);
      en.alert(true);
      this.fx.puff(x, y, 5, 8, 50, 0.4);
    }
  }

  // Arena reacts when the boss enrages: red light, harsher darkness.
  arenaPhase(n) {
    if (n === 2) {
      this.ambientOverride = { color: 0x2a0710, alpha: Math.max(0.45, this.def.dim || 0) };
      for (const l of this.lights) l.l.setTint(C[11]);
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
      saveGame(this, { auto: true });
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
      if (!e.dead && e.cfg.kind === 'shoot' && e.state === 'windup' && e.dashDir) {
        const k = 1 - e.stateT / e.cfg.windup;
        g.lineStyle(1, C[11], 0.35 + 0.5 * k);
        g.beginPath(); g.moveTo(Math.round(e.x), Math.round(e.y + 3)); g.lineTo(Math.round(e.x + e.dashDir.x * 90), Math.round(e.y + 3 + e.dashDir.y * 90)); g.strokePath();
      }
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

  // After a character level-up, offer +10 to an attribute (only when no fight is happening).
  async askStat() {
    this.askingStat = true;
    await runScript(async () => {
      while (S.pendingStat > 0) {
        await say('LEVEL ' + S.charLevel, 'You feel stronger. Choose an attribute to improve.');
        const c = await choose(['+10 HEALTH', '+10 MAGIC', '+10 STAMINA']);
        if (c === 0) S.bonusHp += 10; else if (c === 1) S.bonusMp += 10; else S.bonusSp += 10;
        S.pendingStat--;
        recalc();
        S.hp = Math.min(S.maxHp, S.hp + 10);
        sfx.play('levelup');
      }
    });
    this.askingStat = false;
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
    this.fogT -= dt;
    if (this.fogT <= 0) { this.fogT = 0.3; this.revealFog(); }
    for (const f of this.flames) { f.ph += dt * 9; f.f.setTexture('flame' + (Math.floor(f.ph) % 3)); }
    this.updateClock(dt);
    this.schedT = (this.schedT || 0) - dt;
    if (this.schedT <= 0 && this.npcs.length) {
      this.schedT = 1;
      const night = isNightHour(hourOf());
      for (const n of this.npcs) if (n.sched && n.away !== night) { n.setAway(night); if (night) this.fx.puff(n.x, n.y, 5, 4, 20, 0.4); }
    }
    const night = this.nightness();
    for (const l of this.lights) { l.ph += dt * 7; l.l.setAlpha((l.base + Math.sin(l.ph) * 0.05 + Math.sin(l.ph * 2.3) * 0.03) * (0.55 + 0.9 * night)); }
    for (const n of this.npcs) n.update(dt, this.player);
    this.follower?.update(dt, this.player);
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.update(dt, this.player);
      if (p.done) this.pickups.splice(i, 1);
    }
    this.updateInteract();
    if ((S.pendingStat || 0) > 0 && !this.askingStat && this.player.mode === 'free' && !this.leaving
      && !this.enemies.getChildren().some((e) => e.alerted && !e.dead)) this.askStat();
    if (this.pendingEnding && !ui.modal) {
      const k = this.pendingEnding; this.pendingEnding = null;
      ui.modal = true;
      this.scene.launch('Ending', { kind: k });
    }
    if (this.player.mode === 'free' && !this.leaving) {
      if (keys.pressed('inventory')) this.openMenu(0);
      else if (keys.pressed('journal')) this.openMenu(-1, 'QUESTS');
      else if (keys.pressed('map')) this.openMenu(-1, 'MAP');
      else if (keys.pressed('pause')) this.openMenu(-1, 'SYSTEM');
    }
    if (this.t > 0.5 && !this.leaving) {
      const c = this.player.body.center;
      for (const ex of this.exits) if (ex.rect.contains(c.x, c.y)) { this.changeMap(ex.to, ex.spawn, ex.fx || 'door'); break; }
    }
    for (const e of this.enemies.getChildren()) e.update(dt, this.player);
    for (const sh of this.shots.getChildren()) {
      sh.update(dt);
      if (!sh.done && this.breakables.length && this.breakAt(sh.x, sh.y, 8)) { if (sh.kind === 'fire') sh.explode(); else sh.finish(); }
    }
    this.breakables = this.breakables.filter((b) => !b.broken);
    for (const sh of this.eshots.getChildren()) sh.update(dt);
    if (this.boss && !this.boss.engaged && !this.boss.dead && !this.boss.yieldDone) {
      const pc = this.player.body.center;
      if (this.def.bossTrigger?.(pc, T)) {
        if (this.gate) this.setGate(true);
        this.boss.engage();
        music.play('boss');
      }
    }
    this.updateZones(dt);
    this.updateMusic(dt);
    this.fx.update(dt);
    this.snow?.update(dt);
    this.updateLighting(dt);
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
      const r = S.respawn || { map: 'village', spawn: 'start' };
      S.map = r.map;
      this.scene.restart(r.x != null ? { map: r.map, pos: { x: r.x, y: r.y } } : { map: r.map, spawn: r.spawn || 'start' });
    });
  }
}

Object.assign(GameScene.prototype, pathingMethods, fogMethods, lootMethods, zoneMethods, lightingMethods);
