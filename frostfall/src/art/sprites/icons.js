// Fx textures, item icons and held weapons (split out of art/sprites.js, CH16).
import { isGearKind, drawGearIcon, drawGearHeld, gearHeldSize } from '../gear.js';
import { DAG_HI, DAG_LO, iconFromCells, heldFromCells, Cb, col2 } from '../cells.js';
import { R, outline, ring, tex } from './base.js';

// --------------------------------------------------------- misc / fx / icons
export function buildFx(scene) {
  for (let c = 0; c < 16; c++) tex(scene, 'p' + c, 2, 2, (g) => R(g, c, 0, 0, 2, 2));
  tex(scene, 'shadow', 12, 5, (g) => {
    g.fillStyle = 'rgba(11,14,26,0.45)';
    g.fillRect(3, 0, 6, 1); g.fillRect(1, 1, 10, 3); g.fillRect(3, 4, 6, 1);
  });
  // ore node, treasure mound, shrine stone
  tex(scene, 'node', 16, 16, (g) => {
    R(g, 0, 2, 5, 12, 10); R(g, 3, 3, 4, 10, 10); R(g, 4, 4, 5, 8, 7); R(g, 2, 3, 12, 10, 2);
    R(g, 15, 5, 3, 2, 4); R(g, 6, 5, 2, 1, 2); R(g, 15, 9, 6, 2, 3); R(g, 6, 9, 7, 1, 1);
  });
  tex(scene, 'icehole', 16, 16, (g) => {
    R(g, 3, 3, 5, 10, 7); R(g, 1, 4, 6, 8, 5); R(g, 0, 5, 7, 6, 3); R(g, 15, 6, 8, 3, 1); R(g, 6, 4, 6, 8, 1);
  });
  // footprints, ravens, hot spring, steam
  tex(scene, 'paw', 8, 8, (g) => { R(g, 3, 3, 4, 2, 2); R(g, 3, 1, 2, 1, 1); R(g, 3, 3, 1, 1, 1); R(g, 3, 5, 2, 1, 1); R(g, 3, 6, 4, 1, 1); });
  tex(scene, 'foot', 4, 4, (g) => { R(g, 3, 0, 0, 2, 3); R(g, 3, 1, 3, 1, 1); });
  tex(scene, 'raven0', 8, 6, (g) => { R(g, 0, 1, 2, 5, 3); R(g, 0, 5, 1, 2, 2); R(g, 0, 0, 2, 2, 1); R(g, 12, 6, 2, 1, 1); R(g, 0, 2, 5, 1, 1); });
  tex(scene, 'raven1', 8, 6, (g) => { R(g, 0, 1, 3, 5, 2); R(g, 0, 5, 2, 2, 1); R(g, 0, 0, 3, 2, 1); R(g, 0, 0, 0, 3, 1); R(g, 0, 5, 0, 3, 1); R(g, 12, 6, 3, 1, 1); });
  // VX-19: gulls on the Coast, vultures over the Sunscorch (same size and frames as the ravens)
  tex(scene, 'gull0', 8, 6, (g) => { R(g, 6, 1, 2, 5, 3); R(g, 6, 5, 1, 2, 2); R(g, 4, 1, 2, 3, 1); R(g, 13, 7, 2, 1, 1); R(g, 0, 5, 1, 1, 1); R(g, 3, 0, 3, 2, 1); });
  tex(scene, 'gull1', 8, 6, (g) => { R(g, 6, 1, 3, 5, 2); R(g, 6, 5, 2, 2, 1); R(g, 4, 0, 1, 3, 1); R(g, 4, 0, 0, 3, 1); R(g, 4, 5, 0, 3, 1); R(g, 13, 7, 3, 1, 1); });
  tex(scene, 'vulture0', 8, 6, (g) => { R(g, 1, 1, 2, 5, 3); R(g, 9, 2, 2, 3, 2); R(g, 10, 5, 0, 2, 2); R(g, 6, 5, 2, 2, 1); R(g, 13, 7, 1, 1, 1); R(g, 0, 0, 3, 2, 1); });
  tex(scene, 'vulture1', 8, 6, (g) => { R(g, 1, 1, 3, 5, 2); R(g, 10, 5, 1, 2, 2); R(g, 9, 0, 3, 2, 1); R(g, 1, 0, 1, 3, 1); R(g, 1, 5, 1, 3, 1); R(g, 13, 7, 2, 1, 1); });
  // town critters: a hen and a dog, two frames each
  tex(scene, 'hen0', 7, 6, (g) => { R(g, 12, 1, 2, 4, 3); R(g, 12, 0, 0, 2, 2); R(g, 8, 0, 2, 1, 1); R(g, 3, 1, 1, 5, 1); R(g, 3, 1, 0, 2, 5); R(g, 0, 2, 4, 1, 1); R(g, 0, 5, 5, 1, 1); });
  tex(scene, 'hen1', 7, 6, (g) => { R(g, 12, 1, 2, 4, 3); R(g, 12, 0, 1, 2, 2); R(g, 8, 0, 3, 1, 1); R(g, 3, 1, 1, 5, 1); R(g, 3, 1, 0, 2, 5); R(g, 0, 1, 5, 1, 1); R(g, 0, 4, 5, 1, 1); });
  tex(scene, 'dog0', 10, 7, (g) => { R(g, 4, 2, 2, 6, 3); R(g, 4, 7, 0, 3, 3); R(g, 3, 8, 0, 1, 1); R(g, 4, 0, 2, 2, 1); R(g, 3, 2, 5, 1, 2); R(g, 3, 6, 5, 1, 2); R(g, 1, 8, 5, 1, 2); });
  tex(scene, 'dog1', 10, 7, (g) => { R(g, 4, 2, 2, 6, 3); R(g, 4, 7, 0, 3, 3); R(g, 3, 8, 0, 1, 1); R(g, 4, 0, 1, 2, 1); R(g, 3, 3, 5, 1, 2); R(g, 3, 5, 5, 1, 2); R(g, 1, 7, 5, 1, 2); });
  tex(scene, 'spring', 16, 16, (g) => {
    R(g, 2, 2, 5, 12, 8); R(g, 3, 1, 4, 14, 8); R(g, 15, 2, 5, 12, 6); R(g, 15, 3, 6, 10, 4); R(g, 6, 4, 6, 2, 1); R(g, 6, 9, 8, 3, 1); R(g, 5, 2, 4, 1, 1); R(g, 5, 13, 4, 1, 1);
  });
  // cottage furnishings
  tex(scene, 'stash', 16, 16, (g) => { R(g, 0, 1, 5, 14, 10); R(g, 9, 2, 6, 12, 8); R(g, 10, 2, 6, 12, 1); R(g, 13, 7, 9, 2, 2); R(g, 3, 1, 9, 14, 1); R(g, 12, 6, 7, 4, 2); });
  tex(scene, 'garden', 16, 16, (g) => { R(g, 0, 1, 8, 14, 7); R(g, 9, 2, 9, 12, 5); R(g, 7, 2, 7, 12, 2); for (const [x, y, c] of [[3, 4, 8], [7, 3, 8], [11, 5, 8], [5, 6, 11], [9, 5, 15]]) { R(g, c, x, y, 2, 3); R(g, 7, x, y + 2, 1, 2); } });
  tex(scene, 'trophywall', 16, 16, (g) => { R(g, 0, 1, 1, 14, 12); R(g, 9, 2, 2, 12, 10); R(g, 13, 7, 4, 2, 2); R(g, 6, 4, 5, 8, 4); R(g, 10, 3, 3, 3, 1); R(g, 10, 10, 3, 3, 1); R(g, 13, 7, 8, 2, 2); R(g, 6, 7, 9, 2, 1); });
  tex(scene, 'cookpot', 16, 16, (g) => { R(g, 0, 3, 7, 10, 7); R(g, 3, 4, 7, 8, 6); R(g, 12, 5, 7, 6, 2); R(g, 6, 5, 6, 6, 1); R(g, 9, 3, 13, 1, 3); R(g, 9, 12, 13, 1, 3); R(g, 9, 2, 6, 12, 1); });
  tex(scene, 'mound', 16, 16, (g) => {
    R(g, 0, 3, 11, 10, 3); R(g, 5, 2, 9, 12, 3); R(g, 6, 4, 8, 8, 2); R(g, 6, 5, 9, 6, 1); R(g, 13, 7, 8, 1, 1); R(g, 9, 10, 8, 1, 1);
  });
  tex(scene, 'shrine', 16, 24, (g) => {
    R(g, 0, 3, 21, 10, 3); R(g, 3, 4, 20, 8, 2); R(g, 0, 4, 4, 8, 17); R(g, 3, 5, 3, 6, 17); R(g, 4, 6, 5, 4, 15);
    R(g, 15, 7, 8, 2, 1); R(g, 15, 7, 10, 2, 1); R(g, 6, 7, 5, 2, 4); R(g, 15, 5, 4, 6, 1); R(g, 3, 4, 3, 8, 1);
  });
  // rune pressure plates (tinted per rune) for the crypt puzzle
  tex(scene, 'plate', 16, 16, (g) => {
    R(g, 0, 2, 2, 12, 12); R(g, 6, 3, 3, 10, 10); R(g, 5, 4, 4, 8, 8); R(g, 6, 5, 5, 6, 6); R(g, 5, 7, 6, 2, 4); R(g, 5, 6, 7, 4, 2);
  });
  tex(scene, 'plate_on', 16, 16, (g) => {
    R(g, 0, 2, 2, 12, 12); R(g, 13, 3, 3, 10, 10); R(g, 6, 4, 4, 8, 8); R(g, 13, 5, 5, 6, 6); R(g, 6, 7, 6, 2, 4); R(g, 6, 6, 7, 4, 2);
  });
  tex(scene, 'pop3', 5, 5, (g) => { R(g, 6, 1, 1, 3, 3); R(g, 6, 2, 0, 1, 5); R(g, 6, 0, 2, 5, 1); });     // a hit's one-frame white pop
  tex(scene, 'slash', 16, 24, (g) => {
    for (let a = -60; a <= 60; a += 2) {
      const rad = (a * Math.PI) / 180;
      for (let r = 9; r <= 14; r++) {
        const x = Math.round(2 + Math.cos(rad) * r), y = Math.round(12 + Math.sin(rad) * r);
        if (x >= 0 && x < 16 && y >= 0 && y < 24) R(g, r >= 13 ? 5 : 6, x, y);
      }
    }
  });
  tex(scene, 'arrow', 9, 3, (g) => {
    R(g, 10, 1, 1, 6, 1); R(g, 6, 7, 0, 1, 3); R(g, 5, 8, 1, 1, 1); R(g, 6, 0, 0, 1, 1); R(g, 6, 0, 2, 1, 1); R(g, 4, 1, 0, 1, 1); R(g, 4, 1, 2, 1, 1);
  });
  tex(scene, 'fireball', 8, 8, (g) => {
    R(g, 11, 1, 1, 6, 6); R(g, 12, 2, 0, 4, 8); R(g, 12, 0, 2, 8, 4); R(g, 13, 2, 2, 4, 4); R(g, 6, 3, 3, 2, 2);
  });
  tex(scene, 'frostbolt', 8, 8, (g) => {         // a cyan shard in a steel outline (it vanished against snow without one)
    R(g, 3, 2, 0, 4, 8); R(g, 3, 0, 2, 8, 4); R(g, 3, 1, 1, 6, 6); R(g, 15, 2, 2, 4, 4); R(g, 15, 3, 1, 2, 6); R(g, 15, 1, 3, 6, 2); R(g, 6, 3, 3, 2, 2);
  });
  tex(scene, 'bolt', 6, 6, (g) => { R(g, 4, 1, 0, 4, 6); R(g, 5, 0, 1, 6, 4); R(g, 15, 2, 2, 2, 2); });
  tex(scene, 'ring', 64, 64, (g) => ring(g, 64, 3));
  tex(scene, 'disc', 64, 64, (g) => {
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const d = Math.hypot(x - 31.5, y - 31.5); if (d <= 31.5) R(g, d > 30.2 ? 2 : 6, x, y); }
  });
  tex(scene, 'ring_small', 32, 32, (g) => ring(g, 32, 2));
  for (let i = 0; i < 3; i++) {
    tex(scene, 'flame' + i, 12, 14, (g) => {
      const w = [6, 8, 7][i], h = [10, 12, 11][i];
      R(g, 12, 6 - w / 2, 14 - h, w, h - 2); R(g, 13, 6 - w / 2 + 1, 14 - h + 3, w - 2, h - 5);
      R(g, 6, 5, 9, 2, 3); R(g, 11, 6 - w / 2, 12, w, 2);
      R(g, 12, 5 + i - 1, 14 - h - 1, 2, 2);
    });
  }
  tex(scene, 'mini_coin', 7, 7, (g) => { R(g, 13, 1, 0, 5, 7); R(g, 13, 0, 1, 7, 5); R(g, 12, 3, 2, 1, 3); R(g, 6, 1, 1, 1, 1); });
  tex(scene, 'mini_arrow', 11, 5, (g) => { R(g, 10, 1, 2, 8, 1); R(g, 5, 9, 1, 1, 3); R(g, 6, 8, 2, 1, 1); R(g, 6, 0, 1, 2, 1); R(g, 6, 0, 3, 2, 1); });
  for (const open of [0, 1]) {
    tex(scene, 'chest' + open, 16, 16, (g) => {
      R(g, 0, 2, 13, 12, 2);
      R(g, 9, 2, open ? 7 : 5, 12, open ? 6 : 8); R(g, 10, 3, open ? 8 : 6, 10, 1);
      R(g, 1, 2, 9, 12, 1); R(g, 13, 7, 9, 2, 3);
      if (open) { R(g, 1, 3, 3, 10, 4); R(g, 13, 6, 4, 4, 1); R(g, 9, 2, 10, 12, 1); R(g, 10, 3, 5, 10, 1); }
      else { R(g, 13, 7, 7, 2, 2); R(g, 9, 2, 5, 12, 1); }
    });
  }
  tex(scene, 'glow', 64, 64, (g) => {
    for (let r = 32; r > 0; r -= 4) {
      g.fillStyle = `rgba(255,255,255,${0.05 + (32 - r) / 32 * 0.16})`;
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) if (Math.hypot(x - 31.5, y - 31.5) < r && (x + y) % 2 === 0) g.fillRect(x, y, 1, 1);
    }
    for (let r = 32; r > 0; r -= 4) {
      g.fillStyle = `rgba(255,255,255,${0.05 + (32 - r) / 32 * 0.16})`;
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) if (Math.hypot(x - 31.5, y - 31.5) < r && (x + y) % 2 === 1 && r < 20) g.fillRect(x, y, 1, 1);
    }
  });
  const blob = (g, cx, cy, rx, ry, col) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) R(g, col, x, y);
  };
  const prop = (key, fn) => tex(scene, key, 16, 16, (g) => { fn(g); outline(g, 16, 16); });
  const rc = (g, x, y, w, h, col) => R(g, col, x, y, w, h); // x,y,w,h,colour (friendlier order)
  prop('pot', (g) => {
    rc(g, 6, 3, 4, 3, 9);                  // neck
    rc(g, 5, 3, 6, 1, 10);                 // lip
    blob(g, 8, 9.5, 5.2, 4.8, 9);          // body (shadow)
    blob(g, 7.4, 9, 4.2, 4, 10);           // body (light)
    rc(g, 5, 7, 2, 2, 5);                  // glint
    rc(g, 6, 11, 4, 1, 9);                 // band
  });
  prop('barrel', (g) => {
    blob(g, 8, 8.5, 6, 6, 9);
    blob(g, 8, 8.5, 4.6, 4.6, 10);
    for (const x of [6, 8, 10]) rc(g, x, 4, 1, 9, 9);      // staves
    rc(g, 3, 5, 10, 1, 1); rc(g, 3, 11, 10, 1, 1);        // hoops
  });
  prop('urn', (g) => {
    rc(g, 6, 3, 4, 3, 2);
    rc(g, 5, 3, 6, 1, 4);
    blob(g, 8, 9.5, 4.8, 5, 3);
    blob(g, 7.4, 9, 3.8, 4.2, 4);
    rc(g, 6, 8, 1, 3, 1); rc(g, 7, 10, 2, 1, 1);          // crack
  });
  prop('bed', (g) => {
    rc(g, 1, 2, 14, 12, 9); rc(g, 2, 3, 12, 10, 11); rc(g, 2, 3, 12, 4, 6); rc(g, 2, 3, 5, 3, 6);
    rc(g, 8, 4, 5, 3, 5); rc(g, 3, 8, 11, 5, 3); rc(g, 3, 10, 11, 1, 4);
  });
  prop('table', (g) => {
    rc(g, 1, 3, 14, 10, 9); rc(g, 1, 4, 14, 7, 10); rc(g, 2, 5, 12, 1, 9); rc(g, 2, 9, 12, 1, 9); rc(g, 6, 6, 3, 3, 13); rc(g, 6, 6, 3, 1, 12);
  });
  prop('shelf', (g) => {
    rc(g, 1, 1, 14, 14, 9); rc(g, 2, 2, 12, 5, 1); rc(g, 2, 9, 12, 5, 1);
    for (const [x, y, c] of [[2, 3, 11], [4, 3, 15], [6, 3, 13], [8, 3, 12], [10, 3, 8], [3, 10, 14], [5, 10, 15], [8, 10, 11], [11, 10, 13]]) rc(g, x, y, 2, 3, c);
    rc(g, 2, 7, 12, 1, 10);
  });
  prop('bookshelf', (g) => {
    rc(g, 1, 1, 14, 14, 9); rc(g, 2, 2, 12, 5, 1); rc(g, 2, 9, 12, 5, 1);
    for (let i = 0; i < 6; i++) { rc(g, 2 + i * 2, 2, 2, 5, [11, 3, 13, 14, 8, 12][i]); rc(g, 2 + i * 2, 9, 2, 5, [8, 14, 12, 3, 11, 13][i]); }
    rc(g, 2, 7, 12, 1, 10);
  });
  prop('cauldron', (g) => {
    blob(g, 8, 9, 6, 5, 2); blob(g, 8, 8, 5, 4, 3); blob(g, 8, 8, 4, 3, 15); rc(g, 5, 7, 2, 1, 6); rc(g, 9, 9, 2, 1, 6); rc(g, 3, 12, 2, 3, 2); rc(g, 11, 12, 2, 3, 2);
  });
  prop('book', (g) => {
    rc(g, 3, 5, 10, 8, 11); rc(g, 4, 6, 8, 6, 5); rc(g, 4, 6, 1, 6, 11); rc(g, 6, 8, 5, 1, 4); rc(g, 6, 10, 4, 1, 4);
  });
  prop('anvil', (g) => {
    rc(g, 3, 11, 10, 3, 2); rc(g, 5, 8, 6, 4, 3); rc(g, 2, 5, 12, 4, 4); rc(g, 12, 6, 3, 2, 3); rc(g, 3, 5, 9, 1, 5);
  });
  prop('herb_berry', (g) => {
    blob(g, 8, 9, 6, 4.5, 8); blob(g, 7, 8, 4.5, 3, 7);
    for (const [x, y] of [[5, 7], [9, 6], [7, 10], [11, 9], [4, 10]]) { rc(g, x, y, 2, 2, 11); rc(g, x, y, 1, 1, 12); }
  });
  prop('herb_lily', (g) => {
    rc(g, 7, 8, 2, 6, 8);
    for (const [x, y] of [[4, 5], [7, 3], [10, 5], [5, 8], [9, 8]]) { rc(g, x, y, 3, 3, 15); rc(g, x + 1, y + 1, 1, 1, 6); }
    rc(g, 5, 11, 2, 2, 8); rc(g, 9, 11, 2, 2, 8);
  });
  prop('sign', (g) => {
    rc(g, 7, 7, 2, 8, 9);                  // post
    rc(g, 2, 2, 12, 7, 10);                // board
    rc(g, 2, 8, 12, 1, 9);
    rc(g, 4, 4, 8, 1, 9); rc(g, 4, 6, 6, 1, 9);   // "text"
  });
  // stepped radial mask used to cut light out of the darkness layer
  tex(scene, 'lightmask', 64, 64, (g) => {
    const steps = 6;
    for (let i = 0; i < steps; i++) {
      const r = 32 * (1 - i / steps);
      g.fillStyle = 'rgba(255,255,255,' + (0.2 + i * 0.03) + ')';
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) if (Math.hypot(x - 31.5, y - 31.5) < r) g.fillRect(x, y, 1, 1);
    }
  });
  tex(scene, 'warn', 16, 16, (g) => { g.fillStyle = 'rgba(200,56,60,0.35)'; g.fillRect(0, 0, 16, 16); });
}


