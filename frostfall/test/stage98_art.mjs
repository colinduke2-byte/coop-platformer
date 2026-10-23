// Art fixes of the visuals audit (docs/audit/visuals.md): region tilesets, ground variety, baked tints, clips, status and hit
// effects, weather per region.
import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=424242');
await h.sleep(800);
const G = (fn, a) => h.ev(fn, a);
await G(() => { window.gs = () => window.__ff.game.scene.getScene('Game'); window.__ff.S.flags.introDone = true; window.__ff.S.flags.regions = { ashen: 1, coast: 1, kingdom: 1 }; });
const go = async (m, s = 'entry') => { await G(([m, s]) => window.gs().changeMap(m, s, 'door'), [m, s]); await h.sleep(2400); };
// pixel (x, y) of tile `id` in the texture `key`, as 0xRRGGBB (-1 = clear)
const tilePx = (key, id, x, y) => G(([key, id, x, y]) => {
  const img = window.__ff.game.textures.get(key).getSourceImage();
  const d = img.getContext('2d').getImageData(id * 16 + x, y, 1, 1).data;
  return d[3] ? (d[0] << 16) | (d[1] << 8) | d[2] : -1;
}, [key, id, x, y]);

// ---- VX-01: props stand on the region's ground, not in a white square
let r = await G(async () => ({ key: window.gs().layer.tileset[0].image.key }));
check('the village keeps the snowy base tileset', r.key === 'tiles', r.key);
await go('ashen');
r = await G(async () => { const { TILE } = await import('/src/config.js'); return { key: window.gs().layer.tileset[0].image.key, TILE }; });
const TILE = r.TILE;
check('the Ashen Peaks get their own tileset', r.key === 'tset_' + TILE.ASH, r.key);
for (const prop of ['PINE', 'ROCK', 'STUMP', 'DEADTREE', 'BOULDER', 'BRAZIER']) {
  const corner = await tilePx(r.key, TILE[prop], 0, 0), ground = await tilePx(r.key, TILE.ASH, 0, 0);
  check(`${prop} stands on ash in the Ashen Peaks (corner pixel is the ground's)`, corner === ground, `${corner.toString(16)} vs ${ground.toString(16)}`);
}
const snowWhite = 0xb4c7e0;
let whites = 0;
for (let y = 0; y < 16; y++) whites += (await tilePx(r.key, TILE.STUMP, 0, y)) === snowWhite ? 1 : 0;
check('no snow column left at the edge of a stump on ash', whites === 0, String(whites));
await go('emberhold');
r = await G(() => window.gs().layer.tileset[0].image.key);
check('Emberhold (slate paving, outdoors) gets slate roofs, not snowy ones', r !== 'tiles', r);

// ---- VX-07: big fields of one ground tile are mirrored per cell
await go('vale');
r = await G(() => { let fx = 0, n = 0; window.gs().layer.forEachTile((t) => { if (t.index === 55) { n++; if (t.flipX) fx++; } }); return { fx, n }; });
check('meadow cells are mirrored by position (about half of them)', r.n > 100 && r.fx > r.n * 0.3 && r.fx < r.n * 0.7, JSON.stringify(r));
const edge = await G((ids) => {
  const img = window.__ff.game.textures.get('tiles').getSourceImage(), c = img.getContext('2d'), out = [];
  for (const [name, id] of ids) {
    const d = c.getImageData(id * 16, 0, 16, 16).data, n = new Map(), at = (x, y) => { const i = (y * 16 + x) * 4; return (d[i] << 16) | (d[i + 1] << 8) | d[i + 2]; };
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) n.set(at(x, y), (n.get(at(x, y)) || 0) + 1);
    const base = [...n].sort((a, b) => b[1] - a[1])[0][0];
    const row = new Set(Array.from({ length: 16 }, (_, x) => at(x, 15)));
    if (row.size === 1 && !row.has(base)) out.push(name);            // a full row of one colour that is not the ground's own
  }
  return out;
}, ['MEADOW', 'MOSS', 'PATH', 'ASH', 'SHINGLE', 'DUNE', 'GLASSMOSS'].map((k) => [k, TILE[k]]));
check('ground tiles draw no dark edge row (no stripes every 16 px)', !edge.length, edge.join(','));

console.log(h.errors.slice(0, 5).join('\n'));
check('no page errors', !h.errors.length, h.errors[0]);
await h.close();
process.exit(failCount() ? 1 : 0);
