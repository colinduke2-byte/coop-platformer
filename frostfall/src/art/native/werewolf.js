// VX-10: the Werewolf, a hunched two-legged wolf-man (it used to be a brown wolf at 1.25x). Native 20px (its old on-screen
// size), facing right. Frames: side0-2 (stalk), windup0 (claws raised over its head), attack0 (the raking swipe), howl0 (head
// thrown back; shown now and then while it stands), hurt0, death0. ANIM_CLIPS.spr_werewolf in art/anim.js maps them to clips.
import { Grid, render, blit, makeNativeSheet, shaper, flippedV } from '../native.js';
import { registerNative } from '../native_registry.js';

// ids: 1 fur, 2 mane, 3 near leg, 4 far leg / far arm, 5 near arm, 6 claw, 7 belly, 8 snout, 9 ear
const WW_R = { 1: [10, 9, 1], 2: [9, 9, 1], 3: [10, 9, 1], 4: [9, 1, 0], 5: [10, 9, 1], 6: [6, 6, 5], 7: [10, 10, 9], 8: [10, 9, 9], 9: [9, 1, 1] };

function wolfmanPix(N, pose, f = 0) {
  const k = N / 16, g = new Grid(N, N), { R, E, T, Y, P } = shaper(g, k);
  const st = pose === 'walk' ? (f === 1 ? 1 : -1) : 0;
  const lean = pose === 'attack' ? 0.9 : pose === 'howl' ? -0.5 : 0;
  const leg = (hx, id, s) => {                                     // digitigrade leg: thigh back, shin forward, long foot
    const kx = hx - 1.2 + s * 0.7, ax = hx - 0.4 + s * 1.1;
    T(hx, 9.6, kx, 12, 1.9, id); T(kx, 12, ax, 14.4, 1.2, id); T(ax, 14.4, ax + 1.7, 15.1, 1, id);
  };
  leg(7.6, 4, -st);                                                 // far leg (shaded)
  if (pose === 'windup') T(8.4 + lean, 5.4, 9.2, 0.6, 1.3, 4);      // far arm, behind the body
  else T(8.4 + lean, 5.6, 9.4 + lean, 10.4, 1.3, 4);
  T(4.6, 9.4, 2.6, 11.4, 1.2, 1);                                   // tail
  E(7 + lean * 0.6, 7.4, 2.9, 3.6, 1);                              // upright torso, leaning a little forward
  E(7.8 + lean * 0.6, 8.4, 1.6, 2, 7);                              // pale chest and belly
  E(6.6 + lean * 0.5, 4.6, 2.7, 1.9, 2);                            // shaggy mane over the shoulders
  for (const [x, y] of [[4.2, 4.6], [5, 3.2], [6.6, 2.8]]) Y([[x, y + 1.2], [x - 0.7, y - 0.8], [x + 0.9, y + 0.2]], 2);
  leg(6.4, 3, st);                                                  // near leg
  const hx = 9.8 + lean, hy = pose === 'howl' ? 2.4 : 3.2;          // head: thrown back for the howl
  E(hx, hy, 2, 1.7, 1);
  if (pose === 'howl') { T(hx + 0.6, hy - 0.2, hx + 2.4, hy - 2.6, 1.4, 8); P(hx + 2.3, hy - 2.8, 0, 1, 1); }
  else { T(hx + 0.8, hy + 0.3, hx + 3.6, hy + 0.9, 1.4, 8); P(hx + 3.5, hy + 0.4, 0, 1, 1); T(hx + 1.4, hy + 1.3, hx + 3.1, hy + 1.5, 0.4, 6); }
  Y([[hx - 1.4, hy - 0.8], [hx - 1.1, hy - 3.2], [hx - 0.1, hy - 1.2]], 9); Y([[hx - 0.2, hy - 1.1], [hx + 0.5, hy - 3.1], [hx + 1, hy - 0.8]], 9);
  P(hx + 0.6, hy - 0.4, 13, Math.max(1, Math.round(k * 0.7)), 1);   // a gold eye
  let ax, ay;                                                        // near arm: long, reaching past the hip, claws out
  if (pose === 'windup') { ax = hx + 0.8; ay = 0.4; T(8.8 + lean, 5.6, ax, ay + 1, 1.5, 5); }
  else if (pose === 'attack') { ax = 14.8; ay = 8; T(9 + lean, 5.6, ax - 1, ay - 0.4, 1.5, 5); }
  else { ax = 10.6 + lean + st * 0.5; ay = 10.8; T(8.8 + lean, 5.6, ax, ay - 0.6, 1.5, 5); }
  E(ax, ay, 1, 0.9, 5);
  for (let i = -1; i <= 1; i++) {
    if (pose === 'windup') T(ax + i * 0.6, ay - 0.4, ax + 0.6 + i * 0.9, ay - 1.8, 0.4, 6);
    else if (pose === 'attack') T(ax + 0.2, ay + i * 0.6, ax + 1.4, ay + i * 0.9 + 0.4, 0.4, 6);
    else T(ax + i * 0.5, ay + 0.6, ax + 0.4 + i * 0.6, ay + 1.8, 0.4, 6);
  }
  if (pose === 'attack') for (let i = 0; i < 3; i++) R(12.2 + i * 0.5, 9.6 + i * 0.9, 2.6, 0.35, 6);    // the rake's trail
  return render(g, WW_R, { dither: [1] });
}

function werewolfSheet(scene, key, N) {
  const a = wolfmanPix(N, 'stand'), b = wolfmanPix(N, 'walk', 1), c = wolfmanPix(N, 'walk', 2), j = Math.max(1, Math.round(N / 16));
  const sheet = [['side0', a], ['side1', b], ['side2', c], ['windup0', wolfmanPix(N, 'windup')], ['attack0', wolfmanPix(N, 'attack')],
    ['howl0', wolfmanPix(N, 'howl')], ['hurt0', (() => { const o = new Int16Array(N * N).fill(-1); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const nx = x - j, ny = y - j; if (nx >= 0 && ny >= 0) o[ny * N + nx] = b[y * N + x]; } return o; })()],
    ['death0', flippedV(a, N, N)]];
  makeNativeSheet(scene, key, N, N, sheet.map(([name, pix]) => ({ name, draw: (ctx, ox) => blit(ctx, pix, N, N, ox, 0) })));
}

registerNative('werewolf', { scale: 1.25, w: 20, h: 20, build: (scene, key) => werewolfSheet(scene, key, 20) });
