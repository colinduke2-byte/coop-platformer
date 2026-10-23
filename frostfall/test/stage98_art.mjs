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

// ---- VX-03: tints are baked into palette-remapped textures (the Canvas renderer ignores real tints)
await go('forest', 'west');
await G(() => { const g = window.gs(); g.enemies.getChildren().slice().forEach((e) => e.destroy()); g.player.invuln = 9999; });
r = await G(async () => {
  const { PAL } = await import('/src/config.js');
  const pal = new Set(PAL.map((c) => parseInt(c.slice(1), 16)));
  const g = window.gs(), p = g.player, out = {};
  const e = g.addEnemy('reaver', p.x + 60, p.y); e.cfg = { ...e.cfg, detect: 0, speed: 0, chase: 0 }; e.finish(0, 1);
  const w = g.addEnemy('wolf', p.x - 60, p.y); w.cfg = { ...w.cfg, detect: 0, speed: 0, chase: 0 };
  out.renderer = window.__ff.game.renderer.type;
  out.variantKey = e.texture.key;                                    // a tinted variant wears a baked copy of its sheet
  const src = e.texture.getSourceImage(), d = src.getContext('2d').getImageData(0, 0, src.width, src.height).data;
  let off = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] && !pal.has((d[i] << 16) | (d[i + 1] << 8) | d[i + 2])) off++;
  out.offPalette = off;
  w.flashT = 1; w.finish(0, 1); out.flash = w.texture.key; out.frameOk = w.frame.name !== '__BASE';
  w.flashT = 0; w.finish(0, 1); out.after = w.texture.key;
  const ring = g.add.image(0, 0, 'ring').setTint(0xc8383c); out.ring = ring.texture.key; ring.destroy();
  e.destroy(); w.destroy();
  return out;
});
check('the Canvas renderer is the one under test', r.renderer === 1, String(r.renderer));
check('a tinted variant (Rime Reaver) is drawn from a baked copy of its sheet', r.variantKey.startsWith('~m'), r.variantKey);
check('the baked copy has only palette colours', r.offPalette === 0, String(r.offPalette));
check('a hit flash is a baked white silhouette that keeps its frame', r.flash.startsWith('~f') && r.frameOk, r.flash);
check('the flash ends back on the original sheet', r.after === 'spr_wolf', r.after);
check('a red danger ring is a red texture, not a tint', r.ring.startsWith('~m') && r.ring.endsWith('~ring'), r.ring);

// ---- VX-08/09/11/18: sparks by element, rimmed native rings, frost numbers on snow, a lightning bolt you can see
await h.pause();
r = await G(async () => {
  const fxm = await import('/src/art/fx.js');
  const g = window.gs(), fx = g.fx, p = g.player, cols = (info) => { const n0 = fx.parts.length; fx.spark(p.x, p.y, 1, 0, false, 13, info); return fx.parts.slice(n0).map((q) => q.sp.texture.key); };
  const out = { fire: cols({ element: 'fire' }), frost: cols({ element: 'frost' }), plain: cols(null) };
  fx.ring(p.x, p.y, 1.5, 0.5, 'ring', 0x5cc8d8);
  out.ringKey = fx.temp[fx.temp.length - 1].sp.texture.key;
  out.kind = fxm.sparkKind({ dot: { col: 8 } });
  const n0 = fx.temp.length; fx.bolt([{ x: p.x, y: p.y }, { x: p.x + 40, y: p.y }]); out.boltIdx = n0;
  return out;
});
check('a fire hit throws fire colours (orange, red, gold)', r.fire.every((k) => ['p12', 'p11', 'p13'].includes(k)) && r.fire.includes('p12'), r.fire.join(','));
check('a frost hit throws cyan and white with ice shards', r.frost.every((k) => ['p15', 'p6', 'p5'].includes(k)) && r.frost.length > 5, r.frost.join(','));
check('a poison dot sparks green', r.kind === 'poison');
check('rings are drawn at native size from a palette texture', /^ringn_\d+_15_3$/.test(r.ringKey), r.ringKey);
await h.frames(5);
check('a lightning bolt is still on screen 5 frames later', await G(() => window.gs().fx.temp.some((e) => e.gfx && e.sp.visible)));
await h.frames(10);
check('...and gone after 15 frames', await G(() => !window.gs().fx.temp.some((e) => e.gfx)));
await h.resume();

// ---- VX-04: creatures with hurt and death frames use them; every clip frame exists on the sheet actually used
r = await G(async () => {
  const { ENEMIES } = await import('/src/data/enemies.js'); await import('/src/data/enemies4.js');
  const reg = await import('/src/art/native_registry.js'), anim = await import('/src/art/anim.js');
  const g = window.gs(), missing = [];
  for (const [k, c] of Object.entries(ENEMIES)) {
    const clips = anim.ANIM_CLIPS[c.tex]; if (!clips) continue;
    const key = reg.nativeSpec(k) ? reg.ensureNative(g, k) : c.tex, t = g.textures.get(key);
    for (const fr of Object.values(clips).flat()) if (!t.has(fr)) missing.push(`${k}:${fr}`);
  }
  const p = g.player, e = g.addEnemy('leech', p.x + 50, p.y); e.cfg = { ...e.cfg, detect: 0, speed: 0, chase: 0 };
  e.flashT = 0.5; e.finish(0, 1); const hurt = e.frame.name; e.destroy();
  const s = g.addEnemy('slimeling', p.x + 50, p.y); s.die({}); const dead = s.frame.name;
  return { missing, hurt, dead, has: ['spr_werewolf', 'spr_ashhound', 'spr_leech', 'spr_spider', 'spr_slime', 'spr_crab', 'spr_barnacle'].every((k) => anim.hasClips(k)) };
});
check('the seven animal sheets have clips', r.has);
check('every clip frame exists on the sheet each creature really uses (16px or native)', !r.missing.length, r.missing.slice(0, 8).join(','));
check('a hit leech shows its hurt frame', r.hurt === 'hurt0', r.hurt);
check('a dying slimeling shows its death frame (not a rotated sprite)', r.dead === 'death0', r.dead);

