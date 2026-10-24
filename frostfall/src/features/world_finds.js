// WQ17: the interactive minor finds (placed by world/minorfinds.js): a cairn you add a stone to, and a snared fox to free.
import { registerSpawner } from '../scenes/gameHooks.js';
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
