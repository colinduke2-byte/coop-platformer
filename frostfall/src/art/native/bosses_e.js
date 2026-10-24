// VX-02 and VX-27: the first three bosses and the golem family at their real size (they were 16px sprites stretched 2x, 1.9x
// and 3x, and the four golems shared one body).
//   Jarl Valdrek, the Hollow King's jarl (32px, the 24-frame humanoid sheet from boss_kit)
//   Grimfang, the Pale Alpha (30px wolf: run, crouch, lunge, howl, hurt, death)
//   the Rime Wyrm (48px ice serpent: coil, rear, breath, hurt, death)
//   Bridge Troll (hunched, long arms, a club), Rime Golem (blocky ice and stone), Crystal Golem (faceted spikes),
//   Stone Giant (boulder shoulders) - each its own body now.
import { Grid, render, blit, makeNativeSheet, shaper, flippedV } from '../native.js';
import { registerNative } from '../native_registry.js';
import { bossSheet, flat } from './boss_kit.js';

const regBoss = (kind, scale, design) => { const N = Math.round(16 * scale); registerNative(kind, { scale, w: N, h: N, build: (scene, key) => bossSheet(scene, key, N, design) }); };
const sheetOf = (scene, key, N, frames) => makeNativeSheet(scene, key, N, N, frames.map(([name, pix]) => ({ name, draw: (ctx, ox) => blit(ctx, pix, N, N, ox, 0) })));
const jolt = (pix, N, dx, dy) => { const o = new Int16Array(N * N).fill(-1); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < N && ny < N) o[ny * N + nx] = pix[y * N + x]; } return o; };
const dot = (k) => Math.max(1, Math.round(k * 0.6));

