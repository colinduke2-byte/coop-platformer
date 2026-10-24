// WQ17: the interactive minor finds (placed by world/minorfinds.js): a cairn you add a stone to, and a snared fox to free.
import { registerSpawner, registerListener, registerTicker } from '../scenes/gameHooks.js';
import { T } from '../config.js';
import { regionOfMap } from '../data/regions.js';
import { Sign } from '../entities/Props.js';
import { grantRelic } from '../systems/relics.js';
import { TILE_FLOOR } from '../world/sceneConsts.js';
import { trailOf, trailStep, readMark, markText, trailDone, markBox } from '../world/trails.js';
import { S } from '../systems/state.js';
import { bus } from '../systems/bus.js';
import { sfx } from '../audio/sfx.js';
import { C } from '../config.js';
import { today } from '../systems/bless.js';
import { recalc } from '../systems/stats.js';
import { addGold } from '../systems/inventory.js';
import { TUNE } from '../data/tuning.js';

const done = (sc, e) => (S.flags.minorDone ||= {})[`${sc.mapId}:${e.id}`];

class Cairn {
  constructor(sc, x, y, e) {
    this.scene = sc; this.ix = x; this.iy = y; this.e = e;
    const g = sc.add.graphics().setDepth(y + 6);       // a small heap of grey stones
    for (const [dx, dy, w, c] of [[-5, 2, 10, 3], [-4, -1, 8, 4], [-3, -4, 6, 3], [-2, -7, 4, 5]]) { g.fillStyle(C[0]); g.fillRect(x + dx - 1, y + dy - 1, w + 2, 5); g.fillStyle(C[c]); g.fillRect(x + dx, y + dy, w, 3); }
    this.g = g;
  }
  canInteract() { return S.flags.minorDone?.[`${this.scene.mapId}:${this.e.id}`] !== today(); }
  label() { return 'E: ADD A STONE'; }
  interact() {
    (S.flags.minorDone ||= {})[`${this.scene.mapId}:${this.e.id}`] = today();
    const W = TUNE.world.minor;
    S.flags.restedUntil = Math.max(S.flags.restedUntil || 0, (S.playtime || 0) + W.cairnSecs); recalc();
    S.sp = S.maxSp;
    sfx.play('quest'); this.scene.fx.puff(this.ix, this.iy, 5, 8, 24, 0.5);
    bus.emit('toast', `A STONE ON THE CAIRN: RESTED FOR ${Math.round(W.cairnSecs / 60)} MIN`, 8);
  }
}

class Snare {
  constructor(sc, x, y, e) {
    this.scene = sc; this.ix = x; this.iy = y; this.e = e;
    this.img = sc.add.sprite(x, y, 'spr_fox').setDepth(y + 6);
    const g = sc.add.graphics().setDepth(y + 7); g.lineStyle(1, C[5]); g.strokeCircle(x + 4, y + 4, 3);
    this.g = g;
  }
  canInteract() { return !done(this.scene, this.e) && this.img.active; }
  label() { return 'E: FREE THE FOX'; }
  interact() {
    (S.flags.minorDone ||= {})[`${this.scene.mapId}:${this.e.id}`] = 1;
    S.flags.helped = (S.flags.helped || 0) + 1;
    const gold = TUNE.world.minor.foxGold; addGold(gold);
    sfx.play('pickup'); this.g.destroy();
    this.scene.tweens.add({ targets: this.img, x: this.ix + 90, alpha: 0, duration: 900, onComplete: () => this.img.destroy() });
    bus.emit('toast', `THE FOX BOLTS. SOMEONE LEFT A PURSE IN THE SNARE: +${gold} GOLD`, 13);
  }
}

registerSpawner('cairn', (sc, e, wx, wy) => { sc.interactables.push(new Cairn(sc, wx, wy, e)); });
registerSpawner('snare', (sc, e, wx, wy) => { if (!done(sc, e)) sc.interactables.push(new Snare(sc, wx, wy, e)); });