// ---- VX-10 / VX-11: the werewolf is a native wolf-man; no creature from the audit's list is shown at a stretched scale
r = await G(async () => {
  const { ENEMIES } = await import('/src/data/enemies.js'); await import('/src/data/enemies4.js');
  const reg = await import('/src/art/native_registry.js');
  const g = window.gs(), list = ['werewolf', 'shroom', 'gloomcap', 'prism', 'caveweaver', 'lodeling', 'sunsentinel', 'redsula', 'captainkarrow', 'bearcub', 'imp', 'slimeling'];
  const p = g.player, bad = [];
  for (const k of list) { const e = g.addEnemy(k, p.x + 80, p.y + 40); if (e.scaleX !== 1 || !e.native) bad.push(`${k}:${e.scaleX}`); e.destroy(); }
  const ww = g.textures.get(reg.ensureNative(g, 'werewolf'));
  return { bad, ww: ['windup0', 'attack0', 'howl0', 'hurt0', 'death0'].every((f) => ww.has(f)) };
});
check('the twelve odd-scale creatures are drawn at scale 1 with native art', !r.bad.length, r.bad.join(','));
check('the werewolf has its own windup, swipe and howl frames', r.ww);

// ---- VX-06: statuses show on the enemy (driven by the status:on / status:off bus events)
await h.pause();
r = await G(async () => {
  const m = await import('/src/systems/status.js');
  const g = window.gs(), p = g.player;
  g.enemies.getChildren().slice().forEach((e) => e.destroy());
  const mk = (x) => { const e = g.addEnemy('wolf', p.x + x, p.y + 20); e.cfg = { ...e.cfg, detect: 0, speed: 0, chase: 0, dmg: 0 }; e.maxHp = e.hp = 99999; return e; };
  window.__b = mk(-40); window.__f = mk(40); window.__c = mk(0);
  m.applyStatus(window.__b, 'burn', { t: 30, dps: 0.01 }); m.applyStatus(window.__f, 'freeze', { t: 30 });
  m.applyStatus(window.__c, 'chill', { t: 30 }); m.applyStatus(window.__c, 'chill', { t: 30 });
  window.__n0 = g.fx.parts.length;
  return 1;
});
await h.frames(30);
r = await G(() => {
  const g = window.gs(), parts = g.fx.parts.map((q) => q.sp.texture.key);
  return { fire: parts.filter((k) => k === 'p12' || k === 'p13' || k === 'p11').length, frozen: window.__f.texture.key, burnKey: window.__b.texture.key };
});
check('a burning enemy gives off fire pixels', r.fire >= 3, JSON.stringify(r));
check('a frozen enemy is drawn pale ice (a baked copy of its sheet)', r.frozen.startsWith('~m') && r.burnKey === 'spr_wolf', r.frozen);
r = await G(async () => { const m = await import('/src/systems/status.js'); m.clearStatus(window.__f, 'all'); return 1; });
await h.frames(2);
check('the ice look ends with the freeze', await G(() => window.__f.texture.key === 'spr_wolf'), await G(() => window.__f.texture.key));
await h.resume();

// ---- VX-12 / VX-19: snowless regions get their own weather picture; no blizzard, whiteout or aurora there
await go('sunscorch');
r = await G(() => { const g = window.gs(), S = window.__ff.S; S.weather = 'whiteout'; g.applyWeather(); const a = S.weather; S.weather = 'aurora'; g.applyWeather(); return { a, b: S.weather, snow: !!g.snow }; });
check('a whiteout in the desert becomes its sandstorm (blizzard kind), an aurora becomes clear', r.a === 'blizzard' && r.b === 'clear', JSON.stringify(r));
check('no snowfall in the desert', !r.snow);
await go('fens');
await G(() => { const g = window.gs(); window.__ff.S.time = 12 * 60; window.__ff.S.weather = 'blizzard'; g.applyWeather(); });
await h.frames(3);
r = await G(async () => { const w = await import('/src/art/weather.js'); return { mode: w.skyMode('blizzard', 'fens', false), drawn: window.gs().children.list.some((o) => o.type === 'Graphics' && o.depth === 99985 && o.commandBuffer.length > 20) }; });
check('the fens draw a downpour in their storm', r.mode === 'downpour' && r.drawn, JSON.stringify(r));
r = await G(async () => { const w = await import('/src/art/weather.js'); return [w.skyMode('clear', 'vale', true), w.skyMode('snow', 'ashen', false), w.skyMode('clear', 'underdeep', false)]; });
check('fireflies in the Vale at night, ash falls in the Peaks, spores in the Underdeep', r.join() === 'fireflies,ash,spores', r.join());

console.log(h.errors.slice(0, 5).join('\n'));
check('no page errors', !h.errors.length, h.errors[0]);
await h.close();
process.exit(failCount() ? 1 : 0);
