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
  boss:   { skin: 4, hair: 3, body: 1, trim: 13, legs: 2, boots: 0, glow: 15, helm: 3, horns: 5, crown: 13, cape: 14, chest: 13 },
};

function wolfFrame(ctx, ox, fr) {
  const r = (c, x, y, w, h) => R(ctx, c, ox + x, y, w, h);
  const a = fr === 1, b = fr === 2;
  // legs
  r(3, 3, 11, 1, a ? 2 : 3); r(3, 5, 11, 1, b ? 2 : 3);
  r(3, 9, 11, 1, b ? 2 : 3); r(3, 11, 11, 1, a ? 2 : 3);
  // body
  r(4, 2, 6, 10, 5); r(5, 3, 6, 8, 1); r(3, 2, 10, 10, 1);
  // tail
  r(4, 0, 6, 2, 2); r(3, 0, 8, 1, 1);
  // head
  r(4, 11, 4, 4, 5); r(5, 11, 4, 3, 1);
  r(2, 11, 3, 1, 1); r(2, 13, 3, 1, 1); // ears
  r(0, 15, 7, 1, 2); r(6, 13, 8, 2, 1); // nose / teeth
  r(11, 13, 5, 1, 1); // eye
}

function buildCharacters(scene) {
  const make = (key, fn, frames = ['down', 'up', 'side']) => {
    const cv = canvas(16 * frames.length * 3, 16);
    const ctx = cv.getContext('2d');
    const tex = scene.textures.addCanvas(key, cv);
    frames.forEach((d, di) => {
      for (let f = 0; f < 3; f++) {
        const x = (di * 3 + f) * 16;
        fn(ctx, x, d, f);
        tex.add(`${d}${f}`, 0, x, 0, 16, 16);
      }
    });
  };
  for (const [name, st] of Object.entries(STYLES)) {
    make('spr_' + name, (ctx, x, d, f) => humanoid(ctx, x, d, f, st));
  }
  make('spr_wolf', (ctx, x, d, f) => wolfFrame(ctx, x, f), ['side']);
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
    case TILE.PATH: o(9, 0, 0, 16, 16); speckle(ctx, ox, 0, 55, [10, 10, 5, 1], 12); o(5, 0, 0, 16, 1); break;
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
      default: R(g, col, 4, 4, 8, 8);
    }
  });
}

// --------------------------------------------------------------------- entry
export function generateArt(scene) {
  buildCharacters(scene);
  buildTiles(scene);
  buildFx(scene);
}