// ------------------------------------------------------------------------------------------------------------------------
// Jarl Valdrek: a draugr jarl. Horned helm ringed by a gold circlet, a frost-white beard, dark mail under gold-trimmed plate,
// a long purple cloak, and a frost-rimed greataxe in his right hand (it rises with the windup and falls with the slam).
const JARL = {
  palette: { cloak: [4, 14, 1], mail: [2, 1, 0], plate: [4, 3, 2], gold: [13, 12, 9], skin: [5, 4, 3], beard: [6, 5, 4], helm: [4, 3, 2], horn: [6, 5, 4], haft: [10, 9, 1], blade: [6, 5, 4], glow: flat(15), black: [1, 0, 0] },
  dither: [1, 2], groups: {},
  dead: { body: 'mail', head: 'helm', extra: ({ R, T, id }) => { T(11.6, 13.4, 15.6, 12, 0.6, id.haft); R(14.6, 10.8, 1.4, 2.4, id.blade); } },
  draw(c) {
    const { R, E, T, Q, Y, P, id, view, bob } = c, back = view === 'back', side = view === 'side', b = bob;
    const axe = (x, y, up) => {                                    // the greataxe, held at (x, y); up: the head above the hand
      const ty = up ? y - 6.4 : y + 1.6, by = up ? y + 1.8 : y - 3.8;
      T(x, by, x, ty, 0.7, id.haft);
      const hy = up ? ty : ty - 2.6;
      Y([[x + 0.3, hy - 0.4], [x + 3, hy - 1.6], [x + 3.4, hy + 2.6], [x + 0.3, hy + 2]], id.blade);
      Y([[x - 0.3, hy], [x - 1.6, hy + 0.4], [x - 0.3, hy + 1.4]], id.blade);
      P(x + 3, hy - 1.2, 15, 1, 1);
    };
    if (!side) {
      if (!back) Y([[3.4, 6.8 + b], [12.6, 6.8 + b], [14.2, 14.8], [1.8, 14.8]], id.cloak);       // cloak behind
      c.leg(6, 11.4, 3.4, 2.3, id.mail, id.plate, 2.9); c.leg(10, 11.4, 3.4, 2.3, id.mail, id.plate, 2.9);
      Q(4.4, 6.4 + b, 7.2, 5.8, id.mail, 1.2);
      if (!back) { Y([[5.4, 6.8 + b], [10.6, 6.8 + b], [9.8, 10.2 + b], [6.2, 10.2 + b]], id.plate); T(8, 7 + b, 8, 9.8 + b, 0.35, id.gold); }
      R(4.4, 10.4 + b, 7.2, 0.9, id.gold); E(8, 10.8 + b, 0.8, 0.6, id.gold);
      if (back) Y([[3.6, 6.6 + b], [12.4, 6.6 + b], [13.8, 14.6], [2.2, 14.6]], id.cloak);       // seen from behind: all cloak
      E(4, 7.2 + b, 2, 1.4, id.plate); E(12, 7.2 + b, 2, 1.4, id.plate); R(2.4, 6.6 + b, 3.2, 0.5, id.gold); R(10.4, 6.6 + b, 3.2, 0.5, id.gold);
      c.arm('L', 3.4, 8 + b, 3.4, 1.8, id.mail, id.skin, 1);
      const a = c.arm('R', 12.6, 8 + b, 3.4, 1.8, id.mail, id.skin, 1);
      if (!back) axe(a[0] + 0.4, a[1], c.pose !== 'atk' || c.atk !== 1);
      // head: a pale draugr face, glowing eyes, a long white beard, under a horned helm and a gold circlet
      Q(5.8, 2.6 + b, 4.4, 4.2, back ? id.helm : id.skin, 1.4);
      if (!back) {
        Y([[5.8, 5.2 + b], [10.2, 5.2 + b], [9.4, 8.4 + b], [8, 9.4 + b], [6.6, 8.4 + b]], id.beard);
        P(6.7, 4.2 + b, 15, 1, 1); P(8.9, 4.2 + b, 15, 1, 1); P(6.7, 4.2 + b, 15, 2, 1); P(8.9, 4.2 + b, 15, 2, 1);
        R(7.6, 2.8 + b, 0.8, 2, id.helm);
      }
      Q(5.4, 1.2 + b, 5.2, 2.4, id.helm, 1.2); R(5.4, 3 + b, 5.2, 0.7, id.gold);
      for (const x of [6.2, 8, 9.8]) Y([[x - 0.5, 1.4 + b], [x, 0.2 + b], [x + 0.5, 1.4 + b]], id.gold);
      T(5.6, 2.2 + b, 3.4, 1 + b, 1.2, id.horn); T(3.4, 1 + b, 2.8, -0.6 + b, 0.8, id.horn);
      T(10.4, 2.2 + b, 12.6, 1 + b, 1.2, id.horn); T(12.6, 1 + b, 13.2, -0.6 + b, 0.8, id.horn);
    } else {
      T(5.4, 7 + b, 2.2, 14.6, 3.4, id.cloak);                                                     // cloak streaming behind
      c.leg(7.4, 11.4, 3.4, 2.6, id.mail, id.plate, 3.4);
      Q(5.2, 6.4 + b, 5.8, 5.8, id.mail, 1.2); Y([[8.4, 6.8 + b], [11, 6.8 + b], [10.6, 10.2 + b], [8.4, 10.2 + b]], id.plate);
      R(5.2, 10.4 + b, 5.8, 0.9, id.gold);
      E(7.6, 7.2 + b, 2, 1.4, id.plate); R(6, 6.6 + b, 3.2, 0.5, id.gold);
      const a = c.arm('R', 8.6, 8 + b, 3.4, 1.8, id.mail, id.skin, 1);
      axe(a[0] + 0.6, a[1], c.pose !== 'atk' || c.atk !== 1);
      Q(6.8, 2.6 + b, 4.4, 4.2, id.skin, 1.4);
      Y([[8.6, 5.2 + b], [11.2, 5.2 + b], [10.6, 8.6 + b], [9.2, 9 + b]], id.beard);
      P(10, 4.2 + b, 15, 2, 1);
      Q(6.4, 1.2 + b, 5, 2.4, id.helm, 1.2); R(6.4, 3 + b, 5, 0.7, id.gold); R(10.6, 2.8 + b, 0.8, 1.6, id.helm);
      for (const x of [7.2, 9, 10.6]) Y([[x - 0.5, 1.4 + b], [x, 0.2 + b], [x + 0.5, 1.4 + b]], id.gold);
      T(7, 2.2 + b, 4.6, 0.8 + b, 1.3, id.horn); T(4.6, 0.8 + b, 4, -0.8 + b, 0.8, id.horn);
    }
  },
};

