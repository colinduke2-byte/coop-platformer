// Dev: dump today's sprite sheets for the given texture keys at 8x -> test/out/old_<tex>.png
import { launch } from './harness.mjs';
import fs from 'node:fs';
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=424242');
await h.sleep(500);
const out = await h.ev((keys) => {
  const sc = window.__ff.game.scene.getScene('Game'), r = {};
  for (const key of keys) {
    const t = sc.textures.get(key), names = t.getFrameNames(), k = 8;
    const f0 = t.get(names[0]);
    const cv = document.createElement('canvas'); cv.width = names.length * (f0.width * k + 4); cv.height = f0.height * k;
    const c = cv.getContext('2d'); c.imageSmoothingEnabled = false; c.fillStyle = '#1c2338'; c.fillRect(0, 0, cv.width, cv.height);
    names.forEach((n, i) => { const f = t.get(n); c.drawImage(t.getSourceImage(), f.cutX, f.cutY, f.width, f.height, i * (f.width * k + 4), 0, f.width * k, f.height * k); });
    r[key] = { img: cv.toDataURL('image/png'), names };
  }
  return r;
}, process.argv.slice(2));
await h.close();
for (const [k, v] of Object.entries(out)) { fs.writeFileSync(new URL(`./out/old_${k}.png`, import.meta.url).pathname, Buffer.from(v.img.split(',')[1], 'base64')); console.log(k, v.names.join(' ')); }
