// One image with every equipment model: item icon, plus the held sprite for weapons and shields -> test/out/equipment.png
import { launch } from './harness.mjs';
import fs from 'node:fs';
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=424242');
await h.sleep(600);
const out = await h.ev(async ([ONLY, ZZ]) => {
  const { ITEMS, iconKey } = await import('/src/data/items.js');
  const sc = window.__ff.game.scene.getScene('Game');
  const GROUPS = [['ONE-HANDED WEAPONS', ['weapon']], ['TWO-HANDED WEAPONS', ['weapon2h']], ['BOWS', ['bow']], ['SHIELDS', ['shield']], ['ARMOUR', ['armor']], ['CHARMS AND RINGS', ['charm']]];
  const Z = ZZ || 4, CW = ZZ ? 300 : 150, PADX = 12, COLS = ZZ ? 5 : 11, RH = ZZ ? 16 * ZZ + 70 : 124;
  const lists = GROUPS.map(([title, types]) => [title, Object.entries(ITEMS).filter(([id, it]) => types.includes(it.type) && (!ONLY || ONLY.includes(id))).map(([id, it]) => ({ id, it }))]);
  let H = 110; for (const [, l] of lists.filter(([, l]) => l.length)) H += 50 + Math.ceil(l.length / COLS) * RH;
  const cv = document.createElement('canvas'); cv.width = COLS * CW + 40; cv.height = H;
  const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
  c.fillStyle = '#10141f'; c.fillRect(0, 0, cv.width, cv.height);
  c.fillStyle = '#e8eef5'; c.font = 'bold 28px monospace'; c.fillText(`FROSTFALL: all ${lists.reduce((a, [, l]) => a + l.length, 0)} equipment models`, 20, 40);
  c.fillStyle = '#93a5b3'; c.font = '14px monospace'; c.fillText('Left: inventory icon. Right: the weapon or shield as it is held in the hand. Colours show the metal or material of each tier.', 20, 64);
  let y = 90;
  const RAR = { 0: '#b8c7d6', 1: '#7dd68a', 2: '#6aa8ff', 3: '#c78bff', 4: '#f4a640' };
  for (const [title, list] of lists) {
    if (!list.length) continue;
    c.fillStyle = '#5cc8d8'; c.font = 'bold 18px monospace'; c.fillText(`${title} (${list.length})`, 20, y + 20); c.fillStyle = '#2e3a5c'; c.fillRect(20, y + 28, COLS * CW, 2); y += 40;
    list.forEach(({ id, it }, i) => {
      const x = 20 + (i % COLS) * CW, yy = y + Math.floor(i / COLS) * RH;
      c.fillStyle = '#18202e'; c.fillRect(x, yy, CW - 6, RH - 6);
      const ik = iconKey(id);
      if (sc.textures.exists(ik)) c.drawImage(sc.textures.get(ik).getSourceImage(), 0, 0, 16, 16, x + 8, yy + 8, 16 * Z, 16 * Z);
      const hk = 'held_' + id;
      if (sc.textures.exists(hk)) { const img = sc.textures.get(hk).getSourceImage(); const w = img.width, hh = img.height; const s = ZZ ? ZZ : Math.min(3, Math.floor(70 / w) || 1); c.drawImage(img, 0, 0, w, hh, x + (ZZ ? 16 * ZZ + 24 : 76), yy + 12 + ((ZZ ? 16 * ZZ : 64) - hh * s) / 2, w * s, hh * s); }
      c.fillStyle = RAR[it.rarity ?? 0] || '#e8eef5'; c.font = '12px monospace'; c.textAlign = 'center';
      const nm = it.name || id; const words = nm.split(' '); let l1 = '', l2 = '';
      for (const w of words) { if ((l1 + ' ' + w).trim().length <= 17 && !l2) l1 = (l1 + ' ' + w).trim(); else l2 = (l2 + ' ' + w).trim(); }
      c.fillText(l1, x + (CW - 6) / 2, yy + RH - 28); if (l2) c.fillText(l2.length > 17 ? l2.slice(0, 16) + '.' : l2, x + (CW - 6) / 2, yy + RH - 13); c.textAlign = 'left';
    });
    y += Math.ceil(list.length / COLS) * 124 + 10;
  }
  return { url: cv.toDataURL('image/png') };
}, [process.env.IDS ? process.env.IDS.split(',') : null, process.env.ZOOM ? +process.env.ZOOM : 0]);
await h.close();
fs.writeFileSync(new URL(`./out/${process.env.OUT || 'equipment'}.png`, import.meta.url).pathname, Buffer.from(out.url.split(',')[1], 'base64'));
console.log('ok');
