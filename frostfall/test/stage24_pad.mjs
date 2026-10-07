import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.page.addInitScript(() => {
  window.__pads = [];
  navigator.getGamepads = () => window.__pads;
  window.__mk = (o) => ({ connected: true, id: o.id, mapping: o.mapping, axes: o.axes, buttons: Array.from({ length: o.nb }, (_, i) => ({ pressed: !!(o.down || []).includes(i), value: (o.down || []).includes(i) ? 1 : 0 })), vibrationActuator: { playEffect: () => { window.__rumbled = (window.__rumbled || 0) + 1; return Promise.resolve(); } } });
});
await h.open('scene=game&map=village&spawn=start');
await h.sleep(800);
const G = (fn, a) => h.ev(fn, a);
const pl = () => G(() => { const p = window.__ff.game.scene.getScene('Game').player; return { x: p.x, y: p.y, mode: p.mode }; });
const setPad = (o) => G((o) => { window.__pads = o ? [window.__mk(o)] : []; }, o);
const free = () => G(() => { const g = window.__ff.game.scene.getScene('Game'); g.player.setPosition(300, 250); g.player.mode = 'free'; g.player.rollCd = 0; g.player.invuln = 0; window.__ff.S.sp = 100; window.__ff.S.flags.introDone = true; });

// ---- standard pad (Xbox / Switch Pro / 8BitDo in X-input mode)
await free();
await setPad({ id: 'Xbox 360 Controller (STANDARD GAMEPAD)', mapping: 'standard', axes: [0, 0, 0, 0], nb: 17, down: [0] });
await h.sleep(250);
check('standard pad: A rolls', (await pl()).mode === 'roll');
await setPad({ id: 'x', mapping: 'standard', axes: [0, 0, 0, 0], nb: 17, down: [] });
await h.sleep(500); await free();
await setPad({ id: 'x', mapping: 'standard', axes: [0, 0, 0, 0], nb: 17, down: [15] });
const x0 = (await pl()).x; await h.sleep(500);
check('standard pad: d-pad right moves', (await pl()).x > x0 + 5);
await setPad({ id: 'x', mapping: 'standard', axes: [0, 0, 0, -1], nb: 17, down: [] });
await h.sleep(150);
check('standard pad: right stick up is the heavy attack', await G(() => !!window.__ff.game.scene.getScene('Game').player.swing));
await setPad(null);
await h.sleep(300); await free();

// ---- the controller and the on-screen buttons share one key set: a touch release must not cancel a held stick
await setPad({ id: 'x', mapping: 'standard', axes: [0.9, 0, 0, 0], nb: 17, down: [] });
await h.sleep(200);
await G(() => window.__ff.keys._release('KeyD'));            // as a brushed on-screen button would
await h.sleep(250);
const xr = (await pl()).x; await h.sleep(350);
check('a key-up from another source does not cancel a held stick', (await pl()).x > xr + 3);
await setPad(null); await h.sleep(300);
// the touch overlay hides while the pad is in use and returns on touch
await G(async () => { (await import('/src/ui/touch.js')).installTouch(true); });
await setPad({ id: 'x', mapping: 'standard', axes: [0, 0, 0, 0], nb: 17, down: [0] });
await h.sleep(900); await setPad(null);
check('the on-screen controls hide while a controller is in use', await G(() => document.getElementById('touch-ui')?.style.display === 'none'));
await G(() => { const e = new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true }); document.body.dispatchEvent(e); });
await h.sleep(400);
check('touching the screen brings them back', await G(() => document.getElementById('touch-ui')?.style.display !== 'none'));
await h.sleep(100); await free();

// ---- non-standard pad (8BitDo in D-input mode): hat on axis 9, odd button order
await setPad({ id: '8Bitdo Pro 2 (Vendor: 2dc8 Product: 6003)', mapping: '', axes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1.2857], nb: 16, down: [] });
await h.sleep(200);
const y0 = (await pl()).y;
await setPad({ id: '8Bitdo Pro 2 (Vendor: 2dc8 Product: 6003)', mapping: '', axes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0.1428], nb: 16, down: [] });   // hat = down
await h.sleep(500);
check('non-standard pad: the hat axis moves the player (d-pad down)', (await pl()).y > y0 + 5);
await setPad({ id: '8Bitdo Pro 2 (Vendor: 2dc8 Product: 6003)', mapping: '', axes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1.2857], nb: 16, down: [] });
await h.sleep(300);
const info = await G(async () => (await import('/src/systems/keys.js')).getPadInfo());
check('the pad is identified', /8Bitdo/.test(info.id) && info.mapping === 'non-standard', JSON.stringify(info));

// ---- learn a button: roll on button 7 of this odd pad
await G(async () => {
  window.__k = await import('/src/systems/keys.js');
  window.__k.capturePad((id) => { window.__learned = id; window.__k.setPadBinding('Space', id); });
});
await setPad({ id: '8Bitdo Pro 2 (Vendor: 2dc8 Product: 6003)', mapping: '', axes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1.2857], nb: 16, down: [7] });
await h.sleep(250);
check('learn mode captures the next pressed button', (await G(() => window.__learned)) === 'b7');
await setPad({ id: 'x', mapping: '', axes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1.2857], nb: 16, down: [] });
await h.sleep(300); await free();
await setPad({ id: 'x', mapping: '', axes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1.2857], nb: 16, down: [7] });
await h.sleep(250);
check('the learned button now rolls', (await pl()).mode === 'roll');
await setPad({ id: 'x', mapping: '', axes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1.2857], nb: 16, down: [] });
await h.sleep(500); await free();
await setPad({ id: 'x', mapping: '', axes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1.2857], nb: 16, down: [0] });
await h.sleep(250);
check('the old roll button no longer rolls', (await pl()).mode !== 'roll');
await setPad(null);
await G(() => window.__k.resetPadMap());

// ---- the controller screen in the pause menu
await h.sleep(300);
await G(() => window.__ff.game.scene.getScene('Game').openMenu(-1, 'SYSTEM'));
await h.sleep(500);
await G(() => { const m = window.__ff.game.scene.getScene('Menu'); m.cursor = m.tabs[m.tab].name === 'SYSTEM' ? 16 : 0; });
await h.page.evaluate(() => { window.__ff.keys._press('KeyE'); setTimeout(() => window.__ff.keys._release('KeyE'), 80); });
await h.sleep(400);
await h.shot('s24_padscreen');
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'PAD FAILED' : 'PAD PASSED');
process.exit(failCount() ? 1 : 0);
