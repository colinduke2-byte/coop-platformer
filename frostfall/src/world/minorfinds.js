// WQ17: small finds in the empty stretches between places. A minor find is a one-screen vignette with one thing to do: a
// lost traveller's pack, a broken sled or cart, a kill with tracks leading to a den, a cairn to add a stone to (a short
// blessing), a snared fox to free. They have no map icon and no discovery toast, keep no gap from each other beyond a few
// screens, and go where the nearest place is furthest away, so the Reach (half as dense as the other regions) fills up.
// Also VX-22: the art branch's scatter props (tile ids 109-119) placed per region by the scenery pass (propsPass).

// art tile ids (A block, see config.js on the art branch): coordinate by id only
export const PROP = { BONES: 109, POTS: 110, PALM: 111, STEAMVENT: 112, OBSIDIAN: 113, SNAG: 114, LANTERNPOST: 115, STATUE: 116, STALAGMITE: 117, BEEHIVE: 118, LOG: 119 };

const WARM = new Set(['ashen', 'kingdom', 'fens', 'glasswood', 'underdeep', 'vale', 'sunscorch']);
const DIRS = ['EAST', 'SOUTH-EAST', 'SOUTH', 'SOUTH-WEST', 'WEST', 'NORTH-WEST', 'NORTH', 'NORTH-EAST'];
const dirOf = (a, b) => DIRS[(Math.round(Math.atan2(b.y - a.y, b.x - a.x) / (Math.PI / 4)) + 8) % 8];

// ctx: { def, g, add, chest, pois, bio, R, W, H, blocked(x, y), tierAt, solid(x, y) }
export function placeMinorFinds(ctx) {
  const { def, g, add, chest, pois, R, W, H, blocked, tierAt, solid } = ctx;
  const want = def.minor ?? (def.id === 'reach' ? 40 : 12), finds = [];
  const nearPlace = (x, y) => pois.reduce((m, q) => Math.min(m, Math.hypot(q.x - x, q.y - y)), 1e9);
  const open = (x, y) => { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (solid(x + dx, y + dy) || blocked(x + dx, y + dy) || g.res[y + dy][x + dx]) return false; return true; };
  for (let tries = 0; tries < 6000 && finds.length < want; tries++) {
    const x = 10 + Math.floor(R() * (W - 20)), y = 10 + Math.floor(R() * (H - 20));
    const need = tries < 3000 ? 26 : tries < 4500 ? 20 : 15;      // the emptiest stretches first
    if (nearPlace(x, y) < need || finds.some((f) => Math.hypot(f.x - x, f.y - y) < 22) || !open(x, y)) continue;
    finds.push({ x, y });
  }
  const warm = WARM.has(def.id), kinds = ['pack', 'cart', 'kill', 'cairn', 'snare'];
  finds.forEach((f, i) => {
    const kind = kinds[(i + Math.floor(R() * 2)) % kinds.length], tier = tierAt(f.x, f.y), id = `${def.id}_minor${i}`;
    const p = { id, x: f.x, y: f.y, tier };
    g.reserve(f.x - 2, f.y - 2, 5, 5);
    if (kind === 'pack') {
      chest(p, 0, 0, tier, null);
      add({ t: 'sign', x: f.x - 2, y: f.y + 1, text: warm ? ['A PACK BY THE WAY.', 'THE OWNER LEFT IN A HURRY, OR NOT AT ALL. THE STRAPS ARE CUT.'] : ['A TRAVELLER, FROZEN WHERE HE SAT.', 'HIS PACK IS STILL ON HIS BACK. HE WOULD WANT SOMEONE TO HAVE IT.'] });
    } else if (kind === 'cart') {
      chest(p, 0, 0, tier, tier >= 2 ? 'med' : null);
      add({ t: 'pot', x: f.x - 2, y: f.y, skin: 'barrel' }); add({ t: 'pot', x: f.x + 2, y: f.y + 1, skin: 'barrel' });
      add({ t: 'sign', x: f.x, y: f.y + 2, text: [warm ? 'A BROKEN CART.' : 'A BROKEN SLED.', 'ONE RUNNER SNAPPED, THE DOGS GONE. THE CRATE IS STILL LASHED ON.'] });
    } else if (kind === 'kill') {
      const den = pois.filter((q) => ['den', 'beardn', 'camp', 'champion'].includes(q.kind)).sort((a, b) => Math.hypot(a.x - f.x, a.y - f.y) - Math.hypot(b.x - f.x, b.y - f.y))[0];
      g.set(f.x, f.y, PROP.BONES);
      add({ t: 'herb', item: def.flora[0], x: f.x + 2, y: f.y - 1 }); add({ t: 'herb', item: def.flora[1], x: f.x - 2, y: f.y + 1 });
      add({ t: 'sign', x: f.x + 1, y: f.y + 2, text: ['A FRESH KILL, PICKED CLEAN.', den ? `TRACKS LEAD ${dirOf(f, den)}, TOWARD ${den.kind === 'camp' ? 'A CAMP' : 'A DEN'}.` : 'THE TRACKS ARE ALREADY FILLING IN.'] });
    } else if (kind === 'cairn') add({ t: 'cairn', id, x: f.x, y: f.y });
    else add({ t: 'snare', id, x: f.x, y: f.y });
  });
  return finds;
}

// VX-22: swap a share of a region's scenery for the art props. Solid props only replace tiles that are already solid (trees,
// rocks), and walkable ones (bones, steam vents) only bare ground, so no path is ever opened or closed by them.
const SCATTER = {
  reach: [['tree', PROP.SNAG, 0.05], ['stump', PROP.LOG, 0.3], ['ground', PROP.BONES, 0.0012]],
  coast: [['stump', PROP.LOG, 0.5], ['ground', PROP.BONES, 0.001]],
  highlands: [['rock', PROP.STATUE, 0.04], ['ground', PROP.BONES, 0.001]],
  ashen: [['rock', PROP.OBSIDIAN, 0.25], ['ground', PROP.STEAMVENT, 0.004], ['ground', PROP.BONES, 0.001]],
  kingdom: [['pillar', PROP.STATUE, 0.2], ['stump', PROP.POTS, 0.25]],
  fens: [['tree', PROP.SNAG, 0.2], ['reed', PROP.LANTERNPOST, 0.03]],
  glasswood: [['tree', PROP.LANTERNPOST, 0.015], ['rock', PROP.STATUE, 0.05]],
  underdeep: [['rock', PROP.STALAGMITE, 0.12], ['ground', PROP.STEAMVENT, 0.003], ['ground', PROP.BONES, 0.0015]],
  vale: [['tree', PROP.BEEHIVE, 0.02], ['stump', PROP.LOG, 0.4]],
  sunscorch: [['tree', PROP.PALM, 0.25], ['rock', PROP.POTS, 0.05], ['ground', PROP.BONES, 0.002]],
};
// tiles: { tree: [...], stump: [...], rock: [...], pillar: [...], reed: [...], ground: [...] } (ids of this region); hash(x, y, salt) in 0..1
export function propsPass(def, g, tiles, hash) {
  const rules = SCATTER[def.id]; if (!rules) return;
  const sets = Object.fromEntries(Object.entries(tiles).map(([k, v]) => [k, new Set(v)]));
  for (let y = 4; y < g.h - 4; y++) for (let x = 4; x < g.w - 4; x++) {
    if (g.res[y][x]) continue;
    const t = g.t[y][x];
    for (const [cls, prop, share] of rules) if (sets[cls]?.has(t) && hash(x, y, 177 + prop) < share) { g.t[y][x] = prop; break; }
  }
}
