// Draws every creature that got native-pixel art, today's stretched sprite above the native one, with the 16px hero for scale.
// -> test/out/native_compare.png
import { launch } from './harness.mjs';
import fs from 'node:fs';
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=424242');
await h.sleep(600);
const url = await h.ev(async () => {
  const reg = await import('/src/art/native_registry.js');
  const { ENEMIES } = await import('/src/data/enemies.js');
  const sc = window.__ff.game.scene.getScene('Game');
  const order = [
    ['BOSSES', ['warlord', 'admiral', 'hollowking', 'sovereign', 'kragnar', 'winter', 'miremother', 'stormgiant', 'hartking', 'lodecolossus', 'brinegut', 'tide', 'root', 'dragon']],
    ['LARGE MONSTERS', ['troll', 'golem', 'crystalgolem', 'stonegiant', 'wyvern', 'thunderbird', 'frostworm']],
    ['BEASTS', ['bear', 'mammoth', 'elk', 'glassstag']],
  ];
  const Z = 3, PAD = 10, LABEL = 18, W = 1700;
  const pose = (t, names, want) => names.includes(want[0]) ? want[0] : names.includes(want[1]) ? want[1] : names[0];
  const items = [];
  for (const [title, kinds] of order) for (const kind of kinds) {
    const spec = reg.nativeSpec(kind); if (!spec) continue;
    const key = reg.ensureNative(sc, kind), cfg = ENEMIES[kind];
    items.push({ title, kind, name: cfg.name, spec, oldT: sc.textures.get(cfg.tex), newT: sc.textures.get(key), tint: cfg.tint, scale: spec.scale });
  }
  const hero = sc.textures.get('spr_player');
  // flow layout
  const cells = items.map((it) => { const f = it.spec.w * Z; const fh = it.spec.h * Z; return { it, cw: Math.max(f * 2 + PAD * 3, 200), ch: LABEL + fh * 2 + PAD * 3 }; });
  const rows = []; let row = [], used = 0;
  let curTitle = null;
  const out = [];
  for (const c of cells) {
    if (c.it.title !== curTitle) { if (row.length) rows.push({ cells: row }); row = []; used = 0; rows.push({ title: c.it.title }); curTitle = c.it.title; }
    if (used + c.cw > W && row.length) { rows.push({ cells: row }); row = []; used = 0; }
    row.push(c); used += c.cw;
  }
  if (row.length) rows.push({ cells: row });
  let H = 70 + 16 * Z + 40;
  for (const r of rows) H += r.title ? 38 : Math.max(...r.cells.map((c) => c.ch)) + 10;
  const cv = document.createElement('canvas'); cv.width = W + 40; cv.height = H;
  const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
  c.fillStyle = '#10141f'; c.fillRect(0, 0, cv.width, cv.height);
  c.fillStyle = '#e8eef5'; c.font = 'bold 26px monospace'; c.fillText('FROSTFALL: creatures before and after native pixels', 20, 36);
  c.fillStyle = '#93a5b3'; c.font = '14px monospace'; c.fillText('Top: today (16px sprite stretched). Bottom: new (drawn at full size, same pixel size as the hero). Same on-screen size and hitboxes.', 20, 58);
  const draw = (t, name, x, y, w, hgt, tint, srcScale = 1) => {
    const f = t.get(name);
    if (tint) { const tmp = document.createElement('canvas'); tmp.width = w; tmp.height = hgt; const tc = tmp.getContext('2d'); tc.imageSmoothingEnabled = false; tc.drawImage(t.getSourceImage(), f.cutX, f.cutY, f.width, f.height, 0, 0, w, hgt); tc.globalCompositeOperation = 'multiply'; tc.fillStyle = '#' + tint.toString(16).padStart(6, '0'); tc.fillRect(0, 0, w, hgt); tc.globalCompositeOperation = 'destination-in'; tc.drawImage(t.getSourceImage(), f.cutX, f.cutY, f.width, f.height, 0, 0, w, hgt); c.drawImage(tmp, x, y); }
    else c.drawImage(t.getSourceImage(), f.cutX, f.cutY, f.width, f.height, x, y, w, hgt);
  };
  // hero reference
  let y = 76;
  c.fillStyle = '#93a5b3'; c.font = '14px monospace'; c.fillText('HERO 16x16 (unchanged)', 20, y + 12);
  draw(hero, 'down0', 20, y + 20, 16 * Z, 16 * Z, null);
  draw(hero, 'side1', 20 + 16 * Z + 14, y + 20, 16 * Z, 16 * Z, null);
  y += 16 * Z + 50;
  for (const r of rows) {
    if (r.title) { c.fillStyle = '#5cc8d8'; c.font = 'bold 18px monospace'; c.fillText(r.title, 20, y + 22); c.fillStyle = '#2e3a5c'; c.fillRect(20, y + 30, W, 2); y += 38; continue; }
    let x = 20; const rh = Math.max(...r.cells.map((q) => q.ch));
    for (const q of r.cells) {
      const it = q.it, names = it.newT.getFrameNames();
      const A = pose(it.newT, names, ['down0', 'side0']), B = pose(it.newT, names, ['atkdown1', 'attack0', 'side1']);
      c.fillStyle = '#18202e'; c.fillRect(x, y, q.cw - 8, rh - 6);
      c.fillStyle = '#e8eef5'; c.font = '14px monospace'; c.fillText(`${it.name}  ${it.spec.w}x${it.spec.h}`, x + PAD, y + 14);
      const fw = it.spec.w * Z, fh = it.spec.h * Z;
      [A, B].forEach((n, i) => {
        const fx = x + PAD + i * (fw + PAD), oldn = it.oldT.has(n) ? n : it.oldT.getFrameNames()[0];
        const of = it.oldT.get(oldn);
        draw(it.oldT, oldn, fx, y + LABEL + PAD, of.width * it.scale * Z, of.height * it.scale * Z, it.tint);
        draw(it.newT, n, fx, y + LABEL + PAD * 2 + fh, fw, fh, it.tint);
      });
      x += q.cw;
    }
    y += rh + 10;
  }
  return cv.toDataURL('image/png');
});
await h.close();
const p = new URL('./out/native_compare.png', import.meta.url).pathname;
fs.writeFileSync(p, Buffer.from(url.split(',')[1], 'base64'));
console.log(p);
