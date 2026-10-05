import { launch } from './harness.mjs';
import fs from 'node:fs';
const h = await launch();
await h.open('scene=game');
await h.sleep(500);
const data = await h.ev(() => {
  const names = ['player', 'sigrid', 'bjorn', 'mirra', 'draugr', 'bandit', 'archer', 'wight', 'boss', 'wolf'];
  const frames = ['down0', 'down1', 'up0', 'side0', 'side1'];
  const S = 6;
  const cv = document.createElement('canvas');
  cv.width = frames.length * 16 * S + 60; cv.height = names.length * 16 * S;
  const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false; ctx.fillStyle = '#b4c7e0'; ctx.fillRect(0, 0, cv.width, cv.height);
  names.forEach((n, ri) => {
    const tex = window.__ff.game.textures.get('spr_' + n);
    frames.forEach((f, ci) => {
      const fr = tex.has(f) ? tex.get(f) : null; if (!fr) return;
      ctx.drawImage(tex.getSourceImage(), fr.cutX, fr.cutY, 16, 16, ci * 16 * S, ri * 16 * S, 16 * S, 16 * S);
    });
  });
  return cv.toDataURL('image/png');
});
fs.writeFileSync(new URL('./out/sheet.png', import.meta.url).pathname, Buffer.from(data.split(',')[1], 'base64'));
await h.close();