// ---- WQ22: the treasure trail marks and the box at the end (world/trails.js)
class TrailBox {
  constructor(sc, x, y, rid) { this.scene = sc; this.ix = x; this.iy = y; this.rid = rid; this.img = sc.add.image(x, y, 'chest').setDepth(y + 6).setTint(0xc8a060); }
  canInteract() { return !trailDone(this.rid); }
  label() { return 'E: DIG UP THE BOX'; }
  interact() {
    markBox(this.rid);
    if (!grantRelic(this.scene)) { addGold(TUNE.world.minor.trailGold); bus.emit('toast', `THE BOX HOLDS GOLD: +${TUNE.world.minor.trailGold}`, 13); }
    sfx.play('levelup'); this.scene.fx.puff(this.ix, this.iy, 13, 12, 40, 0.6); this.img.setAlpha(0.4);
  }
}
registerListener('scene:game', (sc) => {
  if (!sc.def.stream) return;
  const rid = regionOfMap(sc.mapId), stops = trailOf(rid); if (!stops.length) return;
  stops.forEach((p, i) => {
    const step = trailStep(rid);
    if (i < 2 || step < 3) {
      const sg = new Sign(sc, (p.x + 2.5) * T, (p.y - 1.5) * T, markText(stops, i));
      const read = sg.interact.bind(sg);
      sg.interact = async (...a) => { const r = await read(...a); const was = trailStep(rid); readMark(rid, i); if (trailStep(rid) > was) { bus.emit('toast', i < 2 ? 'A TRAIL MARK: IT POINTS TO ANOTHER HIDDEN PLACE' : 'THE END OF THE TRAIL', 15); sfx.play('quest'); if (trailStep(rid) === 3) sc.interactables.push(new TrailBox(sc, (p.x - 1.5) * T, (p.y + 1.5) * T, rid)); } return r; };
      sc.interactables.push(sg);
    }
    if (i === 2 && step >= 3 && !trailDone(rid)) sc.interactables.push(new TrailBox(sc, (p.x - 1.5) * T, (p.y + 1.5) * T, rid));
  });
}, 'worldTrails');

// ---- WQ23: a cracked wall in a delve: strike it (a blow, an arrow, a spell) and it falls open onto a secret room
class CrackWall {
  constructor(sc, e) {
    this.scene = sc; this.e = e; this.broken = false;
    this.x = this.cx = (e.x + 0.5) * T; this.y = (e.y + 0.3) * T; this.cy = (e.y + 0.5) * T;
    const g = sc.add.graphics().setDepth(this.cy + 2);        // a zig-zag crack over the wall tile
    g.lineStyle(1, C[0], 0.9); g.beginPath(); g.moveTo(this.cx - 2, this.cy - 7); g.lineTo(this.cx + 1, this.cy - 2); g.lineTo(this.cx - 1, this.cy + 2); g.lineTo(this.cx + 2, this.cy + 7); g.strokePath();
    this.g = g;
  }
  smash() {
    if (this.broken) return;
    this.broken = true; S.flags[this.e.id] = true; this.g.destroy();
    this.scene.layer.putTileAt(TILE_FLOOR, this.e.x, this.e.y); this.scene.solid[this.e.y][this.e.x] = false;
    this.scene.shake(250, 0.008); this.scene.fx.puff(this.cx, this.cy, 5, 12, 40, 0.6); sfx.play('door');
    bus.emit('toast', 'THE CRACKED WALL GIVES WAY: A HIDDEN ROOM', 13);
  }
}
registerSpawner('crackwall', (sc, e) => {
  if (S.flags[e.id]) { sc.layer.putTileAt(TILE_FLOOR, e.x, e.y); sc.solid[e.y][e.x] = false; return; }
  sc.breakables.push(new CrackWall(sc, e));
});

