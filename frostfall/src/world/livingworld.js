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
import { isBlood } from '../systems/moon.js';
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

NPC_DEFS.ghost_merchant = { name: 'PALE MERCHANT', tex: 'spr_trapper' };
SCRIPTS.ghost_merchant = async function ghostMerchant() {
  const N = 'Pale Merchant', sc = dialogue.hud.scene.get('Game');
  const g = sc.ghostEvt;
  if (!g || g.done) { await say(N, 'Dawn comes. I was never here.'); return; }
  await say(N, 'Cold hands, warm purse. I trade what the living forget. Bring me three moonpetals and I will give you something the dead kept.');
  const have = S.inv.moonpetal || 0;
  const c = await choose([have >= 3 ? 'Trade 3 moonpetals' : `Moonpetals: ${have}/3`, S.gold >= 80 ? 'Buy a moonlit draught (80g)' : 'Draught: 80g (too poor)', 'Leave']);
  if (c === 0 && have >= 3) {
    S.inv.moonpetal -= 3; g.done = true; g.life = Math.min(g.life, 20);
    addItem(makeGenItem(g.tier + 1, Math.random, 1)); S.flags.paleTrades = (S.flags.paleTrades || 0) + 1;
    await say(N, 'Pleasant. Wear it well. It remembers its last owner.');
    bus.emit('toast', 'THE PALE MERCHANT TRADED YOU A RELIC', 13); sfx.play('quest');
  } else if (c === 1 && S.gold >= 80) {
    S.gold -= 80; S.inv.moonlit_draught = (S.inv.moonlit_draught || 0) + 1; sfx.play('pickup');
    await say(N, 'Drink it and the dark will see you less.');
  } else await say(N, 'Another night, then.');
};

export const livingMethods = {
  // Called when the random-event timer fires (replaces the old two-way choice).
  rollEvent() {
    const r = Math.random(), tier = tierAt(this.player.x / T, this.player.y / T), night = this.nightness() > 0.5;
    if (night && isBlood() && this.bloodDay !== Math.floor(S.days)) return this.spawnBloodAlpha(tier);
    if (night && !this.ghostEvt && r < 0.2) return this.spawnGhostMerchant();
    if (r < 0.28) return this.spawnAmbush();
    if (r < 0.50 && !this.trader) return this.spawnTrader();
    if (r < 0.66 && !night) return this.spawnWounded(tier);
    if (r < 0.82 && !night) return this.spawnHunt(tier);
    if (!this.spawnRaid(tier)) this.spawnAmbush();
  },
  // The blood moon: a great wolf hunts the roads once per blood night. Big bounty.
  spawnBloodAlpha(tier) {
    const p = this.freeSpotNear(110, 160); if (!p) return this.spawnAmbush();
    this.bloodDay = Math.floor(S.days);
    const e = this.addEnemy('werewolf', p.x, p.y, { tier: tier + 1, champion: true, blood: true, roam: true });
    e.displayName = 'The Blood Moon Alpha'; e.alert(true);
    for (let i = 0; i < 2; i++) { const q = this.freeSpotNear(40, 80); if (q) this.addEnemy('werewolf', q.x, q.y, { tier, roam: true }).alert(true); }
    bus.emit('toast', 'THE BLOOD MOON: A GREAT WOLF HUNTS YOU!', 8); sfx.play('alert'); music.stinger();
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
  spawnGhostMerchant() {
    const p = this.freeSpotNear(70, 120); if (!p) return;
    const npc = new Npc(this, p.x, p.y, 'ghost_merchant'); npc.home = { x: p.x, y: p.y }; npc.setAlpha(0.6);
    this.npcs.push(npc); this.interactables.push(npc);
    if (!this.npcBodies) { this.npcBodies = this.physics.add.staticGroup(); this.physics.add.collider(this.player, this.npcBodies); }
    this.npcBodies.add(npc);
    this.ghostEvt = { npc, tier: tierAt(p.x / T, p.y / T), life: 200, done: false };
    bus.emit('toast', 'A PALE LIGHT FLICKERS NEARBY...', 13); sfx.play('quest');
  },
  removeGhostMerchant() {
    const w = this.ghostEvt; if (!w) return; this.ghostEvt = null;
    const npc = w.npc;
    this.npcs = this.npcs.filter((n) => n !== npc); this.interactables = this.interactables.filter((i) => i !== npc);
    npc.shadow.destroy(); npc.nameTxt.destroy(); npc.body.enable = false; npc.destroy();
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
    const ge = this.ghostEvt;
    if (ge) { ge.life -= dt; if (ge.life <= 0 || !this.isNight() || Math.hypot(ge.npc.x - this.player.x, ge.npc.y - this.player.y) > 520) this.removeGhostMerchant(); }
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
