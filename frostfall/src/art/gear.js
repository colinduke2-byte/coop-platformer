// Hand-built looks for weapons, shields, armour and charms: every item gets its own shape, not a recoloured template.
// Each family has a table of shapes; an item's icon kind is "<family>_<shape>" (for example sword_nordic) and its icon colour is
// the blade / main material. Icons are 16x16, weapons also get a held sprite.
import { DAG_HI, DAG_LO, iconFromCells, heldFromCells, Cb, col2, R } from './cells.js';

const hi = (c) => DAG_HI[c] ?? 6, lo = (c) => (c === 15 ? 4 : DAG_LO[c] ?? 1);   // cyan shades to steel blue, not purple

// ------------------------------------------------------------------------------------------------------ blades (swords)
// A blade shape: L blade length, t(i, L) thickness (1-4), wave(i) sideways bend, guard, grip, pommel, fuller, notch and deco hooks.
const GUARDS = {
  bar: (cells, gc, W) => { for (const v of [-2, -1, 0, 1, 2]) cells.push([0, v, v === 0 ? 4 : gc]); },
  long: (cells, gc) => { for (const v of [-3, -2, -1, 0, 1, 2, 3]) cells.push([0, v, gc]); cells.push([0, -4, 6], [0, 4, 6]); },
  wing: (cells, gc) => { for (const v of [-2, -1, 0, 1, 2]) cells.push([0, v, gc]); cells.push([-1, -3, gc], [-1, 3, gc], [1, -3, gc], [1, 3, gc]); },
  crown: (cells, gc) => { for (const v of [-3, -2, -1, 0, 1, 2, 3]) cells.push([0, v, gc]); for (const v of [-3, -1, 1, 3]) cells.push([1, v, gc]); cells.push([1, 0, 14]); },
  basket: (cells, gc) => { for (const v of [-2, -1, 0, 1, 2]) cells.push([0, v, gc]); for (const u of [-1, -2, -3]) cells.push([u, 3, gc]); cells.push([-1, -2, gc], [-2, -2, gc]); },
  shell: (cells, gc) => { cells.push([0, -2, gc], [0, -1, gc], [0, 0, gc], [0, 1, gc], [0, 2, gc], [-1, -2, gc], [-1, 2, gc], [-1, 0, hi(gc)]); },
  claw: (cells, gc) => { for (const v of [-2, -1, 0, 1, 2]) cells.push([0, v, gc]); cells.push([1, -3, gc], [1, 3, gc], [2, -4, gc], [2, 4, gc]); },
  nub: (cells, gc) => { cells.push([0, -1, gc], [0, 0, gc], [0, 1, gc]); },
  none: () => {},
};
const POMMELS = {
  ball: (cells, u, c) => cells.push([u, 0, c], [u - 1, 0, c], [u, 1, hi(c)], [u, -1, c]),
  disc: (cells, u, c) => { for (const v of [-2, -1, 0, 1, 2]) cells.push([u, v, c]); },
  spike: (cells, u, c) => { cells.push([u, 0, c], [u - 1, 0, c], [u - 2, 0, c], [u, 1, c], [u, -1, c]); },
  skull: (cells, u, c) => { cells.push([u, 0, 6], [u, 1, 6], [u, -1, 6], [u - 1, 0, 6], [u - 1, 1, 6], [u - 1, -1, 6], [u, 0, 0]); },
  wolf: (cells, u, c) => { cells.push([u, 0, c], [u, 1, c], [u, -1, c], [u - 1, 0, c], [u - 1, 1, c], [u - 1, -1, c], [u + 0, -2, c], [u, 2, c], [u, 0, 11]); },
  none: (cells, u, c) => cells.push([u, 0, c]),
};
function bladeCells(S, col) {
  const cells = [], L = S.L, bc = S.bladeCol ?? col, H = hi(bc), Lo = lo(bc);
  for (let i = 0; i < L; i++) {
    const t = Math.max(1, Math.round(S.t(i, L))), w = S.wave ? S.wave(i, L) : 0, top = -Math.floor((t - 1) / 2) + w;
    for (let j = 0; j < t; j++) {
      let c = j === 0 ? H : j === t - 1 && t > 1 ? Lo : bc;
      if (S.fuller && t >= 3 && j === Math.floor(t / 2) && i > 1 && i < L - 3) c = S.fuller === true ? Lo : S.fuller;
      if (S.notch && S.notch(i, j, t)) continue;
      if (S.paint) c = S.paint(i, j, t, c) ?? c;
      cells.push([i, top + j, c]);
    }
    if (S.deco) S.deco(i, t, top, cells);
  }
  if (S.extra) S.extra(cells, L);
  const g = S.grip ?? 3, gcol = S.gripCol ?? 9;
  for (let k = 1; k <= g; k++) cells.push([-k, 0, S.wrap && k % 2 ? S.wrap : gcol]);
  (POMMELS[S.pommel || 'ball'])(cells, -g - 1, S.pommelCol ?? 13);
  (GUARDS[S.guard || 'bar'])(cells, S.guardCol ?? 13);
  return cells;
}
const rune = (i, j, t) => null;

export const SWORD_SHAPES = {
  // --- one-handed
  rusty: { L: 11, t: (i, L) => (i < L - 2 ? 2 : 1), notch: (i, j, t) => (i % 4 === 2 && j === t - 1), paint: (i, j, t, c) => ((i * 5 + j) % 7 === 0 ? 9 : c), guard: 'nub', grip: 3, gripCol: 10, wrap: 9, pommel: 'none', guardCol: 9 },
  iron: { L: 12, t: (i, L) => (i < L - 2 ? 2 : 1), guard: 'bar', grip: 3, pommel: 'ball', guardCol: 4 },
  steel: { L: 12, t: (i, L) => (i < L - 3 ? 3 : i < L - 1 ? 2 : 1), fuller: true, guard: 'long', grip: 3, pommel: 'disc', guardCol: 13 },
  nordic: { L: 13, t: (i, L) => (i < 2 ? 2 : i < L - 4 ? 3 : i < L - 1 ? 2 : 1), fuller: 15, paint: (i, j, t, c) => (j === 1 && i % 3 === 2 && i > 2 && i < 11 ? 15 : null), guard: 'wing', grip: 3, pommel: 'spike', guardCol: 4 },
  silver: { L: 13, t: (i, L) => (i < L - 2 ? 2 : 1), paint: (i, j, t, c) => (j === 0 ? 6 : null), guard: 'long', grip: 3, gripCol: 5, wrap: 6, pommel: 'ball', guardCol: 6, pommelCol: 6 },
  grave: { L: 13, t: (i, L) => (i % 2 ? 3 : 2) - (i > L - 3 ? 1 : 0), deco: (i, t, top, cells) => { if (i > 2 && i % 3 === 0) cells.push([i, top - 1, 12]); }, guard: 'claw', grip: 3, gripCol: 1, pommel: 'skull', guardCol: 12 },
  emberb: { L: 13, t: (i, L) => (i < 2 ? 2 : 3) - (i > L - 3 ? 1 : 0), wave: (i) => (i > 3 ? (i % 4 < 2 ? 0 : 1) : 0), paint: (i, j, t, c) => (j === 1 ? 13 : j === 0 ? 12 : 11), guard: 'wing', grip: 3, gripCol: 1, pommel: 'ball', guardCol: 12, pommelCol: 12 },
  hook: { L: 13, t: (i, L) => (i < L - 3 ? 2 : 2), wave: (i, L) => (i > L - 5 ? Math.round(((i - (L - 5)) ** 2) / 2.2) : 0), deco: (i, t, top, cells) => { if (i === 4 || i === 8) cells.push([i, top + t, 7]); }, guard: 'nub', grip: 4, gripCol: 9, wrap: 7, pommel: 'ball', guardCol: 9 },
  cutlass: { L: 13, t: (i, L) => (i < 2 ? 2 : 3) - (i > L - 3 ? 1 : 0), wave: (i, L) => Math.round((i * i) / 30), guard: 'basket', grip: 3, gripCol: 1, wrap: 15, pommel: 'ball', guardCol: 15 },
  admiral: { L: 14, t: (i, L) => (i < 2 ? 2 : 3) - (i > L - 4 ? 1 : 0), wave: (i, L) => Math.round((i * i) / 26), paint: (i, j, t, c) => (j === 1 && i % 4 === 1 ? 13 : null), guard: 'basket', grip: 3, gripCol: 1, wrap: 13, pommel: 'ball', guardCol: 13, pommelCol: 6 },
  shard: { L: 13, t: (i, L) => [2, 3, 3, 2, 3, 4, 3, 2, 3, 2, 2, 1, 1][i] || 1, paint: (i, j, t, c) => ((i + j) % 3 === 0 ? 6 : c), notch: (i, j, t) => (i === 6 && j === 0), extra: (cells, L) => { cells.push([L + 1, -2, 6], [L + 2, -3, 15], [L + 2, 2, 6]); }, guard: 'nub', grip: 3, gripCol: 5, pommel: 'ball', guardCol: 6, pommelCol: 15 },
  // --- two-handed (longer, broader)
  gs_iron: { L: 17, t: (i, L) => (i < L - 3 ? 3 : i < L - 1 ? 2 : 1), fuller: true, guard: 'long', grip: 5, pommel: 'disc', guardCol: 4 },
  gs_nordic: { L: 18, t: (i, L) => (i < 3 ? 3 : i < L - 4 ? 4 : i < L - 1 ? 2 : 1), fuller: 15, paint: (i, j, t, c) => (j === 2 && i % 3 === 1 && i > 2 && i < 15 ? 15 : null), guard: 'wing', grip: 5, pommel: 'spike', guardCol: 4 },
  gs_bone: { L: 18, t: (i, L) => (i < L - 2 ? 3 : 2), wave: (i, L) => Math.round(Math.sin(i * 0.5) * 0.6), paint: (i, j, t, c) => (j === 1 && i % 3 === 0 ? 11 : j === 0 ? 6 : c), notch: (i, j, t) => (i % 3 === 1 && j === t - 1 && i > 3), guard: 'claw', grip: 5, gripCol: 11, wrap: 1, pommel: 'spike', guardCol: 6, pommelCol: 6 },
  gs_pack: { L: 17, t: (i, L) => (i < 2 ? 2 : i < L - 3 ? 4 : 3), notch: (i, j, t) => (i === 12 && j === 0) || (i === 13 && j === 0), paint: (i, j, t, c) => (j === 1 && i > 3 && i < 14 ? hi(c) : null), guard: 'bar', grip: 5, gripCol: 1, wrap: 9, pommel: 'wolf', guardCol: 6, pommelCol: 4 },
  gs_king: { L: 18, t: (i, L) => (i < 2 ? 2 : i < L - 4 ? 4 : i < L - 1 ? 3 : 1), fuller: 14, paint: (i, j, t, c) => (j === 2 && i % 4 === 2 ? 13 : null), guard: 'crown', grip: 5, gripCol: 14, wrap: 13, pommel: 'disc', guardCol: 13 },
};
const swordCells = (shape, col) => bladeCells(SWORD_SHAPES[shape] || SWORD_SHAPES.iron, col);

