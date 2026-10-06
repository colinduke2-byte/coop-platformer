// Random key-mashing on every map; fails on any exception or NaN state.
import { launch, check, failCount } from './harness.mjs';
const KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyJ', 'KeyK', 'KeyL', 'KeyQ', 'KeyR', 'KeyT', 'KeyU', 'KeyV', 'Digit4', 'Digit5', 'Digit6', 'KeyF', 'KeyC', 'ShiftLeft', 'KeyE', 'Digit1', 'Digit2', 'Digit3', 'KeyI', 'KeyO', 'Escape', 'Tab', 'Enter'];
const seconds = Number(process.argv[2] || 30);
const h = await launch();
for (const [map, spawn, mode] of [['village', 'start'], ['forest', 'west'], ['crypt', 'entry'], ['pass', 'south'], ['hall', 'in'], ['lodge', 'in'], ['shop', 'in'], ['cottage', 'in'], ['barrow0', 'entry'], ['barrow1', 'entry'], ['barrow2', 'entry'], ['forest', 'west', 'deep'], ['maw', 'entry']]) {
  await h.open(`scene=game&map=${map}&spawn=${spawn}&seed=7771`);
  await h.sleep(500);
  await h.ev(() => { window.__ff.S.flags.introDone = true; });
  if (mode === 'deep') await h.ev(() => { const g = window.__ff.game.scene.getScene('Game'); const p = g.built.pois.filter((q) => q.tier >= 2 && q.kind === 'camp')[0] || g.built.pois.filter((q) => q.tier >= 2)[0]; g.player.setPosition(p.x * 16, (p.y + 6) * 16); window.__ff.S.maxHp = 400; window.__ff.S.hp = 400; });
  const t0 = Date.now();
  let n = 0, deaths = 0;
  while (Date.now() - t0 < seconds * 1000) {
    const k = KEYS[Math.floor(Math.random() * KEYS.length)];
    const hold = Math.random() < 0.7;
    await h.ev(([k, hold]) => { window.__ff.keys._press(k); if (!hold) window.__ff.keys._release(k); }, [k, hold]);
    if (Math.random() < 0.3) await h.ev((k) => window.__ff.keys._release(k), KEYS[Math.floor(Math.random() * 4)]);
    if (Math.random() < 0.05) await h.ev(() => window.__ff.keys.clearAll());
    if (Math.random() < 0.02) await h.ev(() => { const S = window.__ff.S; S.hp = S.maxHp; S.mp = S.maxMp; S.sp = S.maxSp; });
    await h.sleep(40 + Math.random() * 80);
    n++;
  }
  const st = await h.ev(() => {
    const g = window.__ff.game.scene.getScene('Game'); const S = window.__ff.S;
    const bad = [S.hp, S.mp, S.sp, S.gold, S.arrows, g.player.x, g.player.y].some((v) => typeof v !== 'number' || Number.isNaN(v));
    return { bad, map: S.map, hp: S.hp, sp: S.sp, mp: S.mp, arrows: S.arrows, gold: S.gold, scenes: window.__ff.game.scene.getScenes(true).map((s) => s.scene.key) };
  });
  const fps = await h.ev(() => Math.round(window.__ff.game.loop.actualFps));
  console.log(`  ${map}${mode ? '/' + mode : ''}: ${n} inputs, ${fps} fps (software renderer), state ${JSON.stringify(st)}`);
  check(`${map}: no NaN / bad state`, !st.bad);
  check(`${map}: stayed alive & responsive`, st.scenes.includes('Game') || st.scenes.includes('Title'));
  check(`${map}: no exceptions`, h.errors.length === 0, h.errors.slice(0, 3).join('\n'));
  h.errors.length = 0;
}
await h.close();
process.exit(failCount() ? 1 : 0);
