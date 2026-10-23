// Full-screen list for shops, the forge, enchanting and alchemy: icons, prices, "can afford" greying,
// a detail pane and mouse support. Opened with listScreen(cfg), which resolves when the player leaves.
import Phaser from 'phaser';
import { W, H, C } from '../config.js';
import { txt, textW, wrap, fit } from '../art/font.js';
import { padHint } from '../systems/access.js';
import { keys } from '../systems/keys.js';
import { ui } from '../systems/ui.js';
import { S } from '../systems/state.js';
import { sfx } from '../audio/sfx.js';
import { iconKey, ITEMS } from '../data/items.js';
import { dialogue } from '../systems/dialogue.js';
import { panel } from '../ui/panel.js';

const ROWS = 7, RH = 17, LX = 8, LW = 168, TOP = 30;

// cfg: { title, rows: (ctx) => [{ id, name, tag, ok, desc, lines: [[text, col]], act }], onSelect(i, ctx), onAlt?(i, ctx), hint, empty,
//        qty?: true (R picks how many: ctx.qty), sorts?: [labels] (G cycles ctx.sort) }
// A run of related screens (a smith's buy / sell / repair...) can share a tab strip: set TABS before opening them; A/D then
// leaves this screen and TABS.next says which one to open instead.
export const TABS = { labels: null, at: 0, next: null };
export function listScreen(cfg) {
  if (TABS.labels) cfg = { ...cfg, tabs: TABS.labels, tabAt: TABS.at };
  return new Promise((res) => dialogue.hud.scene.launch('Shop', { cfg, res }));
}
const QTY = [1, 5, 10, Infinity];

export default class ShopScene extends Phaser.Scene {
  constructor() { super('Shop'); }

  init(data) {
    this.cfg = data.cfg; this.res = data.res;
    this.cursor = 0; this.scroll = 0; this.warm = 2; this.msg = ''; this.msgT = 0; this.busy = false; this.dirty = true;
    this.mouse = { x: -1, y: -1 };
    this.qtyAt = 0; this.sort = 0; this.armed = null;
  }
  get qty() { return QTY[this.qtyAt]; }
  // ask before doing something you might regret: returns true on the second press for the same key
  confirm(key, msg) { if (this.armed === key) { this.armed = null; return true; } this.armed = key; this.say(msg, 12); sfx.play('alert'); return false; }

  create() {
    keys.wheel = 0;
    const release = ui.hold('shop');           // only its own hold: a shop opened inside a conversation leaves it frozen (CH2)
    this.bg = this.add.graphics();
    this.dyn = this.add.container(0, 0);
    this.input.on('pointermove', (p) => this.onMove(p));
    this.input.on('pointerdown', (p) => this.onClick(p));
    this.events.once('shutdown', release);
  }

  say(m, col = 6) { this.msg = m; this.msgCol = col; this.msgT = 3; this.dirty = true; }
  refresh() { this.dirty = true; }
  leave() { sfx.play('back'); const r = this.res; this.scene.stop(); r(); }

  rowAt(p) {
    if (p.x < LX || p.x > LX + LW || p.y < TOP) return -1;
    const k = Math.floor((p.y - TOP) / RH);
    return k >= 0 && k < ROWS ? this.scroll + k : -1;
  }
  onMove(p) {
    if (this.busy || this.warm > 0) return;
    if (Math.abs(p.x - this.mouse.x) + Math.abs(p.y - this.mouse.y) < 1) return;
    this.mouse = { x: p.x, y: p.y };
    const i = this.rowAt(p), n = this.cfg.rows(this).length;
    if (i >= 0 && i < n && i !== this.cursor) { this.cursor = i; this.dirty = true; sfx.play('move'); }
  }
  onClick(p) {
    if (this.busy || this.warm > 0) return;
    if (p.rightButtonDown()) { this.leave(); return; }
    const i = this.rowAt(p);
    if (i >= 0 && i < this.cfg.rows(this).length) { this.cursor = i; this.choose(false); }
  }

