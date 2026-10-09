import PatternBoss from './PatternBoss.js';
import { TUNE } from '../data/tuning.js';
import { sfx } from '../audio/sfx.js';
import Pickup from './Pickup.js';
import { bus } from '../systems/bus.js';
import { S } from '../systems/state.js';
import { bestHelp, FACTIONS } from '../data/factions.js';

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
        sc.pickups.push(new Pickup(sc, b.x, b.y + 16, { type: 'item', id: 'scale_helm', big: true }));
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

// The Forge of the First Fire: the Ashen Sovereign. Three phases (the Crowned, the Cinder Storm, the Pyre). The house you
// stand best with helps: the Court sharpens your blows, the Guild lights the hall, the Wardens hold the door.
const scaleDmg = (t, f) => Object.fromEntries(Object.entries(t).map(([k, v]) => [k, v && typeof v === 'object' && 'dmg' in v ? { ...v, dmg: Math.round(v.dmg * f) } : v]));
export class AshenSovereign extends PatternBoss {
  constructor(scene, x, y) {
    super(scene, x, y, 'sovereign', TUNE.sovereign, {
      scale: 2.8, flag: 'sovereignDead', heart: null, toast: 'THE ASHEN SOVEREIGN FALLS', summon: ['golem', 'imp', 'conjurer', 'knight'], col: 12, tier: 3,
      phaseAt: [0.66, 0.33], phaseText: { 2: 'THE CINDER STORM', 3: 'THE PYRE' },
      onVictory: (sc) => sc.startFinale3(),
    });
    this.help = bestHelp();
    if (this.help === 'delvers') this.B = scaleDmg(TUNE.sovereign, 0.75);
  }
  engage() {
    super.engage();
    if (this.help) bus.emit('toast', `${FACTIONS[this.help].name.toUpperCase()} STAND WITH YOU`, FACTIONS[this.help].col);
  }
  takeHit(info) { return super.takeHit(this.help === 'anvil' && info && info.dmg ? { ...info, dmg: info.dmg * 1.15 } : info); }
  enterPhase() {
    super.enterPhase();
    if (this.help === 'wardens') { S.sp = Math.min(S.maxSp, S.sp + 25); bus.emit('toast', 'THE WARDENS RALLY: +STAMINA', 15); }
  }
  attackPool(d) {
    const o = [];
    if (d < 50) o.push('sweep', 'slam', 'tail', 'sweep');
    else o.push('volley', 'breath', 'leap', 'charge');
    if (this.bphase >= 2) o.push('spikes', 'nova', 'breath');
    if (this.bphase >= 3) o.push('spikes', 'leap', 'nova', 'charge', 'nova');
    return o;
  }
  doSummon() { super.doSummon(); sfx.play('roar'); }
}

// The Frozen Coast: Admiral Veyl, still waiting for his crew in Tidebreak Cavern.
export class DrownedAdmiral extends PatternBoss {
  constructor(scene, x, y) {
    super(scene, x, y, 'admiral', TUNE.admiral, { scale: 2.5, flag: 'admiralDead', heart: null, toast: 'ADMIRAL VEYL GOES DOWN WITH HIS SHIP', summon: ['draugr', 'wight', 'warden'], col: 15, tier: 3, phaseAt: [0.5] });
  }
  attackPool(d) {
    const o = [];
    if (d < 48) o.push('sweep', 'slam', 'tail', 'sweep');
    else o.push('volley', 'breath', 'leap', 'charge');
    if (this.bphase >= 2) o.push('spikes', 'nova', 'breath');
    return o;
  }
}

// The Old Kingdom: the Hollow King, last of the Kings, three phases (the Throne, the Court, the Memory).
export class HollowKing extends PatternBoss {
  constructor(scene, x, y) {
    super(scene, x, y, 'hollowking', TUNE.hollowking, {
      scale: 2.8, flag: 'hollowKingDead', heart: null, toast: 'THE HOLLOW KING IS REMEMBERED', summon: ['knight', 'reaver', 'necro', 'conjurer'], col: 14, tier: 3,
      phaseAt: [0.66, 0.33], phaseText: { 2: 'THE COURT', 3: 'THE MEMORY' },
    });
  }
  attackPool(d) {
    const o = [];
    if (d < 52) o.push('sweep', 'slam', 'tail', 'sweep', 'slam');
    else o.push('volley', 'breath', 'leap', 'charge');
    if (this.bphase >= 2) o.push('spikes', 'nova', 'breath', 'spikes');
    if (this.bphase >= 3) o.push('leap', 'nova', 'charge', 'nova', 'spikes');
    return o;
  }
  doSummon() { super.doSummon(); sfx.play('roar'); }
}

