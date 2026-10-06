// All art is generated here, in code: characters, tiles, icons, effects.
// Nothing is loaded from disk. Every colour is an index into PAL.
import { PAL, T, TILE, TILE_COUNT } from '../config.js';
import { hash } from '../util.js';

const canvas = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
};
const R = (ctx, col, x, y, w = 1, h = 1) => {
  ctx.fillStyle = PAL[col];
  ctx.fillRect(x, y, w, h);
};

// ---------------------------------------------------------------- characters
// style: skin hair body trim legs boots eye cape hood helm beard glow
function humanoid(ctx, ox, dir, fr, s) {
  const r = (c, x, y, w, h) => R(ctx, c, ox + x, y, w, h);
  const eye = s.eye ?? 0;
  if (dir === 'down' || dir === 'up') {
    const back = dir === 'up';
    const lUp = fr === 1, rUp = fr === 2;
    // legs
    r(s.legs, 5, 12, 2, lUp ? 1 : 2); r(s.boots, 5, lUp ? 13 : 14, 2, 1);
    r(s.legs, 9, 12, 2, rUp ? 1 : 2); r(s.boots, 9, rUp ? 13 : 14, 2, 1);
    if (lUp) r(s.legs, 5, 12, 2, 1);
    if (rUp) r(s.legs, 9, 12, 2, 1);
    if (s.cape && back) r(s.cape, 4, 7, 8, 7);
    // torso + belt
    r(s.body, 4, 7, 8, 5);
    r(s.trim, 4, 10, 8, 1);
    if (s.chest) r(s.chest, 6, 7, 4, 1);
    // arms
    const la = fr === 1 ? -1 : fr === 2 ? 1 : 0;
    r(s.body, 3, 8 + la, 1, 3); r(s.skin, 3, 11 + la, 1, 1);
    r(s.body, 12, 8 - la, 1, 3); r(s.skin, 12, 11 - la, 1, 1);
    if (s.cape && !back) { r(s.cape, 3, 7, 1, 1); r(s.cape, 12, 7, 1, 1); }
    // head
    if (back) {
      r(s.hood ?? s.hair, 5, 2, 6, 5);
      if (s.helm) r(s.helm, 5, 2, 6, 3);
    } else {
      r(s.skin, 5, 2, 6, 5);
      if (s.hood != null) {
        r(s.hood, 4, 2, 8, 5); r(s.skin, 6, 3, 4, 3);
      } else {
        r(s.hair, 5, 2, 6, 2); r(s.hair, 5, 4, 1, 2); r(s.hair, 10, 4, 1, 2);
      }
      if (s.helm) { r(s.helm, 5, 2, 6, 2); r(s.helm, 7, 4, 2, 1); }
      r(eye, 6, 4, 1, 1); r(eye, 9, 4, 1, 1);
      if (s.glow != null) { r(s.glow, 6, 4, 1, 1); r(s.glow, 9, 4, 1, 1); }
      if (s.beard != null) r(s.beard, 6, 6, 4, 1);
      if (s.mask != null) r(s.mask, 5, 5, 6, 2);
    }
    if (s.horns != null) { r(s.horns, 4, 1, 1, 2); r(s.horns, 11, 1, 1, 2); r(s.horns, 3, 0, 1, 2); r(s.horns, 12, 0, 1, 2); }
    if (s.crown != null) { r(s.crown, 5, 1, 6, 1); r(s.crown, 5, 0, 1, 1); r(s.crown, 8, 0, 1, 1); r(s.crown, 10, 0, 1, 1); }
  } else {
    // side view, facing right
    const spread = fr === 1, together = fr === 2;
    const lx = spread ? 5 : together ? 7 : 6;
    const rx = spread ? 9 : together ? 7 : 8;
    r(s.legs, lx, 12, 2, 2); r(s.boots, lx, 14, 2, 1);
    r(s.legs, rx, 12, 2, 2); r(s.boots, rx, 14, 2, 1);
    if (s.cape) r(s.cape, 3, 7, 3, 7);
    r(s.body, 5, 7, 6, 5);
    r(s.trim, 5, 10, 6, 1);
    if (s.chest) r(s.chest, 9, 7, 2, 1);
    const ax = fr === 1 ? 8 : fr === 2 ? 6 : 7;
    r(s.body, ax, 8, 2, 3); r(s.skin, ax, 11, 2, 1);
    r(s.skin, 6, 2, 6, 5);
    if (s.hood != null) { r(s.hood, 5, 2, 6, 5); r(s.skin, 9, 3, 3, 3); r(s.hood, 6, 1, 5, 1); }
    else { r(s.hair, 6, 2, 6, 2); r(s.hair, 6, 4, 2, 2); }
    if (s.helm) { r(s.helm, 6, 2, 6, 2); r(s.helm, 11, 3, 1, 2); }
    r(eye, 10, 4, 1, 1);
    if (s.glow != null) r(s.glow, 10, 4, 1, 1);
    if (s.beard != null) r(s.beard, 9, 6, 3, 2);
    if (s.mask != null) r(s.mask, 9, 5, 3, 2);
    if (s.horns != null) { r(s.horns, 6, 1, 1, 2); r(s.horns, 5, 0, 1, 2); }
    if (s.crown != null) { r(s.crown, 6, 1, 5, 1); r(s.crown, 7, 0, 1, 1); r(s.crown, 9, 0, 1, 1); }
  }
}

