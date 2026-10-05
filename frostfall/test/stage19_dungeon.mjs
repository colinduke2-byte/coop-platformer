import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=crypt&spawn=entry');
await h.sleep(800);
const G = (fn, a) => h.ev(fn, a);
const gs = () => G(() => { const g = window.__ff.game.scene.getScene('Game'); return { open: !!window.__ff.S.flags.vaultOpen, seq: g.plateSeq.slice(), solid: g.solid[32][4], lit: g.plates.filter((p) => p.lit).length }; });
const step = async (rune) => {
  await G((rune) => { const g = window.__ff.game.scene.getScene('Game'); const p = g.plates.find((x) => x.rune === rune); g.enemies.getChildren().forEach((e) => { e.cfg = { ...e.cfg, detect: 0 }; }); g.player.setPosition(p.x, p.y - 3); g.player.mode = 'free'; g.player.invuln = 99; }, rune);
  await h.sleep(200);
  await G(() => { const g = window.__ff.game.scene.getScene('Game'); g.player.setPosition(g.player.x + 60, g.player.y + 60); });   // step off
  await h.sleep(150);
};
let s = await gs();
check('vault starts sealed', !s.open && s.solid === true);
await step('wolf');
s = await gs();
check('wrong first plate resets the sequence', s.seq.length === 0 && !s.open);
await step('moon'); await step('crown');
s = await gs();
check('right plates light up in order', s.seq.join() === 'moon,crown' && s.lit === 2, JSON.stringify(s));
await step('wolf');
s = await gs();
check('the third plate opens the vault wall', s.open && s.solid === false, JSON.stringify(s));
check('vault chest is reachable', await G(() => { const g = window.__ff.game.scene.getScene('Game'); return !!g.nextWaypoint(5 * 16, 32 * 16, 2.5 * 16, 32.5 * 16); }));

// checkpoint brazier before the boss gate
await G(() => { const g = window.__ff.game.scene.getScene('Game'); window.__ff.S.respawn = { map: 'village', spawn: 'start' }; g.player.setPosition(15.5 * 16, 11.5 * 16); });
await h.sleep(300);
const rs = await G(() => window.__ff.S.respawn);
check('the brazier before the boss gate sets the respawn point', rs.map === 'crypt' && rs.y < 14 * 16, JSON.stringify(rs));

// the puzzle stays solved after reloading the level
await G(() => window.__ff.game.scene.getScene('Game').scene.restart({ map: 'crypt', spawn: 'entry' }));
await h.sleep(900);
s = await gs();
check('solved vault stays open after leaving and returning', s.open && s.solid === false, JSON.stringify(s));
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'DUNGEON FAILED' : 'DUNGEON PASSED');
process.exit(failCount() ? 1 : 0);