// The Weeping Fens: the Mire Mother, who weeps for what the water took.
export class MireMother extends PatternBoss {
  constructor(scene, x, y) {
    super(scene, x, y, 'miremother', TUNE.miremother, { scale: 2.6, flag: 'mireMotherDead', heart: null, toast: 'THE MIRE MOTHER STOPS WEEPING', summon: ['leech', 'leech', 'bogwraith'], col: 8, tier: 3, phaseAt: [0.5], phaseText: { 2: 'THE FLOOD' } });
  }
  attackPool(d) {
    const o = [];
    if (d < 50) o.push('sweep', 'slam', 'tail', 'sweep');
    else o.push('volley', 'breath', 'leap', 'charge');
    if (this.bphase >= 2) o.push('spikes', 'nova', 'breath', 'spikes');
    return o;
  }
  doSummon() { super.doSummon(); sfx.play('roar'); }
}

// The Stormcrown Highlands: the Storm Giant, keeper of the storm that never leaves.
export class StormGiant extends PatternBoss {
  constructor(scene, x, y) {
    super(scene, x, y, 'stormgiant', TUNE.stormgiant, { scale: 2.8, flag: 'stormGiantDead', heart: null, toast: 'THE STORM GIANT FALLS SILENT', summon: ['nomad', 'nomadshaman', 'thunderbird'], col: 15, tier: 3, phaseAt: [0.66, 0.33], phaseText: { 2: 'THE STORM BREAKS', 3: 'THE EYE' } });
  }
  attackPool(d) {
    const o = [];
    if (d < 52) o.push('sweep', 'slam', 'tail', 'slam');
    else o.push('volley', 'breath', 'leap', 'charge');
    if (this.bphase >= 2) o.push('nova', 'spikes', 'volley', 'nova');
    if (this.bphase >= 3) o.push('leap', 'nova', 'charge', 'spikes');
    return o;
  }
  // Lightning: every few seconds a bolt is marked on the ground where you stand and strikes a moment later. Move.
  special(dt, player) {
    this.bolt = (this.bolt ?? 5) - dt;
    if (this.bolt > 0 || this.invulnerable) return;
    this.bolt = this.bphase >= 3 ? 2.6 : 4.2;
    const pc = player.body.center;
    this.scene.addZone(pc.x, pc.y, 16, 1.0, 18, this); this.scene.flashScreen?.(40, 220, 235, 255);
  }
  doSummon() { super.doSummon(); sfx.play('roar'); }
}

// The Glasswood: the Hartking, guardian of the wood that the glass has grown over. Charges, then rains antler-shards.
export class HartKing extends PatternBoss {
  constructor(scene, x, y) {
    super(scene, x, y, 'hartking', TUNE.hartking, { scale: 2.6, flag: 'hartKingDead', heart: null, toast: 'THE HARTKING LAYS DOWN HIS ANTLERS', summon: ['glimmerkin', 'glimmerkin', 'crystalgolem'], col: 15, tier: 3, phaseAt: [0.66, 0.33], phaseText: { 2: 'THE GLASS RINGS', 3: 'THE STAMPEDE' } });
  }
  attackPool(d) {
    const o = [];
    if (d < 50) o.push('sweep', 'slam', 'tail', 'sweep');
    else o.push('charge', 'volley', 'leap', 'charge');
    if (this.bphase >= 2) o.push('spikes', 'nova', 'charge', 'spikes');
    if (this.bphase >= 3) o.push('charge', 'leap', 'nova', 'charge');
    return o;
  }
  doSummon() { super.doSummon(); sfx.play('roar'); }
  // Glass armour: every so often the Hartking is wrapped in crystal (takes a quarter damage) and three prisms grow around the hall.
  // Smash every prism to shatter the armour and leave him stunned and exposed.
  special(dt) {
    this.glassT = (this.glassT ?? 8) - dt;
    if (!this.glass && this.glassT <= 0 && !this.invulnerable) {
      this.glass = true; this.takenMul = 0.25; this.setTint(0xbff4ff);
      this.prisms = [];
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + Math.random(), x = this.x + Math.cos(a) * 62, y = this.y + Math.sin(a) * 50;
        if (this.scene.solidAt(x, y)) continue;
        const p = this.scene.addEnemy('prism', x, y, { tier: 2 }); p.alert(true); this.prisms.push(p);
      }
      if (!this.prisms.length) this.endGlass(false);
      else { bus.emit('toast', 'GLASS ARMOUR! SHATTER THE PRISMS', 15); sfx.play('nova'); }
    } else if (this.glass) {
      this.prisms = this.prisms.filter((p) => p.active && !p.dead);
      if (!this.prisms.length) this.endGlass(true);
    }
  }
  endGlass(shattered) {
    this.glass = false; this.takenMul = shattered ? 1.4 : 1; this.clearTint();
    this.glassT = this.bphase >= 3 ? 9 : 13;
    if (shattered) {
      this.scene.fx.ring(this.x, this.y, 2, 0.5, 'ring', 0xbff4ff); this.scene.fx.text(this.x, this.y - 30, 'SHATTERED', 15, 1.0); sfx.play('guardbreak');
      this.setState('roar', 1.8); this.body.setVelocity(0, 0);
      this.scene.time.delayedCall(2500, () => { if (!this.dead) this.takenMul = 1; });
    }
  }
  die(info) { for (const p of this.prisms || []) if (p.active && !p.dead) p.destroy(); return super.die(info); }
}

