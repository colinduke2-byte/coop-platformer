import Phaser from 'phaser';
import { discoveryMethods } from '../world/discovery.js';
import Pony from '../entities/Pony.js';
import { dangerWarning } from '../systems/danger.js';
import { TUNE } from '../data/tuning.js';
import { rng } from '../world/worldgen.js';
import { applyElite } from '../entities/elite.js';
import { T, SOLID_TILES, C } from '../config.js';
const SOLID_LUT = new Uint8Array(256); for (const t of SOLID_TILES) SOLID_LUT[t] = 1;
import { MAPS } from '../data/maps.js';
import { ITEMS } from '../data/items.js';
import { S } from '../systems/state.js';
import { bus, listen } from '../systems/bus.js';
import { ui } from '../systems/ui.js';
import { recalc } from '../systems/stats.js';
import { bonus } from '../systems/skills.js';
import { SnowFx } from '../art/snow.js';
import { Fx } from '../art/fx.js';
import Player from '../entities/Player.js';
import Enemy from '../entities/Enemy.js';
import { P } from '../entities/Player.js';
import Pickup from '../entities/Pickup.js';
import { HEART_SITE } from '../data/hearts.js';
import { routePos } from '../world/roamers.js';
import { StashChest, GardenPlot, TrophyWall, CookPot, Prop, Cauldron, PLATE_COL, HomeAnvil } from '../entities/Props.js';
import { intro as introScript } from '../data/dialogue.js';
import { runScript, say, choose, cancelScript } from '../systems/dialogue.js';
import { keys } from '../systems/keys.js';
import { padHint } from '../systems/access.js';
import { txtS } from '../art/font.js';
import { sfx, music, ambience } from '../audio/sfx.js';
import { pathingMethods } from '../world/pathing.js';
import { fogMethods } from '../world/fog.js';
import { lootMethods } from '../world/loot.js';
import { zoneMethods } from '../world/zones.js';
import { lightingMethods } from '../world/lighting.js';
import { TILE_DOOR, TILE_FLOOR } from '../world/sceneConsts.js';
import { ambientMethods } from '../world/ambient.js';
import { arenaMethods } from '../world/arenaRun.js';
import { quickScore } from '../arena/heroes.js';
import { quickMethods } from '../arena/quickRun.js';
import { companionMethods } from '../world/companions.js';
import { killMethods } from '../world/kills.js';
import { eventMethods } from '../world/events.js';
import { livingMethods } from '../world/livingworld.js';
import { setPieceMethods } from '../world/setpieces.js';
import { nightKind, sleepyCrew, isNightNow } from '../world/nightlife.js';
import { dist, mixin } from '../util.js';
import { saveGame } from '../systems/save.js';
import { settings } from '../systems/settings.js';
import '../data/emberhold.js';
import '../data/hamlets.js';
import '../data/regions2_story.js';
import '../data/regions3_story.js';
import '../data/regions4_story.js';
import '../data/sidequests.js';
import { startChapter3 } from '../data/chapter3.js';
import { cullScene } from '../systems/perf.js';
import { fadeOut, pause } from '../systems/fade.js';
import { SPAWNERS, TICKERS, LISTENERS } from './gameHooks.js';
import './gameSpawners.js';
import './gameTickers.js';
import './gameListeners.js';
// features register their spawners, tickers and listeners from their own file in src/features/ (docs/AGENT_RULES.md)
import.meta.glob('../features/*.js', { eager: true });