// ------------------------------------------------------------------------------------------------------ dispatch
const FAMILIES = {
  sword: { cells: swordCells, held: (shape) => (shape.startsWith('gs_') ? { W: 34, H: 15, cy: 7, ox: 8 } : { W: 26, H: 11, cy: 5, ox: 7 }) },
};

// ------------------------------------------------------------------------------------------------------ hafted weapons
// A shaft ending at u = 0, with a head drawn by shape: b is a cell builder (put, slab, orb, ring, line), C(letter) a colour lookup.
function hafted(set, shape, col) {
  const D = set[shape] || Object.values(set)[0], b = Cb(), C = (L) => col2(L, col);
  for (let u = -D.len; u < 0; u++) b.put(u, 0, D.wrap && u % 4 === 0 ? C(D.wrap) : u % 5 === 0 && D.shaft === 'W' ? C('T') : C(D.shaft));
  if (D.butt !== false) { b.put(-D.len - 1, 0, C(D.buttCol || 'G')); }
  D.head(b, C, col);
  return b.cells();
}
export const AXE_SHAPES = {
  hand: { len: 10, shaft: 'W', head(b, C) { b.slab(0, 1, () => -1, () => 1, C('K')); b.slab(1, 6, (u) => -4 + Math.abs(u - 3.5) * 0.5, () => 0, C('B')); b.slab(2, 3, () => 1, () => 2, C('L')); b.line(6, -3, 6, 0, C('H')); b.put(7, -2, C('H')); } },
  bearded: { len: 11, shaft: 'W', head(b, C) { b.slab(0, 1, () => -1, () => 1, C('K')); b.slab(1, 8, (u) => -5 + Math.abs(u - 4.5) * 0.45, () => 0, C('B')); b.slab(2, 7, () => 1, (u) => 1 + (7 - u) * 0.7, C('L')); b.line(8, -4, 8, 1, C('H')); b.put(1, -1, C('G')); b.put(1, 1, C('G')); } },
  court: { len: 11, shaft: 'K', buttCol: 'G', head(b, C) { b.slab(0, 2, () => -1, () => 1, C('G')); b.slab(1, 5, () => -3, () => 3, C('B')); b.slab(5, 6, () => -3, () => 3, C('H')); b.line(1, 0, 4, 0, C('L')); b.line(2, 4, 8, 4, C('N')); b.put(9, 4, C('N')); b.put(3, -3, C('G')); b.put(3, 3, C('G')); } },
  ember: { len: 11, shaft: 'W', head(b, C) { b.slab(0, 1, () => -1, () => 1, C('K')); b.slab(1, 8, (u) => -5 + (u - 1) * 0.2 - (u % 2 ? 0 : 1), () => 0, (u, v) => (v < -3 ? C('R') : v < -1 ? C('O') : C('G'))); b.slab(2, 5, () => 1, () => 2, C('R')); b.put(8, -4, C('G')); } },
  pick: { len: 12, shaft: 'W', head(b, C) { b.slab(-1, 1, () => -1, () => 1, C('K')); b.line(0, 0, 3, -4, C('B')); b.line(0, 0, 3, 4, C('B')); b.line(3, -4, 6, -5, C('H')); b.line(3, 4, 6, 5, C('H')); b.put(7, -5, C('H')); b.put(7, 5, C('H')); b.put(1, -1, C('L')); b.put(1, 1, C('L')); b.put(0, 0, C('G')); } },
  lodepick: { len: 15, shaft: 'I', head(b, C) { b.slab(-1, 2, () => -1, () => 1, C('K')); b.line(1, 0, 5, -5, C('B')); b.line(1, 0, 5, 5, C('B')); b.line(1, -1, 5, -5, C('B')); b.line(1, 1, 5, 5, C('B')); b.line(5, -5, 9, -6, C('H')); b.line(5, 5, 9, 6, C('H')); b.put(6, 0, C('G')); b.put(7, 0, C('O')); b.line(4, -3, 5, -2, C('G')); b.line(4, 3, 5, 2, C('G')); b.put(10, -6, C('G')); b.put(10, 6, C('G')); } },
};
export const SPEAR_SHAPES = {
  hunting: { len: 17, shaft: 'W', head(b, C) { b.slab(0, 1, () => -1, () => 1, C('K')); b.slab(2, 8, (u) => -1.6 + (u - 2) * 0.28, (u) => 1.6 - (u - 2) * 0.28, C('B')); b.line(2, 0, 8, 0, C('H')); b.put(9, 0, C('H')); } },
  ash: { len: 18, shaft: 'T', wrap: 'K', head(b, C) { b.slab(-1, 2, () => -1, () => 1, C('I')); b.slab(3, 10, (u) => -1 + (u - 3) * 0.14, (u) => 1 - (u - 3) * 0.14, C('B')); b.put(3, -2, C('L')); b.put(3, 2, C('L')); b.put(4, -2, C('L')); b.put(4, 2, C('L')); b.line(3, 0, 10, 0, C('H')); b.put(11, 0, C('H')); } },
  harpoon: { len: 18, shaft: 'W', head(b, C) { b.slab(0, 1, () => -1, () => 1, C('N')); b.slab(2, 11, (u) => -0.6, (u) => 0.6, C('B')); b.line(4, -1, 8, -4, C('H')); b.line(4, 1, 8, 4, C('H')); b.put(8, -4, C('H')); b.put(8, 4, C('H')); b.put(9, -3, C('B')); b.put(9, 3, C('B')); b.put(12, 0, C('S')); b.line(-6, 1, -3, 3, C('T')); b.line(-3, 3, 0, 1, C('T')); } },
  ember: { len: 17, shaft: 'W', head(b, C) { b.slab(0, 1, () => -1, () => 1, C('K')); b.slab(2, 11, (u) => -2.2 + Math.abs(u - 4) * 0.28 + (u % 2 ? 0 : -0.8), (u) => 2.2 - Math.abs(u - 4) * 0.28 + (u % 2 ? 0 : 0.8), (u, v) => (Math.abs(v) < 1 ? C('G') : u % 2 ? C('O') : C('R'))); b.put(12, 0, C('G')); } },
};
export const MACE_SHAPES = {
  iron: { len: 9, shaft: 'W', head(b, C) { b.orb(3, 0, 3, C('B'), C('L')); b.put(3, -4, C('H')); b.put(3, 4, C('H')); b.put(7, 0, C('H')); b.put(0, -3, C('H')); b.put(0, 3, C('H')); b.put(2, -1, C('H')); } },
  war: { len: 10, shaft: 'W', head(b, C) { b.slab(0, 1, () => -1, () => 1, C('K')); b.slab(1, 7, () => -2, () => 2, C('B')); for (const u of [2, 4, 6]) { b.put(u, -3, C('H')); b.put(u, 3, C('H')); b.put(u, -4, C('N')); b.put(u, 4, C('N')); } b.line(1, 0, 7, 0, C('L')); b.put(8, 0, C('H')); } },
  trollbone: { len: 9, shaft: 'T', head(b, C) { b.slab(0, 8, (u) => -1 - u * 0.3, (u) => 1 + u * 0.3, C('S')); b.put(3, -3, C('E')); b.put(6, 2, C('E')); b.put(4, 3, C('S')); b.put(8, -2, C('S')); b.put(8, 2, C('S')); b.put(9, 0, C('S')); b.put(5, 0, C('E')); b.put(7, -3, C('M')); } },
  cinder: { len: 10, shaft: 'K', head(b, C) { b.slab(0, 1, () => -1, () => 1, C('K')); b.slab(1, 8, () => -3, () => 3, C('K')); b.slab(2, 7, () => -2, () => 2, (u, v) => ((u + v) % 2 ? C('O') : C('R'))); b.slab(3, 6, () => -1, () => 1, C('G')); b.put(9, 0, C('O')); b.put(4, -4, C('R')); b.put(5, 4, C('O')); } },
};
export const HAMMER_SHAPES = {
  war: { len: 13, shaft: 'W', head(b, C) { b.slab(0, 1, () => -1, () => 1, C('K')); b.slab(1, 7, () => -4, () => 4, C('B')); b.slab(1, 7, () => -4, () => -3, C('H')); b.slab(1, 7, () => 3, () => 4, C('L')); b.slab(8, 11, (u) => -0.5, (u) => 0.5, C('N')); b.put(12, 0, C('N')); b.put(3, 0, C('G')); } },
  maul: { len: 14, shaft: 'I', head(b, C) { b.slab(-1, 1, () => -1, () => 1, C('K')); b.slab(1, 9, () => -5, () => 5, C('B')); b.slab(1, 9, () => -5, () => -4, C('H')); b.slab(1, 9, () => 4, () => 5, C('L')); b.slab(3, 7, () => -1, () => 1, C('C')); b.put(5, 0, C('S')); b.put(10, -2, C('C')); b.put(10, 2, C('C')); b.put(11, 0, C('S')); b.put(0, -6, C('C')); b.put(6, 6, C('C')); } },
};
const HAFT = { axe: [AXE_SHAPES, { W: 26, H: 15, cy: 7, ox: 13 }], spear: [SPEAR_SHAPES, { W: 34, H: 11, cy: 5, ox: 19 }], mace: [MACE_SHAPES, { W: 24, H: 13, cy: 6, ox: 11 }], hammer: [HAMMER_SHAPES, { W: 30, H: 15, cy: 7, ox: 16 }] };
for (const [f, [set, sz]] of Object.entries(HAFT)) FAMILIES[f] = { cells: (shape, col) => hafted(set, shape, col), held: () => (f === 'axe' ? { ...sz, ox: 13 } : sz) };