export const STYLES = {
  player: { skin: 10, hair: 9, body: 3, trim: 9, legs: 2, boots: 9, chest: 6, cape: 11 },
  sigrid: { skin: 10, hair: 6, hood: 4, body: 5, trim: 3, legs: 3, boots: 9, chest: 6, beard: null },
  bjorn:  { skin: 10, hair: 9, body: 9, trim: 1, legs: 2, boots: 1, chest: 10, beard: 9, cape: 7 },
  mirra:  { skin: 10, hair: 14, hood: 14, body: 14, trim: 13, legs: 1, boots: 9, chest: 13 },
  draugr: { skin: 4, hair: 3, body: 2, trim: 1, legs: 1, boots: 0, eye: 0, glow: 15, helm: 3 },
  bandit: { skin: 10, hair: 1, hood: 1, body: 9, trim: 0, legs: 2, boots: 0, chest: 11, mask: 11 },
  archer: { skin: 10, hair: 7, hood: 7, body: 8, trim: 9, legs: 9, boots: 0, chest: 10, mask: 9 },
  guard:  { skin: 10, hair: 3, helm: 4, body: 3, trim: 13, legs: 2, boots: 9, chest: 5, beard: 9 },
  child:  { skin: 10, hair: 13, body: 11, trim: 9, legs: 3, boots: 9, chest: 5 },
  warden: { skin: 4, hair: 3, body: 2, trim: 3, legs: 1, boots: 0, glow: 15, helm: 5, chest: 4 },
  chief:  { skin: 10, hair: 11, body: 11, trim: 13, legs: 2, boots: 0, helm: 3, beard: 9, cape: 1, chest: 13 },
  conjurer: { skin: 5, hair: 15, hood: 15, body: 3, trim: 14, legs: 1, boots: 0, glow: 13, chest: 14 },
  hilda:  { skin: 10, hair: 12, body: 9, trim: 5, legs: 2, boots: 0, chest: 4, beard: null },
  ragna:  { skin: 10, hair: 13, hood: 8, body: 8, trim: 9, legs: 7, boots: 9, chest: 10 },
  warlord: { skin: 4, hair: 3, body: 3, trim: 13, legs: 2, boots: 0, glow: 12, helm: 4, chest: 11, beard: 3, cape: 11, horns: 4 },
  winter: { skin: 6, hair: 15, body: 15, trim: 6, legs: 3, boots: 0, glow: 15, helm: 6, horns: 5, crown: 15, cape: 5, chest: 6 },
  trader: { skin: 10, hair: 9, hood: 12, body: 12, trim: 13, legs: 9, boots: 9, chest: 13, cape: 9 },
  wight:  { skin: 5, hair: 14, hood: 14, body: 1, trim: 14, legs: 1, boots: 0, glow: 15, chest: 15 },
  boss:   { skin: 4, hair: 3, body: 1, trim: 13, legs: 2, boots: 0, glow: 15, helm: 3, horns: 5, crown: 13, cape: 14, chest: 13 },
};

function wolfFrame(ctx, ox, fr, pal = { fur: 4, dark: 3, light: 5, leg: 3 }) {
  const r = (c, x, y, w, h) => R(ctx, c, ox + x, y, w, h);
  const a = fr === 1, b = fr === 2;
  // legs
  r(pal.leg, 3, 11, 1, a ? 2 : 3); r(pal.leg, 5, 11, 1, b ? 2 : 3);
  r(pal.leg, 9, 11, 1, b ? 2 : 3); r(pal.leg, 11, 11, 1, a ? 2 : 3);
  // body
  r(pal.fur, 2, 6, 10, 5); r(pal.light, 3, 6, 8, 1); r(pal.dark, 2, 10, 10, 1);
  // tail
  r(pal.fur, 0, 6, 2, 2); r(pal.dark, 0, 8, 1, 1);
  // head
  r(pal.fur, 11, 4, 4, 5); r(pal.light, 11, 4, 3, 1);
  r(2, 11, 3, 1, 1); r(2, 13, 3, 1, 1); // ears
  r(0, 15, 7, 1, 2); r(6, 13, 8, 2, 1); // nose / teeth
  r(11, 13, 5, 1, 1); // eye
}

// Glacial wyrm: an undulating ice serpent seen from the side, head to the right.
function wyrmFrame(ctx, ox, fr) {
  const r = (c, x, y, w, h) => R(ctx, c, ox + x, y, w, h);
  const a = [0, 1, 0][fr], b = [1, 0, 1][fr];
  r(3, 0, 11 + b, 2, 1); r(15, 1, 10 + b, 3, 1);                 // tail tip
  r(15, 3, 9 + a, 4, 3); r(6, 3, 9 + a, 4, 1); r(3, 3, 11 + a, 4, 1);   // rear body
  r(15, 6, 7 + b, 4, 4); r(6, 6, 7 + b, 4, 1); r(3, 6, 10 + b, 4, 1);   // coil
  r(15, 9, 6 + a, 4, 4); r(6, 9, 6 + a, 4, 1);                          // mid body
  r(15, 11, 5, 3, 5); r(6, 11, 5, 2, 1);                                  // neck
  r(5, 10, 3, 1, 3); r(5, 7, 2, 1, 2); r(5, 4, 3, 1, 2);                 // dorsal spikes
  r(15, 12, 3, 4, 4); r(6, 12, 3, 3, 1); r(5, 13, 1, 1, 3);               // head, horn
  r(15, 14, 5, 2, 2); r(6, 14, 6, 2, 1); r(11, 14, 4, 1, 1);              // jaw, eye
  r(6, 3, 12 + a, 1, 1);
}

// The Tidemother: a drowned queen, bell-shaped head over trailing tendrils (side view, faces right).
function tideFrame(ctx, ox, fr) {
  const r = (c, x, y, w, h) => R(ctx, c, ox + x, y, w, h);
  const a = [0, 1, 0][fr], b = [1, 0, 1][fr];
  r(15, 4, 1, 8, 2); r(15, 3, 3, 10, 5); r(6, 5, 2, 4, 1); r(3, 3, 7, 10, 1);          // bell
  r(8, 5, 4, 2, 2); r(13, 9, 4, 1, 1);                                                    // eye
  r(14, 6, 8, 4, 1); r(14, 4, 8, 1, 1);                                                   // gills / mouth
  r(15, 3, 8 + a, 2, 4); r(15, 6, 8 + b, 2, 5); r(15, 9, 8 + a, 2, 4); r(15, 12, 8 + b, 2, 3);  // tendrils
  r(3, 4, 12 + a, 1, 2); r(3, 7, 13, 1, 2); r(3, 10, 12 + a, 1, 2); r(3, 13, 13, 1, 2);
  r(5, 5, 1, 1, 1); r(13, 11, 2, 1, 1);
}

