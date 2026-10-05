import Phaser from 'phaser';
import { W, H, C } from '../config.js';
import { txt, textW, wrap, normText } from '../art/font.js';
import { keys } from '../systems/keys.js';
import { ui } from '../systems/ui.js';
import { dialogue } from '../systems/dialogue.js';
import { sfx } from '../audio/sfx.js';
import { QUESTS, activeQuestIds, TARGETS, trackedId } from '../data/quests.js';
import { MAPS } from '../data/maps.js';
import { removeItem, count } from '../systems/inventory.js';
import { S } from '../systems/state.js';
import { bus } from '../systems/bus.js';
import { SPELLS, SPELL_ORDER, P } from '../entities/Player.js';
import { iconKey } from '../data/items.js';
import { SKILL_DEFS } from '../systems/skills.js';
import { settings } from '../systems/settings.js';
import { stats } from '../systems/stats.js';

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
    this.spellIcons = Object.fromEntries(SPELL_ORDER.map((k) => [k, this.add.image(4, H - 20, 'icon_' + k).setOrigin(0)]));
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
    this.onChar = (n) => this.banners.push({ custom: true, title: 'LEVEL ' + n, top: 'CHARACTER LEVEL UP', line: '+1 PERK POINT  -  PRESS I, THEN PERKS' });
    bus.on('charlevel', this.onChar);
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
    this.debugTxt = txt(this, 4, 32, '', 15).setVisible(false);
    this.onKey = (e) => { if (e.code === 'F3') { e.preventDefault(); this.debugOn = !this.debugOn; this.debugTxt.setVisible(this.debugOn); } };
    window.addEventListener('keydown', this.onKey);
    this.dead = this.add.container(0, 0).setVisible(false);
    this.dead.add(this.add.rectangle(0, 0, W, H, 0x0b0e1a, 0.6).setOrigin(0));
    const d1 = txt(this, W / 2, 74, 'YOU DIED', 11).setScale(3).setOrigin(0.5, 0);
    this.dead.add(d1);

    this.handlers = {};
    for (const b of BARS) { this.handlers[b.flash] = () => { this.flash[b.key] = 0.3; }; bus.on(b.flash, this.handlers[b.flash]); }
    this.events.once('shutdown', () => { for (const [k, fn] of Object.entries(this.handlers)) bus.off(k, fn); bus.off('toast', this.onToast); bus.off('area', this.onArea); bus.off('levelup', this.onLevel); bus.off('charlevel', this.onChar); bus.off('hint', this.onHint); if (dialogue.hud === this) dialogue.hud = null; window.removeEventListener('keydown', this.onKey); });
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

  // ------------------------------------------------------- lockpicking
  // difficulty: easy (1 hit) | med (2 hits) | hard (3 hits). Press E inside the green zone.
  lockpick(diff) {
    const need = { easy: 1, med: 2, hard: 3 }[diff] || 2;
    const sneak = S.skills.sneak.lvl;
    return new Promise((res) => {
      this.lock = { need, hits: 0, pos: 0, dir: 1, speed: 0.9 + need * 0.25, w: Math.max(0.06, 0.16 - need * 0.025 + sneak * 0.006), c: Math.random() * 0.7 + 0.15, res, age: 0, flash: 0, msg: '' };
    });
  }

  updateLock(dt) {
    const L = this.lock, g = this.dg;
    g.clear();
    if (!L) { if (this.lockTxt) { this.lockTxt.forEach((t) => t.setText('')); } return; }
    L.age++;
    L.pos += L.dir * L.speed * dt;
    if (L.pos > 1) { L.pos = 1; L.dir = -1; } else if (L.pos < 0) { L.pos = 0; L.dir = 1; }
    L.flash -= dt;
    const bx = 60, by = 78, bw = 200, bh = 16;
    g.fillStyle(C[0], 0.85); g.fillRect(bx - 10, by - 28, bw + 20, 72);
    g.fillStyle(C[3]); g.fillRect(bx - 9, by - 27, bw + 18, 70);
    g.fillStyle(C[1]); g.fillRect(bx - 8, by - 26, bw + 16, 68);
    g.fillStyle(C[0]); g.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
    g.fillStyle(C[2]); g.fillRect(bx, by, bw, bh);
    g.fillStyle(C[8]); g.fillRect(Math.round(bx + (L.c - L.w) * bw), by, Math.round(L.w * 2 * bw), bh);
    g.fillStyle(C[13]); g.fillRect(Math.round(bx + L.pos * bw) - 1, by - 3, 3, bh + 6);
    for (let i = 0; i < L.need; i++) { g.fillStyle(i < L.hits ? C[13] : C[3]); g.fillRect(bx + i * 12, by + 22, 9, 5); }
    if (!this.lockTxt) this.lockTxt = [txt(this, 0, 54, '', 6), txt(this, 0, 110, '', 4)];
    this.lockTxt[0].setText('PICKING THE LOCK').setPosition(Math.round(160 - 48), by - 20);
    this.lockTxt[1].setText(`E: PICK   ESC: STOP   LOCKPICKS ${count('lockpick')}`).setPosition(Math.round(160 - 78), by + 31);
    if (L.age < 4) return;
    if (keys.pressed('pause')) { this.lock = null; g.clear(); this.lockTxt.forEach((t) => t.setText('')); L.res(false); return; }
    if (keys.pressed('interact')) {
      if (Math.abs(L.pos - L.c) <= L.w) {
        L.hits++; sfx.play('select');
        if (L.hits >= L.need) { this.lock = null; g.clear(); this.lockTxt.forEach((t) => t.setText('')); sfx.play('chest'); L.res(true); return; }
        L.c = Math.random() * 0.7 + 0.15; L.w *= 0.85; L.speed *= 1.12;
      } else {
        sfx.play('guardbreak');
        removeItem('lockpick', 1);
        bus.emit('toast', 'LOCKPICK BROKE', 11);
        L.hits = 0;
        if (!count('lockpick')) { this.lock = null; g.clear(); this.lockTxt.forEach((t) => t.setText('')); L.res(false); }
      }
    }
  }

  // Small status row under the bars: ward / weapon enchant / lock-on, each with its remaining time.
  drawStatus(g, pl, y0) {
    if (!this.statTxt) this.statTxt = [0, 1, 2, 3].map(() => txt(this, 0, 0, '', 15));
    const list = [];
    if (pl.ward) list.push(['WARD ' + Math.ceil(pl.ward.t), 15]);
    const en = stats.enchant();
    if (en) list.push([en.type.toUpperCase(), { fire: 12, frost: 15, shock: 13 }[en.type] || 5]);
    if (S.flags.restedUntil > S.playtime) list.push(['RESTED ' + Math.ceil((S.flags.restedUntil - S.playtime) / 60) + 'M', 8]);
    if (pl.sneaking) list.push(['SNEAK', 4]);
    if (pl.blocking) list.push(['GUARD', 7]);
    let x = 3;
    this.statTxt.forEach((t, i) => {
      const e = list[i];
      if (!e) { t.setText(''); return; }
      t.setText(e[0]).setFont('f' + e[1]); t.x = x + 2; t.y = y0 + 1;
      g.fillStyle(C[0], 0.62); g.fillRect(x, y0, t.width + 4, 9);
      x += t.width + 6;
    });
  }

  // Diamond over the objective when it is on screen, an edge arrow when it is not, a label when it is in another area.
  drawQuestMarker(g, tid, dt) {
    if (!this.qm) { this.qm = txt(this, 0, 0, '', 15); }
    this.qm.setText('');
    if (!tid || ui.modal || this.dlg) return;
    const gs = this.gs, T = TARGETS[tid]?.(S.quests[tid]);
    if (!T || !gs.player) return;
    this.markerAt(g, T, 15, dt);
  }

  markerAt(g, T, col, dt) {
    const gs = this.gs;
    if (T.map !== gs.mapId) {
      const label = 'GO TO ' + (MAPS[T.map]?.name || T.map).toUpperCase();
      this.qm.setText(label).setFont('f15'); this.qm.x = Math.round((W - this.qm.width) / 2); this.qm.y = H - 38;
      g.fillStyle(C[0], 0.6); g.fillRect(this.qm.x - 3, this.qm.y - 2, this.qm.width + 6, 11);
      return;
    }
    const cam = gs.cameras.main.worldView;
    const wx = (T.x + 0.5) * 16, wy = (T.y + 0.5) * 16;
    const sx = wx - cam.x, sy = wy - cam.y;
    const bob = Math.sin(this.time.now / 220) * 2;
    if (sx > 6 && sx < W - 6 && sy > 14 && sy < H - 6) {
      const x = Math.round(sx), y = Math.round(sy - 16 + bob);
      g.fillStyle(C[0]); g.fillRect(x - 4, y - 1, 9, 9); g.fillRect(x - 1, y - 4, 3, 15);
      g.fillStyle(C[col]); g.fillRect(x - 3, y, 7, 7); g.fillRect(x - 1, y - 3, 3, 13);
      g.fillStyle(C[6]); g.fillRect(x - 1, y + 1, 2, 2);
    } else {
      const cx = W / 2, cy = H / 2, dx = sx - cx, dy = sy - cy;
      const k = Math.min((W / 2 - 14) / Math.abs(dx || 1e-6), (H / 2 - 14) / Math.abs(dy || 1e-6));
      const ax = cx + dx * k, ay = cy + dy * k, a = Math.atan2(dy, dx);
      const p = (r, off) => [ax + Math.cos(a + off) * r, ay + Math.sin(a + off) * r];
      const [x1, y1] = p(7, 0), [x2, y2] = p(6, 2.5), [x3, y3] = p(6, -2.5);
      g.fillStyle(C[0]); g.fillTriangle(x1 + Math.cos(a) * 1.5, y1 + Math.sin(a) * 1.5, x2 - Math.cos(a), y2 - Math.sin(a), x3 - Math.cos(a), y3 - Math.sin(a));
      g.fillStyle(C[col]); g.fillTriangle(x1, y1, x2, y2, x3, y3);
    }
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
    if (this.lock) this.updateLock(dt); else this.updateDialogue(dt);
    const g = this.g;
    const pl = this.gs.player;
    g.clear();
    this.dead.setVisible(S.hp <= 0);

    // panels
    const big = !!settings.largeUi, rs = big ? 11 : 8, bh = big ? 8 : 5, wk = big ? 0.8 : 0.62;
    g.fillStyle(C[0], 0.62);
    g.fillRect(0, 0, big ? 150 : 134, big ? 36 : 28);
    BARS.forEach((b, i) => {
      this.flash[b.key] -= dt;
      const x = 17, y = 3 + i * rs;
      const w = Math.min(big ? 126 : 110, Math.round(S[b.max] * wk));
      const frac = Math.max(0, S[b.key] / S[b.max]);
      this.labels[i].y = y - (big ? 0 : 0);
      g.fillStyle(C[0]); g.fillRect(x - 1, y - 1, w + 2, bh + 2);
      g.fillStyle(C[1]); g.fillRect(x, y, w, bh);
      const fw = Math.round(w * frac);
      const low = this.flash[b.key] > 0 && Math.floor(this.flash[b.key] * 20) % 2 === 0;
      g.fillStyle(low ? C[11] : C[b.col]); g.fillRect(x, y, fw, bh);
      g.fillStyle(C[b.hi]); g.fillRect(x, y, fw, 1);
    });
    this.drawStatus(g, pl, big ? 38 : 30);

    // gold + arrows
    const gold = String(S.gold), ar = String(S.arrows);
    const gw = textW(gold), aw = textW(ar);
    g.fillStyle(C[0], 0.62); g.fillRect(W - 14 - Math.max(gw, aw) - 6, 0, Math.max(gw, aw) + 20, 23);
    if (!this.ammoTxt) this.ammoTxt = txt(this, 0, 23, '', 12);
    const ak = pl.curAmmo();
    if (ak !== 'arrow') {
      const lab = (ak === 'fire_arrow' ? 'FIRE ' : 'BARB ') + S.inv[ak];
      this.ammoTxt.setText(lab).setFont(ak === 'fire_arrow' ? 'f12' : 'f11').setVisible(true);
      this.ammoTxt.x = W - 22 - Math.max(gw, aw) - 6 - this.ammoTxt.width; this.ammoTxt.y = 13; g.fillStyle(C[0], 0.62); g.fillRect(this.ammoTxt.x - 3, 12, this.ammoTxt.width + 6, 10);
    } else this.ammoTxt.setVisible(false);
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
    for (const k of SPELL_ORDER) this.spellIcons[k].setVisible(S.spell === k);
    const afford = S.mp >= pl.spellCost(sp);
    if (pl.heat > 0.05) { g.fillStyle(C[0]); g.fillRect(4, H - 3, 16, 2); g.fillStyle(pl.heat > 1.8 ? C[11] : C[12]); g.fillRect(4, H - 3, Math.round(16 * pl.heat / P.cast.heatMax), 2); }
    this.spellIcons[S.spell].setAlpha(afford ? 1 : 0.4);
    this.spellName.setText(sp.name);
    const cdFrac = Math.max(0, pl.shoutCd / P.shout.cooldown);
    if (cdFrac > 0) { g.fillStyle(C[0], 0.75); g.fillRect(25, H - 20, 16, Math.ceil(16 * cdFrac)); }
    if (!this.cdTxt) this.cdTxt = txt(this, 0, H - 16, '', 6);
    this.cdTxt.setText(cdFrac > 0 ? String(Math.ceil(pl.shoutCd)) : '');
    this.cdTxt.x = 25 + Math.round((16 - this.cdTxt.width) / 2); this.cdTxt.y = H - 16;

    // potions
    this.potIcons.forEach((p) => {
      box(p.x + 1, H - 20);
      const n = (S.inv[p.id] || 0) + (S.inv[p.id + '_g'] || 0);
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

    // low-health warning pulse
    if (S.hp > 0 && S.hp / S.maxHp < 0.3) {
      const a = 0.18 + 0.14 * Math.sin(this.time.now / 160);
      g.fillStyle(C[11], a);
      g.fillRect(0, 0, W, 3); g.fillRect(0, H - 3, W, 3); g.fillRect(0, 0, 3, H); g.fillRect(W - 3, 0, 3, H);
    }

    if (this.debugOn) {
      const gs = this.gs;
      this.debugTxt.setText(`FPS ${Math.round(this.game.loop.actualFps)}  ENEMIES ${gs.enemies.getLength()}  PARTS ${gs.fx.parts.length}/${gs.fx.pool.length}  PICKUPS ${gs.pickups.length}  T ${Math.floor(S.time / 60)}:${String(Math.floor(S.time % 60)).padStart(2, '0')}`);
    }

    // quest tracker
    const tid = trackedId();
    const ids = [tid, ...activeQuestIds().filter((x) => x !== tid)].filter(Boolean).slice(0, 2);
    this.questTxt.forEach((t, i) => {
      const id = ids[i];
      if (!id || ui.modal) { t.setText(''); return; }
      const line = ((id === tid ? '> ' : '') + QUESTS[id].short(S.quests[id])).slice(0, 34);
      t.setText(line); t.setFont(id === tid ? 'f13' : 'f4'); t.x = W - 4 - t.width; t.y = 26 + i * 9;
      g.fillStyle(C[0], 0.5); g.fillRect(t.x - 2, t.y - 1, t.width + 4, 9);
    });
    this.drawQuestMarker(g, tid, dt);
    const wp = S.flags.waypoint;
    if (wp && wp.map === this.gs.mapId && !ui.modal && !this.dlg) {
      if (Math.hypot(this.gs.player.x - (wp.x + 0.5) * 16, this.gs.player.y - (wp.y + 0.5) * 16) < 20) { delete S.flags.waypoint; bus.emit('toast', 'WAYPOINT REACHED', 8); }
      else this.markerAt(g, { map: wp.map, x: wp.x, y: wp.y }, 8, dt);
    }
    if (this.hint) {
      this.hintT -= dt;
      g.fillStyle(C[0], 0.6 * Math.min(1, this.hintT)); g.fillRect(this.hint.x - 4, 2, this.hint.width + 8, this.hintH);
      this.hint.setAlpha(Math.min(1, this.hintT));
      if (this.hintT <= 0) { this.hint.destroy(); this.hint = null; }
    }

    // level-up banner (queue)
    if (!this.bannerObj && this.banners.length) {
      const b = this.banners.shift();
      const d = b.custom ? { name: b.title, perk: b.line } : SKILL_DEFS[b.skill];
      const c = this.add.container(0, 0);
      const t1 = txt(this, W / 2, 54, b.custom ? d.name : d.name + ' ' + b.lv, b.custom ? 15 : 13).setScale(2).setOrigin(0.5, 0);
      const t0 = txt(this, 0, 44, b.custom ? b.top : 'SKILL INCREASED', b.custom ? 13 : 15); t0.x = Math.round((W - t0.width) / 2);
      const t2 = txt(this, 0, 73, d.perk, 5); t2.x = Math.round((W - t2.width) / 2);
      c.add([t0, t1, t2]);
      this.bannerObj = { c, t: 3.2, w: Math.max(t1.displayWidth, t2.width) + 20 };
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
      if (this.bossFor !== bs) { this.bossName?.destroy(); this.bossName = txt(this, 0, 5, bs.cfg.title || bs.cfg.name, 13); this.bossName.x = Math.round((W - this.bossName.width) / 2); this.bossFor = bs; }
      this.bossName.setVisible(true);
    } else this.bossName?.setVisible(false);

    // target bar: lock-on target, or whoever the bow is aimed at
    const tg = !(bs && bs.engaged && !bs.dead) ? (pl.target || (pl.drawing ? pl.pickTarget(190) : null)) : null;
    if (tg && !tg.dead) {
      const oy = this.hint ? this.hintH + 2 : 0, tw = settings.largeUi ? 120 : 90, tx = Math.round((W - tw) / 2), frac = Math.max(0, tg.hp / tg.maxHp);
      g.fillStyle(C[0], 0.7); g.fillRect(tx - 4, 2 + oy, tw + 8, 17);
      g.fillStyle(C[0]); g.fillRect(tx - 1, 11 + oy, tw + 2, 7);
      g.fillStyle(C[1]); g.fillRect(tx, 12 + oy, tw, 5);
      g.fillStyle(C[11]); g.fillRect(tx, 12 + oy, Math.round(tw * frac), 5);
      g.fillStyle(C[12]); g.fillRect(tx, 12 + oy, Math.round(tw * frac), 1);
      if (!this.tgtTxt) this.tgtTxt = txt(this, 0, 3, '', 6);
      this.tgtTxt.setText(tg.cfg.name.toUpperCase() + (pl.target === tg ? '' : '')).setVisible(true);
      this.tgtTxt.x = Math.round((W - this.tgtTxt.width) / 2); this.tgtTxt.y = 3 + oy;
    } else this.tgtTxt?.setVisible(false);

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
