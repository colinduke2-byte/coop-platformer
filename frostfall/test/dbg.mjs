import { launch } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=village&spawn=start');
await h.sleep(800);
await h.ev(() => { window.__ff.S.time = 22 * 60; });
await h.sleep(1600);
console.log(JSON.stringify(await h.ev(() => { const g = window.__ff.game.scene.getScene('Game'); return { t: window.__ff.S.time, sched: g.schedT, n: g.npcs.map((n) => [n.id, n.sched, n.away, n.visible]) }; })));
console.log(h.errors.join('\n'));
await h.close();
