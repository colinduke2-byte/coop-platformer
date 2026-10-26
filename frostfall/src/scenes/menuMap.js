import { C, T, TILE } from '../config.js';
import { PLACE_COL, placeName } from '../world/discovery.js';
import { S } from '../systems/state.js';
import { MAPS } from '../data/maps.js';
import { TARGETS, trackedId } from '../data/quests.js';
import { travelMenu } from '../world/travel.js';
import { runScript } from '../systems/dialogue.js';
import { eventMark, EVENT_MARK_COL } from '../world/questmarks.js';
import { panel } from '../ui/panel.js';
import { NPC_DEFS } from '../data/dialogue.js';
import { keys } from '../systems/keys.js';
import { sfx } from '../audio/sfx.js';
import { bus } from '../systems/bus.js';
import { settings } from '../systems/settings.js';
import { padHint } from '../systems/access.js';
import { getRegion } from '../data/maps.js';
import { REGIONS, unlockedRegions, regionOfMap } from '../data/regions.js';

const COL = {
  [TILE.SNOW]: 5, [TILE.SNOW2]: 5, [TILE.ICE]: 4, [TILE.STONE]: 3, [TILE.PINE]: 7, [TILE.PATH]: 10, [TILE.WOODFLOOR]: 10,
  [TILE.WOODWALL]: 9, [TILE.ROOF]: 6, [TILE.CFLOOR]: 3, [TILE.CWALL]: 1, [TILE.ROCK]: 4, [TILE.PILLAR]: 5, [TILE.BRAZIER]: 12,
  [TILE.STAIRS]: 0, [TILE.FENCE]: 9, [TILE.RUG]: 11, [TILE.DOOR]: 9, [TILE.FIRE]: 12, [TILE.WINDOW]: 13, [TILE.GRAVE]: 4, [TILE.SARCO]: 4,
  [TILE.ASH]: 2, [TILE.BASALT]: 1, [TILE.LAVA]: 11, [TILE.ICESHELF]: 5, [TILE.PACKICE]: 4, [TILE.SHINGLE]: 3, [TILE.WRECK]: 9, [TILE.MARBLE]: 5, [TILE.RUINWALL]: 3, [TILE.MOSS]: 8, [TILE.SNOW3]: 5, [TILE.SNOW4]: 5, [TILE.SNOWDRIFT]: 5, [TILE.FROSTBLOOM]: 5, [TILE.BOULDER]: 4, [TILE.EMBERBLOOM]: 1, [TILE.LILYPAD]: 7, [TILE.MARBLEMOSS]: 5, [TILE.GLASSBLOOM]: 7, [TILE.SPORES]: 1, [TILE.MEADOW]: 8, [TILE.FLOWERS]: 8, [TILE.BIRCH]: 8, [TILE.POND]: 15, [TILE.HEARTROOT]: 13, [TILE.SAND]: 10, [TILE.DUNE]: 10, [TILE.SANDSTONE]: 9, [TILE.CACTUS]: 8, [TILE.OASIS]: 15, [TILE.GLYPH]: 13, [TILE.SANDRUIN]: 9, [TILE.PATH2]: 10, [TILE.CFLOOR2]: 3, [TILE.CWALL2]: 1, [TILE.DEADTREE]: 9, [TILE.STUMP]: 9, [TILE.ICE2]: 4, [TILE.TUFT]: 5, [TILE.BOG]: 7, [TILE.BOGTREE]: 9, [TILE.BOGREED]: 8, [TILE.HEATHROCK]: 3, [TILE.BLACKWATER]: 1, [TILE.BOARDWALK]: 9, [TILE.HEATH]: 10, [TILE.SLATE]: 3, [TILE.GLASSMOSS]: 8, [TILE.CRYSTAL]: 15, [TILE.GLADEPATH]: 5, [TILE.DEEPSTONE]: 1, [TILE.GLOWCAP]: 8, [TILE.CAVERNPOOL]: 0,
};
export const FOG = 2; // fog chunk = 2x2 tiles

export function fogDims(w, h) { return { cw: Math.ceil(w / FOG), ch: Math.ceil(h / FOG) }; }

// Zoom steps for a map: small maps scale up from their fitted size; big overworlds start from a whole-map overview.
const scalesOf = (b) => { const fit = Math.min((VW - 4) / b.w, (VH - 4) / b.h); return fit >= 1 ? [1, 2, 3].map((z) => Math.floor(fit) * z) : [Math.max(0.25, Math.floor(fit * 20) / 20), 1, 2, 3]; };
const VX = 10, VY = 37, VW = 300, VH = 98;           // the map view: below the title line, above the two-row legend

