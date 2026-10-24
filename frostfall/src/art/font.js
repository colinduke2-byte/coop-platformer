// A hand-drawn 5x7 pixel font, baked into one bitmap-font texture per palette
// colour (so text is always crisp and palette-pure; no browser fonts involved).
import Phaser from 'phaser';
import { PAL } from '../config.js';
import { settings } from '../systems/settings.js';

export const G = {        // the glyphs, exported for the title logo (art/scenery.js)
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  3: ['.###.', '#...#', '....#', '..##.', '....#', '#...#', '.###.'],
  4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  6: ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  9: ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '.##..', '..#..', '.#...'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  "'": ['..#..', '..#..', '.#...', '.....', '.....', '.....', '.....'],
  '"': ['.#.#.', '.#.#.', '.....', '.....', '.....', '.....', '.....'],
  '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  ':': ['.....', '..#..', '..#..', '.....', '..#..', '..#..', '.....'],
  ';': ['.....', '..#..', '..#..', '.....', '..#..', '..#..', '.#...'],
  '/': ['....#', '...#.', '...#.', '..#..', '.#...', '.#...', '#....'],
  '(': ['...#.', '..#..', '.#...', '.#...', '.#...', '..#..', '...#.'],
  ')': ['.#...', '..#..', '...#.', '...#.', '...#.', '..#..', '.#...'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  '%': ['##..#', '##..#', '...#.', '..#..', '.#...', '#..##', '#..##'],
  '<': ['...#.', '..#..', '.#...', '#....', '.#...', '..#..', '...#.'],
  '>': ['.#...', '..#..', '...#.', '....#', '...#.', '..#..', '.#...'],
  '=': ['.....', '.....', '#####', '.....', '#####', '.....', '.....'],
  '*': ['.....', '#.#.#', '.###.', '#####', '.###.', '#.#.#', '.....'],
  '_': ['.....', '.....', '.....', '.....', '.....', '.....', '#####'],
  '#': ['.#.#.', '#####', '.#.#.', '.#.#.', '#####', '.#.#.', '.....'],
  '&': ['.##..', '#..#.', '#.#..', '.#...', '#.#.#', '#..#.', '.##.#'],
  '[': ['.###.', '.#...', '.#...', '.#...', '.#...', '.#...', '.###.'],
  ']': ['.###.', '...#.', '...#.', '...#.', '...#.', '...#.', '.###.'],
  // Special glyphs (use the unicode names below in strings).
  '♥': ['.#.#.', '#####', '#####', '#####', '.###.', '..#..', '.....'], // heart
  '▶': ['.#...', '.##..', '.###.', '.####', '.###.', '.##..', '.#...'], // cursor
  '•': ['.....', '.....', '.##..', '.##..', '.....', '.....', '.....'], // bullet
  '…': ['.....', '.....', '.....', '.....', '.....', '.....', '#.#.#'], // ellipsis (cut text)
  '▲': ['.....', '..#..', '.###.', '#####', '.....', '.....', '.....'], // more above
  '▼': ['.....', '.....', '.....', '#####', '.###.', '..#..', '.....'], // more below
  '✓': ['.....', '....#', '...##', '#.##.', '###..', '.#...', '.....'], // done / have enough
  '◆': ['.....', '..#..', '.###.', '#####', '.###.', '..#..', '.....'], // quest marker
  '■': ['.....', '.###.', '.###.', '.###.', '.....', '.....', '.....'], // small square
};

const CHARS = ' ' + Object.keys(G).join('');
const CW = 6;
const CH = 8;
const PER_ROW = 16;

// High contrast lifts the dim greys one step everywhere (3 -> 4, 4 -> 5), so hints, locked rows and labels stay readable.
let contrast = false;
export const setContrast = (on) => { contrast = !!on; };
export const fontKey = (col) => 'f' + (contrast && (col === 3 || col === 4) ? col + 1 : col);
// A1: LARGE TEXT draws the important HUD text (hints, toasts, dialogue, spoken lines) and the menu help line with the same
// glyphs at twice the size: 12x16 px per character, so a line holds 26 characters instead of 53.
export const bigKey = (col) => 'g' + (contrast && (col === 3 || col === 4) ? col + 1 : col);
export const largeText = () => !!settings.largeText;
export const BIG_W = 12, BIG_H = 16;

// Build font textures for all 16 palette colours.
export function buildFonts(scene) {
  for (let col = 0; col < 16; col++) {
    const rows = Math.ceil(CHARS.length / PER_ROW);
    const cv = document.createElement('canvas');
    cv.width = PER_ROW * CW;
    cv.height = rows * CH;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = PAL[col];
    [...CHARS].forEach((ch, i) => {
      const g = G[ch];
      if (!g) return;
      const ox = (i % PER_ROW) * CW;
      const oy = Math.floor(i / PER_ROW) * CH;
      for (let y = 0; y < 7; y++) for (let x = 0; x < 5; x++) if (g[y][x] === '#') ctx.fillRect(ox + x, oy + y, 1, 1);
    });
    const key = 'f' + col;        // the raw colour (not fontKey: with high contrast on at boot that would skip a colour)
    scene.textures.addCanvas(key, cv);
    const data = Phaser.GameObjects.RetroFont.Parse(scene, {
      image: key, width: CW, height: CH, chars: CHARS, charsPerRow: PER_ROW,
      spacing: { x: 0, y: 0 }, lineSpacing: 0, offset: { x: 0, y: 0 },
    });
    scene.cache.bitmapFont.add(key, data);
    // the 2x copy for LARGE TEXT
    const cv2 = document.createElement('canvas');
    cv2.width = PER_ROW * CW * 2;
    cv2.height = rows * CH * 2;
    const c2 = cv2.getContext('2d');
    c2.imageSmoothingEnabled = false;
    c2.drawImage(cv, 0, 0, cv2.width, cv2.height);
    const key2 = 'g' + col;
    scene.textures.addCanvas(key2, cv2);
    scene.cache.bitmapFont.add(key2, Phaser.GameObjects.RetroFont.Parse(scene, {
      image: key2, width: CW * 2, height: CH * 2, chars: CHARS, charsPerRow: PER_ROW,
      spacing: { x: 0, y: 0 }, lineSpacing: 0, offset: { x: 0, y: 0 },
    }));
  }
}

export const normText = (s) =>
  String(s).toUpperCase().replace(/’/g, "'").replace(/[^\x20-\x7E♥▶•…▲▼✓◆■\n]/g, '?');
// Cut text to n characters, marking the cut with an ellipsis so it never looks like a whole word.
export const fit = (s, n) => { s = String(s ?? ''); return s.length <= n ? s : s.slice(0, Math.max(1, n - 1)).trimEnd() + '…'; };

// Create a crisp pixel-font text object. col = palette index.
export function txt(scene, x, y, str, col = 6) {
  const t = scene.add.bitmapText(x, y, fontKey(col), normText(str));
  t.setOrigin(0, 0);
  const raw = t.setText.bind(t);
  t._raw = str;
  t.setText = (v) => { if (v === t._raw) return t; t._raw = v; return raw(normText(v)); }; // always upper-case / sanitise (skipped when unchanged)
  return t;
}
// Text with a 1px dark drop shadow (returns a small container-like helper).
export function txtS(scene, x, y, str, col = 6, shadow = 0) {
  const sh = scene.add.bitmapText(x + 1, y + 1, fontKey(shadow), normText(str)).setOrigin(0, 0);
  const t = scene.add.bitmapText(x, y, fontKey(col), normText(str)).setOrigin(0, 0);
  const o = {
    shadow: sh, main: t,
    setText(s) { sh.setText(normText(s)); t.setText(normText(s)); return o; },
    setPosition(px, py) { sh.setPosition(px + 1, py + 1); t.setPosition(px, py); return o; },
    setDepth(d) { sh.setDepth(d); t.setDepth(d + 0.01); return o; },
    setScrollFactor(f) { sh.setScrollFactor(f); t.setScrollFactor(f); return o; },
    setAlpha(a) { sh.setAlpha(a); t.setAlpha(a); return o; },
    setVisible(v) { sh.setVisible(v); t.setVisible(v); return o; },
    setOrigin(ox, oy) { sh.setOrigin(ox, oy); t.setOrigin(ox, oy); return o; },
    get width() { return t.width; },
    get x() { return t.x; }, get y() { return t.y; },
    destroy() { sh.destroy(); t.destroy(); },
  };
  return o;
}

// Greedy word-wrap to maxChars per line (5x7 font => 6px per char).
export function wrap(str, maxChars) {
  const out = [];
  for (const para of String(str).split('\n')) {
    let line = '';
    for (const w of para.split(' ')) {
      if (line && (line + ' ' + w).length > maxChars) { out.push(line); line = w; }
      else line = line ? line + ' ' + w : w;
    }
    out.push(line);
  }
  return out.join('\n');
}
export const textW = (s) => String(s).length * CW;
// The width / line height of text in the font chosen for it (big = the LARGE TEXT font).
export const textWB = (s, big) => String(s).length * (big ? BIG_W : CW);
// Create a pixel-font text in the large font when LARGE TEXT is on (else exactly txt()).
export function txtL(scene, x, y, str, col = 6) {
  const t = txt(scene, x, y, str, col);
  if (largeText()) t.setFont(bigKey(col), BIG_W);
  return t;
}
