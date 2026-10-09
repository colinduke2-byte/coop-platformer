// Mock-up: the hero (16x16) wearing and holding different gear. The game does not draw armour on the hero yet, so the armour and
// head pieces here are the item icons squeezed onto the hero's chest and head; weapons and shields are the real held sprites.
// -> test/out/worn_loadouts.png
import { launch } from './harness.mjs';
import fs from 'node:fs';
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=424242');
await h.sleep(600);
const url = await h.ev(async () => {
  const { iconKey, ITEMS } = await import('/src/data/items.js');
  const { wornHeroKey } = await import('/src/art/sprites.js');
  const sc = window.__ff.game.scene.getScene('Game');
  const LOADOUTS = [
    { name: 'Wayfarer', armor: 'fur_tunic', weapon: 'rusty_sword', shield: 'wooden_shield' },
    { name: 'Nordic knight', armor: 'nordic_plate', head: 'nordic_helm', weapon: 'nordic_blade', shield: 'nordic_shield' },
    { name: 'Hunter', armor: 'hunter_garb', head: 'hunter_hood', weapon: 'skinning_knife', bow: 'long_bow' },
    { name: 'Frost mage', armor: 'mage_robe', weapon: 'winter_staff', head: 'frost_circlet', charm: 'antler_crown' },
    { name: 'Bulwark', armor: 'bulwark_plate', head: 'bulwark_helm', weapon: 'warhammer' },
    { name: 'Shadow', armor: 'smuggler_cloak', head: 'pale_cowl', weapon: 'nightshade', off: 'glass_dagger' },
    { name: 'Ember champion', armor: 'ember_mail', head: 'ember_helm', weapon: 'ember_halberd' },
    { name: 'Court knight', armor: 'court_plate', head: 'court_helm', weapon: 'kings_blade', shield: 'warden_shield' },
    { name: 'Tide warden', armor: 'tide_coat', head: 'tide_cap', weapon: 'admiral_cutlass', shield: 'ember_bulwark' },
    { name: 'Marsh ranger', armor: 'peat_mail', head: 'prism_helm', weapon: 'harpoon', bow: 'crossbow' },
    { name: 'Clansman', armor: 'clan_furs', head: 'clan_skull', weapon: 'clan_glaive' },
    { name: 'Delver', armor: 'delver_hauberk', head: 'deep_helm', weapon: 'lode_pick' },
  ];
  const Z = 5, CW = 200, CH = 200;
  const COLS = 4, rows = Math.ceil(LOADOUTS.length / COLS);
  const cv = document.createElement('canvas'); cv.width = COLS * CW + 40; cv.height = rows * CH + 90;
  const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
  c.fillStyle = '#10141f'; c.fillRect(0, 0, cv.width, cv.height);
  c.fillStyle = '#e8eef5'; c.font = 'bold 26px monospace'; c.fillText('FROSTFALL: the hero in full gear', 20, 36);
  c.fillStyle = '#93a5b3'; c.font = '13px monospace'; c.fillText('Real worn armour and helmet sprites, with the real held weapons and shields.', 20, 58);
  const hero = sc.textures.get('spr_player'), hf = hero.get('down0');
  const icon = (id) => { const t = sc.textures.get(iconKey(id)), img = t.getSourceImage(); const cc = document.createElement('canvas'); cc.width = 16; cc.height = 16; const x = cc.getContext('2d'); x.drawImage(img, 0, 0); const d = x.getImageData(0, 0, 16, 16).data; let x0 = 16, y0 = 16, x1 = -1, y1 = -1; for (let y = 0; y < 16; y++) for (let xx = 0; xx < 16; xx++) if (d[(y * 16 + xx) * 4 + 3]) { x0 = Math.min(x0, xx); x1 = Math.max(x1, xx); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return { cc, x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }; };
  const held = (id) => sc.textures.exists('held_' + id) ? sc.textures.get('held_' + id).getSourceImage() : null;
  LOADOUTS.forEach((L, i) => {
    const ox = 20 + (i % COLS) * CW, oy = 80 + Math.floor(i / COLS) * CH;
    c.fillStyle = '#18202e'; c.fillRect(ox, oy, CW - 8, CH - 8);
    const hx = ox + (CW - 8) / 2 - 8 * Z, hy = oy + 40;
    const P = (x, y) => [hx + x * Z, hy + y * Z];
    // weapon behind the hero for 2H and polearms, shield and weapon hands on the sides
    const w = held(L.weapon), W = ITEMS[L.weapon];
    const draw = (img, px, py, ang, pivot, sc2 = 1) => { c.save(); c.translate(px, py); c.rotate(ang); c.drawImage(img, -img.width * pivot * Z * sc2, -img.height * 0.5 * Z * sc2, img.width * Z * sc2, img.height * Z * sc2); c.restore(); };
    const two = W.type === 'weapon2h' || (W.style === 'staff');
    if (w && two) { const [px, py] = P(12.5, 10); draw(w, px, py, -1.25, W.style === 'staff' ? 0.5 : 0.45); }
    // hero
    { const k = (id) => (id && ITEMS[id].icon[0]) || null; const wk = wornHeroKey(sc, k(L.armor), k(L.charm), 11, k(L.head)) || 'spr_player'; const wt = sc.textures.get(wk), wf = wt.get('down0'); c.drawImage(wt.getSourceImage(), wf.cutX, wf.cutY, 16, 16, hx, hy, 16 * Z, 16 * Z); }
    if (w && !two) { const [px, py] = P(13.2, 11); draw(w, px, py, -1.05, 0.12); }
    if (L.off) { const o = held(L.off); const [px, py] = P(2.6, 11); draw(o, px, py, -2.1, 0.12); }
    if (L.shield) { const s = held(L.shield); const [px, py] = P(-3.5, 6.2); c.drawImage(s, px, py, s.width * Z * 1.15, s.height * Z * 1.15); }
    if (L.bow) { const b = icon(L.bow), [px, py] = P(-5.5, 3.5); c.drawImage(b.cc, b.x0, b.y0, b.w, b.h, px, py, b.w * Z * 1.1, b.h * Z * 1.1); }
    c.fillStyle = '#e8eef5'; c.font = '14px monospace'; c.textAlign = 'center';
    c.fillText(L.name, ox + (CW - 8) / 2, oy + CH - 40);
    c.fillStyle = '#93a5b3'; c.font = '11px monospace';
    c.fillText([L.head, L.armor].filter(Boolean).map((id) => ITEMS[id].name).join(' + ').slice(0, 30), ox + (CW - 8) / 2, oy + CH - 22);
    c.fillStyle = '#6f8294'; c.fillText([L.weapon, L.shield || L.bow || L.off].filter(Boolean).map((id) => ITEMS[id].name).join(' + ').slice(0, 30), ox + (CW - 8) / 2, oy + CH - 10); c.fillStyle = '#93a5b3'; c.textAlign = 'left';
  });
  return cv.toDataURL('image/png');
});
await h.close();
fs.writeFileSync(new URL('./out/worn_loadouts.png', import.meta.url).pathname, Buffer.from(url.split(',')[1], 'base64'));
console.log('ok');
