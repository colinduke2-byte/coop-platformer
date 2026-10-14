import { launch, check, failCount } from './harness.mjs';
// paused: the real game loop stops after every h.open(); time only moves through stepped frames (h.wait / h.tap),
// so every check sees the same number of frames however busy the machine is.
const h = await launch({ paused: true });
await h.open('scene=game&map=village&spawn=start');
await h.wait(800);
const G = (fn, a) => h.ev(fn, a);
const kill = () => G(() => { const g = window.__ff.game.scene.getScene('Game'); g.player.mode = 'free'; g.player.invuln = 0; window.__ff.S.hp = 5; g.player.hurt(50, g.player.x + 10, g.player.y); });
await G(() => { window.__ff.S.follower = true; window.__ff.game.scene.getScene('Game').spawnFollower(); window.__ff.S.flags.introDone = true; });
await h.wait(300);
await kill();
await h.wait(500);
check('the player goes down first', await G(() => window.__ff.game.scene.getScene('Game').player.mode === 'dead'));
await h.wait(1200);
const up = await G(() => { const g = window.__ff.game.scene.getScene('Game'); return { mode: g.player.mode, hp: window.__ff.S.hp, max: window.__ff.S.maxHp, resp: !!g.respawning }; });
check('Ragna pulls you back up with 40% health', up.mode === 'free' && up.hp === Math.round(up.max * 0.4) && !up.resp, JSON.stringify(up));
await kill();
await h.wait(5500);
const second = await G(() => { const g = window.__ff.game.scene.getScene('Game'), S = window.__ff.S; return S.hp === S.maxHp && g.player?.mode === 'free'; });   // a full-health respawn, not Ragna's 40% lift
check('a second fall inside the cooldown is a real death (respawn)', second);
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'COMPANION FAILED' : 'COMPANION PASSED');
process.exit(failCount() ? 1 : 0);
