// Round 4: the world goes on without you. Extra wandering events (a wounded traveller, wolves hunting a deer,
// raiders at a hamlet), plus camps that get reoccupied. Mixed into GameScene; hooked from worldEvents().
import { T } from '../config.js';
import { S } from '../systems/state.js';
import { bus } from '../systems/bus.js';
import { sfx, music } from '../audio/sfx.js';
import { tierAt } from './worldgen.js';
import { NPC_DEFS, SCRIPTS } from '../data/dialogue.js';
import { say, choose } from '../systems/dialogue.js';
import { addItem } from '../systems/inventory.js';
import { dialogue } from '../systems/dialogue.js';
import { makeGenItem } from '../systems/genloot.js';
import Npc from '../entities/Npc.js';
import { completeContract } from '../data/contracts.js';
import Pickup from '../entities/Pickup.js';

NPC_DEFS.wounded = { name: 'WOUNDED TRAVELLER', tex: 'spr_trapper' };
SCRIPTS.wounded = async function wounded() {
  const N = 'Traveller', sc = dialogue.hud.scene.get('Game');
  const w = sc.woundedEvt;
  if (!w || w.done) { await say(N, 'Go on without me. I will rest a while.'); return; }
  await say(N, 'Wolves... on the road. I crawled this far. If you have a potion to spare, I can pay.');
  const c = await choose([S.inv.hp_potion > 0 ? 'Give a health potion' : 'You have no potion', 'Leave him']);
  if (c !== 0 || !(S.inv.hp_potion > 0)) { await say(N, 'Then... go carefully.'); return; }
  S.inv.hp_potion--; w.done = true;
  const gold = 45 + 35 * w.tier;
  S.gold += gold;
  addItem(makeGenItem(w.tier, Math.random, w.tier > 1 ? 1 : null));
  S.flags.helped = (S.flags.helped || 0) + 1;
  await say(N, `Bless you. Take this, ${gold} gold and a thing I took from a dead man. Tell them the Hollow Road is not safe.`);
  bus.emit('toast', `HELPED A TRAVELLER  +${gold} GOLD`, 13); sfx.play('quest');
};

