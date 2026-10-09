// Lists every enemy kind with its texture, frame size, scale, body and on-screen size (docs/NATIVE_PIXELS_AUDIT.md).
import { launch } from './harness.mjs';
import fs from 'node:fs';
const guard = fs.readFileSync(new URL('../src/entities/Guardians.js', import.meta.url), 'utf8');
const bossScale = {};
for (const m of guard.matchAll(/super\(scene, x, y, '(\w+)', TUNE\.\w+, \{[\s\S]{0,80}?scale: ([\d.]+)/g)) bossScale[m[1]] = +m[2];
const h = await launch();
await h.open('');
const rows = await h.ev(async (bs) => {
  const { ENEMIES } = await import('/src/data/enemies.js');
  const sc = window.__ff.game.scene.getScenes(false)[0];
  const out = [];
  for (const [kind, c] of Object.entries(ENEMIES)) {
    const t = sc.textures.exists(c.tex) ? sc.textures.get(c.tex) : null;
    const names = t ? t.getFrameNames() : [];
    const f0 = t ? t.get(names[0] || '__BASE') : null;
    out.push({ kind, name: c.name, tex: c.tex, boss: c.kind === 'boss', tint: !!c.tint, scale: c.scale ?? bs[kind] ?? 1, body: c.body, fw: f0 ? f0.width : 0, fh: f0 ? f0.height : 0, frames: names.length, sideOnly: !!c.sideOnly });
  }
  return out;
}, bossScale);
await h.close();
fs.writeFileSync(new URL('./out/audit_sizes.json', import.meta.url), JSON.stringify(rows, null, 1));
console.log(rows.length, 'kinds');
for (const r of rows) console.log(r.kind.padEnd(14), r.tex.padEnd(18), `${r.fw}x${r.fh}`.padEnd(7), 'x' + r.scale, r.boss ? 'BOSS' : '', r.tint ? 'tint' : '');