// ---------------------------------------------------------------------------------------------------------------- daggers
// Every dagger has its own silhouette. A shape is a blade profile (length, thickness along the blade, optional sideways wave,
// optional edge notches), a guard, a grip and its own accent colours. The icon (diagonal) and the held sprite (horizontal) are
// both drawn from the same profile, so what you pick up is what you swing.
export const DAGGER_SHAPES = {
  knife:    { L: 7,  t: (i, L) => (i < L - 2 ? 2 : 1), guard: 'nub', grip: 3 },
  shiv:     { L: 7,  t: (i) => (i % 3 === 2 ? 1 : 2), guard: null, grip: 4, wrap: 6, gripCol: 10 },
  dirk:     { L: 8,  t: (i, L) => (i < L - 2 ? 2 : 1), guard: 'bar', grip: 3 },
  stiletto: { L: 11, t: () => 1, guard: 'ring', grip: 3 },
  clan:     { L: 8,  t: (i, L) => (i < 1 ? 2 : i < 5 ? 4 : i < 7 ? 3 : 1), guard: 'bar', grip: 3, guardCol: 10 },
  glass:    { L: 8,  t: (i) => [2, 3, 2, 3, 2, 2, 1, 1][i] || 1, guard: 'nub', grip: 3, gripCol: 5, guardCol: 6 },
  kris:     { L: 10, t: (i, L) => (i < 2 ? 3 : i < L - 2 ? 2 : 1), wave: (i) => Math.round(Math.sin(i * 1.15) * 1.05), guard: 'bar', grip: 3 },
  miser:    { L: 11, t: (i, L) => (i < 3 ? 3 : i < L - 3 ? 2 : 1), guard: 'bar2', grip: 3 },
  ember:    { L: 9,  t: (i, L) => (i % 2 ? 3 : 2), wave: (i) => (i > 3 ? (i % 2 ? 1 : 0) : 0), guard: 'bar', grip: 3, guardCol: 12, gripCol: 1 },
  night:    { L: 9,  t: (i, L) => (i < 2 ? 2 : i < L - 2 ? 3 : 2), wave: (i) => -Math.round((i * i) / 30), guard: 'hook', grip: 3, gripCol: 0, guardCol: 14 },
  bite:     { L: 8,  t: (i) => Math.max(1, 4 - Math.floor(i * 0.5)), wave: (i) => -Math.round((i * i) / 24), guard: null, grip: 4, wrap: 11, gripCol: 10 },
};
// pixel cells of a dagger as [x, y, colour] in blade-local coordinates: u along the blade from the hilt (grip at u < 0), v across it.
function daggerCells(shape, col) {
  const D = DAGGER_SHAPES[shape] || DAGGER_SHAPES.knife, cells = [];
  const hi = DAG_HI[col] ?? 6, lo = DAG_LO[col] ?? 1;
  for (let i = 0; i < D.L; i++) {
    const t = D.t(i, D.L), w = D.wave ? D.wave(i) : 0, top = -Math.floor((t - 1) / 2) + w;
    for (let j = 0; j < t; j++) cells.push([i, top + j, j === 0 ? hi : j === t - 1 && t > 1 ? lo : col]);
    if (shape === 'glass' && i % 2 === 0 && t > 1) cells.push([i, top + 1, 6]);               // facet flashes
    if (shape === 'ember' && i % 2 === 1) cells.push([i, top - 1, 13]);                       // little flames along the edge
  }
  for (let g = 1; g <= D.grip; g++) cells.push([-g, 0, D.wrap && g % 2 ? D.wrap : D.gripCol ?? 9]);
  cells.push([-D.grip - 1, 0, 13]);                                                         // pommel
  const gc = D.guardCol ?? 13;
  if (D.guard === 'bar') for (const v of [-2, -1, 0, 1, 2]) cells.push([0, v, v === 0 ? 4 : gc]);
  if (D.guard === 'bar2') for (const v of [-3, -2, -1, 0, 1, 2, 3]) cells.push([0, v, gc]);
  if (D.guard === 'nub') { cells.push([0, -1, gc]); cells.push([0, 1, gc]); }
  if (D.guard === 'ring') { cells.push([-1, -1, gc], [-1, 1, gc], [0, -2, gc], [0, 2, gc]); }
  if (D.guard === 'hook') { cells.push([0, 1, gc], [0, 2, gc], [-1, 2, gc]); }
  return cells;
}
export const drawDaggerIcon = (g, shape, col) => iconFromCells(g, daggerCells(shape, col));
export const drawDaggerHeld = (g, shape, col) => heldFromCells(g, daggerCells(shape, col), 24, 9, 4);

