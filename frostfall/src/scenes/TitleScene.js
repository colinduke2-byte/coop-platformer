import Phaser from 'phaser';
import { W, H, BINDINGS } from '../config.js';
import { txt } from '../art/font.js';
import { SnowFx } from '../art/snow.js';
import { keys } from '../systems/keys.js';
import { S, resetState, startNgPlus } from '../systems/state.js';
import { recalc } from '../systems/stats.js';
import { anySave, loadGame, listSaves, fmtTime, readSlot } from '../systems/save.js';
import { MAPS } from '../data/maps.js';
import { music, sfx } from '../audio/sfx.js';

export default class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    this.cameras.main.setBackgroundColor(0x0b0e1a);
    this.add.rectangle(0, 0, W, H, 0x1c2338).setOrigin(0).setAlpha(0.6);
    // distant mountains, drawn in code
    const g = this.add.graphics();
    g.fillStyle(0x2e3a5c);
    for (let x = 0; x < W; x += 2) g.fillRect(x, 100 - Math.abs(((x * 0.7) % 60) - 30) - 8 * Math.sin(x / 23), 2, 90);
    g.fillStyle(0x4a5c86);
    for (let x = 0; x < W; x += 2) g.fillRect(x, 125 - Math.abs(((x * 1.1 + 20) % 80) - 40) * 0.6, 2, 90);
    g.fillStyle(0xeaf2f8); g.fillRect(0, 160, W, 20);
    g.fillStyle(0xb4c7e0); g.fillRect(0, 160, W, 2);
    const sh = txt(this, W / 2 + 2, 26, 'FROSTFALL', 2).setScale(4).setOrigin(0.5, 0);
    const t1 = txt(this, W / 2, 24, 'FROSTFALL', 6).setScale(4).setOrigin(0.5, 0);
    const t2 = txt(this, 0, 60, 'A TALE OF THE FROZEN NORTH', 4);
    t2.x = Math.floor((W - t2.width) / 2);
    this.add.rectangle(W / 2, 112 + (this.items?.length > 2 ? 7 : 0), 112, 40, 0x0b0e1a, 0.55);
    const done = listSaves().find((x) => readSlot(x.slot)?.data.s.flags?.ending);
    this.ngSlot = done ? done.slot : null;
    this.items = [{ id: 'new', label: 'NEW GAME' }, { id: 'continue', label: 'CONTINUE', off: !anySave() }, ...(done ? [{ id: 'ng', label: 'NEW GAME+' }] : [])];
    this.sel = this.items[1].off ? 0 : 1;
    this.texts = this.items.map((it, i) => {
      const t = txt(this, 0, 98 + i * 14, it.label, 6);
      t.x = Math.floor((W - t.width) / 2);
      return t;
    });
    this.cursor = txt(this, 0, 98, '\u25B6', 13);
    const hint = txt(this, 0, 168, 'W/S SELECT   E CONFIRM', 4);
    hint.x = Math.floor((W - hint.width) / 2);
    // mouse: hover to pick, click to confirm
    const rowAt = (p) => this.texts.findIndex((t) => p.x >= t.x - 14 && p.x <= t.x + t.width + 6 && p.y >= t.y - 2 && p.y <= t.y + 11);
    this.input.on('pointermove', (p) => { if (this.slotMode || this.warm > 0) return; const i = rowAt(p); if (i >= 0 && !this.items[i].off && i !== this.sel) { this.sel = i; sfx.play('move'); } });
    this.input.on('pointerdown', (p) => {
      if (this.warm > 0) return;
      if (this.slotMode) { const i = this.slotTxt.findIndex((t) => p.y >= t.y - 2 && p.y <= t.y + 10); if (i >= 0) { this.slotSel = i; keys._press(BINDINGS.interact[0]); setTimeout(() => keys._release(BINDINGS.interact[0]), 60); } return; }
      const i = rowAt(p);
      if (i >= 0 && !this.items[i].off) { this.sel = i; keys._press(BINDINGS.interact[0]); setTimeout(() => keys._release(BINDINGS.interact[0]), 60); }
    });
    this.snow = new SnowFx(this, 80);
    this.t = 0;
    this.warm = 6;
    this.go = false;
    music.play('village');
  }

  startSaved() {
    this.scene.start('Game', { map: S.map, spawn: S.spawn, pos: S.x != null ? { x: S.x, y: S.y } : null });
  }

  openSlots(have) {
    this.slotMode = true; this.slotSel = 0; this.have = have;
    this.slotTxt = have.map((h, i) => {
      const t = txt(this, 0, 96 + i * 12, `SLOT ${h.slot}  ${MAPS[h.info.map].name.slice(0, 14)}  LV${h.info.level}  ${fmtTime(h.info.playtime)}`, 6);
      t.x = Math.floor((W - t.width) / 2);
      return t;
    });
    this.texts.forEach((t) => t.setVisible(false)); this.cursor.setVisible(false);
  }

  updateSlots() {
    if (this.warm > 0) { this.warm--; return; }
    this.slotTxt.forEach((t, i) => { t.setFont(i === this.slotSel ? 'f13' : 'f6'); });
    const t = this.slotTxt[this.slotSel];
    this.slotCursor = this.slotCursor || txt(this, 0, 0, '\u25B6', 13);
    this.slotCursor.setPosition(t.x - 12, t.y).setVisible(true);
    if (keys.pressed('down')) { this.slotSel = (this.slotSel + 1) % this.have.length; sfx.play('move'); }
    if (keys.pressed('up')) { this.slotSel = (this.slotSel + this.have.length - 1) % this.have.length; sfx.play('move'); }
    if (keys.pressed('pause')) { this.slotMode = false; this.slotTxt.forEach((x) => x.destroy()); this.slotCursor.setVisible(false); this.texts.forEach((x) => x.setVisible(true)); this.cursor.setVisible(true); sfx.play('back'); this.warm = 3; return; }
    if (keys.pressed('interact')) { if (loadGame(this.have[this.slotSel].slot)) { sfx.play('select'); this.startSaved(); } }
  }

  update(_, ms) {
    const dt = ms / 1000;
    this.t += dt;
    this.snow.update(dt);
    if (this.slotMode) { this.updateSlots(); return; }
    this.items.forEach((it, i) => this.texts[i].setFont(it.off ? 'f4' : i === this.sel ? 'f13' : 'f6'));
    const t = this.texts[this.sel];
    this.cursor.setPosition(t.x - 12, t.y).setVisible(Math.floor(this.t * 3) % 3 !== 0 || true);
    if (this.warm > 0) { this.warm--; return; }
    if (this.go) return;
    if (keys.pressed('down') || keys.pressed('up')) {
      const n = this.items.length;
      let s = this.sel;
      do { s = (s + (keys.pressed('down') ? 1 : n - 1)) % n; } while (this.items[s].off);
      if (s !== this.sel) { this.sel = s; sfx.play('move'); }
    }
    if (keys.pressed('interact') || keys.pressed('roll')) {
      sfx.play('select');
      this.go = true;
      if (this.items[this.sel].id === 'ng') {
        if (loadGame(this.ngSlot)) { startNgPlus(); recalc(); S.hp = S.maxHp; S.mp = S.maxMp; S.sp = S.maxSp; this.scene.start('Game', { map: 'village', spawn: 'start' }); } else this.go = false;
      } else if (this.items[this.sel].id === 'new') {
        resetState();
        this.scene.start('Intro');
      } else {
        const have = listSaves().filter((x) => x.info);
        if (have.length > 1) { this.go = false; this.openSlots(have); }
        else if (have.length === 1 && loadGame(have[0].slot)) this.startSaved();
        else this.go = false;
      }
    }
  }
}
