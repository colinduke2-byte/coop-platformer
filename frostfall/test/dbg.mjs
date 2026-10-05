import { launch } from './harness.mjs';
const h = await launch();
await h.open('scene=game');
await h.sleep(500);
await h.ev(() => { const g = window.__ff.game.scene.getScene('Game'); const e = g.enemies.getChildren()[0]; g.player.setPosition(300, 250); g.player.invuln = 99; g.player.face = { x: 1, y: 0 }; e.setPosition(370, 250); e.home = { x: 370, y: 250 }; e.notice = -99;
  window.__ff.keys._press('KeyK'); });
await h.sleep(1800);
await h.ev(() => window.__ff.keys._release('KeyK'));
for (let i = 0; i < 14; i++) {
  console.log(JSON.stringify(await h.ev(() => { const g = window.__ff.game.scene.getScene('Game'); const sh = g.shots.getChildren()[0]; const e = g.enemies.getChildren()[0]; return { fps: Math.round(window.__ff.game.loop.actualFps), sh: sh && { x: Math.round(sh.x), y: Math.round(sh.y), life: sh.life.toFixed(2) }, e: [Math.round(e.x), Math.round(e.y), e.hp, e.state] }; })));
  await h.sleep(100);
}
await h.close();