// The Ashen Root: a gnarled, many-armed blight tree with an ember glow in its hollow.
function rootFrame(ctx, ox, fr) {
  const r = (c, x, y, w, h) => R(ctx, c, ox + x, y, w, h);
  const a = [0, 1, 0][fr], b = [1, 0, 1][fr];
  r(7, 4, 1, 8, 2); r(7, 3, 3 + a, 3, 2); r(7, 10, 2, 3, 3); r(8, 2, 3, 2, 1);          // crown of leaves
  r(9, 4, 4, 8, 8); r(10, 5, 5, 6, 6); r(9, 4, 12, 8, 1);                                // trunk
  r(0, 6, 7, 2, 3); r(12, 7, 8, 2, 2); r(12, 8, 7, 1, 1); r(12, 7, 6, 1, 1); r(12, 8, 6, 1, 1);  // hollow face and embers
  r(9, 2, 5 + a, 2, 4); r(9, 12, 5 + b, 2, 4);                                            // arms
  r(10, 3, 12, 2, 2 + a); r(10, 6, 13, 3, 2); r(10, 10, 12, 2, 2 + b);                   // roots
  r(8, 0, 12, 2, 1); r(8, 14, 11, 2, 1);
}

// 1px dark outline inside each 16x16 cell so sprites read on bright snow.
function outline(ctx, w, h) {
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  const a = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[(y * w + x) * 4 + 3]);
  const add = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (a(x, y)) continue;
    const cx = x % 16;
    const nb = (cx > 0 && a(x - 1, y)) || (cx < 15 && a(x + 1, y)) || (y > 0 && a(x, y - 1)) || (y < h - 1 && a(x, y + 1));
    if (nb) add.push([x, y]);
  }
  ctx.fillStyle = PAL[0];
  for (const [x, y] of add) ctx.fillRect(x, y, 1, 1);
}

function buildCharacters(scene) {
  const make = (key, fn, frames = ['down', 'up', 'side']) => {
    const cv = canvas(16 * frames.length * 3, 16);
    const ctx = cv.getContext('2d');
    // Draw first, upload second: WebGL snapshots the canvas when it is added.
    frames.forEach((d, di) => { for (let f = 0; f < 3; f++) fn(ctx, (di * 3 + f) * 16, d, f); });
    outline(ctx, cv.width, cv.height);
    const tex = scene.textures.addCanvas(key, cv);
    frames.forEach((d, di) => { for (let f = 0; f < 3; f++) tex.add(`${d}${f}`, 0, (di * 3 + f) * 16, 0, 16, 16); });
  };
  for (const [name, st] of Object.entries(STYLES)) {
    make('spr_' + name, (ctx, x, d, f) => humanoid(ctx, x, d, f, st));
  }
  make('spr_wolf', (ctx, x, d, f) => wolfFrame(ctx, x, f), ['side']);
  make('spr_grimfang', (ctx, x, d, f) => wolfFrame(ctx, x, f, { fur: 5, dark: 4, light: 6, leg: 4 }), ['side']);
  make('spr_wyrm', (ctx, x, d, f) => wyrmFrame(ctx, x, f), ['side']);
  make('spr_tide', (ctx, x, d, f) => tideFrame(ctx, x, f), ['side']);
  make('spr_root', (ctx, x, d, f) => rootFrame(ctx, x, f), ['side']);
  make('spr_alpha', (ctx, x, d, f) => wolfFrame(ctx, x, f, { fur: 2, dark: 1, light: 3, leg: 1 }), ['side']);
}

// --------------------------------------------------------------------- tiles
function speckle(ctx, ox, oy, seed, cols, count) {
  for (let i = 0; i < count; i++) {
    const x = Math.floor(hash(i, seed, 1) * T), y = Math.floor(hash(i, seed, 2) * T);
    R(ctx, cols[Math.floor(hash(i, seed, 3) * cols.length)], ox + x, oy + y, 1, 1);
  }
}

