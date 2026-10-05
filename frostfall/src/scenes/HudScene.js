import Phaser from 'phaser';
import { W, H, C } from '../config.js';
import { txt, textW, wrap, normText } from '../art/font.js';
import { keys } from '../systems/keys.js';
import { ui } from '../systems/ui.js';
import { dialogue } from '../systems/dialogue.js';
import { sfx } from '../audio/sfx.js';
import { QUESTS, activeQuestIds } from '../data/quests.js';
import { S } from '../systems/state.js';
import { bus } from '../systems/bus.js';
import { SPELLS, P } from '../entities/Player.js';
import { iconKey } from '../data/items.js';
import { SKILL_DEFS } from '../systems/skills.js';

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

    this.toasts = [];
    this.area = null;
    this.onToast = (text, col = 6) => { this.toasts.push({ t: txt(this, 4, 0, text, col), life: 2.4 }); if (this.toasts.length > 5) this.toasts.shift().t.destroy(); };
    this.onArea = (name) => { this.area?.destroy(); this.area = txt(this, 0, 36, name, 5); this.area.x = Math.round((W - this.area.width) / 2); this.areaT = 3; };
    bus.on('toast', this.onToast); bus.on('area', this.onArea);
    this.banners = [];
    this.bannerObj = null;
    this.onLevel = (skill, lv) => this.banners.push({ skill, lv });
    bus.on('levelup', this.onLevel);
    // dialogue box
    this.dlg = null;
    this.dg = this.add.graphics().setDepth(10);
    this.dName = txt(this, 14, H - 61, '', 13).setDepth(11);
    this.dBody = txt(this, 14, H - 49, '', 6).setDepth(11);
    this.dChoice = [0, 1, 2, 3, 4, 5].map((i) => txt(this, 22, H - 52 + i * 9, '', 6).setDepth(11));
    this.dMore = txt(this, W - 22, H - 15, '\u25B6', 13).setDepth(11);
    dialogue.hud = this;
    this.questTxt = [txt(this, 0, 26, '', 4), txt(this, 0, 35, '', 4)];
    this.hint = null;
    this.onHint = (text) => { this.hint?.destroy(); this.hint = txt(this, 0, 5, text, 5); this.hint.x = Math.round((W - this.hint.width) / 2); this.hintT = 12; this.hintH = text.split('\n').length * 9 + 3; };
    bus.on('hint', this.onHint);
    this.dead = this.add.container(0, 0).setVisible(false);
    this.dead.add(this.add.rectangle(0, 0, W, H, 0x0b0e1a, 0.6).setOrigin(0));
    const d1 = txt(this, 0, 74, 'YOU DIED', 11).setScale(3);
    d1.x = Math.floor((W - d1.width * 3) / 2);
    this.dead.add(d1);

    this.handlers = {};
    for (const b of BARS) { this.handlers[b.flash] = () => { this.flash[b.key] = 0.3; }; bus.on(b.flash, this.handlers[b.flash]); }
    this.events.once('shutdown', () => { for (const [k, fn] of Object.entries(this.handlers)) bus.off(k, fn); bus.off('toast', this.onToast); bus.off('area', this.onArea); bus.off('levelup', this.onLevel); bus.off('hint', this.onHint); if (dialogue.hud === this) dialogue.hud = null; });
  }

  // ------------------------------------------------------- dialogue API
  say(name, text) {
    return new Promise((res) => {
      const lines = wrap(normText(text), 47).split('\n');
      const pages = [];
      for (let i = 0; i < lines.length; i += 3) pages.push(lines.slice(i, i + 3).join('\n'));
      this.name = name;
      this.dlg = { name, pages, p: 0, n: 0, t: 0, res, choices: null, age: 0 };
    });
  }

  choose(opts) {
    return new Promise((res) => {
      this.dlg = { name: this.name || '', pages: [''], p: 0, n: 0, t: 0, res, choices: opts, sel: 0, age: 0 };
    });
  }

  hideBox() {
    this.dlg = null;
    this.dg.clear();
    this.dName.setText(''); this.dBody.setText(''); this.dMore.setVisible(false);
    this.dChoice.forEach((c) => c.setText(''));
  }

  updateDialogue(dt) {
    const d = this.dlg, g = this.dg;
    g.clear();
    if (!d) { this.dMore.setVisible(false); return; }
    d.age++;
    const h = d.choices ? 14 + Math.min(6, d.choices.length) * 9 : 52;
    const top = H - 6 - h;
    g.fillStyle(C[0]); g.fillRect(6, top, W - 12, h);
    g.fillStyle(C[3]); g.fillRect(7, top + 1, W - 14, h - 2);
    g.fillStyle(C[1]); g.fillRect(8, top + 2, W - 16, h - 4);
    if (d.name) {
      const w = textW(d.name) + 10;
      g.fillStyle(C[0]); g.fillRect(10, top - 8, w, 12);
      g.fillStyle(C[3]); g.fillRect(11, top - 7, w - 2, 10);
      g.fillStyle(C[2]); g.fillRect(12, top - 6, w - 4, 8);
    }
    this.dName.setText(d.name || '').setPosition(15, top - 5);
    if (d.choices) {
      this.dBody.setText('');
      this.dMore.setVisible(false);
      this.dChoice.forEach((c, i) => {
        const o = d.choices[i];
        c.setText(o ? (i === d.sel ? '\u25B6 ' : '  ') + o : '');
        c.setFont(i === d.sel ? 'f13' : 'f6');
        c.setPosition(14, top + 7 + i * 9);
      });
      if (d.age < 3) return;
      if (keys.pressed('down')) { d.sel = (d.sel + 1) % d.choices.length; sfx.play('move'); }
      if (keys.pressed('up')) { d.sel = (d.sel + d.choices.length - 1) % d.choices.length; sfx.play('move'); }
      if (keys.pressed('interact')) { sfx.play('select'); const r = d.res, s = d.sel; this.dlg = null; this.dChoice.forEach((c) => c.setText('')); r(s); }
      return;
    }
    this.dChoice.forEach((c) => c.setText(''));
    const page = d.pages[d.p];
    if (d.n < page.length) {
      d.t += dt;
      while (d.t > 0.022 && d.n < page.length) { d.t -= 0.022; d.n++; if (d.n % 2 === 0 && page[d.n - 1] !== ' ' && page[d.n - 1] !== '\n') sfx.play('blip'); }
      if (d.age > 2 && keys.pressed('interact')) d.n = page.length;
    } else if (d.age > 2) {
      this.dMore.setVisible(Math.floor(this.time.now / 300) % 2 === 0).setPosition(W - 22, H - 16);
      if (keys.pressed('interact')) {
        if (d.p < d.pages.length - 1) { d.p++; d.n = 0; d.t = 0; sfx.play('select'); }
        else { const r = d.res; this.dlg = null; this.dMore.setVisible(false); r(); }
      }
    }
    this.dBody.setText(page.slice(0, d.n)).setPosition(15, top + 6);
    if (d.n < page.length) this.dMore.setVisible(false);
  }

  update(_, ms) {
    const dt = ms / 1000;
    this.updateDialogue(dt);
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
    this.coinImg.x = W - 13 - Math.max(gw, aw);
    this.arrImg.x = W - 16 - Math.max(gw, aw);

    // spell + shout slots
    g.fillStyle(C[0], 0.62);
    g.fillRect(0, H - 31, 104, 31);
    g.fillRect(W - 66, H - 31, 66, 31);
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

    // toasts stack above the bottom-left slots
    for (let i = this.toasts.length - 1; i >= 0; i--) {
      const ts = this.toasts[i];
      ts.life -= dt;
      if (ts.life <= 0) { ts.t.destroy(); this.toasts.splice(i, 1); }
    }
    this.toasts.forEach((ts, i) => {
      ts.t.y = H - 36 - (this.toasts.length - 1 - i) * 9;
      ts.t.setAlpha(Math.min(1, ts.life * 2.5));
      g.fillStyle(C[0], 0.5 * Math.min(1, ts.life * 2.5)); g.fillRect(2, ts.t.y - 1, ts.t.width + 4, 9);
    });
    if (this.area) {
      this.areaT -= dt;
      this.area.setAlpha(Math.max(0, Math.min(1, this.areaT)));
      g.fillStyle(C[0], 0.5 * Math.max(0, Math.min(1, this.areaT))); g.fillRect(this.area.x - 4, 34, this.area.width + 8, 11);
      if (this.areaT <= 0) { this.area.destroy(); this.area = null; }
    }

    // quest tracker
    const ids = activeQuestIds().slice(0, 2);
    this.questTxt.forEach((t, i) => {
      const id = ids[i];
      if (!id || ui.modal) { t.setText(''); return; }
      const line = QUESTS[id].short(S.quests[id]).slice(0, 34);
      t.setText(line); t.x = W - 4 - t.width; t.y = 26 + i * 9;
      g.fillStyle(C[0], 0.5); g.fillRect(t.x - 2, t.y - 1, t.width + 4, 9);
    });
    if (this.hint) {
      this.hintT -= dt;
      g.fillStyle(C[0], 0.6 * Math.min(1, this.hintT)); g.fillRect(this.hint.x - 4, 2, this.hint.width + 8, this.hintH);
      this.hint.setAlpha(Math.min(1, this.hintT));
      if (this.hintT <= 0) { this.hint.destroy(); this.hint = null; }
    }

    // level-up banner (queue)
    if (!this.bannerObj && this.banners.length) {
      const b = this.banners.shift();
      const d = SKILL_DEFS[b.skill];
      const c = this.add.container(0, 0);
      const t1 = txt(this, 0, 54, d.name + ' ' + b.lv, 13).setScale(2);
      t1.x = Math.round((W - t1.width * 2) / 2);
      const t0 = txt(this, 0, 44, 'SKILL INCREASED', 15); t0.x = Math.round((W - t0.width) / 2);
      const t2 = txt(this, 0, 73, d.perk, 5); t2.x = Math.round((W - t2.width) / 2);
      c.add([t0, t1, t2]);
      this.bannerObj = { c, t: 3.2, w: Math.max(t1.width * 2, t2.width) + 20 };
    }
    if (this.bannerObj) {
      const b = this.bannerObj;
      b.t -= dt;
      const a = Math.max(0, Math.min(1, b.t * 2, (3.2 - b.t) * 4));
      b.c.setAlpha(a);
      g.fillStyle(C[0], 0.7 * a); g.fillRect((W - b.w) / 2, 40, b.w, 44);
      g.fillStyle(C[13], a); g.fillRect((W - b.w) / 2, 40, b.w, 1); g.fillRect((W - b.w) / 2, 83, b.w, 1);
      if (b.t <= 0) { b.c.destroy(); this.bannerObj = null; }
    }

    // boss bar
    const bs = this.gs.boss;
    if (bs && bs.engaged && !bs.dead) {
      const bw = 170, bx = Math.round((W - bw) / 2);
      g.fillStyle(C[0], 0.75); g.fillRect(bx - 6, 3, bw + 12, 22);
      g.fillStyle(C[0]); g.fillRect(bx - 1, 14, bw + 2, 9);
      g.fillStyle(C[1]); g.fillRect(bx, 15, bw, 7);
      g.fillStyle(bs.bphase === 2 ? C[11] : C[14]); g.fillRect(bx, 15, Math.round(bw * bs.hpFrac), 7);
      g.fillStyle(bs.bphase === 2 ? C[12] : C[5]); g.fillRect(bx, 15, Math.round(bw * bs.hpFrac), 1);
      g.fillStyle(C[13]); g.fillRect(bx + bw / 2, 14, 1, 9);
      if (!this.bossName) { this.bossName = txt(this, 0, 5, 'JARL VALDREK THE HOLLOW KING', 13); this.bossName.x = Math.round((W - this.bossName.width) / 2); }
      this.bossName.setVisible(true);
    } else this.bossName?.setVisible(false);

    // sneak indicator
    if (pl.sneaking && !(bs && bs.engaged && !bs.dead)) {
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
