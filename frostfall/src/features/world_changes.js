// WQ26: regions that show what you did. After a region's boss falls something you can see changes:
//   the Vale     flowers spread over the meadows round the Thornroot Hollow
//   the Fens     the fog no longer rises, and Reedwick lights more lanterns
//   Stormcrown   the storm breaks: clear skies for the rest of that day and the next
//   Sunscorch    the vault choice: the Sunbreaker scorches the dunes round the vault; the Winterward lays frost round Amberwell;
//                a sealed vault gets a ring of glyphs
// Tile swaps happen on the drawn map only (walkable for walkable, so nothing about the paths changes); the world as generated
// (and the Reach hash) stays the same.
import { registerListener, SPAWNERS } from '../scenes/gameHooks.js';
import { S } from '../systems/state.js';
import { TILE } from '../config.js';
import { hash } from '../util.js';

const near = (sc, kind) => sc.built?.pois?.find((p) => p.kind === kind);
function swap(sc, c, r, from, to, share, salt) {
  if (!c) return 0;
  let n = 0;
  for (let y = Math.max(1, c.y - r); y < Math.min(sc.built.h - 1, c.y + r); y++) for (let x = Math.max(1, c.x - r); x < Math.min(sc.built.w - 1, c.x + r); x++) {
    if (Math.hypot(x - c.x, y - c.y) > r || !from.has(sc.built.grid[y][x]) || hash(x, y, salt) >= share * (1 - Math.hypot(x - c.x, y - c.y) / (r * 1.2))) continue;
    sc.layer.putTileAt(to, x, y); n++;
  }
  return n;
}
export function applyChanges(sc) {
  const F = S.flags, out = {};
  if (sc.mapId === 'vale' && F.blightMotherDead) out.flowers = swap(sc, near(sc, 'thornroot'), 30, new Set([TILE.MEADOW]), TILE.FLOWERS, 0.8, 611);
  if (sc.mapId === 'sunscorch' && F.choiceVault === 'sunbreaker') out.scorch = swap(sc, near(sc, 'sealedvault'), 24, new Set([TILE.SAND]), TILE.DUNE, 0.7, 612);
  if (sc.mapId === 'sunscorch' && F.choiceVault === 'winterward') out.frost = swap(sc, near(sc, 'amberwell'), 22, new Set([TILE.SAND, TILE.DUNE]), TILE.SNOWDRIFT, 0.6, 613);
  if (sc.mapId === 'sunscorch' && F.choiceVault && !['sunbreaker', 'winterward'].includes(F.choiceVault)) out.glyphs = swap(sc, near(sc, 'sealedvault'), 12, new Set([TILE.SAND, TILE.DUNE]), TILE.GLYPH, 0.5, 614);
  if (sc.mapId === 'reedwick' && F.mireMotherDead) {           // more lanterns lit along the boards
    const glow = SPAWNERS.get('glow');
    for (const [x, y] of [[14, 26], [24, 26], [30, 18], [42, 18], [30, 34], [42, 34], [56, 25], [36, 14]]) glow?.(sc, { t: 'glow', x, y, r: 30, col: 13 }, (x + 0.5) * 16, (y + 0.5) * 16);
    out.lanterns = 8;
  }
  if (F.stormGiantDead && !F.stormBreakDay) F.stormBreakDay = Math.floor(S.days || 0);
  return out;
}
registerListener('scene:game', (sc) => { sc.wq26 = applyChanges(sc); }, 'worldChanges');