function drawTile(ctx, id, ox) {
  const o = (c, x, y, w = 1, h = 1) => R(ctx, c, ox + x, y, w, h);
  const snow = () => { o(5, 0, 0, 16, 16); speckle(ctx, ox, 0, id + 1, [6, 6, 4], 7); };
  const cfloor = () => { o(2, 0, 0, 16, 16); o(1, 0, 15, 16, 1); o(1, 15, 0, 1, 16); speckle(ctx, ox, 0, id + 7, [3, 1], 6); };
  switch (id) {
    case TILE.SNOW: snow(); break;
    case TILE.SNOW2: o(5, 0, 0, 16, 16); speckle(ctx, ox, 0, 99, [6, 6, 6, 4, 3], 14); break;
    case TILE.ICE:
      o(4, 0, 0, 16, 16); o(5, 2, 3, 6, 1); o(6, 3, 2, 3, 1); o(5, 9, 10, 5, 1); o(3, 0, 8, 16, 1);
      o(6, 11, 4, 1, 1); o(5, 4, 12, 2, 1); break;
    case TILE.STONE:
      o(3, 0, 0, 16, 16); o(2, 0, 5, 16, 1); o(2, 0, 10, 16, 1); o(2, 8, 0, 1, 5); o(2, 4, 6, 1, 4); o(2, 12, 6, 1, 4); o(2, 8, 11, 1, 5);
      o(6, 0, 0, 16, 2); o(5, 0, 2, 16, 1); break;
    case TILE.PINE: {
      snow();
      o(0, 3, 13, 10, 1); // shadow-ish base
      o(9, 7, 12, 2, 3);
      for (let t = 0; t < 3; t++) {
        const top = 0 + t * 4;
        for (let r = 0; r < 5; r++) {
          const w = Math.min(2 + r * 2 + t, 12); const x = 8 - w / 2;
          o(r < 2 ? 8 : 7, x, top + r, w, 1);
          if (r < 2) o(6, x, top + r, Math.max(1, w / 2 - 1), 1);
          o(0, x + w - 1, top + r, 1, 1);
        }
      }
      break;
    }
    case TILE.PATH: o(10, 0, 0, 16, 16); speckle(ctx, ox, 0, 55, [9, 9, 5, 5, 4], 16); o(9, 0, 15, 16, 1); break;
    case TILE.WOODFLOOR: o(10, 0, 0, 16, 16); for (let y = 3; y < 16; y += 4) o(9, 0, y, 16, 1); o(9, 5, 0, 1, 3); o(9, 11, 4, 1, 4); break;
    case TILE.WOODWALL: o(9, 0, 0, 16, 16); for (let x = 3; x < 16; x += 4) o(10, x, 0, 1, 15); o(1, 0, 14, 16, 2); break;
    case TILE.ROOF:
      o(5, 0, 0, 16, 16); for (let y = 0; y < 16; y += 4) { o(4, 0, y + 3, 16, 1); o(6, 0, y, 16, 1); }
      for (let y = 0; y < 16; y += 4) for (let x = (y / 4) % 2 ? 4 : 0; x < 16; x += 8) o(4, x, y, 1, 3);
      break;
    case TILE.CFLOOR: cfloor(); break;
    case TILE.CWALL:
      o(1, 0, 0, 16, 16); o(2, 0, 0, 16, 1); o(0, 0, 7, 16, 1); o(0, 0, 15, 16, 1);
      o(0, 7, 0, 1, 7); o(0, 3, 8, 1, 7); o(0, 11, 8, 1, 7); o(3, 1, 1, 5, 1); o(3, 9, 9, 5, 1); break;
    case TILE.ROCK:
      snow(); o(3, 2, 5, 12, 9); o(3, 4, 3, 8, 2); o(4, 3, 6, 6, 4); o(6, 4, 3, 6, 2); o(2, 2, 13, 12, 1); o(5, 5, 6, 3, 1); break;
    case TILE.PILLAR:
      cfloor(); o(0, 3, 14, 10, 2); o(4, 4, 2, 8, 12); o(5, 5, 2, 2, 11); o(3, 10, 2, 2, 12); o(6, 4, 1, 8, 1); o(2, 4, 13, 8, 1); break;
    case TILE.BRAZIER:
      cfloor(); o(0, 4, 14, 8, 2); o(3, 5, 8, 6, 5); o(2, 5, 13, 6, 1); o(9, 7, 11, 2, 3); o(1, 5, 8, 6, 1); break;
    case TILE.STAIRS:
      o(1, 0, 0, 16, 16); o(0, 2, 0, 12, 16); for (let i = 0; i < 4; i++) o(2, 3 + i, 2 + i * 3, 10 - i * 2, 1);
      o(3, 0, 0, 2, 16); o(3, 14, 0, 2, 16); break;
    case TILE.FENCE:
      snow(); o(9, 1, 6, 14, 2); o(10, 1, 6, 14, 1); o(9, 1, 11, 14, 2); o(9, 2, 4, 2, 10); o(9, 12, 4, 2, 10); o(6, 2, 3, 2, 1); o(6, 12, 3, 2, 1); break;
    case TILE.RUG: o(11, 0, 0, 16, 16); o(1, 0, 0, 2, 16); o(1, 14, 0, 2, 16); o(13, 3, 0, 1, 16); o(13, 12, 0, 1, 16); speckle(ctx, ox, 0, 71, [0, 9], 5); break;
    case TILE.DOOR:
      o(9, 0, 0, 16, 16); o(1, 3, 0, 10, 16); o(9, 4, 1, 8, 14); o(10, 5, 2, 1, 12); o(10, 8, 2, 1, 12); o(10, 10, 2, 1, 12); o(13, 10, 8, 2, 2); o(6, 2, 0, 12, 1); break;
    case TILE.FIRE:
      o(9, 0, 0, 16, 16); o(5, 0, 0, 16, 16); o(3, 2, 6, 12, 8); o(2, 2, 12, 12, 2); o(0, 4, 5, 8, 2); o(1, 4, 5, 8, 6); o(0, 5, 7, 6, 3); o(9, 3, 9, 10, 1); o(10, 4, 9, 8, 1); break;
    case TILE.WINDOW:
      o(9, 0, 0, 16, 16); for (let x = 3; x < 16; x += 4) o(10, x, 0, 1, 15); o(1, 0, 14, 16, 2);
      o(1, 3, 3, 10, 8); o(13, 4, 4, 8, 6); o(12, 4, 8, 8, 2); o(9, 7, 4, 2, 6); o(9, 4, 6, 8, 1); break;
    case TILE.GRAVE:
      snow(); o(0, 4, 13, 8, 2); o(3, 4, 4, 8, 10); o(4, 5, 3, 6, 1); o(4, 5, 5, 1, 8); o(2, 10, 5, 1, 8); o(2, 7, 7, 2, 4); o(6, 4, 4, 8, 1); break;
    case TILE.SARCO:
      cfloor(); o(0, 1, 13, 14, 2); o(4, 1, 3, 14, 10); o(3, 1, 11, 14, 2); o(5, 2, 4, 12, 1); o(2, 6, 6, 4, 1); o(2, 7, 5, 2, 6); break;
    case TILE.SNOW3: o(5, 0, 0, 16, 16); speckle(ctx, ox, 0, 31, [6, 4], 8); o(4, 3, 10, 3, 2); o(3, 3, 12, 3, 1); o(6, 3, 10, 2, 1); o(4, 11, 4, 2, 2); o(6, 11, 4, 1, 1); o(3, 10, 6, 3, 1); break;
    case TILE.SNOW4: o(5, 0, 0, 16, 16); speckle(ctx, ox, 0, 41, [6, 6, 4], 9); for (const [x, y] of [[3, 4], [9, 9], [12, 3]]) { o(8, x, y + 1, 1, 2); o(8, x + 2, y, 1, 3); o(7, x + 1, y + 1, 1, 2); } break;
    case TILE.PATH2: o(10, 0, 0, 16, 16); speckle(ctx, ox, 0, 61, [9, 9, 4, 5, 3], 20); o(9, 0, 7, 16, 1); o(9, 6, 0, 1, 16); o(5, 8, 3, 2, 1); break;
    case TILE.CFLOOR2: cfloor(); o(1, 4, 3, 1, 5); o(1, 5, 7, 3, 1); o(1, 8, 8, 1, 4); o(1, 9, 11, 3, 1); o(3, 10, 4, 2, 1); break;
    case TILE.CWALL2:
      o(1, 0, 0, 16, 16); o(2, 0, 0, 16, 1); o(0, 0, 7, 16, 1); o(0, 0, 15, 16, 1); o(0, 7, 0, 1, 7); o(0, 3, 8, 1, 7); o(0, 11, 8, 1, 7);
      o(7, 1, 1, 5, 2); o(8, 2, 3, 3, 1); o(7, 9, 9, 4, 2); o(8, 10, 11, 2, 1); o(8, 12, 2, 2, 1); break;
    case TILE.DEADTREE:
      snow(); o(0, 4, 14, 8, 1); o(9, 7, 6, 2, 8); o(9, 4, 5, 3, 1); o(9, 3, 3, 1, 3); o(9, 9, 7, 4, 1); o(9, 12, 4, 1, 4); o(10, 7, 6, 1, 8); o(9, 7, 2, 1, 4); o(6, 3, 3, 1, 1); o(6, 12, 4, 1, 1); o(6, 7, 2, 2, 1); break;
    case TILE.STUMP:
      snow(); o(0, 3, 13, 10, 2); o(9, 3, 6, 10, 7); o(10, 4, 5, 8, 2); o(9, 5, 7, 6, 1); o(10, 6, 7, 4, 1); o(6, 3, 5, 10, 1); o(6, 4, 4, 8, 1); o(9, 7, 6, 2, 1); break;
    case TILE.ICE2: o(4, 0, 0, 16, 16); o(5, 2, 3, 6, 1); o(3, 0, 8, 16, 1); o(2, 3, 2, 1, 4); o(2, 4, 5, 3, 1); o(2, 7, 6, 1, 5); o(2, 8, 10, 4, 1); o(6, 11, 3, 2, 1); break;
    case TILE.TUFT: snow(); for (const [x, y] of [[4, 8], [8, 6], [11, 9]]) { o(8, x, y, 1, 3); o(7, x + 1, y + 1, 1, 2); o(8, x - 1, y + 1, 1, 2); } o(6, 4, 7, 1, 1); break;
    default: o(0, 0, 0, 16, 16);
  }
}

