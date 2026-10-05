import { launch } from './harness.mjs';
import fs from 'node:fs';
const h = await launch();
await h.open('scene=game');
await h.sleep(500);
const data = await h.ev(() => {
  const S = 6;
  const keys = ['spr_player#down0', 'spr_player#side1', 'spr_wolf#side0', 'spr_boss#down0', 'pot', 'barrel', 'urn', 'sign', 'chest0'];
  const cv = document.createElement('canvas'); cv.width = keys.length * 16 * S; cv.height = 16 * S * 2;
  const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
  [['#b4c7e0', 0], ['#2e3a5c', 1]].forEach(([bg, row]) => {
    ctx.fillStyle = bg; ctx.fillRect(0, row * 16 * S, cv.width, 16 * S);
    keys.forEach((k, i) => {
      const [t, f] = k.split('#'); const tex = window.__ff.game.textures.get(t); const fr = f ? tex.get(f) : tex.get();
      ctx.drawImage(tex.getSourceImage(), fr.cutX, fr.cutY, 16, 16, i * 16 * S, row * 16 * S, 16 * S, 16 * S);
    });
  });
  return cv.toDataURL('image/png');
});
fs.writeFileSync(new URL('./out/sheet2.png', import.meta.url).pathname, Buffer.from(data.split(',')[1], 'base64'));
await h.close();
