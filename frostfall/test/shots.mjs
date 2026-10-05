import { launch } from './harness.mjs';
const h = await launch();
for (const [n, q, pos] of [['village', 'scene=game&map=village&spawn=start', [24, 11]], ['campv', 'scene=game&map=forest&spawn=west', [46, 22]], ['crypt1', 'scene=game&map=crypt&spawn=entry', [15, 33]]]) {
  await h.open(q); await h.sleep(600);
  await h.ev(([x, y]) => { window.__ff.S.flags.introDone = true; const g = window.__ff.game.scene.getScene('Game'); g.player.setPosition(x * 16, y * 16); }, pos);
  await h.sleep(900);
  await h.shot('v_' + n);
}
await h.close();
