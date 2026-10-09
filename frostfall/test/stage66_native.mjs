// Native-pixel art: every creature that has it keeps today's on-screen size and hitbox, shows at scale 1, and has every frame the 16px sheet had.
import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=424242');
await h.sleep(700);
await h.ev(() => { window.gs = () => window.__ff.game.scene.getScene('Game'); window.__ff.S.flags.introDone = true; });

const BOSS = { warlord: 'Warlord', tide: 'Tidemother', root: 'AshenRoot', winter: 'LongWinter', dragon: 'EmberDragon', kragnar: 'Kragnar', sovereign: 'AshenSovereign', admiral: 'DrownedAdmiral', hollowking: 'HollowKing', miremother: 'MireMother', stormgiant: 'StormGiant', hartking: 'HartKing', lodecolossus: 'LodeColossus', brinegut: 'Brinegut' };
const kinds = await h.ev(async () => (await import('/src/art/native_registry.js')).nativeKinds());
check('creatures with native art are registered', kinds.length >= 20, kinds.join(','));

const probe = (kind, cls) => h.ev(async ([kind, cls]) => {
  const g = window.gs();
  let e;
  if (cls) { const m = await import('/src/entities/Guardians.js'); e = new m[cls](g, 200, 200); } else { const En = (await import('/src/entities/Enemy.js')).default; e = new En(g, 200, 200, kind); }
  e.setActive(false);
  const b = e.body; b.updateFromGameObject();
  const names = e.texture.getFrameNames();
  const r = { sx: e.scaleX, dw: e.displayWidth, dh: e.displayHeight, bx: b.x - e.x, by: b.y - e.y, bw: b.width, bh: b.height, native: !!e.native, tex: e.texture.key, frames: names.length, names: names.slice().sort().join() };
  e.setScale(5);                      // bosses call setScale after construction; native art must ignore it
  r.afterSet = e.displayWidth;
  e.shadow.destroy(); e.destroy();
  return r;
}, [kind, cls]);

for (const kind of kinds) {
  const cls = BOSS[kind] || null;
  const spec = await h.ev(async (k) => { const r = await import('/src/art/native_registry.js'); const s = r.nativeSpec(k); window.__saved = window.__saved || {}; window.__saved[k] = s; r.unregisterNative(k); return { scale: s.scale, w: s.w, h: s.h, cw: s.cw || 16, ch: s.ch || 16 }; }, kind);
  const before = await probe(kind, cls);
  await h.ev(async (k) => { (await import('/src/art/native_registry.js')).registerNative(k, window.__saved[k]); }, kind);
  const after = await probe(kind, cls);
  const ok = !before.native && after.native && after.sx === 1 && after.tex === 'nat_' + kind;
  const sizeOk = Math.abs(after.dw - before.dw) <= 0.75 && Math.abs(after.dh - before.dh) <= 0.75;
  const boxOk = ['bx', 'by', 'bw', 'bh'].every((f) => Math.abs(after[f] - before[f]) < 0.01);
  const framesOk = after.names === before.names && after.afterSet === after.dw;
  check(`${kind}: native ${spec.w}x${spec.h}, same size, same hitbox, same frames`, ok && sizeOk && boxOk && framesOk, JSON.stringify({ before, after }));
}
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
process.exit(failCount() ? 1 : 0);
