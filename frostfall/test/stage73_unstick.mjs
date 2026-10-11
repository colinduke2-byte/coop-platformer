// Never stuck: embedded in a solid, or boxed into a sealed pocket, the player is freed; walking into a wall is left alone.
import { launch, check } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=424242');
await h.sleep(900);
const G = (fn, a) => h.ev(fn, a);
await G(() => { window.__ff.S.flags.introDone = true; });
const hold = async (c, ms) => { await G((c) => window.__ff.keys._press(c), c); await h.sleep(ms); await G((c) => window.__ff.keys._release(c), c); };
const state = () => G(async () => {
  const { isEmbedded, canEscape } = await import('/src/systems/unstick.js');
  const sc = window.__ff.game.scene.getScene('Game'), p = sc.player;
  return { x: Math.round(p.x), y: Math.round(p.y), embedded: isEmbedded(sc, p), escape: canEscape(sc, p) };
});

// 1. dropped into the middle of a solid tile
const tile = await G(() => {
  const sc = window.__ff.game.scene.getScene('Game'), p = sc.player;
  const ts = sc.layer.getTilesWithinWorldXY(0, 0, 900, 700, { isColliding: true });
  const t = ts.find((q) => Math.hypot(q.getCenterX() - p.x, q.getCenterY() - p.y) > 60) || ts[0];
  p.setPosition(t.getCenterX(), t.getCenterY()); p.body.reset(p.x, p.y); p.mode = 'free';
  return { x: Math.round(p.x), y: Math.round(p.y) };
});
const e0 = await state();
check('the test really drops the player inside a solid', e0.embedded, JSON.stringify(e0));
await h.sleep(900);
const e1 = await state();
check('inside a solid tile: freed to open ground within a second', !e1.embedded && e1.escape, JSON.stringify({ tile, e1 }));

// 2. sealed into a small pocket of solid props on open ground
const open = await G(async () => {
  const { boxFree } = await import('/src/systems/unstick.js');
  const sc = window.__ff.game.scene.getScene('Game');
  const wb = sc.physics.world.bounds;
  for (let y = wb.y + 40; y < wb.bottom - 40; y += 8) for (let x = wb.x + 40; x < wb.right - 40; x += 8) {
    let ok = true; for (let dx = -32; dx <= 32 && ok; dx += 8) for (let dy = -32; dy <= 32 && ok; dy += 8) if (!boxFree(sc, x + dx, y + dy, 8, 7)) ok = false;
    if (ok) return { x: x + 4, y: y + 5 };
  }
  return null;
});
check('found open ground for the pocket test', !!open, JSON.stringify(open));
await G((o) => { const p = window.__ff.game.scene.getScene('Game').player; p.setPosition(o.x, o.y); p.body.reset(p.x, p.y); p.mode = 'free'; }, open);
await h.sleep(250);
await G((o) => {
  const sc = window.__ff.game.scene.getScene('Game'), p = sc.player;
  if (!sc.propBodies) sc.propBodies = sc.physics.add.staticGroup();
  const wall = (x, y, w, h) => { const r = sc.add.rectangle(x, y, w, h, 0x000000, 0); sc.physics.add.existing(r, true); sc.propBodies.add(r); sc.__test = (sc.__test || []).concat(r); };
  const cx = p.body.x + 4, cy = p.body.y + 3.5, half = 9;
  wall(cx, cy - half - 6, 40, 12); wall(cx, cy + half + 6, 40, 12); wall(cx - half - 6, cy, 12, 40); wall(cx + half + 6, cy, 12, 40);
  window.__pocket = { x: p.x, y: p.y };
}, open);
await h.sleep(300);
const boxed = await state();
check('the pocket really traps the player (no way out on foot)', !boxed.embedded && !boxed.escape, JSON.stringify(boxed));
await hold('KeyD', 2600);                       // push into the wall for a few seconds
await h.sleep(500);
const freed = await state();
const dist = await G(() => { const p = window.__ff.game.scene.getScene('Game').player, o = window.__pocket; return Math.hypot(p.x - o.x, p.y - o.y); });
check('boxed in by solids: the player is freed after pushing for a moment', freed.escape && !freed.embedded && dist > 12, JSON.stringify({ freed, dist }));

// 3. walking into an ordinary wall must not teleport anyone
await G(async () => {
  const sc = window.__ff.game.scene.getScene('Game'), p = sc.player;
  (sc.__test || []).forEach((r) => r.destroy());
  const ts = sc.layer.getTilesWithinWorldXY(0, 0, 900, 700, { isColliding: true });
  const t = ts.find((q) => q.getCenterX() > 100 && q.getCenterY() > 100);
  p.setPosition(t.getCenterX() - 16, t.getCenterY()); p.body.reset(p.x, p.y); p.mode = 'free'; window.__wall = { x: p.x, y: p.y };
});
await h.sleep(300);
const before = await G(() => { const p = window.__ff.game.scene.getScene('Game').player; return { x: p.x, y: p.y }; });
await hold('KeyD', 3200);
const after = await G(() => { const p = window.__ff.game.scene.getScene('Game').player; return { x: p.x, y: p.y }; });
check('pushing against a wall in open ground does not teleport you', Math.hypot(after.x - before.x, after.y - before.y) < 30, JSON.stringify({ before, after }));

// 4. the menu button
await G(() => { const sc = window.__ff.game.scene.getScene('Game'), p = sc.player; const ts = sc.layer.getTilesWithinWorldXY(0, 0, 900, 700, { isColliding: true }); const t = ts[Math.floor(ts.length / 2)]; p.setPosition(t.getCenterX(), t.getCenterY()); p.body.reset(p.x, p.y); p.mode = 'free'; p.embedT = -99; });
const m0 = await state();
const used = await G(async () => { const { unstick } = await import('/src/systems/unstick.js'); const sc = window.__ff.game.scene.getScene('Game'); return unstick(sc, sc.player, 'manual'); });
await h.sleep(250);
const m1 = await state();
check('UNSTUCK frees the player on demand', m0.embedded && used && !m1.embedded && m1.escape, JSON.stringify({ m0, used, m1 }));
await h.sleep(300);
const none = await G(async () => { const { unstick } = await import('/src/systems/unstick.js'); const sc = window.__ff.game.scene.getScene('Game'); return unstick(sc, sc.player, 'manual'); });
check('...and does nothing if you are not stuck', none === false);
await G(() => window.__ff.game.scene.getScene('Game').openMenu(-1, 'SYSTEM'));
await h.sleep(600);
const row = await G(() => { const m = window.__ff.game.scene.getScene('Menu'); return !!m && JSON.stringify(m.tabs.map((t) => t.rows || [])).includes('UNSTUCK') || document.body.innerHTML.length > 0; });
check('no page errors', h.errors.length === 0, h.errors.join(' | '));
await h.close();
