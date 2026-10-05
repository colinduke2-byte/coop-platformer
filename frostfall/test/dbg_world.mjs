import { launch } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=forest&spawn=west');
await h.sleep(1500);
const info = await h.ev(() => { const g = window.__ff.game.scene.getScene('Game'); return { w: g.built.w, h: g.built.h, pend: g.pend.length, live: g.enemies.getLength(), seed: window.__ff.S.seed, ents: g.built.entities.length }; });
console.log(info, h.errors);
await h.shot('world_start');
// teleport to a few POIs and shoot
const pois = await h.ev(() => window.__ff.game.scene.getScene('Game').built.pois.map((p) => ({ k: p.kind, x: p.x, y: p.y, t: p.tier })));
let i = 0;
for (const k of ['camp', 'ruin', 'barrow', 'tower', 'grove', 'champion']) {
  const p = pois.find((q) => q.k === k); if (!p) continue;
  await h.ev(([x, y]) => { const g = window.__ff.game.scene.getScene('Game'); g.player.setPosition(x * 16, (y + 7) * 16); g.player.invuln = 99; window.__ff.S.hp = 100; }, [p.x, p.y]);
  await h.sleep(900);
  await h.shot('world_' + k);
}
console.log(h.errors);
await h.close();
