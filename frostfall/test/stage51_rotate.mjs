import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.page.addInitScript(() => {
  window.__pads = [];
  navigator.getGamepads = () => window.__pads;
  window.__mk = (o) => ({ connected: true, id: 'x', mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: !!(o.down || []).includes(i), value: 0 })) });
});
await h.page.setViewportSize({ width: 390, height: 844 });
await h.open('scene=title&touch=1');
await h.sleep(900);
const G = (fn, a) => h.ev(fn, a);
const setPad = (o) => G((o) => { window.__pads = o ? [window.__mk(o)] : []; }, o);
const box = () => G(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), t: document.getElementById('game').style.transform }; });

const b0 = await box();
check('upright phone, no controller: the game is the usual small landscape strip', b0.w > b0.h && b0.t === '', JSON.stringify(b0));
await setPad({ down: [1] }); await h.sleep(900); await setPad(null);
const b1 = await box();
check('a controller in use turns the picture sideways: it fills the tall screen', b1.h > b1.w * 1.4 && b1.h > 600 && b1.t.includes('rotate(90deg)'), JSON.stringify(b1));
await h.shot('s51_rotated');
// touching the screen puts it back
await G(() => { document.body.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true })); });
await h.sleep(700);
const b2 = await box();
check('touching the screen goes back to upright', b2.w > b2.h && b2.t === '', JSON.stringify(b2));
// the setting turns it off
await G(async () => { (await import('/src/systems/settings.js')).settings.autoRotate = false; });
await setPad({ down: [1] }); await h.sleep(900); await setPad(null);
check('ROTATE VIEW off: a controller does not rotate it', (await box()).t === '', JSON.stringify(await box()));
await G(async () => { (await import('/src/systems/settings.js')).settings.autoRotate = true; });
// landscape phone: nothing to do
await h.page.setViewportSize({ width: 844, height: 390 }); await h.sleep(900);
await setPad({ down: [1] }); await h.sleep(900);
const b3 = await box();
check('phone already in landscape: no rotation', b3.w > b3.h && b3.t === '', JSON.stringify(b3));
await setPad(null);
// rotating back when the phone is turned upright again with the controller still in use
await setPad({ down: [1] }); await h.page.setViewportSize({ width: 390, height: 844 }); await h.sleep(1200);
check('upright again with the controller: rotated again', (await box()).t.includes('rotate(90deg)'));
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'ROTATE FAILED' : 'ROTATE PASSED');
