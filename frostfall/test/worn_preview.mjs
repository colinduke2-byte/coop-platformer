// Preview: the hero wearing each armour (front, side, back, mid-swing) and head piece, from the real sprite builder.
// -> test/out/worn_preview.png
import { launch } from './harness.mjs';
import fs from 'node:fs';
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=424242');
await h.sleep(600);
const url = await h.ev(async () => {
  const { wornHeroKey } = await import('/src/art/sprites.js');
  const { WORN_ARMOR, WORN_HEAD, WORN_HELM } = await import('/src/art/worn.js');
  const { ITEMS } = await import('/src/data/items.js');
  const sc = window.__ff.game.scene.getScene('Game');
  const names = {};
  for (const it of Object.values(ITEMS)) { const k = Array.isArray(it.icon) ? it.icon[0] : it.icon; if (!names[k]) names[k] = it.name; }
  const entries = [[null, null, 'Plain hero'], ...Object.keys(WORN_ARMOR).map((k) => [k, null, names[k]]), ...Object.keys(WORN_HEAD).map((k) => [null, k, names[k], null]), ...Object.keys(WORN_HELM).map((k) => [null, null, names[k], k])];
  const Z = 5, CW = 4 * 16 * Z + 20, CH = 16 * Z + 50, COLS = 2, rows = Math.ceil(entries.length / COLS);
  const cv = document.createElement('canvas'); cv.width = COLS * CW + 20; cv.height = rows * CH + 70;
  const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
  c.fillStyle = '#10141f'; c.fillRect(0, 0, cv.width, cv.height);
  c.fillStyle = '#e8eef5'; c.font = 'bold 24px monospace'; c.fillText('FROSTFALL: worn armour and helmets on the hero', 20, 34);
  c.fillStyle = '#93a5b3'; c.font = '13px monospace'; c.fillText('front, side, back, mid-swing', 20, 54);
  entries.forEach(([a, hd, name, hm], i) => {
    const ox = 10 + (i % COLS) * CW, oy = 66 + Math.floor(i / COLS) * CH;
    c.fillStyle = '#18202e'; c.fillRect(ox, oy, CW - 10, CH - 6);
    const key = wornHeroKey(sc, a, hd, 11, hm || null) || 'spr_player';
    const tex = sc.textures.get(key), img = tex.getSourceImage();
    ['down0', 'side0', 'up0', 'atkdown1'].forEach((fn, j) => { const f = tex.get(fn); c.drawImage(img, f.cutX, f.cutY, 16, 16, ox + 6 + j * 16 * Z, oy + 6, 16 * Z, 16 * Z); });
    c.fillStyle = '#e8eef5'; c.font = '14px monospace'; c.fillText(name || a || hd, ox + 8, oy + CH - 18);
  });
  return cv.toDataURL('image/png');
});
fs.mkdirSync(new URL('./out/', import.meta.url).pathname, { recursive: true });
fs.writeFileSync(new URL('./out/worn_preview.png', import.meta.url).pathname, Buffer.from(url.split(',')[1], 'base64'));
await h.close();