function buildTiles(scene) {
  const cv = canvas(T * TILE_COUNT, T);
  const ctx = cv.getContext('2d');
  for (let i = 0; i < TILE_COUNT; i++) drawTile(ctx, i, i * T);
  scene.textures.addCanvas('tiles', cv);
}

// --------------------------------------------------------- misc / fx / icons
function tex(scene, key, w, h, fn) {
  const cv = canvas(w, h);
  fn(cv.getContext('2d'), w, h);
  scene.textures.addCanvas(key, cv);
}

function ring(ctx, size, th) {
  const c = size / 2 - 0.5;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const d = Math.hypot(x - c, y - c);
    if (d <= size / 2 - 0.3 && d >= size / 2 - th) R(ctx, 6, x, y);
  }
}

function buildFx(scene) {
  for (let c = 0; c < 16; c++) tex(scene, 'p' + c, 2, 2, (g) => R(g, c, 0, 0, 2, 2));
  tex(scene, 'shadow', 12, 5, (g) => {
    g.fillStyle = 'rgba(11,14,26,0.45)';
    g.fillRect(3, 0, 6, 1); g.fillRect(1, 1, 10, 3); g.fillRect(3, 4, 6, 1);
  });
  // ore node, treasure mound, shrine stone
  tex(scene, 'node', 16, 16, (g) => {
    R(g, 0, 2, 5, 12, 10); R(g, 3, 3, 4, 10, 10); R(g, 4, 4, 5, 8, 7); R(g, 2, 3, 12, 10, 2);
    R(g, 15, 5, 3, 2, 4); R(g, 6, 5, 2, 1, 2); R(g, 15, 9, 6, 2, 3); R(g, 6, 9, 7, 1, 1);
  });
  tex(scene, 'mound', 16, 16, (g) => {
    R(g, 0, 3, 11, 10, 3); R(g, 5, 2, 9, 12, 3); R(g, 6, 4, 8, 8, 2); R(g, 6, 5, 9, 6, 1); R(g, 13, 7, 8, 1, 1); R(g, 9, 10, 8, 1, 1);
  });
  tex(scene, 'shrine', 16, 24, (g) => {
    R(g, 0, 3, 21, 10, 3); R(g, 3, 4, 20, 8, 2); R(g, 0, 4, 4, 8, 17); R(g, 3, 5, 3, 6, 17); R(g, 4, 6, 5, 4, 15);
    R(g, 15, 7, 8, 2, 1); R(g, 15, 7, 10, 2, 1); R(g, 6, 7, 5, 2, 4); R(g, 15, 5, 4, 6, 1); R(g, 3, 4, 3, 8, 1);
  });
  // rune pressure plates (tinted per rune) for the crypt puzzle
  tex(scene, 'plate', 16, 16, (g) => {
    R(g, 0, 2, 2, 12, 12); R(g, 6, 3, 3, 10, 10); R(g, 5, 4, 4, 8, 8); R(g, 6, 5, 5, 6, 6); R(g, 5, 7, 6, 2, 4); R(g, 5, 6, 7, 4, 2);
  });
  tex(scene, 'plate_on', 16, 16, (g) => {
    R(g, 0, 2, 2, 12, 12); R(g, 13, 3, 3, 10, 10); R(g, 6, 4, 4, 8, 8); R(g, 13, 5, 5, 6, 6); R(g, 6, 7, 6, 2, 4); R(g, 6, 6, 7, 4, 2);
  });
  tex(scene, 'slash', 16, 24, (g) => {
    for (let a = -60; a <= 60; a += 2) {
      const rad = (a * Math.PI) / 180;
      for (let r = 9; r <= 14; r++) {
        const x = Math.round(2 + Math.cos(rad) * r), y = Math.round(12 + Math.sin(rad) * r);
        if (x >= 0 && x < 16 && y >= 0 && y < 24) R(g, r >= 13 ? 5 : 6, x, y);
      }
    }
  });
  tex(scene, 'arrow', 9, 3, (g) => {
    R(g, 10, 1, 1, 6, 1); R(g, 6, 7, 0, 1, 3); R(g, 5, 8, 1, 1, 1); R(g, 6, 0, 0, 1, 1); R(g, 6, 0, 2, 1, 1); R(g, 4, 1, 0, 1, 1); R(g, 4, 1, 2, 1, 1);
  });
  tex(scene, 'fireball', 8, 8, (g) => {
    R(g, 11, 1, 1, 6, 6); R(g, 12, 2, 0, 4, 8); R(g, 12, 0, 2, 8, 4); R(g, 13, 2, 2, 4, 4); R(g, 6, 3, 3, 2, 2);
  });
  tex(scene, 'frostbolt', 8, 8, (g) => {
    R(g, 3, 3, 0, 2, 8); R(g, 3, 0, 3, 8, 2); R(g, 15, 2, 1, 4, 6); R(g, 15, 1, 2, 6, 4); R(g, 6, 3, 3, 2, 2);
  });
  tex(scene, 'bolt', 6, 6, (g) => { R(g, 4, 1, 0, 4, 6); R(g, 5, 0, 1, 6, 4); R(g, 15, 2, 2, 2, 2); });
  tex(scene, 'ring', 64, 64, (g) => ring(g, 64, 3));
  tex(scene, 'disc', 64, 64, (g) => {
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) if (Math.hypot(x - 31.5, y - 31.5) <= 31.5) R(g, 6, x, y);
  });
  tex(scene, 'ring_small', 32, 32, (g) => ring(g, 32, 2));
  for (let i = 0; i < 3; i++) {
    tex(scene, 'flame' + i, 12, 14, (g) => {
      const w = [6, 8, 7][i], h = [10, 12, 11][i];
      R(g, 12, 6 - w / 2, 14 - h, w, h - 2); R(g, 13, 6 - w / 2 + 1, 14 - h + 3, w - 2, h - 5);
      R(g, 6, 5, 9, 2, 3); R(g, 11, 6 - w / 2, 12, w, 2);
      R(g, 12, 5 + i - 1, 14 - h - 1, 2, 2);
    });
  }
  tex(scene, 'mini_coin', 7, 7, (g) => { R(g, 13, 1, 0, 5, 7); R(g, 13, 0, 1, 7, 5); R(g, 12, 3, 2, 1, 3); R(g, 6, 1, 1, 1, 1); });
  tex(scene, 'mini_arrow', 11, 5, (g) => { R(g, 10, 1, 2, 8, 1); R(g, 5, 9, 1, 1, 3); R(g, 6, 8, 2, 1, 1); R(g, 6, 0, 1, 2, 1); R(g, 6, 0, 3, 2, 1); });
  for (const open of [0, 1]) {
    tex(scene, 'chest' + open, 16, 16, (g) => {
      R(g, 0, 2, 13, 12, 2);
      R(g, 9, 2, open ? 7 : 5, 12, open ? 6 : 8); R(g, 10, 3, open ? 8 : 6, 10, 1);
      R(g, 1, 2, 9, 12, 1); R(g, 13, 7, 9, 2, 3);
      if (open) { R(g, 1, 3, 3, 10, 4); R(g, 13, 6, 4, 4, 1); R(g, 9, 2, 10, 12, 1); R(g, 10, 3, 5, 10, 1); }
      else { R(g, 13, 7, 7, 2, 2); R(g, 9, 2, 5, 12, 1); }
    });
  }
  tex(scene, 'glow', 64, 64, (g) => {
    for (let r = 32; r > 0; r -= 4) {
      g.fillStyle = `rgba(255,255,255,${0.05 + (32 - r) / 32 * 0.16})`;
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) if (Math.hypot(x - 31.5, y - 31.5) < r && (x + y) % 2 === 0) g.fillRect(x, y, 1, 1);
    }
    for (let r = 32; r > 0; r -= 4) {
      g.fillStyle = `rgba(255,255,255,${0.05 + (32 - r) / 32 * 0.16})`;
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) if (Math.hypot(x - 31.5, y - 31.5) < r && (x + y) % 2 === 1 && r < 20) g.fillRect(x, y, 1, 1);
    }
  });
  const blob = (g, cx, cy, rx, ry, col) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) R(g, col, x, y);
  };
  const prop = (key, fn) => tex(scene, key, 16, 16, (g) => { fn(g); outline(g, 16, 16); });
  const rc = (g, x, y, w, h, col) => R(g, col, x, y, w, h); // x,y,w,h,colour (friendlier order)
  prop('pot', (g) => {
    rc(g, 6, 3, 4, 3, 9);                  // neck
    rc(g, 5, 3, 6, 1, 10);                 // lip
    blob(g, 8, 9.5, 5.2, 4.8, 9);          // body (shadow)
    blob(g, 7.4, 9, 4.2, 4, 10);           // body (light)
    rc(g, 5, 7, 2, 2, 5);                  // glint
    rc(g, 6, 11, 4, 1, 9);                 // band
  });
  prop('barrel', (g) => {
    blob(g, 8, 8.5, 6, 6, 9);
    blob(g, 8, 8.5, 4.6, 4.6, 10);
    for (const x of [6, 8, 10]) rc(g, x, 4, 1, 9, 9);      // staves
    rc(g, 3, 5, 10, 1, 1); rc(g, 3, 11, 10, 1, 1);        // hoops
  });
  prop('urn', (g) => {
    rc(g, 6, 3, 4, 3, 2);
    rc(g, 5, 3, 6, 1, 4);
    blob(g, 8, 9.5, 4.8, 5, 3);
    blob(g, 7.4, 9, 3.8, 4.2, 4);
    rc(g, 6, 8, 1, 3, 1); rc(g, 7, 10, 2, 1, 1);          // crack
  });
  prop('bed', (g) => {
    rc(g, 1, 2, 14, 12, 9); rc(g, 2, 3, 12, 10, 11); rc(g, 2, 3, 12, 4, 6); rc(g, 2, 3, 5, 3, 6);
    rc(g, 8, 4, 5, 3, 5); rc(g, 3, 8, 11, 5, 3); rc(g, 3, 10, 11, 1, 4);
  });
  prop('table', (g) => {
    rc(g, 1, 3, 14, 10, 9); rc(g, 1, 4, 14, 7, 10); rc(g, 2, 5, 12, 1, 9); rc(g, 2, 9, 12, 1, 9); rc(g, 6, 6, 3, 3, 13); rc(g, 6, 6, 3, 1, 12);
  });
  prop('shelf', (g) => {
    rc(g, 1, 1, 14, 14, 9); rc(g, 2, 2, 12, 5, 1); rc(g, 2, 9, 12, 5, 1);
    for (const [x, y, c] of [[2, 3, 11], [4, 3, 15], [6, 3, 13], [8, 3, 12], [10, 3, 8], [3, 10, 14], [5, 10, 15], [8, 10, 11], [11, 10, 13]]) rc(g, x, y, 2, 3, c);
    rc(g, 2, 7, 12, 1, 10);
  });
  prop('bookshelf', (g) => {
    rc(g, 1, 1, 14, 14, 9); rc(g, 2, 2, 12, 5, 1); rc(g, 2, 9, 12, 5, 1);
    for (let i = 0; i < 6; i++) { rc(g, 2 + i * 2, 2, 2, 5, [11, 3, 13, 14, 8, 12][i]); rc(g, 2 + i * 2, 9, 2, 5, [8, 14, 12, 3, 11, 13][i]); }
    rc(g, 2, 7, 12, 1, 10);
  });
  prop('cauldron', (g) => {
    blob(g, 8, 9, 6, 5, 2); blob(g, 8, 8, 5, 4, 3); blob(g, 8, 8, 4, 3, 15); rc(g, 5, 7, 2, 1, 6); rc(g, 9, 9, 2, 1, 6); rc(g, 3, 12, 2, 3, 2); rc(g, 11, 12, 2, 3, 2);
  });
  prop('book', (g) => {
    rc(g, 3, 5, 10, 8, 11); rc(g, 4, 6, 8, 6, 5); rc(g, 4, 6, 1, 6, 11); rc(g, 6, 8, 5, 1, 4); rc(g, 6, 10, 4, 1, 4);
  });
  prop('anvil', (g) => {
    rc(g, 3, 11, 10, 3, 2); rc(g, 5, 8, 6, 4, 3); rc(g, 2, 5, 12, 4, 4); rc(g, 12, 6, 3, 2, 3); rc(g, 3, 5, 9, 1, 5);
  });
  prop('herb_berry', (g) => {
    blob(g, 8, 9, 6, 4.5, 8); blob(g, 7, 8, 4.5, 3, 7);
    for (const [x, y] of [[5, 7], [9, 6], [7, 10], [11, 9], [4, 10]]) { rc(g, x, y, 2, 2, 11); rc(g, x, y, 1, 1, 12); }
  });
  prop('herb_lily', (g) => {
    rc(g, 7, 8, 2, 6, 8);
    for (const [x, y] of [[4, 5], [7, 3], [10, 5], [5, 8], [9, 8]]) { rc(g, x, y, 3, 3, 15); rc(g, x + 1, y + 1, 1, 1, 6); }
    rc(g, 5, 11, 2, 2, 8); rc(g, 9, 11, 2, 2, 8);
  });
  prop('sign', (g) => {
    rc(g, 7, 7, 2, 8, 9);                  // post
    rc(g, 2, 2, 12, 7, 10);                // board
    rc(g, 2, 8, 12, 1, 9);
    rc(g, 4, 4, 8, 1, 9); rc(g, 4, 6, 6, 1, 9);   // "text"
  });
  // stepped radial mask used to cut light out of the darkness layer
  tex(scene, 'lightmask', 64, 64, (g) => {
    const steps = 6;
    for (let i = 0; i < steps; i++) {
      const r = 32 * (1 - i / steps);
      g.fillStyle = 'rgba(255,255,255,' + (0.2 + i * 0.03) + ')';
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) if (Math.hypot(x - 31.5, y - 31.5) < r) g.fillRect(x, y, 1, 1);
    }
  });
  tex(scene, 'warn', 16, 16, (g) => { g.fillStyle = 'rgba(200,56,60,0.35)'; g.fillRect(0, 0, 16, 16); });
}

