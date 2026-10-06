// Dump texture sheets at 8x for eyeballing: node test/sheet.mjs spr_deer spr_lynx ...  -> test/out/sheets.png
import fs from 'fs';
import { launch } from './harness.mjs';
const keys = process.argv.slice(2);
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=1');
await h.sleep(800);
const url = await h.ev((keys) => {
  const S = 6, imgs = keys.map((k) => window.__ff.game.textures.get(k).getSourceImage());
  const w = Math.max(...imgs.map((i) => i.width)) * S, hh = imgs.reduce((a, i) => a + i.height * S + 6, 0);
  const c = document.createElement('canvas'); c.width = w; c.height = hh;
  const x = c.getContext('2d'); x.fillStyle = '#9db'; x.fillRect(0, 0, w, hh); x.imageSmoothingEnabled = false;
  let y = 0; for (const i of imgs) { x.drawImage(i, 0, y, i.width * S, i.height * S); y += i.height * S + 6; }
  return c.toDataURL();
}, keys);
fs.writeFileSync(new URL('./out/sheets.png', import.meta.url).pathname, Buffer.from(url.split(',')[1], 'base64'));
await h.close();
