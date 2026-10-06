// Renders docs/world_map.png (the Hollow Reach for a seed) and docs/creatures.png (every enemy model).
// Usage: node tools/render_docs.mjs [seed]
import fs from 'fs';
import { launch } from '../test/harness.mjs';
const seed = Number(process.argv[2] || 424242);
const h = await launch();
await h.open(`scene=game&map=village&spawn=start&seed=${seed}`);
await h.sleep(800);
const out = await h.ev(async (seed) => {
  const M = await import('/src/data/maps.js'), CF = await import('/src/config.js'), E = await import('/src/data/enemies.js'), S = window.__ff.S;
  S.seed = seed;
  const r = M.getReach(), { T, C, TILE } = CF, hex = (i) => '#' + (C[i] ?? 0).toString(16).padStart(6, '0');
  const COL = { [TILE.SNOW]: 5, [TILE.SNOW2]: 5, [TILE.SNOW3]: 5, [TILE.SNOW4]: 5, [TILE.TUFT]: 5, [TILE.ICE]: 4, [TILE.ICE2]: 4, [TILE.STONE]: 3, [TILE.PINE]: 7, [TILE.PATH]: 10, [TILE.PATH2]: 10, [TILE.WOODFLOOR]: 10, [TILE.WOODWALL]: 9, [TILE.ROOF]: 6, [TILE.CFLOOR]: 3, [TILE.CFLOOR2]: 3, [TILE.CWALL]: 1, [TILE.CWALL2]: 1, [TILE.ROCK]: 4, [TILE.PILLAR]: 5, [TILE.FENCE]: 9, [TILE.DEADTREE]: 9, [TILE.STUMP]: 9, [TILE.GRAVE]: 4, [TILE.SARCO]: 4, [TILE.FIRE]: 12 };
  // ---------------- world map
  const Z = 6, W = r.w * Z, H = r.h * Z, TOP = 40, LEG = 150;
  const c = document.createElement('canvas'); c.width = W + LEG; c.height = H + TOP; const x = c.getContext('2d');
  x.fillStyle = '#0d1020'; x.fillRect(0, 0, c.width, c.height);
  for (let ty = 0; ty < r.h; ty++) for (let tx = 0; tx < r.w; tx++) { x.fillStyle = hex(COL[r.grid[ty][tx]] ?? 3); x.fillRect(tx * Z, TOP + ty * Z, Z, Z); }
  const POI = { fort: ['#e33', 'F', 'Ironwatch Keep'], temple: ['#4cf', 'T', 'Drowned Chapel'], rootvault: ['#4d4', 'R', 'Rootvault'], throne: ['#fff', 'W', 'Winter Throne'], maw: ['#9ef', 'M', 'Glacial Maw'], nest: ['#f80', 'N', 'Dragon nest'], champion: ['#fd0', 'C', 'Champion'], ruin: ['#bbb', 'r', 'Ruin'], beardn: ['#a74', 'B', 'Bear den'], spring: ['#6df', 'h', 'Hot spring'], camp: ['#f55', 'b', 'Bandit camp'], den: ['#c66', 'w', 'Wolf den'], barrow: ['#c8f', 'o', 'Barrow'], tower: ['#ddd', 't', 'Tower'], grove: ['#7e7', 'g', 'Grove'], rest: ['#fa4', '*', 'Campfire'] };
  const big = new Set(['fort', 'temple', 'rootvault', 'throne', 'maw', 'nest']);
  x.font = 'bold 11px monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
  for (const p of r.pois) {
    const d = POI[p.kind]; if (!d) continue;
    const px = p.x * Z + Z / 2, py = TOP + p.y * Z + Z / 2, rad = big.has(p.kind) ? 9 : 6;
    x.fillStyle = '#000c'; x.beginPath(); x.arc(px, py, rad + 1.5, 0, 7); x.fill();
    x.fillStyle = d[0]; x.beginPath(); x.arc(px, py, rad, 0, 7); x.fill();
    x.fillStyle = '#000'; x.fillText(d[1], px, py + 1);
    if (big.has(p.kind)) { x.fillStyle = '#fff'; x.strokeStyle = '#000'; x.lineWidth = 3; x.font = 'bold 12px sans-serif'; x.strokeText(d[2], px, py - 16); x.fillText(d[2], px, py - 16); x.font = 'bold 11px monospace'; }
  }
  const st = { x: 4, y: 15 };
  x.fillStyle = '#fff'; x.strokeStyle = '#000'; x.lineWidth = 3; x.font = 'bold 12px sans-serif'; x.strokeText('Hollowfrost (start)', st.x * Z + 70, TOP + st.y * Z); x.fillText('Hollowfrost (start)', st.x * Z + 70, TOP + st.y * Z);
  x.textAlign = 'left'; x.fillStyle = '#fff'; x.font = 'bold 18px sans-serif'; x.fillText(`The Hollow Reach  -  seed ${seed}  (${r.w} x ${r.h} tiles)`, 10, 22);
  x.font = '11px sans-serif'; let ly = TOP + 8; const counts = {}; r.pois.forEach((p) => { counts[p.kind] = (counts[p.kind] || 0) + 1; });
  for (const [k, d] of Object.entries(POI)) { if (!counts[k]) continue; x.fillStyle = d[0]; x.beginPath(); x.arc(W + 16, ly + 6, 6, 0, 7); x.fill(); x.fillStyle = '#fff'; x.fillText(`${d[2]} x${counts[k]}`, W + 28, ly + 10); ly += 20; }
  const map = c.toDataURL();
  // ---------------- creature sheet
  const tex = window.__ff.game.textures, S2 = 5, cells = [];
  const seen = new Map();
  for (const [k, cfg] of Object.entries(E.ENEMIES)) { const t = cfg.tex; if (seen.has(t)) { seen.get(t).names.push(cfg.name || k); continue; } const cell = { tex: t, names: [cfg.name || k], side: !!cfg.sideOnly || tex.get(t).has('side0') && !tex.get(t).has('down0'), kind: cfg.kind }; seen.set(t, cell); cells.push(cell); }
  cells.sort((a, b) => (a.kind === 'boss') - (b.kind === 'boss'));
  const CW = 210, CH = 190, cols = 6, rows = Math.ceil(cells.length / cols);
  const cc = document.createElement('canvas'); cc.width = cols * CW; cc.height = rows * CH + 50; const y = cc.getContext('2d');
  y.fillStyle = '#1a2038'; y.fillRect(0, 0, cc.width, cc.height); y.imageSmoothingEnabled = false;
  y.fillStyle = '#fff'; y.font = 'bold 20px sans-serif'; y.textAlign = 'left'; y.fillText('Frostfall bestiary - every creature model', 12, 30);
  cells.forEach((cell, i) => {
    const ox = (i % cols) * CW, oy = 50 + Math.floor(i / cols) * CH;
    y.fillStyle = cell.kind === 'boss' ? '#2b2440' : '#232c4a'; y.fillRect(ox + 4, oy + 4, CW - 8, CH - 8);
    const T0 = tex.get(cell.tex), fn = T0.has(cell.side ? 'side0' : 'down0') ? (cell.side ? 'side0' : 'down0') : T0.getFrameNames()[0];
    const f = T0.get(fn), src = T0.getSourceImage(), s = Math.max(1, Math.min(Math.floor(130 / f.width), Math.floor(120 / f.height), 8));
    y.drawImage(src, f.cutX, f.cutY, f.cutWidth, f.cutHeight, ox + (CW - f.width * s) / 2, oy + 12 + (120 - f.height * s) / 2, f.width * s, f.height * s);
    y.fillStyle = cell.kind === 'boss' ? '#fc6' : '#fff'; y.font = 'bold 14px sans-serif'; y.textAlign = 'center';
    const label = cell.names.join(' / '); const parts = label.length > 26 ? [label.slice(0, label.lastIndexOf(' / ', 26) > 0 ? label.lastIndexOf(' / ', 26) : 26), label.slice(label.lastIndexOf(' / ', 26) > 0 ? label.lastIndexOf(' / ', 26) + 3 : 26)] : [label];
    parts.forEach((p, j) => y.fillText(p, ox + CW / 2, oy + 150 + j * 16));
    y.fillStyle = '#8a96c0'; y.font = '11px sans-serif'; y.fillText(`${cell.kind}  ${f.width}x${f.height}px`, ox + CW / 2, oy + CH - 12);
  });
  return { map, creatures: cc.toDataURL(), n: cells.length };
}, seed);
fs.writeFileSync('docs/world_map.png', Buffer.from(out.map.split(',')[1], 'base64'));
fs.writeFileSync('docs/creatures.png', Buffer.from(out.creatures.split(',')[1], 'base64'));
console.log('wrote docs/world_map.png and docs/creatures.png', out.n, 'models');
await h.close();