// The map being looked at: the current map, or another unlocked region's overworld (R switches).
const viewOf = (gs, view) => {
  if (!view || view === gs.mapId) return { id: gs.mapId, b: gs.built, here: true, fires: gs.fires || [] };
  const b = getRegion(REGIONS[regionOfMap(view)].id);
  const fires = b.entities.filter((e) => e.t === 'fire' && e.rest).map((e) => ({ x: (e.x + 0.5) * T, y: (e.y + 0.5) * T, tx: e.x, ty: e.y, key: `${view}:${e.x},${e.y}`, map: view }));
  return { id: view, b, here: false, fires };
};

// Terrain is baked once per (map, scale) into a canvas texture and cropped to the view, so a very large overworld costs the
// same to draw as a small one. Markers go on their own layer above it.
// A zoomed-out overview (less than a pixel per tile) is baked at one pixel per tile and shrunk when drawn: drawing quarter-pixel
// rectangles left the overview almost black.
// The bake is kept between menu openings (textures are game-wide) until the map, scale or fog changes, and is written as
// raw pixels in one go rather than one fillRect per tile (the Hollow Reach is ~200k tiles).
let bakeCache = null;
const RGB = [];
function bakeTerrain(m, vid, b, scIn, fog) {
  const sc = Math.max(1, scIn), sig = vid + '|' + sc;
  if (bakeCache && bakeCache.sig === sig && bakeCache.fog === fog && m.textures.exists(bakeCache.key)) { m._bake = bakeCache; return bakeCache.key; }
  const W2 = b.w * sc, H2 = b.h * sc;
  const cv = document.createElement('canvas'); cv.width = W2; cv.height = H2;
  const ctx = cv.getContext('2d'), { cw } = fogDims(b.w, b.h);
  const img = ctx.createImageData(W2, H2), px = new Uint32Array(img.data.buffer);
  const le = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;          // byte order of the pixel words
  const word = (col) => {
    if (RGB[col] === undefined) { const c = C[col] ?? C[0], r = (c >> 16) & 255, g = (c >> 8) & 255, bl = c & 255; RGB[col] = le ? (0xff000000 | (bl << 16) | (g << 8) | r) >>> 0 : ((r << 24) | (g << 16) | (bl << 8) | 0xff) >>> 0; }
    return RGB[col];
  };
  for (let ty = 0; ty < b.h; ty++) {
    const row = b.grid[ty], frow = Math.floor(ty / FOG) * cw;
    for (let tx = 0; tx < b.w; tx++) {
      if (fog.charCodeAt(frow + Math.floor(tx / FOG)) !== 49) continue;       // '1' = seen
      const v = word(COL[row[tx]] ?? 0);
      if (sc === 1) px[ty * W2 + tx] = v;
      else for (let yy = 0; yy < sc; yy++) px.fill(v, (ty * sc + yy) * W2 + tx * sc, (ty * sc + yy) * W2 + tx * sc + sc);
    }
  }
  ctx.putImageData(img, 0, 0);
  if (bakeCache && m.textures.exists(bakeCache.key)) m.textures.remove(bakeCache.key);
  const key = 'mapbake' + (bakeCache ? bakeCache.n + 1 : 1);
  m.textures.addCanvas(key, cv);
  bakeCache = { sig, fog, key, n: bakeCache ? bakeCache.n + 1 : 1 };
  m._bake = bakeCache;                                      // (tools and tests look here)
  return key;
}

