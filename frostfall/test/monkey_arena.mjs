// Random-input soak of Arena Mode: every room, plus Boss Rush, must run without errors or broken state.
import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=title'); await h.sleep(900);
const KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyJ', 'KeyK', 'KeyL', 'KeyU', 'KeyF', 'KeyR', 'KeyQ', 'KeyV', 'Digit1', 'Digit2', 'Digit3'];
const cases = [['warden', 'survival', 'pit'], ['reaver', 'gauntlet', 'lake'], ['ranger', 'boon', 'foundry'], ['frostmage', 'survival', 'court'], ['pyromancer', 'rush', 'pit'], ['shadow', 'daily', 'pit']];
for (const [hero, mode, arena] of cases) {
  await h.ev(async ([hero, mode, arena]) => {
    localStorage.setItem('frostfall_arena_records', JSON.stringify({ 'x:survival': { score: 1, waves: 20, runs: 1 } }));
    const H = await import('/src/arena/heroes.js'), A = await import('/src/arena/arenas.js'); H.beginQuickRun(hero, { mode, arena });
    const g = window.__ff.game; for (const k of ['Title', 'Game', 'Hud', 'ArenaSetup', 'ArenaResults']) if (g.scene.isActive(k)) g.scene.stop(k);
    g.scene.start('Game', { map: A.arenaById(window.__ff.S.quick.arena).map, spawn: 'in' });
  }, [hero, mode, arena]);
  await h.sleep(1500);
  await h.ev(async () => { const dlg = await import('/src/systems/dialogue.js'); const real = dlg.dialogue.hud; if (!real) return; dlg.dialogue.hud = { say: async () => {}, choose: async () => 0, hideBox() {}, scene: real.scene }; });
  const t0 = Date.now(); let pressed = new Set();
  while (Date.now() - t0 < 22000) {
    const k = KEYS[Math.floor(Math.random() * KEYS.length)];
    if (pressed.has(k)) { await h.ev((c) => window.__ff.keys._release(c), k); pressed.delete(k); } else { await h.ev((c) => window.__ff.keys._press(c), k); pressed.add(k); }
    await h.sleep(60 + Math.random() * 120);
    if (await h.ev(() => window.__ff.game.scene.isActive('ArenaResults'))) break;
  }
  for (const k of pressed) await h.ev((c) => window.__ff.keys._release(c), k);
  const st = await h.ev(() => { const S = window.__ff.S, g = window.__ff.game.scene; return { ok: [S.hp, S.mp, S.sp, S.maxHp].every(Number.isFinite), scene: g.isActive('Game') ? 'game' : g.isActive('ArenaResults') ? 'results' : 'other' }; });
  check(`${hero}/${mode}/${arena}: no NaN, no exceptions`, st.ok && st.scene !== 'other' && h.errors.length === 0, JSON.stringify(st) + h.errors.join('\n'));
}
await h.close();
console.log(failCount() ? 'ARENA MONKEY FAILED' : 'ARENA MONKEY PASSED');
