import Phaser from 'phaser';
import { W, H, C, BINDINGS } from '../config.js';
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
import { RARITY } from '../systems/genloot.js';
import { eatFood } from '../systems/food.js';
import { readTome } from '../systems/tomes.js';
import { drinkElixir } from '../systems/elixir.js';
import { readMap } from '../systems/treasure.js';

const TYPE_ORDER = ['weapon', 'weapon2h', 'shield', 'bow', 'armor', 'charm', 'potion', 'elixir', 'food', 'tome', 'ammo', 'ingredient', 'misc', 'quest'];
const ROWS = 6;
const FILTERS = [['ALL', null], ['GEAR', ['weapon', 'weapon2h', 'shield', 'bow', 'armor', 'charm']], ['POTION', ['potion', 'elixir', 'food', 'tome']], ['MISC', ['ammo', 'ingredient', 'misc', 'quest']]];
const SORTS = ['TYPE', 'NAME', 'VALUE'];
const rarityCol = (id) => { const r = ITEMS[id]?.rarity; return r && r !== 'common' ? RARITY.find((x) => x.id === r).col : null; };

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
    this.warm = 2;
    this.filter = 0;
    this.sort = 0; // ignore input for the first frames (the opening key is still "pressed")
  }

  get gs() { return this.scene.get('Game'); }

  create() {
    ui.modal = true;
    this.tabs = [
      { name: 'ITEMS', render: () => this.renderItems(), input: () => this.inputItems(), cursorOf: () => this.cursor, rowAt: (x, y) => { if (x < 8 || x > 154 || y < 37) return -1; const k = Math.floor((y - 37) / 18); const i = this.scroll + k; return k < ROWS && i < this.inventory().length ? i : -1; } },
      { name: 'SKILLS', render: () => this.renderSkills(), input: () => {} },
      ...extraTabs(this),
    ];
    if (this.openName) { const i = this.tabs.findIndex((t) => t.name === this.openName); this.tab = i >= 0 ? i : 0; }
    this.bg = this.add.graphics();
    this.dyn = this.add.container(0, 0);
    this.dirty = true;
    this.tabRects = [];
    this.mouse = { x: -1, y: -1 };
    this.input.on('pointermove', (p) => this.onMove(p));
    this.input.on('pointerdown', (p) => this.onClick(p));
    this.events.once('shutdown', () => { ui.modal = false; });
  }

  // ------------------------------------------------------------- mouse
  tapKey(code) { keys._press(code); setTimeout(() => keys._release(code), 60); }
  tabAt(p) { return this.tabRects.findIndex((r) => p.x >= r.x && p.x < r.x + r.w && p.y >= 5 && p.y < 18); }
  onMove(p) {
    if (this.warm > 0 || this.tabs[this.tab].busy?.()) return;
    if (Math.abs(p.x - this.mouse.x) + Math.abs(p.y - this.mouse.y) < 1) return;
    this.mouse = { x: p.x, y: p.y };
    const t = this.tabs[this.tab], i = t.rowAt ? t.rowAt(p.x, p.y) : -1;
    if (i >= 0 && i !== t.cursorOf?.() ) { t.hover ? t.hover(i) : (this.cursor = i); this.dirty = true; sfx.play('move'); }
  }
  onClick(p) {
    if (this.warm > 0 || this.tabs[this.tab].busy?.()) return;
    if (p.rightButtonDown()) { this.tapKey(BINDINGS.pause[0]); return; }
    const ti = this.tabAt(p);
    if (ti >= 0) { if (ti !== this.tab) this.go(ti); return; }
    const t = this.tabs[this.tab], i = t.rowAt ? t.rowAt(p.x, p.y) : -1;
    if (i < 0) return;
    t.hover ? t.hover(i) : (this.cursor = i);
    this.dirty = true;
    this.tapKey(t.clickKey ? t.clickKey(i) : BINDINGS.interact[0]);
  }

  close() {
    sfx.play('back');
    this.scene.stop();
  }

  // ----------------------------------------------------------------- data
  inventory() {
    const f = FILTERS[this.filter][1];
    const by = {
      0: (a, b) => TYPE_ORDER.indexOf(ITEMS[a].type) - TYPE_ORDER.indexOf(ITEMS[b].type) || ITEMS[a].name.localeCompare(ITEMS[b].name),
      1: (a, b) => ITEMS[a].name.localeCompare(ITEMS[b].name),
      2: (a, b) => (ITEMS[b].value || 0) - (ITEMS[a].value || 0) || ITEMS[a].name.localeCompare(ITEMS[b].name),
    }[this.sort];
    return Object.keys(S.inv).filter((id) => ITEMS[id] && (!f || f.includes(ITEMS[id].type))).sort(by);
  }
  isEquipped(id) { return Object.values(S.equip).includes(id); }

  // ---------------------------------------------------------------- input
  update() {
    if (this.warm > 0) { this.warm--; return; }
    if (this.tabs[this.tab].busy?.()) { this.tabs[this.tab].input(); if (this.dirty) { this.dirty = false; this.draw(); } return; }
    if (keys.pressed('pause') || keys.pressed('inventory') && this.tab === 0 || keys.pressed('journal') && this.tabs[this.tab].name === 'QUESTS') { this.close(); return; }
    if (keys.pressed('inventory') && this.tab !== 0) this.go(0);
    if (keys.pressed('map')) { const q = this.tabs.findIndex((t) => t.name === 'MAP'); if (q === this.tab) { this.close(); return; } if (q >= 0) this.go(q); }
    if (keys.pressed('journal')) { const q = this.tabs.findIndex((t) => t.name === 'QUESTS'); if (q >= 0 && q !== this.tab) this.go(q); }
    const cap = this.tabs[this.tab].captureLR?.();
    if (!cap && keys.pressed('right')) this.go((this.tab + 1) % this.tabs.length);
    if (!cap && keys.pressed('left')) this.go((this.tab + this.tabs.length - 1) % this.tabs.length);
    this.tabs[this.tab].input();
    if (this.dirty) { this.dirty = false; this.draw(); }
  }

  go(t) {
    this.tab = t; this.cursor = 0; this.scroll = 0; this.dirty = true;
    sfx.play('move');
  }

  nav(len, rows = ROWS) {
    let moved = false;
    if (keys.pressed('down') && len) { this.cursor = (this.cursor + 1) % len; moved = true; }
    if (keys.pressed('up') && len) { this.cursor = (this.cursor + len - 1) % len; moved = true; }
    if (moved) {
      if (this.cursor < this.scroll) this.scroll = this.cursor;
      if (this.cursor >= this.scroll + rows) this.scroll = this.cursor - rows + 1;
      sfx.play('move'); this.dirty = true;
    }
    return moved;
  }

  inputItems() {
    if (keys.pressed('swap')) { this.filter = (this.filter + 1) % FILTERS.length; this.cursor = 0; this.scroll = 0; this.dirty = true; sfx.play('move'); }
    if (keys.pressed('shout')) { this.sort = (this.sort + 1) % SORTS.length; this.cursor = 0; this.scroll = 0; this.dirty = true; sfx.play('move'); }
    const list = this.inventory();
    this.cursor = Math.min(this.cursor, Math.max(0, list.length - 1));
    this.nav(list.length);
    const wantEquip = keys.pressed('interact'), wantOff = keys.pressed('block');
    if ((wantEquip || wantOff) && list.length) {
      const id = list[this.cursor], it = ITEMS[id];
      if (SLOT_OF[it.type]) {
        const slot = wantOff && it.type === 'weapon' ? 'offhand' : SLOT_OF[it.type];
        if (S.equip[slot] === id) unequip(slot); else equip(id, wantOff ? 'offhand' : null);
      } else if (it.type === 'potion' && wantEquip) {
        this.gs.player.usePotion(id);
      } else if (it.type === 'food' && wantEquip) {
        eatFood(id, this.gs);
      } else if (it.type === 'tome' && wantEquip) {
        readTome(id);
      } else if (it.type === 'elixir' && wantEquip) {
        drinkElixir(id, this.gs);
      } else if (it.type === 'whistle' && wantEquip) {
        this.gs.swapPet();
      } else if (it.type === 'map' && wantEquip) {
        readMap(id, this.gs);
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
    this.tabRects = [];
    this.tabs.forEach((t, i) => {
      const w = textW(t.name) + 6;
      this.tabRects.push({ x, w });
      if (i === this.tab) { g.fillStyle(C[3]); g.fillRect(x, 5, w, 13); g.fillStyle(C[13]); g.fillRect(x, 17, w, 1); }
      this.T(x + 3, 8, t.name, i === this.tab ? 6 : 4);
      x += w + 1;
    });
    g.fillStyle(C[3]); g.fillRect(4, 18, W - 8, 1);
    this.help = null;
    this.tabs[this.tab].render();
    this.T(8, H - 12, this.help || this.tabs[this.tab].help || 'A/D TAB  W/S MOVE  E SELECT  ESC CLOSE', 4);
  }

  renderItems() {
    const g = this.bg;
    const list = this.inventory();
    this.help = 'E USE  F OFF-HAND  Q FILTER  R SORT';
    panel(g, 6, 22, 150, 130, 2);
    // filter chips + sort
    let fx = 11;
    FILTERS.forEach(([n], i) => {
      const w = textW(n) + 4;
      if (i === this.filter) { g.fillStyle(C[13]); g.fillRect(fx - 2, 25, w, 9); this.T(fx, 26, n, 0); } else this.T(fx, 26, n, 4);
      fx += w + 1;
    });
    this.T(156 - 4 - textW(SORTS[this.sort]), 26, SORTS[this.sort], 15);
    g.fillStyle(C[3]); g.fillRect(8, 35, 146, 1);
    if (!list.length) this.T(14, 44, 'NOTHING HERE', 4);
    list.slice(this.scroll, this.scroll + ROWS).forEach((id, k) => {
      const i = this.scroll + k, it = ITEMS[id];
      const y = 37 + k * 18;
      if (i === this.cursor) { g.fillStyle(C[3]); g.fillRect(8, y, 146, 17); g.fillStyle(C[13]); g.fillRect(8, y, 2, 17); }
      this.I(12, y, iconKey(id), 1);
      const up = (S.upgrades && S.upgrades[id]) ? ' +' + S.upgrades[id] : '';
      const rc = rarityCol(id);
      this.T(30, y + 5, (it.name + up).slice(0, 17), rc ?? (i === this.cursor ? 6 : 5));
      const c = S.inv[id];
      const tag = S.equip.offhand === id ? 'O' : Object.values(S.equip).includes(id) ? 'E' : '';
      if (tag) this.T(146 - 6, y + 5, tag, 13);
      else if (c > 1) this.T(150 - textW('x' + c), y + 5, 'x' + c, 4);
    });
    if (list.length > ROWS) {
      const frac = this.scroll / (list.length - ROWS);
      g.fillStyle(C[3]); g.fillRect(153, 38, 2, ROWS * 18); g.fillStyle(C[13]); g.fillRect(153, 38 + frac * (ROWS * 18 - 12), 2, 12);
    }

    // equipment
    const rx = 162;
    panel(g, rx, 22, 152, 62, 2);
    Object.entries(SLOT_NAMES).forEach(([slot, name], i) => {
      const y = 26 + i * 11, id = S.equip[slot];
      this.T(rx + 6, y + 1, name, 4);
      if (id) {
        this.I(rx + 46, y - 2, iconKey(id), 0.75);
        const up = (S.upgrades && S.upgrades[id]) ? ' +' + S.upgrades[id] : '';
        this.T(rx + 60, y + 1, (ITEMS[id].name + up).slice(0, 15), rarityCol(id) ?? 6);
      } else this.T(rx + 60, y + 1, '-', 3);
    });
    // stats
    panel(g, rx, 86, 152, 32, 2);
    const dmg = (stats.weaponDmg() + stats.offhandDmg() * 0.6) * bonus.melee(), bdmg = stats.bowDmg() * bonus.arrow();
    this.T(rx + 6, 90, `MELEE ${dmg.toFixed(1)}  BOW ${bdmg.toFixed(1)}  ARM ${Math.round(stats.armor() * 100)}%`, 5);
    this.T(rx + 6, 99, `HP ${S.maxHp}  MP ${S.maxMp}  SP ${S.maxSp}`, 5);
    this.T(rx + 6, 108, `LV ${S.charLevel || 1}  GOLD ${S.gold}`, 13);

    // description
    panel(g, rx, 120, 152, 36, 2);
    const id = list[this.cursor];
    if (id) {
      const it = ITEMS[id];
      this.T(rx + 6, 123, it.name.slice(0, 24), rarityCol(id) ?? 13);
      let line = it.gen ? [it.rarity.toUpperCase(), ...(it.affixLines || [])].join('. ') + '.' : it.desc;
      const slot = SLOT_OF[it.type];
      if (slot) {
        const cur = ITEMS[S.equip[slot]] || {};
        const diff = (a, b, pct) => { const d = (a || 0) - (b || 0); const f = pct ? Math.round(d * 100) + '%' : d; return d === 0 ? '' : (d > 0 ? ' (+' : ' (') + f + ')'; };
        if (it.dmg) line = `DMG ${it.dmg}${diff(it.dmg, cur.dmg)}. ` + line;
        if (it.armor) line = `ARMOR ${Math.round(it.armor * 100)}%${diff(it.armor, cur.armor, true)}. ` + line;
      }
      if (S.enchants && S.enchants[id]) line = `${S.enchants[id].type.toUpperCase()} ENCHANT +${S.enchants[id].power}. ` + line;
      this.T(rx + 6, 132, wrap(line, 24).split('\n').slice(0, 3).join('\n'), 5);
    }
  }

  renderSkills() {
    const g = this.bg;
    panel(g, 6, 22, W - 12, 5 * 25 + 8, 2);
    SKILLS.forEach((k, i) => {
      const s = S.skills[k], d = SKILL_DEFS[k], y = 26 + i * 25;
      this.T(14, y, d.name, 6);
      this.T(W - 14 - textW('LEVEL ' + s.lvl), y, 'LEVEL ' + s.lvl, 13);
      const need = s.lvl >= MAX_LVL ? 1 : xpNeeded(s.lvl), frac = s.lvl >= MAX_LVL ? 1 : s.xp / need;
      g.fillStyle(C[0]); g.fillRect(13, y + 9, W - 28, 5);
      g.fillStyle(C[1]); g.fillRect(14, y + 10, W - 30, 3);
      g.fillStyle(C[15]); g.fillRect(14, y + 10, Math.round((W - 30) * frac), 3);
      this.T(14, y + 15, d.perk, 4);
    });
    this.T(8, H - 22, 'SKILLS IMPROVE THE MORE YOU USE THEM.', 5);
  }
}
