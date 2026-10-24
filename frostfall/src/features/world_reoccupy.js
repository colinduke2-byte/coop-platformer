// WQ20 (scene side): retaken camps get their tougher crew, a lieutenant and a sign; clearing them again pays; every hub has a
// bounty board for its region. Logic and state in world/reoccupy.js.
import { registerListener, registerTicker } from '../scenes/gameHooks.js';
import { S } from '../systems/state.js';
import { T } from '../config.js';
import { bus } from '../systems/bus.js';
import { sfx } from '../audio/sfx.js';
import { runScript } from '../systems/dialogue.js';
import { isGone } from '../systems/bless.js';
import { addGold, addItem } from '../systems/inventory.js';
import { makeGenItem } from '../systems/genloot.js';
import { listScreen } from '../scenes/ShopScene.js';
import { TUNE } from '../data/tuning.js';
import { getRegion } from '../data/maps.js';
import { REGIONS, regionOfMap } from '../data/regions.js';
import { hash } from '../util.js';
import { Sign, BountyBoard } from '../entities/Props.js';
import { rollRetakes, retakenOn, markCleared, boardOf, contractDone } from '../world/reoccupy.js';

const crewOf = (rid, id) => getRegion(rid).entities.map((e, i) => ({ e, i })).filter(({ e }) => e.t === 'enemy' && e.camp === id);
const ltKey = (map, r) => `${map}:lt:${r.id}:${r.day}`;

registerListener('scene:game', (sc) => {
  if (!sc.def.stream) return;
  let n = 0; const day = Math.floor(S.days || 0);
  const made = rollRetakes(() => hash(n++, day, (S.seed || 0) % 9973));
  for (const { rid, p } of made) {                     // the new crew moves in: the old one's graves are forgotten
    const map = REGIONS[rid].map;
    for (const { i } of crewOf(rid, p.id)) delete S.killed?.[`${map}:${i}`];
  }
  if (made.some((m) => REGIONS[m.rid].map === sc.mapId)) bus.emit('toast', 'WORD ON THE ROAD: A CLEARED PLACE HAS BEEN RETAKEN', 11);
  const rid = regionOfMap(sc.mapId), reg = getRegion(rid);
  for (const r of retakenOn(sc.mapId)) {
    const p = reg.pois.find((q) => q.id === r.id); if (!p) continue;
    for (const { e, i } of crewOf(rid, r.id)) {
      const key = `${sc.mapId}:${i}`;
      if (isGone(key)) continue;
      const pe = sc.pend.find((x) => x.key === key);
      if (pe) pe.spec = { ...pe.spec, tier: Math.max(pe.spec.tier || 0, r.tier) };
      else sc.pend.push({ spec: { ...e, tier: r.tier }, key, wx: (e.x + 0.5) * T, wy: (e.y + 0.5) * T, live: null });
    }
    const lk = ltKey(sc.mapId, r);
    if (!isGone(lk)) {
      const kind = crewOf(rid, r.id)[0]?.e.kind || 'bandit';
      sc.pend.push({ spec: { kind, tier: r.tier, elite: true, champion: true, camp: null, named: r.who }, key: lk, wx: (p.x + 0.5) * T, wy: (p.y + 1.5) * T, live: null });
    }
    const sg = new Sign(sc, (p.x - 3 + 0.5) * T, (p.y + 3 + 0.5) * T, [r.sign, `${r.who.toUpperCase()} HOLDS IT FOR THEM.`]);
    sc.interactables.push(sg);
  }
}, 'worldRetake');

// a retaken place is cleared when its crew and its lieutenant are down
registerTicker('worldRetake', (sc, dt) => {
  if (!sc.def.stream) return;
  sc.rtT = (sc.rtT || 0) - dt; if (sc.rtT > 0) return; sc.rtT = 1;
  const rid = regionOfMap(sc.mapId);
  for (const r of retakenOn(sc.mapId)) {
    if (!isGone(ltKey(sc.mapId, r)) || crewOf(rid, r.id).some(({ i }) => !isGone(`${sc.mapId}:${i}`))) continue;
    markCleared(sc.mapId, r.id);
    const G = TUNE.world.retake.clearGold, gold = G[0] + G[1] * r.tier;
    addGold(gold); sfx.play('quest');
    bus.emit('toast', `THE NEW CREW IS BROKEN  +${gold} GOLD`, 13);
  }
  boardPayouts();
}, 2350);
// a lieutenant has a name
registerListener('scene:game', (sc) => { sc.time?.addEvent?.({ delay: 400, loop: true, callback: () => { for (const p of sc.pend) if (p.spec.named && p.live && !p.live.displayNamed) { p.live.displayName = p.spec.named; p.live.displayNamed = true; } } }); }, 'worldRetakeNames');

