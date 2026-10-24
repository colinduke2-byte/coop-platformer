// Pictures for the title, the intro and the endings (VX-24, VX-25, VX-26). Static parts are drawn once into canvas textures
// in palette colours; only small things move (aurora, snow, a cloak, a flame, a lantern), drawn with one Graphics each.
import { W, H, PAL, C } from '../config.js';
import { G as GLYPHS } from './font.js';
import { hash } from '../util.js';

const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const painter = (ctx) => (col, x, y, w = 1, h = 1) => { ctx.fillStyle = PAL[col]; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
const bake = (scene, key, w, h, draw) => { if (!scene.textures.exists(key)) { const c = cv(w, h); draw(c.getContext('2d'), painter(c.getContext('2d'))); scene.textures.addCanvas(key, c); } return key; };

// ---------------------------------------------------------------------------------------------------------------- logo
// FROSTFALL in the UI font's own letters at 4x, but hand-shaded: snow white on top, pale ice, then frost at the base, a cyan
// rim on the lit edges, a navy outline and drop shadow, and icicles hanging from the bottoms of the letters.
export function frostLogo(scene, word = 'FROSTFALL') {
  const Z = 4, gw = 6 * Z, lw = word.length * gw - Z, lh = 7 * Z, pad = 3, drip = 8;
  return bake(scene, 'logo_frost', lw + pad * 2 + 2, lh + pad * 2 + drip + 2, (ctx, r) => {
    const on = (x, y) => { if (x < 0 || y < 0 || y >= lh) return false; const li = Math.floor(x / gw), cx = Math.floor((x % gw) / Z), cy = Math.floor(y / Z); if (li >= word.length || cx > 4) return false; return GLYPHS[word[li]]?.[cy]?.[cx] === '#'; };
    const W2 = lw + pad * 2 + 2, H2 = lh + pad * 2 + drip + 2, mask = new Uint8Array(W2 * H2);
    for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) if (on(x, y)) mask[(y + pad) * W2 + x + pad] = 1;
    // icicles: from the bottom row of a letter, every few pixels, a deterministic length
    for (let x = 0; x < lw; x++) {
      if (!on(x, lh - 1) || hash(x, 7, 3) < 0.72) continue;
      const len = 2 + Math.floor(hash(x, 9, 4) * (drip - 2));
      for (let j = 0; j < len; j++) mask[(lh + pad + j) * W2 + x + pad] = j < len - 1 ? 2 : 3;
    }
    const at = (x, y) => (x < 0 || y < 0 || x >= W2 || y >= H2 ? 0 : mask[y * W2 + x]);
    for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) if (at(x - 2, y - 2) && !at(x, y)) r(2, x, y);          // drop shadow
    for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
      const m = at(x, y);
      if (!m) { if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) r(1, x, y); continue; }           // navy outline
      if (m === 3) { r(15, x, y); continue; }                                                                       // icicle tip
      if (m === 2) { r(5, x, y); continue; }
      const ly = y - pad, band = ly < lh * 0.38 ? 6 : ly < lh * 0.72 ? 5 : 4;
      r(!at(x, y - 1) || !at(x - 1, y) ? (band === 4 ? 5 : 15) : band, x, y);                                      // cyan rim on top/left edges
    }
  });
}

