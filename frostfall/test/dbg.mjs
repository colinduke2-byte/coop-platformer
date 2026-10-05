import { launch } from './harness.mjs';
const h = await launch();
await h.open('scene=game');
await h.sleep(800);
const info = () => h.ev(() => { const g = window.__ff.game.scene.getScene('Game'); const hud = window.__ff.game.scene.getScene('Hud'); return { modal: window.__ff.game.scene.getScene('Game') && (g.target?.id || null), dlg: hud.dlg && { n: hud.dlg.name, p: hud.dlg.p, n2: hud.dlg.n, age: hud.dlg.age, ch: !!hud.dlg.choices }, pm: g.player.mode, lockT: g.player.lockT, pos: [Math.round(g.player.x), Math.round(g.player.y)] }; });
await h.ev(() => { const g = window.__ff.game.scene.getScene('Game'); const n = g.npcs.find((n) => n.id === 'bjorn'); console.log('npc', n.x, n.y); g.player.setPosition(n.x, n.y + 18); });
await h.sleep(300);
console.log(JSON.stringify(await info()));
await h.ev(() => window.__ff.keys._press('KeyE')); await h.sleep(80); await h.ev(() => window.__ff.keys._release('KeyE'));
for (let i = 0; i < 8; i++) { await h.sleep(200); console.log(JSON.stringify(await info())); }
console.log(h.errors.join('\n'));
await h.close();