// ------------------------------------------------------------------------------------------------------ front-view icons
// Bows, shields, armour and charms are drawn straight onto the 16x16 icon: D() is a small pixel grid with shapes, C(letter) a colour lookup.
function D() {
  const m = new Map(), put = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < 16 && y >= 0 && y < 16) m.set(y * 16 + x, c); };
  const o = {
    put,
    rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, c); return o; },
    disc(cx, cy, r, c, c2) { for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r + 0.2) put(x, y, c2 && x + y < cx + cy - r * 0.6 ? c2 : c); return o; },
    ell(cx, cy, rx, ry, c) { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.05) put(x, y, c); return o; },
    ring(cx, cy, r, c) { for (let a = 0; a < 360; a += 6) put(cx + Math.cos((a * Math.PI) / 180) * r, cy + Math.sin((a * Math.PI) / 180) * r, c); return o; },
    line(x0, y0, x1, y1, c) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let i = 0; i <= n; i++) put(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c); return o; },
    poly(pts, c) { let y0 = 99, y1 = -99; for (const [, y] of pts) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); } for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) { const yy = y + 0.5, xs = []; for (let i = 0; i < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]; if ((ay <= yy && by > yy) || (by <= yy && ay > yy)) xs.push(ax + ((yy - ay) / (by - ay)) * (bx - ax)); } xs.sort((a, b) => a - b); for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.round(xs[i]); x < Math.round(xs[i + 1]); x++) put(x, y, c); } return o; },
    cells: () => [...m.entries()].map(([k, c]) => [k % 16, Math.floor(k / 16), c]),
  };
  return o;
}
const direct = (fn) => (shape, col) => { const d = D(), C = (L) => col2(L, col); fn(d, C, col); return d.cells(); };
export const BOW_SHAPES = {
  hunting: direct((d, C) => { for (let y = 2; y <= 13; y++) { const x = 4 + Math.round(Math.sin(((y - 2) / 11) * Math.PI) * 5); d.put(x, y, C('B')); d.put(x + 1, y, C('L')); } d.line(5, 2, 5, 13, C('S')); d.rect(8, 7, 2, 3, C('W')); d.put(3, 2, C('H')); d.put(3, 13, C('H')); }),
  long: direct((d, C) => { for (let y = 0; y <= 15; y++) { const x = 3 + Math.round(Math.sin((y / 15) * Math.PI) * 5.5) - (y < 2 || y > 13 ? 2 : 0); d.put(x, y, C('B')); d.put(x + 1, y, C('L')); } d.line(2, 0, 2, 15, C('S')); d.rect(8, 6, 2, 4, C('E')); d.put(8, 7, C('M')); d.put(9, 9, C('M')); d.put(7, 1, C('H')); }),
  antler: direct((d, C) => { for (let y = 1; y <= 14; y++) { const x = 4 + Math.round(Math.sin(((y - 1) / 13) * Math.PI) * 5); d.put(x, y, C('S')); d.put(x + 1, y, C('c')); } d.line(5, 1, 5, 14, C('C')); d.line(8, 3, 11, 1, C('S')); d.line(8, 12, 11, 14, C('S')); d.line(9, 5, 12, 5, C('S')); d.line(9, 10, 12, 10, C('S')); d.rect(8, 7, 2, 3, C('N')); d.put(4, 1, C('C')); d.put(4, 14, C('C')); }),
  crossbow: direct((d, C) => { d.rect(2, 7, 11, 2, C('W')); d.rect(2, 6, 4, 1, C('T')); d.rect(8, 9, 2, 3, C('W')); d.line(11, 1, 11, 14, C('N')); d.line(12, 2, 14, 4, C('N')); d.line(12, 13, 14, 11, C('N')); d.line(14, 4, 14, 11, C('N')); d.line(11, 1, 14, 4, C('N')); d.line(11, 14, 14, 11, C('N')); d.line(4, 8, 13, 8, C('S')); d.put(14, 8, C('S')); d.put(5, 5, C('G')); }),
  harbor: direct((d, C) => { d.rect(1, 7, 12, 2, C('I')); d.rect(1, 6, 3, 1, C('T')); d.rect(7, 9, 2, 3, C('K')); d.line(11, 0, 11, 15, C('N')); d.line(11, 0, 14, 3, C('C')); d.line(11, 15, 14, 12, C('C')); d.line(14, 3, 14, 12, C('c')); d.disc(11, 0, 1, C('C')); d.disc(11, 15, 1, C('C')); d.line(3, 8, 13, 8, C('T')); d.line(2, 6, 2, 3, C('T')); d.put(5, 7, C('S')); d.put(9, 7, C('C')); }),
  company: direct((d, C) => { for (let y = 1; y <= 14; y++) { const x = 4 + Math.round(Math.sin(((y - 1) / 13) * Math.PI) * 5); d.put(x, y, y % 4 < 2 ? C('R') : C('K')); d.put(x + 1, y, y % 4 < 2 ? C('G') : C('R')); } d.disc(4, 1, 1.2, C('G')); d.disc(4, 14, 1.2, C('G')); d.line(4, 2, 4, 13, C('S')); d.rect(8, 7, 2, 3, C('G')); d.put(9, 8, C('R')); d.put(11, 4, C('G')); d.put(11, 11, C('G')); }),
};
export const SHIELD_SHAPES = {
  wooden: direct((d, C) => { d.disc(8, 8, 7, C('W'), C('T')); for (const x of [4, 6, 8, 10, 12]) d.line(x, 2, x, 14, C('K')); d.ring(8, 8, 6.6, C('N')); d.disc(8, 8, 2, C('N')); d.put(7, 7, C('S')); d.put(8, 8, C('K')); }),
  iron: direct((d, C) => { d.poly([[2, 2], [14, 2], [14, 8], [11, 13], [8, 15], [5, 13], [2, 8]], C('B')); d.line(8, 2, 8, 15, C('L')); d.line(2, 7, 14, 7, C('L')); d.rect(2, 2, 12, 1, C('H')); for (const [x, y] of [[3, 3], [12, 3], [3, 8], [12, 8]]) d.put(x, y, C('S')); d.disc(8, 7, 1.6, C('G')); }),
  nordic: direct((d, C) => { d.disc(8, 8, 7, C('B'), C('H')); d.ring(8, 8, 5, C('S')); d.ring(8, 8, 3.6, C('K')); for (let a = 0; a < 360; a += 45) d.put(8 + Math.cos((a * Math.PI) / 180) * 5.6, 8 + Math.sin((a * Math.PI) / 180) * 5.6, C('c')); d.disc(8, 8, 1.8, C('G')); d.line(5, 5, 11, 11, C('S')); d.line(11, 5, 5, 11, C('S')); d.put(8, 8, C('K')); }),
  warden: direct((d, C) => { d.poly([[2, 1], [8, 3], [14, 1], [14, 8], [11, 13], [8, 15], [5, 13], [2, 8]], C('B')); d.poly([[4, 4], [8, 5], [12, 4], [12, 8], [10, 11], [8, 12], [6, 11], [4, 8]], C('K')); d.line(8, 5, 8, 11, C('S')); d.line(5, 7, 11, 7, C('S')); d.put(8, 3, C('G')); d.put(2, 1, C('S')); d.put(14, 1, C('S')); d.put(8, 12, C('C')); }),
  bulwark: direct((d, C) => { d.poly([[3, 0], [13, 0], [14, 10], [8, 15], [2, 10]], C('K')); d.poly([[4, 1], [12, 1], [13, 9], [8, 14], [3, 9]], C('B')); d.line(8, 2, 8, 13, C('L')); for (const [x0, y0, x1, y1] of [[5, 3, 6, 6], [6, 6, 5, 9], [11, 4, 10, 7], [10, 7, 11, 10]]) d.line(x0, y0, x1, y1, C('O')); d.disc(8, 7, 2, C('G')); d.disc(8, 7, 1, C('O')); d.put(8, 7, C('S')); d.rect(4, 1, 8, 1, C('H')); }),
};
const iconXY = (g, cells) => { const map = new Map(); for (const [x, y, c] of cells) map.set(y * 16 + x, c); for (const [k, c] of map) R(g, c, k % 16, Math.floor(k / 16)); outlineXY(map, g); };
const outlineXY = (map, g) => { const add = []; for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { if (map.has(y * 16 + x)) continue; if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const X = x + dx, Y = y + dy; return X >= 0 && X < 16 && Y >= 0 && Y < 16 && map.has(Y * 16 + X); })) add.push([x, y]); } for (const [x, y] of add) R(g, 0, x, y); };
// shield held sprite: the icon shrunk to 10 x 12
const shieldHeld = (g, cells) => { const src = new Map(); for (const [x, y, c] of cells) src.set(y * 16 + x, c); const map = new Map(); for (let y = 0; y < 12; y++) for (let x = 0; x < 10; x++) { const c = src.get(Math.min(15, Math.round(y * 1.3)) * 16 + Math.min(15, Math.round(x * 1.55))); if (c !== undefined) map.set(y * 10 + x, c); } for (const [k, c] of map) R(g, c, k % 10, Math.floor(k / 10)); for (let y = 0; y < 12; y++) for (let x = 0; x < 10; x++) { if (map.has(y * 10 + x)) continue; if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => map.has((y + dy) * 10 + (x + dx)) && x + dx >= 0 && x + dx < 10)) R(g, 0, x, y); } };
FAMILIES.bow = { direct: true, cells: (shape, col) => BOW_SHAPES[shape](shape, col) };
FAMILIES.shield = { direct: true, cells: (shape, col) => SHIELD_SHAPES[shape](shape, col), heldFn: (g, cells) => shieldHeld(g, cells), heldSize: { W: 10, H: 12 } };