// Item icons (16x16). kind picks a drawing routine; col tints it.
export function buildIcon(scene, key, kind, col = 6) {
  tex(scene, key, 16, 16, (g) => {
    const l = (c, x0, y0, x1, y1) => { // pixel line
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let i = 0; i <= n; i++) R(g, c, Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n));
    };
    switch (kind) {
      case 'sword':
        l(col, 4, 11, 12, 3); l(col, 5, 11, 12, 4); l(6, 6, 10, 11, 5);
        R(g, 13, 3, 11, 4, 1); R(g, 13, 5, 9, 1, 4); l(9, 3, 12, 5, 10); R(g, 9, 2, 13, 2, 2); break;
      case 'bow':
        for (let y = 2; y <= 13; y++) { const x = 4 + Math.round(Math.sin(((y - 2) / 11) * Math.PI) * 5); R(g, col, x, y); R(g, 9, x + 1, y); }
        l(6, 4, 2, 4, 13); R(g, 10, 5, 7, 7, 1); R(g, 6, 11, 7, 1, 1); break;
      case 'arrows':
        for (let i = 0; i < 3; i++) { l(10, 2 + i * 2, 13 - i, 11 + i, 4 - i); R(g, 6, 10 + i, 3 - i, 3, 1); R(g, col, 2 + i * 2, 12 - i, 2, 1); } break;
      case 'armor':
        R(g, col, 3, 3, 10, 10); R(g, 0, 6, 3, 4, 2); R(g, 2, 3, 3, 1, 10); R(g, 2, 12, 3, 1, 1);
        R(g, 6, 4, 6, 2, 1); R(g, 13, 7, 9, 2, 2); R(g, 0, 3, 13, 10, 1); R(g, 9, 3, 10, 10, 1); break;
      case 'charm':
        R(g, 10, 7, 2, 1, 3); R(g, 10, 6, 3, 1, 1); R(g, 10, 9, 3, 1, 1); R(g, 10, 5, 5, 1, 1); R(g, 10, 10, 5, 1, 1);
        R(g, 10, 4, 4, 1, 1); R(g, 10, 11, 4, 1, 1);
        R(g, col, 5, 7, 6, 6); R(g, 6, 6, 8, 2, 1); R(g, 0, 5, 12, 6, 1); break;
      case 'potion':
        R(g, 6, 6, 2, 4, 1); R(g, 9, 6, 1, 4, 2); R(g, col, 4, 7, 8, 7); R(g, 0, 4, 14, 8, 1); R(g, 6, 5, 8, 2, 2); R(g, 5, 3, 3, 1, 1);
        R(g, 4, 7, 7, 1, 7); R(g, 11, 7, 7, 1, 7); R(g, 6, 5, 9, 2, 1); break;
      case 'relic':
        R(g, col, 6, 2, 4, 12); R(g, col, 4, 4, 8, 8); R(g, col, 3, 6, 10, 4); R(g, 6, 6, 4, 2, 5); R(g, 6, 7, 4, 1, 3); R(g, 0, 7, 13, 2, 1); break;
      case 'coin':
        R(g, 13, 5, 5, 6, 6); R(g, 13, 4, 6, 8, 4); R(g, 12, 9, 6, 2, 2); R(g, 6, 5, 6, 1, 2); break;
      case 'fire':
        R(g, 11, 4, 4, 8, 9); R(g, 12, 6, 2, 4, 11); R(g, 13, 6, 8, 3, 3); R(g, 12, 7, 1, 2, 3); R(g, 11, 6, 0, 3, 5); break;
      case 'frost':
        R(g, 15, 7, 1, 2, 14); R(g, 15, 1, 7, 14, 2); for (let i = 0; i < 5; i++) { R(g, 5, 3 + i, 3 + i, 1, 1); R(g, 5, 12 - i, 3 + i, 1, 1); } R(g, 6, 7, 7, 2, 2); break;
      case 'shout':
        for (let i = 0; i < 3; i++) { R(g, i === 0 ? 6 : 4, 3 + i * 3, 8 - i * 3, 1, 1 + i * 6); } R(g, col, 2, 6, 3, 4); R(g, col, 4, 5, 1, 6); break;
      case 'pick': l(6, 3, 13, 11, 5); l(col, 3, 12, 11, 4); R(g, 9, 11, 3, 3, 3); R(g, 13, 2, 12, 2, 2); l(4, 4, 11, 6, 8); break;
      case 'ingot': R(g, col, 3, 7, 10, 5); R(g, 6, 4, 6, 8, 1); R(g, 0, 3, 12, 10, 1); R(g, 0, 3, 7, 10, 1); R(g, 3, 4, 8, 6, 1); break;
      case 'fang': R(g, col, 6, 3, 4, 3); R(g, col, 7, 6, 2, 4); R(g, col, 8, 10, 1, 2); R(g, 5, 7, 4, 1, 2); R(g, 0, 5, 3, 1, 3); break;
      case 'dust': for (const [x, y] of [[4, 8], [7, 5], [9, 9], [6, 11], [11, 7], [5, 6]]) R(g, col, x, y, 2, 2); R(g, 4, 8, 9, 2, 1); break;
      case 'berry': for (const [x, y] of [[5, 8], [9, 7], [7, 11]]) { R(g, col, x, y, 3, 3); R(g, 6, x, y, 1, 1); } R(g, 8, 8, 4, 1, 3); R(g, 8, 6, 5, 3, 1); break;
      case 'lily': R(g, 8, 8, 8, 1, 6); for (const [x, y] of [[6, 5], [9, 5], [7, 3], [5, 7], [10, 7]]) R(g, col, x, y, 2, 3); R(g, 6, 7, 6, 2, 2); break;
      case 'locket': for (let a = 0; a < 360; a += 20) R(g, 4, Math.round(8 + Math.cos(a * Math.PI / 180) * 4), Math.round(4 + Math.sin(a * Math.PI / 180) * 3)); R(g, col, 5, 8, 6, 6); R(g, 13, 6, 9, 4, 4); R(g, 0, 7, 10, 2, 1); R(g, 6, 5, 8, 2, 1); break;
      case 'shield':
        R(g, 0, 3, 2, 10, 9); R(g, 0, 4, 11, 8, 2); R(g, 0, 6, 13, 4, 1);
        R(g, col, 4, 3, 8, 8); R(g, col, 5, 11, 6, 2); R(g, 6, 4, 3, 8, 1); R(g, 13, 7, 6, 2, 2); R(g, 2, 4, 10, 8, 1); break;
      case 'shock':
        l(13, 9, 1, 5, 8); l(13, 5, 8, 9, 8); l(13, 9, 8, 6, 15); l(13, 10, 1, 6, 8); l(6, 9, 2, 6, 8); R(g, 6, 8, 4, 1, 3); break;
      case 'heal':
        R(g, 5, 6, 2, 4, 12); R(g, 5, 2, 6, 12, 4); R(g, 8, 7, 3, 2, 10); R(g, 8, 3, 7, 10, 2); R(g, 6, 7, 3, 1, 2); break;
      case 'ward':
        for (let a = 0; a < 360; a += 12) { const rx = Math.round(8 + Math.cos(a * Math.PI / 180) * 6), ry = Math.round(8 + Math.sin(a * Math.PI / 180) * 6); R(g, 15, rx, ry); R(g, 6, rx, ry - 1 < 0 ? 0 : ry, 1, 1); }
        R(g, 5, 5, 5, 6, 6); R(g, 15, 6, 6, 4, 4); break;
      default: R(g, col, 4, 4, 8, 8);
    }
  });
}