// ---------------------------------------------------------------------------------------------------------------- title
// Two layers of mountains that drift at different speeds, pines along the near slope, a starry sky with a slow aurora, and the
// hero on a snowy rise to the left of the menu with his cloak flapping beside a small campfire.
const ridge = (x, base, amp, per, seed) => base - amp * (0.55 * Math.abs(((x / per + seed) % 1) * 2 - 1) + 0.3 * Math.sin(x / (per * 0.37) + seed * 7) + 0.15 * Math.sin(x / 9 + seed));
export class TitleBackdrop {
  constructor(scene) {
    this.s = scene;
    bake(scene, 'title_sky', W, H, (ctx, r) => {
      r(0, 0, 0, W, H); for (let y = 54; y < 120; y++) for (let x = (y & 1); x < W; x += 2) if (y > 80 || hash(x, y, 5) < (y - 54) / 26) r(1, x, y);
      r(1, 0, 90, W, H - 90);
      for (let i = 0; i < 70; i++) { const x = Math.floor(hash(i, 1, 2) * W), y = Math.floor(hash(i, 3, 4) * 96); r(hash(i, 5, 6) < 0.2 ? 6 : hash(i, 7, 8) < 0.5 ? 5 : 4, x, y); }
    });
    const layer = (key, base, amp, per, seed, body, cap, pines) => bake(scene, key, 640, 110, (ctx, r) => {
      for (let x = 0; x < 640; x++) {
        const y = Math.round(ridge(x, base, amp, per, seed));
        r(body, x, y, 1, 110 - y);
        r(cap, x, y, 1, Math.max(1, Math.round((base - y) * 0.25)));           // snow on the high slopes
        if ((base - y) > amp * 0.5) r(6, x, y, 1, 1);
      }
      if (pines) for (let x = 4; x < 640; x += 5 + Math.floor(hash(x, 2, 2) * 6)) {
        const y = Math.round(ridge(x, base, amp, per, seed)) + 14 + Math.floor(hash(x, 4, 4) * 20), h = 6 + Math.floor(hash(x, 6, 6) * 6);
        for (let j = 0; j < h; j++) r(j < 2 ? 1 : 7, x - Math.floor(j / 2.4), y - h + j, 1 + 2 * Math.floor(j / 2.4), 1);
      }
    });
    this.far = scene.add.tileSprite(0, 60, W, 110, layer('title_far', 50, 34, 160, 0.3, 2, 4, false)).setOrigin(0);
    this.near = scene.add.tileSprite(0, 92, W, 110, layer('title_near', 46, 26, 110, 0.7, 3, 5, true)).setOrigin(0);
    this.sky = scene.add.image(0, 0, 'title_sky').setOrigin(0).setDepth(-3);
    this.far.setDepth(-2); this.near.setDepth(-1);
    // a snowy rise on the left for the hero, and the snowfield
    bake(scene, 'title_rise', 110, 40, (ctx, r) => {
      for (let x = 0; x < 110; x++) { const y = Math.round(16 + 14 * Math.pow(Math.abs(x - 46) / 56, 1.6) + Math.sin(x / 5) * 0.8); r(5, x, y, 1, 40 - y); r(6, x, y, 1, 1); }
      for (const [x, y] of [[20, 26], [70, 22], [86, 30]]) { r(3, x, y, 5, 3); r(4, x + 1, y, 3, 1); r(2, x, y + 3, 5, 1); }
    });
    this.rise = scene.add.image(0, 136, 'title_rise').setOrigin(0);
    this.hero = scene.add.image(44, 145, 'spr_player', 'side0');
    this.fire = scene.add.image(64, 151, 'flame0').setScale(0.75);
    this.glow = scene.add.image(64, 150, 'glow').setAlpha(0.5).setScale(0.7).setTint(C[12]);
    this.g = scene.add.graphics();            // logs, the cloak flap
    this.au = scene.add.graphics().setDepth(-2.5);        // the aurora, behind the mountains
    this.t = 0;
  }
  update(dt) {
    this.t += dt;
    const t = this.t;
    this.far.tilePositionX = Math.floor(t * 2);
    this.near.tilePositionX = Math.floor(t * 5);
    // a slow aurora: palette steps 15 / 8 / 14 in soft bands
    const a = this.au; a.clear();
    [[15, 0.18, 10], [8, 0.2, 12], [14, 0.14, 10]].forEach(([col, al, hgt], i) => {
      for (let x = 0; x < W; x += 4) {
        const y = 18 + i * 9 + Math.sin(x * 0.025 + t * (0.3 + i * 0.1) + i * 2) * 8 + Math.sin(x * 0.06 - t * 0.5) * 2;
        a.fillStyle(C[col], al * (0.6 + 0.4 * Math.sin(x * 0.04 + t * 0.7 + i))); a.fillRect(x, Math.round(y), 4, hgt);
      }
    });
    // campfire and the hero's cloak
    this.fire.setTexture('flame' + (Math.floor(t * 8) % 3));
    this.glow.setAlpha(0.42 + 0.1 * Math.sin(t * 9) + 0.05 * Math.sin(t * 23));
    const g = this.g; g.clear();
    g.fillStyle(C[9], 1); g.fillRect(59, 155, 10, 2); g.fillStyle(C[10], 1); g.fillRect(60, 155, 3, 1);
    const flap = Math.floor(t * 5) % 3;
    g.fillStyle(C[11], 1); g.fillRect(38 - flap, 140 + (flap === 1 ? 1 : 0), 2 + flap, 3); g.fillStyle(C[0], 1); g.fillRect(37 - flap, 143, 3 + flap, 1);
  }
}

