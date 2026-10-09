// Catalogue: every armour and helmet as its item icon next to the hero wearing it (front, side, back).
// -> test/out/worn_catalog.png
import { launch } from './harness.mjs';
import fs from 'node:fs';
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=424242');
await h.sleep(600);
const url = await h.ev(async () => {
  const { wornHeroKey } = await import('/src/art/sprites.js');
  const { WORN_ARMOR, WORN_HELM } = await import('/src/art/worn.js');
  const { ITEMS, iconKey } = await import('/src/data/items.js');
  const sc = window.__ff.game.scene.getScene('Game');
  const byKind = {};
  for (const [id, it] of Object.entries(ITEMS)) if (!it.gen) { const k = Array.isArray(it.icon) ? it.icon[0] : it.icon; if (!byKind[k]) byKind[k] = { id, name: it.name, arm: it.armor }; }
  const sections = [['ARMOUR', Object.keys(WORN_ARMOR).map((k) => ({ ...byKind[k], a: k }))], ['HELMETS', Object.keys(WORN_HELM).map((k) => ({ ...byKind[k], hm: k }))]];
  const Z = 4, COLS = 3, CW = 330, CH = 16 * Z + 40;
  const rowsOf = (n) => Math.ceil(n / COLS);
  const H = 80 + sections.reduce((a, [, l]) => a + 40 + rowsOf(l.length) * CH, 0);
  const cv = document.createElement('canvas'); cv.width = COLS * CW + 20; cv.height = H;
  const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
  c.fillStyle = '#10141f'; c.fillRect(0, 0, cv.width, cv.height);
  c.fillStyle = '#e8eef5'; c.font = 'bold 24px monospace'; c.fillText('FROSTFALL: all armour and helmets', 20, 34);
  c.fillStyle = '#93a5b3'; c.font = '13px monospace'; c.fillText('item icon, then the hero wearing it: front, side, back', 20, 54);
  let y = 76;
  for (const [title, list] of sections) {
    c.fillStyle = '#f4d460'; c.font = 'bold 16px monospace'; c.fillText(`${title} (${list.length})`, 20, y + 20); y += 34;
    list.forEach((e, i) => {
      const ox = 10 + (i % COLS) * CW, oy = y + Math.floor(i / COLS) * CH;
      c.fillStyle = '#18202e'; c.fillRect(ox, oy, CW - 8, CH - 6);
      c.drawImage(sc.textures.get(iconKey(e.id)).getSourceImage(), 0, 0, 16, 16, ox + 6, oy + 6, 16 * Z, 16 * Z);
      const key = wornHeroKey(sc, e.a || null, null, 11, e.hm || null), tex = sc.textures.get(key), img = tex.getSourceImage();
      ['down0', 'side0', 'up0'].forEach((fn, j) => { const f = tex.get(fn); c.drawImage(img, f.cutX, f.cutY, 16, 16, ox + 80 + j * 16 * Z, oy + 6, 16 * Z, 16 * Z); });
      c.fillStyle = '#e8eef5'; c.font = '13px monospace'; c.fillText(e.name + (e.arm ? `  (${Math.round(e.arm * 100)}%)` : ''), ox + 8, oy + CH - 14);
    });
    y += rowsOf(list.length) * CH + 6;
  }
  return cv.toDataURL('image/png');
});
fs.writeFileSync(new URL('./out/worn_catalog.png', import.meta.url).pathname, Buffer.from(url.split(',')[1], 'base64'));
await h.close();