// ------------------------------------------------------------------------------------------------------------------------
// Grimfang, the Pale Alpha: a huge white wolf with a heavy ruff, a torn ear, old scars and one red eye. Faces right.
// ids: 1 body, 2 ruff, 3 near leg, 4 far leg, 5 head, 6 snout, 7 ear, 8 tail, 9 scar
const GRIM_R = { 1: [6, 5, 4], 2: [6, 6, 5], 3: [5, 4, 3], 4: [4, 3, 2], 5: [6, 5, 4], 6: [5, 5, 4], 7: [5, 4, 3], 8: [6, 5, 4], 9: [11, 11, 9] };
function grimPix(N, pose, f = 0) {
  const k = N / 16, g = new Grid(N, N), { R, E, T, Y, P } = shaper(g, k);
  const run = pose === 'run', crouch = pose === 'windup', lunge = pose === 'attack', howl = pose === 'howl';
  const a = run ? (f === 1 ? 1 : -1) : 0, dy = crouch ? 1.2 : lunge ? -0.4 : 0;
  const leg = (x, id, s, front) => {
    if (lunge) { const fx = front ? x + 2.8 : x - 2.8; T(x, 10 + dy, fx, 13.4, 1.4, id); T(fx, 13.4, fx + (front ? 1.4 : -0.6), 14.6, 1.1, id); return; }
    const lift = s > 0 ? 0.9 : 0;
    T(x, 10 + dy, x + s * 1.4, 13.2 - lift, 1.5, id); T(x + s * 1.4, 13.2 - lift, x + s * 1.2 + 0.8, 14.8 - lift, 1.2, id);
  };
  leg(11, 4, -a, true); leg(4.6, 4, a, false);
  T(2.6, 8.6 + dy, howl ? 0.4 : 0.6, howl ? 6 : 11 + dy, 2, 8); T(howl ? 0.4 : 0.6, howl ? 6 : 11 + dy, 0, howl ? 4.6 : 12.4 + dy, 1.2, 8);   // tail
  E(7.4, 8.6 + dy, 5.4, 2.8, 1);                                                     // long body
  E(10.6, 7.4 + dy, 3.2, 3.2, 2);                                                    // heavy ruff
  for (const [x, y] of [[8.4, 5], [9.6, 4.4], [11.2, 4.6], [12.6, 6]]) Y([[x - 0.6, y + 1.4 + dy], [x, y - 0.6 + dy], [x + 0.8, y + 1.2 + dy]], 2);
  leg(9.8, 3, a, true); leg(3.6, 3, -a, false);
  T(5.4, 7.8 + dy, 7.6, 9.2 + dy, 0.4, 9); T(6, 9.4 + dy, 7.8, 10 + dy, 0.35, 9);   // old scars on the flank
  const hx = lunge ? 13.4 : crouch ? 12.6 : 12.4, hy = howl ? 3.2 : crouch ? 7.4 : lunge ? 6 : 5.2;
  E(hx, hy, 2.2, 1.9, 5);
  if (howl) { T(hx + 0.8, hy - 0.4, hx + 2.4, hy - 3, 1.5, 6); P(hx + 2.3, hy - 3.2, 0, dot(k), dot(k)); }
  else {
    const open = lunge ? 1 : crouch ? 0.4 : 0;
    T(hx + 1, hy + 0.2, hx + 3.6, hy + 0.6 - open * 0.4, 1.4, 6); P(hx + 3.5, hy, 0, dot(k), dot(k));
    if (open) { T(hx + 1.2, hy + 1.4, hx + 3.2, hy + 1.6 + open, 0.8, 6); R(hx + 1.6, hy + 1 + open * 0.4, 1.6, 0.4, 9); }
  }
  Y([[hx - 1.6, hy - 0.8], [hx - 1.4, hy - 3.2], [hx - 0.4, hy - 1.2]], 7);         // torn ear (short)
  Y([[hx - 0.4, hy - 1.2], [hx + 0.2, hy - 3.6], [hx + 1, hy - 1]], 7);
  P(hx + 0.6, hy - 0.4, 11, dot(k), dot(k));                                        // the red eye
  return render(g, GRIM_R, { dither: [1] });
}
function grimSheet(scene, key, N) {
  const a = grimPix(N, 'stand'), b = grimPix(N, 'run', 1), u = Math.max(1, Math.round(N / 16));
  sheetOf(scene, key, N, [['side0', a], ['side1', b], ['side2', grimPix(N, 'run', 2)], ['windup0', grimPix(N, 'windup')], ['attack0', grimPix(N, 'attack')],
    ['howl0', grimPix(N, 'howl')], ['hurt0', jolt(b, N, -u, -u)], ['death0', flippedV(jolt(a, N, 0, -2 * u), N, N)]]);
}

