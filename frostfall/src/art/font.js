// A hand-drawn 5x7 pixel font, baked into one bitmap-font texture per palette
// colour (so text is always crisp and palette-pure; no browser fonts involved).
import Phaser from 'phaser';
import { PAL } from '../config.js';

const G = {
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
  '[': ['.###.', '.#...', '.#...', '.#...', '.#...', '.#...', '.###.'],
  ']': ['.###.', '...#.', '...#.', '...#.', '...#.', '...#.', '.###.'],
  // Special glyphs (use the unicode names below in strings).
  '♥': ['.#.#.', '#####', '#####', '#####', '.###.', '..#..', '.....'], // heart
  '▶': ['.#...', '.##..', '.###.', '.####', '.###.', '.##..', '.#...'], // cursor
  '•': ['.....', '.....', '.##..', '.##..', '.....', '.....', '.....'], // bullet
};

const CHARS = ' ' + Object.keys(G).join('');
const CW = 6;
const CH = 8;
const PER_ROW = 16;

export const fontKey = (col) => 'f' + col;

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
    const key = fontKey(col);
    scene.textures.addCanvas(key, cv);
    const data = Phaser.GameObjects.RetroFont.Parse(scene, {
      image: key, width: CW, height: CH, chars: CHARS, charsPerRow: PER_ROW,
      spacing: { x: 0, y: 0 }, lineSpacing: 0, offset: { x: 0, y: 0 },
    });
    scene.cache.bitmapFont.add(key, data);
  }
}

export const normText = (s) =>
  String(s).toUpperCase().replace(/’/g, "'").replace(/[^\x20-\x7E♥▶•\n]/g, '?');

// Create a crisp pixel-font text object. col = palette index.
export function txt(scene, x, y, str, col = 6) {
  const t = scene.add.bitmapText(x, y, fontKey(col), normText(str));
  t.setOrigin(0, 0);
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
