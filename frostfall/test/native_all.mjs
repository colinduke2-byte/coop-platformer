// One image with every creature model as it appears in the game now (native-pixel art where it has it) -> test/out/all_models.png
import { launch } from './harness.mjs';
import fs from 'node:fs';
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=424242');
await h.sleep(600);
const url = await h.ev(async () => {
  const reg = await import('/src/art/native_registry.js');
  await import('/src/art/native/index.js');
  const { ENEMIES } = await import('/src/data/enemies.js');
  const sc = window.__ff.game.scene.getScene('Game');
  const BOSS = new Set(['warlord', 'admiral', 'hollowking', 'sovereign', 'kragnar', 'winter', 'miremother', 'stormgiant', 'hartking', 'lodecolossus', 'brinegut', 'tide', 'root', 'dragon', 'grimfang', 'wyrm', 'boss']);
  const SCALE = { warlord: 2.4, admiral: 2.5, hollowking: 2.8, sovereign: 2.8, kragnar: 2.6, winter: 3, miremother: 2.6, stormgiant: 2.8, hartking: 2.6, lodecolossus: 3, brinegut: 2.4, tide: 3, root: 3, dragon: 1.9, boss: 2 };
  const items = [];
  for (const [kind, cfg] of Object.entries(ENEMIES)) {
    const spec = reg.nativeSpec(kind);
    const key = spec ? reg.ensureNative(sc, kind) : cfg.tex;
    const t = sc.textures.get(key), names = t.getFrameNames();
    const fn = ['down0', 'side0'].find((n) => names.includes(n)) || names[0];
    const f = t.get(fn);
    const sc2 = spec ? 1 : (cfg.scale ?? SCALE[kind] ?? 1);
    items.push({ kind, name: cfg.name, boss: BOSS.has(kind), native: !!spec, t, f, w: f.width * sc2, h: f.height * sc2, tint: cfg.tint });
  }
  const Z = 3, PAD = 12, LAB = 30, COLW = 1750;
  const groups = [['BOSSES AND GUARDIANS', items.filter((i) => i.boss)], ['CREATURES AND MONSTERS', items.filter((i) => !i.boss)]];
  // flow layout
  const cellW = (i) => Math.max(i.w * Z + PAD * 2, 118), cellH = (i) => i.h * Z + LAB + PAD * 2;
  const rows = [];
  for (const [title, list] of groups) {
    rows.push({ title });
    let row = [], used = 0;
    const flush = () => { if (row.length) rows.push({ row }); row = []; used = 0; };
    for (const i of list.sort((a, b) => b.h - a.h)) { const w = cellW(i); if (used + w > COLW) flush(); row.push(i); used += w; }
    flush();
  }
  let H = 220; for (const r of rows) H += r.title ? 44 : Math.max(...r.row.map(cellH)) + 8;
  const cv = document.createElement('canvas'); cv.width = COLW + 40; cv.height = H;
  const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
  c.fillStyle = '#10141f'; c.fillRect(0, 0, cv.width, cv.height);
  c.fillStyle = '#e8eef5'; c.font = 'bold 28px monospace'; c.fillText(`FROSTFALL: all ${items.length} creature models`, 20, 40);
  c.fillStyle = '#93a5b3'; c.font = '14px monospace'; c.fillText('Shown at one pixel size (3x), so sizes compare true. Marked * = drawn at full size with native pixels; the rest are the original 16px sprites.', 20, 64);
  const draw = (it, x, y) => {
    const w = it.w * Z, hh = it.h * Z;
    if (it.tint) { const tmp = document.createElement('canvas'); tmp.width = Math.ceil(w); tmp.height = Math.ceil(hh); const tc = tmp.getContext('2d'); tc.imageSmoothingEnabled = false; tc.drawImage(it.t.getSourceImage(), it.f.cutX, it.f.cutY, it.f.width, it.f.height, 0, 0, w, hh); tc.globalCompositeOperation = 'multiply'; tc.fillStyle = '#' + it.tint.toString(16).padStart(6, '0'); tc.fillRect(0, 0, w, hh); tc.globalCompositeOperation = 'destination-in'; tc.drawImage(it.t.getSourceImage(), it.f.cutX, it.f.cutY, it.f.width, it.f.height, 0, 0, w, hh); c.drawImage(tmp, x, y); }
    else c.drawImage(it.t.getSourceImage(), it.f.cutX, it.f.cutY, it.f.width, it.f.height, x, y, w, hh);
  };
  // the hero for scale
  let y = 90;
  c.fillStyle = '#18202e'; c.fillRect(20, y, 150, 16 * Z + 40); c.fillStyle = '#e8eef5'; c.font = '13px monospace'; c.fillText('Hero 16x16', 30, y + 20);
  const hero = sc.textures.get('spr_player'), hf = hero.get('down0'); c.drawImage(hero.getSourceImage(), hf.cutX, hf.cutY, 16, 16, 40, y + 28, 16 * Z, 16 * Z);
  y += 16 * Z + 56;
  for (const r of rows) {
    if (r.title) { c.fillStyle = '#5cc8d8'; c.font = 'bold 18px monospace'; c.fillText(r.title, 20, y + 24); c.fillStyle = '#2e3a5c'; c.fillRect(20, y + 32, COLW, 2); y += 44; continue; }
    let x = 20; const rh = Math.max(...r.row.map(cellH));
    for (const i of r.row) {
      const cw = cellW(i);
      c.fillStyle = '#18202e'; c.fillRect(x, y, cw - 6, rh);
      const bx = x + (cw - 6 - i.w * Z) / 2;
      draw(i, bx, y + PAD + (rh - cellH(i)) + (i.h < 20 ? 0 : 0));
      c.fillStyle = i.native ? '#f4d460' : '#b8c7d6'; c.font = '12px monospace'; c.textAlign = 'center';
      const label = (i.native ? '* ' : '') + i.name; c.fillText(label.length > 18 ? label.slice(0, 17) + '.' : label, x + (cw - 6) / 2, y + rh - 10); c.textAlign = 'left';
      x += cw;
    }
    y += rh + 8;
  }
  return { url: cv.toDataURL('image/png'), n: items.length };
});
await h.close();
fs.writeFileSync(new URL('./out/all_models.png', import.meta.url).pathname, Buffer.from(url.url.split(',')[1], 'base64'));
console.log(url.n, 'creatures');
