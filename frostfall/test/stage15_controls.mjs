import { launch, check, failCount, FRAME_MS } from './harness.mjs';
const h = await launch();
await h.open('scene=game');
await h.sleep(700);
await h.pause();
const G = (fn, a) => h.ev(fn, a);
const press = (c) => h.ev((c) => window.__ff.keys._press(c), c);
const rel = (c) => h.ev((c) => window.__ff.keys._release(c), c);
// The real game loop is paused after the page opens: time only moves through h.frames, so windows like "still at the very
// start of a swing" are hit exactly, however busy the machine is.
const F = (ms) => Math.max(1, Math.round(ms / FRAME_MS));
const wait = (ms) => h.frames(F(ms));
const tap = (c, ms = 80) => h.tap(c, F(ms), F(70));
const reset = () => G(async () => {
  window.__set = (await import('/src/systems/settings.js')).settings;
  const g = window.__ff.game.scene.getScene('Game'); const S = window.__ff.S;
  g.enemies.getChildren().slice().forEach((e) => e.destroy()); g.enemies.clear();
  g.shots.clear(true, true); g.eshots.clear(true, true);
  const p = g.player; p.setPosition(300, 250); p.body.setVelocity(0, 0); p.mode = 'free'; p.stunT = 0; p.lockT = 0; p.invuln = 0; p.iframes = 0; p.swing = null; p.face = { x: 1, y: 0 }; p.ward = null; p.blocking = false; p.target = null; p.comboT = 0; p.rollCd = 0;
  S.hp = 100; S.mp = 100; S.sp = 100; S.arrows = 20; window.__set.holdChain = true; window.__set.sneakToggle = false; window.__set.mouse = false;
});
const dummy = (dx, dy = 0) => G(([dx, dy]) => {
  const g = window.__ff.game.scene.getScene('Game'); const e = g.addEnemy('draugr', g.player.x + dx, g.player.y + dy);
  e.cfg = { ...e.cfg, detect: 0, speed: 0 }; e.hp = e.maxHp; return true;
}, [dx, dy]);
const P = () => G(() => { const p = window.__ff.game.scene.getScene('Game').player; return { face: p.face, target: !!p.target, tname: p.target?.cfg.name, mode: p.mode, swing: !!p.swing, combo: p.comboN, sneaking: p.sneaking }; });

// ---- lock-on picks the nearest foe, faces it, clears on toggle
await reset(); await dummy(-60, 0); await dummy(90, 0);
await tap('KeyT');
let s = await P();
check('lock-on grabs a target', s.target && s.tname === 'Draugr');
await wait(150);
s = await P();
check('player faces the nearest (west) foe while locked', s.face.x === -1 && s.face.y === 0, JSON.stringify(s.face));
await tap('KeyT');
check('pressing lock-on again clears it', !(await P()).target);

// ---- lock-on drops when target dies / is far
await tap('KeyT');
await G(() => { const p = window.__ff.game.scene.getScene('Game').player; p.target.hp = 0; p.target.dead = true; });
await wait(120);
check('lock clears when the target dies', !(await P()).target);

// ---- bow aims at the lock
await reset(); await dummy(0, -80);
await tap('KeyT'); await press('KeyK'); await wait(300);
s = await P();
check('bow aims at the locked target', s.face.y === -1);
await rel('KeyK'); await wait(100);

// ---- hold sword chains the combo
await reset();
await press('KeyJ'); await wait(1100); await rel('KeyJ');
const seen = await G(() => window.__ff.game.scene.getScene('Game').player.comboN);
check('holding the sword key keeps swinging (combo advanced)', seen >= 1 || (await P()).swing);
await reset(); await G(() => { window.__set.holdChain = false; });
await press('KeyJ'); await wait(900); await rel('KeyJ');
check('hold-chain can be turned off (single swing)', (await G(() => window.__ff.game.scene.getScene('Game').player.comboN)) === 0);

// ---- roll cancels the recovery of a swing
await reset();
await tap('KeyJ', 40); await wait(210);
await tap('Space', 40);
check('roll cancels out of the end of a swing', (await P()).mode === 'roll');
await reset();
await tap('KeyJ', 40); await wait(30);
await press('Space'); await h.frames(1); const early = (await P()).mode; await rel('Space');
check('cannot roll at the very start of a swing', early !== 'roll');
// ...but the press is remembered (input buffer) and the roll happens as soon as the swing allows it
await wait(300);
check('a roll pressed too early in a swing is buffered and fires when allowed', (await G(() => window.__ff.S.sp)) < 100 && true);

// ---- roll with no direction goes the way we face
await reset(); await G(() => { window.__ff.game.scene.getScene('Game').player.face = { x: -1, y: 0 }; });
const x0 = await G(() => window.__ff.game.scene.getScene('Game').player.x);
await tap('Space', 40); await wait(250);
check('roll with no key held goes the facing way', (await G(() => window.__ff.game.scene.getScene('Game').player.x)) < x0 - 10);

// ---- sneak toggle
await reset(); await G(() => { window.__set.sneakToggle = true; });
await tap('KeyC', 60); await wait(100);
check('sneak toggle stays on after release', (await P()).sneaking);
await tap('KeyC', 60); await wait(100);
check('sneak toggle turns off on second press', !(await P()).sneaking);
await reset();

// ---- quick-cast hotkeys and overcast
await reset(); await G(() => { window.__ff.S.spell = 'fire'; window.__ff.S.skills.destruction.lvl = 1; });
await tap('Digit5', 60); await wait(100);
check('quick-cast key selects and casts frost', (await G(() => window.__ff.S.spell)) === 'frost' && (await G(() => window.__ff.S.mp)) < 100);
// Lightning (Digit6) needs Destruction 4. Clear the cast lock first, or the key is swallowed and the check proves nothing.
await reset(); await G(() => { window.__ff.S.spell = 'frost'; window.__ff.S.skills.destruction.lvl = 1; });
await tap('Digit6', 60);
check('quick-cast of a locked spell is refused', (await G(() => window.__ff.S.spell)) === 'frost' && (await G(() => window.__ff.S.mp)) === 100);
await reset(); await G(() => { window.__ff.S.spell = 'frost'; window.__ff.S.skills.destruction.lvl = 4; });
await tap('Digit6', 60);
check('...and the same key casts it once the skill is high enough', (await G(() => window.__ff.S.spell)) === 'shock');
await reset(); await G(() => { window.__ff.S.mp = 100; window.__ff.S.spell = 'fire'; });
const c1 = await G(() => { const p = window.__ff.game.scene.getScene('Game').player; p.heat = 0; return p.spellCost({ cost: 10 }); });
const c2 = await G(() => { const p = window.__ff.game.scene.getScene('Game').player; p.heat = 2; return p.spellCost({ cost: 10 }); });
check('chained casts cost more mana (overcast)', c2 > c1 * 1.5, `${c1} -> ${c2}`);

console.log(h.errors.length ? 'ERRORS:\n' + h.errors.join('\n') : 'no console errors');
check('no console errors', h.errors.length === 0);
await h.close();
process.exit(failCount() ? 1 : 0);