// ---------------------------------------------------------------------------------------------------------------- intro
// Three small framed pictures under the intro's lines (y 8-64): a blizzard and a fallen figure; dark, and a single lantern;
// a lit doorway and a woman's silhouette in it.
export class IntroVignette {
  constructor(scene) {
    this.s = scene; this.i = -1; this.t = 0;
    this.x0 = (W - 176) / 2; this.y0 = 6;
    this.img = scene.add.image(this.x0, this.y0, '__DEFAULT').setOrigin(0).setVisible(false);
    this.fig = scene.add.image(0, 0, 'spr_player', 'dead1').setVisible(false);
    this.g = scene.add.graphics();
    this.flakes = Array.from({ length: 70 }, (_, i) => ({ x: hash(i, 1, 1) * 176, y: hash(i, 2, 2) * 58, s: 20 + hash(i, 3, 3) * 30 }));
    bake(scene, 'intro_0', 176, 58, (ctx, r) => {                 // a white field under a grey sky, a drift where you fell
      r(2, 0, 0, 176, 58); for (let y = 0; y < 30; y++) for (let x = (y & 1); x < 176; x += 2) if (hash(x, y, 9) < y / 34) r(3, x, y);
      for (let x = 0; x < 176; x++) { const y = 34 + Math.round(Math.sin(x / 13) * 2 + Math.sin(x / 5) * 0.6); r(5, x, y, 1, 58 - y); r(6, x, y, 1, 1); }
      for (let x = 70; x < 110; x++) r(6, x, 44 - Math.round(3 * Math.sin(((x - 70) / 40) * Math.PI)), 1, 1);
    });
    bake(scene, 'intro_1', 176, 58, (ctx, r) => { r(0, 0, 0, 176, 58); });
    bake(scene, 'intro_2', 176, 58, (ctx, r) => {                 // a dark wall of logs, a lit doorway, snow on the step
      r(1, 0, 0, 176, 58); for (let y = 4; y < 46; y += 6) r(0, 0, y, 176, 1); for (let x = 9; x < 176; x += 23) r(0, x, 0, 1, 46);
      r(9, 70, 8, 36, 40); r(12, 74, 12, 28, 36); r(13, 78, 16, 20, 32); r(6, 84, 22, 8, 26);
      r(5, 0, 46, 176, 12); r(6, 0, 46, 176, 1); r(4, 66, 48, 44, 2);
      for (let i = 0; i < 18; i++) r(13, 74 + hash(i, 4, 4) * 28, 48 + hash(i, 5, 5) * 8, 1, 1);
    });
  }
  show(i) {
    if (i === this.i) return;
    this.i = i; this.t = 0;
    if (i < 0 || i > 2) { this.img.setVisible(false); this.fig.setVisible(false); this.g.clear(); return; }
    this.img.setTexture('intro_' + i).setVisible(true).setAlpha(0);
    this.s.tweens.add({ targets: this.img, alpha: 1, duration: 500 });
    if (i === 0) this.fig.setTexture('spr_player', 'dead1').setPosition(this.x0 + 90, this.y0 + 40).setVisible(true).clearTint();
    else if (i === 2) this.fig.setTexture('spr_sigrid', 'down0').setPosition(this.x0 + 88, this.y0 + 38).setVisible(true).setTintFill(C[0]);
    else this.fig.setVisible(false);
  }
  update(dt) {
    if (this.i < 0 || this.i > 2) return;
    this.t += dt;
    const g = this.g, x0 = this.x0, y0 = this.y0; g.clear();
    if (this.i === 0) {                                             // the blizzard over the fallen figure
      g.fillStyle(C[6], 0.9);
      for (const f of this.flakes) { f.x = (f.x + f.s * 1.6 * dt) % 176; f.y = (f.y + f.s * dt) % 58; g.fillRect(Math.floor(x0 + f.x), Math.floor(y0 + f.y), f.s > 40 ? 2 : 1, 1); }
    } else if (this.i === 1) {                                      // one lantern, far off, breathing
      const k = 0.7 + 0.3 * Math.sin(this.t * 3) + 0.08 * Math.sin(this.t * 17), cx = x0 + 88, cy = y0 + 30;
      for (let rr = 14; rr >= 4; rr -= 3) { g.fillStyle(C[12], 0.06 * k * (16 - rr) / 3); g.fillCircle(cx, cy, rr); }
      g.fillStyle(C[0], 1); g.fillRect(cx - 2, cy - 5, 5, 1); g.fillRect(cx, cy - 7, 1, 2);
      g.fillStyle(C[3], 1); g.fillRect(cx - 2, cy - 4, 5, 6);
      g.fillStyle(C[k > 0.8 ? 13 : 12], 1); g.fillRect(cx - 1, cy - 3, 3, 4);
    } else {                                                        // light spilling from the door onto the snow
      g.fillStyle(C[13], 0.18 + 0.05 * Math.sin(this.t * 4)); g.fillRect(x0 + 62, y0 + 46, 52, 12);
    }
    g.lineStyle(1, C[3], 1); g.strokeRect(x0 - 0.5, y0 - 0.5, 177, 59);
  }
}

