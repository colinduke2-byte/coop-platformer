// Frostfall app icons, drawn in code: a 24x24 pixel-art snowflake on dark navy, scaled up with nearest neighbour and written as
// PNG with nothing but node:zlib. The flake sits inside the central 80% so the icons also work as "maskable" (Android crops).
//   node tools/icons.mjs <dir>      writes icon-192.png, icon-512.png, apple-touch-icon.png into <dir>
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';

const GRID = 24;
const NAVY = [0x0b, 0x0e, 0x1a], PANEL = [0x1c, 0x23, 0x38], ICE = [0xea, 0xf2, 0xf8], FROST = [0x7f, 0xc8, 0xf0], GOLD = [0xf4, 0xd4, 0x60];

// Paletted 24x24 picture: 0 navy, 1 panel ring, 2 ice, 3 frost-blue tips, 4 gold heart.
function picture() {
  const g = Array.from({ length: GRID }, () => new Array(GRID).fill(0));
  const c = 12;                                    // the flake is centred on pixel (12,12) of a 25-wide virtual grid, clipped to 24
  const put = (x, y, v) => { if (x >= 0 && y >= 0 && x < GRID && y < GRID && g[y][x] < v) g[y][x] = v; };
  // soft round panel behind the flake
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) if ((x - c + 0.5) ** 2 + (y - c + 0.5) ** 2 < 10.6 ** 2) g[y][x] = 1;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  for (const [dx, dy] of dirs) {
    const axis = dx === 0 || dy === 0, len = axis ? 8 : 6;
    for (let t = 1; t <= len; t++) put(c + dx * t, c + dy * t, t === len ? 3 : 2);
    // a V-shaped branch on every arm, pointing outwards
    const at = axis ? 4 : 3, px = -dy, py = dx;
    for (let k = 1; k <= 2; k++) {
      put(c + dx * (at + k) + px * k, c + dy * (at + k) + py * k, 2);
      put(c + dx * (at + k) - px * k, c + dy * (at + k) - py * k, 2);
    }
  }
  for (const [x, y] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) put(c + x, c + y, 4);
  return g;
}

const COLORS = [NAVY, PANEL, ICE, FROST, GOLD];

const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

// size x size RGB PNG: the picture at the largest whole-number scale that fits, centred, the border filled with navy.
export function iconPng(size) {
  const g = picture(), scale = Math.max(1, Math.floor(size / GRID)), off = Math.floor((size - GRID * scale) / 2);
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    const row = y * (size * 3 + 1); raw[row] = 0;          // filter: none
    for (let x = 0; x < size; x++) {
      const gx = Math.floor((x - off) / scale), gy = Math.floor((y - off) / scale);
      const col = gx >= 0 && gy >= 0 && gx < GRID && gy < GRID ? COLORS[g[gy][gx]] : NAVY;
      raw.set(col, row + 1 + x * 3);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2;  // 8-bit RGB
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

export const ICONS = [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]];

// Small PNG for the <link rel="icon"> data URI in the single-file page.
export const faviconDataUri = () => 'data:image/png;base64,' + iconPng(48).toString('base64');

export function writeIcons(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return ICONS.map(([name, size]) => { const f = path.join(dir, name); fs.writeFileSync(f, iconPng(size)); return f; });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const f of writeIcons(process.argv[2] || '.')) console.log('wrote', f);
}
