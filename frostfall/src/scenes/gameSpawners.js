// The core map entities: what GameScene.spawnEntity builds for each entity type `e.t` of a built map (CH9).
// Moved here unchanged from GameScene's old switch. A new entity type registers its own spawner from its own file
// (see gameHooks.js), it does not need a line here.
import Phaser from 'phaser';
import { T, C } from '../config.js';
import { S } from '../systems/state.js';
import { isGone } from '../systems/bless.js';
import { hash } from '../util.js';
import { diff } from '../systems/difficulty.js';
import { progress, eliteMul } from '../systems/enemyscale.js';
import { modMul } from '../data/mods.js';
import { tierAt } from '../world/worldgen.js';
import { routePos } from '../world/roamers.js';
import { hourOf, isNightHour } from '../world/lighting.js';
import { TILE_DOOR, BOSS_CLASS, BOSS_FLAG } from '../world/sceneConsts.js';
import Pickup from '../entities/Pickup.js';
import Chest from '../entities/Chest.js';
import Npc from '../entities/Npc.js';
import Boss from '../entities/Boss.js';
import Grimfang from '../entities/Grimfang.js';
import Breakable from '../entities/Breakable.js';
import { ArenaMaster, LockedGate, WoundedHound, TreasureSpot, FishHole, Sign, RestSpot, Prop, Herb, Door, Lore, Bed, Cauldron, Plate, Furnisher, Shrine, OreNode, DigSpot, BountyBoard, SoakSpot } from '../entities/Props.js';
import { registerSpawner } from './gameHooks.js';

