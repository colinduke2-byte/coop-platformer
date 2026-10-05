// Full-screen list for shops, the forge, enchanting and alchemy: icons, prices, "can afford" greying,
// a detail pane and mouse support. Opened with listScreen(cfg), which resolves when the player leaves.
import Phaser from 'phaser';
import { W, H, C } from '../config.js';
import { txt, textW, wrap } from '../art/font.js';
import { keys } from '../systems/keys.js';
import { ui } from '../systems/ui.js';
import { S } from '../systems/state.js';
import { sfx } from '../audio/sfx.js';
import { iconKey, ITEMS } from '../data/items.js';
import { dialogue } from '../systems/dialogue.js';
import { panel } from './MenuScene.js';

const ROWS = 7, RH = 17, LX = 8, LW = 168, TOP = 30;

// cfg: { title, rows: () => [{ id, name, tag, ok, desc, lines: [[text, col]], act }], onSelect(i, ctx), onAlt?(i, ctx), hint, empty }
export function listScreen(cfg) {
  return new Promise((res) => dialogue.hud.scene.launch('Shop', { cfg, res }));
}

export default class ShopScene extends Phaser.Scene {
  constructor() { super('Shop'); }

  init(data) {
    this.cfg = data.cfg; this.res = data.res;
    this.cursor = 0; this.scroll = 0; this.warm = 2; this.msg = ''; this.msgT = 0; this.busy = false; this.dirty = true;
    this.mouse = { x: -1, y: -1 };
  }

  create() {
    ui.modal = true;
    this.bg = this.add.graphics();
    this.dyn = this.add.container(0, 0);
    this.input.on('pointermove', (p) => this.onMove(p));
    this.input.on('pointerdown', (p) => this.onClick(p));
    this.events.once('shutdown', () => { ui.modal = false; });
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
    const i = this.rowAt(p), n = this.cfg.rows().length;
    if (i >= 0 && i < n && i !== this.cursor) { this.cursor = i; this.dirty = true; sfx.play('move'); }
  }
  onClick(p) {
    if (this.busy || this.warm > 0) return;
    if (p.rightButtonDown()) { this.leave(); return; }
    const i = this.rowAt(p);
    if (i >= 0 && i < this.cfg.rows().length) { this.cursor = i; this.choose(false); }
  }

  async choose(alt) {
    const rows = this.cfg.rows();
    if (!rows.length || this.busy) return;
    this.busy = true;
    const fn = alt ? this.cfg.onAlt : this.cfg.onSelect;
    if (fn) { try { await fn(this.cursor, this); } catch (e) { console.error(e); } }
    this.busy = false;
    this.cursor = Math.min(this.cursor, Math.max(0, this.cfg.rows().length - 1));
    this.dirty = true;
  }

  update(_, ms) {
    if (this.warm > 0) { this.warm--; return; }
    if (this.msgT > 0) { this.msgT -= ms / 1000; if (this.msgT <= 0) { this.msg = ''; this.dirty = true; } }
    if (!this.busy) {
      const n = this.cfg.rows().length;
      if (keys.pressed('pause')) { this.leave(); return; }
      if (n && keys.pressed('down')) this.move(1, n);
      if (n && keys.pressed('up')) this.move(-1, n);
      if (keys.pressed('interact')) this.choose(false);
      else if (keys.pressed('swap') && this.cfg.onAlt) this.choose(true);
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
    const rows = this.cfg.rows();
    g.fillStyle(C[0], 0.92); g.fillRect(0, 0, W, H);
    panel(g, 2, 2, W - 4, H - 4, 1);
    this.T(8, 7, this.cfg.title, 13);
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
      this.T(LX + 24, y + 5, r.name.slice(0, 20), r.ok ? (sel ? 6 : 5) : 4);
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
      this.T(234, 30, r.name.slice(0, 13), 6);
      if (r.sub) this.T(234, 40, r.sub.slice(0, 13), 4);
      let y = 70;
      const desc = r.desc || (r.id && ITEMS[r.id]?.desc) || '';
      for (const ln of wrap(desc, 19).split('\n').slice(0, 4)) { this.T(192, y, ln, 5); y += 9; }
      y += 3;
      for (const [text, col] of r.lines || []) { for (const ln of wrap(text, 19).split('\n')) { this.T(192, y, ln, col ?? 5); y += 9; } }
    }
    // footer
    g.fillStyle(C[3]); g.fillRect(4, H - 24, W - 8, 1);
    if (this.msg) this.T(8, H - 20, this.msg, this.msgCol ?? 6);
    this.T(8, H - 10, this.cfg.hint || 'E SELECT   ESC DONE   CLICK OK', 4);
  }
}