  async choose(alt) {
    const rows = this.cfg.rows(this);
    if (!rows.length || this.busy) return;
    this.busy = true;
    const fn = alt ? this.cfg.onAlt : this.cfg.onSelect;
    if (fn) { try { await fn(this.cursor, this); } catch (e) { console.error(e); } }
    this.busy = false;
    this.cursor = Math.min(this.cursor, Math.max(0, this.cfg.rows(this).length - 1));
    this.dirty = true;
  }
  switchTab(d) {
    const n = this.cfg.tabs.length;
    TABS.next = (this.cfg.tabAt + d + n) % n;
    sfx.play('move'); const r = this.res; this.scene.stop(); r();
  }

  update(_, ms) {
    if (this.warm > 0) { this.warm--; return; }
    if (this.msgT > 0) { this.msgT -= ms / 1000; if (this.msgT <= 0) { this.msg = ''; this.dirty = true; } }
    if (!this.busy) {
      const n = this.cfg.rows(this).length;
      if (keys.pressed('pause') || keys.back()) { if (this.armed) { this.armed = null; this.msg = ''; this.dirty = true; return; } this.leave(); return; }
      if (this.cfg.tabs && (keys.pressed('right') || keys.tabRight())) { this.switchTab(1); return; }
      if (this.cfg.tabs && (keys.pressed('left') || keys.tabLeft())) { this.switchTab(-1); return; }
      if (this.cfg.qty && keys.pressed('shout')) { this.qtyAt = (this.qtyAt + 1) % QTY.length; this.dirty = true; sfx.play('move'); }
      if (this.cfg.sorts && keys.pressed('shoutswap')) { this.sort = (this.sort + 1) % this.cfg.sorts.length; this.cursor = 0; this.scroll = 0; this.dirty = true; sfx.play('move'); }
      if (keys.repeat('up') || keys.repeat('down')) this.armed = null;
      if (n && keys.wheel) { this.move(Math.sign(keys.wheel), n); keys.wheel = 0; }      // the mouse wheel scrolls the list
      if (n && keys.repeat('down')) this.move(1, n);
      if (n && keys.repeat('up')) this.move(-1, n);
      if (keys.pressed('interact')) this.choose(false);
      else if (keys.pressed('swap') && this.cfg.onAlt && performance.now() - (keys.wheelT || -1e9) > 80) this.choose(true);
    }
    if (this.dirty) { this.dirty = false; this.draw(); }
  }

  move(d, n) {
    this.cursor = (this.cursor + d + n) % n;
    if (this.cursor < this.scroll) this.scroll = this.cursor;
    if (this.cursor >= this.scroll + ROWS) this.scroll = this.cursor - ROWS + 1;
    sfx.play('move'); this.dirty = true;
  }

  T(x, y, s, col = 6) { const t = txt(this, x, y, s, col); this.dyn.add(t); return t; }
  I(x, y, key, scale = 1, alpha = 1) { const i = this.add.image(x, y, key).setOrigin(0).setScale(scale).setAlpha(alpha); this.dyn.add(i); return i; }

