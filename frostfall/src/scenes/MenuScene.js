import Phaser from 'phaser';
import { burden, itemWeight } from '../systems/burden.js';
import { TUNE } from '../data/tuning.js';
import { padHint } from '../systems/access.js';
import { W, H, C, BINDINGS } from '../config.js';
import { txt, wrap, textW, fit } from '../art/font.js';
import { overlayOpen } from '../ui/overlay.js';
import { settings } from '../systems/settings.js';
import { keys } from '../systems/keys.js';
import { S } from '../systems/state.js';
import { ui } from '../systems/ui.js';
import { bus } from '../systems/bus.js';
import { ITEMS, SLOT_OF, SLOT_NAMES, iconKey } from '../data/items.js';
import { MASTERY } from '../data/perks.js';
import { compareText, upDown } from '../systems/compare.js';
import { equip, unequip, removeItem } from '../systems/inventory.js';
import Pickup from '../entities/Pickup.js';
import { stats } from '../systems/stats.js';
import { SKILL_DEFS, SKILLS, xpNeeded, MAX_LVL, bonus, nextMastery } from '../systems/skills.js';
import { sfx } from '../audio/sfx.js';
import { tabs as extraTabs } from './menuTabs.js';
import { RARITY } from '../systems/genloot.js';
import { eatFood } from '../systems/food.js';
import { readTome } from '../systems/tomes.js';
import { drinkElixir } from '../systems/elixir.js';
import { readMap } from '../systems/treasure.js';
import { readNote } from '../systems/notes.js';