export default class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) {
    this.mapId = data.map || S.map;
    this.spawnName = data.spawn || S.spawn || 'start';
    this.startPos = data.pos || null;
    this.opts = data;
  }

  create() {
    this.resetOwnFields();
    if (S.flags.waypoint?.evt) delete S.flags.waypoint;           // it pointed at a trader / traveller / raid of the last map
    this.tweens.timeScale = 1;                                   // a bullet time cut off by the map change
    ui.releaseAll();                   // a new map starts unfrozen: every hold of the last one (door fade, script, menu) is gone
    this.items = ITEMS;
    this.hitStopT = 0;
    this.deadT = 0;
    this.respawning = false;          // the same scene object is reused on every map load: a second death must still respawn
    cancelScript();                    // a conversation cut off by death or a door does not follow you to the next map
    S.mounted = false; this.pony = null;
    const def = this.def = MAPS[this.mapId];
    const built = this.built = def.build();
    S.map = this.mapId;
    if (S.boons) S.boons = {};          // arena boons end with the trial, and no trial survives a map load (CH1)
    recalc();
    this.cameras.main.setBackgroundColor(C[0]);

    // --- tilemap (collision from the solid tile list)
    const map = this.make.tilemap({ data: built.grid, tileWidth: T, tileHeight: T });
    const ts = map.addTilesetImage('tiles', 'tiles', T, T, 0, 0);
    this.layer = map.createLayer(0, ts, 0, 0);
    this.layer.setCollision(SOLID_TILES);
    // solid grid from a lookup table, cached per built map (the Hollow Reach has 204k tiles); doors and gates edit a copy
    if (!built._solid) built._solid = built.grid.map((row) => row.map((t) => SOLID_LUT[t] === 1));
    this.solid = built._solid.map((row) => row.slice());
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
    // One static group for every solid prop, chest, breakable and standing NPC: Arcade searches its static tree once per
    // moving body per collider, so four groups meant four searches each frame. The old names stay as aliases.
    this.staticBodies = this.physics.add.staticGroup();
    this.chestBodies = this.propBodies = this.npcBodies = this.staticBodies;
    this.npcs = [];
    this.breakables = [];
    this.zones = [];
    this.lastBark = -9;
    this.breakBodies = this.staticBodies;
    this.boss = null;
    this.gate = null;
    this.initSetPieces();
    this.plates = []; this.plateSeq = []; this.plateOrder = null; this.vault = null; this.vaultIsOpen = false; this.autoCheckpoints = [];
    this.exits = [];
    this.flames = [];
    this.lights = [];
    this.target = null;
    this.t = 0;
    this.leaving = false;
    this.promptTxt = txtS(this, 0, 0, '', 6, 0).setDepth(99400).setVisible(false);
    this.promptBg = this.add.rectangle(0, 0, 10, 10, 0x0b0e1a, 0.72).setOrigin(0).setDepth(99399).setVisible(false);   // dark plate behind it

    // --- spawn points
    const sp = built.entities.find((e) => e.t === 'spawn' && e.name === this.spawnName)
      || built.entities.find((e) => e.t === 'spawn');
    const px = this.startPos ? this.startPos.x : (sp.x + 0.5) * T;
    const py = this.startPos ? this.startPos.y : (sp.y + 0.5) * T;

    this.player = new Player(this, px, py);
    this.physics.add.collider(this.player, this.layer);
    // flyers and burrowed worms pass through walls and other creatures
    const solidFoe = (a, b) => !(a.cfg?.fly || b.cfg?.fly || a.hidden || b.hidden);
    this.physics.add.collider(this.enemies, this.layer, null, (en) => !(en.cfg?.fly || en.hidden));
    this.physics.add.collider(this.enemies, this.enemies, null, solidFoe);
    this.physics.add.collider(this.shots, this.layer, (sh) => sh.wall());
    this.physics.add.collider(this.eshots, this.layer, (sh) => sh.wall());
    this.physics.add.overlap(this.shots, this.enemies, (sh, en) => sh.hitEnemy(en));
    this.physics.add.overlap(this.eshots, this.player, (a, b) => {
      const sh = a.enemyOwned ? a : b;
      sh.hitPlayer(this.player);
    });

    built.entities.forEach((e, i) => { e._i = i; });
    this.trader = this.woundedEvt = this.huntEvt = this.raidEvt = null;
    this.pend = []; this.fires = []; this.campIds = new Set(); this.PickupClass = Pickup;
    for (const e of built.entities) this.spawnEntity(e);
    this.follower = null;
    if (S.nemesis && this.def.stream) this.summonNemesis();
    if (S.follower) this.spawnFollower();
    this.hound = null;
    if ((S.flags.houndOwned || S.flags.cubOwned) && !this.def.interior) this.spawnHound();
    if (this.boss && S.bossState && S.bossState.map === this.mapId) this.pendingBossRestore = true;
    for (const l of LISTENERS) this.on(l.ev, (...args) => l.fn(this, ...args));      // gameListeners.js + features (CH9)
    this.physics.add.collider(this.player, this.staticBodies);
    this.physics.add.collider(this.enemies, this.staticBodies);
    if (this.pendingBossRestore) { this.boss.restoreState(S.bossState); this.pendingBossRestore = false; }
    music.play(def.interior ? 'interior' : (def.music || 'village'));
    ambience.play(def.ambience || null);
    this.initFog();
    if (def.flag) S.flags[def.flag] = true;
    if (def.crypt) {
      S.flags.crypt = true;
      if (S.flags.bossDead && S.quests.king.status === 'active' && !S.inv.frostheart) {
        this.pickups.push(new Pickup(this, 15.5 * T, 5.5 * T, { type: 'item', id: 'frostheart', big: true }));
      }
    }
    for (const [heart, site] of Object.entries(HEART_SITE)) {
      if (this.mapId !== site.map) continue;
      S.flags['seen_' + site.map] = true;
      const flag = { rime: 'wyrmDead', iron: 'warlordDead', tide: 'tideDead', root: 'rootDead' }[heart];
      if (S.flags[flag] && !S.hearts?.[heart]) this.pickups.push(new Pickup(this, 20 * T, 5.5 * T, { type: 'heart', id: heart, big: true }));
    }
    if (this.mapId === 'maw') S.flags.maw = true;
    bus.emit('area', def.name);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.worldW, this.worldH);
    cam.startFollow(this.player, true, 0.14, 0.14);
    cam.roundPixels = true;
    cam.fadeIn(350, 11, 14, 26);

    this.snow = def.snow ? new SnowFx(this, 55) : null;
    this.initLighting();
    this.initAmbient();
    this.events.off('ending-done');
    this.events.on('ending-done', () => { this.applyEnding(); if (S.flags.finale && !S.flags.chapter3) startChapter3(); saveGame(this, { auto: true }); });
    // a game closed between a final boss and its choice picks the choice up again (otherwise the story would stop there)
    this.time.delayedCall(2500, () => {
      if (ui.modal || this.player?.mode !== 'free' || this.boss?.engaged) return;
      if (S.flags.winterDead && !S.flags.finale) this.startFinale();
      else if (S.flags.finale && !S.flags.chapter3) { startChapter3(); saveGame(this, { auto: true }); }
      else if (S.flags.sovereignDead && !S.flags.finalChoice) this.startFinale3();
    });
    this.applyEnding();
    this.time.delayedCall(1800, () => { const w = !this.opts.intro && dangerWarning(this); if (w) bus.emit('toast', w, 12); });
    if (this.opts.intro) this.startIntro();
    if (S.inv.pony_whistle > 0 && (def.stream || def.snow) && !def.interior && !def.cave && !def.arena && !def.quick) { this.pony = new Pony(this, this.player.x - 16, this.player.y + 6); this.interactables.push(this.pony); }
    if (!this.scene.isActive('Hud')) this.scene.launch('Hud');
    if (S.quick && def.quick) { this.time.delayedCall(700, () => this.startQuick()); }
    bus.emit('scene:game');
    // skip off-screen scenery in rendering (re-checked every frame, so moving things are always right)
    this.onCull = () => cullScene(this);
    this.events.on('prerender', this.onCull);
    this.events.once('shutdown', () => {
      this.events.off('prerender', this.onCull);
      this.snow?.destroy();
      this.fx.clear();
    });
  }

  // CH3 + CH1: Phaser reuses this one scene object for every map load, every respawn and every save. On the first create()
  // remember the scene's own keys (Phaser's plus init()'s); on every later one delete everything else, so no field set
  // during play (by GameScene, its mixins or anyone else: an arena trial, a ghost merchant, hoofprints, timers, bullet
  // time...) leaks into the next map. State that must outlive a map lives in S (saved) or in a module, never on `this`.
  resetOwnFields() {
    if (!this.__base) { this.__base = new Set(Object.keys(this)); this.__base.add('__base'); return; }
    for (const k of Object.keys(this)) if (!this.__base.has(k)) delete this[k];
  }

  on(ev, fn) { listen(this, ev, fn); }                // removed when the scene shuts down (CH13)

  // Build one map entity. Each entity type has a spawner registered in gameSpawners.js (or a feature's own file, CH9).
  spawnEntity(e) {
    const fn = SPAWNERS.get(e.t);
    if (fn) fn(this, e, (e.x + 0.5) * T, (e.y + 0.5) * T);
  }

  // Ambient accents: distant howls on snowy nights, crackling near campfires, creaking old wood indoors.
  ambientTick(dt) {
    this.ambT = (this.ambT || 0) - dt;
    if (this.ambT > 0) return;
    this.ambT = 0.3 + Math.random() * 0.3;
    const p = this.player;
    if (this.fires?.length) {
      let near = 999;
      for (const f of this.fires) near = Math.min(near, Math.hypot(f.x - p.x, f.y - p.y));
      if (near < 110 && Math.random() < 0.7 * (1 - near / 110)) sfx.play('crackle');
    }
    this.howlT = (this.howlT ?? 20 + Math.random() * 30) - 0.45;
    if (this.howlT <= 0) {
      this.howlT = 40 + Math.random() * 60;
      if ((this.def.snow || this.def.outdoors) && this.nightness() > 0.4) sfx.play('howl_far');
      else if (this.def.interior && Math.random() < 0.5) sfx.play('creak');
    }
  }

  // spec: { tier, elite, champion, camp }; key marks a streamed world spawn (so kills persist)
  addEnemy(kind, wx, wy, spec = {}, key = null) {
    if (typeof spec === 'number') spec = {};
    const en = new Enemy(this, wx, wy, kind, spec);
    en.spawnKey = key; en.spec = spec;
    if (spec.elite || spec.champion) {
      const R = rng(((S.seed || 1) ^ ((spec._i || 7) * 2654435761)) >>> 0);
      applyElite(en, R, spec.champion ? 2 : 1);
      if (spec.champion) { en.champion = true; en.maxHp = Math.round(en.maxHp * 1.5); en.hp = en.maxHp; en.displayName = 'Champion ' + en.displayName; }
    }
    if (spec.roamRoute) {
      en.displayName = { elk: 'Frostbrow, the Winter Elk', troll: 'Grungnir, the Bridge Troll', cinder: 'Cinderjaw, the Magma Golem', floe: 'Hrimgar, the Floe Troll', lastknight: 'Sir Aldric, the Last Knight', slough: 'Slough, the Mire Hulk', greytusk: 'Greytusk, the Mammoth King', shardstag: 'Shardstag, the Glass King', lodehulk: 'Lodehulk, the Walking Vein', mossking: 'Mossking, the Walking Hill', sunwyrm: 'Sunwyrm, the Dune Swallower' }[spec.rid] || en.displayName;
      en.worldBoss = true; en.cfg = { ...en.cfg, call: 0 };
      const hpMul = { greytusk: 3.2 }[spec.rid]; if (hpMul) { en.maxHp = Math.round(en.maxHp * hpMul); en.hp = en.maxHp; }
    }
    if (spec.nemesis) {
      const k = spec.kills || 1;
      en.nemesis = true; en.champion = false;
      en.maxHp = Math.round(en.maxHp * (1.35 + 0.25 * (k - 1))); en.hp = en.maxHp;
      en.cfg = { ...en.cfg, dmg: Math.round(en.cfg.dmg * (1.1 + 0.12 * (k - 1))), detect: en.cfg.detect * 1.4 };
      en.displayName = 'Nemesis ' + en.cfg.name;
    }
    this.enemies.add(en);
    return en;
  }

  // ---- streaming: world enemies only exist while the player is near
  streamTick() {
    const px = this.player.x, py = this.player.y;
    for (let i = this.pend.length - 1; i >= 0; i--) {
      const p = this.pend[i];
      if (p.spec.roamRoute && !p.live) { const rp = routePos(p.spec.roamRoute, S.playtime || 0, p.spec.roamPhase); p.wx = rp.x; p.wy = rp.y; }
      if (p.live) {
        if (p.live.dead || !p.live.active) { if (p.live.dead) this.pend.splice(i, 1); else p.live = null; continue; }
        if (Math.hypot(p.live.x - px, p.live.y - py) > 520 && !p.live.alerted) { p.live.despawn(); p.live = null; }
      } else if (Math.hypot(p.wx - px, p.wy - py) < 300) {
        p.live = this.addEnemy(nightKind(this, p.spec.kind || p.kind, p), p.wx, p.wy, p.spec, p.key);
        if (p.spec.kind === 'deer' || p.kind === 'deer') p.live.cfg = { ...p.live.cfg };
        if (isNightNow(this)) sleepyCrew(p.live);
      }
    }
  }

  // Brief bullet time (perfect dodges).
  slowmo(scale, ms) { this.slowScale = scale; this.slowT = ms / 1000; this.physics.world.timeScale = 1 / scale; this.tweens.timeScale = scale; }

  // ------------------------------------------------------------ helpers
  hitStop(s) { this.hitStopT = Math.max(this.hitStopT, s); }
  shake(ms, amt) { if (settings.shake > 0) this.cameras.main.shake(ms, amt * settings.shake); }
  flashScreen(ms = 90, r = 234, g = 242, b = 248) { if (settings.flashes) this.cameras.main.flash(ms, r, g, b, true); }

  // Furniture bought for the cottage (a prop, plus a working station for the cauldron and anvil).
  addFurniture(f) {
    const wx = (f.x + 0.5) * T, wy = (f.y + 0.5) * T;
    const prop = new Prop(this, wx, wy, f.tex);
    if (!this.propBodies) this.propBodies = this.physics.add.staticGroup();
    this.propBodies.add(prop);
    if (f.id === 'cauldron') this.interactables.push(new Cauldron(this, wx, wy));
    if (f.id === 'anvil') this.interactables.push(new HomeAnvil(this, wx, wy));
    if (f.id === 'stash') this.interactables.push(new StashChest(this, wx, wy));
    if (f.id === 'garden') this.interactables.push(new GardenPlot(this, wx, wy));
    if (f.id === 'trophywall') this.interactables.push(new TrophyWall(this, wx, wy));
    if (f.id === 'cookpot') this.interactables.push(new CookPot(this, wx, wy));
  }

  // each dungeon keeps its own 'vault opened' flag (the crypt keeps the old one)
  vaultKey() { return this.mapId === 'crypt' ? 'vaultOpen' : 'vaultOpen_' + this.mapId; }

  // ---- rune-plate puzzle: step on the plates in the right order
  plateStep(plate) {
    if (S.flags[this.vaultKey()] || !this.plateOrder) return;
    const want = this.plateOrder[this.plateSeq.length];
    if (plate.rune === want) {
      this.plateSeq.push(plate.rune); plate.light(true); sfx.play('select');
      this.fx.ring(plate.x, plate.y, 0.5, 0.4, 'ring', PLATE_COL[plate.rune]);
      if (this.plateSeq.length === this.plateOrder.length) this.openVault();
    } else if (!plate.lit) {
      this.plateSeq = []; this.plates.forEach((p) => p.light(false));
      sfx.play('guardbreak'); this.shake(180, 0.006);
      this.fx.text(plate.x, plate.y - 14, 'WRONG ORDER', 11, 1);
      this.addZone(plate.x, plate.y, 22, 0.7, 9, null);
    }
  }

  openVault(quiet = false) {
    if (!this.vault || this.vaultIsOpen) return;
    this.vaultIsOpen = true; S.flags[this.vaultKey()] = true;
    const { x, y } = this.vault;
    this.layer.putTileAt(TILE_FLOOR, x, y); this.solid[y][x] = false;
    if (quiet) return;
    sfx.play('door'); this.shake(300, 0.01);
    this.fx.puff((x + 0.5) * T, (y + 0.5) * T, 5, 12, 50, 0.6);
    bus.emit('toast', 'A WALL SLIDES AWAY', 13);
  }

  openKeyGate(e) {
    for (let i = 0; i < e.w; i++) { this.layer.putTileAt(TILE_FLOOR, e.x + i, e.y); this.solid[e.y][e.x + i] = false; }
    sfx.play('door'); this.shake(250, 0.008); bus.emit('toast', 'THE GATE GROANS OPEN', 13);
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

  onBossDeath(boss) { boss.victory(this); }

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

  // A quiet save every few minutes while exploring, so a closed tab or a crash never costs more than that.
  // Never mid-fight, mid-boss or while dying; the HUD shows a small save mark.
  autosaveTick(dt) {
    this.autoT = (this.autoT ?? TUNE.autosave) - dt;
    if (this.autoT > 0) return;
    this.autoT = 20;                                            // not safe now: look again shortly
    if (!this.safeToSave()) return;
    if (saveGame(this, { quiet: true })) this.autoT = TUNE.autosave;
  }
  safeToSave() {
    if (S.quick || S.daily || this.leaving || this.respawning || S.hp <= 0) return false;
    if (!this.player || this.player.mode !== 'free') return false;
    if (this.boss && this.boss.engaged && !this.boss.dead) return false;
    return !this.enemies.getChildren().some((e) => e.alerted && !e.dead);
  }

  // false once this scene has been stopped or torn down: late callbacks (timers, tweens) must not touch it
  alive() { return !!(this.sys && this.cameras?.main && (this.sys.isActive() || this.sys.isPaused())); }

  changeMap(to, spawn, sound = 'door') {
    if (this.leaving || !this.alive()) return;
    this.leaving = true;
    sfx.play(sound);
    ui.hold('changeMap');                                    // released by the next create()
    const go = () => {
      S.map = to; S.spawn = spawn; S.x = S.y = null;
      saveGame(this, { auto: true });
      this.scene.restart({ map: to, spawn });
    };
    fadeOut(this, 280, undefined, 1200).then(go, () => {});  // (quit to the title while fading: nothing happens)
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
      const pz = e.poise > e.maxHp * 0.06 || e.staggerT > 0;
      if (e.dead || (e.hp >= e.maxHp && !pz) || e.isBoss || (!pz && !(e.barT > 0) && e !== pl.target)) continue;   // VX-05: features/hud_combat.js sets barT
      const w = e.elite ? 20 : 14, x = Math.round(e.x - w / 2), y = Math.round(e.y - 14);
      g.fillStyle(C[0]); g.fillRect(x - 1, y - 1, w + 2, pz ? 6 : 4);
      g.fillStyle(C[1]); g.fillRect(x, y, w, 2);
      g.fillStyle(e.champion ? C[13] : e.elite ? C[14] : C[11]); g.fillRect(x, y, Math.max(1, Math.round((w * e.hp) / e.maxHp)), 2);
      if (pz) { g.fillStyle(C[1]); g.fillRect(x, y + 3, w, 1); g.fillStyle(e.staggerT > 0 ? C[6] : C[13]); g.fillRect(x, y + 3, e.staggerT > 0 ? w : Math.min(w, Math.round(w * e.poise / (e.maxHp * 0.42))), 1); }
    }
  }

  delay(ms) { return pause(this, ms); }   // scene time, with a wall-clock fallback: a held scene clock must not stall a script

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
    bus.emit('hint', ['WASD MOVE  SPACE ROLL  C SNEAK  E TALK', 'J SWORD  K BOW  L SPELL  Q SWAP  R SHOUT'].map((l) => padHint(l)).join('\n'));
    const sigrid = this.npcs.find((n) => n.id === 'sigrid');
    if (sigrid) sigrid.walkTo(sigrid.home.x, sigrid.home.y);
  }

  // After a character level-up, offer +10 to an attribute (only when no fight is happening).
  async askStat() {
    this.askingStat = true;
    await runScript(async () => {
      while (S.pendingStat > 0) {
        await say('LEVEL ' + S.charLevel, 'You grow a little stronger. Gear and preparation will carry you further. Choose an attribute.');
        const c = await choose(['+6 HEALTH', '+6 MAGIC', '+6 STAMINA']);
        if (c === 0) S.bonusHp += 6; else if (c === 1) S.bonusMp += 6; else S.bonusSp += 6;
        S.pendingStat--;
        recalc();
        S.hp = Math.min(S.maxHp, S.hp + 6);
        sfx.play('levelup');
      }
    });
    this.askingStat = false;
  }

  openMenu(tab, name) {
    ui.hold('menu:launch');                                  // MenuScene takes over with its own hold
    sfx.play('select');
    this.scene.launch('Menu', { tab, name });
  }

  updateInteract() {
    const pl = this.player, c = { x: pl.x, y: pl.y + 2 };
    let best = null, bd = 25;
    if (pl.mode === 'free') {
      for (const it of this.interactables) {
        const ix = it.ix, iy = it.iy;                   // cheap box test first: the open world has ~570 of these
        if (ix - c.x > 25 || c.x - ix > 25 || iy - c.y > 25 || c.y - iy > 25) continue;
        if (!it.canInteract()) continue;
        const d = dist(c.x, c.y, ix, iy);
        if (d < bd) { best = it; bd = d; }
      }
    }
    this.target = best;
    if (best) {
      const lab = padHint(best.label());          // "E: TALK" becomes "B: TALK" on a controller
      // above a talker's floating name, never on top of it
      const named = best.nameTxt && (best.nameTxt.main ? best.nameTxt.main.visible : best.nameTxt.visible), px = Math.round(best.ix - lab.length * 3), py = Math.round(best.iy - (named ? 32 : 22));
      this.promptTxt.setText(lab).setVisible(true);
      this.promptTxt.setPosition(px, py);
      this.promptBg.setPosition(px - 3, py - 2).setSize(lab.length * 6 + 6, 11).setVisible(true);
      if (keys.pressed('interact') && pl.lockT <= 0) { sfx.play('select'); best.interact(); }
    } else { this.promptTxt.setVisible(false); this.promptBg.setVisible(false); }
  }

  update(time, ms) {
    const real = Math.min(ms, 50) / 1000;
    if (this.slowT > 0) { this.slowT -= real; if (this.slowT <= 0) { this.physics.world.timeScale = 1; this.tweens.timeScale = 1; } }
    const dt = real * (this.slowT > 0 ? this.slowScale : 1);
    // Safety net: a death must always end, even if it happened under a menu or a hit-stop, or was never announced.
    if (S.hp <= 0 && this.deadT === 0 && !this.respawning && this.player?.active) { this.player.mode = 'dead'; this.deadT = 0.001; }
    if (this.deadT > 0 && !this.respawning && (ui.modal || this.hitStopT > 0)) {
      this.deadT += real; this.hitStopT = 0;
      if (this.deadT > 2.4) { ui.releaseAll(); if (this.scene.isActive('Menu')) this.scene.stop('Menu'); if (S.quick) this.endQuickRun(); else this.respawn(); }
    }
    if (ui.modal) { this.physics.world.pause(); return; }
    if (this.hitStopT > 0) { this.hitStopT -= dt; this.physics.world.pause(); return; }
    this.physics.world.resume();
    S.playtime += dt;
    this.t += dt;
    for (const tk of TICKERS) tk.fn(this, dt);          // the update order: gameTickers.js + features (CH9)
  }

  // Arena Mode: falling ends the run and shows the results card (nothing is saved).
  // Run `go` once, when the fade-out ends or, if that event never arrives (a throttled tab, a paused scene), after a short timer.
  afterFade(go) {
    fadeOut(this, 500, undefined, 1500).then(go, () => {});
  }

  // Arena Mode: falling ends the run and shows the results card (nothing is saved).
  endQuickRun() {
    this.respawning = true;
    const q = S.quick, a = this.arena || {};
    const res = { hero: q.hero, mode: q.mode, arena: q.arena, waves: a.cleared || 0, kills: a.killed || 0, champions: a.champs || 0, time: (Date.now() - q.startedAt) / 1000, daily: q.daily };
    res.score = quickScore(res.waves, q.pts || 0, res.champions, q.mode);
    this.afterFade(() => { music.stop(); this.scene.stop('Hud'); this.scene.start('ArenaResults', res); });
  }

  respawn() {
    this.respawning = true;
    S.bossState = null;                // a mid-fight save does not bring the boss back half-dead after you fall
    this.afterFade(() => {
      S.hp = S.maxHp; S.mp = S.maxMp; S.sp = S.maxSp;
      S.gold = Math.floor(S.gold * 0.9);                         // (the death screen announced this loss)
      let r = S.respawn || { map: 'village', spawn: 'start' };
      if (!MAPS[r.map]) r = { map: 'village', spawn: 'start' };          // never respawn into a map that does not exist
      S.map = r.map;
      this.scene.restart(r.x != null ? { map: r.map, pos: { x: r.x, y: r.y } } : { map: r.map, spawn: r.spawn || 'start' });
    });
  }
}

mixin(GameScene.prototype, { pathingMethods, fogMethods, lootMethods, zoneMethods, lightingMethods, ambientMethods, arenaMethods, quickMethods, discoveryMethods, companionMethods, killMethods, eventMethods, livingMethods, setPieceMethods });
