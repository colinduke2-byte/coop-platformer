import PatternBoss from './PatternBoss.js';
import { TUNE } from '../data/tuning.js';

// The Rime Wyrm, serpent of the Glacial Maw. Guards the Rime Heart.
export default class RimeWyrm extends PatternBoss {
  constructor(scene, x, y) {
    super(scene, x, y, 'wyrm', TUNE.wyrm, { scale: 3, flag: 'wyrmDead', heart: 'rime', toast: 'THE RIME WYRM FALLS', summon: ['wight'], col: 15 });
  }
  attackPool(d) {
    const opts = [];
    if (d < 48) opts.push('tail', 'tail', 'charge');
    else opts.push('breath', 'breath', 'spikes', 'spikes', 'charge');
    if (this.bphase >= 2) { opts.push('spikes', 'nova'); if (d < 70) opts.push('tail'); }
    return opts;
  }
}
