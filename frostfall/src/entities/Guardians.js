import PatternBoss from './PatternBoss.js';
import { TUNE } from '../data/tuning.js';
import { sfx } from '../audio/sfx.js';

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