// ------------------------------------------------------------------------------------------------------ armour
const body = (d, C, x0, x1, y0, y1, c) => d.poly([[x0 + 1, y0], [x1 - 1, y0], [x1, y0 + 1], [x1, y1], [x0, y1], [x0, y0 + 1]], c);
const pauld = (d, cx, y, r, c, c2) => { d.disc(cx, y, r, c, c2); };
const neckV = (d, c) => { d.poly([[6, 2], [10, 2], [8, 5]], c); };
export const ARMOR_SHAPES = {
  fur: direct((d, C) => { body(d, C, 3, 13, 3, 14, C('B')); d.rect(2, 3, 2, 6, C('B')); d.rect(12, 3, 2, 6, C('B')); neckV(d, C('K')); for (let x = 5; x <= 11; x += 2) d.put(x, 2, C('T')); d.rect(5, 2, 6, 1, C('T')); d.line(8, 5, 8, 9, C('T')); for (const y of [5, 7]) { d.put(7, y, C('K')); d.put(9, y, C('K')); } d.rect(3, 10, 10, 1, C('L')); d.put(4, 14, C('L')); d.put(7, 14, C('L')); d.put(10, 14, C('L')); d.put(8, 11, C('G')); }),
  cuirass: direct((d, C) => { body(d, C, 3, 13, 2, 13, C('B')); d.rect(3, 2, 10, 1, C('H')); d.line(8, 2, 8, 13, C('L')); d.line(4, 8, 12, 8, C('L')); for (const [x, y] of [[4, 4], [11, 4], [4, 10], [11, 10]]) d.put(x, y, C('S')); d.rect(1, 3, 2, 2, C('L')); d.rect(13, 3, 2, 2, C('L')); d.rect(2, 12, 12, 2, C('K')); for (const x of [3, 6, 9, 12]) d.rect(x, 12, 2, 3, C('B')); d.rect(6, 5, 4, 1, C('H')); }),
  plate: direct((d, C) => { body(d, C, 4, 12, 3, 13, C('B')); pauld(d, 3, 3, 2.6, C('B'), C('H')); pauld(d, 13, 3, 2.6, C('B'), C('H')); d.rect(5, 1, 6, 2, C('N')); d.rect(7, 5, 2, 5, C('C')); d.put(7, 7, C('S')); d.put(8, 7, C('S')); d.rect(4, 11, 8, 1, C('K')); d.rect(5, 12, 6, 3, C('L')); d.line(3, 3, 3, 5, C('S')); d.line(13, 3, 13, 5, C('S')); d.rect(4, 4, 8, 1, C('H')); }),
  leathers: direct((d, C) => { body(d, C, 3, 13, 3, 13, C('B')); d.rect(2, 4, 2, 5, C('L')); d.rect(12, 4, 2, 5, C('L')); d.poly([[5, 1], [11, 1], [12, 4], [4, 4]], C('M')); d.rect(6, 2, 4, 2, C('K')); d.line(4, 5, 12, 12, C('W')); d.line(12, 5, 4, 12, C('W')); d.rect(3, 9, 10, 1, C('W')); d.put(8, 9, C('G')); d.rect(3, 13, 3, 2, C('L')); d.rect(10, 13, 3, 2, C('L')); d.put(6, 7, C('H')); d.put(10, 6, C('H')); }),
  robe: direct((d, C) => { d.poly([[4, 2], [12, 2], [13, 5], [14, 14], [2, 14], [3, 5]], C('B')); d.poly([[2, 5], [5, 4], [4, 11], [1, 12]], C('L')); d.poly([[14, 5], [11, 4], [12, 11], [15, 12]], C('L')); neckV(d, C('K')); d.rect(4, 8, 8, 1, C('G')); d.put(8, 8, C('S')); for (const [x, y] of [[6, 11], [10, 12], [8, 10]]) d.put(x, y, C('G')); d.line(8, 5, 8, 14, C('L')); d.rect(6, 1, 4, 1, C('H')); }),
  bulwark: direct((d, C) => { d.rect(3, 2, 10, 12, C('B')); d.rect(0, 1, 4, 5, C('L')); d.rect(12, 1, 4, 5, C('L')); d.rect(0, 1, 4, 1, C('H')); d.rect(12, 1, 4, 1, C('H')); d.rect(5, 0, 6, 2, C('N')); d.rect(3, 7, 10, 2, C('K')); d.line(8, 2, 8, 13, C('L')); for (const [x, y] of [[1, 3], [14, 3], [4, 4], [11, 4], [4, 11], [11, 11]]) d.put(x, y, C('S')); d.rect(4, 13, 8, 2, C('L')); d.rect(6, 4, 4, 2, C('H')); }),
  scale: direct((d, C) => { body(d, C, 3, 13, 3, 14, C('B')); for (let y = 3; y < 14; y++) for (let x = 3; x < 13; x++) if (((x + y * 2) % 4 === 0)) d.put(x, y, C('H')); for (let y = 3; y < 14; y++) for (let x = 3; x < 13; x++) if (((x + y * 2) % 4 === 2)) d.put(x, y, C('L')); for (const sx of [3, 12]) { d.poly([[sx - 1, 3], [sx + 1, 3], [sx, 0]], C('G')); d.poly([[sx - 2, 5], [sx, 5], [sx - 1, 2]], C('G')); } d.rect(5, 2, 6, 1, C('O')); d.rect(3, 10, 10, 1, C('R')); d.put(8, 10, C('G')); neckV(d, C('K')); }),
  peat: direct((d, C) => { body(d, C, 3, 13, 3, 14, C('B')); for (let y = 3; y < 14; y++) for (let x = 3; x < 13; x++) if ((x + y) % 2 === 0) d.put(x, y, C('L')); for (const [x, y] of [[4, 4], [5, 5], [10, 6], [11, 7], [6, 10], [7, 11], [9, 12]]) { d.put(x, y, C('M')); d.put(x + 1, y, C('E')); } d.rect(2, 3, 2, 5, C('B')); d.rect(12, 3, 2, 5, C('B')); for (const x of [4, 7, 10, 12]) d.line(x, 14, x, 15, C('E')); d.line(5, 3, 5, 6, C('E')); d.rect(6, 2, 4, 1, C('N')); }),
  clanfurs: direct((d, C) => { d.poly([[2, 3], [14, 3], [15, 9], [13, 14], [3, 14], [1, 9]], C('B')); for (const [x, y] of [[3, 14], [5, 15], [7, 14], [9, 15], [11, 14], [13, 15], [1, 10], [15, 10], [2, 6], [14, 6]]) d.put(x, y, C('L')); d.rect(3, 3, 10, 2, C('T')); for (let x = 3; x < 13; x += 2) d.put(x, 5, C('T')); d.rect(4, 7, 8, 1, C('K')); d.put(8, 4, C('S')); d.put(8, 5, C('S')); d.put(8, 6, C('S')); d.line(4, 9, 6, 12, C('L')); d.line(12, 9, 10, 12, C('L')); neckV(d, C('K')); }),
  cloak: direct((d, C) => { d.poly([[8, 0], [12, 3], [14, 14], [2, 14], [4, 3]], C('B')); d.poly([[8, 0], [11, 3], [8, 7], [5, 3]], C('L')); d.poly([[7, 2], [9, 2], [9, 5], [7, 5]], C('K')); d.line(8, 7, 8, 14, C('L')); d.put(8, 7, C('G')); d.rect(10, 10, 3, 3, C('K')); d.rect(10, 10, 3, 1, C('W')); d.put(11, 11, C('G')); d.rect(2, 13, 12, 1, C('L')); d.put(4, 14, C('L')); d.put(11, 14, C('L')); }),
  rime: direct((d, C) => { body(d, C, 3, 13, 3, 13, C('B')); for (let y = 3; y < 13; y++) for (let x = 3; x < 13; x++) if ((x + y) % 3 === 0) d.put(x, y, C('H')); d.rect(2, 3, 2, 4, C('B')); d.rect(12, 3, 2, 4, C('B')); d.rect(3, 3, 10, 1, C('S')); d.rect(1, 3, 2, 1, C('S')); d.rect(13, 3, 2, 1, C('S')); for (const x of [3, 5, 7, 9, 11]) d.poly([[x, 13], [x + 2, 13], [x + 1, 15 + (x % 4 === 3 ? 0 : -1)]], C('S')); neckV(d, C('K')); d.put(8, 8, C('S')); }),
  pelt: direct((d, C) => { d.poly([[3, 2], [13, 2], [14, 7], [12, 14], [4, 14], [2, 7]], C('B')); d.disc(5, 3.5, 3, C('S')); d.disc(11, 3.5, 3, C('S')); d.rect(4, 2, 8, 3, C('S')); for (const [x0, y0, x1, y1] of [[3, 6, 4, 9], [5, 7, 6, 11], [10, 7, 9, 11], [12, 6, 11, 9], [7, 10, 7, 13], [9, 9, 10, 13]]) d.line(x0, y0, x1, y1, C('c')); for (const [x, y] of [[3, 13], [6, 14], [10, 14], [13, 12]]) d.put(x, y, C('c')); d.rect(7, 4, 2, 9, C('H')); d.put(8, 5, C('G')); d.line(5, 5, 6, 8, C('S')); d.put(11, 8, C('T')); d.put(4, 11, C('T')); d.rect(2, 7, 1, 3, C('c')); d.rect(13, 7, 1, 3, C('c')); }),
  sealskin: direct((d, C) => { body(d, C, 3, 13, 3, 14, C('B')); for (let y = 3; y < 14; y++) for (let x = 3; x < 13; x++) if ((x + (y % 2) * 2) % 4 === 0) d.put(x, y, C('L')); d.poly([[1, 4], [4, 3], [4, 7], [0, 8]], C('N')); d.poly([[15, 4], [12, 3], [12, 7], [16, 8]], C('N')); d.rect(5, 2, 6, 2, C('c')); d.rect(3, 9, 10, 1, C('K')); d.put(8, 9, C('S')); d.rect(4, 13, 8, 1, C('H')); d.put(7, 5, C('S')); d.put(9, 5, C('S')); }),
  courtplate: direct((d, C) => { body(d, C, 4, 12, 3, 14, C('B')); pauld(d, 3, 3, 2.4, C('G')); pauld(d, 13, 3, 2.4, C('G')); d.rect(4, 3, 8, 1, C('G')); d.poly([[6, 5], [10, 5], [10, 11], [8, 13], [6, 11]], C('R')); d.rect(7, 7, 2, 3, C('G')); d.put(8, 8, C('S')); d.rect(4, 11, 8, 1, C('G')); d.rect(5, 12, 6, 2, C('H')); d.line(4, 4, 4, 11, C('H')); d.line(12, 4, 12, 11, C('L')); }),
  hauberk: direct((d, C) => { body(d, C, 3, 13, 3, 14, C('B')); for (let y = 3; y < 14; y++) for (let x = 3; x < 13; x++) if ((x + y) % 2 === 0) d.put(x, y, C('L')); d.rect(2, 3, 2, 6, C('B')); d.rect(12, 3, 2, 6, C('B')); d.rect(1, 3, 3, 2, C('G')); d.rect(12, 3, 3, 2, C('G')); d.rect(3, 9, 10, 1, C('W')); d.rect(10, 9, 3, 3, C('G')); d.put(11, 10, C('O')); d.line(4, 4, 4, 8, C('T')); d.line(5, 2, 5, 3, C('N')); d.rect(6, 2, 4, 1, C('N')); }),
  wardencuir: direct((d, C) => { body(d, C, 4, 12, 3, 13, C('B')); d.poly([[0, 4], [4, 2], [4, 6]], C('S')); d.poly([[16, 4], [12, 2], [12, 6]], C('S')); d.poly([[1, 3], [4, 3], [4, 5]], C('H')); d.poly([[15, 3], [12, 3], [12, 5]], C('H')); d.poly([[6, 5], [10, 5], [10, 9], [8, 11], [6, 9]], C('K')); d.put(8, 7, C('S')); d.line(8, 5, 8, 9, C('S')); d.rect(4, 11, 8, 1, C('L')); for (const x of [4, 6, 8, 10]) d.rect(x, 12, 2, 3, C('B')); d.rect(5, 2, 6, 1, C('H')); }),
  prism: direct((d, C) => { body(d, C, 3, 13, 3, 14, C('B')); for (let y = 3; y < 14; y++) for (let x = 3; x < 13; x++) { const k = (x + y) % 4, k2 = (x - y + 16) % 4; if (k === 0 && k2 === 0) d.put(x, y, C('S')); else if (k === 2 && k2 === 2) d.put(x, y, C('L')); else if (k === 0) d.put(x, y, C('H')); } for (const sx of [2, 14]) { d.poly([[sx - 1, 4], [sx + 1, 4], [sx, 0]], C('S')); d.poly([[sx - 2, 5], [sx, 5], [sx - 1, 2]], C('c')); } d.rect(5, 2, 6, 1, C('S')); d.put(8, 8, C('S')); d.put(7, 7, C('S')); }),
  deepplate: direct((d, C) => { body(d, C, 3, 13, 2, 14, C('K')); body(d, C, 4, 12, 3, 13, C('I')); pauld(d, 3, 3, 2.4, C('K')); pauld(d, 13, 3, 2.4, C('K')); for (const [x0, y0, x1, y1] of [[5, 4, 6, 7], [6, 7, 5, 11], [10, 5, 9, 8], [9, 8, 10, 12]]) d.line(x0, y0, x1, y1, C('B')); d.line(3, 3, 3, 5, C('G')); d.line(13, 3, 13, 5, C('G')); d.rect(4, 11, 8, 1, C('K')); d.disc(8, 8, 1.5, C('G')); d.put(8, 8, C('S')); d.rect(5, 2, 6, 1, C('N')); }),
  tidecoat: direct((d, C) => { d.poly([[4, 2], [12, 2], [14, 6], [14, 15], [2, 15], [2, 6]], C('B')); d.poly([[4, 2], [8, 6], [4, 8]], C('H')); d.poly([[12, 2], [8, 6], [12, 8]], C('L')); d.line(8, 6, 8, 15, C('K')); for (const y of [8, 10, 12, 14]) { d.put(6, y, C('G')); d.put(10, y, C('G')); } d.rect(2, 9, 12, 1, C('K')); d.put(8, 9, C('G')); d.rect(0, 5, 3, 7, C('L')); d.rect(13, 5, 3, 7, C('L')); d.rect(1, 12, 2, 1, C('G')); d.rect(13, 12, 2, 1, C('G')); }),
  seacoat: direct((d, C) => { d.poly([[8, 0], [13, 3], [14, 15], [2, 15], [3, 3]], C('B')); d.poly([[8, 0], [12, 3], [8, 8], [4, 3]], C('L')); d.poly([[7, 2], [9, 2], [9, 5], [7, 5]], C('K')); d.line(5, 8, 5, 15, C('H')); d.line(8, 8, 8, 15, C('L')); d.line(11, 8, 11, 15, C('H')); for (const y of [9, 11, 13]) { d.put(7, y, C('T')); d.put(9, y, C('T')); d.line(7, y, 9, y, C('W')); } d.rect(0, 5, 3, 8, C('B')); d.rect(13, 5, 3, 8, C('B')); d.put(2, 12, C('S')); d.put(13, 12, C('S')); }),
  embermail: direct((d, C) => { body(d, C, 3, 13, 3, 14, C('K')); body(d, C, 4, 12, 4, 13, C('B')); for (let y = 4; y < 13; y++) for (let x = 4; x < 12; x++) if ((x + y) % 2 === 0) d.put(x, y, C('R')); for (const [x0, y0, x1, y1] of [[5, 5, 7, 8], [7, 8, 6, 12], [10, 5, 9, 8], [9, 8, 11, 12]]) d.line(x0, y0, x1, y1, C('G')); for (const sx of [2, 14]) { d.poly([[sx - 1, 5], [sx + 1, 5], [sx, 1]], C('O')); d.poly([[sx, 3], [sx + 1, 3], [sx, 2]], C('G')); } d.disc(8, 8, 1.4, C('G')); d.rect(5, 2, 6, 1, C('O')); d.put(8, 8, C('S')); }),
};
FAMILIES.armor = { direct: true, cells: (shape, col) => ARMOR_SHAPES[shape](shape, col) };


