// Quest beats, wandering world events, travel and the finale.
// Mixed into GameScene (see the bottom of scenes/GameScene.js).
import Phaser from 'phaser';
import { tierAt } from '../world/worldgen.js';
import { ENEMIES } from '../data/enemies.js';
import { makeGenItem } from '../systems/genloot.js';
import { T } from '../config.js';
import { ITEMS } from '../data/items.js';
import { S } from '../systems/state.js';
import { saveGame } from '../systems/save.js';
import { bus } from '../systems/bus.js';
import { ui } from '../systems/ui.js';
import Npc from '../entities/Npc.js';
import { Warlord } from '../entities/Guardians.js';
import { runScript, say, choose } from '../systems/dialogue.js';
import { sfx, music } from '../audio/sfx.js';
import { addItem } from '../systems/inventory.js';
import { submitScore } from '../systems/daily.js';
import { finishQuest } from '../systems/quests.js';
import { tip } from '../systems/tips.js';

export const eventMethods = {
  // Companion and side-quest bookkeeping, twice a second at most.
  questTick(dt) {
    this.qT = (this.qT || 0) - dt;
    if (this.qT > 0) return;
    this.qT = 1;
    const p = this.player;
    // the first time you stand near giant hoofprints
    if (!S.flags.sawTracks && this.trackPts?.some((t) => Math.hypot(t.x - p.x, t.y - p.y) < 36)) { S.flags.sawTracks = true; bus.emit('toast', 'HUGE TRACKS... SOMETHING ENORMOUS WALKS THESE ROADS', 13); tip('tracks'); }
    this.scoreT = (this.scoreT || 0) + 1; if (S.daily && this.scoreT % 15 === 0) submitScore();
    const Q = S.quests;
    if (Q.trail.status === 'active' && S.flags.rb_elk) { Q.trail.status = 'ready'; bus.emit('toast', 'QUEST READY: TELL BJORN', 13); sfx.play('quest'); }
    if (Q.toll.status === 'active' && S.flags.rb_troll) { Q.toll.status = 'ready'; bus.emit('toast', 'QUEST READY: SHOW HILDA', 13); sfx.play('quest'); }
    // Ragna lays her company to rest once the Warlord is down and she is with you
    if (Q.company.status === 'active' && S.flags.warlordDead && S.follower && this.follower && !ui.modal && this.player.mode === 'free') this.companionScene();
  },
  companionScene() {
    S.quests.company.status = 'ready';
    runScript(async () => {
      const R = 'Ragna';
      await say(R, 'Hrolf. You old fool. You held the gate for a hundred nights and did not once ask us to stay.');
      await say(R, 'Forty names. I carved them on a rafter in the lodge the year it happened. Tonight I will burn the rafter, and say them all, and not look away.');
      await say(R, 'You gave me that, Dreamer. Take the banner. I do not want to see it again. And my bow... my bow is yours, for as long as you will have it.');
      addItem('ironwatch_banner');
      S.flags.ragnaVeteran = true;
      finishQuest('company');
      bus.emit('toast', 'RAGNA FIGHTS BETTER NOW: SHE SHOOTS TWICE', 13);
    });
  },
  // ---- random events while exploring the open world
  worldEvents(dt) {
    if (!this.def.stream || this.player.mode !== 'free' || ui.modal) return;
    this.eventT = (this.eventT ?? 70 + Math.random() * 60) - dt;
    // the trader packs up after a while
    if (this.trader) {
      this.trader.life -= dt;
      if (this.trader.life <= 0 || Math.hypot(this.trader.npc.x - this.player.x, this.trader.npc.y - this.player.y) > 520) this.removeTrader();
    }
    if (this.eventT > 0) return;
    this.eventT = 150 + Math.random() * 150;
    if (this.enemies.getChildren().some((e) => e.alerted && !e.dead && !e.cfg.passive)) return;
    const r = Math.random();
    if (r < 0.5 || this.trader) this.spawnAmbush();
    else this.spawnTrader();
  },
  spawnAmbush() {
    const tier = tierAt(this.player.x / T, this.player.y / T);
    const night = this.nightness() > 0.5;
    const kinds = night ? ['draugr', 'wight', 'draugr', 'reaver'] : ['wolf', 'bandit', 'wolf', 'fencer'];
    const n = 2 + Math.min(3, tier) + (night ? 1 : 0);
    let made = 0;
    for (let i = 0; i < n; i++) {
      const p = this.freeSpotNear(95, 140); if (!p) continue;
      const k = kinds[Math.min(kinds.length - 1, Math.floor(Math.random() * (1 + tier)))];
      const e = this.addEnemy(k, p.x, p.y, { tier, roam: true });
      e.alert(true); made++;
    }
    if (made) { bus.emit('toast', night ? 'THE DEAD ARE RESTLESS!' : 'AMBUSH!', 11); sfx.play('alert'); music.stinger(); }
  },
  spawnTrader() {
    const p = this.freeSpotNear(80, 130); if (!p) return;
    const tier = tierAt(this.player.x / T, this.player.y / T);
    const npc = new Npc(this, p.x, p.y, 'trader');
    npc.home = { x: p.x, y: p.y };
    this.npcs.push(npc); this.interactables.push(npc);
    if (!this.npcBodies) { this.npcBodies = this.physics.add.staticGroup(); this.physics.add.collider(this.player, this.npcBodies); }
    this.npcBodies.add(npc);
    this.traderWares = [0, 1, 2].map((i) => {
      const id = makeGenItem(tier + (i === 2 ? 1 : 0), Math.random, i === 2 ? 1 : null);
      return { id, price: Math.round(ITEMS[id].value * 1.8), once: true };
    });
    this.traderWares.push({ id: 'hp_potion_g', price: 90 }, { id: 'arrows', price: 12, n: 8, name: 'Arrows x8' });
    this.trader = { npc, life: 200 };
    S.flags.waypoint = { map: this.mapId, x: Math.floor(p.x / T), y: Math.floor(p.y / T) };
    bus.emit('toast', 'A TRAVELLING TRADER IS NEARBY', 13); sfx.play('quest');
    this.fx.puff(p.x, p.y, 13, 8, 30, 0.5);
  },
  removeTrader() {
    const t = this.trader; if (!t) return;
    this.trader = null;
    const npc = t.npc;
    this.npcs = this.npcs.filter((n) => n !== npc); this.interactables = this.interactables.filter((i) => i !== npc);
    this.fx.puff(npc.x, npc.y, 13, 8, 30, 0.5);
    npc.shadow.destroy(); npc.nameTxt.destroy(); npc.body.enable = false; npc.destroy();
    if (S.flags.waypoint && S.flags.waypoint.map === this.mapId) delete S.flags.waypoint;
  },
  freeSpotNear(minD, maxD) {
    for (let i = 0; i < 160; i++) {
      const wide = i > 80 ? 0.5 : 1;             // dense woodland: after 80 misses, look closer in
      const a = Math.random() * Math.PI * 2, d = minD * wide + Math.random() * (maxD * wide - minD * wide);
      const x = this.player.x + Math.cos(a) * d, y = this.player.y + Math.sin(a) * d;
      if (!this.solidAt(x, y) && !this.solidAt(x + 8, y) && !this.solidAt(x - 8, y) && !this.solidAt(x, y + 8)) return { x, y };
    }
    return null;
  },
  // The Long Winter has fallen: decide what becomes of it.
  startFinale() {
    runScript(async () => {
      await say('The Winter', 'You have broken the chains the kings forged. I was cold before the first star, and I will be cold after the last.');
      await say('The Winter', 'But hear me, little Dreamer. Four Hearts beat in your hands. You may release me, bind me again, or take my crown. Choose.');
      const c = await choose(['Let it go. Let the Winter end.', 'Bind it again, with you as warden.', 'Take the crown. Rule the cold.']);
      const kind = ['thaw', 'warden', 'crown'][c];
      S.flags.finale = kind; S.flags.ending = S.flags.ending || 'give';
      S.quests.hearts.status = 'done';
      bus.emit('ending', kind);
    });
  },
  applyEnding() {
    const e = S.flags.ending;
    if (this.endOverlay) { this.endOverlay.destroy(); this.endOverlay = null; }
    if (!e || this.mapId !== 'village') return;
    if (e === 'give') {
      this.endOverlay = this.add.rectangle(0, 0, 320, 180, 0xf4a040, 0.14).setOrigin(0).setScrollFactor(0).setDepth(99700).setBlendMode(Phaser.BlendModes.ADD);
      this.snow?.destroy(); this.snow = null;
    } else this.endOverlay = this.add.rectangle(0, 0, 320, 180, 0x0b0e1a, 0.34).setOrigin(0).setScrollFactor(0).setDepth(99700);
  },
  // Campfires you have found can be travelled to from the map.
  discoverFires() {
    S.flags.fires = S.flags.fires || {};
    for (const f of this.fires) {
      if (S.flags.fires[f.key] || Math.hypot(this.player.x - f.x, this.player.y - f.y) > 64) continue;
      S.flags.fires[f.key] = true;
      bus.emit('toast', 'CAMPFIRE FOUND - FAST TRAVEL ON THE MAP (F)', 12); sfx.play('quest');
    }
  },
  fastTravel(f) {
    if (this.leaving || this.enemies.getChildren().some((e) => e.alerted && !e.dead && !e.cfg.passive)) { bus.emit('toast', 'NOT WITH ENEMIES NEAR', 11); return false; }
    this.leaving = true;
    const cam = this.cameras.main;
    cam.fadeOut(350, 11, 14, 26);
    if (f.map && f.map !== this.mapId) {          // another region: load its map and drop in at the fire
      cam.once('camerafadeoutcomplete', () => {
        S.map = f.map; S.spawn = 'entry'; S.x = f.x; S.y = f.y + 16;
        saveGame(this, { auto: true });
        this.scene.restart({ map: f.map, spawn: 'entry', pos: { x: f.x, y: f.y + 16 } });
      });
      return true;
    }
    cam.once('camerafadeoutcomplete', () => {
      this.player.setPosition(f.x, f.y + 16); this.player.body.setVelocity(0, 0); this.player.mode = 'free'; this.player.target = null;
      this.pend.forEach((p) => { if (p.live && !p.live.alerted) { p.live.despawn(); p.live = null; } });
      this.streamTick();
      cam.fadeIn(450, 11, 14, 26); this.leaving = false;
      bus.emit('toast', 'FAST TRAVEL', 15);
    });
    return true;
  },
};