registerSpawner('enemy', (sc, e, wx, wy) => {
  const key = `${sc.mapId}:${e._i}`;
  if (sc.def.stream && isGone(key)) return;
  const spec = { ...e };
  if (!e.champion && !e.elite && !e.camp && (e.tier || 0) >= 1 && hash(e._i || 0, (S.seed || 0) % 1000, 91) < (0.07 + 0.05 * e.tier) * diff().elite * eliteMul(progress(e.tier)) * modMul('eliteMul')) spec.elite = true;
  if (sc.def.stream) sc.pend.push({ spec, key, wx, wy, live: null });
  else sc.addEnemy(e.kind, wx, wy, spec);
});
registerSpawner('deer', (sc, e, wx, wy) => { const key = `${sc.mapId}:${e._i}`; const dk = e.kind || 'deer'; if (!isGone(key)) sc.pend.push({ spec: { kind: dk, tier: 0, roam: true }, key, wx, wy, live: null, kind: dk }); });
registerSpawner('node', (sc, e, wx, wy) => {
  const key = `${sc.mapId}:n${e._i}`;
  if (isGone(key)) return;
  const nd = new OreNode(sc, wx, wy, e.ore, key);
  sc.interactables.push(nd);
  if (!sc.propBodies) sc.propBodies = sc.physics.add.staticGroup();
  sc.propBodies.add(nd);
});
registerSpawner('dig', (sc, e, wx, wy) => { const key = `${sc.mapId}:d${e._i}`; if (!isGone(key)) sc.interactables.push(S.flags.treasure && !S.flags.treasure.done && S.flags.treasure.i === e._i ? new TreasureSpot(sc, wx, wy, key, tierAt(e.x, e.y)) : new DigSpot(sc, wx, wy, key, tierAt(e.x, e.y))); });
registerSpawner('hound', (sc, e, wx, wy) => { if (!S.flags.houndOwned) sc.interactables.push(new WoundedHound(sc, wx, wy)); });
registerSpawner('arenamaster', (sc, e, wx, wy) => { const am = new ArenaMaster(sc, wx, wy); sc.interactables.push(am); if (!sc.propBodies) sc.propBodies = sc.physics.add.staticGroup(); sc.propBodies.add(am); });
registerSpawner('spring', (sc, e, wx, wy) => { const sp = new SoakSpot(sc, wx, wy); sc.interactables.push(sp); sc.springs = (sc.springs || []).concat(sp); });
registerSpawner('track', (sc, e, wx, wy) => { (sc.trackPts = sc.trackPts || []).push({ x: wx, y: wy }); sc.add.image(wx, wy, 'paw').setDepth(wy - 8).setAlpha(0.45).setAngle(((e.x * 37 + e.y * 11) % 360)); });
registerSpawner('roamboss', (sc, e) => {
  const key = `${sc.mapId}:rb${e.id}`;
  if (isGone(key)) return;
  const p = routePos(e.route, S.playtime || 0, e.phase || 0);
  sc.pend.push({ spec: { kind: e.kind, tier: e.tier, roamRoute: e.route, roamPhase: e.phase || 0, rid: e.id }, key, wx: p.x, wy: p.y, live: null, kind: e.kind });
});
registerSpawner('fish', (sc, e, wx, wy) => { sc.interactables.push(new FishHole(sc, wx, wy, tierAt(e.x, e.y))); });
registerSpawner('shrine', (sc, e, wx, wy) => {
  const sh = new Shrine(sc, wx, wy, e.id);
  sc.interactables.push(sh);
  if (!sc.propBodies) sc.propBodies = sc.physics.add.staticGroup();
  sc.propBodies.add(sh);
});
registerSpawner('bounty', (sc, e) => { sc.campIds.add(e.id); });
registerSpawner('board', (sc, e, wx, wy) => { const bd = new BountyBoard(sc, wx, wy); sc.interactables.push(bd); if (!sc.propBodies) sc.propBodies = sc.physics.add.staticGroup(); sc.propBodies.add(bd); });
registerSpawner('chest', (sc, e, wx, wy) => { const c = new Chest(sc, wx, wy, e); sc.interactables.push(c); sc.chestBodies = (sc.chestBodies || sc.physics.add.staticGroup()); sc.chestBodies.add(c); });
registerSpawner('npc', (sc, e, wx, wy) => {
  if (S.follower && e.id === (S.companion === 'pell' ? 'pell' : 'ragna')) return;
  if (e.night && !isNightHour(hourOf())) return;               // indoor spot: only occupied at night
  let ax = wx, ay = wy;
  if (e.id === 'sigrid' && sc.opts.intro) { ax = 21.5 * T; ay = 15.5 * T; }
  const n = new Npc(sc, ax, ay, e.id);
  n.home = { x: wx, y: wy };
  n.sched = !e.night && ['sigrid', 'bjorn', 'mirra', 'child'].includes(e.id);
  if (n.sched && isNightHour(hourOf())) n.setAway(true);
  sc.npcs.push(n); sc.interactables.push(n);
  if (!sc.npcBodies) sc.npcBodies = sc.physics.add.staticGroup();
  sc.npcBodies.add(n);
});
registerSpawner('boss', (sc, e, wx, wy) => {
  if (!(e.kind === 'grimfang' ? S.flags.grimfangDone : BOSS_FLAG[e.kind] ? S.flags[BOSS_FLAG[e.kind]] : S.flags.bossDead)) {
    sc.boss = e.kind === 'grimfang' ? new Grimfang(sc, wx, wy) : BOSS_CLASS[e.kind] ? new BOSS_CLASS[e.kind](sc, wx, wy) : new Boss(sc, wx, wy);
    sc.enemies.add(sc.boss);
  }
});
registerSpawner('door', (sc, e, wx, wy) => { sc.interactables.push(new Door(sc, wx, wy, e)); });
registerSpawner('furnisher', (sc, e, wx, wy) => { const f = new Furnisher(sc, wx, wy); sc.interactables.push(f); if (!sc.propBodies) sc.propBodies = sc.physics.add.staticGroup(); sc.propBodies.add(f); });
registerSpawner('furn', (sc, e) => { if (S.flags.furn?.[e.id]) sc.addFurniture(e); });
registerSpawner('bed', (sc, e, wx, wy) => { sc.interactables.push(new Bed(sc, wx, wy)); });
registerSpawner('cauldron', (sc, e, wx, wy) => { sc.interactables.push(new Cauldron(sc, wx, wy)); });
registerSpawner('lore', (sc, e, wx, wy) => {
  const lb = new Lore(sc, wx, wy, e);
  sc.interactables.push(lb);
  if (!sc.propBodies) sc.propBodies = sc.physics.add.staticGroup();
  sc.propBodies.add(lb);
});
registerSpawner('herb', (sc, e, wx, wy) => { const h = new Herb(sc, wx, wy, (sc.def.stream && sc.mapId === 'forest' && e._i % 9 === 0) ? 'moonpetal' : e.item); sc.interactables.push(h); });
registerSpawner('prop', (sc, e, wx, wy) => {
  const pr = new Prop(sc, wx, wy, e.tex, e.body);
  if (!sc.propBodies) sc.propBodies = sc.physics.add.staticGroup();
  sc.propBodies.add(pr);
});
registerSpawner('pot', (sc, e, wx, wy) => {
  const b = new Breakable(sc, wx, wy, e.skin);
  sc.breakables.push(b);
  if (!sc.breakBodies) sc.breakBodies = sc.physics.add.staticGroup();
  sc.breakBodies.add(b);
});
registerSpawner('sign', (sc, e, wx, wy) => {
  const sg = new Sign(sc, wx, wy, e.text);
  sc.interactables.push(sg);
  if (!sc.propBodies) sc.propBodies = sc.physics.add.staticGroup();
  sc.propBodies.add(sg);
});
for (const t of ['spiketrap', 'mire', 'ambush', 'crumble']) registerSpawner(t, (sc, e, wx, wy) => { sc.addSetPiece(e, wx, wy); });
registerSpawner('plate', (sc, e, wx, wy) => { const pl = new Plate(sc, wx, wy, e.rune); sc.plates.push(pl); if (S.flags[sc.vaultKey()]) pl.light(true); });
registerSpawner('vaultwall', (sc, e) => { sc.vault = { x: e.x, y: e.y }; if (S.flags[sc.vaultKey()]) sc.openVault(true); });
for (const t of ['vaultorder', 'plateorder']) registerSpawner(t, (sc, e) => { sc.plateOrder = e.order; });
registerSpawner('keygate', (sc, e) => {
  if (!S.flags[e.id]) { for (let i = 0; i < e.w; i++) { sc.layer.putTileAt(TILE_DOOR, e.x + i, e.y); sc.solid[e.y][e.x + i] = true; } }
  sc.interactables.push(new LockedGate(sc, (e.x + e.w / 2) * T, (e.y + 1.4) * T, e));
});
registerSpawner('bossgate', (sc, e) => { sc.gate = { x: e.x, y: e.y, w: e.w, closed: false }; });
registerSpawner('pickup', (sc, e, wx, wy) => { sc.pickups.push(new Pickup(sc, wx, wy, e.spec)); });
registerSpawner('exit', (sc, e) => { sc.exits.push({ ...e, rect: new Phaser.Geom.Rectangle(e.x * T, e.y * T, e.w * T, e.h * T) }); });
registerSpawner('fire', (sc, e, wx, wy) => {
  const f = sc.add.image(wx, wy - 3, 'flame0').setDepth(wy + 12);
  sc.flames.push({ f, ph: Math.random() * 3 });
  if (e.rest) { sc.interactables.push(new RestSpot(sc, wx, wy)); sc.fires.push({ x: wx, y: wy, tx: e.x, ty: e.y, key: `${sc.mapId}:${e.x},${e.y}` }); }
  if (e.auto) sc.autoCheckpoints.push({ x: wx, y: wy, lit: false });
});
registerSpawner('glow', (sc, e, wx, wy) => {
  const l = sc.add.image(wx, wy, 'glow').setTint(C[e.col ?? 12]).setBlendMode(Phaser.BlendModes.ADD).setScale(e.r / 32).setAlpha(0.5).setDepth(99900);
  sc.lights.push({ l, base: 0.5, ph: Math.random() * 6, x: wx, y: wy, r: e.r });
});