// ------------------------------------------------------------------------------------------------------ charms, rings, crowns
const chain = (d, C, y0 = 1) => { d.line(4, y0, 7, y0 + 3, C('N')); d.line(12, y0, 9, y0 + 3, C('N')); d.put(5, y0, C('S')); d.put(11, y0, C('S')); d.put(8, y0 + 3, C('G')); };
const ringBand = (d, C, c, cx = 8, cy = 9) => { d.ring(cx, cy, 5, c); d.ring(cx, cy, 4.2, c); d.ring(cx, cy, 3.4, C('L')); };
export const CHARM_SHAPES = {
  sun: direct((d, C) => { chain(d, C); d.disc(8, 10, 3.2, C('B'), C('H')); for (let a = 0; a < 360; a += 45) d.put(8 + Math.cos((a * Math.PI) / 180) * 5.2, 10 + Math.sin((a * Math.PI) / 180) * 5.2, C('G')); d.put(8, 10, C('G')); }),
  manaring: direct((d, C) => { d.ring(8, 10, 4.4, C('G')); d.ring(8, 10, 3.6, C('G')); d.disc(8, 4.2, 3, C('B'), C('H')); d.put(7, 3, C('S')); d.put(8, 3, C('S')); d.put(9, 5, C('L')); d.put(6, 5, C('G')); d.put(10, 5, C('G')); d.put(8, 7, C('G')); }),
  bear: direct((d, C) => { chain(d, C); d.disc(8, 10, 4, C('B'), C('H')); d.disc(4.8, 6.4, 1.6, C('B')); d.disc(11.2, 6.4, 1.6, C('B')); d.put(6, 9, C('K')); d.put(10, 9, C('K')); d.rect(7, 11, 2, 2, C('L')); d.put(8, 11, C('K')); }),
  storm: direct((d, C) => { chain(d, C); d.poly([[8, 4], [13, 9], [8, 15], [3, 9]], C('B')); d.poly([[8, 5], [12, 9], [8, 14], [4, 9]], C('K')); d.line(9, 5, 6, 10, C('G')); d.line(6, 10, 10, 10, C('G')); d.line(10, 10, 7, 14, C('G')); }),
  nugget: direct((d, C) => { chain(d, C); d.poly([[5, 7], [9, 6], [12, 8], [12, 12], [8, 14], [4, 12]], C('B')); d.put(7, 8, C('H')); d.put(9, 9, C('H')); d.put(6, 11, C('L')); d.put(10, 12, C('L')); d.line(6, 9, 10, 13, C('W')); d.line(10, 9, 6, 13, C('N')); }),
  claws: direct((d, C) => { d.line(2, 3, 5, 1, C('W')); d.line(5, 1, 11, 1, C('W')); d.line(11, 1, 14, 3, C('W')); for (const [x, h, dx] of [[4, 9, 2], [8, 11, 0], [12, 9, -2]]) { d.poly([[x - 1, 2], [x + 1, 2], [x + 1 + dx * 0.4, 2 + h * 0.6], [x + dx, 2 + h]], C('S')); d.line(x, 3, x + dx * 0.5, 2 + h * 0.6, C('c')); d.put(x, 2, C('G')); } d.put(8, 1, C('G')); }),
  brooch: direct((d, C) => { d.disc(8, 8, 5.4, C('G')); d.disc(8, 8, 4, C('K')); d.poly([[8, 4], [10, 8], [9, 12], [7, 12], [6, 8]], C('O')); d.poly([[8, 6], [9, 9], [8, 11], [7, 9]], C('G')); d.put(8, 9, C('S')); d.line(2, 8, 3, 8, C('N')); }),
  wave: direct((d, C) => { chain(d, C); d.disc(8, 10, 4.5, C('B'), C('H')); d.disc(8, 10, 3.2, C('K')); d.line(5, 10, 6, 9, C('S')); d.line(6, 9, 8, 11, C('S')); d.line(8, 11, 10, 9, C('S')); d.line(10, 9, 11, 10, C('S')); d.put(8, 13, C('c')); }),
  courtring: direct((d, C) => { d.ring(8, 10, 4.6, C('N')); d.ring(8, 10, 3.8, C('N')); d.rect(5, 1, 6, 6, C('N')); d.rect(6, 2, 4, 4, C('K')); d.poly([[7, 3], [9, 3], [9, 4], [10, 5], [6, 5], [7, 4]], C('B')); for (const [x, y] of [[5, 1], [10, 1], [5, 6], [10, 6]]) d.put(x, y, C('G')); }),
  bogfire: direct((d, C) => { d.ring(8, 11, 4, C('E')); d.ring(8, 11, 3.2, C('M')); for (const [x, y] of [[4, 9], [6, 14], [11, 14], [12, 9]]) d.put(x, y, C('E')); d.poly([[8, 0], [11, 3], [10, 7], [8, 8], [6, 7], [5, 3]], C('E')); d.poly([[8, 2], [10, 4], [9, 7], [8, 7], [7, 5]], C('G')); d.put(8, 5, C('S')); d.put(3, 4, C('E')); d.put(13, 5, C('G')); }),
  glass: direct((d, C) => { chain(d, C); d.poly([[8, 5], [11, 9], [11, 12], [8, 15], [5, 12], [5, 9]], C('B')); d.poly([[8, 6], [10, 9], [10, 12], [8, 14], [6, 12], [6, 9]], C('c')); d.line(7, 8, 7, 12, C('S')); d.put(9, 10, C('G')); d.put(10, 8, C('G')); }),
  knot: direct((d, C) => { d.disc(8, 8, 6, C('B'), C('H')); d.disc(8, 8, 4.2, C('K')); d.poly([[8, 5], [11, 8], [8, 11], [5, 8]], C('R')); d.line(4, 4, 12, 12, C('G')); d.line(12, 4, 4, 12, C('G')); d.put(8, 8, C('S')); }),
  fang: direct((d, C) => { d.poly([[5, 2], [11, 2], [10, 8], [8, 15], [6, 8]], C('S')); d.poly([[6, 3], [8, 3], [8, 12], [7, 8]], C('c')); d.rect(5, 3, 6, 2, C('G')); d.rect(5, 6, 6, 1, C('G')); d.put(8, 3, C('K')); d.put(9, 8, C('N')); }),
  signet: direct((d, C) => { d.ring(8, 10, 4.2, C('G')); d.ring(8, 10, 3.4, C('G')); d.rect(3, 2, 10, 6, C('G')); d.rect(4, 3, 8, 4, C('B')); d.poly([[5, 6], [5, 4], [6.5, 5], [8, 3.5], [9.5, 5], [11, 4], [11, 6]], C('G')); d.put(8, 3, C('S')); d.rect(3, 2, 10, 1, C('S')); }),
  embercrown: direct((d, C) => { d.rect(2, 9, 12, 4, C('G')); for (const [x, h] of [[2, 4], [5, 6], [8, 8], [11, 6], [13, 4]]) d.poly([[x - 1, 9], [x + 1, 9], [x, 9 - h]], C('O')); d.rect(2, 9, 12, 1, C('S')); d.put(5, 11, C('R')); d.put(8, 11, C('R')); d.put(11, 11, C('R')); d.put(8, 3, C('R')); d.put(8, 2, C('G')); d.rect(2, 12, 12, 1, C('L')); }),
  squaresignet: direct((d, C) => { ringBand(d, C, C('B')); d.rect(4, 1, 8, 5, C('G')); d.rect(5, 2, 6, 3, C('K')); d.line(5, 4, 10, 4, C('G')); d.line(7, 2, 7, 4, C('G')); d.line(9, 2, 9, 4, C('G')); d.rect(4, 1, 8, 1, C('S')); }),
  miner: direct((d, C) => { d.line(3, 3, 13, 13, C('W')); d.poly([[10, 3], [14, 5], [13, 8], [10, 6]], C('N')); d.disc(5, 10, 3, C('B'), C('H')); d.put(5, 10, C('S')); d.put(4, 9, C('S')); d.put(6, 12, C('L')); d.rect(2, 13, 4, 1, C('G')); }),
  badge: direct((d, C) => { d.poly([[2, 3], [8, 1], [14, 3], [14, 9], [11, 13], [8, 15], [5, 13], [2, 9]], C('B')); d.poly([[4, 4], [8, 3], [12, 4], [12, 8], [8, 13], [4, 8]], C('K')); d.line(8, 4, 8, 11, C('S')); d.line(5, 6, 11, 6, C('S')); d.put(0, 2, C('S')); d.put(15, 2, C('S')); d.put(1, 3, C('S')); d.put(14, 3, C('S')); }),
  antlers: direct((d, C) => { d.rect(4, 10, 8, 3, C('K')); d.rect(4, 10, 8, 1, C('B')); for (const sx of [-1, 1]) { const x = 8 + sx * 3; d.line(x, 10, x + sx * 1, 3, C('S')); d.line(x + sx * 0.5, 7, x + sx * 3, 5, C('S')); d.line(x + sx * 0.8, 5, x + sx * 2, 2, C('S')); d.line(x + sx * 1, 3, x + sx * 1, 1, C('c')); d.put(x, 8, C('c')); } d.put(8, 11, C('S')); d.put(8, 12, C('C')); }),
  lamp: direct((d, C) => { d.rect(6, 1, 4, 2, C('N')); d.line(8, 0, 8, 1, C('N')); d.poly([[5, 3], [11, 3], [12, 12], [4, 12]], C('G')); d.poly([[6, 4], [10, 4], [11, 11], [5, 11]], C('K')); d.poly([[8, 5], [10, 9], [8, 11], [6, 9]], C('O')); d.put(8, 8, C('S')); d.rect(4, 12, 8, 2, C('N')); d.put(3, 5, C('N')); d.put(12, 5, C('N')); }),
  anchor: direct((d, C) => { d.disc(8, 8, 6, C('B'), C('H')); d.disc(8, 8, 4.6, C('K')); d.line(8, 4, 8, 12, C('S')); d.ring(8, 4, 1, C('S')); d.line(6, 6, 10, 6, C('S')); d.line(5, 10, 8, 12, C('S')); d.line(11, 10, 8, 12, C('S')); d.put(5, 9, C('S')); d.put(11, 9, C('S')); }),
  clover: direct((d, C) => { d.disc(5.5, 5.5, 2.6, C('B'), C('H')); d.disc(10.5, 5.5, 2.6, C('B')); d.disc(5.5, 10.5, 2.6, C('B')); d.disc(10.5, 10.5, 2.6, C('B'), C('H')); d.rect(7, 7, 2, 2, C('G')); d.line(8, 11, 11, 15, C('E')); for (const [x, y] of [[5, 4], [10, 4], [5, 10]]) d.put(x, y, C('H')); d.put(8, 8, C('S')); }),
  collar: direct((d, C) => { d.ring(8, 6, 6, C('W')); d.ring(8, 6, 5.2, C('W')); for (let a = 20; a < 180; a += 28) d.put(8 + Math.cos((a * Math.PI) / 180) * 5.6, 6 + Math.sin((a * Math.PI) / 180) * 5.6, C('S')); d.rect(6, 12, 4, 3, C('B')); d.put(7, 13, C('S')); d.put(8, 12, C('K')); d.rect(7, 11, 2, 1, C('N')); }),
  banner: direct((d, C) => { d.line(3, 1, 3, 15, C('N')); d.put(3, 0, C('G')); d.poly([[4, 2], [14, 2], [14, 8], [12, 7], [10, 8], [8, 7], [6, 8], [4, 7]], C('B')); d.rect(4, 2, 10, 1, C('H')); d.poly([[7, 3], [11, 3], [9, 6]], C('K')); d.put(9, 4, C('G')); }),
  hollow: direct((d, C) => { d.rect(2, 9, 12, 4, C('B')); for (const [x, h] of [[3, 5], [6, 4], [9, 6], [12, 3]]) d.poly([[x - 1, 9], [x + 1, 9], [x, 9 - h]], C('B')); d.rect(2, 9, 12, 1, C('H')); d.rect(2, 12, 12, 1, C('L')); d.put(5, 10, C('K')); d.put(6, 10, C('K')); d.put(10, 11, C('K')); d.put(8, 6, C('K')); d.put(7, 5, C('K')); d.put(4, 11, C('P')); d.put(11, 10, C('P')); d.put(8, 11, C('P')); }),
};
FAMILIES.charm = { direct: true, cells: (shape, col) => CHARM_SHAPES[shape](shape, col) };