// ------------------------------------------------------------------------------------------------------------------------
// The Rime Wyrm: an ice serpent rising out of its own coils. Pale cyan scales, a white belly, a ridge of ice spikes, horned head,
// red eye. Frames: three coil sways, rearing with jaws open (windup), breathing frost (attack), hurt, death. Faces right.
// ids: 1 body, 2 belly, 3 spike, 4 head, 5 horn, 6 mouth, 7 frost, 8 far coil
const WYRM_R = { 1: [5, 15, 3], 2: [6, 6, 5], 3: [6, 5, 4], 4: [5, 15, 3], 5: [6, 6, 5], 6: [1, 0, 0], 7: [6, 6, 15], 8: [15, 3, 2] };
function wyrmPix(N, pose, f = 0) {
  const k = N / 16, g = new Grid(N, N), { E, T, Y, P } = shaper(g, k);
  const sw = pose === 'coil' ? [0, 0.6, -0.6][f] : 0, rear = pose === 'rear' ? 1 : pose === 'breath' ? 0.6 : 0;
  // the coils on the ground: a far loop, then the near one
  T(2, 14.2, 6.6 + sw, 12.6, 2.6, 8); T(6.6 + sw, 12.6, 11.4, 13.8, 2.6, 8);
  T(0.4, 12.8, 1.8, 14, 0.9, 1); T(1.8, 14, 4.6, 14.6, 1.6, 1);                     // tail tip
  T(4.6, 14.6, 9.6 - sw, 14.2, 2.8, 1); T(9.6 - sw, 14.2, 12.4, 12.6, 2.8, 1);
  for (let i = 0; i < 4; i++) E(5.6 + i * 1.6 - sw * 0.5, 15.2, 0.6, 0.35, 2);       // belly plates on the near coil
  // the neck rising in an S to the head
  const nx = 10.6 + sw * 0.5 - rear * 1.2, ny = 7.6 - rear * 1.6, hx = 11.2 + sw - rear * 0.6, hy = 3.6 - rear * 1.8;
  T(12.4, 12.6, 13.2, 10, 2.8, 1); T(13.2, 10, nx, ny, 2.6, 1); T(nx, ny, hx - 0.6, hy + 1.2, 2.2, 1);
  T(12.8, 11.2, 12.9, 10, 1, 2); T(12.2, 9.4, nx + 0.6, ny + 0.6, 0.9, 2);          // pale throat
  for (const [x, y, h] of [[3.4, 12.2, 1.4], [6.4, 11.4, 1.8], [9.4, 11.8, 1.6], [13.8, 9.4, 1.6], [12.6, 7.6, 1.6], [10.6, 5.8, 1.4]])   // ridge of ice spikes
    Y([[x - 0.6, y + 0.6 + (x < 12 ? 0 : 0)], [x - 0.4 - 0.4, y - h], [x + 0.5, y + 0.4]], 3);
  // head: long, horned, jaws open when it rears or breathes
  const open = pose === 'rear' ? 1.2 : pose === 'breath' ? 1.8 : 0;
  E(hx, hy, 2.4, 1.6, 4);
  T(hx + 1, hy - 0.2, hx + 4, hy + 0.2 - open * 0.4, 1.5, 4);                        // upper jaw
  if (open) { T(hx + 0.8, hy + 1, hx + 3.6, hy + 1.2 + open, 1, 4); Y([[hx + 1.2, hy + 0.6], [hx + 3.8, hy + 0.2 - open * 0.3], [hx + 3.4, hy + 1.2 + open * 0.8]], 6); }
  T(hx - 1, hy - 1, hx - 3, hy - 2.6, 0.9, 5); T(hx - 0.2, hy - 1.2, hx - 1.4, hy - 3.2, 0.8, 5);   // swept-back horns
  P(hx + 0.4, hy - 0.4, 11, dot(k), dot(k));
  if (pose === 'breath') for (let i = 0; i < 6; i++) E(hx + 4.6 + i * 0.6, hy + 0.8 + (i % 2 ? 0.6 : -0.6) * (i * 0.25), 0.5 + i * 0.12, 0.4 + i * 0.1, 7);
  return render(g, WYRM_R, { dither: [1, 8] });
}
function wyrmSheet(scene, key, N) {
  const a = wyrmPix(N, 'coil', 0), b = wyrmPix(N, 'coil', 1), u = Math.max(1, Math.round(N / 16));
  sheetOf(scene, key, N, [['side0', a], ['side1', b], ['side2', wyrmPix(N, 'coil', 2)], ['windup0', wyrmPix(N, 'rear')], ['attack0', wyrmPix(N, 'breath')],
    ['hurt0', jolt(b, N, -u, -u)], ['death0', flippedV(jolt(a, N, 0, -u), N, N)]]);
}