// ---------------------------------------------------------------------------------------------- staves and halberds
// Built from a few shape primitives in blade-local cells: slab (a column band between two edge functions), orb, prong, spire.
// colour letters: B/H/L = the item's colour (main/highlight/shadow), W wood, T tan, K dark, S snow, C cyan, c pale cyan, G gold,
// O orange, R red, E green, M moss, P purple, D black, I iron grey, N pale iron.

// Staff: shaft of `len` cells ending at u = 0 (the tip side is positive u); each shape draws its head.
export const STAFF_SHAPES = {
  walking: { len: 15, shaft: 'W', head(b, C) { b.orb(2, 0, 2.6, C('T'), C('W')); b.put(3, -1, C('W')); b.put(1, 1, C('W')); } },
  hazel: { len: 15, shaft: 'W', head(b, C) { b.line(0, 0, 7, -4, C('W')); b.line(0, 0, 7, 4, C('W')); b.line(2, 0, 6, 0, C('T')); b.line(7, -4, 9, -5, C('E')); b.line(7, 4, 9, 5, C('E')); b.put(8, -4, C('E')); b.put(8, 4, C('E')); b.put(6, 0, C('E')); } },
  frostbirch: { len: 15, shaft: 'S', head(b, C) { b.slab(0, 11, (u) => -2 + u * 0.18, (u) => 2 - u * 0.18, C('C')); b.slab(2, 6, (u) => -5 + (u - 2) * 0.8, () => -2, C('c')); b.slab(2, 6, () => 2, (u) => 5 - (u - 2) * 0.8, C('c')); b.slab(3, 8, () => 0, () => 0, C('S')); b.put(12, 0, C('S')); } },
  reed: { len: 15, shaft: 'E', head(b, C) { for (const v of [-4, -3, -2, -1, 0, 1, 2, 3, 4]) b.line(1, 0, 8 - Math.abs(v) * 0.5, v * 1.2, C(v % 2 ? 'E' : 'M')); b.slab(-2, 1, () => -1, () => 1, C('T')); b.put(3, -2, C('G')); b.put(4, 2, C('G')); } },
  rod: { len: 15, shaft: 'I', head(b, C) { b.slab(-1, 1, () => -1, () => 1, C('N')); b.line(1, -1, 9, -4, C('N')); b.line(1, 1, 9, 4, C('N')); b.line(9, -4, 10, -5, C('N')); b.line(9, 4, 10, 5, C('N')); b.orb(6, 0, 1.2, C('G')); b.put(6, 0, C('S')); b.line(8, -3, 7, -1, C('G')); b.line(8, 3, 7, 1, C('G')); b.put(9, 0, C('G')); b.put(10, 0, C('S')); } },
  prism: { len: 15, shaft: 'T', head(b, C) { b.slab(0, 11, (u) => -1.4 + u * 0.12, (u) => 1.4 - u * 0.12, C('C')); b.line(1, -1, 8, -5, C('C')); b.line(1, -2, 7, -5, C('c')); b.line(1, 1, 8, 5, C('C')); b.line(1, 2, 7, 5, C('c')); b.slab(2, 7, () => 0, () => 0, C('S')); b.put(12, 0, C('S')); b.put(9, -5, C('S')); b.put(9, 5, C('S')); } },
  cinder: { len: 15, shaft: 'K', head(b, C) { for (const v of [-3, -1, 1, 3]) b.line(0, 0, 4, v * 1.2, C('D')); b.orb(5, 0, 2.8, C('O'), C('R')); b.orb(5, 0, 1.2, C('G')); for (const [u, v] of [[8, -2], [8, 2], [9, 0], [7, -3], [7, 3]]) b.put(u, v, C(v % 2 ? 'O' : 'R')); } },
  tide: { len: 15, shaft: 'N', head(b, C) { b.ring(4, 0, 4, C('C')); b.ring(4, 0, 3, C('c')); b.orb(4, 0, 1.3, C('S')); b.line(0, 0, 1, -3, C('N')); b.line(0, 0, 1, 3, C('N')); b.put(8, 0, C('C')); b.put(9, 0, C('c')); b.put(4, -5, C('C')); b.put(4, 5, C('C')); } },
  scepter: { len: 14, shaft: 'G', head(b, C) { b.slab(0, 2, () => -2, () => 2, C('G')); for (const v of [-4, -2, 0, 2, 4]) b.line(2, v * 0.6, 7 - Math.abs(v) * 0.4, v, C('G')); b.orb(5, 0, 2.6, C('R'), C('O')); b.orb(5, 0, 1, C('S')); b.put(10, 0, C('G')); b.put(9, -1, C('G')); b.put(9, 1, C('G')); } },
  lode: { len: 15, shaft: 'I', head(b, C) { b.orb(3, 0, 3.4, C('I'), C('K')); b.put(1, -2, C('N')); b.put(4, 2, C('N')); b.put(2, 1, C('K')); b.line(4, 0, 11, 0, C('G')); b.line(4, -1, 9, -4, C('G')); b.line(4, 1, 9, 4, C('G')); b.line(5, -1, 10, -1, C('O')); b.put(12, 0, C('S')); b.put(10, -4, C('O')); b.put(10, 4, C('O')); } },
  winter: { len: 17, shaft: 'c', head(b, C) { b.slab(0, 15, (u) => -2.2 + u * 0.15, (u) => 2.2 - u * 0.15, C('C')); b.slab(3, 8, (u) => -6 + (u - 3) * 0.7, () => -2, C('S')); b.slab(3, 8, () => 2, (u) => 6 - (u - 3) * 0.7, C('S')); b.slab(6, 10, (u) => -4 + (u - 6) * 0.8, () => -1, C('c')); b.slab(6, 10, () => 1, (u) => 4 - (u - 6) * 0.8, C('c')); b.slab(2, 12, () => 0, () => 0, C('S')); b.put(16, 0, C('S')); } },
  ember: { len: 15, shaft: 'W', head(b, C) { b.slab(0, 3, () => -1, () => 1, C('K')); b.slab(3, 11, (u) => -3.2 + (u - 3) * 0.4 + (u % 2 ? 0 : -1), (u) => 3.2 - (u - 3) * 0.4 + (u % 2 ? 0 : 1), (u, v) => (Math.abs(v) < 1.5 ? C('G') : u % 2 ? C('O') : C('R'))); b.put(12, 0, C('G')); b.put(7, -5, C('O')); b.put(8, 5, C('O')); b.put(10, -3, C('R')); } },
};
export const HALBERD_SHAPES = {
  bill: { len: 22, shaft: 'W', head(b, C, col) { b.slab(0, 1, () => -1, () => 1, C('K')); b.line(2, 0, 7, 0, C('I')); b.line(2, 1, 5, 3, C('I')); b.line(5, 3, 6, 5, C('I')); b.line(2, -1, 2, -4, C('I')); b.put(8, 0, C('N')); } },
  iron: { len: 22, shaft: 'W', head(b, C, col) { b.slab(0, 1, () => -1, () => 1, C('K')); b.slab(2, 7, (u) => -4 + (u - 2) * 0.1, (u) => -1, C('B')); b.slab(8, 11, (u) => -1 + (u - 8) * 0.2, (u) => 0, C('H')); b.slab(2, 5, () => 1, (u) => 2 + (u - 2) * 0.3, C('L')); } },
  glaive: { len: 22, shaft: 'W', head(b, C, col) { b.slab(0, 1, () => -1, () => 1, C('K')); const w = (u) => 2.6 * (1 - ((u - 2) / 12) ** 2), c = (u) => -0.09 * (u - 2) ** 1.25; b.slab(2, 14, (u) => c(u) - w(u), (u) => c(u) + w(u), C('B')); b.slab(2, 13, (u) => c(u) - w(u), (u) => c(u) - w(u) + 0.6, C('H')); b.put(15, -3, C('N')); } },
  clan: { len: 22, shaft: 'W', head(b, C, col) { b.slab(0, 1, () => -1, () => 1, C('G')); b.slab(2, 11, (u) => (u < 3 ? -2 : u < 8 ? -4 : -3 + (u - 8) * 0.9), (u) => (u < 3 ? 2 : u < 8 ? 4 : 3 - (u - 8) * 0.9), C('B')); b.slab(5, 7, () => -1, () => 1, C('G')); b.line(3, 0, 10, 0, C('H')); } },
  bardiche: { len: 22, shaft: 'W', head(b, C, col) { b.slab(0, 1, () => -1, () => 1, C('K')); b.slab(1, 10, (u) => -8 + (u - 1) * 0.55 - Math.sin((u - 1) * 0.33) * 1.2, (u) => -1, C('B')); b.slab(1, 12, () => 0, () => 0, C('I')); b.line(2, -7, 9, -2, C('H')); b.put(13, 0, C('N')); } },
  harbour: { len: 22, shaft: 'N', head(b, C, col) { b.slab(0, 1, () => -1, () => 1, C('K')); b.slab(2, 12, (u) => -3 + (u - 2) * 0.2, (u) => 1 - (u - 2) * 0.25, C('B')); b.line(2, -3, 11, -1, C('S')); b.orb(2, 3, 1.2, C('C')); b.put(2, 3, C('S')); } },
  voulge: { len: 22, shaft: 'T', head(b, C, col) { b.slab(0, 1, () => -1, () => 1, C('c')); b.slab(2, 10, (u) => -5 + (u - 2) * 0.35, (u) => 4 - (u - 2) * 0.4, (u, v) => ((u + v) % 3 === 0 ? C('S') : C('B'))); b.put(11, 0, C('S')); b.put(12, 0, C('C')); b.line(3, -5, 4, -7, C('c')); b.line(6, 3, 7, 5, C('c')); } },
  court: { len: 22, shaft: 'K', head(b, C, col) { b.slab(0, 2, () => -1, () => 1, C('G')); b.slab(3, 8, (u) => -5 + (u - 3) * 0.3, (u) => -1, C('B')); b.slab(3, 6, () => 1, (u) => 3 - (u - 3) * 0.2, C('B')); b.slab(9, 13, (u) => -1 + (u - 9) * 0.2, (u) => 0, C('H')); b.put(3, -3, C('G')); b.put(6, -3, C('G')); b.put(3, 5, C('R')); b.line(2, 1, 2, 5, C('R')); } },
  ember: { len: 22, shaft: 'W', head(b, C, col) { b.slab(0, 1, () => -1, () => 1, C('K')); b.slab(2, 9, (u) => -5 + (u - 2) * 0.4 + ((u % 2) ? 0 : -1), (u) => -1, (u, v) => (v > -3 ? C('G') : u % 2 ? C('O') : C('R'))); b.slab(10, 14, (u) => -1 + (u - 10) * 0.25, (u) => 0, C('O')); b.slab(2, 5, () => 1, (u) => 2, C('R')); } },
  lode: { len: 22, shaft: 'I', head(b, C, col) { b.slab(0, 2, () => -1, () => 1, C('K')); b.slab(3, 10, (u) => -4 + (u - 3) * 0.3, (u) => 3 - (u - 3) * 0.2, (u, v) => ((u * 3 + v) % 4 === 0 ? C('N') : C('B'))); b.line(5, -4, 6, -7, C('G')); b.line(8, 2, 9, 5, C('G')); b.put(11, 0, C('G')); b.put(12, 0, C('O')); } },
  reaper: { len: 24, shaft: 'K', head(b, C, col) { b.slab(0, 1, () => -1, () => 1, C('c')); b.slab(2, 13, (u) => -7 + Math.pow((u - 2) / 11, 2) * 5 + (u < 5 ? 0 : 0), (u) => -4 + Math.pow((u - 2) / 11, 2) * 4, C('B')); b.slab(2, 12, (u) => -7 + Math.pow((u - 2) / 11, 2) * 5, (u) => -6.4 + Math.pow((u - 2) / 11, 2) * 5, C('S')); b.put(14, -1, C('S')); b.put(12, 1, C('C')); b.put(5, 2, C('c')); b.put(8, 3, C('c')); } },
};
function longCells(set, shape, col) {
  const D = set[shape] || Object.values(set)[0], b = Cb();
  const C = (L) => col2(L, col);
  for (let u = -D.len; u < 0; u++) b.put(u, 0, u % 5 === 0 && D.shaft === 'W' ? C('T') : C(D.shaft));
  b.put(-D.len - 1, 0, C('G'));
  D.head(b, C, col);
  return b.cells();
}
export const drawStaffIcon = (g, shape, col) => iconFromCells(g, longCells(STAFF_SHAPES, shape, col));
export const drawStaffHeld = (g, shape, col) => heldFromCells(g, longCells(STAFF_SHAPES, shape, col), 36, 11, 5, 22);
export const drawHalberdIcon = (g, shape, col) => iconFromCells(g, longCells(HALBERD_SHAPES, shape, col));
export const drawHalberdHeld = (g, shape, col) => heldFromCells(g, longCells(HALBERD_SHAPES, shape, col), 42, 19, 9, 26);