export function mapTab(m) {
  const layers = () => {
    // the Menu scene object is reused each time the menu opens, but its game objects are destroyed when it closes: build the
    // layers again whenever the old ones are gone (checking only that they exist left every reopened map blank)
    if (m.mapOver?.scene && m.mapTerrain?.scene) return;
    m.mapTerrain = m.add.container(0, 0).setDepth(0.5); m.mapOver = m.add.graphics().setDepth(0.8); m.dyn.setDepth(1);
    if (!m._mapClearWrapped) {
      const oc = m.clear.bind(m);
      m.clear = () => { oc(); if (m.mapTerrain?.scene) m.mapTerrain.removeAll(true); if (m.mapOver?.scene) m.mapOver.clear(); };
      m._mapClearWrapped = true;
    }
  };
  let zoom = null, cur = null, curMode = false, rep = 0, view = null;     // zoom null: pick a readable start the first time
  return {
    name: 'MAP',
    viewId: () => view || m.gs.mapId,
    get help() { return curMode ? 'W/A/S/D MOVE  E WAYPOINT  T NEXT FIRE  F TRAVEL  ESC DONE' : 'E CURSOR  F TRAVEL  W/S ZOOM'; },
    captureLR: () => curMode,
    busy: () => curMode,                            // in cursor mode ESC (or B) leaves the cursor, not the whole menu
    input() {
      const gs = m.gs, vw = viewOf(gs, view), b = vw.b;
      m.dirty = true;
      if (!cur) cur = { x: Math.floor(gs.player.x / T), y: Math.floor((gs.player.y + 3) / T) };
      if (!curMode && keys.pressed('shout')) {
        const l = unlockedRegions().map((id) => REGIONS[id].map), seq = l.includes(gs.mapId) ? l : [gs.mapId, ...l];
        if (seq.length > 1) {
          const next = seq[(seq.indexOf(vw.id) + 1) % seq.length];
          view = next === gs.mapId ? null : next;
          const nb = viewOf(gs, view).b;
          cur = view ? { x: Math.floor(nb.w / 2), y: Math.floor(nb.h / 2) } : { x: Math.floor(gs.player.x / T), y: Math.floor((gs.player.y + 3) / T) };
          zoom = null; sfx.play('select');
        }
      }
      // W / S zoom in and out (Q too, as before); in cursor mode they move the cursor
      if (keys.pressed('swap') || (!curMode && keys.pressed('up'))) { zoom = ((zoom ?? 0) + 1) % scalesOf(b).length; sfx.play('select'); }
      if (!curMode && keys.pressed('down')) { const n = scalesOf(b).length; zoom = ((zoom ?? 0) + n - 1) % n; sfx.play('select'); }
      if (keys.pressed('interact')) {
        if (!curMode) { curMode = true; sfx.play('select'); }
        else {
          const wp = S.flags.waypoint;
          if (wp && wp.map === vw.id && Math.abs(wp.x - cur.x) < 2 && Math.abs(wp.y - cur.y) < 2) { delete S.flags.waypoint; bus.emit('toast', 'WAYPOINT REMOVED', 4); }
          else { S.flags.waypoint = { map: vw.id, x: cur.x, y: cur.y }; bus.emit('toast', 'WAYPOINT SET', 13); }
          curMode = false; sfx.play('equip');
        }
      }
      if (curMode && keys.pressed('lockon')) {       // T: hop the cursor to the next campfire you have found
        const fires = vw.fires.filter((q) => S.flags.fires?.[q.key]);
        if (fires.length) {
          const at = fires.findIndex((q) => q.tx === cur.x && q.ty === cur.y);
          const f = fires[(at + 1) % fires.length]; cur = { x: f.tx, y: f.ty }; sfx.play('move');
        } else { bus.emit('toast', 'NO CAMPFIRES FOUND HERE YET', 4); sfx.play('nostamina'); }
      }
      if (!curMode && keys.pressed('block')) { m.close(); runScript(() => travelMenu(gs)); return; }     // WQ13: F with no cursor: the travel list
      if (curMode && keys.pressed('block')) {
        const f = vw.fires.find((q) => S.flags.fires?.[q.key] && Math.abs(q.tx - cur.x) <= 1 && Math.abs(q.ty - cur.y) <= 1);
        if (f) { m.close(); gs.fastTravel(f); return; }
      }
      if (curMode) {
        rep -= 1;
        const dx = (keys.isDown('right') ? 1 : 0) - (keys.isDown('left') ? 1 : 0), dy = (keys.isDown('down') ? 1 : 0) - (keys.isDown('up') ? 1 : 0);
        if ((dx || dy) && (rep <= 0 || keys.pressed('right') || keys.pressed('left') || keys.pressed('up') || keys.pressed('down'))) {
          cur.x = Math.max(0, Math.min(b.w - 1, cur.x + dx)); cur.y = Math.max(0, Math.min(b.h - 1, cur.y + dy));
          rep = 3;
        }
        if (keys.pressed('pause') || keys.back()) { curMode = false; sfx.play('back'); }
      }
    },
    render() {
      layers();
      const gs = m.gs, g = m.bg, vw = viewOf(gs, view), vid = vw.id;
      panel(g, 6, 22, 308, 134, 2);
      const b = vw.b, w = b.w, h = b.h;
      const SCS = scalesOf(b);
      // a big overworld opens at two pixels per tile around you; a small map at the largest zoom that still fits whole
      if (zoom == null) { if (SCS[0] < 1) zoom = 2; else { zoom = 0; SCS.forEach((z, i) => { if (w * z <= VW && h * z <= VH) zoom = i; }); } }
      zoom %= SCS.length;
      const sc = SCS[zoom];
      const p = gs.player;
      // view centre in tiles: the map centre when it fits, otherwise the cursor (or the player)
      const focus = curMode && cur ? cur : vw.here ? { x: p.x / T, y: (p.y + 3) / T } : { x: w / 2, y: h / 2 };
      const fitX = w * sc <= VW, fitY = h * sc <= VH;
      const cx = fitX ? w / 2 : Math.max(VW / 2 / sc, Math.min(w - VW / 2 / sc, focus.x));
      const cy = fitY ? h / 2 : Math.max(VH / 2 / sc, Math.min(h - VH / 2 / sc, focus.y));
      const ox = Math.round(VX + VW / 2 - cx * sc), oy = Math.round(VY + VH / 2 - cy * sc);
      const inView = (px, py, pw = sc, ph = sc) => px >= VX && py >= VY && px + pw <= VX + VW && py + ph <= VY + VH;
      const fog = (S.fog && S.fog[vid]) || '';
      const { cw } = fogDims(w, h);
      const seen = (tx, ty) => fog[Math.floor(ty / FOG) * cw + Math.floor(tx / FOG)] === '1';
      if (fitX && fitY) { g.fillStyle(C[0]); g.fillRect(ox - 1, oy - 1, w * sc + 2, h * sc + 2); } else { g.fillStyle(C[0]); g.fillRect(VX, VY, VW, VH); }
      {
        const key = bakeTerrain(m, vid, b, sc, fog);
        const x0 = Math.max(0, Math.floor((VX - ox) / sc)), x1 = Math.min(w, Math.ceil((VX + VW - ox) / sc)), y0 = Math.max(0, Math.floor((VY - oy) / sc)), y1 = Math.min(h, Math.ceil((VY + VH - oy) / sc));
        if (x1 > x0 && y1 > y0) {
          const bs = Math.max(1, sc);
          const img = m.add.image(ox, oy, key).setOrigin(0).setScale(sc / bs).setCrop(x0 * bs, y0 * bs, (x1 - x0) * bs, (y1 - y0) * bs);
          m.mapTerrain.add(img);
        }
      }
      const go = m.mapOver;
      const spot = (tx, ty, size) => [ox + Math.floor(tx * sc + sc / 2 - size / 2), oy + Math.floor(ty * sc + sc / 2 - size / 2)];
      // every marker has a dark outline (so it never reads as terrain) and a shape of its own, not just a colour
      const dot = (tx, ty, col, size = Math.max(2, sc), shape = 'sq') => {
        if (!seen(Math.floor(tx), Math.floor(ty))) return;
        const [px, py] = spot(tx, ty, size);
        if (!inView(px, py, size, size)) return;
        go.fillStyle(C[0]); go.fillRect(px - 1, py - 1, size + 2, size + 2);
        go.fillStyle(C[col]);
        if (shape === 'hollow' && size >= 3) { go.fillRect(px, py, size, 1); go.fillRect(px, py + size - 1, size, 1); go.fillRect(px, py, 1, size); go.fillRect(px + size - 1, py, 1, size); }
        else go.fillRect(px, py, size, size);
      };
      const labels = [];
      for (const e of b.entities) {
        if (e.t === 'exit') {
          const tx = e.x + e.w / 2 - 0.5, ty = e.y + e.h / 2 - 0.5;
          dot(tx, ty, 15, Math.max(3, sc + 1), 'hollow');
          if (seen(Math.floor(tx), Math.floor(ty)) && MAPS[e.to]) labels.push([tx, ty, 'TO ' + MAPS[e.to].name.toUpperCase()]);
        } else if (e.t === 'npc') {
          dot(e.x, e.y, 6);
          // NP23: on a town map, people you are sent to find are named (BJORN, MIRRA, HILDA...)
          const nm = !MAPS[vid].stream && NPC_DEFS[e.id]?.name;
          if (nm && seen(Math.floor(e.x), Math.floor(e.y))) labels.push([e.x, e.y, nm.split(' ').pop(), 6]);
        }
        else if (e.t === 'chest' && !S.flags['chest_' + e.id]) dot(e.x, e.y, 13);
        else if (e.t === 'fire' && e.rest) { const found = S.flags.fires?.[`${vid}:${e.x},${e.y}`]; if (found || !MAPS[vid].stream) dot(e.x, e.y, 12, sc + 2); }
        else if (e.t === 'shrine') dot(e.x, e.y, 14, sc + 1);
        else if (e.t === 'bounty') { if (seen(Math.floor(e.x), Math.floor(e.y))) dot(e.x, e.y, S.bounty[e.id] ? 3 : 11, sc + 1); }
        else if (e.t === 'boss' && !S.flags.bossDead) dot(e.x, e.y, 11, sc + 2);
      }
      // places you have discovered stay on the map, whatever the fog says
      const found = (b.pois || []).filter((q) => S.discovered?.[vid + ':' + q.id]);
      for (const q of found) {
        const size = sc + 2, [px, py] = spot(q.x, q.y, size);
        if (!inView(px, py, size, size)) continue;
        go.fillStyle(C[0]); go.fillRect(px - 1, py - 1, size + 2, size + 2); go.fillStyle(C[PLACE_COL[q.kind] ?? 6]); go.fillRect(px, py, size, size);
      }
      for (const q of (b.pois || []).filter((q) => S.sighted?.[vid + ':' + q.id] && !S.discovered?.[vid + ':' + q.id])) {
        const size = sc + 2, [px, py] = spot(q.x, q.y, size);
        if (!inView(px, py, size, size)) continue;
        go.fillStyle(C[0]); go.fillRect(px - 1, py - 1, size + 2, size + 2); go.fillStyle(C[4]); go.fillRect(px + 1, py + 1, Math.max(1, size - 2), Math.max(1, size - 2));
      }
      const nearPlace = curMode && cur ? found.find((q) => Math.abs(q.x - cur.x) <= 3 && Math.abs(q.y - cur.y) <= 3) : null;
      if (nearPlace) m.T(10, 127, placeName(nearPlace), PLACE_COL[nearPlace.kind] ?? 6);
      const diamond = (qx, qy, col) => {          // quest and waypoint: a diamond
        go.fillStyle(C[0]); go.fillRect(qx - 1, qy - 4, 3, 9); go.fillRect(qx - 4, qy - 1, 9, 3); go.fillRect(qx - 3, qy - 2, 7, 5); go.fillRect(qx - 2, qy - 3, 5, 7);
        go.fillStyle(C[col]); go.fillRect(qx, qy - 3, 1, 7); go.fillRect(qx - 3, qy, 7, 1); go.fillRect(qx - 2, qy - 1, 5, 3); go.fillRect(qx - 1, qy - 2, 3, 5);
      };
      const marker = (tg, col) => {
        const qx = ox + Math.floor((tg.x + 0.5) * sc), qy = oy + Math.floor((tg.y + 0.5) * sc);
        if (!inView(qx - 4, qy - 4, 9, 9)) return;
        diamond(qx, qy, col);
      };
      const tid = trackedId();
      const tg = tid && TARGETS[tid]?.(S.quests[tid]);
      if (tg && tg.map === vid) marker(tg, 15);
      const wp = S.flags.waypoint;
      if (wp && wp.map === vid) marker(wp, 8);
      const em = eventMark();
      if (em && em.map === vid) marker(em, EVENT_MARK_COL);
      const pxp = ox + Math.floor(p.x / T * sc), pyp = oy + Math.floor((p.y + 3) / T * sc);
      // you: a yellow dot inside a white ring that gently pulses (still with Reduce Motion), always visible
      if (vw.here && inView(pxp - 3, pyp - 3, 8, 8)) {
        const r = settings.reduceMotion ? 0 : Math.floor(m.time.now / 400) % 2;
        go.fillStyle(C[0]); go.fillRect(pxp - 3 - r, pyp - 3 - r, 8 + 2 * r, 8 + 2 * r);
        go.fillStyle(C[6]); go.fillRect(pxp - 2 - r, pyp - 2 - r, 6 + 2 * r, 6 + 2 * r);
        go.fillStyle(C[0]); go.fillRect(pxp - 1, pyp - 1, 4, 4);
        go.fillStyle(C[13]); go.fillRect(pxp, pyp, 2, 2);
      }
      // fast travel hint: cursor on a found campfire
      const fireAt = curMode && cur ? vw.fires.find((f) => S.flags.fires?.[f.key] && Math.abs(f.tx - cur.x) <= 1 && Math.abs(f.ty - cur.y) <= 1) : null;
      if (fireAt) m.T(10, 135, 'F: FAST TRAVEL TO THIS CAMPFIRE', 12);
      if (curMode && cur) {
        const [qx, qy] = [ox + cur.x * sc, oy + cur.y * sc];
        go.lineStyle(1, C[6]); go.strokeRect(qx - 1.5, qy - 1.5, sc + 3, sc + 3);
      }
      // exit labels (only the ones that fit in the view)
      const placed = [];
      for (const [tx, ty, text, lcol = 15] of labels) {
        if (sc < 1 && labels.length > 3) continue;
        const [px, py] = spot(tx, ty, sc);
        const lw = text.length * 6, lx = Math.max(VX, Math.min(VX + VW - lw, px - lw / 2));
        let ly = py - 10;                                     // above the exit, or below it near the top edge
        if (ly < VY) ly = py + sc + 2;
        if (ly < VY || ly + 8 > VY + VH) continue;           // only labels that fit inside the map box (never over the tabs)
        if (vw.here && Math.abs(lx + lw / 2 - pxp) < lw / 2 + 4 && Math.abs(ly + 4 - pyp) < 8) continue;   // never over your own marker
        if (placed.some((r) => lx < r.x + r.w + 4 && lx + lw + 4 > r.x && Math.abs(ly - r.y) < 10)) continue;   // nor over another label
        placed.push({ x: lx, y: ly, w: lw });
        go.fillStyle(C[0], 0.7); go.fillRect(lx - 1, ly - 1, lw + 2, 9);
        m.T(lx, ly, text, lcol);
      }
      const zl = sc < 1 ? 'OVERVIEW' : sc + 'X';
      m.T(10, 26, (MAPS[vid].name.toUpperCase().slice(0, 28) + '  ' + zl), 13);
      if (MAPS[vid].stream) { const ft = 'FOUND ' + found.length + '/' + (b.pois || []).length; m.T(310 - ft.length * 6, 26, ft, 4); }
      if (unlockedRegions().length > 1) { const rt = padHint('R: NEXT REGION'); m.T(310 - rt.length * 6, MAPS[vid].stream ? 35 : 26, rt, 4); }   // the key shown where it acts
      // legend, two rows, each mark drawn as it appears on the map
      const LEG = [[['you', 13, 'YOU'], ['quest', 15, 'QUEST'], ['quest', 8, 'WAYPOINT'], ['hollow', 15, 'EXIT'], ['sq', 12, 'FIRE']], [['sq', 14, 'SHRINE'], ['sq', 11, 'FOE SITE'], ['sq', 6, 'PERSON'], ['sq', 13, 'CHEST'], ['sq', 4, 'SEEN FAR OFF']]];
      LEG.forEach((row, ri) => {
        let lx = 12; const ly = 138 + ri * 9;
        for (const [shape, c, t] of row) {
          const cx2 = lx + 2, cy2 = ly + 3;
          if (shape === 'you') { g.fillStyle(C[6]); g.fillRect(lx, ly + 1, 5, 5); g.fillStyle(C[0]); g.fillRect(lx + 1, ly + 2, 3, 3); g.fillStyle(C[13]); g.fillRect(lx + 2, ly + 3, 1, 1); }
          else if (shape === 'quest') { g.fillStyle(C[c]); g.fillRect(cx2, cy2 - 2, 1, 5); g.fillRect(cx2 - 2, cy2, 5, 1); g.fillRect(cx2 - 1, cy2 - 1, 3, 3); }
          else if (shape === 'hollow') { g.fillStyle(C[c]); g.fillRect(lx, ly + 1, 5, 1); g.fillRect(lx, ly + 5, 5, 1); g.fillRect(lx, ly + 1, 1, 5); g.fillRect(lx + 4, ly + 1, 1, 5); }
          else { g.fillStyle(C[0]); g.fillRect(lx, ly + 1, 5, 5); g.fillStyle(C[c]); g.fillRect(lx + 1, ly + 2, 3, 3); }
          m.T(lx + 8, ly, t, settings.highContrast ? 5 : 4);
          lx += 8 + t.length * 6 + 6;
        }
      });
    },
  };
}