// The Underdeep: the Lode Colossus, a thing of living ore. Slow and enormous; every blow is a landslide.
export class LodeColossus extends PatternBoss {
  constructor(scene, x, y) {
    super(scene, x, y, 'lodecolossus', TUNE.lodecolossus, { scale: 3.0, flag: 'lodeColossusDead', heart: null, toast: 'THE LODE COLOSSUS CRUMBLES', summon: ['lodeling', 'lodeling', 'caveweaver'], col: 12, tier: 3, phaseAt: [0.66, 0.33], phaseText: { 2: 'THE VEIN OPENS', 3: 'THE CAVE-IN' } });
  }
  attackPool(d) {
    const o = [];
    if (d < 54) o.push('slam', 'sweep', 'slam', 'tail');
    else o.push('volley', 'breath', 'leap', 'charge');
    if (this.bphase >= 2) o.push('spikes', 'nova', 'spikes', 'slam');
    if (this.bphase >= 3) o.push('spikes', 'nova', 'leap', 'spikes');
    return o;
  }
  doSummon() { super.doSummon(); sfx.play('roar'); }
  // Cave-in: rubble comes down in a ring around you every few seconds (faster as the vein opens). Keep moving, stay out of the rings.
  special(dt, player) {
    this.caveT = (this.caveT ?? 6) - dt;
    if (this.caveT > 0 || this.invulnerable) return;
    this.caveT = this.bphase >= 3 ? 4.2 : this.bphase >= 2 ? 5.5 : 7;
    const pc = player.body.center, sc = this.scene, n = 3 + this.bphase;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random(), x = pc.x + Math.cos(a) * (28 + Math.random() * 26), y = pc.y + Math.sin(a) * (28 + Math.random() * 26);
      if (!sc.solidAt(x, y)) sc.addZone(x, y, 18, 1.3 + i * 0.1, 14 + this.bphase * 2, this);
    }
    sc.shake(300, 0.006); sfx.play('boom'); bus.emit('toast', 'THE CEILING GROANS', 12);
  }
}

// Saltmarket's Cove: Captain Brinegut, a smuggler lord with a crew. Fast, shoots, and shouts for help.
export class Brinegut extends PatternBoss {
  constructor(scene, x, y) {
    super(scene, x, y, 'brinegut', TUNE.brinegut, { scale: 2.4, flag: 'brinegutDead', heart: null, toast: 'CAPTAIN BRINEGUT STRIKES HIS COLOURS', summon: ['bandit', 'harpooner', 'reaver'], col: 13, tier: 3, phaseAt: [0.5], phaseText: { 2: 'ALL HANDS' } });
  }
  attackPool(d) {
    const o = [];
    if (d < 48) o.push('sweep', 'slam', 'charge', 'sweep');
    else o.push('volley', 'volley', 'charge', 'leap');
    if (this.bphase >= 2) o.push('nova', 'volley', 'charge', 'spikes');
    return o;
  }
  doSummon() { super.doSummon(); sfx.play('roar'); }
  // Broadside: the Captain shouts FIRE and a wall of cannon blasts sweeps across the hall, row by row, with one safe lane. Find the gap.
  special(dt, player) {
    this.broadT = (this.broadT ?? 9) - dt;
    if (this.broadT > 0 || this.invulnerable) return;
    this.broadT = this.bphase >= 2 ? 8 : 11;
    const pc = player.body.center, sc = this.scene, gap = Math.floor(Math.random() * 7), horiz = Math.random() < 0.5;
    for (let i = 0; i < 9; i++) {
      if (i === gap || i === gap + 1) continue;
      for (let row = 0; row < 3; row++) {
        const x = horiz ? pc.x - 100 + i * 25 : pc.x - 60 + row * 60, y = horiz ? pc.y - 60 + row * 60 : pc.y - 100 + i * 25;
        if (!sc.solidAt(x, y)) sc.addZone(x, y, 14, 1.4 + (horiz ? i : row) * 0.05, 16, this);
      }
    }
    sc.fx.text(this.x, this.y - 26, 'FIRE!', 11, 0.9); sfx.play('alert'); sc.shake(150, 0.005);
  }
}
