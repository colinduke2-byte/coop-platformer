// VX-05 (rest): a hit on a weak spot or a resisted hit shows in its damage number instead of a WEAK / RESIST label stacked
// over it. Enemy.takeHit marks the foe's spot (markNum); the number printed there this frame takes the style:
//   weak    bigger (2x) and orange
//   resist  small (a 3x5 digit font) and grey
// With damage numbers switched off the labels come back (Enemy.takeHit).
import Phaser from 'phaser';
import { PAL } from '../config.js';

export const NUM_STYLE = { weak: { col: 12, scale: 2 }, resist: { col: 4, small: true } };

// 3x5 digits, built per palette colour the first time they are needed
const DIG = ['###/#.#/#.#/#.#/###', '.#./##./.#./.#./###', '###/..#/###/#../###', '###/..#/.##/..#/###', '#.#/#.#/###/..#/..#',
  '###/#../###/..#/###', '###/#../###/#.#/###', '###/..#/.#./.#./.#.', '###/#.#/###/#.#/###', '###/#.#/###/..#/###'];
export function smallFont(scene, col) {
  const key = 'fsmall' + col;
  if (scene.cache.bitmapFont.exists(key)) return key;
  const cv = document.createElement('canvas'); cv.width = 40; cv.height = 5;
  const ctx = cv.getContext('2d'); ctx.fillStyle = PAL[col];
  DIG.forEach((g, i) => g.split('/').forEach((row, y) => [...row].forEach((c, x) => { if (c === '#') ctx.fillRect(i * 4 + x, y, 1, 1); })));
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, cv);
  scene.cache.bitmapFont.add(key, Phaser.GameObjects.RetroFont.Parse(scene, { image: key, width: 4, height: 5, chars: '0123456789', charsPerRow: 10, spacing: { x: 0, y: 0 }, lineSpacing: 0, offset: { x: 0, y: 0 } }));
  return key;
}
