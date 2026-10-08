import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=forest&spawn=west&seed=424242'); await h.sleep(1200);
const G = (fn, a) => h.ev(fn, a);
const press = (c) => h.ev((c) => window.__ff.keys._press(c), c);
const rel = (c) => h.ev((c) => window.__ff.keys._release(c), c);
const gs = () => window.__ff.game.scene.getScene('Game');
check('no pony without the whistle', await G(() => !window.__ff.game.scene.getScene('Game').pony));
// buy the whistle (Hilda's list) then reload the scene
await G(() => { window.__ff.S.inv.pony_whistle = 1; window.__ff.S.flags.introDone = true; window.__ff.game.scene.getScene('Game').scene.restart({ map: 'forest', spawn: 'west' }); });
await h.sleep(1400);
check('with the whistle a pony follows you outdoors', await G(() => { const g = window.__ff.game.scene.getScene('Game'); return !!g.pony && g.interactables.includes(g.pony); }));
const free = () => G(() => { const g = window.__ff.game.scene.getScene('Game'); g.player.mode = 'free'; g.player.invuln = 99; window.__ff.S.sp = 100; g.player.setPosition(200, 200); g.pony.setPosition(205, 206); window.__ff.S.mounted = false; });
const run = async (ms = 900) => { const x0 = await G(() => window.__ff.game.scene.getScene('Game').player.x); await press('KeyD'); await h.sleep(ms); await rel('KeyD'); return (await G(() => window.__ff.game.scene.getScene('Game').player.x)) - x0; };
await free(); const walk = await run();
await free(); await G(() => window.__ff.game.scene.getScene('Game').pony.mount());
check('E beside the pony mounts it', await G(() => window.__ff.S.mounted === true));
const ride = await run();
check('riding is much faster than walking', ride > walk * 1.35, `walk ${walk} ride ${ride}`);
// attacking gets you off
await press('KeyJ'); await h.sleep(120); await rel('KeyJ'); await h.sleep(150);
check('fighting dismounts you', await G(() => window.__ff.S.mounted === false));
// being hit gets you off
await free(); await G(() => { const g = window.__ff.game.scene.getScene('Game'); g.pony.mount(); g.player.invuln = 0; g.player.iframes = 0; window.__ff.S.hp = 90; g.player.hurt(5, g.player.x + 10, g.player.y, {}); });
check('being hit dismounts you', await G(() => window.__ff.S.mounted === false));
// stamina drain off the roads, and a tired pony
await free(); await G(() => { const g = window.__ff.game.scene.getScene('Game'); let best = null; for (let k = 0; k < 400 && !best; k++) { const x = 120 + Math.random() * 400, y = 120 + Math.random() * 300, t = g.tileIdAt(x, y + 7), t2 = g.tileIdAt(x + 70, y + 7); if (![5, 24, 9, 6].includes(t) && ![5, 24, 9, 6].includes(t2) && !g.solidAt(x, y) && !g.solidAt(x + 60, y)) best = { x, y }; } g.player.setPosition(best.x, best.y); g.pony.setPosition(best.x, best.y); g.pony.mount(); window.__ff.S.sp = 2; });
await press('KeyD'); await h.sleep(1500); await rel('KeyD');
check('off the roads the ride drains stamina and a tired pony stops', await G(() => window.__ff.S.mounted === false));
// no pony in a dungeon
await G(() => window.__ff.game.scene.getScene('Game').scene.restart({ map: 'crypt', spawn: 'entry' })); await h.sleep(1200);
check('no pony in dungeons or buildings', await G(() => !window.__ff.game.scene.getScene('Game').pony && window.__ff.S.mounted === false));
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'PONY FAILED' : 'PONY PASSED');
