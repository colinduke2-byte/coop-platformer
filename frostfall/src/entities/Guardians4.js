// The bosses of the Embergreen Vale and the Sunscorch Reach.
import PatternBoss from './PatternBoss.js';
import { TUNE } from '../data/tuning.js';
import { sfx } from '../audio/sfx.js';
import { bus } from '../systems/bus.js';

// The Embergreen Vale: the Blight Mother, the grove's guardian gone to rot. Roots in to heal behind poison pods, rains spores.
export class BlightMother extends PatternBoss {
  constructor(scene, x, y) {
    super(scene, x, y, 'blightmother', TUNE.blightmother, { scale: 2.6, flag: 'blightMotherDead', heart: null, toast: 'THE BLIGHT MOTHER WITHERS', summon: ['thornling', 'thornling', 'hornet'], col: 8, tier: 2, phaseAt: [0.5], phaseText: { 2: 'THE GROVE SCREAMS' } });
  }
  attackPool(d) {
    const o = [];
    if (d < 50) o.push('sweep', 'slam', 'tail', 'sweep');
    else o.push('volley', 'breath', 'spikes', 'volley');
    if (this.bphase >= 2) o.push('spikes', 'nova', 'breath', 'spikes');
    return o;
  }
  doSummon() { super.doSummon(); sfx.play('roar'); }
  // Rootbound: now and then she sinks her roots into the hall (takes a quarter damage and mends) and pods bloom around her.
  // Kill every pod to tear her loose, stunned and exposed.
  special(dt, player) {
    this.rootT = (this.rootT ?? 9) - dt;
    if (!this.rooted && this.rootT <= 0 && !this.invulnerable) {
      this.rooted = true; this.takenMul = 0.25; this.setTint(0x9ad890);
      this.pods = [];
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + Math.random(), x = this.x + Math.cos(a) * 64, y = this.y + Math.sin(a) * 52;
        if (this.scene.solidAt(x, y)) continue;
        const p = this.scene.addEnemy('blightbloom', x, y, { tier: 2 }); p.alert(true); this.pods.push(p);
      }
      if (!this.pods.length) this.endRoot(false);
      else { bus.emit('toast', 'ROOTBOUND! DESTROY THE PODS', 8); sfx.play('nova'); }
    } else if (this.rooted) {
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.006 * dt * 60 / 60);
      this.pods = this.pods.filter((p) => p.active && !p.dead);
      if (!this.pods.length) this.endRoot(true);
    }
  }
  endRoot(torn) {
    this.rooted = false; this.takenMul = torn ? 1.4 : 1; this.clearTint();
    this.rootT = this.bphase >= 2 ? 10 : 14;
    if (torn) {
      this.scene.fx.ring(this.x, this.y, 2, 0.5, 'ring', 0x9ad890); this.scene.fx.text(this.x, this.y - 30, 'TORN LOOSE', 8, 1.0); sfx.play('guardbreak');
      this.setState('roar', 1.8); this.body.setVelocity(0, 0);
      this.scene.time.delayedCall(2500, () => { if (!this.dead) this.takenMul = 1; });
    }
  }
  die(info) { for (const p of this.pods || []) if (p.active && !p.dead) p.destroy(); return super.die(info); }
}

// The Sunscorch Reach: the Vault Sovereign, the last of the desert kings, still guarding what they sealed. Sunbeams and gilded guards.
export class VaultSovereign extends PatternBoss {
  constructor(scene, x, y) {
    super(scene, x, y, 'vaultsovereign', TUNE.vaultsovereign, { scale: 2.6, flag: 'vaultSovereignDead', heart: null, toast: 'THE VAULT SOVEREIGN CRUMBLES', summon: ['sunsentinel', 'wrapped', 'wrapped'], col: 13, tier: 3, phaseAt: [0.66, 0.33], phaseText: { 2: 'THE VAULT BURNS', 3: 'THE LAST SUN' } });
  }
  attackPool(d) {
    const o = [];
    if (d < 52) o.push('slam', 'sweep', 'tail', 'slam');
    else o.push('volley', 'charge', 'breath', 'leap');
    if (this.bphase >= 2) o.push('nova', 'spikes', 'charge', 'volley');
    if (this.bphase >= 3) o.push('nova', 'leap', 'spikes', 'nova');
    return o;
  }
  doSummon() { super.doSummon(); sfx.play('roar'); }
  // Sunbeams: a column of light falls in a line toward you every few seconds, marked on the floor first. Step out of the line.
  special(dt, player) {
    this.beamT = (this.beamT ?? 6) - dt;
    if (this.beamT > 0 || this.invulnerable) return;
    this.beamT = this.bphase >= 3 ? 4.2 : this.bphase >= 2 ? 5.2 : 6.5;
    const pc = player.body.center, sc = this.scene, a = Math.atan2(pc.y - this.cy, pc.x - this.cx), n = 5 + this.bphase;
    for (let i = 1; i <= n; i++) {
      const x = this.cx + Math.cos(a) * i * 22, y = this.cy + Math.sin(a) * i * 22;
      if (!sc.solidAt(x, y)) sc.addZone(x, y, 15, 1.1 + i * 0.07, 14 + this.bphase * 2, this);
    }
    sc.shake(200, 0.005); sfx.play('boom'); bus.emit('toast', 'SUNBEAM!', 13);
  }
}