// ------------------------------------------------------------------------------------------------------ helmets
const dome = (d, C, y0 = 2, y1 = 11, c = 'B') => { d.poly([[5, y0], [11, y0], [13, y0 + 3], [13, y1], [3, y1], [3, y0 + 3]], C(c)); d.rect(5, y0, 4, 1, C('H')); d.rect(12, y0 + 3, 1, y1 - y0 - 2, C('L')); };
const rim = (d, C, c, y = 10) => { d.rect(3, y, 10, 1, C(c)); d.put(3, y, C('H')); };
export const HELM_SHAPES = {
  cap: direct((d, C) => { dome(d, C, 3, 11); d.line(8, 3, 8, 9, C('L')); d.rect(3, 9, 10, 2, C('T')); d.rect(2, 10, 2, 4, C('B')); d.rect(12, 10, 2, 4, C('B')); d.put(3, 13, C('L')); d.put(12, 13, C('L')); for (const x of [4, 6, 10, 12]) d.put(x, 9, C('W')); d.put(6, 4, C('H')); }),
  nasal: direct((d, C) => { dome(d, C, 2, 12); rim(d, C, 'L', 6); d.rect(7, 6, 2, 6, C('H')); d.put(7, 12, C('L')); d.put(5, 4, C('H')); d.put(4, 6, C('S')); d.put(11, 6, C('S')); d.rect(3, 11, 3, 2, C('L')); d.rect(10, 11, 3, 2, C('L')); }),
  nordic: direct((d, C) => { dome(d, C, 3, 12); rim(d, C, 'G', 7); d.rect(7, 7, 2, 5, C('H')); for (const sx of [-1, 1]) { const x = sx < 0 ? 3 : 12; d.line(x, 6, x + sx * 2, 4, C('S')); d.line(x + sx * 2, 4, x + sx * 2, 1, C('S')); d.line(x + sx * 2, 1, x + sx, 0, C('c')); d.put(x + sx, 5, C('S')); } d.put(5, 5, C('S')); d.put(10, 5, C('S')); d.rect(3, 11, 3, 2, C('L')); d.rect(10, 11, 3, 2, C('L')); }),
  hood: direct((d, C) => { d.poly([[8, 1], [12, 5], [13, 12], [3, 12], [4, 5]], C('B')); d.poly([[8, 1], [11, 5], [8, 6], [5, 5]], C('H')); d.ell(8, 8, 3, 3.2, C('K')); d.put(7, 7, C('T')); d.put(9, 7, C('T')); d.rect(6, 10, 4, 1, C('T')); d.rect(2, 11, 12, 3, C('L')); d.rect(3, 11, 10, 1, C('B')); d.put(8, 12, C('G')); d.put(8, 13, C('G')); }),
  circlet: direct((d, C) => { d.rect(2, 8, 12, 3, C('B')); d.rect(2, 8, 12, 1, C('H')); d.rect(2, 10, 12, 1, C('L')); d.poly([[6, 8], [10, 8], [8, 3]], C('B')); d.poly([[2, 8], [4, 8], [3, 5]], C('B')); d.poly([[12, 8], [14, 8], [13, 5]], C('B')); d.disc(8, 8, 1.4, C('P'), C('S')); d.put(8, 6, C('S')); for (const x of [4, 12]) d.put(x, 10, C('G')); d.put(8, 3, C('S')); }),
  great: direct((d, C) => { d.rect(3, 2, 10, 12, C('B')); d.rect(4, 1, 8, 2, C('B')); d.rect(3, 2, 10, 1, C('H')); d.rect(12, 3, 1, 11, C('L')); d.rect(4, 7, 8, 2, C('K')); d.rect(7, 3, 2, 11, C('H')); d.rect(7, 7, 2, 2, C('K')); for (const y of [10, 12]) { d.put(5, y, C('K')); d.put(10, y, C('K')); } d.rect(3, 6, 10, 1, C('L')); d.rect(4, 13, 8, 1, C('L')); d.put(4, 4, C('S')); d.put(11, 4, C('S')); d.rect(3, 14, 10, 1, C('K')); }),
  scale: direct((d, C) => { dome(d, C, 3, 12); for (let y = 4; y < 12; y++) for (let x = 4; x < 12; x++) if ((x + y * 2) % 4 === 0) d.put(x, y, C('H')); for (let y = 4; y < 12; y++) for (let x = 4; x < 12; x++) if ((x + y * 2) % 4 === 2) d.put(x, y, C('L')); d.poly([[6, 3], [10, 3], [8, 0]], C('G')); d.poly([[3, 6], [5, 6], [1, 2]], C('G')); d.poly([[11, 6], [13, 6], [15, 2]], C('G')); d.rect(5, 8, 6, 2, C('K')); d.put(6, 9, C('O')); d.put(9, 9, C('O')); d.rect(7, 10, 2, 3, C('L')); }),
  warden: direct((d, C) => { dome(d, C, 3, 11); rim(d, C, 'S', 5); d.rect(7, 5, 2, 7, C('H')); d.rect(3, 6, 3, 6, C('L')); d.rect(10, 6, 3, 6, C('L')); d.rect(3, 6, 3, 1, C('H')); d.rect(10, 6, 3, 1, C('H')); d.rect(6, 6, 4, 2, C('K')); d.poly([[7, 3], [9, 3], [11, 0], [10, 2]], C('C')); d.line(8, 3, 8, 0, C('C')); d.put(9, 0, C('c')); d.put(8, 12, C('S')); }),
  skull: direct((d, C) => { d.poly([[3, 7], [5, 1], [11, 1], [13, 7], [12, 13], [4, 13]], C('T')); d.rect(4, 1, 8, 1, C('c')); d.poly([[5, 3], [11, 3], [12, 7], [4, 7]], C('S')); d.rect(4, 5, 3, 3, C('K')); d.rect(9, 5, 3, 3, C('K')); d.put(5, 6, C('R')); d.put(10, 6, C('R')); d.poly([[7, 8], [9, 8], [8, 10]], C('K')); d.rect(5, 10, 6, 2, C('S')); for (const x of [5, 7, 9]) d.put(x, 11, C('K')); d.put(3, 2, C('S')); d.put(2, 1, C('S')); d.put(12, 2, C('S')); d.put(13, 1, C('S')); d.put(4, 12, C('T')); d.put(11, 12, C('T')); }),
  court: direct((d, C) => { d.rect(3, 4, 10, 10, C('B')); d.rect(4, 3, 8, 2, C('B')); d.rect(3, 4, 10, 1, C('H')); d.rect(12, 5, 1, 9, C('L')); d.rect(3, 4, 10, 2, C('G')); for (const x of [3, 5, 7, 9, 11]) d.poly([[x, 4], [x + 2, 4], [x + 1, 0]], C('G')); d.put(8, 1, C('R')); d.rect(4, 8, 8, 2, C('K')); d.rect(7, 4, 2, 9, C('H')); d.rect(7, 8, 2, 2, C('K')); d.rect(3, 13, 10, 1, C('G')); d.put(5, 12, C('S')); d.put(10, 12, C('S')); }),
  deep: direct((d, C) => { dome(d, C, 3, 12, 'K'); d.rect(3, 9, 10, 2, C('B')); d.rect(3, 9, 10, 1, C('H')); d.rect(4, 12, 3, 2, C('K')); d.rect(9, 12, 3, 2, C('K')); d.rect(6, 1, 4, 4, C('G')); d.rect(7, 2, 2, 2, C('K')); d.put(8, 3, C('O')); d.put(8, 2, C('S')); d.rect(6, 0, 4, 1, C('N')); d.rect(4, 5, 1, 4, C('B')); d.rect(11, 5, 1, 4, C('B')); d.put(8, 8, C('G')); }),
  tide: direct((d, C) => { d.ell(8, 8, 6, 4.4, C('B')); d.rect(2, 8, 12, 3, C('L')); d.rect(1, 10, 14, 2, C('K')); d.rect(1, 10, 14, 1, C('B')); d.poly([[5, 4], [11, 4], [10, 2], [6, 2]], C('B')); d.rect(5, 2, 4, 1, C('H')); d.rect(2, 8, 12, 1, C('N')); d.disc(8, 6, 1.5, C('G')); d.put(8, 5, C('S')); d.line(8, 6, 8, 8, C('S')); d.put(7, 8, C('S')); d.put(9, 8, C('S')); }),
  ember: direct((d, C) => { dome(d, C, 4, 12, 'K'); d.rect(3, 6, 10, 1, C('B')); d.rect(7, 6, 2, 6, C('B')); d.rect(5, 8, 2, 1, C('O')); d.rect(9, 8, 2, 1, C('O')); d.put(6, 8, C('G')); d.put(9, 8, C('G')); d.poly([[5, 4], [11, 4], [10, 1], [8, 3], [6, 0]], C('R')); d.poly([[6, 4], [10, 4], [9, 2], [8, 3], [7, 1]], C('O')); d.put(8, 3, C('G')); d.rect(3, 11, 3, 2, C('L')); d.rect(10, 11, 3, 2, C('L')); d.put(4, 5, C('R')); d.put(11, 5, C('R')); }),
  rime: direct((d, C) => { dome(d, C, 4, 12); d.rect(3, 6, 10, 1, C('S')); d.rect(7, 6, 2, 6, C('H')); d.rect(5, 8, 2, 1, C('K')); d.rect(9, 8, 2, 1, C('K')); for (const [x, h] of [[4, 4], [6, 6], [8, 7], [10, 6], [12, 4]]) d.poly([[x - 1, 4], [x + 1, 4], [x, 4 - h + (h > 5 ? 0 : 1)]], C('S')); d.put(8, 0, C('c')); for (const [x, y] of [[5, 11], [10, 11], [4, 5], [12, 5]]) d.put(x, y, C('S')); d.put(6, 5, C('H')); d.put(10, 9, C('H')); }),
  prism: direct((d, C) => { d.poly([[8, 1], [12, 4], [13, 11], [3, 11], [4, 4]], C('B')); d.poly([[8, 1], [8, 11], [3, 11], [4, 4]], C('H')); d.poly([[8, 1], [12, 4], [13, 11], [8, 11]], C('L')); d.line(8, 1, 8, 11, C('S')); d.line(4, 4, 12, 4, C('S')); d.rect(5, 7, 6, 2, C('K')); d.put(6, 7, C('c')); d.put(9, 7, C('c')); for (const sx of [3, 13]) d.poly([[sx - 1, 7], [sx + 1, 7], [sx, 2]], C('S')); d.rect(3, 11, 10, 2, C('L')); d.put(8, 0, C('S')); }),
  pelt: direct((d, C) => { d.poly([[3, 6], [4, 3], [12, 3], [13, 6], [13, 13], [3, 13]], C('B')); d.poly([[3, 3], [6, 0], [7, 4]], C('B')); d.poly([[13, 3], [10, 0], [9, 4]], C('B')); d.poly([[4, 3], [6, 1], [6, 4]], C('K')); d.poly([[12, 3], [10, 1], [10, 4]], C('K')); d.rect(4, 6, 8, 3, C('H')); d.rect(5, 7, 2, 1, C('K')); d.rect(9, 7, 2, 1, C('K')); d.put(5, 7, C('O')); d.put(10, 7, C('O')); d.rect(6, 9, 4, 3, C('T')); d.rect(7, 9, 2, 1, C('K')); for (const [x, y] of [[3, 12], [5, 13], [11, 13], [13, 11], [3, 8], [13, 8]]) d.put(x, y, C('L')); }),
};
FAMILIES.helm = { direct: true, cells: (shape, col) => HELM_SHAPES[shape](shape, col) };

const split = (kind) => { const i = kind.indexOf('_'); return [kind.slice(0, i), kind.slice(i + 1)]; };
export const isGearKind = (kind) => { const [f] = split(kind); return !!FAMILIES[f]; };
export function drawGearIcon(g, kind, col) { const [f, s] = split(kind); if (FAMILIES[f].direct) iconXY(g, FAMILIES[f].cells(s, col)); else iconFromCells(g, FAMILIES[f].cells(s, col)); }
export function gearHeldSize(kind) { const [f, s] = split(kind); const F = FAMILIES[f]; return F.heldSize || (F.held ? F.held(s) : null); }
export function drawGearHeld(g, kind, col) { const [f, s] = split(kind), F = FAMILIES[f]; if (F.heldFn) { F.heldFn(g, F.cells(s, col)); return; } const z = F.held(s); heldFromCells(g, FAMILIES[f].cells(s, col), z.W, z.H, z.cy, z.ox); }
