// Pets, followers and summoned allies / rivals.
// Mixed into GameScene (see the bottom of scenes/GameScene.js).
import { TUNE } from '../data/tuning.js';
import { ENEMIES } from '../data/enemies.js';
import { T } from '../config.js';
import { S } from '../systems/state.js';
import { bus } from '../systems/bus.js';
import { bonus } from '../systems/skills.js';
import Hound from '../entities/Hound.js';
import Follower from '../entities/Follower.js';
import SpiritWolf from '../entities/SpiritWolf.js';
import { sfx } from '../audio/sfx.js';

export const companionMethods = {
  // Your companion: the hound or the bear cub (S.pet picks which; the whistle swaps them).
  spawnHound(force = false) {
    const want = S.pet === 'cub' && S.flags.cubOwned ? 'cub' : S.flags.houndOwned ? 'hound' : S.flags.cubOwned ? 'cub' : null;
    if (!want) return;
    if (this.hound && (force || this.hound.kind !== want)) { this.hound.destroy(); this.hound = null; }
    if (this.hound) return;
    this.hound = new Hound(this, this.player.x + 12, this.player.y + 4, want);
    this.physics.add.collider(this.hound, this.layer);
  },
  swapPet() {
    if (!(S.flags.houndOwned && S.flags.cubOwned)) return false;
    S.pet = S.pet === 'cub' ? 'hound' : 'cub';
    this.spawnHound(true);
    bus.emit('toast', S.pet === 'cub' ? 'THE CUB FOLLOWS YOU' : 'THE HOUND FOLLOWS YOU', 15); sfx.play('select');
    return true;
  },
  spawnFollower() {
    if (this.follower) return;
    this.follower = new Follower(this, this.player.x - 14, this.player.y + 2);
    this.physics.add.collider(this.follower, this.layer);
  },
  reviveByFollower() {
    const p = this.player, f = this.follower;
    S.flags.reviveAt = S.playtime;
    this.deadT = 0;
    S.hp = Math.round(S.maxHp * TUNE.follower.reviveHp);
    p.mode = 'free'; p.stunT = 0; p.invuln = 2.2; p.iframes = 0.5; p.setPosition(f.x, f.y + 4); p.body.setVelocity(0, 0);
    for (const e of this.enemies.getChildren()) if (!e.dead && Math.hypot(e.x - p.x, e.y - p.y) < 40) e.takeHit({ dmg: 1, kx: e.x - p.x, ky: e.y - p.y, kb: 220, src: 'shout', stun: 0.8, forceStun: !e.isBoss });
    this.fx.puff(p.x, p.y, 8, 10, 50, 0.5); this.fx.ring(p.x, p.y + 4, 1.2, 0.5, 'ring', 0xf4d460);
    sfx.play('potion'); this.shake(200, 0.006);
    bus.emit('toast', 'RAGNA PULLS YOU UP!', 13);
  },
  summonSpiritWolf(pl) {
    this.spirit?.fade();
    const w = new SpiritWolf(this, pl.x + 14, pl.y + 2, Math.round(TUNE.player.shouts ? 9 * bonus.spell() : 9));
    this.physics.add.collider(w, this.layer);
    this.fx.puff(w.x, w.y, 15, 10, 40, 0.5);
    this.spirit = w;
  },
  // The creature that killed you last waits where you fell (stronger each time it wins).
  summonNemesis() {
    const n = S.nemesis;
    if (!ENEMIES[n.kind]) { delete S.nemesis; return; }
    let x = n.x, y = n.y;
    for (let k = 0; k < 24 && (this.solidAt(x, y) || this.solidAt(x + 8, y) || this.solidAt(x, y + 8)); k++) { x = n.x + (Math.random() - 0.5) * 12 * (1 + k); y = n.y + (Math.random() - 0.5) * 12 * (1 + k); }
    const spec = { kind: n.kind, tier: Math.min(3, (n.tier || 0) + 1), elite: true, nemesis: true, kills: n.kills, roam: true };
    this.pend.push({ spec, key: null, wx: x, wy: y, live: null, kind: n.kind });
    S.flags.waypoint = { map: 'forest', x: Math.floor(x / T), y: Math.floor(y / T) };
    this.time.delayedCall(1800, () => bus.emit('toast', `YOUR NEMESIS WAITS: ${ENEMIES[n.kind].name.toUpperCase()}`, 11));
  },
};
