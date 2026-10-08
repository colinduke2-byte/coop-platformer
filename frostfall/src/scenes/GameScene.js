import Phaser from 'phaser';
import { discoveryMethods } from '../world/discovery.js';
import Pony from '../entities/Pony.js';
import { dangerWarning } from '../systems/danger.js';
import { diff } from '../systems/difficulty.js';
import { TUNE } from '../data/tuning.js';
import { updateTutorial } from '../systems/tutorial.js';
import { isGone, markGone } from '../systems/bless.js';
import { rng, tierAt } from '../world/worldgen.js';
import { ENEMIES } from '../data/enemies.js';
import { applyElite } from '../entities/elite.js';
import { makeGenItem } from '../systems/genloot.js';
import { hash } from '../util.js';
import { completeContract } from '../data/contracts.js';
import { T, SOLID_TILES, C, TILE } from '../config.js';
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
import RimeWyrm from '../entities/RimeWyrm.js';
import { Warlord, Tidemother, AshenRoot, LongWinter, EmberDragon } from '../entities/Guardians.js';
import { HEART_SITE, heartsHeld, HEART_ORDER } from '../data/hearts.js';
import { foodTick } from '../systems/food.js';
import { elixirTick } from '../systems/elixir.js';
import { maybeRelic, grantRelic } from '../systems/relics.js';
import { checkTrophies } from '../systems/achievements.js';
import Breakable from '../entities/Breakable.js';
import { ArenaMaster } from '../entities/Props.js';
import { arenaWave } from '../world/arena.js';
import Hound from '../entities/Hound.js';
import { routePos } from '../world/roamers.js';
import { StashChest, GardenPlot, TrophyWall, CookPot, OrphanCub, SoakSpot, WoundedHound, TreasureSpot, FishHole, Sign, RestSpot, Prop, Herb, Door, Lore, Bed, Cauldron, Plate, PLATE_COL, Furnisher, HomeAnvil, Shrine, OreNode, DigSpot, BountyBoard } from '../entities/Props.js';
import Follower from '../entities/Follower.js';
import SpiritWolf from '../entities/SpiritWolf.js';
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
import { TILE_DOOR, TILE_FLOOR, BOSS_CLASS, BOSS_FLAG } from '../world/sceneConsts.js';
import { ambientMethods } from '../world/ambient.js';
import { arenaMethods } from '../world/arenaRun.js';
import { quickScore } from '../arena/heroes.js';
import { quickMethods } from '../arena/quickRun.js';
import { companionMethods } from '../world/companions.js';
import { killMethods } from '../world/kills.js';
import { eventMethods } from '../world/events.js';
import { livingMethods } from '../world/livingworld.js';
import { randInt, rand, dist } from '../util.js';
import { saveGame } from '../systems/save.js';
import { settings } from '../systems/settings.js';
import { addItem } from '../systems/inventory.js';
import { modMul, BOONS, BOON_IDS } from '../data/mods.js';
import { submitScore } from '../systems/daily.js';
import { finishQuest } from '../systems/quests.js';
import '../data/emberhold.js';
import '../data/hamlets.js';
import '../data/sidequests.js';
import { GATES, startChapter3 } from '../data/chapter3.js';
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
    S.mounted = false; this.pony = null;
    this.listeners = [];
    const def = this.def = MAPS[this.mapId];
    const built = this.built = def.build();
    S.map = this.mapId;
    if (S.boons && this.mapId !== 'arena') S.boons = {};            // arena boons end with the trial
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
    this.plates = []; this.plateSeq = []; this.plateOrder = null; this.vault = null; this.vaultIsOpen = false; this.autoCheckpoints = [];
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
    this.on('follower', (on) => {
      const hide = (id) => { const rn = this.npcs.find((n) => n.id === id); if (rn) { this.npcs = this.npcs.filter((n) => n !== rn); this.interactables = this.interactables.filter((i) => i !== rn); rn.shadow.destroy(); rn.nameTxt.destroy(); rn.destroy(); } };
      if (on) {
        hide(S.companion === 'pell' ? 'pell' : 'ragna');
        this.spawnFollower();
      } else if (this.follower) {
        const kind = this.follower.kind;
        this.interactables = this.interactables.filter((i) => i !== this.follower);
        this.follower.destroy(); this.follower = null;
        const spec = this.built.entities.find((x) => x.t === 'npc' && x.id === kind);
        if (spec && (kind === 'ragna' ? this.mapId === 'village' : this.mapId === 'emberhold')) this.spawnEntity(spec);
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
    this.on('player:dead', () => { this.deadT = 0.001; S.run.deaths = (S.run.deaths || 0) + 1; submitScore(); });
    this.on('nostamina', () => tip('stamina'));
    this.on('charlevel', () => tip('perks'));
    this.on('item:added', (id) => { if (id === 'lockpick') tip('lock'); if (S.quests.wolves.status === 'active') tip('quest'); });
    this.on('ending', (kind) => { this.pendingEnding = kind; });
    this.events.on('ending-done', () => { this.applyEnding(); if (S.flags.finale && !S.flags.chapter3) startChapter3(); });
    this.applyEnding();
    this.time.delayedCall(1800, () => { const w = !this.opts.intro && dangerWarning(this); if (w) bus.emit('toast', w, 12); });
    if (this.opts.intro) this.startIntro();
    this.on('levelup', (skill, lv) => {
      sfx.play('levelup');
      this.fx.ring(this.player.x, this.player.y + 4, 0.8, 0.6, 'ring', 0xf4d460);
      this.fx.puff(this.player.x, this.player.y, 13, 14, 55, 0.7, -20);
    });
    if (S.inv.pony_whistle > 0 && (def.stream || def.snow) && !def.interior && !def.cave && !def.arena && !def.quick) { this.pony = new Pony(this, this.player.x - 16, this.player.y + 6); this.interactables.push(this.pony); }
    if (!this.scene.isActive('Hud')) this.scene.launch('Hud');
    if (S.quick && def.quick) { this.time.delayedCall(700, () => this.startQuick()); }
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
      case 'enemy': {
        const key = `${this.mapId}:${e._i}`;
        if (this.def.stream && isGone(key)) break;
        const spec = { ...e };
        if (!e.champion && !e.elite && !e.camp && (e.tier || 0) >= 1 && hash(e._i || 0, (S.seed || 0) % 1000, 91) < (0.07 + 0.05 * e.tier) * diff().elite * modMul('eliteMul')) spec.elite = true;
        if (this.def.stream) this.pend.push({ spec, key, wx, wy, live: null });
        else this.addEnemy(e.kind, wx, wy, spec);
        break;
      }
      case 'deer': { const key = `${this.mapId}:${e._i}`; const dk = e.kind || 'deer'; if (!isGone(key)) this.pend.push({ spec: { kind: dk, tier: 0, roam: true }, key, wx, wy, live: null, kind: dk }); break; }
      case 'node': {
        const key = `${this.mapId}:n${e._i}`;
        if (isGone(key)) break;
        const nd = new OreNode(this, wx, wy, e.ore, key);
        this.interactables.push(nd);
        if (!this.propBodies) this.propBodies = this.physics.add.staticGroup();
        this.propBodies.add(nd);
        break;
      }
      case 'dig': { const key = `${this.mapId}:d${e._i}`; if (!isGone(key)) this.interactables.push(S.flags.treasure && !S.flags.treasure.done && S.flags.treasure.i === e._i ? new TreasureSpot(this, wx, wy, key, tierAt(e.x, e.y)) : new DigSpot(this, wx, wy, key, tierAt(e.x, e.y))); break; }
      case 'hound': if (!S.flags.houndOwned) this.interactables.push(new WoundedHound(this, wx, wy)); break;
      case 'arenamaster': { const am = new ArenaMaster(this, wx, wy); this.interactables.push(am); if (!this.propBodies) this.propBodies = this.physics.add.staticGroup(); this.propBodies.add(am); break; }
      case 'spring': { const sp = new SoakSpot(this, wx, wy); this.interactables.push(sp); this.springs = (this.springs || []).concat(sp); break; }
      case 'track': (this.trackPts = this.trackPts || []).push({ x: wx, y: wy }); this.add.image(wx, wy, 'paw').setDepth(wy - 8).setAlpha(0.45).setAngle(((e.x * 37 + e.y * 11) % 360)); break;
      case 'roamboss': {
        const key = `${this.mapId}:rb${e.id}`;
        if (isGone(key)) break;
        const p = routePos(e.route, S.playtime || 0, e.phase || 0);
        this.pend.push({ spec: { kind: e.kind, tier: e.tier, roamRoute: e.route, roamPhase: e.phase || 0, rid: e.id }, key, wx: p.x, wy: p.y, live: null, kind: e.kind });
        break;
      }
      case 'fish': this.interactables.push(new FishHole(this, wx, wy, tierAt(e.x, e.y))); break;
      case 'shrine': {
        const sh = new Shrine(this, wx, wy, e.id);
        this.interactables.push(sh);
        if (!this.propBodies) this.propBodies = this.physics.add.staticGroup();
        this.propBodies.add(sh);
        break;
      }
      case 'bounty': this.campIds.add(e.id); break;
      case 'board': { const bd = new BountyBoard(this, wx, wy); this.interactables.push(bd); if (!this.propBodies) this.propBodies = this.physics.add.staticGroup(); this.propBodies.add(bd); break; }
      case 'chest': { const c = new Chest(this, wx, wy, e); this.interactables.push(c); this.chestBodies = (this.chestBodies || this.physics.add.staticGroup()); this.chestBodies.add(c); break; }
      case 'npc': {
        if (S.follower && e.id === (S.companion === 'pell' ? 'pell' : 'ragna')) break;
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
        if (!(e.kind === 'grimfang' ? S.flags.grimfangDone : BOSS_FLAG[e.kind] ? S.flags[BOSS_FLAG[e.kind]] : S.flags.bossDead)) {
          this.boss = e.kind === 'grimfang' ? new Grimfang(this, wx, wy) : BOSS_CLASS[e.kind] ? new BOSS_CLASS[e.kind](this, wx, wy) : new Boss(this, wx, wy);
          this.enemies.add(this.boss);
        }
        break;
      case 'door': this.interactables.push(new Door(this, wx, wy, e)); break;
      case 'furnisher': { const f = new Furnisher(this, wx, wy); this.interactables.push(f); if (!this.propBodies) this.propBodies = this.physics.add.staticGroup(); this.propBodies.add(f); break; }
      case 'furn': if (S.flags.furn?.[e.id]) this.addFurniture(e); break;
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
      case 'plate': { const pl = new Plate(this, wx, wy, e.rune); this.plates.push(pl); if (S.flags[this.vaultKey()]) pl.light(true); break; }
      case 'vaultwall': this.vault = { x: e.x, y: e.y }; if (S.flags[this.vaultKey()]) this.openVault(true); break;
      case 'vaultorder': case 'plateorder': this.plateOrder = e.order; break;
      case 'bossgate': this.gate = { x: e.x, y: e.y, w: e.w, closed: false }; break;
      case 'pickup': this.pickups.push(new Pickup(this, wx, wy, e.spec)); break;
      case 'exit': this.exits.push({ ...e, rect: new Phaser.Geom.Rectangle(e.x * T, e.y * T, e.w * T, e.h * T) }); break;
      case 'fire': {
        const f = this.add.image(wx, wy - 3, 'flame0').setDepth(wy + 12);
        this.flames.push({ f, ph: Math.random() * 3 });
        if (e.rest) { this.interactables.push(new RestSpot(this, wx, wy)); this.fires.push({ x: wx, y: wy, tx: e.x, ty: e.y, key: `${this.mapId}:${e.x},${e.y}` }); }
        if (e.auto) this.autoCheckpoints.push({ x: wx, y: wy, lit: false });
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
      en.displayName = { elk: 'Frostbrow, the Winter Elk', troll: 'Grungnir, the Bridge Troll', cinder: 'Cinderjaw, the Magma Golem', floe: 'Hrimgar, the Floe Troll', lastknight: 'Sir Aldric, the Last Knight' }[spec.rid] || en.displayName;
      en.worldBoss = true; en.cfg = { ...en.cfg, call: 0 };
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
        p.live = this.addEnemy(p.spec.kind || p.kind, p.wx, p.wy, p.spec, p.key);
        if (p.spec.kind === 'deer' || p.kind === 'deer') p.live.cfg = { ...p.live.cfg };
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
      const pz = e.poise > e.maxHp * 0.06 || e.staggerT > 0;
      if (e.dead || (e.hp >= e.maxHp && !pz) || e.isBoss) continue;
      const w = e.elite ? 20 : 14, x = Math.round(e.x - w / 2), y = Math.round(e.y - 14);
      g.fillStyle(C[0]); g.fillRect(x - 1, y - 1, w + 2, pz ? 6 : 4);
      g.fillStyle(C[1]); g.fillRect(x, y, w, 2);
      g.fillStyle(e.champion ? C[13] : e.elite ? C[14] : C[11]); g.fillRect(x, y, Math.max(1, Math.round((w * e.hp) / e.maxHp)), 2);
      if (pz) { g.fillStyle(C[1]); g.fillRect(x, y + 3, w, 1); g.fillStyle(e.staggerT > 0 ? C[6] : C[13]); g.fillRect(x, y + 3, e.staggerT > 0 ? w : Math.min(w, Math.round(w * e.poise / (e.maxHp * 0.42))), 1); }
    }
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
    const real = Math.min(ms, 50) / 1000;
    if (this.slowT > 0) { this.slowT -= real; if (this.slowT <= 0) { this.physics.world.timeScale = 1; this.tweens.timeScale = 1; } }
    const dt = real * (this.slowT > 0 ? this.slowScale : 1);
    // Safety net: a death must always end, even if it happened under a menu or a hit-stop, or was never announced.
    if (S.hp <= 0 && this.deadT === 0 && !this.respawning && this.player?.active) { this.player.mode = 'dead'; this.deadT = 0.001; }
    if (this.deadT > 0 && !this.respawning && (ui.modal || this.hitStopT > 0)) {
      this.deadT += real; this.hitStopT = 0;
      if (this.deadT > 2.4) { ui.modal = false; if (this.scene.isActive('Menu')) this.scene.stop('Menu'); if (S.quick) this.endQuickRun(); else this.respawn(); }
    }
    if (ui.modal) { this.physics.world.pause(); return; }
    if (this.hitStopT > 0) { this.hitStopT -= dt; this.physics.world.pause(); return; }
    this.physics.world.resume();
    S.playtime += dt;
    this.t += dt;
    this.player.update(dt);
    updateTutorial(this, dt);
    this.worldEvents(dt);
    foodTick(); elixirTick();
    this.questTick(dt);
    this.ambientLife(dt);
    this.ambientTick(dt);
    for (const i of this.interactables) if (i.tick) i.tick(dt, this);
    this.trophyT = (this.trophyT || 0) - dt; if (this.trophyT <= 0) { this.trophyT = 2; checkTrophies(); }
    if (this.def.stream) { this.fireT = (this.fireT || 0) - dt; if (this.fireT <= 0) { this.fireT = 0.6; this.discoverFires(); this.discoverTick(); } this.streamT = (this.streamT || 0) - dt; if (this.streamT <= 0) { this.streamT = 0.35; this.streamTick(); } }
    if (S.flags.restedUntil && S.playtime > S.flags.restedUntil) { delete S.flags.restedUntil; recalc(); bus.emit('toast', 'NO LONGER WELL RESTED', 4); }
    for (const p of this.plates) p.update(this.player);
    for (const c of this.autoCheckpoints) {
      if (!c.lit && Math.hypot(this.player.x - c.x, this.player.y - c.y) < 30) {
        c.lit = true;
        if (!S.respawn || S.respawn.map !== this.mapId || Math.hypot((S.respawn.x ?? 0) - c.x, (S.respawn.y ?? 0) - c.y) > 40) {
          S.respawn = { map: this.mapId, x: Math.round(c.x), y: Math.round(c.y + 12) };
          bus.emit('toast', 'CHECKPOINT: BRAZIER LIT', 12); sfx.play('quest');
        }
      }
    }
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
    this.hound?.update(dt, this.player);
    this.arenaTick(dt);
    this.quickTick?.(dt);
    this.pony?.update(dt, this.player);
    if (this.spirit && !this.spirit.dead) this.spirit.update(dt, this.player);
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
      for (const ex of this.exits) {
        if (!ex.rect.contains(c.x, c.y)) continue;
        if (ex.needs && GATES[ex.needs] && !GATES[ex.needs].ok()) {
          if (this.t - (this.lastGate || -9) > 3) { bus.emit('toast', GATES[ex.needs].msg(), 11); sfx.play('nostamina'); this.lastGate = this.t; }
          this.player.body.setVelocity(0, 40); this.player.y += 2;
          break;
        }
        this.changeMap(ex.to, ex.spawn, ex.fx || 'door'); break;
      }
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
        music.play(this.def.bossMusic || 'boss');
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
      // a hired companion drags you out of the fight once in a while instead of letting you fall
      if (this.follower && !this.respawning && this.deadT > 1.1 && (S.flags.reviveAt ?? -999) + TUNE.follower.reviveCooldown < S.playtime) this.reviveByFollower();
      else if (this.deadT > 2.4 && !this.respawning) { if (S.quick) this.endQuickRun(); else this.respawn(); }
    }
  }

  // Arena Mode: falling ends the run and shows the results card (nothing is saved).
  // Run `go` once, when the fade-out ends or, if that event never arrives (a throttled tab, a paused scene), after a short timer.
  afterFade(go) {
    let done = false;
    const once = () => { if (done) return; done = true; go(); };
    this.cameras.main.fadeOut(500, 11, 14, 26);
    this.cameras.main.once('camerafadeoutcomplete', once);
    setTimeout(once, 1500);
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
    this.afterFade(() => {
      S.hp = S.maxHp; S.mp = S.maxMp; S.sp = S.maxSp;
      S.gold = Math.floor(S.gold * 0.9);
      let r = S.respawn || { map: 'village', spawn: 'start' };
      if (!MAPS[r.map]) r = { map: 'village', spawn: 'start' };          // never respawn into a map that does not exist
      S.map = r.map;
      this.scene.restart(r.x != null ? { map: r.map, pos: { x: r.x, y: r.y } } : { map: r.map, spawn: r.spawn || 'start' });
    });
  }
}

Object.assign(GameScene.prototype, pathingMethods, fogMethods, lootMethods, zoneMethods, lightingMethods, ambientMethods, arenaMethods, quickMethods, discoveryMethods, companionMethods, killMethods, eventMethods, livingMethods);