export const livingMethods = {
  // Called when the random-event timer fires (replaces the old two-way choice).
  rollEvent() {
    const r = Math.random(), tier = tierAt(this.player.x / T, this.player.y / T), night = this.nightness() > 0.5;
    if (r < 0.28) return this.spawnAmbush();
    if (r < 0.50 && !this.trader) return this.spawnTrader();
    if (r < 0.66 && !night) return this.spawnWounded(tier);
    if (r < 0.82 && !night) return this.spawnHunt(tier);
    if (!this.spawnRaid(tier)) this.spawnAmbush();
  },
  spawnWounded(tier) {
    const p = this.freeSpotNear(80, 130); if (!p) return;
    const npc = new Npc(this, p.x, p.y, 'wounded'); npc.home = { x: p.x, y: p.y };
    this.npcs.push(npc); this.interactables.push(npc);
    if (!this.npcBodies) { this.npcBodies = this.physics.add.staticGroup(); this.physics.add.collider(this.player, this.npcBodies); }
    this.npcBodies.add(npc);
    this.woundedEvt = { npc, tier, life: 180, done: false };
    // the wolves that hurt him are still near
    for (let i = 0; i < 2; i++) { const q = this.freeSpotNear(30, 60); if (q) this.addEnemy('wolf', p.x + (q.x - this.player.x) * 0.2, p.y + (q.y - this.player.y) * 0.2, { tier, roam: true }); }
    S.flags.waypoint = { map: this.mapId, x: Math.floor(p.x / T), y: Math.floor(p.y / T) };
    bus.emit('toast', 'SOMEONE CALLS FOR HELP NEARBY', 13); sfx.play('quest');
  },
  removeWounded() {
    const w = this.woundedEvt; if (!w) return; this.woundedEvt = null;
    const npc = w.npc;
    this.npcs = this.npcs.filter((n) => n !== npc); this.interactables = this.interactables.filter((i) => i !== npc);
    npc.shadow.destroy(); npc.nameTxt.destroy(); npc.body.enable = false; npc.destroy();
    if (S.flags.waypoint && S.flags.waypoint.map === this.mapId) delete S.flags.waypoint;
  },
  spawnHunt(tier) {
    const p = this.freeSpotNear(100, 150); if (!p) return;
    const d = this.addEnemy('deer', p.x, p.y, { roam: true });
    const wolves = [];
    for (let i = 0; i < 2 + (tier > 1 ? 1 : 0); i++) wolves.push(this.addEnemy('wolf', p.x + 24 + i * 8, p.y + i * 6, { tier, roam: true }));
    this.huntEvt = { deer: d, wolves, life: 90 };
    bus.emit('toast', 'WOLVES ARE HUNTING A DEER NEARBY', 13);
  },
  // Raiders hit the nearest hamlet if you are within reach; clear them for the villagers' thanks.
  spawnRaid(tier) {
    if (this.raidEvt) return false;
    const pois = this.built?.pois; if (!pois) return false;
    const px = this.player.x / T, py = this.player.y / T;
    let best = null, bd = 1e9;
    for (const q of pois) if (q.kind === 'hamlet') { const d = Math.hypot(q.x - px, q.y - py); if (d < bd) { bd = d; best = q; } }
    if (!best || bd > 90 || bd < 12) return false;
    const n = 3 + Math.min(2, tier), made = [];
    for (let i = 0, tries = 0; i < n && tries < 40; tries++) {
      const a = Math.random() * 6.28, x = (best.x + Math.cos(a) * (5 + Math.random() * 5)) * T, y = (best.y + Math.sin(a) * (5 + Math.random() * 5)) * T;
      if (this.solidAt(x, y)) continue;
      const e = this.addEnemy(i === 0 && tier > 0 ? 'reaver' : 'bandit', x, y, { tier, roam: true });
      e.alerted = false; made.push(e); i++;
    }
    if (!made.length) return false;
    this.raidEvt = { foes: made, poi: best, tier, life: 240 };
    S.flags.waypoint = { map: this.mapId, x: best.x, y: best.y };
    bus.emit('toast', 'RAIDERS ARE ATTACKING A HAMLET!', 11); sfx.play('alert'); music.stinger();
    return true;
  },
  livingTick(dt) {
    // radiant delivery jobs finish when you reach the hamlet
    const c = S.contracts;
    if (c?.active?.length) for (const id of c.active) { const o = c.offers.find((x) => x.id === id); if (o && o.kind === 'hamlet' && !c.done[id] && Math.hypot(o.x * T - this.player.x, o.y * T - this.player.y) < 56) completeContract(id, this); }
    const w = this.woundedEvt;
    if (w) { w.life -= dt; if (w.done ? w.life < 160 : (w.life <= 0 || Math.hypot(w.npc.x - this.player.x, w.npc.y - this.player.y) > 520)) this.removeWounded(); }
    const h = this.huntEvt;
    if (h) {
      h.life -= dt;
      const alive = h.wolves.filter((x) => x.active && !x.dead);
      if (!alive.length && h.deer.active && !h.deer.dead) {
        this.huntEvt = null; S.gold += 20; bus.emit('toast', 'THE DEER LIVES  +20 GOLD FROM A GRATEFUL TRAPPER', 13);
        this.pickups.push(new Pickup(this, h.deer.x, h.deer.y - 6, { type: 'item', id: 'venison' }));
      } else if (h.life <= 0 || !h.deer.active) this.huntEvt = null;
    }
    const r = this.raidEvt;
    if (r) {
      r.life -= dt;
      const live = r.foes.filter((x) => x.active && !x.dead);
      if (!live.length) {
        this.raidEvt = null; const gold = 60 + 40 * r.tier; S.gold += gold; S.flags.raidsStopped = (S.flags.raidsStopped || 0) + 1;
        this.pickups.push(new Pickup(this, this.player.x, this.player.y - 10, { type: 'item', id: makeGenItem(r.tier, Math.random, r.tier > 1 ? 1 : null) }));
        bus.emit('toast', `RAID STOPPED  +${gold} GOLD`, 13); sfx.play('levelup');
        if (S.flags.waypoint && S.flags.waypoint.x === r.poi.x) delete S.flags.waypoint;
      } else if (r.life <= 0) { this.raidEvt = null; for (const e of live) e.despawn?.(); bus.emit('toast', 'THE RAIDERS HAVE MOVED ON', 8); if (S.flags.waypoint && S.flags.waypoint.x === r.poi.x) delete S.flags.waypoint; }
      else if (live.some((x) => !x.alerted) && Math.hypot(r.poi.x * T - this.player.x, r.poi.y * T - this.player.y) < 150) for (const e of live) e.alert?.(true);
    }
  },
};