const TYPE_ORDER = ['weapon', 'weapon2h', 'shield', 'bow', 'helmet', 'armor', 'charm', 'potion', 'elixir', 'food', 'tome', 'ammo', 'ingredient', 'misc', 'quest'];
const ROWS = 6;
const FILTERS = [['ALL', null], ['GEAR', ['weapon', 'weapon2h', 'shield', 'bow', 'helmet', 'armor', 'charm']], ['POTION', ['potion', 'elixir', 'food', 'tome']], ['MISC', ['ammo', 'ingredient', 'misc', 'quest', 'note']]];
const SORTS = ['TYPE', 'NAME', 'VALUE', 'WEIGHT'];
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
    keys.wheel = 0;                                // wheel turns made during play do not scroll the menu
    const release = ui.hold('menu'); ui.release('menu:launch'); keys.wheel = 0;
    this.tabs = [
      { name: 'ITEMS', doubleClick: true, captureLR: () => !!this.dropArm, render: () => this.renderItems(), input: () => this.inputItems(), cursorOf: () => this.cursor, rowAt: (x, y) => { if (x < 8 || x > 154 || y < 37) return -1; const k = Math.floor((y - 37) / 18); const i = this.scroll + k; return k < ROWS && i < this.inventory().length ? i : -1; } },
      { name: 'SKILLS', help: 'A/D TAB  ESC CLOSE', render: () => this.renderSkills(), input: () => {} },
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
    this.events.once('shutdown', release);
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
    // the pack: a click selects, a double click uses (a stray click must never drink a potion)
    if (t.doubleClick) { const now = performance.now(), lc = this.lastClick; this.lastClick = { i, t: now }; if (!lc || lc.i !== i || now - lc.t > 450) return; this.lastClick = null; }
    this.tapKey(t.clickKey ? t.clickKey(i) : BINDINGS.interact[0]);
  }

  close() {
    sfx.play('back');
    ui.lastMenuTab = this.tabs[this.tab]?.name;      // a controller's START reopens the menu here
    this.scene.stop();
  }

  // ----------------------------------------------------------------- data
  inventory() {
    const f = FILTERS[this.filter][1];
    const by = {
      0: (a, b) => TYPE_ORDER.indexOf(ITEMS[a].type) - TYPE_ORDER.indexOf(ITEMS[b].type) || ITEMS[a].name.localeCompare(ITEMS[b].name),
      1: (a, b) => ITEMS[a].name.localeCompare(ITEMS[b].name),
      2: (a, b) => (ITEMS[b].value || 0) - (ITEMS[a].value || 0) || ITEMS[a].name.localeCompare(ITEMS[b].name),
      3: (a, b) => itemWeight(b) * S.inv[b] - itemWeight(a) * S.inv[a] || ITEMS[a].name.localeCompare(ITEMS[b].name),
    }[this.sort];
    return Object.keys(S.inv).filter((id) => ITEMS[id] && (!f || f.includes(ITEMS[id].type))).sort(by);
  }
  isEquipped(id) { return Object.values(S.equip).includes(id); }

  // ---------------------------------------------------------------- input
  update() {
    if (this.warm > 0) { this.warm--; return; }
    if (overlayOpen()) return;                    // an HTML panel (save tools, bug report) has the keys
    if (this.tabs[this.tab].busy?.()) { this.tabs[this.tab].input(); if (this.dirty) { this.dirty = false; this.draw(); } return; }
    if (keys.pressed('pause') || keys.back() || keys.pressed('inventory') && this.tab === 0 || keys.pressed('journal') && this.tabs[this.tab].name === 'QUESTS') { this.close(); return; }
    if (keys.pressed('inventory') && this.tab !== 0) this.go(0);
    if (keys.pressed('map')) { const q = this.tabs.findIndex((t) => t.name === 'MAP'); if (q === this.tab) { this.close(); return; } if (q >= 0) this.go(q); }
    if (keys.pressed('journal')) { const q = this.tabs.findIndex((t) => t.name === 'QUESTS'); if (q >= 0 && q !== this.tab) this.go(q); }
    if (this.paneMore && keys.pressed('shoutswap')) { this.paneOff += Math.max(1, this.paneMore - 1); this.dirty = true; sfx.play('move'); }   // G: more text
    const cap = this.tabs[this.tab].captureLR?.();
    if ((!cap && keys.pressed('right')) || keys.tabRight()) this.go((this.tab + 1) % this.tabs.length);
    if ((!cap && keys.pressed('left')) || keys.tabLeft()) this.go((this.tab + this.tabs.length - 1) % this.tabs.length);
    this.tabs[this.tab].input();
    if (this.dirty) { this.dirty = false; this.draw(); }
  }

  go(t) {
    this.tab = t; this.cursor = 0; this.scroll = 0; this.dirty = true; this.paneMore = 0;
    sfx.play('move');
  }

  nav(len, rows = ROWS) {
    let moved = false;
    if (keys.wheel && len) { this.cursor = Math.max(0, Math.min(len - 1, this.cursor + keys.wheel)); keys.wheel = 0; moved = true; }   // the mouse wheel scrolls lists
    if (keys.repeat('down') && len) { this.cursor = (this.cursor + 1) % len; moved = true; }
    if (keys.repeat('up') && len) { this.cursor = (this.cursor + len - 1) % len; moved = true; }
    if (moved) {
      if (this.cursor < this.scroll) this.scroll = this.cursor;
      if (this.cursor >= this.scroll + rows) this.scroll = this.cursor - rows + 1;
      sfx.play('move'); this.dirty = true;
    }
    return moved;
  }

  inputItems() {
    const byWheel = performance.now() - (keys.wheelT || -1e9) < 80;
    if (keys.pressed('swap') && !byWheel) { this.filter = (this.filter + 1) % FILTERS.length; this.cursor = 0; this.scroll = 0; this.dropArm = null; this.dirty = true; sfx.play('move'); }
    if (keys.pressed('shout')) { this.sort = (this.sort + 1) % SORTS.length; this.cursor = 0; this.scroll = 0; this.dropArm = null; this.dirty = true; sfx.play('move'); }
    const list = this.inventory();
    this.cursor = Math.min(this.cursor, Math.max(0, list.length - 1));
    this.nav(list.length);
    // V: drop the selected stack at your feet (press twice; equipped and quest items stay). For when the pack is too heavy.
    if (keys.pressed('ammo') && list.length) {
      const id = list[this.cursor], it = ITEMS[id], n = S.inv[id] || 0;
      if (it.type === 'quest' || it.type === 'note' || Object.values(S.equip).includes(id)) { bus.emit('toast', Object.values(S.equip).includes(id) ? 'TAKE IT OFF FIRST' : 'YOU CANNOT DROP THAT', 11); sfx.play('nostamina'); }
      else if (this.dropArm !== id) { this.dropArm = id; this.dropN = n; sfx.play('move'); }          // asks in the description panel
      else {
        const k = Math.max(1, Math.min(n, this.dropN || n));
        this.dropArm = null; removeItem(id, k);
        const p = this.gs.player; this.gs.pickups.push(new Pickup(this.gs, p.x + 6, p.y + 4, { type: 'item', id, n: k, dropped: true }));
        bus.emit('toast', `DROPPED ${it.name.toUpperCase()}${k > 1 ? ' X' + k : ''}: IT STAYS HERE UNTIL YOU LEAVE`, 12); sfx.play('pickup');
      }
      this.dirty = true;
    }
    if (keys.repeat('up') || keys.repeat('down')) this.dropArm = null;
    if (this.dropArm && list[this.cursor] === this.dropArm) {      // A/D: how many to drop
      const n = S.inv[this.dropArm] || 1;
      if (keys.pressed('left')) { this.dropN = Math.max(1, (this.dropN || n) - 1); this.dirty = true; sfx.play('move'); }
      if (keys.pressed('right')) { this.dropN = Math.min(n, (this.dropN || n) + 1); this.dirty = true; sfx.play('move'); }
    }
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
      } else if (it.type === 'note' && wantEquip) {
        readNote(id, this.gs);
      } else if (it.type === 'map' && wantEquip) {
        readMap(id, this.gs);
      } else sfx.play('nostamina');
      this.dirty = true;
    }
  }

  // ----------------------------------------------------------------- draw
  clear() { this.dyn.removeAll(true); this.bg.clear(); }
  T(x, y, s, col = 6) { const t = txt(this, x, y, s, col); this.dyn.add(t); return t; }
  // A text box that scrolls when its text is longer than it is tall: G (BACK on a pad) pages through, arrows show
  // there is more. Each tab keeps one pane; its scroll resets when the selection changes.
  pane(x, y, w, h, text, col = 5) {
    const lines = wrap(String(text || ''), Math.floor(w / 6)).split('\n');
    const vis = Math.max(1, Math.floor(h / 9));
    const key = this.tab + ':' + this.cursor;
    if (this.paneKey !== key) { this.paneKey = key; this.paneOff = 0; }
    if (this.paneOff >= lines.length) this.paneOff = 0;
    this.T(x, y, lines.slice(this.paneOff, this.paneOff + vis).join('\n'), col);
    this.paneMore = lines.length > vis ? vis : 0;
    if (this.paneOff > 0) this.T(x + w - 6, y, '\u25B2', 13);
    if (this.paneOff + vis < lines.length) this.T(x + w - 6, y + (vis - 1) * 9, '\u25BC', 13);
    return lines.length > vis;
  }
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
      this.T(x + 3, 8, t.name, i === this.tab ? 6 : settings.highContrast ? 5 : 4);
      if (t.badge?.()) { g.fillStyle(C[0]); g.fillRect(x + w - 4, 5, 4, 4); g.fillStyle(C[13]); g.fillRect(x + w - 3, 6, 2, 2); }   // something new here
      x += w + 1;
    });
    g.fillStyle(C[3]); g.fillRect(4, 18, W - 8, 1);
    this.help = null; this.helpCol = null; this.paneMore = 0;
    this.tabs[this.tab].render();
    const help = padHint(this.help || this.tabs[this.tab].help || 'A/D TAB  W/S MOVE  E SELECT  ESC CLOSE', 51);
    this.T(8, H - 12, fit(help, 51), this.helpCol || (settings.highContrast ? 6 : 4));
  }

  renderItems() {
    const g = this.bg;
    const list = this.inventory();
    // the help line says what E does to the selected thing
    {
      const sid = list[this.cursor], sit = sid && ITEMS[sid];
      const eq = sid && Object.values(S.equip).includes(sid);
      const verb = !sit ? '' : SLOT_OF[sit.type] ? (eq ? 'E TAKE OFF' : 'E EQUIP') + (sit.type === 'weapon' ? (S.equip.offhand === sid ? '  F TAKE OFF' : '  F OFFHAND') : '')
        : { potion: 'E DRINK', elixir: 'E DRINK', food: 'E EAT', tome: 'E READ', note: 'E READ', map: 'E READ', whistle: 'E CALL' }[sit.type] || '';
      const drop = sit && !eq && sit.type !== 'quest' && sit.type !== 'note' ? '  V DROP' : '';
      this.help = this.dropArm ? 'V AGAIN TO DROP  A/D HOW MANY  W/S CANCEL' : `${verb}${drop}  Q FILTER  R SORT ${SORTS[this.sort]}${this.paneMore ? '  G MORE' : ''}`.trim();
      if (this.dropArm) this.helpCol = 12;
    }
    panel(g, 6, 22, 150, 140, 2);
    // filter chips + sort
    let fx = 11;
    FILTERS.forEach(([n], i) => {
      const w = textW(n) + 4;
      if (i === this.filter) { g.fillStyle(C[13]); g.fillRect(fx - 2, 25, w, 9); this.T(fx, 26, n, 0); } else this.T(fx, 26, n, 4);
      fx += w + 2;
    });
    g.fillStyle(C[3]); g.fillRect(8, 35, 146, 1);
    if (!list.length) this.T(14, 44, 'NOTHING HERE', 4);
    list.slice(this.scroll, this.scroll + ROWS).forEach((id, k) => {
      const i = this.scroll + k, it = ITEMS[id];
      const y = 37 + k * 18;
      if (i === this.cursor) { g.fillStyle(C[3]); g.fillRect(8, y, 146, 17); g.fillStyle(C[13]); g.fillRect(8, y, 2, 17); }
      this.I(12, y, iconKey(id), 1);
      const rk = RARITY.findIndex((x) => x.id === it.rarity);       // rarity is told by pips too (1 magic .. 3 legendary), not colour alone
      for (let d = 0; d < rk; d++) { g.fillStyle(C[RARITY[rk].col]); g.fillRect(30 + d * 4, y + 13, 2, 2); }   // under the name
      const up = (S.upgrades && S.upgrades[id]) ? ' +' + S.upgrades[id] : '';
      const rc = rarityCol(id);
      const c = S.inv[id];
      // worn things carry a check mark; the offhand weapon says OH (see the description for which slot)
      const tag = S.equip.offhand === id ? 'OH' : Object.values(S.equip).includes(id) ? '✓' : '';
      const ud = tag ? 0 : upDown(id), mk = ud > 0 ? '▲' : ud < 0 ? '▼' : '';    // PR-21: better / worse than what you wear there
      const right = (tag ? textW(tag) + 6 : c > 1 ? textW('x' + c) + 6 : 0) + (mk ? textW(mk) + 3 : 0);          // names stop short of the count or the tag
      this.T(30, y + 5, fit(it.name + up, Math.floor((150 - right - 30) / 6)), rc ?? (i === this.cursor ? 6 : 5));
      if (tag) this.T(152 - textW(tag), y + 5, tag, 8);
      else if (c > 1) this.T(150 - textW('x' + c), y + 5, 'x' + c, 4);
      if (mk) this.T(150 - (c > 1 ? textW('x' + c) + 3 : 0) - textW(mk), y + 5, mk, ud > 0 ? 8 : 11);
    });
    if (list.length > ROWS) {
      const frac = this.scroll / (list.length - ROWS);
      g.fillStyle(C[3]); g.fillRect(153, 38, 2, ROWS * 18); g.fillStyle(C[13]); g.fillRect(153, 38 + frac * (ROWS * 18 - 12), 2, 12);
    }

    // equipment
    const rx = 162;
    panel(g, rx, 22, 152, 64, 2);
    Object.entries(SLOT_NAMES).forEach(([slot, name], i) => {
      const y = 24 + i * 10, id = S.equip[slot];
      this.T(rx + 6, y + 1, name, 4);
      if (id) {
        this.I(rx + 46, y - 2, iconKey(id), 0.75);
        const up = (S.upgrades && S.upgrades[id]) ? ' +' + S.upgrades[id] : '';
        this.T(rx + 60, y + 1, fit(ITEMS[id].name + up, 15), rarityCol(id) ?? 6);
      } else this.T(rx + 60, y + 1, '-', 3);
    });
    // stats
    panel(g, rx, 88, 152, 30, 2);
    const dmg = (stats.weaponDmg() + stats.offhandDmg() * 0.6) * bonus.melee(), bdmg = stats.bowDmg() * bonus.arrow();
    this.T(rx + 6, 91, `ATK ${dmg.toFixed(1)} BOW ${bdmg.toFixed(1)} ARM ${Math.round(stats.armor() * 100)}%`, 5);
    this.T(rx + 6, 100, `HP ${S.maxHp} MP ${S.maxMp} SP ${S.maxSp}`, 5);
    const lv = burden.level();
    this.T(rx + 6, 109, `${S.gold} GOLD`, 13);
    { const wt = `WT ${Math.round(burden.carried())}/${burden.capacity()}`; this.T(rx + 146 - textW(wt), 109, wt, lv === 'ok' ? 4 : lv === 'burdened' ? 12 : 11); }
    // carry weight: a bar under the item list. Green while there is room, yellow when Burdened, red when Overloaded;
    // a notch marks the Overloaded line (125%), and the text says how much more you can carry
    {
      const carried = burden.carried(), cap = burden.capacity(), over = TUNE.burden.over, left = Math.floor(cap) - Math.round(carried);
      const by = 152, bx = 26, bw = 78, full = cap * over, frac = Math.min(1, carried / full), capX = bx + Math.round(bw / over);
      const col = lv === 'ok' ? (left < cap * 0.15 ? 12 : 8) : lv === 'burdened' ? 12 : 11;
      this.T(10, by - 1, 'WT', 4);
      g.fillStyle(C[0]); g.fillRect(bx - 1, by, bw + 2, 6);
      g.fillStyle(C[3]); g.fillRect(bx, by + 1, bw, 4);
      g.fillStyle(C[col]); g.fillRect(bx, by + 1, Math.max(1, Math.round(bw * frac)), 4);
      g.fillStyle(C[6]); g.fillRect(capX, by - 1, 1, 8);                       // the carry limit
      const msg = lv === 'ok' ? `${left} LEFT` : `OVER ${Math.ceil(carried - cap)}`;
      this.T(154 - textW(msg), by - 1, msg, lv === 'ok' ? 5 : col);
    }

    // description
    panel(g, rx, 120, 152, 42, 2);
    const id = list[this.cursor];
    if (id) {
      const it = ITEMS[id];
      this.T(rx + 6, 123, fit(it.name, 24), rarityCol(id) ?? 13);
      let line = it.gen ? [it.rarity.toUpperCase(), ...(it.affixLines || [])].join('. ') + '.' : it.desc;
      if (SLOT_OF[it.type]) line = compareText(id) + line;          // PR-21: the full comparison with what you wear there
      if (S.enchants && S.enchants[id]) line = `${S.enchants[id].type.toUpperCase()} ENCHANT +${S.enchants[id].power}. ` + line;
      { const w = itemWeight(id); if (w >= 1) line = `WT ${Math.round(w * 10) / 10}. ` + line; }      // what it adds to your load
      const where = Object.entries(S.equip).find(([, v]) => v === id);
      if (where) line = `WORN: ${SLOT_NAMES[where[0]]}. ` + line;
      if (this.dropArm === id) {
        const n = S.inv[id] || 1, k = Math.max(1, Math.min(n, this.dropN || n));
        this.T(rx + 6, 132, `DROP ${k} OF ${n}?`, 12); this.T(rx + 6, 141, 'V AGAIN TO DROP', 6); this.T(rx + 6, 150, n > 1 ? 'A/D: HOW MANY' : 'W/S: CANCEL', 4);
      } else this.pane(rx + 6, 132, 142, 27, line, 5);
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
      const xpL = s.lvl >= MAX_LVL ? 'MASTERED' : `XP ${Math.floor(s.xp)}/${need}`;            // how far to the next level
      this.T(W - 14 - textW('LEVEL ' + s.lvl) - 10 - textW(xpL), y, xpL, 4);
      g.fillStyle(C[0]); g.fillRect(13, y + 9, W - 28, 5);
      g.fillStyle(C[1]); g.fillRect(14, y + 10, W - 30, 3);
      g.fillStyle(C[15]); g.fillRect(14, y + 10, Math.round((W - 30) * frac), 3);
      const nm = nextMastery(k);                 // PR-20: from level 10 the line shows the next mastery reward
      this.T(14, y + 15, fit(s.lvl < 10 ? d.perk : nm ? `MASTERY AT ${nm.lvl}: ${nm.text}` : 'MASTERED: ' + MASTERY[k].map((x) => x.text).reverse().join(', '), 49), s.lvl < 10 ? 4 : 13);
    });
    this.T(8, H - 22, 'SKILLS IMPROVE THE MORE YOU USE THEM.', 5);
  }
}
