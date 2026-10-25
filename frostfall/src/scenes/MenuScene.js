import Phaser from 'phaser';
import { burden, itemWeight } from '../systems/burden.js';
import { TUNE } from '../data/tuning.js';
import { padHint } from '../systems/access.js';
import { W, H, C, BINDINGS } from '../config.js';
import { txt, wrap, textW, fit, bigKey, largeText, BIG_W } from '../art/font.js';
import { overlayOpen } from '../ui/overlay.js';
import { settings } from '../systems/settings.js';
import { keys, padActive, setMenuPad, codeName } from '../systems/keys.js';
import { S } from '../systems/state.js';
import { ui } from '../systems/ui.js';
import { bus } from '../systems/bus.js';
import { ITEMS, SLOT_OF, SLOT_NAMES, iconKey } from '../data/items.js';
import { MASTERY } from '../data/perks.js';
import { equip, unequip, removeItem } from '../systems/inventory.js';
import Pickup from '../entities/Pickup.js';
import { stats } from '../systems/stats.js';
import { SKILL_DEFS, SKILLS, xpNeeded, MAX_LVL, bonus, nextMastery } from '../systems/skills.js';
import { sfx } from '../audio/sfx.js';
import { tabs as extraTabs } from './menuTabs.js';
import { panel } from '../ui/panel.js';
import { RARITY } from '../systems/genloot.js';
import { eatFood } from '../systems/food.js';
import { readTome } from '../systems/tomes.js';
import { drinkElixir } from '../systems/elixir.js';
import { readMap } from '../systems/treasure.js';
import { readNote } from '../systems/notes.js';
import { socketCount, socketed } from '../systems/sockets.js';
import { compareGear, BADGE_COL } from '../ui/gearCompare.js';
import { LAYOUT } from '../ui/menuLayout.js';

const TYPE_ORDER = ['weapon', 'weapon2h', 'shield', 'bow', 'helmet', 'armor', 'charm', 'potion', 'elixir', 'food', 'tome', 'ammo', 'ingredient', 'misc', 'quest'];
const ROWS = 6;
// The pack's sub-pages: what the list shows. WORN lists the six equipment slots instead of the pack.
const FILTERS = [['ALL', null], ['ARMS', ['weapon', 'weapon2h', 'shield', 'bow', 'helmet', 'armor', 'charm']], ['USE', ['potion', 'elixir', 'food', 'tome']], ['OTHER', ['ammo', 'ingredient', 'misc', 'quest', 'note']], ['WORN', 'worn']];
const SORTS = ['TYPE', 'NAME', 'VALUE', 'WEIGHT'];
const rarityCol = (id) => { const r = ITEMS[id]?.rarity; return r && r !== 'common' ? RARITY.find((x) => x.id === r).col : null; };

// The five top tabs, each a group of pages (one page per old tab). A page with sub-pages (`subs`) shows them all in the
// strip under the tabs; Q / TAB (LT / RT on a pad) steps along the strip, A / D (LB / RB) changes tab.
export const GROUPS = [['GEAR', ['ITEMS']], ['CHARACTER', ['SKILLS', 'PERKS']], ['JOURNAL', ['QUESTS', 'LORE', 'FEATS']], ['MAP', ['MAP']], ['SYSTEM', ['SYSTEM']]];
// Kept while the game runs (not saved): the page each tab was left on and each page's sub-page, so the menu reopens where
// you were.
const memory = { page: {}, sub: {} };

export { panel, LAYOUT };                                  // it lives in ui/panel.js now (CH12)

// NP18: every help line ends with how to close the menu
function navHelp(h, special) {
  if (special) return h;
  return /\bESC\b/.test(h) ? h : h + '  ESC CLOSE';
}

// NP18: a help line too long for the bottom row closes its gaps, then drops the sort name, then the hints just before the
// last (so "ESC CLOSE" always stays), before anything is cut
export function squeezeHelp(h, max = 51) {
  if (h.length <= max) return h;
  let segs = h.split(/\s{2,}/).filter(Boolean);
  const join = () => segs.join(' ');
  if (join().length > max) segs = segs.map((x) => x.replace(/^(\S+ SORT) \S+$/, '$1'));
  while (join().length > max && segs.length > 2) segs.splice(segs.length - 2, 1);
  return join();
}

// A1: with LARGE TEXT the help line is drawn twice as big; what does not fit on one line is split into pages that take
// turns (whole hints, never cut words).
const BIG_HELP = 23;
export function helpPages(h) {
  const segs = String(h).split(/\s{2,}/).filter(Boolean).map((seg) => (seg === 'ESC' ? 'ESC CLOSE' : seg)).flatMap((seg) => (seg.length > BIG_HELP ? wrap(seg, BIG_HELP).split('\n') : [seg]));
  const pages = [];
  for (const seg of segs) {
    const last = pages[pages.length - 1];
    if (last != null && (last + '  ' + seg).length <= BIG_HELP) pages[pages.length - 1] = last + '  ' + seg;
    else pages.push(seg);
  }
  return pages.length ? pages : [''];
}

