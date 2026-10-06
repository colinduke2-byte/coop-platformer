import { launch } from './harness.mjs';
import fs from 'fs';
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=1');
await h.sleep(800);
const url = await h.ev(() => { const img = window.__ff.game.textures.get('spr_dragon').getSourceImage(); const c = document.createElement('canvas'); c.width = img.width * 6; c.height = img.height * 6; const x = c.getContext('2d'); x.fillStyle = '#9db'; x.fillRect(0, 0, c.width, c.height); x.imageSmoothingEnabled = false; x.drawImage(img, 0, 0, c.width, c.height); return c.toDataURL(); });
fs.writeFileSync(new URL('./out/dragonsheet.png', import.meta.url).pathname, Buffer.from(url.split(',')[1], 'base64'));
await h.close();
