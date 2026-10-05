import { launch } from './harness.mjs';
import fs from 'node:fs';
const h = await launch();
await h.open('scene=game'); await h.sleep(600);
const data = await h.ev(() => {
  const keys = ['icon_shock', 'icon_heal', 'icon_ward', 'icon_wooden_shield', 'icon_iron_shield', 'icon_lockpick', 'icon_iron_ingot', 'icon_wolf_fang', 'icon_bone_dust', 'icon_snowberry', 'icon_frost_lily', 'icon_iron_greatsword', 'held_iron_sword', 'held_iron_greatsword', 'held_wooden_shield', 'spr_warden#down0', 'spr_chief#down0', 'spr_conjurer#down0', 'spr_alpha#side0'];
  const S = 6;
  const cv = document.createElement('canvas'); cv.width = keys.length * 16 * S; cv.height = 16 * S * 2;
  const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
  [['#b4c7e0', 0], ['#2e3a5c', 1]].forEach(([bg, row]) => {
    ctx.fillStyle = bg; ctx.fillRect(0, row * 16 * S, cv.width, 16 * S);
    keys.forEach((k, i) => {
      const [t, f] = k.split('#'); const tex = window.__ff.game.textures.get(t); const fr = f ? tex.get(f) : tex.get();
      ctx.drawImage(tex.getSourceImage(), fr.cutX, fr.cutY, fr.width, fr.height, i * 16 * S, row * 16 * S, fr.width * S, fr.height * S);
    });
  });
  return cv.toDataURL('image/png');
});
fs.writeFileSync(new URL('./out/sheet3.png', import.meta.url).pathname, Buffer.from(data.split(',')[1], 'base64'));
await h.close();
