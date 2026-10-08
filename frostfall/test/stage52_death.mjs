import { launch, check, failCount } from './harness.mjs';
const h = await launch();
const G = (fn, a) => h.ev(fn, a);
const alive = () => G(() => { const g = window.__ff.game.scene.getScene('Game'); return !!g && g.player && g.player.mode !== 'dead' && window.__ff.S.hp > 0 && g.deadT === 0; }).catch(() => false);
const waitAlive = async (n = 16) => { for (let i = 0; i < n; i++) { await h.sleep(500); if (await alive()) return true; } return false; };
const kill = () => G(() => { const g = window.__ff.game.scene.getScene('Game'), S = window.__ff.S; g.player.mode = 'free'; g.player.invuln = 0; g.player.iframes = 0; S.hp = 1; g.player.hurt(500, g.player.x + 10, g.player.y, {}); });

await h.open('scene=game&map=forest&spawn=west'); await h.sleep(1200);
await kill();
check('a normal death respawns', await waitAlive());

// died while a menu was open: the world is paused, but the death must still end
await h.open('scene=game&map=forest&spawn=west'); await h.sleep(1200);
await kill(); await h.sleep(300);
await G(() => { window.__ff.game.scene.getScene('Game').openMenu(-1, 'SYSTEM'); });
check('a death under an open menu still respawns', await waitAlive(20));

// died during a hit-stop freeze
await h.open('scene=game&map=forest&spawn=west'); await h.sleep(1200);
await kill(); await G(() => { window.__ff.game.scene.getScene('Game').hitStopT = 999; });
check('a death during a hit-stop freeze still respawns', await waitAlive(20));

// health hit zero without the death being announced
await h.open('scene=game&map=forest&spawn=west'); await h.sleep(1200);
await G(() => { window.__ff.S.hp = 0; });
check('hp at zero with no death event still ends in a respawn', await waitAlive(20));

// a checkpoint in a map that no longer exists falls back to the village
await h.open('scene=game&map=forest&spawn=west'); await h.sleep(1200);
await G(() => { window.__ff.S.respawn = { map: 'nowhere', x: 5, y: 5 }; });
await kill();
check('a respawn point in a missing map falls back to the village', (await waitAlive(20)) && (await G(() => window.__ff.game.scene.getScene('Game').mapId)) === 'village');

// arena mode: dying under a menu still ends the run
await h.open('scene=title'); await h.sleep(800);
await G(async () => { const H = await import('/src/arena/heroes.js'); H.beginQuickRun('warden', { mode: 'survival', arena: 'pit' }); const g = window.__ff.game; g.scene.stop('Title'); g.scene.start('Game', { map: 'pit', spawn: 'in' }); });
await h.sleep(1500); await kill(); await G(() => { window.__ff.game.scene.getScene('Game').openMenu(-1, 'SYSTEM'); });
let res = false; for (let i = 0; i < 20 && !res; i++) { await h.sleep(500); res = await G(() => window.__ff.game.scene.isActive('ArenaResults')); }
check('arena mode: a death under an open menu still shows the results card', res);
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'DEATH FAILED' : 'DEATH PASSED');
