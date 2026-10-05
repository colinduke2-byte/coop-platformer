// Delayed ground hazards (caster spells) and attack tokens for enemy crowd control.
import { C } from '../config.js';
import { sfx } from '../audio/sfx.js';

export const zoneMethods = {
  // A telegraphed circle that detonates after `delay` seconds.
  addZone(x, y, r, delay, dmg, owner) {
    const disc = this.add.image(x, y, 'disc').setTint(C[14]).setAlpha(0.18).setScale(r / 32).setDepth(4);
    const rg = this.add.image(x, y, 'ring').setTint(C[15]).setAlpha(0.8).setScale(r / 32).setDepth(5);
    this.zones.push({ x, y, r, t: delay, total: delay, dmg, owner, disc, rg });
  },

  updateZones(dt) {
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i];
      z.t -= dt;
      const k = 1 - z.t / z.total;
      z.disc.setAlpha(0.15 + 0.35 * k);
      z.rg.setScale((z.r / 32) * (1.25 - 0.25 * k));
      if (z.t > 0) continue;
      sfx.play('boom');
      this.fx.ring(z.x, z.y, z.r / 32 * 1.2, 0.35, 'ring', 0x8a5aa8);
      this.fx.puff(z.x, z.y, 14, 10, 55, 0.5);
      this.fx.puff(z.x, z.y, 15, 6, 40, 0.5);
      this.shake(120, 0.005);
      const pc = this.player.body.center;
      if (Math.hypot(pc.x - z.x, pc.y - z.y) < z.r + 3) this.player.hurt(z.dmg, z.x, z.y, { kb: 110, attacker: z.owner });
      z.disc.destroy(); z.rg.destroy();
      this.zones.splice(i, 1);
    }
  },

  // At most N melee enemies may be committed to an attack at once; the rest circle the player.
  takeToken(e) {
    let n = 0;
    for (const o of this.enemies.getChildren()) {
      if (o === e || o.dead || o.isBoss) continue;
      if ((o.state === 'windup' || o.state === 'attack') && (o.cfg.kind === 'melee' || o.cfg.kind === 'lunge')) n++;
    }
    return n < 2;
  },
};
