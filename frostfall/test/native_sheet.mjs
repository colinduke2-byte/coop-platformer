// Dev preview: draws today's stretched sprite next to the native-pixel one for a list of kinds -> test/out/native_<name>.png
// usage: node test/native_sheet.mjs <name> kind[,kind...]   (kinds must be registered in src/art/native/index.js)
import { launch } from './harness.mjs';
import fs from 'node:fs';
const [name, list] = [process.argv[2] || 'preview', (process.argv[3] || 'warlord').split(',')];
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=424242');
await h.sleep(600);
const data = await h.ev(async (kinds) => {
  const reg = await import('/src/art/native_registry.js');
  await import('/src/art/native/creatures_humanoid.js');
  await import('/src/art/native/animals.js');
  try { await import('/src/art/native/special.js'); } catch (e) {}
  const { ENEMIES } = await import('/src/data/enemies.js');
  const sc = window.__ff.game.scene.getScene('Game');
  const FR = ['down0', 'down1', 'side1', 'up0', 'atkdown0', 'atkside1', 'hurt0', 'dead0'];
  const out = {};
  for (const kind of kinds) {
    const spec = reg.nativeSpec(kind);
    if (!spec) { out[kind] = null; continue; }
    const key = reg.ensureNative(sc, kind), cfg = ENEMIES[kind];
    const oldT = sc.textures.get(cfg.tex), newT = sc.textures.get(key);
    const names = newT.getFrameNames();
    const frames = names.includes('down0') ? FR : names;
    const cell = spec.w, pad = 4, k = 5;
    const cv = document.createElement('canvas'); cv.width = (cell * k + pad) * frames.length; cv.height = cell * k * 2 + pad * 3;
    const c = cv.getContext('2d'); c.imageSmoothingEnabled = false; c.fillStyle = '#1c2338'; c.fillRect(0, 0, cv.width, cv.height);
    frames.forEach((f, i) => {
      const x = i * (cell * k + pad);
      const fo = oldT.has(f) ? oldT.get(f) : oldT.get(oldT.getFrameNames()[0]);
      c.drawImage(oldT.getSourceImage(), fo.cutX, fo.cutY, fo.width, fo.height, x, pad, fo.width * spec.scale * k, fo.height * spec.scale * k);
      const fn = newT.get(f);
      c.drawImage(newT.getSourceImage(), fn.cutX, fn.cutY, fn.width, fn.height, x, cell * k + pad * 2, cell * k, cell * k);
    });
    out[kind] = cv.toDataURL('image/png');
  }
  return out;
}, list);
await h.close();
for (const [k, v] of Object.entries(data)) {
  if (!v) { console.log(k, 'not registered'); continue; }
  const p = new URL(`./out/native_${name}_${k}.png`, import.meta.url).pathname;
  fs.writeFileSync(p, Buffer.from(v.split(',')[1], 'base64')); console.log(p);
}
