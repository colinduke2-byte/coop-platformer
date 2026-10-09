// Native-pixel foundation: a creature registered with native art keeps its on-screen size and hitbox, and uses scale 1.
import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=424242');
await h.sleep(700);
await h.ev(() => { window.gs = () => window.__ff.game.scene.getScene('Game'); window.__ff.S.flags.introDone = true; });

// Upscales the 16px sheet of `tex` by `k` (a stand-in for real native art) so the test can compare like with like.
const setup = () => (async () => {
  const reg = await import('/src/art/native_registry.js');
  const nat = await import('/src/art/native.js');
  window.__reg = reg;
  window.__upscale = (tex, k) => (scene, key) => {
    const src = scene.textures.get(tex), names = src.getFrameNames();
    const w = Math.round(16 * k), hh = Math.round(16 * k), img = src.getSourceImage();
    nat.makeNativeSheet(scene, key, w, hh, names.map((n) => ({ name: n, draw: (ctx, ox) => { const f = src.get(n); ctx.imageSmoothingEnabled = false; ctx.drawImage(img, f.cutX, f.cutY, 16, 16, ox, 0, w, hh); } })));
  };
  return true;
})();
await h.ev(setup);

const probe = (kind, cls) => h.ev(async ([kind, cls]) => {
  const g = window.gs();
  let e;
  if (cls) { const m = await import('/src/entities/Guardians.js'); e = new m[cls](g, 200, 200); } else { const En = (await import('/src/entities/Enemy.js')).default; e = new En(g, 200, 200, kind); }
  e.setActive(false);
  const b = e.body;
  b.updateFromGameObject();
  const r = { sx: e.scaleX, dw: e.displayWidth, dh: e.displayHeight, bx: b.x - e.x, by: b.y - e.y, bw: b.width, bh: b.height, native: !!e.native, tex: e.texture.key, frames: e.texture.getFrameNames().length };
  e.setScale(5);                      // bosses call setScale after construction; native art must ignore it
  r.afterSet = e.displayWidth;
  e.shadow.destroy(); e.destroy();
  return r;
}, [kind, cls]);

for (const [kind, cls, scale] of [['troll', null, 2.0], ['kragnar', 'Kragnar', 2.6]]) {
  const before = await probe(kind, cls);
  await h.ev(([kind, scale]) => { window.__reg.registerNative(kind, { scale, w: Math.round(16 * scale), h: Math.round(16 * scale), build: window.__upscale(kind === 'troll' ? 'spr_troll' : 'spr_kragnar', scale) }); }, [kind, scale]);
  const after = await probe(kind, cls);
  const px = Math.round(16 * scale);
  console.log(kind, JSON.stringify(before), JSON.stringify(after));
  check(`${kind}: stretched before, native after`, !before.native && Math.abs(before.sx - scale) < 0.001 && after.native && after.sx === 1 && after.tex === 'nat_' + kind);
  check(`${kind}: on-screen size is the same (${px}px)`, Math.abs(after.dw - before.dw) <= 0.5 && Math.abs(after.dh - before.dh) <= 0.5 && after.dw === px);
  check(`${kind}: hitbox size and place relative to the sprite are identical`, Math.abs(after.bw - before.bw) < 0.01 && Math.abs(after.bh - before.bh) < 0.01 && Math.abs(after.bx - before.bx) < 0.01 && Math.abs(after.by - before.by) < 0.01, JSON.stringify({ before, after }));
  check(`${kind}: every frame was carried over and setScale is ignored`, after.frames === before.frames && after.afterSet === after.dw);
  await h.ev((k) => window.__reg.unregisterNative(k), kind);
}
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
process.exit(failCount() ? 1 : 0);
