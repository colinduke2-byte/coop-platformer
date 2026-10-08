import { launch } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=424242'); await h.sleep(900);
await h.ev(() => { window.__ff.S.flags.introDone = true; });
for (const [map, spawn, name] of [['glasswood', 'entry', 'glasswood'], ['underdeep', 'entry', 'underdeep'], ['lanternglade', 'entry', 'glade'], ['lanternfall', 'entry', 'fall'], ['saltmarket', 'entry', 'salt']]) {
  await h.ev((a) => { window.__ff.game.scene.getScene('Game').changeMap(a[0], a[1], 'door'); }, [map, spawn]);
  await h.sleep(2500);
  await h.ev(() => { const g = window.__ff.game.scene.getScene('Game'); g.player.invuln = 999; });
  await h.shot('s3_' + name);
}
await h.close();