// ------------------------------------------------------------------------------------------------------------------------
// VX-27, the golem family, each its own body.
// Bridge Troll: hunched, a small head low between the shoulders, arms to the knees, a knotted club; mossy green hide.
const TROLL = {
  palette: { hide: [8, 8, 7], hide2: [8, 7, 1], belly: [10, 10, 9], cloth: [9, 1, 0], club: [10, 9, 1], moss: [8, 7, 7], tusk: [6, 6, 5], eye: flat(11), black: [1, 0, 0], nail: [5, 4, 3] },
  dither: [1, 2], groups: {},
  dead: { body: 'hide', head: 'hide2' },
  draw(c) {
    const { E, T, Q, Y, P, id, view, bob } = c, back = view === 'back', side = view === 'side', b = bob + 0.8;
    const club = (x, y, up) => { const ty = up ? y - 5 : y + 3.4; T(x, y, x + (up ? 0.6 : 1.6), ty, 1.1, id.club); E(x + (up ? 0.6 : 1.6), ty, 1.6, 1.6, id.club); for (const [dx, dy] of [[-1, -0.6], [1, 0.4], [0.2, 1.2]]) P(x + (up ? 0.6 : 1.6) + dx, ty + dy, 9, 1, 1); };
    if (!side) {
      c.leg(5.4, 12, 2.8, 2.6, id.hide2, id.hide2, 3.2); c.leg(10.6, 12, 2.8, 2.6, id.hide2, id.hide2, 3.2);
      Y([[4.6, 10.6 + b], [11.4, 10.6 + b], [11, 13.4], [8, 12.6], [5, 13.4]], id.cloth);
      E(8, 8.6 + b, 5.2, 3.6, id.hide);                                                         // hunched barrel body
      if (!back) E(8, 9.4 + b, 3, 2.2, id.belly); else for (const x of [5.6, 8, 10.4]) E(x, 7.4 + b, 1, 0.7, id.moss);
      E(3.6, 6.8 + b, 2, 1.6, id.hide); E(12.4, 6.8 + b, 2, 1.6, id.hide);
      c.arm('L', 3, 7.4 + b, 5.6, 2.2, id.hide, id.hide2, 1.5);
      const a = c.arm('R', 13, 7.4 + b, 5.6, 2.2, id.hide, id.hide2, 1.5);
      if (!back) club(a[0], a[1], c.pose === 'atk' && c.atk === 0);
      Q(6.2, 4.6 + b, 3.6, 3, id.hide2, 1.2);                                                   // small head, low and forward
      if (!back) { P(6.8, 5.6 + b, 11, 1, 1); P(8.8, 5.6 + b, 11, 1, 1); E(8, 6.8 + b, 1.2, 0.8, id.hide); Y([[6.6, 7.2 + b], [6.8, 8.4 + b], [7.2, 7.2 + b]], id.tusk); Y([[8.8, 7.2 + b], [9.2, 8.4 + b], [9.4, 7.2 + b]], id.tusk); }
      T(6.4, 5.2 + b, 4.6, 4 + b, 0.8, id.hide2); T(9.6, 5.2 + b, 11.4, 4 + b, 0.8, id.hide2);   // drooping ears
    } else {
      c.leg(7.6, 12, 2.8, 2.8, id.hide2, id.hide2, 3.6);
      Y([[5.6, 10.6 + b], [10.6, 10.6 + b], [10, 13.4], [6, 13.4]], id.cloth);
      E(7.4, 8.6 + b, 4.6, 3.8, id.hide); E(9.6, 9.4 + b, 2, 2, id.belly); E(5.4, 6.4 + b, 3, 2.4, id.hide);   // the hump
      for (const x of [4.4, 6]) E(x, 5 + b, 0.9, 0.6, id.moss);
      const a = c.arm('R', 9.6, 7.4 + b, 5.6, 2.2, id.hide, id.hide2, 1.5); club(a[0], a[1], c.pose === 'atk' && c.atk === 0);
      Q(9.4, 5 + b, 3.6, 3, id.hide2, 1.2); P(11.6, 5.8 + b, 11, 1, 1); E(12.6, 7 + b, 1.2, 0.9, id.hide); Y([[11.6, 7.4 + b], [11.8, 8.6 + b], [12.2, 7.4 + b]], id.tusk);
      T(9.6, 5.6 + b, 7.8, 4.4 + b, 0.8, id.hide2);
    }
  },
};
// Rime Golem: a block of packed ice and stone, square shoulders, a glowing seam; small head with one glowing slit.
const GOLEM = {
  palette: { stone: [4, 3, 2], stone2: [3, 2, 1], ice: [6, 5, 4], glow: flat(15), seam: flat(15), black: [1, 0, 0], frost: [6, 6, 5] },
  dither: [1], groups: {},
  dead: { body: 'stone', head: 'stone2' },
  draw(c) {
    const { R, E, T, Q, id, view, bob } = c, back = view === 'back', side = view === 'side', b = bob;
    if (!side) {
      c.leg(5.4, 11.6, 3.4, 3, id.stone2, id.stone2, 3.4); c.leg(10.6, 11.6, 3.4, 3, id.stone2, id.stone2, 3.4);
      Q(3.8, 5.6 + b, 8.4, 6.6, id.stone, 0.8);                                                 // a squared trunk
      Q(4.6, 6 + b, 3, 2.4, id.ice, 0.5); Q(8.6, 8.4 + b, 3, 2.6, id.ice, 0.5);                  // ice blocks set in the stone
      if (!back) { T(8, 6 + b, 7.4, 8.4 + b, 0.35, id.seam); T(7.4, 8.4 + b, 8.4, 11.4 + b, 0.35, id.seam); E(8, 8.6 + b, 0.8, 0.8, id.glow); }
      Q(1.6, 5.2 + b, 3.4, 2.6, id.stone2, 0.6); Q(11, 5.2 + b, 3.4, 2.6, id.stone2, 0.6);        // square shoulder blocks
      R(1.8, 5.2 + b, 3, 0.6, id.frost); R(11.2, 5.2 + b, 3, 0.6, id.frost);
      c.arm('L', 2.8, 7.2 + b, 4, 2.6, id.stone, id.stone2, 1.6); c.arm('R', 13.2, 7.2 + b, 4, 2.6, id.stone, id.stone2, 1.6);
      Q(6.2, 2.8 + b, 3.6, 3, id.stone2, 0.6); R(6.2, 2.8 + b, 3.6, 0.6, id.frost);
      if (!back) R(6.8, 4 + b, 2.4, 0.6, id.glow);
    } else {
      c.leg(7.6, 11.6, 3.4, 3.2, id.stone2, id.stone2, 3.8);
      Q(4.8, 5.6 + b, 6.6, 6.6, id.stone, 0.8); Q(5.4, 6.2 + b, 2.6, 2.4, id.ice, 0.5); Q(4.2, 5.2 + b, 3.6, 2.6, id.stone2, 0.6); R(4.4, 5.2 + b, 3.2, 0.6, id.frost);
      c.arm('R', 8.6, 7.2 + b, 4, 2.6, id.stone, id.stone2, 1.6);
      Q(7.4, 2.8 + b, 3.6, 3, id.stone2, 0.6); R(7.4, 2.8 + b, 3.6, 0.6, id.frost); R(9.6, 4 + b, 1.4, 0.6, id.glow);
    }
  },
};
// Crystal Golem: a frame of glass grown into spikes, a bright core, faceted fists.
const CRYSTAL = {
  palette: { glass: [6, 15, 4], glass2: [15, 4, 3], spike: [6, 6, 15], core: flat(6), stone: [3, 2, 1], black: [1, 0, 0] },
  dither: [], groups: {},
  dead: { body: 'glass2', head: 'glass' },
  draw(c) {
    const { E, Y, P, id, view, bob } = c, back = view === 'back', side = view === 'side', b = bob;
    const spike = (x, y, h, lean) => Y([[x - 0.7, y], [x + lean, y - h], [x + 0.7, y]], id.spike);
    if (!side) {
      c.leg(5.6, 11.6, 3.4, 2.6, id.glass2, id.stone, 3.2); c.leg(10.4, 11.6, 3.4, 2.6, id.glass2, id.stone, 3.2);
      Y([[4, 6 + b], [12, 6 + b], [11, 12 + b], [8, 13 + b], [5, 12 + b]], id.glass);            // a faceted trunk
      Y([[8, 6 + b], [12, 6 + b], [11, 12 + b], [8, 13 + b]], id.glass2);
      if (!back) { E(8, 8.6 + b, 1.2, 1.4, id.core); P(7.6, 8.2 + b, 15, 1, 1); }
      for (const [x, h, l] of [[3.2, 3.4, -1], [4.8, 2.4, -0.4], [11.2, 2.4, 0.4], [12.8, 3.4, 1]]) spike(x, 6.4 + b, h, l);   // spiked shoulders
      for (const sx of [-1, 1]) { const a = c.arm(sx < 0 ? 'L' : 'R', 8 + sx * 4.6, 7.4 + b, 3.8, 2, id.glass2, id.glass, 1.6); spike(a[0] + sx * 0.8, a[1] + 0.4, 1.6, sx * 0.6); }
      Y([[6.2, 5.6 + b], [8, 2.2 + b], [9.8, 5.6 + b]], id.glass); Y([[8, 2.2 + b], [9.8, 5.6 + b], [8, 5.6 + b]], id.glass2);   // a crystal for a head
      spike(7.2, 3 + b, 2, -0.6); spike(8.8, 3 + b, 2.4, 0.5);
      if (!back) P(7.4, 4.4 + b, 6, 2, 1);
    } else {
      c.leg(7.6, 11.6, 3.4, 2.8, id.glass2, id.stone, 3.6);
      Y([[5, 6 + b], [11, 6 + b], [10.4, 12 + b], [5.6, 12.6 + b]], id.glass); Y([[8, 6 + b], [11, 6 + b], [10.4, 12 + b], [8, 12.4 + b]], id.glass2);
      E(9, 8.6 + b, 1, 1.2, id.core);
      for (const [x, h, l] of [[4.6, 3.8, -1.2], [6.2, 2.6, -0.6], [7.8, 2, 0]]) spike(x, 6.4 + b, h, l);
      const a = c.arm('R', 9, 7.4 + b, 3.8, 2, id.glass2, id.glass, 1.6); spike(a[0] + 0.8, a[1] + 0.4, 1.6, 0.6);
      Y([[7.4, 5.6 + b], [9.4, 2.2 + b], [11.2, 5.6 + b]], id.glass); spike(10, 3 + b, 2.4, 0.6); P(10.2, 4.4 + b, 6, 1, 1);
    }
  },
};
// Stone Giant: boulder shoulders, a mossy cairn of a body, a long beard of lichen, horns like broken standing stones.
const GIANT = {
  palette: { rock: [4, 3, 2], rock2: [3, 2, 1], boulder: [5, 4, 3], moss: [8, 7, 7], lichen: [8, 8, 7], horn: [4, 3, 2], glow: flat(13), black: [1, 0, 0] },
  dither: [1], groups: {},
  dead: { body: 'rock', head: 'rock2' },
  draw(c) {
    const { E, Q, Y, P, id, view, bob } = c, back = view === 'back', side = view === 'side', b = bob;
    if (!side) {
      c.leg(5.6, 11.6, 3.4, 3, id.rock2, id.rock2, 3.6); c.leg(10.4, 11.6, 3.4, 3, id.rock2, id.rock2, 3.6);
      E(8, 9 + b, 4.6, 3.8, id.rock);
      for (const [x, y] of [[6, 10], [9.6, 8.4], [7.4, 11.6]]) E(x, y + b, 1, 0.6, id.moss);
      E(3, 6.4 + b, 2.8, 2.4, id.boulder); E(13, 6.4 + b, 2.8, 2.4, id.boulder);                 // boulder shoulders
      E(2.6, 5.4 + b, 1.4, 0.7, id.moss); E(13.4, 5.4 + b, 1.4, 0.7, id.moss);
      c.arm('L', 2.4, 8 + b, 4, 2.6, id.rock, id.boulder, 1.7); c.arm('R', 13.6, 8 + b, 4, 2.6, id.rock, id.boulder, 1.7);
      Q(6, 3 + b, 4, 3.6, id.rock2, 1.2);
      if (!back) { P(6.8, 4.4 + b, 13, 1, 1); P(8.8, 4.4 + b, 13, 1, 1); Y([[6.2, 5.8 + b], [9.8, 5.8 + b], [8.8, 9.4 + b], [8, 10 + b], [7.2, 9.4 + b]], id.lichen); }
      Y([[6.2, 3.6 + b], [5, 0.4 + b], [6.8, 3 + b]], id.horn); Y([[9.8, 3.6 + b], [11, 0.4 + b], [9.2, 3 + b]], id.horn);
    } else {
      c.leg(7.6, 11.6, 3.4, 3.2, id.rock2, id.rock2, 4);
      E(7.6, 9 + b, 4.2, 3.8, id.rock); E(6, 6.4 + b, 3.2, 2.6, id.boulder); E(5.6, 5.2 + b, 1.6, 0.7, id.moss);
      c.arm('R', 8.8, 8 + b, 4, 2.6, id.rock, id.boulder, 1.7);
      Q(7.6, 3 + b, 4, 3.6, id.rock2, 1.2); P(10.4, 4.4 + b, 13, 1, 1); Y([[9.4, 5.8 + b], [11.6, 5.8 + b], [10.8, 9.4 + b], [9.8, 9.8 + b]], id.lichen);
      Y([[8.4, 3.6 + b], [7, 0.4 + b], [9, 3 + b]], id.horn);
    }
  },
};

regBoss('boss', 2, JARL);
registerNative('grimfang', { scale: 1.9, w: 30, h: 30, build: (scene, key) => grimSheet(scene, key, 30) });
registerNative('wyrm', { scale: 3, w: 48, h: 48, build: (scene, key) => wyrmSheet(scene, key, 48) });
regBoss('troll', 2, TROLL);
regBoss('golem', 1.7, GOLEM);
regBoss('crystalgolem', 1.6, CRYSTAL);
regBoss('stonegiant', 2.2, GIANT);