// ---- WQ23: the brazier puzzle (world/barrowgen.js). Light the three braziers in the carved order: a blow, an arrow, a fire
// spell or E (a torch) lights one; a frost spell puts a lit one out. A wrong order puts them all out and wakes a guardian;
// the right one opens the sealed alcove for good.
class Brazier {
  constructor(sc, e, wx, wy) {
    this.scene = sc; this.e = e; this.beast = e.beast; this.lit = false; this.broken = false;
    this.x = this.cx = this.ix = wx; this.cy = this.iy = wy; this.y = wy - 4;
    this.g = sc.add.graphics().setDepth(wy + 6); this.draw();
  }
  draw() {
    const g = this.g, x = this.cx, y = this.cy; g.clear();
    g.fillStyle(C[0]); g.fillRect(x - 5, y - 4, 10, 10); g.fillStyle(C[3]); g.fillRect(x - 1, y - 1, 2, 6); g.fillRect(x - 3, y + 4, 6, 2);
    g.fillStyle(C[4]); g.fillRect(x - 4, y - 3, 8, 3);
    if (this.lit) { g.fillStyle(C[11]); g.fillRect(x - 3, y - 8, 6, 5); g.fillStyle(C[12]); g.fillRect(x - 2, y - 11, 4, 5); g.fillStyle(C[13]); g.fillRect(x - 1, y - 7, 2, 3); }
  }
  // breakables: any blow or shot that reaches it strikes a spark; the brazier itself never breaks
  smash() { if (this.scene.shots.getChildren().some((sh) => sh.kind === 'frost' && Math.hypot(sh.x - this.cx, sh.y - this.cy) < 16)) this.snuff(); else this.light(); }
  canInteract() { return !this.scene.brz?.solved && !this.lit; }
  label() { return `E: LIGHT THE ${this.beast.toUpperCase()} BRAZIER`; }
  interact() { this.light(); }
  light() {
    const P = this.scene.brz;
    if (!P || P.solved || this.lit) return;
    this.lit = true; this.draw(); sfx.play('select'); this.scene.fx.puff(this.cx, this.cy - 8, 12, 6, -20, 0.4);
    P.lit.push(this.beast);
    if (P.order[P.lit.length - 1] !== this.beast) return wrongOrder(this.scene, P);
    if (P.lit.length === P.order.length) solveBraziers(this.scene, P);
  }
  snuff() { if (!this.lit || this.scene.brz?.solved) return; this.lit = false; this.draw(); const P = this.scene.brz; P.lit = P.lit.filter((b) => b !== this.beast); this.scene.fx.puff(this.cx, this.cy - 6, 15, 6, -10, 0.4); }
}
function openAlcove(sc, P) { sc.layer.putTileAt(TILE_FLOOR, P.wx, P.wy); sc.solid[P.wy][P.wx] = false; }
function solveBraziers(sc, P) {
  P.solved = true; S.flags[P.id] = true; openAlcove(sc, P);
  sc.shake(250, 0.006); sfx.play('door');
  bus.emit('toast', 'THE THREE FIRES BURN TOGETHER. A SEALED DOOR GRINDS OPEN', 13);
}
function wrongOrder(sc, P) {
  for (const b of P.braziers) { b.lit = false; b.draw(); }
  P.lit = [];
  sfx.play('nostamina'); bus.emit('toast', 'THE FIRES GUTTER OUT TOGETHER. SOMETHING STIRS', 11);
  if (!P.woke) { P.woke = true; const b = P.braziers[1]; const e = sc.addEnemy(P.guard, b.cx, b.cy + 24, { tier: P.tier }); e.alert?.(true); }
}
registerSpawner('brazierorder', (sc, e) => {
  sc.brz = { id: e.id, order: e.order, wx: e.wx, wy: e.wy, guard: e.guard, tier: e.tier, lit: [], braziers: [], solved: !!S.flags[e.id] };
  if (sc.brz.solved) openAlcove(sc, sc.brz);
});
registerSpawner('brazier', (sc, e, wx, wy) => {
  const b = new Brazier(sc, e, wx, wy);
  if (sc.brz?.solved) { b.lit = true; b.draw(); }
  sc.brz?.braziers.push(b); sc.breakables.push(b); sc.interactables.push(b);
});
// fire spells light a brazier they pass; frost spells put one out
registerTicker('worldBraziers', (sc) => {
  const P = sc.brz; if (!P || P.solved) return;
  for (const sh of sc.shots.getChildren()) {
    if (sh.kind !== 'fire' && sh.kind !== 'frost') continue;
    for (const b of P.braziers) if (Math.hypot(sh.x - b.cx, sh.y - b.cy) < 12) { if (sh.kind === 'fire') b.light(); else b.snuff(); }
  }
}, 1060);