// Item icons (16x16). kind picks a drawing routine; col tints it.
export function buildIcon(scene, key, kind, col = 6) {
  if (kind.startsWith('dagger_')) { tex(scene, key, 16, 16, (g) => drawDaggerIcon(g, kind.slice(7), col)); return; }
  if (isGearKind(kind)) { tex(scene, key, 16, 16, (g) => drawGearIcon(g, kind, col)); return; }
  if (kind.startsWith('staff_')) { tex(scene, key, 16, 16, (g) => drawStaffIcon(g, kind.slice(6), col)); return; }
  if (kind.startsWith('halberd_')) { tex(scene, key, 16, 16, (g) => drawHalberdIcon(g, kind.slice(8), col)); return; }
  tex(scene, key, 16, 16, (g) => {
    const l = (c, x0, y0, x1, y1) => { // pixel line
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let i = 0; i <= n; i++) R(g, c, Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n));
    };
    switch (kind) {
      case 'sword':
        l(col, 4, 11, 12, 3); l(col, 5, 11, 12, 4); l(6, 6, 10, 11, 5);
        R(g, 13, 3, 11, 4, 1); R(g, 13, 5, 9, 1, 4); l(9, 3, 12, 5, 10); R(g, 9, 2, 13, 2, 2); break;
      case 'axe':
        l(9, 7, 4, 7, 14); l(9, 8, 4, 8, 14); R(g, col, 8, 3, 6, 5); R(g, col, 9, 2, 5, 2); R(g, 6, 9, 3, 4, 1); R(g, 0, 8, 8, 6, 1); break;
      case 'spear':
        l(9, 3, 14, 12, 3); l(9, 4, 14, 13, 3); R(g, col, 11, 1, 3, 4); R(g, col, 12, 0, 1, 2); R(g, 6, 12, 1, 1, 3); break;
      case 'mace':
        l(9, 4, 14, 10, 6); l(9, 5, 14, 11, 6); R(g, col, 8, 2, 6, 6); R(g, 6, 9, 2, 2, 1); R(g, 0, 8, 8, 6, 1); R(g, col, 7, 4, 1, 2); R(g, col, 14, 4, 1, 2); break;
      case 'bow':
        for (let y = 2; y <= 13; y++) { const x = 4 + Math.round(Math.sin(((y - 2) / 11) * Math.PI) * 5); R(g, col, x, y); R(g, 9, x + 1, y); }
        l(6, 4, 2, 4, 13); R(g, 10, 5, 7, 7, 1); R(g, 6, 11, 7, 1, 1); break;
      case 'arrows':
        for (let i = 0; i < 3; i++) { l(10, 2 + i * 2, 13 - i, 11 + i, 4 - i); R(g, 6, 10 + i, 3 - i, 3, 1); R(g, col, 2 + i * 2, 12 - i, 2, 1); } break;
      case 'armor':
        R(g, col, 3, 3, 10, 10); R(g, 0, 6, 3, 4, 2); R(g, 2, 3, 3, 1, 10); R(g, 2, 12, 3, 1, 1);
        R(g, 6, 4, 6, 2, 1); R(g, 13, 7, 9, 2, 2); R(g, 0, 3, 13, 10, 1); R(g, 9, 3, 10, 10, 1); break;
      case 'charm':
        R(g, 10, 7, 2, 1, 3); R(g, 10, 6, 3, 1, 1); R(g, 10, 9, 3, 1, 1); R(g, 10, 5, 5, 1, 1); R(g, 10, 10, 5, 1, 1);
        R(g, 10, 4, 4, 1, 1); R(g, 10, 11, 4, 1, 1);
        R(g, col, 5, 7, 6, 6); R(g, 6, 6, 8, 2, 1); R(g, 0, 5, 12, 6, 1); break;
      case 'potion':
        R(g, 6, 6, 2, 4, 1); R(g, 9, 6, 1, 4, 2); R(g, col, 4, 7, 8, 7); R(g, 0, 4, 14, 8, 1); R(g, 6, 5, 8, 2, 2); R(g, 5, 3, 3, 1, 1);
        R(g, 4, 7, 7, 1, 7); R(g, 11, 7, 7, 1, 7); R(g, 6, 5, 9, 2, 1); break;
      case 'relic':
        R(g, col, 6, 2, 4, 12); R(g, col, 4, 4, 8, 8); R(g, col, 3, 6, 10, 4); R(g, 6, 6, 4, 2, 5); R(g, 6, 7, 4, 1, 3); R(g, 0, 7, 13, 2, 1); break;
      case 'coin':
        R(g, 13, 5, 5, 6, 6); R(g, 13, 4, 6, 8, 4); R(g, 12, 9, 6, 2, 2); R(g, 6, 5, 6, 1, 2); break;
      case 'fire':
        R(g, 11, 4, 4, 8, 9); R(g, 12, 6, 2, 4, 11); R(g, 13, 6, 8, 3, 3); R(g, 12, 7, 1, 2, 3); R(g, 11, 6, 0, 3, 5); break;
      case 'frost':
        R(g, 15, 7, 1, 2, 14); R(g, 15, 1, 7, 14, 2); for (let i = 0; i < 5; i++) { R(g, 5, 3 + i, 3 + i, 1, 1); R(g, 5, 12 - i, 3 + i, 1, 1); } R(g, 6, 7, 7, 2, 2); break;
      case 'shout':
        for (let i = 0; i < 3; i++) { R(g, i === 0 ? 6 : 4, 3 + i * 3, 8 - i * 3, 1, 1 + i * 6); } R(g, col, 2, 6, 3, 4); R(g, col, 4, 5, 1, 6); break;
      case 'pick': l(6, 3, 13, 11, 5); l(col, 3, 12, 11, 4); R(g, 9, 11, 3, 3, 3); R(g, 13, 2, 12, 2, 2); l(4, 4, 11, 6, 8); break;
      case 'gem': R(g, col, 6, 3, 4, 2); R(g, col, 4, 5, 8, 3); R(g, col, 5, 8, 6, 3); R(g, col, 7, 11, 2, 2); R(g, 6, 6, 4, 2, 1); R(g, 0, 4, 5, 1, 3); R(g, 0, 11, 5, 1, 3); R(g, 0, 6, 8, 1, 3); break;
      case 'ore': R(g, 3, 4, 5, 8, 8); R(g, 3, 5, 4, 6, 1); R(g, 3, 3, 6, 10, 6); R(g, col, 5, 7, 2, 2); R(g, col, 9, 9, 2, 2); R(g, col, 7, 5, 1, 1); R(g, 0, 3, 12, 10, 1); break;
      case 'ingot': R(g, col, 3, 7, 10, 5); R(g, 6, 4, 6, 8, 1); R(g, 0, 3, 12, 10, 1); R(g, 0, 3, 7, 10, 1); R(g, 3, 4, 8, 6, 1); break;
      case 'fang': R(g, col, 6, 3, 4, 3); R(g, col, 7, 6, 2, 4); R(g, col, 8, 10, 1, 2); R(g, 5, 7, 4, 1, 2); R(g, 0, 5, 3, 1, 3); break;
      case 'dust': for (const [x, y] of [[4, 8], [7, 5], [9, 9], [6, 11], [11, 7], [5, 6]]) R(g, col, x, y, 2, 2); R(g, 4, 8, 9, 2, 1); break;
      case 'berry': for (const [x, y] of [[5, 8], [9, 7], [7, 11]]) { R(g, col, x, y, 3, 3); R(g, 6, x, y, 1, 1); } R(g, 8, 8, 4, 1, 3); R(g, 8, 6, 5, 3, 1); break;
      case 'lily': R(g, 8, 8, 8, 1, 6); for (const [x, y] of [[6, 5], [9, 5], [7, 3], [5, 7], [10, 7]]) R(g, col, x, y, 2, 3); R(g, 6, 7, 6, 2, 2); break;
      case 'locket': for (let a = 0; a < 360; a += 20) R(g, 4, Math.round(8 + Math.cos(a * Math.PI / 180) * 4), Math.round(4 + Math.sin(a * Math.PI / 180) * 3)); R(g, col, 5, 8, 6, 6); R(g, 13, 6, 9, 4, 4); R(g, 0, 7, 10, 2, 1); R(g, 6, 5, 8, 2, 1); break;
      case 'fish':
        R(g, col, 3, 6, 9, 5); R(g, col, 2, 7, 1, 3); R(g, col, 12, 5, 3, 7); R(g, 6, 5, 7, 4, 1); R(g, 0, 4, 8, 1, 1); R(g, 0, 3, 6, 9, 1); R(g, 0, 3, 11, 9, 1); break;
      case 'dish':
        R(g, 5, 2, 9, 12, 2); R(g, 3, 3, 8, 10, 1); R(g, col, 4, 6, 8, 3); R(g, 9, 6, 8, 2, 1); R(g, 6, 5, 6, 1, 1); R(g, 6, 7, 6, 1, 1); break;
      case 'scroll':
        R(g, 10, 3, 3, 10, 9); R(g, 9, 3, 3, 10, 1); R(g, 9, 3, 11, 10, 1); R(g, 11, 5, 5, 1, 1); R(g, 11, 6, 8, 5, 1); R(g, 11, 8, 6, 1, 1); R(g, 11, 10, 11, 1, 1); break;
      case 'shield':
        R(g, 0, 3, 2, 10, 9); R(g, 0, 4, 11, 8, 2); R(g, 0, 6, 13, 4, 1);
        R(g, col, 4, 3, 8, 8); R(g, col, 5, 11, 6, 2); R(g, 6, 4, 3, 8, 1); R(g, 13, 7, 6, 2, 2); R(g, 2, 4, 10, 8, 1); break;
      case 'shock':
        l(13, 9, 1, 5, 8); l(13, 5, 8, 9, 8); l(13, 9, 8, 6, 15); l(13, 10, 1, 6, 8); l(6, 9, 2, 6, 8); R(g, 6, 8, 4, 1, 3); break;
      case 'heal':
        R(g, 5, 6, 2, 4, 12); R(g, 5, 2, 6, 12, 4); R(g, 8, 7, 3, 2, 10); R(g, 8, 3, 7, 10, 2); R(g, 6, 7, 3, 1, 2); break;
      case 'blink':
        R(g, 14, 2, 3, 3, 3); R(g, 14, 4, 5, 3, 3); R(g, 14, 6, 7, 3, 2); R(g, 14, 4, 9, 3, 3); R(g, 14, 2, 11, 3, 3);
        R(g, 6, 9, 3, 3, 3); R(g, 6, 11, 5, 3, 3); R(g, 6, 13, 7, 3, 2); R(g, 6, 11, 9, 3, 3); R(g, 6, 9, 11, 3, 3); R(g, 15, 7, 7, 1, 2); break;
      case 'meteor':
        R(g, 12, 8, 6, 5, 5); R(g, 13, 9, 7, 3, 3); R(g, 6, 9, 7, 1, 1); for (let i = 1; i <= 6; i++) { R(g, i < 3 ? 13 : 12, 8 - i, 6 - i, 2, 2); } R(g, 11, 4, 4, 2, 1); R(g, 11, 11, 9, 3, 1); break;
      case 'nova':
        for (const [x, y, w, h] of [[7, 1, 2, 14], [1, 7, 14, 2]]) R(g, 15, x, y, w, h);
        for (let k = 2; k <= 5; k++) { R(g, 6, 8 - k, 8 - k, 1, 1); R(g, 6, 7 + k, 8 - k, 1, 1); R(g, 6, 8 - k, 7 + k, 1, 1); R(g, 6, 7 + k, 7 + k, 1, 1); }
        R(g, 6, 7, 7, 2, 2); break;
      case 'wolf':
        R(g, 15, 3, 6, 10, 7); R(g, 6, 4, 6, 8, 1); R(g, 15, 3, 3, 2, 4); R(g, 15, 11, 3, 2, 4); R(g, 5, 4, 8, 2, 2); R(g, 5, 10, 8, 2, 2); R(g, 6, 6, 11, 4, 2); R(g, 0, 7, 9, 2, 2); R(g, 5, 7, 13, 2, 1); break;
      case 'regrow':
        R(g, 7, 7, 8, 2, 6); R(g, col, 8, 5, 2, 3); R(g, col, 4, 4, 4, 2); R(g, col, 5, 5, 4, 2); R(g, col, 9, 3, 4, 2); R(g, col, 10, 4, 4, 2); R(g, 6, 5, 4, 1, 1); R(g, 6, 10, 3, 1, 1); R(g, 13, 7, 2, 2, 2); R(g, 9, 5, 14, 6, 1); break;
      case 'thorns':
        R(g, 7, 7, 3, 2, 11); R(g, col, 3, 6, 5, 2); R(g, col, 8, 9, 5, 2); R(g, 6, 3, 4, 1, 3); R(g, 6, 12, 5, 1, 3); R(g, 6, 5, 8, 2, 1); R(g, 6, 10, 7, 2, 1); R(g, 6, 7, 2, 1, 2); R(g, 11, 4, 12, 2, 1); R(g, 9, 6, 13, 6, 1); break;
      case 'sandstorm':
        R(g, 10, 2, 3, 12, 2); R(g, col, 3, 6, 10, 2); R(g, 13, 4, 9, 8, 2); R(g, 10, 5, 12, 6, 2); R(g, 6, 4, 6, 2, 1); R(g, 13, 11, 5, 1, 1); R(g, 13, 6, 2, 1, 1); break;
      case 'sunbeam':
        R(g, col, 5, 2, 6, 6); R(g, 12, 6, 3, 4, 4); R(g, 6, 7, 4, 2, 1); R(g, col, 7, 8, 2, 7); R(g, 12, 6, 12, 4, 1); for (const [x, y] of [[2, 4], [13, 4], [3, 8], [12, 8]]) R(g, col, x, y, 1, 1); R(g, col, 7, 0, 2, 1); break;
      case 'ward':
        for (let a = 0; a < 360; a += 12) { const rx = Math.round(8 + Math.cos(a * Math.PI / 180) * 6), ry = Math.round(8 + Math.sin(a * Math.PI / 180) * 6); R(g, 15, rx, ry); R(g, 6, rx, ry - 1 < 0 ? 0 : ry, 1, 1); }
        R(g, 5, 5, 5, 6, 6); R(g, 15, 6, 6, 4, 4); break;
      default: R(g, col, 4, 4, 8, 8);
    }
  });
}