// Held weapon / shield sprites (drawn while swinging / blocking). `kind`: blade | greatblade | shield.
export function buildHeld(scene, key, kind, col = 5) {
  if (kind === 'shield') {
    tex(scene, key, 10, 12, (g) => {
      R(g, 0, 1, 0, 8, 9); R(g, 0, 2, 9, 6, 2); R(g, 0, 3, 11, 4, 1);
      R(g, col, 2, 1, 6, 7); R(g, col, 3, 8, 4, 2); R(g, 6, 2, 1, 6, 1); R(g, 2, 2, 7, 6, 1); R(g, 13, 4, 4, 2, 2); R(g, 3, 3, 8, 1, 1);
    });
    return;
  }
  const L = kind === 'greatblade' ? 17 : 12;
  tex(scene, key, L + 4, 7, (g) => {
    R(g, 0, 0, 1, L + 4, 5);                 // outline
    R(g, 9, 1, 2, 3, 3);                     // grip
    R(g, 13, 4, 0, 2, 7);                    // crossguard
    R(g, col, 6, 2, L - 3, 3); R(g, 0, L + 3, 3, 1, 1);
    R(g, 6, 6, 2, L - 4, 1);                 // edge highlight
  });
}

// --------------------------------------------------------------------- entry
export function generateArt(scene) {
  buildCharacters(scene);
  buildTiles(scene);
  buildFx(scene);
}