  draw() {
    this.dyn.removeAll(true);
    const g = this.bg; g.clear();
    const rows = this.cfg.rows(this);
    g.fillStyle(C[0], 0.92); g.fillRect(0, 0, W, H);
    panel(g, 2, 2, W - 4, H - 4, 1);
    if (this.cfg.tabs) {          // a tab strip of related screens (A/D, LB/RB)
      let x = 8;
      this.cfg.tabs.forEach((t, i) => { const w = textW(t) + 6; if (i === this.cfg.tabAt) { g.fillStyle(C[3]); g.fillRect(x, 5, w, 12); g.fillStyle(C[13]); g.fillRect(x, 16, w, 1); } this.T(x + 3, 7, t, i === this.cfg.tabAt ? 13 : 4); x += w + 1; });
    } else this.T(8, 7, fit(this.cfg.title, 40), 13);
    const gold = S.gold + ' G';
    this.T(W - 8 - textW(gold), 7, gold, 13);
    g.fillStyle(C[3]); g.fillRect(4, 18, W - 8, 1);
    this.cursor = Math.min(this.cursor, Math.max(0, rows.length - 1));
    panel(g, 6, 22, LW + 6, 8 + ROWS * RH, 2);
    if (!rows.length) this.T(14, 34, this.cfg.empty || 'NOTHING HERE', 4);
    rows.slice(this.scroll, this.scroll + ROWS).forEach((r, k) => {
      const i = this.scroll + k, y = TOP + k * RH, sel = i === this.cursor;
      if (sel) { g.fillStyle(C[3]); g.fillRect(LX, y, LW, RH - 1); g.fillStyle(C[13]); g.fillRect(LX, y, 2, RH - 1); }
      if (r.id) this.I(LX + 4, y, iconKey(r.id), 1, r.ok ? 1 : 0.35);
      const tagW = r.tag != null ? textW(String(r.tag)) + 6 : 0;
      this.T(LX + 24, y + 5, fit(r.name, Math.floor((LW - 28 - tagW) / 6)), r.ok ? (sel ? 6 : 5) : 4);
      if (r.tag != null) this.T(LX + LW - 4 - textW(String(r.tag)), y + 5, String(r.tag), r.tagCol ?? (r.ok ? 13 : 11));
    });
    if (rows.length > ROWS) {
      const frac = this.scroll / (rows.length - ROWS);
      g.fillStyle(C[3]); g.fillRect(LX + LW + 1, TOP, 2, ROWS * RH); g.fillStyle(C[13]); g.fillRect(LX + LW + 1, TOP + frac * (ROWS * RH - 12), 2, 12);
    }
    // detail pane
    panel(g, 186, 22, W - 192, 8 + ROWS * RH, 2);
    const r = rows[this.cursor];
    if (r) {
      if (r.id) { g.fillStyle(C[0]); g.fillRect(192, 28, 36, 36); g.fillStyle(C[3]); g.fillRect(193, 29, 34, 34); this.I(196, 32, iconKey(r.id), 1.6, r.ok ? 1 : 0.4); }
      // the name gets the full width under the icon (two lines); the short status sits beside the icon
      if (r.sub) this.T(234, 30, wrap(r.sub, 13).split('\n').slice(0, 3).join('\n'), r.subCol ?? 4);
      const nm = wrap(r.name, 19).split('\n').slice(0, 2);
      // the description gives way to the stat lines, and nothing is drawn past the bottom of the pane
      const bottom = 22 + 8 + ROWS * RH - 9, stat = (r.lines || []).flatMap(([text, col]) => wrap(text, 19).split('\n').map((ln) => [ln, col]));
      let y = r.id ? 68 : 30;
      this.T(192, y, nm.join('\n'), 6); y += nm.length * 9 + 2;
      const desc = r.desc || (r.id && ITEMS[r.id]?.desc) || '';
      const room = Math.max(1, Math.min(4, Math.floor((bottom - y - 3 - stat.length * 9) / 9) + 1));
      for (const ln of wrap(desc, 19).split('\n').slice(0, room)) { this.T(192, y, ln, 5); y += 9; }
      y += 3;
      for (const [ln, col] of stat) { if (y > bottom) break; this.T(192, y, ln, col ?? 5); y += 9; }
    }
    // footer
    g.fillStyle(C[3]); g.fillRect(4, H - 24, W - 8, 1);
    if (this.msg) this.T(8, H - 20, fit(this.msg, 51), this.msgCol ?? 6);
    const extra = [this.cfg.qty ? `R ${this.qty === Infinity ? 'ALL' : 'X' + this.qty}` : '', this.cfg.sorts ? `G ${this.cfg.sorts[this.sort]}` : '', this.cfg.tabs ? 'A/D TAB' : ''].filter(Boolean).join('  ');
    this.T(8, H - 10, fit(padHint([(this.cfg.hint || 'E SELECT   ESC DONE').replace(/\s+OR CLICK$|\s+CLICK OK$/, ''), extra].filter(Boolean).join('  '), 51), 51), 4);
  }
}
