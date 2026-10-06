import PatternBoss from './PatternBoss.js';
import { TUNE } from '../data/tuning.js';
import { sfx } from '../audio/sfx.js';
import Pickup from './Pickup.js';
import { bus } from '../systems/bus.js';

// Ironwatch Keep: Hrolf Ironmarch, first Warden, still marching.
export class Warlord extends PatternBoss {
  constructor(scene, x, y) {
    super(scene, x, y, 'warlord', TUNE.warlord, { scale: 2.4, flag: 'warlordDead', heart: 'iron', toast: 'HROLF IRONMARCH FALLS', summon: ['bandit', 'archer', 'knight'], col: 12, tier: 2 });
  }
  attackPool(d) {
    const o = [];
    if (d < 46) o.push('sweep', 'sweep', 'slam', 'tail');
    else o.push('leap', 'leap', 'volley', 'charge');
    if (this.bphase >= 2) { o.push('nova', 'tail', 'leap'); if (d > 60) o.push('charge'); }
    return o;
  }
}

// The Drowned Chapel: the Tidemother.
export class Tidemother extends PatternBoss {
  constructor(scene, x, y) {
    super(scene, x, y, 'tide', TUNE.tide, { scale: 3, flag: 'tideDead', heart: 'tide', toast: 'THE TIDEMOTHER SINKS', summon: ['draugr', 'wight', 'reaver'], col: 15, tier: 2 });
  }
  attackPool(d) {
    const o = [];
    if (d < 50) o.push('tail', 'spikes', 'spikes');
    else o.push('breath', 'breath', 'spikes', 'volley', 'charge');
    if (this.bphase >= 2) o.push('nova', 'spikes', 'breath');
    return o;
  }
}

// The Rootvault: the Ashen Root. Slow, vast, and the arena fills with eruptions.
export class AshenRoot extends PatternBoss {
  constructor(scene, x, y) {
    super(scene, x, y, 'root', TUNE.root, { scale: 3, flag: 'rootDead', heart: 'root', toast: 'THE ASHEN ROOT WITHERS', summon: ['wolf', 'fencer', 'wolf'], col: 8, tier: 3 });
  }
  attackPool(d) {
    const o = ['spikes', 'spikes', 'volley'];
    if (d < 56) o.push('tail', 'tail'); else o.push('breath', 'charge');
    if (this.bphase >= 2) o.push('nova', 'spikes', 'breath');
    return o;
  }
}

// The Winter Throne: the Long Winter itself, in three faces (the Crowned, the Storm, the Hunger).
export class LongWinter extends PatternBoss {
  constructor(scene, x, y) {
    super(scene, x, y, 'winter', TUNE.winter, {
      scale: 3, flag: 'winterDead', heart: null, toast: 'THE LONG WINTER BREAKS', summon: ['wight', 'knight', 'reaver', 'conjurer'], col: 15, tier: 3,
      phaseAt: [0.66, 0.33], phaseText: { 2: 'THE STORM', 3: 'THE HUNGER' },
      onVictory: (sc) => sc.startFinale(),
    });
  }
  attackPool(d) {
    const o = [];
    if (d < 48) o.push('sweep', 'slam', 'tail', 'sweep');
    else o.push('volley', 'breath', 'leap', 'charge');
    if (this.bphase >= 2) o.push('spikes', 'nova', 'breath');
    if (this.bphase >= 3) o.push('spikes', 'leap', 'nova', 'charge');
    return o;
  }
  doSummon() { super.doSummon(); sfx.play('roar'); }
}

// The Ember Nest: Skaldrath, the Ember Wyrm. An optional dragon with sweeping fire, falling stars and crashing dives.
export class EmberDragon extends PatternBoss {
  constructor(scene, x, y) {
    super(scene, x, y, 'dragon', TUNE.dragon, {
      scale: 1.9, flag: 'dragonDead', heart: null, toast: 'SKALDRATH FALLS', summon: ['wyvern'], col: 12, tier: 3,
      phaseAt: [0.66, 0.33], phaseText: { 2: 'THE SKY BURNS', 3: 'EMBER FURY' },
      onVictory: (sc, b) => {
        sc.pickups.push(new Pickup(sc, b.x - 16, b.y + 8, { type: 'item', id: 'dragonscale_armor', big: true }));
        sc.pickups.push(new Pickup(sc, b.x + 16, b.y + 8, { type: 'item', id: 'dragonbone_blade', big: true }));
        bus.emit('toast', 'YOU LEARN DRAGONFIRE (G TO SWAP SHOUT)', 12);
      },
    });
  }
  attackPool(d) {
    const o = [];
    if (d < 54) o.push('tail', 'sweep', 'slam', 'tail');
    else o.push('breath', 'breath', 'spikes', 'charge');
    if (this.bphase >= 2) o.push('spikes', 'nova', 'breath');
    if (this.bphase >= 3) o.push('charge', 'nova', 'spikes');
    return o;
  }
  // the breath rakes the floor three times
  fireAttack(player) {
    if (this.atk !== 'breath') { super.fireAttack(player); return; }
    super.fireAttack(player);
    this.setState('attack', 0.95);
    const sc = this.scene;
    [0.3, 0.6].forEach((t, i) => sc.time.delayedCall(t * 1000, () => {
      if (this.dead || !this.scene) return;
      const p = sc.player.body.center, base = Math.atan2(p.y - this.cy, p.x - this.cx) + (i ? 0.24 : -0.24), n = this.B.breath.count;
      for (let k = 0; k < n; k++) this.orb(base + (k - (n - 1) / 2) * this.B.breath.spread, this.B.breath.speed + (k % 2) * 14, this.B.breath.dmg);
      sfx.play('frost'); sc.shake(140, 0.006);
      sc.fx.puff(this.x + (this.flipX ? -1 : 1) * 26, this.y - 8, 12, 9, 60, 0.45); sc.fx.puff(this.x + (this.flipX ? -1 : 1) * 30, this.y - 8, 13, 6, 70, 0.35);
    }));
  }
}

// The Deep Mines: Kragnar the Hollowed, the Delvers' buried king, bound to the lode.
export class Kragnar extends PatternBoss {
  constructor(scene, x, y) {
    super(scene, x, y, 'kragnar', TUNE.kragnar, { scale: 2.6, flag: 'kragnarDead', heart: null, toast: 'KRAGNAR THE HOLLOWED FALLS', summon: ['golem', 'imp', 'golem'], col: 12, tier: 2 });
  }
  attackPool(d) {
    const o = [];
    if (d < 46) o.push('slam', 'slam', 'sweep', 'tail');
    else o.push('leap', 'volley', 'charge', 'spikes');
    if (this.bphase >= 2) { o.push('nova', 'spikes', 'spikes', 'leap'); }
    return o;
  }
}
