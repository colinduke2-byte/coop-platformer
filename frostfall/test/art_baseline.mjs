// Art regression: every generated character/creature sheet is hashed and compared with test/baseline/sprites.json.
// An intentional art change: run with UPDATE=1 to refresh the baseline (and eyeball test/out/ sheets first).
import fs from 'fs';
import { launch, check, failCount } from './harness.mjs';
const file = new URL('./baseline/sprites.json', import.meta.url).pathname;
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=1');
await h.sleep(800);
const hashes = await h.ev(() => {
  const out = {};
  const fnv = (s) => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619) >>> 0; } return x.toString(16); };
  for (const key of window.__ff.game.textures.getTextureKeys()) {
    if (!/^(spr_|icon_|tiles|held_|plate|node|mound|shrine|icehole)/.test(key)) continue;
    const img = window.__ff.game.textures.get(key).getSourceImage();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    out[key] = fnv(x.getImageData(0, 0, c.width, c.height).data.join(','));
  }
  return out;
});
if (process.env.UPDATE || !fs.existsSync(file)) {
  fs.writeFileSync(file, JSON.stringify(hashes, null, 1));
  console.log(`baseline written: ${Object.keys(hashes).length} textures`);
} else {
  const base = JSON.parse(fs.readFileSync(file, 'utf8'));
  const changed = Object.keys(hashes).filter((k) => base[k] && base[k] !== hashes[k]);
  const added = Object.keys(hashes).filter((k) => !base[k]);
  const gone = Object.keys(base).filter((k) => !hashes[k]);
  check(`art unchanged (${Object.keys(hashes).length} textures)`, !changed.length && !gone.length, `changed: ${changed.join(', ')}  missing: ${gone.join(', ')}`);
  if (added.length) console.log('  note: new textures not in the baseline (run UPDATE=1):', added.join(', '));
}
await h.close();
console.log(failCount() ? 'ART FAILED' : 'ART OK');
