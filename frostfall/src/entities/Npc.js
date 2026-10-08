import { NPC_BARKS } from '../data/story.js';
import Phaser from 'phaser';
import { SCRIPTS, NPC_DEFS } from '../data/dialogue.js';
import { runScript, say } from '../systems/dialogue.js';
import { S } from '../systems/state.js';
import { addGold } from '../systems/inventory.js';
import { sfx } from '../audio/sfx.js';
import { randInt } from '../util.js';
import { bus } from '../systems/bus.js';
import { txtS, textW } from '../art/font.js';
import { facingKind } from '../util.js';

export default class Npc extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y, id) {
    const def = NPC_DEFS[id];
    super(scene, x, y, def.tex, 'down0');
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.body.setSize(10, 7).setOffset(3, 9);
    this.id = id;
    this.ix = x; this.iy = y;
    this.face = { x: 0, y: 1 };
    this.t = Math.random() * 6;
    this.shadow = scene.add.image(x, y + 7, 'shadow');
    this.nameTxt = txtS(scene, Math.round(x - textW(def.name) / 2), Math.round(y - 20), def.name, 4, 0);
    this.setDepth(y + 8); this.shadow.setDepth(y + 6); this.nameTxt.setDepth(99300);
    this.walking = false;
    this.angryT = 0;
  }

  canInteract() { return !this.walking && !this.away; }

  // Night schedule: villagers go indoors (hidden outside, present in their house).
  setAway(a) {
    this.away = a;
    this.setVisible(!a); this.shadow.setVisible(!a); this.nameTxt.setVisible(!a);
    this.body.enable = !a;
  }
  label() { return this.angryT > 0 ? 'E: ...' : this.scene.player.sneaking ? 'E: PICKPOCKET' : 'E: TALK'; }

  async interact() {
    const p = this.scene.player;
    if (this.angryT > 0) { await runScript(() => say(NPC_DEFS[this.id].name.split(' ').pop(), 'I have nothing to say to a thief.')); return; }
    if (p.sneaking && this.id !== 'ragna') { await this.pickpocket(p); return; }
    this.lookAt(p.x, p.y);
    await runScript(() => SCRIPTS[this.id]());
  }

  // Sneak up and press E: chance depends on Sneak skill and whether they are looking away.
  async pickpocket(p) {
    const away = (this.face.x * (p.x - this.x) + this.face.y * (p.y - this.y)) < 0;
    const chance = Math.min(0.9, 0.3 + 0.035 * S.skills.sneak.lvl + (away ? 0.25 : 0));
    if (Math.random() < chance) {
      const g = randInt(8, 22) + S.skills.sneak.lvl;
      addGold(g); p.gainXp('sneak', 14); sfx.play('coin');
      this.scene.fx.text(p.x, p.y - 14, 'STOLEN', 13, 0.9);
    } else {
      this.angryT = 90;
      sfx.play('hurt');
      const fine = Math.min(S.gold, 15); S.gold -= fine;
      p.gainXp('sneak', 3);
      await runScript(() => say(NPC_DEFS[this.id].name.split(' ').pop(), 'THIEF! Hands off! That will cost you ' + fine + ' gold.'));
    }
  }

  lookAt(x, y) {
    const dx = x - this.x, dy = y - this.y;
    this.face = Math.abs(dx) > Math.abs(dy) ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) };
  }

  // Walk to a world position (used after the intro).
  walkTo(x, y, speed = 36) {
    return new Promise((res) => {
      this.walking = true;
      const d = Math.hypot(x - this.x, y - this.y);
      this.face = Math.abs(x - this.x) > Math.abs(y - this.y) ? { x: Math.sign(x - this.x), y: 0 } : { x: 0, y: Math.sign(y - this.y) };
      this.scene.tweens.add({
        targets: this, x, y, duration: (d / speed) * 1000,
        onUpdate: () => { this.ix = this.x; this.iy = this.y; this.body.updateFromGameObject(); },
        onComplete: () => { this.walking = false; this.ix = x; this.iy = y; this.body.updateFromGameObject(); res(); },
      });
    });
  }

  update(dt, player) {
    this.t += dt;
    if (this.angryT > 0) this.angryT -= dt;
    this.barkT = (this.barkT ?? 12 + Math.random() * 20) - dt;
    if (this.barkT <= 0) {
      this.barkT = 30 + Math.random() * 40;
      const f = NPC_BARKS[this.id];
      if (f && !this.away && Math.hypot(player.x - this.x, player.y - this.y) < 80 && !this.scene.player.sneaking) {
        const ls = f(); this.scene.fx.text(this.x, this.y - 26, ls[Math.floor(Math.random() * ls.length)], 5, 3.2);
      }
    }
    const near = Math.hypot(player.x - this.x, player.y - this.y) < 44;
    if (near && !this.walking) this.lookAt(player.x, player.y);
    else if (!this.walking) {                       // idle life: a slow breath, and now and then a glance around
      this.glanceT = (this.glanceT ?? 3 + Math.random() * 6) - dt;
      if (this.glanceT <= 0) { this.glanceT = 5 + Math.random() * 8; const d = [{ x: 0, y: 1 }, { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: -1 }][Math.floor(Math.random() * 4)]; this.face = d; }
    }
    this.setOrigin(0.5, 0.5 + ((!this.walking && Math.sin(this.t * 1.7) > 0.55) ? 1 / 16 : 0));
    const kind = facingKind(this.face.x, this.face.y);
    const fr = this.walking ? 1 + (Math.floor(this.t * 6) % 2) : 0;
    this.setFrame(kind + fr).setFlipX(kind === 'side' && this.face.x < 0);
    this.setDepth(this.y + 8);
    this.shadow.setPosition(this.x, this.y + 7).setDepth(this.y + 6);
    const d = Math.hypot(player.x - this.x, player.y - this.y);
    this.nameTxt.setPosition(Math.round(this.x - this.nameTxt.width / 2), Math.round(this.y - 21));
    this.nameTxt.setAlpha(this.away ? 0 : Math.max(0, Math.min(1, (80 - d) / 30)));
  }
}
