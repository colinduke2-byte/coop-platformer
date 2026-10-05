import { launch } from './harness.mjs';
import fs from 'node:fs';
const h = await launch();
await h.open('scene=game&map=forest&spawn=west');
await h.sleep(1200);
const url = await h.ev(() => {
  const g = window.__ff.game.scene.getScene('Game'); const b = g.built;
  const PAL = ['#0b0e1a','#1c2338','#2e3a5c','#4a5c86','#7b8fb5','#b4c7e0','#eaf2f8','#2a4a3a','#3f7050','#6a4a38','#a07850','#c8383c','#f08a30','#f4d460','#8a5aa8','#5cc8d8'];
  const COL = {0:5,1:5,2:15,3:3,4:7,5:10,9:3,10:1,11:4,12:5,13:12,14:0,15:9,18:12,20:4,21:4,22:5,23:5,24:10,25:3,26:1,27:9,28:9,29:15,30:5};
  const s = 5; const cv = document.createElement('canvas'); cv.width = b.w * s; cv.height = b.h * s; const c = cv.getContext('2d');
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) { c.fillStyle = PAL[COL[b.grid[y][x]] ?? 0]; c.fillRect(x * s, y * s, s, s); }
  const dot = { enemy: '#c8383c', chest: '#f4d460', shrine: '#8a5aa8', fire: '#f08a30', exit: '#ffffff', dig: '#a07850', node: '#00ffff', deer: '#00ff00', herb: '#3f7050' };
  for (const e of b.entities) { if (!dot[e.t]) continue; c.fillStyle = dot[e.t]; c.fillRect(e.x * s - 1, e.y * s - 1, 3, 3); }
  return cv.toDataURL();
});
fs.writeFileSync('test/out/overview.png', Buffer.from(url.split(',')[1], 'base64'));
await h.close();