// ---- the hub boards
const HUB_REGION = { reedwick: 'fens', skarnhold: 'highlands', lanternglade: 'glasswood', lanternfall: 'underdeep', greenhollow: 'vale', amberwell: 'sunscorch', saltmarket: 'coast', emberhold: 'ashen' };
function boardPayouts() {
  for (const [rid, b] of Object.entries(S.flags.rboard || {})) for (const id of b.active || []) {
    const o = b.offers.find((x) => x.id === id);
    if (!o || b.paid[id] || !contractDone(rid, o)) continue;
    b.paid[id] = true; b.active = b.active.filter((x) => x !== id);
    addGold(o.gold); addItem(makeGenItem(o.tier + 1, Math.random, o.tier > 1 ? 2 : 1));
    bus.emit('toast', `BOARD CONTRACT DONE  +${o.gold} GOLD AND GEAR`, 13); sfx.play('quest');
  }
}
class RegionBoard extends BountyBoard {
  constructor(sc, x, y, rid) { super(sc, x, y); this.rid = rid; }
  async interact() {
    const rid = this.rid, map = REGIONS[rid].map;
    await runScript(async () => {
      const b = boardOf(rid);
      await listScreen({
        title: REGIONS[rid].name.toUpperCase() + ' BOUNTIES', hint: 'E TAKE CONTRACT   ESC DONE', empty: 'NOTHING POSTED TODAY',
        rows: () => b.offers.map((o) => {
          const done = b.paid[o.id] || contractDone(rid, o), act = b.active.includes(o.id);
          return { id: null, name: `${o.retaken ? 'RETAKE' : 'CLEAR'} ${o.kind.toUpperCase()} (T${o.tier + 1})`, tag: done ? 'DONE' : act ? 'TAKEN' : o.gold + 'G', tagCol: done ? 4 : act ? 8 : 13, ok: !done,
            sub: o.retaken ? `HELD BY ${o.who.toUpperCase()}` : 'NEVER CLEARED', desc: o.retaken ? `A crew has taken this ${o.kind} back. Break them and their captain.` : `Nobody has cleared this ${o.kind} yet.`,
            lines: [[`REWARD ${o.gold} GOLD AND GEAR`, 13], [act ? 'MARKED ON YOUR MAP' : 'TAKE IT TO MARK THE MAP', 4]] };
        }),
        onSelect: (i, ui) => {
          const o = b.offers[i];
          if (b.paid[o.id] || contractDone(rid, o)) { ui.say('ALREADY DONE', 4); return; }
          if (b.active.includes(o.id)) { ui.say('YOU HAVE ALREADY TAKEN THIS ONE', 4); return; }
          b.active.push(o.id); S.flags.waypoint = { map, x: o.x, y: o.y }; sfx.play('quest'); ui.say('CONTRACT TAKEN - WAYPOINT SET', 8);
        },
      });
    });
  }
}
registerListener('scene:game', (sc) => {
  const rid = HUB_REGION[sc.mapId]; if (!rid) return;
  // beside the hub's campfire (every hub has one in its square), on the first open spot
  const f = sc.built.entities.find((e) => e.t === 'fire' && e.rest) || sc.built.entities.find((e) => e.t === 'spawn'); if (!f) return;
  for (let r = 2; r <= 7; r++) for (const [dx, dy] of [[r, 0], [-r, 0], [0, r], [r, r], [-r, r], [r, -r], [-r, -r], [0, -r]]) {
    const x = (f.x + dx + 0.5) * T, y = (f.y + dy + 0.5) * T;
    if (sc.solidAt(x, y) || sc.solidAt(x + 10, y) || sc.solidAt(x - 10, y) || sc.solidAt(x, y + 12) || sc.interactables.some((i) => Math.hypot(i.ix - x, i.iy - y) < 20)) continue;
    const bd = new RegionBoard(sc, x, y, rid); sc.interactables.push(bd);
    if (!sc.propBodies) sc.propBodies = sc.physics.add.staticGroup();
    sc.propBodies.add(bd);
    return;
  }
}, 'worldHubBoard');
