import Phaser from 'phaser';
import { W, H, C } from '../config.js';
import { txt, textW } from '../art/font.js';
import { S } from '../systems/state.js';
import { bus } from '../systems/bus.js';
import { SPELLS, P } from '../entities/Player.js';
import { iconKey } from '../data/items.js';

const BARS = [
  { key: 'hp', max: 'maxHp', col: 11, hi: 12, label: 'HP', flash: 'nohp' },
  { key: 'mp', max: 'maxMp', col: 15, hi: 6, label: 'MP', flash: 'nomana' },
  { key: 'sp', max: 'maxSp', col: 8, hi: 5, label: 'SP', flash: 'nostamina' },
];
const POTIONS = [['hp_potion', '1'], ['mp_potion', '2'], ['sp_potion', '3']];

export default class HudScene extends Phaser.Scene {
  constructor() { super('Hud'); }

  get gs() { return this.scene.get('Game'); }

  create() {
    this.g = this.add.graphics();
    this.flash = { hp: 0, mp: 0, sp: 0 };
    this.labels = BARS.map((b, i) => txt(this, 3, 3 + i * 8, b.label, 5));
    this.goldTxt = txt(this, 0, 3, '', 13);
    this.arrowTxt = txt(this, 0, 13, '', 5);
    this.coinImg = this.add.image(0, 4, 'mini_coin').setOrigin(0);
    this.arrImg = this.add.image(0, 15, 'mini_arrow').setOrigin(0);

    // bottom-left: spell + shout slots
    this.spellIcons = { fire: this.add.image(4, H - 20, 'icon_fire').setOrigin(0), frost: this.add.image(4, H - 20, 'icon_frost').setOrigin(0) };
    this.add.image(25, H - 20, 'icon_shout').setOrigin(0);
    this.spellLbl = txt(this, 4, H - 28, 'Q', 4);
    this.shoutLbl = txt(this, 25, H - 28, 'R', 4);
    this.spellName = txt(this, 44, H - 12, '', 5);
    // potions
    this.potIcons = POTIONS.map(([id, k], i) => {
      const x = W - 3 * 21 + i * 20 - 2;
      const img = this.add.image(x + 1, H - 20, iconKey(id)).setOrigin(0);
      return { id, img, key: txt(this, x + 1, H - 28, k, 4), cnt: txt(this, x + 10, H - 9, '', 6), x };
    });

    this.dead = this.add.container(0, 0).setVisible(false);
    this.dead.add(this.add.rectangle(0, 0, W, H, 0x0b0e1a, 0.6).setOrigin(0));
    const d1 = txt(this, 0, 74, 'YOU DIED', 11).setScale(3);
    d1.x = Math.floor((W - d1.width * 3) / 2);
    this.dead.add(d1);

    this.handlers = {};
    for (const b of BARS) { this.handlers[b.flash] = () => { this.flash[b.key] = 0.3; }; bus.on(b.flash, this.handlers[b.flash]); }
    this.events.once('shutdown', () => { for (const [k, fn] of Object.entries(this.handlers)) bus.off(k, fn); });
  }

  update(_, ms) {
    const dt = ms / 1000;
    const g = this.g;
    const pl = this.gs.player;
    g.clear();
    this.dead.setVisible(S.hp <= 0);

    // panels
    g.fillStyle(C[0], 0.62);
    g.fillRect(0, 0, 134, 28);
    BARS.forEach((b, i) => {
      this.flash[b.key] -= dt;
      const x = 17, y = 3 + i * 8;
      const w = Math.min(110, Math.round(S[b.max] * 0.62));
      const frac = Math.max(0, S[b.key] / S[b.max]);
      g.fillStyle(C[0]); g.fillRect(x - 1, y - 1, w + 2, 7);
      g.fillStyle(C[1]); g.fillRect(x, y, w, 5);
      const fw = Math.round(w * frac);
      const low = this.flash[b.key] > 0 && Math.floor(this.flash[b.key] * 20) % 2 === 0;
      g.fillStyle(low ? C[11] : C[b.col]); g.fillRect(x, y, fw, 5);
      g.fillStyle(C[b.hi]); g.fillRect(x, y, fw, 1);
    });

    // gold + arrows
    const gold = String(S.gold), ar = String(S.arrows);
    const gw = textW(gold), aw = textW(ar);
    g.fillStyle(C[0], 0.62); g.fillRect(W - 14 - Math.max(gw, aw) - 6, 0, Math.max(gw, aw) + 20, 23);
    this.goldTxt.setText(gold).x = W - 4 - gw;
    this.arrowTxt.setText(ar).x = W - 4 - aw;
    this.coinImg.x = W - 12 - Math.max(gw, aw);
    this.arrImg.x = W - 14 - Math.max(gw, aw);

    // spell + shout slots
    const sp = SPELLS[S.spell];
    const box = (x, y) => { g.fillStyle(C[0], 0.7); g.fillRect(x - 1, y - 1, 18, 18); g.lineStyle(1, C[3]); g.strokeRect(x - 0.5, y - 0.5, 17, 17); };
    box(4, H - 20); box(25, H - 20);
    this.spellIcons.fire.setVisible(S.spell === 'fire');
    this.spellIcons.frost.setVisible(S.spell === 'frost');
    const afford = S.mp >= sp.cost;
    this.spellIcons[S.spell].setAlpha(afford ? 1 : 0.4);
    this.spellName.setText(sp.name);
    const cdFrac = Math.max(0, pl.shoutCd / P.shout.cooldown);
    if (cdFrac > 0) { g.fillStyle(C[0], 0.75); g.fillRect(25, H - 20, 16, Math.ceil(16 * cdFrac)); }

    // potions
    this.potIcons.forEach((p) => {
      box(p.x + 1, H - 20);
      const n = S.inv[p.id] || 0;
      p.img.setAlpha(n ? 1 : 0.3);
      p.cnt.setText(n ? String(n) : '');
    });

    // sneak indicator
    if (pl.sneaking) {
      const seen = this.gs.enemies.getChildren().some((e) => e.alerted && !e.dead);
      g.fillStyle(C[0], 0.65); g.fillRect(W / 2 - 25, 3, 50, 10);
      if (!this.sneakTxt) this.sneakTxt = txt(this, 0, 5, '', 4);
      this.sneakTxt.setText(seen ? 'DETECTED' : 'HIDDEN').setVisible(true);
      this.sneakTxt.x = Math.round(W / 2 - this.sneakTxt.width / 2);
      this.sneakTxt.y = 5;
      this.sneakTxt.setFont(seen ? 'f11' : 'f15');
    } else this.sneakTxt?.setVisible(false);
  }
}