// Held weapon / shield sprites (drawn while swinging / blocking). `kind`: blade | greatblade | shield.
export function buildHeld(scene, key, kind, col = 5) {
  if (kind.startsWith('dagger_')) { tex(scene, key, 24, 9, (g) => drawDaggerHeld(g, kind.slice(7), col)); return; }
  if (isGearKind(kind)) { const z = gearHeldSize(kind); if (z) { tex(scene, key, z.W, z.H, (g) => drawGearHeld(g, kind, col)); return; } }
  if (kind.startsWith('staff_')) { tex(scene, key, 36, 11, (g) => drawStaffHeld(g, kind.slice(6), col)); return; }
  if (kind.startsWith('halberd_')) { tex(scene, key, 42, 19, (g) => drawHalberdHeld(g, kind.slice(8), col)); return; }
  if (kind === 'shield') {
    tex(scene, key, 10, 12, (g) => {
      R(g, 0, 1, 0, 8, 9); R(g, 0, 2, 9, 6, 2); R(g, 0, 3, 11, 4, 1);
      R(g, col, 2, 1, 6, 7); R(g, col, 3, 8, 4, 2); R(g, 6, 2, 1, 6, 1); R(g, 2, 2, 7, 6, 1); R(g, 13, 4, 4, 2, 2); R(g, 3, 3, 8, 1, 1);
    });
    return;
  }
  if (kind === 'spear') {
    tex(scene, key, 24, 5, (g) => {
      R(g, 0, 0, 1, 23, 3); R(g, 9, 1, 2, 17, 1);               // shaft
      R(g, 0, 17, 0, 6, 5); R(g, col, 18, 1, 5, 3); R(g, 6, 18, 2, 4, 1); R(g, 0, 23, 2, 1, 1);   // head
    });
    return;
  }
  if (kind === 'mace') {
    tex(scene, key, 16, 9, (g) => {
      R(g, 0, 0, 3, 11, 3); R(g, 9, 1, 4, 10, 1);               // haft
      R(g, 0, 10, 0, 6, 9); R(g, col, 11, 1, 4, 7); R(g, 6, 11, 2, 2, 5); R(g, 0, 12, 4, 1, 1);   // flanged head
    });
    return;
  }
  if (kind === 'axe') {
    tex(scene, key, 16, 10, (g) => {
      R(g, 0, 0, 4, 12, 3); R(g, 9, 1, 5, 11, 1);               // haft
      R(g, 0, 8, 0, 7, 10); R(g, col, 9, 1, 5, 8); R(g, 6, 9, 2, 1, 6); R(g, 0, 11, 4, 1, 2);     // blade
    });
    return;
  }
  const L = kind === 'greatblade' ? 17 : 12;
  tex(scene, key, L + 4, 7, (g) => {
    R(g, 0, 0, 1, L + 4, 5);                 // outline
    R(g, 9, 1, 2, 3, 3);                     // grip
    R(g, 13, 4, 0, 2, 7);                    // crossguard
    R(g, col, 6, 2, L - 3, 3); R(g, 0, L + 3, 3, 1, 1);
    R(g, 6, 6, 2, L - 4, 1);                 // edge highlight
  });
}

