import { launch } from './harness.mjs';
const h = await launch();
for (const [n, q, time, pos] of [['night_village', 'scene=game&map=village&spawn=start', 22 * 60, [21, 14]], ['dusk_forest', 'scene=game&map=forest&spawn=west', 19 * 60 + 20, [46, 22]], ['crypt', 'scene=game&map=crypt&spawn=entry', 12 * 60, [15, 33]]]) {
  await h.open(q); await h.sleep(500);
  await h.ev(([t, pos]) => { window.__ff.S.time = t; window.__ff.S.flags.introDone = true; const g = window.__ff.game.scene.getScene('Game'); g.player.setPosition(pos[0] * 16, pos[1] * 16); }, [time, pos]);
  await h.sleep(1200);
  await h.shot('l_' + n);
}
await h.close();