export default class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  init(data) {
    this.tab = data.tab ?? 0;
    this.openName = data.name || null;
    this.cursor = 0;
    this.scroll = 0;
    this.warm = 2;                                 // ignore input for the first frames (the opening key is still "pressed")
    this.sort = memory.sort || 0;
    this.info = false;
  }

  get gs() { return this.scene.get('Game'); }
  // the sub-page of the page on show (pages without their own setSub keep it here, remembered between openings)
  get sub() { return memory.sub[this.tabs[this.tab].name] ?? 0; }
  get filter() { return this.tabs[this.tab]?.name === 'ITEMS' ? this.sub : memory.sub.ITEMS ?? 0; }

  create() {
    keys.wheel = 0;                                // wheel turns made during play do not scroll the menu
    const release = ui.hold('menu'); ui.release('menu:launch'); keys.wheel = 0;
    this.tabs = [
      { name: 'ITEMS', subs: FILTERS.map(([n]) => n), doubleClick: true, captureLR: () => !!this.dropArm, render: () => this.renderItems(), input: () => this.inputItems(), cursorOf: () => this.cursor, rowAt: (x, y) => { if (x < 8 || x > 144 || y < LAYOUT.top + 3) return -1; const k = Math.floor((y - LAYOUT.top - 3) / 18); const i = this.scroll + k; return k < ROWS && i < this.listLen() ? i : -1; } },
      { name: 'SKILLS', help: 'SKILLS GROW AS YOU USE THEM', render: () => this.renderSkills(), input: () => {} },
      ...extraTabs(this),
    ];
    this.groups = GROUPS.map(([name, pages]) => ({ name, pages: pages.map((p) => this.tabs.findIndex((t) => t.name === p)).filter((i) => i >= 0) }));
    this.openAt(this.openName, this.tab);
    this.bg = this.add.graphics();
    this.dyn = this.add.container(0, 0);
    this.dirty = true;
    this.tabRects = [];
    this.subRects = [];
    this.mouse = { x: -1, y: -1 };
    this.input.on('pointermove', (p) => this.onMove(p));
    this.input.on('pointerdown', (p) => this.onClick(p));
    this.helpG = this.add.graphics().setDepth(4);
    this.helpBig = txt(this, 8, H - 17, '', 4).setDepth(5).setVisible(false);       // A1: the big help line (LARGE TEXT)
    this.helpPg = txt(this, 0, H - 12, '', 3).setDepth(5).setVisible(false);
    this.helpList = null;
    // a pad's triggers step through sub-pages, X and Y do a page's second actions (offhand / travel, sort / region)
    setMenuPad({ b6: 'PadSubL', b7: 'PadSubR', b2: 'V:KeyF', b3: 'V:KeyR' });
    this.events.once('shutdown', () => { setMenuPad(null); release(); });
  }

  // Where the menu opens. `name` may be a top tab (GEAR, JOURNAL...: the page and sub-page it was left on), a page (ITEMS,
  // QUESTS, PERKS..., the old tab names) or a sub-page (LOG, BEASTS, WORN, SOUND...).
  openAt(name, tab) {
    if (name) {
      const g = this.groups.find((x) => x.name === name);
      if (g) { this.tab = this.tabs.findIndex((t) => t.name === memory.page[g.name]); if (this.tab < 0) this.tab = g.pages[0]; return; }
      const i = this.tabs.findIndex((t) => t.name === name);
      if (i >= 0) { this.tab = i; const s = this.subsOf(i).indexOf(name); if (s >= 0) this.setSub(i, s, true); return; }
      for (let p = 0; p < this.tabs.length; p++) { const s = this.subsOf(p).indexOf(name); if (s >= 0) { this.tab = p; this.setSub(p, s, true); return; } }
      this.tab = 0; return;
    }
    this.tab = tab >= 0 && tab < this.tabs.length ? tab : 0;
  }

  // ---------------------------------------------------------------- tabs and sub-pages
  subsOf(p) { const s = this.tabs[p]?.subs; return (typeof s === 'function' ? s() : s) || []; }
  subIndex(p) { const t = this.tabs[p]; return t.getSub ? t.getSub() : memory.sub[t.name] ?? 0; }
  setSub(p, s, quiet = false) {
    const t = this.tabs[p];
    if (t.setSub) t.setSub(s); else { memory.sub[t.name] = s; this.cursor = 0; this.scroll = 0; }
    this.dropArm = null; this.info = false; this.paneMore = 0; this.dirty = true;
    if (!quiet) sfx.play('move');
  }
  groupOf(p = this.tab) { return Math.max(0, this.groups.findIndex((g) => g.pages.includes(p))); }
  // the strip of the current tab: one entry per page, or per sub-page of a page that has them
  strip(gi = this.groupOf()) { return this.groups[gi].pages.flatMap((p) => { const s = this.subsOf(p); return s.length ? s.map((label, sub) => ({ p, sub, label })) : [{ p, sub: null, label: this.tabs[p].name }]; }); }
  stripAt() { return this.strip().findIndex((e) => e.p === this.tab && (e.sub == null || e.sub === this.subIndex(e.p))); }
  pageName() { const e = this.strip()[this.stripAt()]; return e ? e.label : this.tabs[this.tab].name; }
  goEntry(e) { if (e.p !== this.tab) this.go(e.p); if (e.sub != null) this.setSub(e.p, e.sub, true); sfx.play('move'); }
  stepSub(d) {
    const st = this.strip();
    if (st.length < 2) return false;
    this.goEntry(st[(this.stripAt() + d + st.length) % st.length]);
    return true;
  }
  goGroup(gi) { const g = this.groups[gi], back = this.tabs.findIndex((t) => t.name === memory.page[g.name]); this.go(back >= 0 ? back : g.pages[0]); }
  stepGroup(d) { this.goGroup((this.groupOf() + d + this.groups.length) % this.groups.length); }

  // A1: the big help line shows one page at a time and turns the page every few seconds
  updateBigHelp() {
    const L = this.helpList;
    if (!L) { this.helpBig.setVisible(false); this.helpPg.setVisible(false); return; }
    const i = Math.floor(this.time.now / 1000 / TUNE.hud.bigHelpPage) % L.length;
    this.helpBig.setVisible(true).setFont(bigKey(this.helpBigCol), BIG_W).setText(L[i]);
    this.helpPg.setVisible(L.length > 1).setText(`${i + 1}/${L.length}`); this.helpPg.x = W - 8 - this.helpPg.width;
  }

  // ------------------------------------------------------------- mouse
  tapKey(code) { keys._press(code); setTimeout(() => keys._release(code), 60); }
  tabAt(p) { return p.y >= LAYOUT.tabY && p.y < LAYOUT.tabY + LAYOUT.tabH ? this.tabRects.findIndex((r) => p.x >= r.x && p.x < r.x + r.w) : -1; }
  subAt(p) { return p.y >= LAYOUT.subY && p.y < LAYOUT.subY + LAYOUT.subH ? this.subRects.findIndex((r) => p.x >= r.x && p.x < r.x + r.w) : -1; }
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
    if (ti >= 0) { if (ti !== this.groupOf()) this.goGroup(ti); return; }
    const si = this.subAt(p);
    if (si >= 0) { const e = this.strip()[si]; if (e && si !== this.stripAt()) this.goEntry(e); return; }
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
    memory.sort = this.sort;
    ui.lastMenuTab = this.pageName();               // a controller's START reopens the menu here (tab and sub-page)
    this.scene.stop();
  }

  // ----------------------------------------------------------------- data
  inventory() {
    const f = FILTERS[this.filter][1];
    if (f === 'worn') return Object.keys(SLOT_NAMES).map((sl) => S.equip[sl]).filter((id) => id && ITEMS[id]);
    const by = {
      0: (a, b) => TYPE_ORDER.indexOf(ITEMS[a].type) - TYPE_ORDER.indexOf(ITEMS[b].type) || ITEMS[a].name.localeCompare(ITEMS[b].name),
      1: (a, b) => ITEMS[a].name.localeCompare(ITEMS[b].name),
      2: (a, b) => (ITEMS[b].value || 0) - (ITEMS[a].value || 0) || ITEMS[a].name.localeCompare(ITEMS[b].name),
      3: (a, b) => itemWeight(b) * S.inv[b] - itemWeight(a) * S.inv[a] || ITEMS[a].name.localeCompare(ITEMS[b].name),
    }[this.sort];
    return Object.keys(S.inv).filter((id) => ITEMS[id] && (!f || f.includes(ITEMS[id].type))).sort(by);
  }
  worn() { return FILTERS[this.filter][1] === 'worn'; }
  // WORN shows every slot (empty ones too); the rest show the pack
  listLen() { return this.worn() ? Object.keys(SLOT_NAMES).length : this.inventory().length; }
  selectedId() { return this.worn() ? S.equip[Object.keys(SLOT_NAMES)[this.cursor]] || null : this.inventory()[this.cursor] || null; }
  isEquipped(id) { return Object.values(S.equip).includes(id); }

  // ---------------------------------------------------------------- input
  update() {
    this.updateBigHelp();
    if (this.warm > 0) { this.warm--; return; }
    if (overlayOpen()) return;                    // an HTML panel (save tools, bug report) has the keys
    const page = this.tabs[this.tab];
    if (page.busy?.()) { page.input(); if (this.dirty) { this.dirty = false; this.draw(); } return; }
    const gname = this.groups[this.groupOf()].name;
    if (keys.pressed('pause') || keys.back() || keys.pressed('inventory') && gname === 'GEAR' || keys.pressed('journal') && this.pageName() === 'QUESTS') { this.close(); return; }
    let moved = false;
    if (keys.pressed('inventory')) { this.goGroup(0); moved = true; }
    if (keys.pressed('map')) { const q = this.tabs.findIndex((t) => t.name === 'MAP'); if (q === this.tab) { this.close(); return; } if (q >= 0) { this.go(q); moved = true; } }
    if (keys.pressed('journal')) { const q = this.tabs.findIndex((t) => t.name === 'QUESTS'); if (q >= 0) { this.go(q); this.setSub(q, 0, true); moved = true; } }
    if (this.paneMore && keys.pressed('shoutswap') && page.name !== 'ITEMS') { this.paneOff += Math.max(1, this.paneMore - 1); this.dirty = true; sfx.play('move'); }   // G: more text
    const cap = page.captureLR?.();
    if (!moved && ((!cap && keys.pressed('right')) || keys.tabRight())) { this.stepGroup(1); moved = true; }
    if (!moved && ((!cap && keys.pressed('left')) || keys.tabLeft())) { this.stepGroup(-1); moved = true; }
    // Q / TAB / RT: the next sub-page, LT: the one before (a wheel turn is not a press: it scrolls lists)
    const byWheel = performance.now() - (keys.wheelT || -1e9) < 80;
    if (!moved && ((keys.pressed('swap') && !byWheel) || keys.subRight())) moved = this.stepSub(1);
    if (!moved && keys.subLeft()) moved = this.stepSub(-1);
    if (!moved) page.input();
    if (this.dirty) { this.dirty = false; this.draw(); }
  }

  go(t) {
    this.tab = t; this.cursor = 0; this.scroll = 0; this.dirty = true; this.paneMore = 0; this.dropArm = null; this.info = false;
    memory.page[this.groups[this.groupOf(t)].name] = this.tabs[t].name;
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
    if (keys.pressed('shout') && !this.worn()) { this.sort = (this.sort + 1) % SORTS.length; this.cursor = 0; this.scroll = 0; this.dropArm = null; this.dirty = true; sfx.play('move'); }
    const len = this.listLen();
    this.cursor = Math.min(this.cursor, Math.max(0, len - 1));
    if (this.nav(len)) this.info = false;
    const id0 = this.selectedId();
    // G: the item's description and flavour text in place of the numbers (and back), paging a long one
    if (keys.pressed('shoutswap') && id0) {
      if (!this.info) { this.info = true; this.paneOff = 0; } else if (this.infoMore) this.paneOff += Math.max(1, this.infoMore - 1); else this.info = false;
      this.dirty = true; sfx.play('move');
    }
    // V: drop the selected stack at your feet (press twice; equipped and quest items stay). For when the pack is too heavy.
    if (keys.pressed('ammo') && id0) {
      const id = id0, it = ITEMS[id], n = S.inv[id] || 0;
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
    if (this.dropArm && id0 === this.dropArm) {      // A/D: how many to drop
      const n = S.inv[this.dropArm] || 1;
      if (keys.pressed('left')) { this.dropN = Math.max(1, (this.dropN || n) - 1); this.dirty = true; sfx.play('move'); }
      if (keys.pressed('right')) { this.dropN = Math.min(n, (this.dropN || n) + 1); this.dirty = true; sfx.play('move'); }
    }
    const wantEquip = keys.pressed('interact'), wantOff = keys.pressed('block');
    if ((wantEquip || wantOff) && id0) {
      const id = id0, it = ITEMS[id];
      if (SLOT_OF[it.type]) {
        const slot = this.worn() ? Object.keys(SLOT_NAMES)[this.cursor] : wantOff && it.type === 'weapon' ? 'offhand' : SLOT_OF[it.type];
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
  clear() { this.dyn.removeAll(true); this.bg.clear(); this.helpG?.clear(); }
  T(x, y, s, col = 6) { const t = txt(this, x, y, s, col); this.dyn.add(t); return t; }
  // The selected row of any list: a lighter bar, a gold edge on the left and a thin gold frame
  hi(x, y, w, h) {
    const g = this.bg;
    g.fillStyle(C[3]); g.fillRect(x, y, w, h);
    g.fillStyle(C[13]); g.fillRect(x, y, 2, h); g.fillRect(x, y, w, 1); g.fillRect(x, y + h - 1, w, 1); g.fillRect(x + w - 1, y, 1, h);
  }
  // A small filled label: the verdict badge, the list's better / worse marks
  chip(x, y, s, fill, col) { const w = textW(s) + 4; this.bg.fillStyle(C[fill]); this.bg.fillRect(x, y, w, 9); this.T(x + 2, y + 1, s, col); return w; }
  // A text box that scrolls when its text is longer than it is tall: G (BACK on a pad) pages through, arrows show
  // there is more. Each tab keeps one pane; its scroll resets when the selection changes.
  pane(x, y, w, h, text, col = 5) {
    const lines = wrap(String(text || ''), Math.floor(w / 6)).split('\n');
    const vis = Math.max(1, Math.floor(h / 9));
    const key = this.tab + ':' + this.cursor + ':' + this.sub;
    if (this.paneKey !== key) { this.paneKey = key; this.paneOff = 0; }
    if (this.paneOff >= lines.length) this.paneOff = 0;
    this.T(x, y, lines.slice(this.paneOff, this.paneOff + vis).join('\n'), col);
    this.paneMore = lines.length > vis ? vis : 0;
    if (this.paneOff > 0) this.T(x + w - 6, y, '▲', 13);
    if (this.paneOff + vis < lines.length) this.T(x + w - 6, y + (vis - 1) * 9, '▼', 13);
    return lines.length > vis;
  }
  I(x, y, key, scale = 1, alpha = 1) { const i = this.add.image(x, y, key).setOrigin(0).setScale(scale).setAlpha(alpha); this.dyn.add(i); return i; }

  draw() {
    this.clear();
    const g = this.bg, L = LAYOUT, pad = padActive(), hc = settings.highContrast;
    g.fillStyle(C[0], 0.92); g.fillRect(0, 0, W, H);
    panel(g, 2, 2, W - 4, H - 4, 1);
    // the top tabs, with the keys that change them at both ends
    const gi = this.groupOf(), kl = pad ? 'LB' : codeName(BINDINGS.left[0]), kr = pad ? 'RB' : codeName(BINDINGS.right[0]);
    let x = 6;
    this.T(x, L.tabY + 2, '<' + kl, 4); x += textW('<' + kl) + 4;
    this.tabRects = [];
    this.groups.forEach((gr, i) => {
      const w = textW(gr.name) + 8, on = i === gi;
      this.tabRects.push({ x, w });
      if (on) { g.fillStyle(C[13]); g.fillRect(x, L.tabY, w, L.tabH); }
      this.T(x + 4, L.tabY + 2, gr.name, on ? 0 : hc ? 5 : 4);
      if (gr.pages.some((p) => this.tabs[p].badge?.())) { g.fillStyle(C[0]); g.fillRect(x + w - 4, L.tabY, 4, 4); g.fillStyle(C[on ? 0 : 13]); g.fillRect(x + w - 3, L.tabY + 1, 2, 2); }   // something new here
      x += w + 2;
    });
    this.T(x + 2, L.tabY + 2, kr + '>', 4);
    g.fillStyle(C[13]); g.fillRect(4, L.tabY + L.tabH, W - 8, 1);
    // the sub-pages of this tab, the one on show in a gold chip, and the key that steps through them
    this.subRects = [];
    const st = this.strip();
    if (st.length > 1) {
      const at = this.stripAt();
      let sx = 8;
      st.forEach((e, i) => {
        const w = textW(e.label) + 6;
        this.subRects.push({ x: sx, w });
        if (i === at) { g.fillStyle(C[6]); g.fillRect(sx, L.subY, w, L.subH); this.T(sx + 3, L.subY + 1, e.label, 0); }
        else this.T(sx + 3, L.subY + 1, e.label, hc ? 5 : 4);
        if (e.sub == null || e.sub === 0) { const b = this.tabs[e.p].badge?.(); if (b && i !== at) { g.fillStyle(C[13]); g.fillRect(sx + w - 3, L.subY, 2, 2); } }
        sx += w + 3;
      });
      this.T(sx + 2, L.subY + 1, pad ? 'LT/RT' : codeName(BINDINGS.swap[0]) + '>', 4);
      this.stripEnd = sx + 2 + textW(pad ? 'LT/RT' : 'Q>');
    } else this.stripEnd = 8;
    this.help = null; this.helpCol = null; this.paneMore = 0;
    this.tabs[this.tab].render();
    const big = largeText(), hcol = this.helpCol || (hc ? 6 : 4);
    const help = padHint(navHelp(this.help || this.tabs[this.tab].help || 'W/S MOVE  E SELECT', !!this.helpCol), big ? Infinity : 51);
    if (big) {
      // a dark strip over the bottom edge of the panels holds the big line
      const hg = this.helpG; hg.fillStyle(C[0]); hg.fillRect(4, H - 20, W - 8, 18); hg.fillStyle(C[3]); hg.fillRect(4, H - 20, W - 8, 1);
      this.helpList = helpPages(help); this.helpBigCol = hcol;
    } else {
      this.helpList = null;
      this.T(8, H - 12, fit(squeezeHelp(help), 51), hcol);
    }
  }

  // ---------------------------------------------------------------- the pack
  renderItems() {
    const g = this.bg, L = LAYOUT, worn = this.worn();
    const list = this.inventory(), sid = this.selectedId(), sit = sid && ITEMS[sid];
    // the help line says what E does to the selected thing
    {
      const eq = sid && Object.values(S.equip).includes(sid);
      const verb = !sit ? '' : SLOT_OF[sit.type] ? (eq ? 'E TAKE OFF' : 'E EQUIP') + (sit.type === 'weapon' && !eq ? '  F OFFHAND' : '')
        : { potion: 'E DRINK', elixir: 'E DRINK', food: 'E EAT', tome: 'E READ', note: 'E READ', map: 'E READ', whistle: 'E CALL' }[sit.type] || '';
      const drop = sit && !eq && sit.type !== 'quest' && sit.type !== 'note' && sit.type !== 'weapon' ? '  V DROP' : '';
      this.help = this.dropArm ? 'V AGAIN TO DROP  A/D HOW MANY  W/S CANCEL' : `${verb}${drop}${worn ? '' : `  R SORT ${SORTS[this.sort]}`}`.trim();
      if (this.dropArm) this.helpCol = 12;
    }
    // gold at the right end of the strip
    { const gt = `${S.gold} GOLD`; this.T(W - 10 - textW(gt), L.subY + 1, gt, 13); }
    const lh = L.bottom - L.top;
    panel(g, 6, L.top, 140, lh, 2);
    const y0 = L.top + 3;
    if (worn) {
      // WORN: the six slots, empty ones too, and the totals under them
      Object.entries(SLOT_NAMES).forEach(([slot, name], k) => {
        const y = y0 + k * 18, id = S.equip[slot];
        if (k === this.cursor) this.hi(8, y, 136, 17);
        if (id) this.I(12, y, iconKey(id), 1);
        this.T(30, y + 1, name, k === this.cursor ? 5 : 4);
        const up = id && S.upgrades?.[id] ? ' +' + S.upgrades[id] : '';
        this.T(30, y + 9, id ? fit(ITEMS[id].name + up, 18) : 'EMPTY', id ? rarityCol(id) ?? 6 : 3);
      });
      const dmg = (stats.weaponDmg() + stats.offhandDmg() * 0.6) * bonus.melee(), bdmg = stats.bowDmg() * bonus.arrow();
      g.fillStyle(C[3]); g.fillRect(8, y0 + 6 * 18 + 1, 136, 1);
      this.T(10, y0 + 6 * 18 + 4, `ATTACK ${dmg.toFixed(1)}  BOW ${bdmg.toFixed(1)}`, 5);
      this.T(10, y0 + 6 * 18 + 13, `ARMOUR ${Math.round(stats.armor() * 100)}%  HP ${S.maxHp}`, 5);
    } else {
      if (!list.length) this.T(14, y0 + 6, 'NOTHING HERE', 4);
      list.slice(this.scroll, this.scroll + ROWS).forEach((id, k) => {
        const i = this.scroll + k, it = ITEMS[id], sel = i === this.cursor;
        const y = y0 + k * 18;
        if (sel) this.hi(8, y, 134, 17);
        this.I(12, y, iconKey(id), 1);
        const rk = RARITY.findIndex((x) => x.id === it.rarity);       // rarity is told by pips too (1 magic .. 3 legendary), not colour alone
        for (let d = 0; d < rk; d++) { g.fillStyle(C[RARITY[rk].col]); g.fillRect(30 + d * 4, y + 13, 2, 2); }   // under the name
        const up = (S.upgrades && S.upgrades[id]) ? ' +' + S.upgrades[id] : '';
        const rc = rarityCol(id);
        const c = S.inv[id];
        // worn things carry a check mark (OH: in the off hand); other gear a chip saying how it compares (the badge's verdict)
        const tag = S.equip.offhand === id ? 'OH' : Object.values(S.equip).includes(id) ? '✓' : '';
        const mk = tag || !SLOT_OF[it.type] ? 0 : compareGear(id)?.mark || 0;
        const mt = { 1: '▲', '-1': '▼', 2: '◆' }[mk] || '';
        const cnt = !tag && c > 1 ? 'x' + c : '';
        const right = (tag ? textW(tag) + 4 : 0) + (cnt ? textW(cnt) + 4 : 0) + (mt ? 11 : 0);
        this.T(30, y + 5, fit(it.name + up, Math.floor((138 - right - 30) / 6)), rc ?? (sel ? 6 : 5));
        let rx = 140;
        if (tag) { rx -= textW(tag); this.T(rx, y + 5, tag, 15); rx -= 4; }
        if (cnt) { rx -= textW(cnt); this.T(rx, y + 5, cnt, 4); rx -= 4; }
        if (mt) { rx -= 9; this.chip(rx, y + 4, mt, mk === 1 ? 8 : mk === -1 ? 11 : 12, mk === 2 ? 0 : 6); }
      });
      if (list.length > ROWS) {
        const frac = this.scroll / (list.length - ROWS);
        g.fillStyle(C[3]); g.fillRect(143, y0 + 1, 2, ROWS * 18); g.fillStyle(C[13]); g.fillRect(143, y0 + 1 + frac * (ROWS * 18 - 12), 2, 12);
      }
      // carry weight: a bar under the item list. Green while there is room, yellow when Burdened, red when Overloaded;
      // a notch marks the Overloaded line (125%), and the text says how much more you can carry
      const lv = burden.level(), carried = burden.carried(), cap = burden.capacity(), over = TUNE.burden.over, left = Math.floor(cap) - Math.round(carried);
      const by = L.bottom - 10, bx = 26, bw = 60, frac = Math.min(1, carried / (cap * over)), capX = bx + Math.round(bw / over);
      const col = lv === 'ok' ? (left < cap * 0.15 ? 12 : 8) : lv === 'burdened' ? 12 : 11;
      this.T(10, by - 1, 'WT', 4);
      g.fillStyle(C[0]); g.fillRect(bx - 1, by, bw + 2, 6);
      g.fillStyle(C[3]); g.fillRect(bx, by + 1, bw, 4);
      g.fillStyle(C[col]); g.fillRect(bx, by + 1, Math.max(1, Math.round(bw * frac)), 4);
      g.fillStyle(C[6]); g.fillRect(capX, by - 1, 1, 8);                       // the carry limit
      const msg = lv === 'ok' ? `${left} LEFT` : `OVER ${Math.ceil(carried - cap)}`;
      this.T(142 - textW(msg), by - 1, msg, lv === 'ok' ? 5 : col);
    }
    // the right: the selected item, compared with what you wear there
    const rx = 150, rw = W - 6 - rx;
    panel(g, rx, L.top, rw, lh, 1);
    this.infoMore = 0;
    if (!sid) { if (worn) this.T(rx + 6, L.top + 4, 'NOTHING WORN HERE', 4); return; }
    this.renderItemCard(sid, rx + 6, L.top + 3, rw - 12, L.bottom - 3);
  }

  // The item card: name, the verdict against what is worn there, one row per stat, then the description (G swaps the
  // numbers for the description when it does not fit under them).
  renderItemCard(id, x0, y, w, yEnd) {
    const g = this.bg, it = ITEMS[id], cmp = compareGear(id), chars = Math.floor(w / 6);
    const up = S.upgrades?.[id] ? ' +' + S.upgrades[id] : '';
    this.T(x0, y, fit(it.name + up, chars), rarityCol(id) ?? 13);
    y += 10;
    if (this.dropArm === id) {
      const n = S.inv[id] || 1, k = Math.max(1, Math.min(n, this.dropN || n));
      this.T(x0, y + 2, `DROP ${k} OF ${n}?`, 12); this.T(x0, y + 12, 'V AGAIN TO DROP', 6); this.T(x0, y + 22, n > 1 ? 'A/D: HOW MANY' : 'W/S: CANCEL', 4);
      return;
    }
    // the words: what it is, its upgrades, sockets and enchantment
    let line = it.gen ? [it.rarity.toUpperCase(), ...(it.affixLines || []), it.signature].filter(Boolean).join('. ') + '.' : it.desc || '';
    // NP16: how many sockets, and until the first gem is ever set, what a socket is and where gems go in
    { const n = socketCount(id); if (n) { const used = Object.values(S.sockets || {}).some((a) => a?.some?.(Boolean)); line = `SOCKETS ${socketed(id).filter(Boolean).length}/${n}${used ? '' : ': A SET GEM ADDS A BONUS WHILE WORN. TAMSIN SETS THEM IN EMBERHOLD'}. ` + line; } }
    if (S.enchants && S.enchants[id]) line = `${S.enchants[id].type.toUpperCase()} ENCHANT +${S.enchants[id].power}. ` + line;
    if (!cmp) {
      // not gear: what kind of thing, how many, its weight and worth, then the description
      const n = S.inv[id] || 0, wt = itemWeight(id);
      this.T(x0, y, fit(`${(it.type || '').toUpperCase()}${n > 1 ? '  X' + n : ''}`, chars), 4);
      this.T(x0, y + 9, fit(`WEIGHT ${Math.round(wt * 10) / 10}${it.value ? '  WORTH ' + it.value : ''}`, chars), 5);
      g.fillStyle(C[3]); g.fillRect(x0, y + 19, w, 1);
      this.pane(x0, y + 22, w, yEnd - y - 22, line, 5);
      this.infoMore = 0;
      return;
    }
    // the verdict, and what it is measured against
    const bc = BADGE_COL[cmp.badge], bw = textW(cmp.badge) + 4;
    this.chip(x0 + w - bw, y - 1, cmp.badge, bc, bc === 8 || bc === 11 ? 6 : 0);
    const vs = cmp.worn ? 'WORN: ' + SLOT_NAMES[cmp.worn] : 'VS ' + cmp.vs;
    this.T(x0, y, fit(vs, chars - cmp.badge.length - 2), 4);
    y += 11;
    g.fillStyle(C[3]); g.fillRect(x0, y - 2, w, 1);
    if (this.info) {
      // G: the description in place of the numbers, paged when long
      this.pane(x0, y, w, yEnd - y - 10, line, 5);
      this.infoMore = this.paneMore; this.paneMore = 0;
      { const t = padHint(`G ${this.infoMore && this.paneOff + this.infoMore < wrap(line, chars).split('\n').length ? 'MORE' : 'NUMBERS'}`); this.T(x0 + w - textW(t), yEnd - 8, t, 13); }
      return;
    }
    // one row per stat: LABEL  OLD > NEW  DELTA. Full words where they fit, short ones where they do not
    const rows = cmp.rows, V = Math.min(6, Math.max(3, ...rows.map((r) => Math.max(r.aText.length, (r.bText || '').length)))), D = Math.min(5, Math.max(1, ...rows.map((r) => r.dText.length)));
    const single = !!cmp.worn, lmax = single ? chars - V - 1 : Math.floor((w - 29 - 12 * V - 6 * D) / 6);
    const labels = rows.map((r) => (r.label.length <= lmax ? r.label : fit(r.short, lmax)));
    const lw = Math.max(...labels.map((l) => l.length), 1) * 6;
    const oldR = x0 + lw + 6 + V * 6, arrowX = oldR + 4, newR = arrowX + 10 + V * 6, dX = newR + 5;
    const noteN = cmp.notes.length, rh = (rows.length + noteN) * 10 <= yEnd - y ? 10 : 9;
    const room = Math.floor((yEnd - y) / rh);
    const showRows = rows.slice(0, Math.max(1, room - noteN));
    showRows.forEach((r, k) => {
      const ry = y + k * rh, better = r.dir > 0, worse = r.dir < 0;
      this.T(x0, ry, labels[k], 5);
      if (single) { this.T(x0 + w - textW(r.aText), ry, r.aText, 6); return; }
      this.T(oldR - textW(r.bText), ry, r.bText, 4);
      this.T(arrowX, ry, '▶', 3);
      this.T(newR - textW(r.aText), ry, r.aText, better || worse ? 6 : 5);
      const dt = r.dText || (better ? '▲' : worse ? '▼' : '');
      if (dt) this.chip(dX - 2, ry - 1, dt, better ? 8 : 11, 6);
      else if (r.aText === r.bText) this.T(dX, ry, '=', 3);
    });
    let ny = y + showRows.length * rh;
    for (const n of cmp.notes) { if (ny + 9 > yEnd) break; this.T(x0, ny, fit(n.text, chars), n.dir > 0 ? 15 : n.dir < 0 ? 12 : 4); ny += rh; }
    // the description below the numbers when there is room, else G shows it
    const rest = yEnd - ny - 3, lines = wrap(line, chars).split('\n');
    if (line && rest >= 18 && lines.length <= Math.floor(rest / 9)) { g.fillStyle(C[3]); g.fillRect(x0, ny + 1, w, 1); this.T(x0, ny + 3, lines.join('\n'), 4); }
    else if (line) { const t = padHint('G MORE INFO'); this.T(x0 + w - textW(t), yEnd - 8, t, 3); }
  }

  renderSkills() {
    const g = this.bg, y0 = LAYOUT.top + 4;
    panel(g, 6, LAYOUT.top, W - 12, LAYOUT.bottom - LAYOUT.top, 2);
    SKILLS.forEach((k, i) => {
      const s = S.skills[k], d = SKILL_DEFS[k], y = y0 + i * 25;
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
  }
}
