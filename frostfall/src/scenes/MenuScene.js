import Phaser from 'phaser';
import { W, H, C } from '../config.js';
import { txt, wrap, textW } from '../art/font.js';
import { keys } from '../systems/keys.js';
import { S } from '../systems/state.js';
import { ui } from '../systems/ui.js';
import { bus } from '../systems/bus.js';
import { ITEMS, SLOT_OF, SLOT_NAMES, iconKey } from '../data/items.js';
import { equip, unequip } from '../systems/inventory.js';
import { stats } from '../systems/stats.js';
import { SKILL_DEFS, SKILLS, xpNeeded, MAX_LVL, bonus } from '../systems/skills.js';
import { sfx } from '../audio/sfx.js';
import { tabs as extraTabs } from './menuTabs.js';

const TYPE_ORDER = ['weapon', 'bow', 'armor', 'charm', 'potion', 'quest'];
const ROWS = 7;

export function panel(g, x, y, w, h, fill = 1) {
  g.fillStyle(C[0]); g.fillRect(x, y, w, h);
  g.fillStyle(C[3]); g.fillRect(x + 1, y + 1, w - 2, h - 2);
  g.fillStyle(C[fill]); g.fillRect(x + 2, y + 2, w - 4, h - 4);
}

export default class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  init(data) {
    this.tab = data.tab ?? 0;
    this.openName = data.name || null;
    this.cursor = 0;
    this.scroll = 0;
    this.warm = 2; // ignore input for the first frames (the opening key is still "pressed")
  }

  get gs() { return this.scene.get('Game'); }

  create() {
    ui.modal = true;
    this.tabs = [
      { name: 'ITEMS', render: () => this.renderItems(), input: () => this.inputItems() },
      { name: 'SKILLS', render: () => this.renderSkills(), input: () => {} },
      ...extraTabs(this),
    ];
    if (this.openName) { const i = this.tabs.findIndex((t) => t.name === this.openName); this.tab = i >= 0 ? i : 0; }
    this.bg = this.add.graphics();
    this.dyn = this.add.container(0, 0);
    this.dirty = true;
    this.events.once('shutdown', () => { ui.modal = false; });
  }

  close() {
    sfx.play('back');
    this.scene.stop();
  }

  // ----------------------------------------------------------------- data
  inventory() {
    return Object.keys(S.inv)
      .filter((id) => ITEMS[id])
      .sort((a, b) => TYPE_ORDER.indexOf(ITEMS[a].type) - TYPE_ORDER.indexOf(ITEMS[b].type) || ITEMS[a].name.localeCompare(ITEMS[b].name));
  }
  isEquipped(id) { return Object.values(S.equip).includes(id); }

  // ---------------------------------------------------------------- input
  update() {
    if (this.warm > 0) { this.warm--; return; }
    if (keys.pressed('pause') || keys.pressed('inventory') && this.tab === 0 || keys.pressed('journal') && this.tabs[this.tab].name === 'QUESTS') { this.close(); return; }
    if (keys.pressed('inventory') && this.tab !== 0) this.go(0);
    if (keys.pressed('journal')) { const q = this.tabs.findIndex((t) => t.name === 'QUESTS'); if (q >= 0 && q !== this.tab) this.go(q); }
    if (keys.pressed('right')) this.go((this.tab + 1) % this.tabs.length);
    if (keys.pressed('left')) this.go((this.tab + this.tabs.length - 1) % this.tabs.length);
    this.tabs[this.tab].input();
    if (this.dirty) { this.dirty = false; this.draw(); }
  }

  go(t) {
    this.tab = t; this.cursor = 0; this.scroll = 0; this.dirty = true;
    sfx.play('move');
  }

  nav(len) {
    let moved = false;
    if (keys.pressed('down') && len) { this.cursor = (this.cursor + 1) % len; moved = true; }
    if (keys.pressed('up') && len) { this.cursor = (this.cursor + len - 1) % len; moved = true; }
    if (moved) {
      if (this.cursor < this.scroll) this.scroll = this.cursor;
      if (this.cursor >= this.scroll + ROWS) this.scroll = this.cursor - ROWS + 1;
      sfx.play('move'); this.dirty = true;
    }
    return moved;
  }

  inputItems() {
    const list = this.inventory();
    this.cursor = Math.min(this.cursor, Math.max(0, list.length - 1));
    this.nav(list.length);
    if (keys.pressed('interact') && list.length) {
      const id = list[this.cursor], it = ITEMS[id];
      if (SLOT_OF[it.type]) {
        const slot = SLOT_OF[it.type];
        if (S.equip[slot] === id) unequip(slot); else equip(id);
      } else if (it.type === 'potion') {
        this.gs.player.usePotion(id);
      } else sfx.play('nostamina');
      this.dirty = true;
    }
  }

  // ----------------------------------------------------------------- draw
  clear() { this.dyn.removeAll(true); this.bg.clear(); }
  T(x, y, s, col = 6) { const t = txt(this, x, y, s, col); this.dyn.add(t); return t; }
  I(x, y, key, scale = 1, alpha = 1) { const i = this.add.image(x, y, key).setOrigin(0).setScale(scale).setAlpha(alpha); this.dyn.add(i); return i; }

  draw() {
    this.clear();
    const g = this.bg;
    g.fillStyle(C[0], 0.92); g.fillRect(0, 0, W, H);
    panel(g, 2, 2, W - 4, H - 4, 1);
    // tabs
    let x = 8;
    this.tabs.forEach((t, i) => {
      const w = textW(t.name) + 10;
      if (i === this.tab) { g.fillStyle(C[3]); g.fillRect(x, 5, w, 13); g.fillStyle(C[13]); g.fillRect(x, 17, w, 1); }
      this.T(x + 5, 8, t.name, i === this.tab ? 6 : 4);
      x += w + 3;
    });
    g.fillStyle(C[3]); g.fillRect(4, 18, W - 8, 1);
    this.tabs[this.tab].render();
    this.T(8, H - 12, this.tabs[this.tab].help || 'A/D TAB  W/S MOVE  E SELECT  ESC CLOSE', 4);
  }

  renderItems() {
    const g = this.bg;
    const list = this.inventory();
    panel(g, 6, 22, 150, ROWS * 18 + 6, 2);
    if (!list.length) this.T(14, 30, 'NOTHING HERE', 4);
    list.slice(this.scroll, this.scroll + ROWS).forEach((id, k) => {
      const i = this.scroll + k, it = ITEMS[id];
      const y = 25 + k * 18;
      if (i === this.cursor) { g.fillStyle(C[3]); g.fillRect(8, y, 146, 17); g.fillStyle(C[13]); g.fillRect(8, y, 2, 17); }
      this.I(12, y, iconKey(id), 1);
      this.T(30, y + 5, it.name, i === this.cursor ? 6 : 5);
      const c = S.inv[id];
      if (this.isEquipped(id)) this.T(30 + 0, y + 5 + 0, '', 6), this.T(146 - 6, y + 5, 'E', 13);
      else if (c > 1) this.T(150 - textW('x' + c), y + 5, 'x' + c, 4);
    });
    if (list.length > ROWS) {
      const frac = this.scroll / (list.length - ROWS);
      g.fillStyle(C[3]); g.fillRect(153, 24, 2, ROWS * 18); g.fillStyle(C[13]); g.fillRect(153, 24 + frac * (ROWS * 18 - 12), 2, 12);
    }

    // equipment
    const rx = 162;
    panel(g, rx, 22, 152, 68, 2);
    this.T(rx + 6, 26, 'EQUIPPED', 13);
    Object.entries(SLOT_NAMES).forEach(([slot, name], i) => {
      const y = 36 + i * 13, id = S.equip[slot];
      this.T(rx + 6, y + 2, name, 4);
      if (id) { this.I(rx + 40, y - 2, iconKey(id), 0.75); this.T(rx + 55, y + 2, ITEMS[id].name, 6); }
      else this.T(rx + 55, y + 2, '-', 3);
    });
    // stats
    const dmg = stats.weaponDmg() * bonus.melee(), bdmg = stats.bowDmg() * bonus.arrow();
    this.T(rx + 6, 94, `SWORD ${dmg.toFixed(1)}   BOW ${bdmg.toFixed(1)}`, 5);
    this.T(rx + 6, 103, `ARMOR ${Math.round(stats.armor() * 100)}%  GOLD ${S.gold}`, 5);
    this.T(rx + 6, 112, `HP ${S.maxHp}  MP ${S.maxMp}  SP ${S.maxSp}`, 5);

    // description
    panel(g, rx, 122, 152, 46, 2);
    const id = list[this.cursor];
    if (id) {
      const it = ITEMS[id];
      this.T(rx + 6, 126, it.name, 13);
      let line = it.desc;
      const slot = SLOT_OF[it.type];
      if (slot) {
        const cur = ITEMS[S.equip[slot]] || {};
        const diff = (a, b, pct) => { const d = (a || 0) - (b || 0); const f = pct ? Math.round(d * 100) + '%' : d; return d === 0 ? '' : (d > 0 ? ' (+' : ' (') + f + ')'; };
        if (it.dmg) line = `DMG ${it.dmg}${diff(it.dmg, cur.dmg)}. ` + it.desc;
        if (it.armor) line = `ARMOR ${Math.round(it.armor * 100)}%${diff(it.armor, cur.armor, true)}. ` + it.desc;
      }
      this.T(rx + 6, 136, wrap(line, 24), 5);
      const act = SLOT_OF[it.type] ? (S.equip[SLOT_OF[it.type]] === id ? 'E: UNEQUIP' : 'E: EQUIP') : it.type === 'potion' ? 'E: DRINK' : '';
      if (act) this.T(rx + 6, 157, act, 15);
    }
  }

  renderSkills() {
    const g = this.bg;
    panel(g, 6, 22, W - 12, 4 * 31 + 8, 2);
    SKILLS.forEach((k, i) => {
      const s = S.skills[k], d = SKILL_DEFS[k], y = 27 + i * 31;
      this.T(14, y, d.name, 6);
      this.T(W - 14 - textW('LEVEL ' + s.lvl), y, 'LEVEL ' + s.lvl, 13);
      const need = s.lvl >= MAX_LVL ? 1 : xpNeeded(s.lvl), frac = s.lvl >= MAX_LVL ? 1 : s.xp / need;
      g.fillStyle(C[0]); g.fillRect(13, y + 10, W - 28, 6);
      g.fillStyle(C[1]); g.fillRect(14, y + 11, W - 30, 4);
      g.fillStyle(C[15]); g.fillRect(14, y + 11, Math.round((W - 30) * frac), 4);
      this.T(14, y + 19, d.perk, 4);
    });
    this.T(8, H - 22, 'SKILLS IMPROVE THE MORE YOU USE THEM.', 5);
  }
}
