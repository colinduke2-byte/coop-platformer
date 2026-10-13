// Contact sheets for the art audit: every tile (with its id) and every creature model, each at 4x.
//   node test/contact.mjs  -> test/out/contact_tiles.png, test/out/contact_creatures.png
import { launch } from './harness.mjs';
import fs from 'node:fs';
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=424242');
await h.sleep(1200);
const out = await h.ev(async () => {
  const { TILE } = await import('/src/config.js');
  const names = Object.fromEntries(Object.entries(TILE).map(([k, v]) => [v, k]));
  const tex = window.__ff.game.textures.get('tiles').getSourceImage();
  const n = tex.width / 16, cols = 10, S = 4, cw = 16 * S + 8, ch = 16 * S + 18;
  const cv = document.createElement('canvas'); cv.width = cols * cw; cv.height = Math.ceil(n / cols) * ch;
  const c = cv.getContext('2d'); c.imageSmoothingEnabled = false; c.fillStyle = '#20242e'; c.fillRect(0, 0, cv.width, cv.height);
  c.font = '9px monospace'; c.fillStyle = '#e0e0e0';
  for (let i = 0; i < n; i++) { const x = (i % cols) * cw + 4, y = Math.floor(i / cols) * ch + 2; c.drawImage(tex, i * 16, 0, 16, 16, x, y, 16 * S, 16 * S); c.fillText(`${i} ${(names[i] || '?').slice(0, 10)}`, x, y + 16 * S + 11); }
  const tiles = cv.toDataURL('image/png');
  // creatures: the first frame of every enemy texture, at its in-game scale
  const { ENEMIES } = await import('/src/data/enemies.js');
  await import('/src/data/enemies4.js');
  const tm = window.__ff.game.textures, kinds = Object.keys(ENEMIES);
  const cc = 12, cs = 3, cell = 72, cv2 = document.createElement('canvas'); cv2.width = cc * cell; cv2.height = Math.ceil(kinds.length / cc) * (cell + 12);
  const d = cv2.getContext('2d'); d.imageSmoothingEnabled = false; d.fillStyle = '#3a4a3a'; d.fillRect(0, 0, cv2.width, cv2.height); d.font = '9px monospace';
  const missing = [];
  kinds.forEach((k, i) => {
    const e = ENEMIES[k], key = tm.exists('nat_' + k) ? 'nat_' + k : e.tex;
    const x = (i % cc) * cell, y = Math.floor(i / cc) * (cell + 12);
    if (!tm.exists(key)) { missing.push(k + ':' + key); return; }
    const t = tm.get(key), names = t.getFrameNames(), f = t.get(names.includes('down0') ? 'down0' : names[0] || '__BASE');
    const sc = Math.min(cs, (cell - 6) / Math.max(f.width, f.height));
    d.drawImage(f.source.image, f.cutX, f.cutY, f.width, f.height, x + 3, y + 3, f.width * sc, f.height * sc);
    if (e.tint) { d.fillStyle = '#' + e.tint.toString(16).padStart(6, '0'); d.fillRect(x + cell - 10, y + 2, 8, 8); }
    d.fillStyle = '#ffffff'; d.fillText(k.slice(0, 12), x + 2, y + cell + 9);
  });
  return { tiles, creatures: cv2.toDataURL('image/png'), n, kinds: kinds.length, missing };
});
for (const [k, v] of [['tiles', out.tiles], ['creatures', out.creatures]]) fs.writeFileSync(new URL(`./out/contact_${k}.png`, import.meta.url), Buffer.from(v.split(',')[1], 'base64'));
console.log(`${out.n} tiles, ${out.kinds} creatures; missing textures: ${out.missing.join(', ') || 'none'}`, h.errors.join('\n'));
await h.close();
