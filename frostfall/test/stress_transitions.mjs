// Hammer scene changes while text, toasts and effects are in flight; any exception fails.
import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=7771');
await h.sleep(600);
await h.ev(() => { window.__ff.S.flags.introDone = true; });
const maps = [['village', 'start'], ['forest', 'west'], ['keep', 'entry'], ['chapel', 'entry'], ['throne', 'entry'], ['maw', 'entry'], ['arena', 'in'], ['lodge', 'in'], ['crypt', 'entry'], ['nest', 'entry'], ['barrow0', 'entry']];
const KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyJ', 'KeyK', 'KeyL', 'KeyQ', 'KeyR', 'KeyE', 'KeyI', 'KeyO', 'Escape', 'Tab', 'Enter', 'KeyC', 'KeyF'];
const N = Number(process.argv[2] || 40);
for (let i = 0; i < N; i++) {
  const [m, sp] = maps[Math.floor(Math.random() * maps.length)];
  await h.ev(([m, sp]) => {
    const g = window.__ff.game.scene.getScene('Game');
    if (!g || !g.fx) return;
    for (let k = 0; k < 6; k++) g.fx.text(g.player.x + k * 4, g.player.y - 10, String(k), 11, 1.5);
    window.__ff.bus?.emit?.('toast', 'STRESS ' + m, 13);
    g.changeMap(m, sp, 'door');
  }, [m, sp]);
  for (let k = 0; k < 6; k++) { const key = KEYS[Math.floor(Math.random() * KEYS.length)]; await h.ev((key) => { window.__ff.keys._press(key); setTimeout(() => window.__ff.keys._release(key), 60); }, key); await h.sleep(40 + Math.random() * 90); }
}
// the HUD is stopped and relaunched (as after the title screen or an ending): its text must not outlive the scene
for (let i = 0; i < 4; i++) {
  await h.ev(() => { const m = window.__ff.game.scene; m.stop('Hud'); m.start('Hud'); });
  await h.sleep(500);
}
await h.sleep(1500);
check(`${N} rapid scene changes without an exception`, h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'STRESS FAILED' : 'STRESS PASSED');
