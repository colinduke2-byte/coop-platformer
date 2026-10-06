import { launch } from './harness.mjs';
const KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyJ', 'KeyK', 'KeyL', 'KeyQ', 'KeyR', 'KeyT', 'KeyU', 'KeyV', 'Digit4', 'Digit5', 'Digit6', 'KeyF', 'KeyC', 'ShiftLeft', 'KeyE', 'Digit1', 'Digit2', 'Digit3', 'KeyI', 'KeyO', 'Escape', 'Tab', 'Enter'];
const h = await launch();
h.page.on('pageerror', (e) => console.log('STACK', e.stack.split('\n').slice(0, 6).join('\n')));
for (let round = 0; round < 14; round++) {
  await h.open(`scene=game&map=barrow${round % 3}&spawn=entry&seed=7771`);
  await h.sleep(500);
  await h.ev(() => { window.__ff.S.flags.introDone = true; });
  const t0 = Date.now();
  while (Date.now() - t0 < 9000) {
    const k = KEYS[Math.floor(Math.random() * KEYS.length)];
    await h.ev(([k, hold]) => { window.__ff.keys._press(k); if (!hold) window.__ff.keys._release(k); }, [k, Math.random() < 0.7]);
    if (Math.random() < 0.3) await h.ev((k) => window.__ff.keys._release(k), KEYS[Math.floor(Math.random() * 4)]);
    if (Math.random() < 0.05) await h.ev(() => window.__ff.keys.clearAll());
    if (Math.random() < 0.02) await h.ev(() => { const S = window.__ff.S; S.hp = S.maxHp; S.mp = S.maxMp; S.sp = S.maxSp; });
    await h.sleep(40 + Math.random() * 80);
  }
  console.log('round', round, 'errors', h.errors.length);
  if (h.errors.length) break;
}
await h.close();