// ---------------------------------------------------------------------------------------------------------------- endings
// A 320 x 48 tableau above an ending's text, chosen from the outcome: the green village of the thaw, the warden's lantern on the
// throne, the blizzard under the crown, the hearth, the winter king, the cold bargain; chapter three endings by their colour.
const MOOD = {
  give: { sky: [12, 1], ground: 8, snow: 5, sun: 13, weather: 'none', who: [['spr_player', 'down0'], ['spr_sigrid', 'down0'], ['spr_bjorn', 'down0']], houses: true, sprouts: true },
  thaw: { sky: [13, 4], ground: 8, snow: 8, sun: 13, weather: 'none', who: [['spr_player', 'down0'], ['spr_sigrid', 'down0']], houses: true, sprouts: true },
  keep: { sky: [1, 0], ground: 5, snow: 6, sun: null, weather: 'snow', who: [['spr_player', 'up0']], houses: true, dark: true },
  sell: { sky: [2, 1], ground: 5, snow: 6, sun: null, weather: 'light', who: [['spr_player', 'side0'], ['spr_mirra', 'down0']], houses: true, gold: true },
  warden: { sky: [1, 0], ground: 3, snow: 4, sun: null, weather: 'light', who: [['spr_player', 'down0']], throne: true, lantern: true },
  crown: { sky: [14, 0], ground: 4, snow: 6, sun: null, weather: 'storm', who: [['spr_player', 'down0']], throne: true, crown: true },
};
const moodOf = (kind, col) => MOOD[kind] || (col === 8 || col === 13 ? MOOD.thaw : col === 11 || col === 14 ? MOOD.crown : col === 15 ? MOOD.warden : MOOD.give);
export class EndingTableau {
  constructor(scene, kind, col, y = 36, h = 48) {
    const m = this.m = moodOf(kind, col);
    this.s = scene; this.y = y; this.h = h; this.t = 0;
    const key = 'end_' + (MOOD[kind] ? kind : 'c' + col);
    bake(scene, key, W, h, (ctx, r) => {
      for (let yy = 0; yy < h; yy++) for (let x = 0; x < W; x++) r(yy < h * 0.35 || (yy < h * 0.6 && (x + yy) & 1) ? m.sky[0] : m.sky[1], x, yy);
      if (m.sun != null) { for (let yy = -6; yy <= 6; yy++) r(m.sun, 250 - Math.sqrt(36 - yy * yy), 14 + yy, 2 * Math.sqrt(36 - yy * yy), 1); }
      for (let x = 0; x < W; x++) { const yy = Math.round(ridge(x, 30, 14, 90, 0.4)); r(m.dark ? 1 : 2, x, yy, 1, h - yy); r(m.snow === 8 ? 4 : 5, x, yy, 1, 1); }
      for (let x = 0; x < W; x++) { const yy = 38 + Math.round(Math.sin(x / 17) * 1.5); r(m.ground, x, yy, 1, h - yy); r(m.snow, x, yy, 1, 1); }
      if (m.houses) for (const [hx, hw] of [[40, 22], [74, 18], [210, 26], [252, 20]]) {   // the village: log walls, roofs, lit windows
        r(9, hx, 30, hw, 9); r(m.snow === 8 ? 10 : 5, hx - 2, 26, hw + 4, 4); r(m.snow === 8 ? 9 : 6, hx - 2, 26, hw + 4, 1);
        r(m.dark ? 1 : 13, hx + 4, 33, 3, 3); r(1, hx + hw - 8, 32, 4, 7);
      }
      if (m.sprouts) for (let i = 0; i < 26; i++) { const x = Math.floor(hash(i, 3, 1) * W), yy = 40 + Math.floor(hash(i, 4, 1) * 6); r(7, x, yy, 1, 2); r(hash(i, 5, 1) < 0.3 ? 13 : 8, x, yy - 1, 1, 1); }
      if (m.throne) { r(0, 146, 12, 28, 30); r(3, 148, 14, 24, 26); r(4, 150, 16, 20, 4); r(2, 152, 24, 16, 14); for (const x of [146, 158, 170]) r(4, x, 8, 4, 6); }
      if (m.gold) for (let i = 0; i < 9; i++) r(i % 3 ? 13 : 12, 180 + i * 3, 42 - (i % 2), 2, 1);
    });
    this.img = scene.add.image(0, y, key).setOrigin(0);
    const xs = m.throne ? [160] : [150, 168, 184];
    this.who = m.who.map(([k, f], i) => scene.textures.exists(k) ? scene.add.image(xs[i] ?? 150 + i * 16, y + (m.throne ? 33 : 36), k, f) : null).filter(Boolean);
    if (m.crown) this.who[0]?.setTintFill(C[0]);                 // the crowned one is a silhouette in the storm
    this.g = scene.add.graphics();
    this.flakes = Array.from({ length: 60 }, (_, i) => ({ x: hash(i, 1, 9) * W, y: hash(i, 2, 9) * h, s: 10 + hash(i, 3, 9) * 30 }));
  }
  update(dt) {
    this.t += dt;
    const g = this.g, m = this.m, y = this.y; g.clear();
    if (m.lantern) { const k = 0.8 + 0.2 * Math.sin(this.t * 3); g.fillStyle(C[12], 0.25 * k); g.fillCircle(174, y + 30, 8); g.fillStyle(C[3], 1); g.fillRect(172, y + 27, 5, 6); g.fillStyle(C[13], 1); g.fillRect(173, y + 28, 3, 4); }
    if (m.crown) { g.fillStyle(C[15], 1); const cx = this.who[0]?.x ?? 160; g.fillRect(cx - 3, y + 24, 7, 1); for (const dx of [-3, 0, 3]) g.fillRect(cx + dx, y + 22, 1, 2); }
    if (m.weather !== 'none') {
      const n = m.weather === 'storm' ? 60 : m.weather === 'snow' ? 40 : 18, wind = m.weather === 'storm' ? 3 : 1;
      g.fillStyle(C[6], 0.85);
      for (let i = 0; i < n; i++) { const f = this.flakes[i]; f.x = (f.x + f.s * wind * dt + W) % W; f.y = (f.y + f.s * dt) % this.h; g.fillRect(Math.floor(f.x), Math.floor(y + f.y), 1, 1); }
    }
    g.lineStyle(1, C[3], 1); g.lineBetween(0, y - 0.5, W, y - 0.5); g.lineBetween(0, y + this.h + 0.5, W, y + this.h + 0.5);
  }
}
