import Phaser from 'phaser';
import { W, H, C } from '../config.js';
import { txt, txtS } from '../art/font.js';
import { S } from '../systems/state.js';
import { bus } from '../systems/bus.js';

const BARS = [
  { key: 'hp', max: 'maxHp', col: 11, hi: 12, label: 'HP' },
  { key: 'mp', max: 'maxMp', col: 15, hi: 6, label: 'MP' },
  { key: 'sp', max: 'maxSp', col: 8, hi: 5, label: 'SP' },
];

export default class HudScene extends Phaser.Scene {
  constructor() { super('Hud'); }

  create() {
    this.g = this.add.graphics();
    this.labels = BARS.map((b, i) => txt(this, 3, 3 + i * 9, b.label, b.col));
    this.goldTxt = txt(this, 0, 3, '', 13);
    this.arrowTxt = txt(this, 0, 13, '', 5);
    this.flashSp = 0;
    this.dead = this.add.container(0, 0).setVisible(false);
    this.dead.add(this.add.rectangle(0, 0, W, H, 0x0b0e1a, 0.6).setOrigin(0));
    const d1 = txt(this, 0, 74, 'YOU DIED', 11).setScale(3);
    d1.x = Math.floor((W - d1.width * 3) / 2);
    this.dead.add(d1);
    this.noSp = () => { this.flashSp = 0.3; };
    this.onDead = () => this.dead.setVisible(true);
    bus.on('nostamina', this.noSp);
    bus.on('player:dead', this.onDead);
    this.events.once('shutdown', () => { bus.off('nostamina', this.noSp); bus.off('player:dead', this.onDead); });
    this.coin = this.add.image(0, 0, 'icon_coin').setOrigin(0).setVisible(false);
  }

  update(_, ms) {
    const dt = ms / 1000;
    const g = this.g;
    g.clear();
    this.dead.setVisible(S.hp <= 0);
    this.flashSp -= dt;
    BARS.forEach((b, i) => {
      const x = 17, y = 3 + i * 9;
      const w = Math.min(110, Math.round(S[b.max] * 0.62));
      const frac = Math.max(0, S[b.key] / S[b.max]);
      g.fillStyle(C[0]); g.fillRect(x - 1, y - 1, w + 2, 9);
      g.fillStyle(C[1]); g.fillRect(x, y, w, 7);
      const fw = Math.round(w * frac);
      const low = b.key === 'sp' && this.flashSp > 0 && Math.floor(this.flashSp * 20) % 2 === 0;
      g.fillStyle(low ? C[11] : C[b.col]); g.fillRect(x, y, fw, 7);
      g.fillStyle(C[b.hi]); g.fillRect(x, y, fw, 1);
    });
    const gold = String(S.gold);
    this.goldTxt.setText(gold).x = W - 4 - gold.length * 6;
    this.arrowTxt.setText('>' + S.arrows).x = W - 4 - (String(S.arrows).length + 1) * 6;
  }
}
