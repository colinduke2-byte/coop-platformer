import Phaser from 'phaser';
import { bonus } from '../systems/skills.js';
import { sfx } from '../audio/sfx.js';
import { dist } from '../util.js';
import { S } from '../systems/state.js';

// kind: arrow | fire | frost (player)   bolt | eshot (enemy)
export default class Projectile extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, kind, vx, vy, opts = {}) {
    const tex = { arrow: 'arrow', fire: 'fireball', frost: 'frostbolt', bolt: 'arrow', eshot: 'bolt' }[kind];
    super(scene, x, y, tex);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.kind = kind;
    this.dmg = opts.dmg ?? 5;
    this.charge = opts.charge ?? 0;
    this.ally = !!opts.ally;
    this.ammo = opts.ammo || 'arrow';
    if (this.ammo === 'fire_arrow') this.setTint(0xf08a30); else if (this.ammo === 'bleed_arrow') this.setTint(0xc8383c);
    this.life = opts.life ?? 1.4;
    this.enemyOwned = kind === 'bolt' || kind === 'eshot';
    this.body.setSize(4, 4).setOffset((this.width - 4) / 2, (this.height - 4) / 2);
    this.body.setVelocity(vx, vy);
    this.setRotation(kind === 'fire' || kind === 'frost' || kind === 'eshot' ? 0 : Math.atan2(vy, vx));
    if (kind === 'bolt') this.setTint(0xf08a30);
    this.setDepth(y + 20);
    this.done = false;
    this.t = 0;
  }

  update(dt) {
    if (this.done) return;
    this.t += dt;
    this.life -= dt;
    this.setDepth(this.y + 20);
    if (this.kind === 'fire') { this.setScale(1 + Math.sin(this.t * 30) * 0.12); if (Math.random() < 0.7) this.scene.fx.trail(this.x, this.y, Math.random() < 0.5 ? 12 : 13, 0.28); }
    if (this.kind === 'frost') { this.rotation += dt * 10; if (Math.random() < 0.6) this.scene.fx.trail(this.x, this.y, Math.random() < 0.5 ? 15 : 6, 0.25); }
    if (this.kind === 'eshot') { this.rotation += dt * 8; if (Math.random() < 0.5) this.scene.fx.trail(this.x, this.y, 15, 0.2); }
    if (this.life <= 0) this.fizzle();
  }

  fizzle() {
    if (this.done) return;
    if (this.kind === 'fire') return this.explode();
    if (this.kind === 'arrow' && Math.random() < 0.5) this.scene.spawnLoot(this.x, this.y, null, [['arrows', 1, [1, 1]]]);
    this.finish();
  }

  finish() {
    this.done = true;
    this.body.enable = false;
    this.destroy();
  }

  wall() {
    if (this.done) return;
    if (this.kind === 'fire') return this.explode();
    if (this.kind === 'arrow' || this.kind === 'bolt') {
      sfx.play('arrowhit'); this.scene.fx.puff(this.x, this.y, 5, 3, 25, 0.25);
      if (this.kind === 'arrow' && Math.random() < 0.55) this.scene.spawnLoot(this.x - this.body.velocity.x * 0.02, this.y - this.body.velocity.y * 0.02, null, [['arrows', 1, [1, 1]]]);
    }
    if (this.kind === 'frost' || this.kind === 'eshot') this.scene.fx.puff(this.x, this.y, 15, 6, 35, 0.3);
    this.finish();
  }

  // ---- player projectile hits an enemy
  hitEnemy(e) {
    if (this.done || e.dead || this.enemyOwned) return;
    const sc = this.scene, pl = sc.player;
    const kx = this.body.velocity.x, ky = this.body.velocity.y;
    if (this.kind === 'arrow') {
      if (this.ally) {
        const d = e.takeHit({ dmg: this.dmg, kx, ky, kb: 50, src: 'arrow', stun: 0.15 });
        if (d > 0) { sc.fx.text(e.x, e.y - 10, String(d), 5); sfx.play('hit'); }
        this.finish();
        return;
      }
      if (this.hitSet?.has(e)) return;
      (this.hitSet ||= new Set()).add(e);
      const sneak = !e.alerted && pl.sneaking;
      const mult = (sneak ? 2 + bonus.sneakAttack() * 0.5 : 1) * (S.perks.eagleeye && !e.alerted ? 1.25 : 1);
      const special = this.ammo;
      const dealt = e.takeHit({
        dmg: this.dmg * mult, kx, ky, kb: 55 + 70 * this.charge, src: 'arrow', stun: 0.18 + 0.2 * this.charge, fromX: sc.player.x, fromY: sc.player.y,
        element: special === 'fire_arrow' ? 'fire' : null,
        dot: special === 'fire_arrow' ? { dps: 4, t: 3, col: 12 } : special === 'bleed_arrow' ? { dps: 3, t: 5, col: 11 } : null,
      });
      if (dealt <= 0) { this.finish(); return; }
      sc.fx.text(e.x, e.y - 10, String(dealt), sneak ? 13 : 6);
      if (sneak) { sc.fx.text(e.x, e.y - 20, 'SNEAK ATTACK', 13); pl.gainXp('sneak', 8); sfx.play('crit'); } else sfx.play('hit');
      pl.gainXp('archery', 3 + Math.round(this.charge * 3) + (e.dead ? 3 : 0));
      sc.hitStop(0.035);
      if (S.perks.piercing && !this.pierced) { this.pierced = true; this.dmg *= 0.7; return; }
      this.finish();
    } else if (this.kind === 'frost') {
      const dealt = e.takeHit({ dmg: this.dmg, kx, ky, kb: 40, src: 'frost', element: 'frost', slow: 3.5 + (S.perks.frostbite ? 2 : 0), stun: 0.12 });
      sc.fx.text(e.x, e.y - 10, String(dealt), 15);
      sc.fx.puff(e.x, e.y, 15, 8, 40, 0.4);
      sfx.play('hit');
      pl.gainXp('destruction', 3 + (e.dead ? 3 : 0));
      this.finish();
    } else if (this.kind === 'fire') {
      this.explode();
    }
  }

  explode() {
    if (this.done) return;
    this.done = true;
    const sc = this.scene, pl = sc.player;
    const R = 24;
    sfx.play('boom');
    sc.fx.ring(this.x, this.y, 0.6, 0.3, 'ring', 0xf08a30);
    sc.fx.puff(this.x, this.y, 12, 10, 60, 0.45);
    sc.fx.puff(this.x, this.y, 13, 6, 45, 0.35);
    sc.fx.puff(this.x, this.y, 5, 4, 30, 0.5);
    sc.shake(110, 0.005);
    sc.breakAt(this.x, this.y, R + 4);
    sc.noise(this.x, this.y, 80);
    for (const e of sc.enemies.getChildren()) {
      if (e.dead || dist(e.x, e.y, this.x, this.y) > R) continue;
      const dealt = e.takeHit({ dmg: this.dmg, kx: e.x - this.x, ky: e.y - this.y, kb: 95, src: 'fire', element: 'fire', stun: 0.28 });
      sc.fx.text(e.x, e.y - 10, String(dealt), 12);
      pl.gainXp('destruction', 3 + (e.dead ? 3 : 0));
    }
    this.body.enable = false;
    this.destroy();
  }

  // ---- enemy projectile hits the player
  hitPlayer(p) {
    if (this.done || !this.enemyOwned) return;
    if (p.hurt(this.dmg, this.x - this.body.velocity.x, this.y - this.body.velocity.y, { kb: 70 })) this.finish();
  }
}
