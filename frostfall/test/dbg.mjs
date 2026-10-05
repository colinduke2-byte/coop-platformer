import { launch } from './harness.mjs';
const h = await launch();
await h.open('scene=game');
await h.sleep(500);
await h.ev(() => { const g = window.__ff.game.scene.getScene('Game'); const e = g.enemies.getChildren()[0]; e.setPosition(300, 300); e.home = { x: 300, y: 300 }; g.player.setPosition(250, 300); });
for (let i = 0; i < 30; i++) {
  console.log(JSON.stringify(await h.ev(() => { const g = window.__ff.game.scene.getScene('Game'); const e = g.enemies.getChildren()[0]; return { x: Math.round(e.x), y: Math.round(e.y), st: e.state, al: e.alerted, cd: e.cd.toFixed(2), stT: e.stateT.toFixed(2), stun: e.stun, v: [Math.round(e.body.velocity.x), Math.round(e.body.velocity.y)], px: Math.round(g.player.x), hp: window.__ff.S.hp }; })));
  await h.sleep(150);
}
await h.close();
