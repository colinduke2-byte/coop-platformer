// VX-23: a title card when you walk into a region's overworld: a dark band across the middle of the screen with the region's
// name in its own colour (2x) and a flourish of its weather in the band (ash, glints, leaves...). The first arrival in a save
// gets the full card (2.6 s); later arrivals a quiet one (1.2 s, no flourish). Purely visual; the HUD's area line is unchanged.
import { registerListener, registerTicker } from '../scenes/gameHooks.js';
import { CORE_ORDER } from '../scenes/gameTickers.js';
import { W, C } from '../config.js';
import { txt } from '../art/font.js';
import { S } from '../systems/state.js';
import { REGIONS, regionOfMap } from '../data/regions.js';
import { bus } from '../systems/bus.js';

const LOOK = {
  reach: { col: 6, fl: [5, 6, 4] }, ashen: { col: 12, fl: [2, 12, 13] }, coast: { col: 5, fl: [6, 15, 4] }, kingdom: { col: 13, fl: [5, 13, 4] },
  fens: { col: 8, fl: [7, 8, 4] }, highlands: { col: 4, fl: [5, 13, 6] }, glasswood: { col: 15, fl: [15, 6, 15] }, vale: { col: 8, fl: [13, 8, 11] },
  sunscorch: { col: 13, fl: [10, 13, 12] }, underdeep: { col: 14, fl: [14, 15, 8] },
};
const cards = new WeakMap();          // scene -> the card on screen

registerListener('area', (sc, name) => {
  const region = regionOfMap(sc.mapId), def = REGIONS[region];
  if (!def || def.map !== sc.mapId || !LOOK[region]) return;
  const seen = (S.flags.regionCards ||= {});
  const first = !seen[region];
  seen[region] = true;
  const look = LOOK[region], y0 = 104, hgt = first ? 34 : 22;      // below the hero, above the toasts
  const band = sc.add.rectangle(0, y0, W, hgt, C[0], 0.78).setOrigin(0).setScrollFactor(0).setDepth(99996);
  const line = sc.add.graphics().setScrollFactor(0).setDepth(99997);
  line.fillStyle(C[look.col], 1); line.fillRect(24, y0 + 2, W - 48, 1); line.fillRect(24, y0 + hgt - 3, W - 48, 1);
  const t = txt(sc, 0, y0 + (first ? 10 : 5), name, look.col).setScrollFactor(0).setDepth(99998);
  if (first) t.setScale(2);
  t.x = Math.round((W - t.width) / 2);              // (a BitmapText's width already counts its scale)
  const parts = first ? Array.from({ length: 22 }, (_, i) => ({ x: (i * 53) % W, y: y0 + 4 + ((i * 7) % (hgt - 8)), v: 8 + (i % 5) * 4, c: look.fl[i % 3] })) : [];
  const old = cards.get(sc); if (old) old.done();
  const card = { t: 0, life: first ? 2.6 : 1.2, parts, line, band, txt: t, fx: sc.add.graphics().setScrollFactor(0).setDepth(99997), y0, hgt,
    done() { band.destroy(); line.destroy(); t.destroy(); this.fx.destroy(); cards.delete(sc); } };
  cards.set(sc, card);
  bus.emit('titlecard', name, card.life);     // the HUD drops its place-name plate for this arrival (no double banner) and holds its news until the card goes
}, 'artTitleCard');

registerTicker('artTitleCard', (sc, dt) => {
  const c = cards.get(sc);
  if (!c) return;
  if (!c.band.scene) { cards.delete(sc); return; }
  c.t += dt;
  const a = c.t < 0.3 ? c.t / 0.3 : c.t > c.life - 0.5 ? Math.max(0, (c.life - c.t) / 0.5) : 1;
  c.band.setAlpha(0.78 * a); c.line.setAlpha(a); c.txt.setAlpha(a);
  const g = c.fx; g.clear();
  for (const p of c.parts) {
    p.x = (p.x + p.v * dt) % W;
    g.fillStyle(C[p.c], a * (0.5 + 0.5 * Math.sin(c.t * 4 + p.x))); g.fillRect(Math.floor(p.x), p.y, 1, 1);
  }
  if (c.t >= c.life) c.done();
}, CORE_ORDER.lighting + 47);
