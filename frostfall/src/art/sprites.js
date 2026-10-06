// All art is generated here, in code: characters, tiles, icons, effects.
// Nothing is loaded from disk. Every colour is an index into PAL.
import { PAL, T, TILE, TILE_COUNT } from '../config.js';
import { hash } from '../util.js';

const canvas = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
};
const R = (ctx, col, x, y, w = 1, h = 1) => {
  ctx.fillStyle = PAL[col];
  ctx.fillRect(x, y, w, h);
};

// ---------------------------------------------------------------- characters
// style: skin hair body trim legs boots eye cape hood helm beard glow
function humanoid(ctx, ox, dir, frIn, s) {
  const r = (c, x, y, w, h) => R(ctx, c, ox + x, y, w, h);
  const eye = s.eye ?? 0;
  if (dir === 'dead') {            // lying on the ground, head left, feet right
    r(s.legs, 9, 11, 4, 2); r(s.boots, 13, 11, 2, 2);
    r(s.body, 4, 10, 6, 3); r(s.trim, 7, 10, 1, 3);
    r(s.skin, 1, 10, 3, 3); r(s.hair, 0, 9, 3, 2); if (s.helm) r(s.helm, 1, 9, 3, 1);
    r(s.body, 5, 13, 3, 1); r(s.skin, 4, 14, 2, 1);
    if (s.cape) r(s.cape, 4, 9, 5, 1);
    r(0, 2, 11, 1, 1);
    return;
  }
  // poses: atkdown / atkup / atkside (frame 0 windup, 1 strike, 2 recover) and hurt
  let pose = null;
  if (dir.startsWith('atk')) { pose = 'atk'; dir = dir.slice(3); } else if (dir === 'hurt') { pose = 'hurt'; dir = 'down'; }
  const fr = pose ? 0 : frIn;
  if (dir === 'down' || dir === 'up') {
    const back = dir === 'up';
    const lUp = fr === 1, rUp = fr === 2;
    // legs
    r(s.legs, 5, 12, 2, lUp ? 1 : 2); r(s.boots, 5, lUp ? 13 : 14, 2, 1);
    r(s.legs, 9, 12, 2, rUp ? 1 : 2); r(s.boots, 9, rUp ? 13 : 14, 2, 1);
    if (lUp) r(s.legs, 5, 12, 2, 1);
    if (rUp) r(s.legs, 9, 12, 2, 1);
    if (s.cape && back) r(s.cape, 4, 7, 8, 7);
    // torso + belt
    r(s.body, 4, 7, 8, 5);
    r(s.trim, 4, 10, 8, 1);
    if (s.chest) r(s.chest, 6, 7, 4, 1);
    // arms
    const la = fr === 1 ? -1 : fr === 2 ? 1 : 0;
    if (!pose) {
      r(s.body, 3, 8 + la, 1, 3); r(s.skin, 3, 11 + la, 1, 1);
      r(s.body, 12, 8 - la, 1, 3); r(s.skin, 12, 11 - la, 1, 1);
    } else if (pose === 'hurt') {
      r(s.body, 2, 5, 1, 3); r(s.skin, 2, 4, 1, 1); r(s.body, 13, 5, 1, 3); r(s.skin, 13, 4, 1, 1);
    } else if (frIn === 0) {            // windup: weapon arm raised
      r(s.body, 3, 8, 1, 3); r(s.skin, 3, 11, 1, 1); r(s.body, 12, 4, 1, 4); r(s.skin, 12, 3, 1, 1);
    } else if (frIn === 1) {            // strike: both arms thrown forward
      r(s.body, 3, 9, 1, 4); r(s.skin, 3, 13, 1, 1); r(s.body, 12, 9, 1, 4); r(s.skin, 12, 13, 1, 1);
    } else {                            // recover: arms low
      r(s.body, 3, 10, 1, 2); r(s.skin, 3, 12, 1, 1); r(s.body, 12, 10, 1, 2); r(s.skin, 12, 12, 1, 1);
    }
    if (s.cape && !back) { r(s.cape, 3, 7, 1, 1); r(s.cape, 12, 7, 1, 1); }
    // head
    if (back) {
      r(s.hood ?? s.hair, 5, 2, 6, 5);
      if (s.helm) r(s.helm, 5, 2, 6, 3);
    } else {
      r(s.skin, 5, 2, 6, 5);
      if (s.hood != null) {
        r(s.hood, 4, 2, 8, 5); r(s.skin, 6, 3, 4, 3);
      } else {
        r(s.hair, 5, 2, 6, 2); r(s.hair, 5, 4, 1, 2); r(s.hair, 10, 4, 1, 2);
      }
      if (s.helm) { r(s.helm, 5, 2, 6, 2); r(s.helm, 7, 4, 2, 1); }
      r(eye, 6, 4, 1, 1); r(eye, 9, 4, 1, 1);
      if (s.glow != null) { r(s.glow, 6, 4, 1, 1); r(s.glow, 9, 4, 1, 1); }
      if (s.beard != null) r(s.beard, 6, 6, 4, 1);
      if (s.mask != null) r(s.mask, 5, 5, 6, 2);
      if (pose === 'hurt') { r(s.skin, 6, 4, 1, 1); r(s.skin, 9, 4, 1, 1); r(0, 6, 4, 2, 1); r(0, 9, 4, 2, 1); r(0, 7, 6, 2, 1); }
    }
    if (s.horns != null) { r(s.horns, 4, 1, 1, 2); r(s.horns, 11, 1, 1, 2); r(s.horns, 3, 0, 1, 2); r(s.horns, 12, 0, 1, 2); }
    if (s.crown != null) { r(s.crown, 5, 1, 6, 1); r(s.crown, 5, 0, 1, 1); r(s.crown, 8, 0, 1, 1); r(s.crown, 10, 0, 1, 1); }
  } else {
    // side view, facing right
    const spread = fr === 1, together = fr === 2;
    const lx = spread ? 5 : together ? 7 : 6;
    const rx = spread ? 9 : together ? 7 : 8;
    r(s.legs, lx, 12, 2, 2); r(s.boots, lx, 14, 2, 1);
    r(s.legs, rx, 12, 2, 2); r(s.boots, rx, 14, 2, 1);
    if (s.cape) r(s.cape, 3, 7, 3, 7);
    r(s.body, 5, 7, 6, 5);
    r(s.trim, 5, 10, 6, 1);
    if (s.chest) r(s.chest, 9, 7, 2, 1);
    const ax = fr === 1 ? 8 : fr === 2 ? 6 : 7;
    if (!pose) { r(s.body, ax, 8, 2, 3); r(s.skin, ax, 11, 2, 1); }
    else if (frIn === 0) { r(s.body, 5, 5, 2, 3); r(s.skin, 5, 4, 2, 1); }                       // windup: arm raised behind
    else if (frIn === 1) { r(s.body, 9, 8, 4, 2); r(s.skin, 13, 8, 2, 2); }                      // strike: arm thrust forward
    else { r(s.body, 8, 10, 3, 2); r(s.skin, 11, 10, 1, 2); }                                     // recover
    r(s.skin, 6, 2, 6, 5);
    if (s.hood != null) { r(s.hood, 5, 2, 6, 5); r(s.skin, 9, 3, 3, 3); r(s.hood, 6, 1, 5, 1); }
    else { r(s.hair, 6, 2, 6, 2); r(s.hair, 6, 4, 2, 2); }
    if (s.helm) { r(s.helm, 6, 2, 6, 2); r(s.helm, 11, 3, 1, 2); }
    r(eye, 10, 4, 1, 1);
    if (s.glow != null) r(s.glow, 10, 4, 1, 1);
    if (s.beard != null) r(s.beard, 9, 6, 3, 2);
    if (s.mask != null) r(s.mask, 9, 5, 3, 2);
    if (s.horns != null) { r(s.horns, 6, 1, 1, 2); r(s.horns, 5, 0, 1, 2); }
    if (s.crown != null) { r(s.crown, 6, 1, 5, 1); r(s.crown, 7, 0, 1, 1); r(s.crown, 9, 0, 1, 1); }
  }
}

export const STYLES = {
  player: { skin: 10, hair: 9, body: 3, trim: 9, legs: 2, boots: 9, chest: 6, cape: 11 },
  sigrid: { skin: 10, hair: 6, hood: 4, body: 5, trim: 3, legs: 3, boots: 9, chest: 6, beard: null },
  bjorn:  { skin: 10, hair: 9, body: 9, trim: 1, legs: 2, boots: 1, chest: 10, beard: 9, cape: 7 },
  mirra:  { skin: 10, hair: 14, hood: 14, body: 14, trim: 13, legs: 1, boots: 9, chest: 13 },
  draugr: { skin: 4, hair: 3, body: 2, trim: 1, legs: 1, boots: 0, eye: 0, glow: 15, helm: 3 },
  bandit: { skin: 10, hair: 1, hood: 1, body: 9, trim: 0, legs: 2, boots: 0, chest: 11, mask: 11 },
  archer: { skin: 10, hair: 7, hood: 7, body: 8, trim: 9, legs: 9, boots: 0, chest: 10, mask: 9 },
  guard:  { skin: 10, hair: 3, helm: 4, body: 3, trim: 13, legs: 2, boots: 9, chest: 5, beard: 9 },
  child:  { skin: 10, hair: 13, body: 11, trim: 9, legs: 3, boots: 9, chest: 5 },
  warden: { skin: 4, hair: 3, body: 2, trim: 3, legs: 1, boots: 0, glow: 15, helm: 5, chest: 4 },
  chief:  { skin: 10, hair: 11, body: 11, trim: 13, legs: 2, boots: 0, helm: 3, beard: 9, cape: 1, chest: 13 },
  conjurer: { skin: 5, hair: 15, hood: 15, body: 3, trim: 14, legs: 1, boots: 0, glow: 13, chest: 14 },
  hilda:  { skin: 10, hair: 12, body: 9, trim: 5, legs: 2, boots: 0, chest: 4, beard: null },
  ragna:  { skin: 10, hair: 13, hood: 8, body: 8, trim: 9, legs: 7, boots: 9, chest: 10 },
  warlord: { skin: 4, hair: 3, body: 3, trim: 13, legs: 2, boots: 0, glow: 12, helm: 4, chest: 11, beard: 3, cape: 11, horns: 4 },
  winter: { skin: 6, hair: 15, body: 15, trim: 6, legs: 3, boots: 0, glow: 15, helm: 6, horns: 5, crown: 15, cape: 5, chest: 6 },
  imp: { skin: 11, hair: 12, body: 11, trim: 12, legs: 11, boots: 0, glow: 13, horns: 12, chest: 12 },
  necro: { skin: 4, hair: 14, hood: 1, body: 1, trim: 14, legs: 0, boots: 0, glow: 14, chest: 14 },
  golem: { skin: 4, hair: 3, body: 3, trim: 15, legs: 2, boots: 1, glow: 15, helm: 4, chest: 5 },
  trader: { skin: 10, hair: 9, hood: 12, body: 12, trim: 13, legs: 9, boots: 9, chest: 13, cape: 9 },
  wight:  { skin: 5, hair: 14, hood: 14, body: 1, trim: 14, legs: 1, boots: 0, glow: 15, chest: 15 },
  troll:  { skin: 8, hair: 7, body: 9, trim: 1, legs: 7, boots: 0, eye: 11, chest: 10, horns: 10 },
  trapper: { skin: 10, hair: 9, hood: 9, body: 9, trim: 7, legs: 2, boots: 1, chest: 7, cape: 7 },
  fisher: { skin: 10, hair: 6, hood: 15, body: 15, trim: 5, legs: 3, boots: 1, chest: 4 },
  prospector: { skin: 10, hair: 11, helm: 3, body: 3, trim: 9, legs: 2, boots: 1, chest: 9, beard: 11 },
  // Emberhold
  ysolde: { skin: 10, hair: 6, hood: 13, body: 13, trim: 12, legs: 3, boots: 9, chest: 12, crown: 12, cape: 11 },
  brannoch: { skin: 10, hair: 11, helm: null, body: 9, trim: 12, legs: 2, boots: 1, chest: 4, beard: 11 },
  tamsin: { skin: 10, hair: 15, hood: 14, body: 14, trim: 15, legs: 1, boots: 9, chest: 15 },
  orrin: { skin: 10, hair: 6, helm: 5, body: 8, trim: 9, legs: 9, boots: 1, chest: 9, beard: 6 },
  pell: { skin: 10, hair: 11, hood: 7, body: 7, trim: 9, legs: 9, boots: 1, chest: 8 },
  hesper: { skin: 10, hair: 9, helm: 4, body: 12, trim: 13, legs: 2, boots: 0, chest: 5, cape: 11 },
  corvin: { skin: 10, hair: 3, helm: 5, body: 2, trim: 3, legs: 1, boots: 0, chest: 4, beard: 3 },
  maelis: { skin: 10, hair: 12, body: 11, trim: 13, legs: 2, boots: 9, chest: 13 },
  goran: { skin: 10, hair: 6, body: 4, trim: 3, legs: 2, boots: 1, chest: 9, beard: 6 },
  isolt: { skin: 10, hair: 11, body: 11, trim: 12, legs: 2, boots: 1, chest: 4 },
  dunmar: { skin: 10, hair: 3, body: 14, trim: 15, legs: 3, boots: 9, chest: 14, beard: 3 },
  hildsoot: { skin: 10, hair: 7, hood: 7, body: 8, trim: 9, legs: 1, boots: 9, chest: 8 },
  rook: { skin: 10, hair: 1, hood: 1, body: 1, trim: 13, legs: 1, boots: 0, chest: 14, mask: 1 },
  aurel: { skin: 10, hair: 6, hood: 5, body: 5, trim: 12, legs: 3, boots: 9, chest: 12 },
  thessaly: { skin: 10, hair: 14, body: 3, trim: 15, legs: 1, boots: 9, chest: 15 },
  garrow: { skin: 10, hair: 9, helm: 4, body: 9, trim: 12, legs: 2, boots: 1, chest: 10, beard: 9 },
  nessa: { skin: 10, hair: 13, body: 5, trim: 11, legs: 2, boots: 9, chest: 5 },
  varro: { skin: 10, hair: 1, body: 11, trim: 0, legs: 2, boots: 0, chest: 10, beard: 1, cape: 11 },
  ketil: { skin: 10, hair: 11, body: 8, trim: 13, legs: 3, boots: 9, chest: 8, hood: 8 },
  brisa: { skin: 10, hair: 5, body: 14, trim: 13, legs: 3, boots: 9, chest: 13, hood: 14 },
  admiral: { skin: 4, hair: 15, body: 3, trim: 13, legs: 2, boots: 0, glow: 15, helm: 2, chest: 15, beard: 15, cape: 3, crown: 13 },
  hollowking: { skin: 6, hair: 5, body: 14, trim: 13, legs: 1, boots: 0, glow: 14, helm: 5, horns: 14, crown: 13, cape: 14, chest: 15, beard: 5 },
  keeper: { skin: 10, hair: 6, hood: 3, body: 3, trim: 15, legs: 2, boots: 1, chest: 15, beard: 6 },
  scribe: { skin: 6, hair: 5, hood: 4, body: 4, trim: 14, legs: 4, boots: 4, glow: 14, chest: 6 },
  sovereign: { skin: 12, hair: 13, body: 11, trim: 13, legs: 11, boots: 0, glow: 13, helm: 12, horns: 13, crown: 13, cape: 12, chest: 13, beard: 12 },
  kragnar: { skin: 4, hair: 3, helm: 3, body: 9, trim: 12, legs: 2, boots: 0, glow: 12, chest: 10, beard: 3, horns: 3, crown: 12 },
  boss:   { skin: 4, hair: 3, body: 1, trim: 13, legs: 2, boots: 0, glow: 15, helm: 3, horns: 5, crown: 13, cape: 14, chest: 13 },
};

function wolfFrame(ctx, ox, fr, pal = { fur: 4, dark: 3, light: 5, leg: 3 }) {
  const r = (c, x, y, w, h) => R(ctx, c, ox + x, y, w, h);
  const a = fr === 1, b = fr === 2;
  // legs
  r(pal.leg, 3, 11, 1, a ? 2 : 3); r(pal.leg, 5, 11, 1, b ? 2 : 3);
  r(pal.leg, 9, 11, 1, b ? 2 : 3); r(pal.leg, 11, 11, 1, a ? 2 : 3);
  // body
  r(pal.fur, 2, 6, 10, 5); r(pal.light, 3, 6, 8, 1); r(pal.dark, 2, 10, 10, 1);
  // tail
  r(pal.fur, 0, 6, 2, 2); r(pal.dark, 0, 8, 1, 1);
  // head
  r(pal.fur, 11, 4, 4, 5); r(pal.light, 11, 4, 3, 1);
  r(2, 11, 3, 1, 1); r(2, 13, 3, 1, 1); // ears
  r(0, 15, 7, 1, 2); r(6, 13, 8, 2, 1); // nose / teeth
  r(11, 13, 5, 1, 1); // eye
}


// Deer: long legs, arched neck, branching antlers (side view, facing right).
function deerFrame(ctx, ox, fr, pal = { body: 10, back: 9, belly: 6, leg: 9, ant: 9 }) {
  const r = (c, x, y, w, h) => R(ctx, c, ox + x, y, w, h);
  const a = fr === 1, b = fr === 2;
  r(pal.leg, 3, 10, 1, a ? 5 : 6); r(pal.leg, 5, 10, 1, b ? 5 : 6); r(pal.leg, 9, 10, 1, b ? 5 : 6); r(pal.leg, 11, 10, 1, a ? 5 : 6);   // long legs
  r(pal.body, 2, 6, 11, 5); r(pal.back, 2, 6, 11, 1); r(pal.belly, 3, 10, 8, 1); r(6, 1, 6, 1, 2);                                    // body, dark back, pale belly, white tail
  r(pal.body, 10, 3, 3, 4); r(pal.body, 12, 1, 4, 3); r(pal.body, 14, 3, 3, 2); r(0, 15, 3, 1, 1); r(0, 14, 2, 1, 1);               // neck, head, snout, nose, eye
  r(pal.ant, 11, 0, 1, 2); r(pal.ant, 13, 0, 1, 2); r(pal.ant, 10, 1, 1, 1); r(pal.ant, 14, 1, 1, 1); r(pal.ant, 12, 2, 1, 1); r(pal.body, 12, 1, 1, 1);   // antlers, ear
  if (pal.ant === 6) { r(6, 9, 0, 1, 1); r(6, 15, 0, 1, 1); r(6, 8, 1, 1, 1); r(6, 12, 0, 1, 1); }   // a crown of extra tines
}
// Shadow lynx: low and heavy, tufted ears, ruff, stub tail with a dark tip, spotted coat.
function lynxFrame(ctx, ox, fr) {
  const r = (c, x, y, w, h) => R(ctx, c, ox + x, y, w, h);
  const a = fr === 1, b = fr === 2;
  r(9, 3, 11, 2, a ? 2 : 3); r(9, 5, 11, 1, b ? 2 : 3); r(9, 9, 11, 1, b ? 2 : 3); r(9, 11, 11, 2, a ? 2 : 3);   // thick legs
  r(10, 3, 6, 10, 5); r(9, 3, 10, 10, 1); r(6, 4, 6, 7, 1);                                                      // body, belly shadow, light back
  r(9, 5, 7, 1, 1); r(9, 8, 8, 1, 1); r(9, 10, 7, 1, 1);                                                          // spots
  r(10, 1, 7, 2, 2); r(0, 1, 7, 1, 2);                                                                            // stub tail, dark tip
  r(10, 11, 4, 4, 5); r(6, 11, 8, 5, 2); r(6, 12, 9, 3, 1);                                                       // head, ruff
  r(0, 11, 2, 1, 2); r(0, 13, 2, 1, 2); r(10, 11, 3, 1, 1); r(10, 13, 3, 1, 1);                                   // ear tufts
  r(0, 15, 7, 1, 1); r(13, 13, 5, 1, 1);                                                                          // nose, eye
}
// Ember fox: small and quick, black socks, a big white-tipped brush.
function foxFrame(ctx, ox, fr) {
  const r = (c, x, y, w, h) => R(ctx, c, ox + x, y, w, h);
  const a = fr === 1, b = fr === 2;
  r(0, 4, 11, 1, a ? 2 : 3); r(0, 6, 11, 1, b ? 2 : 3); r(0, 9, 11, 1, b ? 2 : 3); r(0, 11, 11, 1, a ? 2 : 3);
  r(12, 3, 7, 9, 4); r(13, 4, 7, 7, 1); r(6, 4, 10, 6, 1);
  r(12, 0, 6, 4, 3); r(12, 1, 5, 3, 1); r(6, 0, 7, 2, 2); r(6, 0, 9, 1, 1);                                        // brush and white tip
  r(12, 11, 5, 4, 4); r(6, 11, 8, 3, 1); r(6, 13, 6, 2, 1); r(0, 15, 7, 1, 1);                                     // head, cheek, nose
  r(12, 11, 3, 1, 2); r(0, 11, 3, 1, 1); r(12, 13, 3, 1, 2); r(0, 13, 3, 1, 1); r(0, 13, 5, 1, 1);                // ears, eye
}
// Snow hare: round body, long upright ears, big hind legs, hops (frame 1 stretched, frame 2 tucked).
function hareFrame(ctx, ox, fr) {
  const r = (c, x, y, w, h) => R(ctx, c, ox + x, y, w, h);
  const air = fr === 1 ? -1 : 0, tuck = fr === 2;
  r(5, 3, 11 + air, 3, tuck ? 2 : 3); r(5, 4, 12 + air, 2, 1); r(5, 8, 12 + air, 2, 1);
  r(6, 3, 8 + air, 8, 4); r(5, 4, 11 + air, 6, 1); r(4, 3, 8 + air, 2, 2);                                          // body, haunch, tail
  r(6, 10, 6 + air, 4, 4); r(5, 13, 8 + air, 1, 2); r(0, 14, 7 + air, 1, 1); r(0, 12, 7 + air, 1, 1);               // head, nose, eye
  r(6, 10, 2 + air, 2, 4); r(4, 10, 2 + air, 2, 1); r(6, 12, 3 + air, 1, 2); r(5, 11, 2 + air, 1, 2);               // long ears (dark tips)
}

// Glacial wyrm: an undulating ice serpent seen from the side, head to the right.
function wyrmFrame(ctx, ox, fr) {
  const r = (c, x, y, w, h) => R(ctx, c, ox + x, y, w, h);
  const a = [0, 1, 0][fr], b = [1, 0, 1][fr];
  r(3, 0, 11 + b, 2, 1); r(15, 1, 10 + b, 3, 1);                 // tail tip
  r(15, 3, 9 + a, 4, 3); r(6, 3, 9 + a, 4, 1); r(3, 3, 11 + a, 4, 1);   // rear body
  r(15, 6, 7 + b, 4, 4); r(6, 6, 7 + b, 4, 1); r(3, 6, 10 + b, 4, 1);   // coil
  r(15, 9, 6 + a, 4, 4); r(6, 9, 6 + a, 4, 1);                          // mid body
  r(15, 11, 5, 3, 5); r(6, 11, 5, 2, 1);                                  // neck
  r(5, 10, 3, 1, 3); r(5, 7, 2, 1, 2); r(5, 4, 3, 1, 2);                 // dorsal spikes
  r(15, 12, 3, 4, 4); r(6, 12, 3, 3, 1); r(5, 13, 1, 1, 3);               // head, horn
  r(15, 14, 5, 2, 2); r(6, 14, 6, 2, 1); r(11, 14, 4, 1, 1);              // jaw, eye
  r(6, 3, 12 + a, 1, 1);
}

// The Tidemother: a drowned queen, bell-shaped head over trailing tendrils (side view, faces right).
function tideFrame(ctx, ox, fr) {
  const r = (c, x, y, w, h) => R(ctx, c, ox + x, y, w, h);
  const a = [0, 1, 0][fr], b = [1, 0, 1][fr];
  r(15, 4, 1, 8, 2); r(15, 3, 3, 10, 5); r(6, 5, 2, 4, 1); r(3, 3, 7, 10, 1);          // bell
  r(8, 5, 4, 2, 2); r(13, 9, 4, 1, 1);                                                    // eye
  r(14, 6, 8, 4, 1); r(14, 4, 8, 1, 1);                                                   // gills / mouth
  r(15, 3, 8 + a, 2, 4); r(15, 6, 8 + b, 2, 5); r(15, 9, 8 + a, 2, 4); r(15, 12, 8 + b, 2, 3);  // tendrils
  r(3, 4, 12 + a, 1, 2); r(3, 7, 13, 1, 2); r(3, 10, 12 + a, 1, 2); r(3, 13, 13, 1, 2);
  r(5, 5, 1, 1, 1); r(13, 11, 2, 1, 1);
}

// The Ashen Root: a gnarled, many-armed blight tree with an ember glow in its hollow.
function rootFrame(ctx, ox, fr) {
  const r = (c, x, y, w, h) => R(ctx, c, ox + x, y, w, h);
  const a = [0, 1, 0][fr], b = [1, 0, 1][fr];
  r(7, 4, 1, 8, 2); r(7, 3, 3 + a, 3, 2); r(7, 10, 2, 3, 3); r(8, 2, 3, 2, 1);          // crown of leaves
  r(9, 4, 4, 8, 8); r(10, 5, 5, 6, 6); r(9, 4, 12, 8, 1);                                // trunk
  r(0, 6, 7, 2, 3); r(12, 7, 8, 2, 2); r(12, 8, 7, 1, 1); r(12, 7, 6, 1, 1); r(12, 8, 6, 1, 1);  // hollow face and embers
  r(9, 2, 5 + a, 2, 4); r(9, 12, 5 + b, 2, 4);                                            // arms
  r(10, 3, 12, 2, 2 + a); r(10, 6, 13, 3, 2); r(10, 10, 12, 2, 2 + b);                   // roots
  r(8, 0, 12, 2, 1); r(8, 14, 11, 2, 1);
}

// ---- creatures (side view, facing right, 3 frames each)
function bearFrame(ctx, ox, fr) {
  const r = (c, x, y, w, h) => R(ctx, c, ox + x, y, w, h);
  const a = fr === 1, b = fr === 2;
  r(3, 2, 11, 3, a ? 2 : 3); r(3, 5, 11, 3, b ? 2 : 3); r(3, 9, 11, 3, b ? 2 : 3); r(3, 12, 11, 3, a ? 2 : 3);
  r(5, 1, 4, 11, 7); r(6, 2, 3, 10, 5); r(4, 2, 10, 11, 1);                   // body, back, belly shadow
  r(6, 6, 2, 3, 3);                                                             // shoulder hump
  r(5, 11, 3, 5, 6); r(6, 11, 3, 4, 3); r(4, 13, 3, 2, 2); r(2, 12, 4, 1, 1);   // head, snout, ear
  r(0, 15, 7, 1, 2); r(11, 13, 5, 1, 1); r(0, 15, 5, 1, 1);                    // nose, eye
}
function boarFrame(ctx, ox, fr) {
  const r = (c, x, y, w, h) => R(ctx, c, ox + x, y, w, h);
  const a = fr === 1, b = fr === 2;
  r(1, 3, 12, 1, a ? 2 : 3); r(1, 5, 12, 1, b ? 2 : 3); r(1, 10, 12, 1, b ? 2 : 3); r(1, 12, 12, 1, a ? 2 : 3);
  r(9, 2, 7, 11, 5); r(9, 5, 6, 8, 1); r(3, 3, 6, 4, 1); r(3, 2, 7, 1, 1);        // body, ridge of bristles
  r(9, 12, 6, 4, 4); r(10, 14, 8, 2, 1); r(5, 12, 5, 2, 2);                       // head, snout, ear
  r(5, 14, 11, 1, 2); r(5, 14, 12, 1, 2); r(0, 15, 9, 1, 2); r(11, 13, 7, 1, 1);  // tusk, tusk tip, nose, eye
}
function wispFrame(ctx, ox, fr) {
  const r = (c, x, y, w, h) => R(ctx, c, ox + x, y, w, h);
  const w = [0, 1, 0][fr];
  r(5, 5, 4 + w, 6, 6); r(15, 4, 5 + w, 8, 4); r(6, 3, 6 + w, 4, 2); r(15, 5, 3 + w, 6, 6);
  r(13, 6, 8 + w, 4, 2); r(6, 7, 7 + w, 2, 2); r(15, 10, 11 + w, 2, 3); r(5, 7, 13 + w, 2, 2); r(0, 6, 7 + w, 1, 1); r(0, 9, 7 + w, 1, 1);
}
function wormFrame(ctx, ox, fr) {
  const r = (c, x, y, w, h) => R(ctx, c, ox + x, y, w, h);
  const a = [0, 1, 0][fr], b = [1, 0, 1][fr];
  r(9, 0, 11 + b, 3, 4); r(10, 3, 9 + a, 4, 6); r(9, 7, 8 + b, 4, 6); r(10, 10, 9 + a, 4, 5); r(9, 5, 5, 6, 8);   // segments
  r(10, 12, 4, 2, 4); r(8, 5, 7, 1, 2); r(13, 7, 6, 1, 1); r(0, 14, 6, 1, 2); r(12, 13, 5, 3, 1); r(6, 12, 5, 3, 1);  // ringed head, maw
  r(8, 3, 9 + a, 1, 1);
}
function mimicFrame(ctx, ox, fr) {
  const r = (c, x, y, w, h) => R(ctx, c, ox + x, y, w, h);
  const open = [0, 3, 1][fr];
  r(9, 1, 8 + open, 14, 4); r(10, 2, 8 + open, 12, 1); r(13, 1, 9 + open, 14, 1);    // lid
  r(9, 1, 11, 14, 4); r(10, 2, 11, 12, 1); r(13, 1, 12, 14, 1); r(3, 2, 11, 1, 3); r(3, 13, 11, 1, 3);   // body, bands
  for (let i = 0; i < 4; i++) { r(6, 3 + i * 3, 11 + (open ? 0 : 0), 2, 2); r(6, 4 + i * 3, 8 + open + 2, 2, 2); }   // teeth
  r(11, 7, 9 + open, 2, 2); r(0, 7, 9 + open, 1, 1); r(11, 12, 15, 2, 1);                // eyes
  if (open > 1) r(11, 3, 10, 10, 1);
}
function wyvernFrame(ctx, ox, fr) {
  const r = (c, x, y, w, h) => R(ctx, c, ox + x, y, w, h);
  const up = fr === 1, dn = fr === 2;
  r(2, up ? 0 : 2, up ? 1 : 3, 5, up ? 6 : 4); r(3, up ? 1 : 3, up ? 2 : 4, 3, up ? 4 : 2); r(13, up ? 0 : 3, up ? 6 : 8, 3, 1); // wing near
  r(2, dn ? 5 : 3, dn ? 8 : 6, 5, 4);                                                                                              // wing far
  r(13, 5, 6, 7, 5); r(6, 6, 7, 5, 1); r(13, 11, 7, 3, 4); r(2, 0, 6, 5, 1);                                                      // body, spine, tail
  r(13, 11, 6, 4, 3); r(6, 13, 5, 1, 1); r(15, 14, 9, 1, 2); r(11, 13, 7, 1, 1); r(13, 8, 4, 2, 2);                                // head, horn, eye
  r(12, 14, 8, 2, 1);
}
// Skaldrath is drawn on a bigger 48x32 cell so it can have a real dragon silhouette: horned head on a curving
// neck, open jaw with fire, bat wings, spiked tail, clawed legs. Faces right; fr = wing beat (0 mid, 1 up, 2 down).
function px(ctx, col, x, y) { ctx.fillStyle = PAL[col]; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); }
function line(ctx, col, x0, y0, x1, y1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
  for (let i = 0; i <= n; i++) px(ctx, col, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n);
}
function tri(ctx, col, ax, ay, bx, by, cx, cy) {
  const x0 = Math.floor(Math.min(ax, bx, cx)), x1 = Math.ceil(Math.max(ax, bx, cx));
  const y0 = Math.floor(Math.min(ay, by, cy)), y1 = Math.ceil(Math.max(ay, by, cy));
  const d = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay) || 1;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const u = ((x - ax) * (cy - ay) - (cx - ax) * (y - ay)) / d, v = ((bx - ax) * (y - ay) - (x - ax) * (by - ay)) / d;
    if (u >= -0.02 && v >= -0.02 && u + v <= 1.02) px(ctx, col, x, y);
  }
}
const DRAGON_WING = [
  { el: [15, 8], wr: [8, 4], tips: [[0, 8], [2, 15], [8, 19], [13, 18]] },
  { el: [17, 5], wr: [12, 0], tips: [[3, 2], [1, 9], [5, 15], [12, 17]] },
  { el: [14, 17], wr: [6, 21], tips: [[0, 22], [3, 28], [10, 30], [15, 24]] },
];
function dragonWing(ctx, w, sx, sy, dx, dy, mem, bone) {
  const S = [sx, sy], P = (p) => [p[0] + dx, p[1] + dy];
  const el = P(w.el), wr = P(w.wr), tips = w.tips.map(P);
  tri(ctx, mem, S[0], S[1], wr[0], wr[1], tips[0][0], tips[0][1]);
  for (let i = 0; i < tips.length - 1; i++) tri(ctx, mem, S[0], S[1], tips[i][0], tips[i][1], tips[i + 1][0], tips[i + 1][1]);
  line(ctx, bone, S[0], S[1], el[0], el[1]); line(ctx, bone, el[0], el[1], wr[0], wr[1]);
  tips.forEach((t) => line(ctx, bone, wr[0], wr[1], t[0], t[1]));
}
function dragonBig(ctx, ox, fr, mode = null) {
  const r = (c, x, y, w, h) => R(ctx, c, ox + x, y, w, h);
  const P = (c, x, y) => px(ctx, c, ox + x, y);
  const L = (c, x0, y0, x1, y1) => line(ctx, c, ox + x0, y0, ox + x1, y1);
  const bob = fr === 1 ? 1 : 0;
  const W = DRAGON_WING[fr];
  // far wing first (darker, peeking behind)
  dragonWing(ctx, W, ox + 22, 15 + bob, ox + 5, -2, 14, 1);
  // tail: thick at the hip, whipping out to a spade tip, spikes on top
  [[11, 20, 5, 4], [8, 22, 4, 3], [5, 23, 4, 3], [2, 24, 4, 2], [0, 25, 3, 2]].forEach(([x, y, w, h]) => r(11, x, y + bob, w, h));
  r(12, 3, 24 + bob, 5, 1); r(12, 7, 22 + bob, 4, 1);
  [[10, 19], [7, 21], [4, 22], [1, 23]].forEach(([x, y]) => { P(13, x, y + bob); P(13, x + 1, y + bob); P(13, x, y - 1 + bob); });
  tri(ctx, 12, ox + 0, 24 + bob, ox + 0, 29 + bob, ox + 4, 27 + bob);   // spade tail tip
  // hind leg + front leg (claws), walking
  const lift = fr === 2 ? 1 : 0;
  r(11, 13, 23, 6, 4); r(12, 14, 23, 4, 1);                      // thigh
  r(11, 14, 26, 3, 3 - lift); r(13, 13, 29 - lift, 5, 1); P(6, 13, 30 - lift); P(6, 15, 30 - lift); P(6, 17, 30 - lift);
  r(11, 27, 24, 4, 3); r(11, 28, 26, 3, 3 - (1 - lift)); r(13, 27, 29 - (1 - lift), 5, 1); P(6, 28, 30 - (1 - lift)); P(6, 30, 30 - (1 - lift)); P(6, 32, 30 - (1 - lift));
  // body: barrel chest, golden belly plates, dorsal ridge
  r(11, 11, 15 + bob, 20, 9); r(11, 13, 14 + bob, 16, 1); r(11, 14, 24 + bob, 14, 1);
  r(12, 14, 16 + bob, 12, 2);                                    // scale highlight
  r(13, 13, 22 + bob, 17, 2); for (let x = 14; x < 30; x += 3) P(12, x, 22 + bob);
  [[13, 13], [16, 13], [19, 13], [22, 13], [25, 13]].forEach(([x, y]) => { P(13, x, y + bob); P(13, x, y - 1 + bob); });
  // neck: sweeps up and forward in an S
  r(11, 28, 13 + bob, 5, 7); r(11, 31, 10, 5, 7); r(11, 33, 7, 5, 6);
  r(13, 31, 15, 2, 4); r(13, 33, 12, 2, 3); r(13, 35, 9, 2, 3);  // throat plates
  [[30, 10], [33, 7], [35, 4]].forEach(([x, y]) => { P(13, x, y + (x === 30 ? bob : 0)); });
  // head: wedge snout, brow, open jaw, teeth, nostril, ember eye, swept-back horns
  const jaw = mode === 'attack' ? 5 : mode === 'hurt' || mode === 'dead' ? 1 : fr === 1 ? 4 : fr === 2 ? 2 : 3;
  r(11, 35, 3, 6, 5); r(11, 40, 4, 6, 3); r(12, 41, 4, 4, 1);    // skull + upper snout
  P(0, 44, 4); P(0, 45, 4);                                      // nostril
  r(11, 36, 3, 4, 1); r(12, 36, 2, 3, 1);                        // brow ridge
  tri(ctx, 11, ox + 36, 8, ox + 46, 7 + jaw, ox + 38, 8 + jaw);  // lower jaw
  r(1, 38, 7, 8, 1 + Math.max(0, jaw - 2));                      // mouth gap shadow
  r(12, 39, 7, 6, 1);                                            // tongue/glow
  [40, 42, 44].forEach((x) => P(6, x, 7));                       // upper fangs
  [41, 43, 45].forEach((x) => P(6, x, 6 + jaw));                 // lower fangs
  if (fr === 1 || mode === 'attack') { r(13, 46, 6, 2, 3); r(12, 47, 5, 1, 4); }      // fire licking from the open maw
  if (mode === 'attack') { r(12, 44, 8, 3, 1); r(13, 45, 8, 1, 1); r(11, 47, 7, 1, 2); }   // a bigger gout of fire
  if (mode === 'hurt' || mode === 'dead') { P(0, 38, 4); P(0, 39, 4); } else { P(13, 38, 4); P(0, 39, 4); }   // eye (shut when hurt)
  L(6, 36, 3, 31, 0); L(10, 37, 2, 33, 0); P(6, 35, 3);          // horns
  L(13, 35, 6, 31, 7);                                           // spine frill
  // near wing on top
  dragonWing(ctx, W, ox + 20, 15 + bob, ox, bob, 12, 0);
  // wing shoulder/muscle
  r(11, 17, 14 + bob, 6, 3); r(12, 18, 14 + bob, 3, 1);
}

// 1px dark outline inside each 16x16 cell so sprites read on bright snow.
function outline(ctx, w, h, cw = 16) {
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  const a = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[(y * w + x) * 4 + 3]);
  const add = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (a(x, y)) continue;
    const cx = x % cw;
    const nb = (cx > 0 && a(x - 1, y)) || (cx < cw - 1 && a(x + 1, y)) || (y > 0 && a(x, y - 1)) || (y < h - 1 && a(x, y + 1));
    if (nb) add.push([x, y]);
  }
  ctx.fillStyle = PAL[0];
  for (const [x, y] of add) ctx.fillRect(x, y, 1, 1);
}

// A sheet of named frames of any cell size: frames = [{ name, draw(ctx, ox) }]. Used by creatures that need more than the
// standard 3-frame humanoid layout (see ANIM_CLIPS in art/anim.js for how frames are grouped into animations).
function buildSheet(scene, key, cw, ch, frames, post = null) {
  const cv = canvas(cw * frames.length, ch), ctx = cv.getContext('2d');
  frames.forEach((f, i) => f.draw(ctx, i * cw));
  if (post) post(ctx, cw, ch, frames);
  outline(ctx, cv.width, cv.height, cw);
  const tex = scene.textures.addCanvas(key, cv);
  frames.forEach((f, i) => tex.add(f.name, 0, i * cw, 0, cw, ch));
}


// Four-legged creatures: side0..2 (stand, stride, stride) + hurt0 (jolted upright) + death0 (on its back, legs in the air).
function animalSheet(scene, key, draw) {
  buildSheet(scene, key, 16, 16, [
    { name: 'side0', draw: (c, ox) => draw(c, ox, 0) },
    { name: 'side1', draw: (c, ox) => draw(c, ox, 1) },
    { name: 'side2', draw: (c, ox) => draw(c, ox, 2) },
    { name: 'hurt0', draw: (c, ox) => draw(c, ox, 1) },
    { name: 'death0', draw: (c, ox) => draw(c, ox, 0) },
  ], (ctx, cw, ch) => {
    const hurt = ctx.getImageData(cw * 3, 0, cw, ch);                       // hurt: the stride frame shoved up and back a pixel
    ctx.clearRect(cw * 3, 0, cw, ch); ctx.putImageData(hurt, cw * 3 - 1, -1, 1, 1, cw - 1, ch - 1);
    const dead = ctx.getImageData(cw * 4, 0, cw, ch);                       // death: flipped belly-up and dropped to the ground
    ctx.clearRect(cw * 4, 0, cw, ch);
    const tmp = canvas(cw, ch); tmp.getContext('2d').putImageData(dead, 0, 0);
    ctx.save(); ctx.translate(cw * 4, ch + 1); ctx.scale(1, -1); ctx.drawImage(tmp, 0, 0); ctx.restore();
  });
}

function buildCharacters(scene) {
  const make = (key, fn, frames = ['down', 'up', 'side', 'atkdown', 'atkup', 'atkside', 'hurt', 'dead']) => {
    const cv = canvas(16 * frames.length * 3, 16);
    const ctx = cv.getContext('2d');
    // Draw first, upload second: WebGL snapshots the canvas when it is added.
    frames.forEach((d, di) => { for (let f = 0; f < 3; f++) fn(ctx, (di * 3 + f) * 16, d, f); });
    outline(ctx, cv.width, cv.height);
    const tex = scene.textures.addCanvas(key, cv);
    frames.forEach((d, di) => { for (let f = 0; f < 3; f++) tex.add(`${d}${f}`, 0, (di * 3 + f) * 16, 0, 16, 16); });
  };
  for (const [name, st] of Object.entries(STYLES)) {
    make('spr_' + name, (ctx, x, d, f) => humanoid(ctx, x, d, f, st));
  }
  for (const col of [15, 8, 13, 14, 6]) make('spr_cloak_' + col, (ctx, x, d, f) => humanoid(ctx, x, d, f, { ...STYLES.player, cape: col }));
  animalSheet(scene, 'spr_wolf', (c, x, f) => wolfFrame(c, x, f));
  animalSheet(scene, 'spr_deer', deerFrame);
  animalSheet(scene, 'spr_elk', (c, x, f) => deerFrame(c, x, f, { body: 4, back: 3, belly: 6, leg: 3, ant: 6 }));
  animalSheet(scene, 'spr_fox', foxFrame);
  animalSheet(scene, 'spr_hare', hareFrame);
  animalSheet(scene, 'spr_grimfang', (c, x, f) => wolfFrame(c, x, f, { fur: 5, dark: 4, light: 6, leg: 4 }));
  make('spr_wyrm', (ctx, x, d, f) => wyrmFrame(ctx, x, f), ['side']);
  make('spr_tide', (ctx, x, d, f) => tideFrame(ctx, x, f), ['side']);
  make('spr_root', (ctx, x, d, f) => rootFrame(ctx, x, f), ['side']);
  animalSheet(scene, 'spr_bear', bearFrame);
  animalSheet(scene, 'spr_lynx', lynxFrame);
  animalSheet(scene, 'spr_boar', boarFrame);
  make('spr_wisp', (ctx, x, d, f) => wispFrame(ctx, x, f), ['side']);
  make('spr_worm', (ctx, x, d, f) => wormFrame(ctx, x, f), ['side']);
  make('spr_mimic', (ctx, x, d, f) => mimicFrame(ctx, x, f), ['side']);
  make('spr_wyvern', (ctx, x, d, f) => wyvernFrame(ctx, x, f), ['side']);
  buildSheet(scene, 'spr_dragon', 48, 32, [
    { name: 'side0', draw: (c, ox) => dragonBig(c, ox, 0) },
    { name: 'side1', draw: (c, ox) => dragonBig(c, ox, 1) },
    { name: 'side2', draw: (c, ox) => dragonBig(c, ox, 2) },
    { name: 'attack0', draw: (c, ox) => dragonBig(c, ox, 1, 'attack') },
    { name: 'hurt0', draw: (c, ox) => dragonBig(c, ox, 2, 'hurt') },
    { name: 'death0', draw: (c, ox) => dragonBig(c, ox, 2, 'dead') },
  ], (ctx, cw, ch) => {
    // the death frame is the hurt pose rolled onto its back: copy it flipped, then clear the original
    const dx = cw * 5, img = ctx.getImageData(dx, 0, cw, ch);
    ctx.clearRect(dx, 0, cw, ch);
    const tmp = canvas(cw, ch), t = tmp.getContext('2d'); t.putImageData(img, 0, 0);
    ctx.save(); ctx.translate(dx, ch - 1); ctx.scale(1, -1); ctx.drawImage(tmp, 0, 0); ctx.restore();
  });
  make('spr_shroom', (ctx, x, d, f) => { const r = (c, xx, y, w, h) => R(ctx, c, x + xx, y, w, h); const p = [0, 1, 0][f]; r(11, 3, 5 - p, 10, 4 + p); r(14, 4, 5 - p, 8, 1); r(13, 5, 7, 2, 1); r(13, 9, 7, 2, 1); r(6, 6, 8, 4, 6); r(5, 7, 9, 2, 4); r(10, 5, 12, 6, 2); r(7, 4, 6, 1, 1); }, ['side']);
  animalSheet(scene, 'spr_alpha', (c, x, f) => wolfFrame(c, x, f, { fur: 2, dark: 1, light: 3, leg: 1 }));
}

// --------------------------------------------------------------------- tiles
function speckle(ctx, ox, oy, seed, cols, count) {
  for (let i = 0; i < count; i++) {
    const x = Math.floor(hash(i, seed, 1) * T), y = Math.floor(hash(i, seed, 2) * T);
    R(ctx, cols[Math.floor(hash(i, seed, 3) * cols.length)], ox + x, oy + y, 1, 1);
  }
}

function drawTile(ctx, id, ox) {
  const o = (c, x, y, w = 1, h = 1) => R(ctx, c, ox + x, y, w, h);
  const snow = () => { o(5, 0, 0, 16, 16); speckle(ctx, ox, 0, id + 1, [6, 6, 4], 7); };
  const cfloor = () => { o(2, 0, 0, 16, 16); o(1, 0, 15, 16, 1); o(1, 15, 0, 1, 16); speckle(ctx, ox, 0, id + 7, [3, 1], 6); };
  switch (id) {
    case TILE.SNOW: snow(); break;
    case TILE.SNOW2: o(5, 0, 0, 16, 16); speckle(ctx, ox, 0, 99, [6, 6, 6, 4, 3], 14); break;
    case TILE.ICE:
      o(4, 0, 0, 16, 16); o(5, 2, 3, 6, 1); o(6, 3, 2, 3, 1); o(5, 9, 10, 5, 1); o(3, 0, 8, 16, 1);
      o(6, 11, 4, 1, 1); o(5, 4, 12, 2, 1); break;
    case TILE.STONE:
      o(3, 0, 0, 16, 16); o(2, 0, 5, 16, 1); o(2, 0, 10, 16, 1); o(2, 8, 0, 1, 5); o(2, 4, 6, 1, 4); o(2, 12, 6, 1, 4); o(2, 8, 11, 1, 5);
      o(6, 0, 0, 16, 2); o(5, 0, 2, 16, 1); break;
    case TILE.PINE: {
      snow();
      o(0, 3, 13, 10, 1); // shadow-ish base
      o(9, 7, 12, 2, 3);
      for (let t = 0; t < 3; t++) {
        const top = 0 + t * 4;
        for (let r = 0; r < 5; r++) {
          const w = Math.min(2 + r * 2 + t, 12); const x = 8 - w / 2;
          o(r < 2 ? 8 : 7, x, top + r, w, 1);
          if (r < 2) o(6, x, top + r, Math.max(1, w / 2 - 1), 1);
          o(0, x + w - 1, top + r, 1, 1);
        }
      }
      break;
    }
    case TILE.PATH: o(10, 0, 0, 16, 16); speckle(ctx, ox, 0, 55, [9, 9, 5, 5, 4], 16); o(9, 0, 15, 16, 1); break;
    case TILE.WOODFLOOR: o(10, 0, 0, 16, 16); for (let y = 3; y < 16; y += 4) o(9, 0, y, 16, 1); o(9, 5, 0, 1, 3); o(9, 11, 4, 1, 4); break;
    case TILE.WOODWALL: o(9, 0, 0, 16, 16); for (let x = 3; x < 16; x += 4) o(10, x, 0, 1, 15); o(1, 0, 14, 16, 2); break;
    case TILE.ROOF:
      o(5, 0, 0, 16, 16); for (let y = 0; y < 16; y += 4) { o(4, 0, y + 3, 16, 1); o(6, 0, y, 16, 1); }
      for (let y = 0; y < 16; y += 4) for (let x = (y / 4) % 2 ? 4 : 0; x < 16; x += 8) o(4, x, y, 1, 3);
      break;
    case TILE.CFLOOR: cfloor(); break;
    case TILE.CWALL:
      o(1, 0, 0, 16, 16); o(2, 0, 0, 16, 1); o(0, 0, 7, 16, 1); o(0, 0, 15, 16, 1);
      o(0, 7, 0, 1, 7); o(0, 3, 8, 1, 7); o(0, 11, 8, 1, 7); o(3, 1, 1, 5, 1); o(3, 9, 9, 5, 1); break;
    case TILE.ROCK:
      snow(); o(3, 2, 5, 12, 9); o(3, 4, 3, 8, 2); o(4, 3, 6, 6, 4); o(6, 4, 3, 6, 2); o(2, 2, 13, 12, 1); o(5, 5, 6, 3, 1); break;
    case TILE.PILLAR:
      cfloor(); o(0, 3, 14, 10, 2); o(4, 4, 2, 8, 12); o(5, 5, 2, 2, 11); o(3, 10, 2, 2, 12); o(6, 4, 1, 8, 1); o(2, 4, 13, 8, 1); break;
    case TILE.BRAZIER:
      cfloor(); o(0, 4, 14, 8, 2); o(3, 5, 8, 6, 5); o(2, 5, 13, 6, 1); o(9, 7, 11, 2, 3); o(1, 5, 8, 6, 1); break;
    case TILE.STAIRS:
      o(1, 0, 0, 16, 16); o(0, 2, 0, 12, 16); for (let i = 0; i < 4; i++) o(2, 3 + i, 2 + i * 3, 10 - i * 2, 1);
      o(3, 0, 0, 2, 16); o(3, 14, 0, 2, 16); break;
    case TILE.FENCE:
      snow(); o(9, 1, 6, 14, 2); o(10, 1, 6, 14, 1); o(9, 1, 11, 14, 2); o(9, 2, 4, 2, 10); o(9, 12, 4, 2, 10); o(6, 2, 3, 2, 1); o(6, 12, 3, 2, 1); break;
    case TILE.RUG: o(11, 0, 0, 16, 16); o(1, 0, 0, 2, 16); o(1, 14, 0, 2, 16); o(13, 3, 0, 1, 16); o(13, 12, 0, 1, 16); speckle(ctx, ox, 0, 71, [0, 9], 5); break;
    case TILE.DOOR:
      o(9, 0, 0, 16, 16); o(1, 3, 0, 10, 16); o(9, 4, 1, 8, 14); o(10, 5, 2, 1, 12); o(10, 8, 2, 1, 12); o(10, 10, 2, 1, 12); o(13, 10, 8, 2, 2); o(6, 2, 0, 12, 1); break;
    case TILE.FIRE:
      o(9, 0, 0, 16, 16); o(5, 0, 0, 16, 16); o(3, 2, 6, 12, 8); o(2, 2, 12, 12, 2); o(0, 4, 5, 8, 2); o(1, 4, 5, 8, 6); o(0, 5, 7, 6, 3); o(9, 3, 9, 10, 1); o(10, 4, 9, 8, 1); break;
    case TILE.WINDOW:
      o(9, 0, 0, 16, 16); for (let x = 3; x < 16; x += 4) o(10, x, 0, 1, 15); o(1, 0, 14, 16, 2);
      o(1, 3, 3, 10, 8); o(13, 4, 4, 8, 6); o(12, 4, 8, 8, 2); o(9, 7, 4, 2, 6); o(9, 4, 6, 8, 1); break;
    case TILE.GRAVE:
      snow(); o(0, 4, 13, 8, 2); o(3, 4, 4, 8, 10); o(4, 5, 3, 6, 1); o(4, 5, 5, 1, 8); o(2, 10, 5, 1, 8); o(2, 7, 7, 2, 4); o(6, 4, 4, 8, 1); break;
    case TILE.SARCO:
      cfloor(); o(0, 1, 13, 14, 2); o(4, 1, 3, 14, 10); o(3, 1, 11, 14, 2); o(5, 2, 4, 12, 1); o(2, 6, 6, 4, 1); o(2, 7, 5, 2, 6); break;
    case TILE.SNOW3: o(5, 0, 0, 16, 16); speckle(ctx, ox, 0, 31, [6, 4], 8); o(4, 3, 10, 3, 2); o(3, 3, 12, 3, 1); o(6, 3, 10, 2, 1); o(4, 11, 4, 2, 2); o(6, 11, 4, 1, 1); o(3, 10, 6, 3, 1); break;
    case TILE.SNOW4: o(5, 0, 0, 16, 16); speckle(ctx, ox, 0, 41, [6, 6, 4], 9); for (const [x, y] of [[3, 4], [9, 9], [12, 3]]) { o(8, x, y + 1, 1, 2); o(8, x + 2, y, 1, 3); o(7, x + 1, y + 1, 1, 2); } break;
    case TILE.PATH2: o(10, 0, 0, 16, 16); speckle(ctx, ox, 0, 61, [9, 9, 4, 5, 3], 20); o(9, 0, 7, 16, 1); o(9, 6, 0, 1, 16); o(5, 8, 3, 2, 1); break;
    case TILE.CFLOOR2: cfloor(); o(1, 4, 3, 1, 5); o(1, 5, 7, 3, 1); o(1, 8, 8, 1, 4); o(1, 9, 11, 3, 1); o(3, 10, 4, 2, 1); break;
    case TILE.CWALL2:
      o(1, 0, 0, 16, 16); o(2, 0, 0, 16, 1); o(0, 0, 7, 16, 1); o(0, 0, 15, 16, 1); o(0, 7, 0, 1, 7); o(0, 3, 8, 1, 7); o(0, 11, 8, 1, 7);
      o(7, 1, 1, 5, 2); o(8, 2, 3, 3, 1); o(7, 9, 9, 4, 2); o(8, 10, 11, 2, 1); o(8, 12, 2, 2, 1); break;
    case TILE.DEADTREE:
      snow(); o(0, 4, 14, 8, 1); o(9, 7, 6, 2, 8); o(9, 4, 5, 3, 1); o(9, 3, 3, 1, 3); o(9, 9, 7, 4, 1); o(9, 12, 4, 1, 4); o(10, 7, 6, 1, 8); o(9, 7, 2, 1, 4); o(6, 3, 3, 1, 1); o(6, 12, 4, 1, 1); o(6, 7, 2, 2, 1); break;
    case TILE.STUMP:
      snow(); o(0, 3, 13, 10, 2); o(9, 3, 6, 10, 7); o(10, 4, 5, 8, 2); o(9, 5, 7, 6, 1); o(10, 6, 7, 4, 1); o(6, 3, 5, 10, 1); o(6, 4, 4, 8, 1); o(9, 7, 6, 2, 1); break;
    case TILE.ASH: o(1, 0, 0, 16, 16); speckle(ctx, ox, 0, 131, [2, 2, 0, 3], 14); speckle(ctx, ox, 0, 132, [11, 12], 2); o(2, 0, 15, 16, 1); break;
    case TILE.BASALT: o(0, 0, 0, 16, 16); o(1, 1, 1, 14, 14); o(2, 2, 2, 5, 4); o(2, 8, 7, 6, 5); o(0, 7, 2, 1, 6); o(11, 4, 9, 1, 3); o(12, 5, 11, 2, 1); o(3, 3, 3, 2, 1); break;
    case TILE.LAVA: o(11, 0, 0, 16, 16); o(12, 1, 3, 6, 2); o(12, 8, 9, 7, 2); o(13, 3, 4, 2, 1); o(13, 10, 10, 2, 1); o(0, 0, 7, 5, 1); o(0, 11, 2, 4, 1); o(12, 5, 13, 5, 1); break;
    case TILE.ICESHELF: o(5, 0, 0, 16, 16); o(6, 1, 2, 7, 1); o(4, 0, 8, 16, 1); o(6, 9, 11, 5, 1); o(4, 4, 5, 1, 3); o(15, 11, 4, 2, 1); speckle(ctx, ox, 0, 141, [6, 4], 6); break;
    case TILE.PACKICE: o(3, 0, 0, 16, 16); o(4, 1, 1, 6, 6); o(5, 2, 2, 3, 2); o(6, 2, 2, 1, 1); o(4, 8, 6, 7, 8); o(5, 9, 7, 3, 2); o(2, 0, 7, 8, 1); o(2, 7, 0, 1, 7); o(0, 0, 15, 16, 1); o(15, 11, 9, 1, 1); break;
    case TILE.SHINGLE: o(3, 0, 0, 16, 16); speckle(ctx, ox, 0, 151, [4, 2, 5, 9], 26); o(2, 0, 15, 16, 1); o(4, 3, 4, 2, 1); o(4, 10, 11, 3, 1); break;
    case TILE.WRECK: o(9, 0, 0, 16, 16); for (let y = 2; y < 16; y += 4) o(10, 0, y, 16, 1); for (let y = 0; y < 16; y += 4) o(0, 0, y + 3, 16, 1); o(0, 4, 0, 1, 16); o(0, 11, 0, 1, 16); o(1, 0, 14, 16, 2); o(5, 2, 1, 2, 1); break;
    case TILE.MARBLE: o(5, 0, 0, 16, 16); o(6, 0, 0, 15, 1); o(6, 0, 0, 1, 15); o(4, 15, 0, 1, 16); o(4, 0, 15, 16, 1); o(4, 3, 5, 5, 1); o(4, 7, 6, 1, 4); o(6, 10, 10, 4, 1); break;
    case TILE.RUINWALL: o(3, 0, 0, 16, 16); o(4, 0, 0, 16, 1); o(2, 0, 5, 16, 1); o(2, 0, 10, 16, 1); o(2, 6, 0, 1, 5); o(2, 11, 5, 1, 5); o(2, 3, 10, 1, 6); o(8, 1, 1, 4, 3); o(7, 9, 11, 5, 3); o(8, 10, 12, 2, 1); o(0, 0, 15, 16, 1); break;
    case TILE.MOSS: o(7, 0, 0, 16, 16); speckle(ctx, ox, 0, 161, [8, 8, 2, 13], 14); o(8, 2, 3, 3, 2); o(8, 9, 10, 4, 2); o(7, 0, 15, 16, 1); break;
    case TILE.ICE2: o(4, 0, 0, 16, 16); o(5, 2, 3, 6, 1); o(3, 0, 8, 16, 1); o(2, 3, 2, 1, 4); o(2, 4, 5, 3, 1); o(2, 7, 6, 1, 5); o(2, 8, 10, 4, 1); o(6, 11, 3, 2, 1); break;
    case TILE.TUFT: snow(); for (const [x, y] of [[4, 8], [8, 6], [11, 9]]) { o(8, x, y, 1, 3); o(7, x + 1, y + 1, 1, 2); o(8, x - 1, y + 1, 1, 2); } o(6, 4, 7, 1, 1); break;
    default: o(0, 0, 0, 16, 16);
  }
}

function buildTiles(scene) {
  const cv = canvas(T * TILE_COUNT, T);
  const ctx = cv.getContext('2d');
  for (let i = 0; i < TILE_COUNT; i++) drawTile(ctx, i, i * T);
  scene.textures.addCanvas('tiles', cv);
}

// --------------------------------------------------------- misc / fx / icons
function tex(scene, key, w, h, fn) {
  const cv = canvas(w, h);
  fn(cv.getContext('2d'), w, h);
  scene.textures.addCanvas(key, cv);
}

function ring(ctx, size, th) {
  const c = size / 2 - 0.5;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const d = Math.hypot(x - c, y - c);
    if (d <= size / 2 - 0.3 && d >= size / 2 - th) R(ctx, 6, x, y);
  }
}

function buildFx(scene) {
  for (let c = 0; c < 16; c++) tex(scene, 'p' + c, 2, 2, (g) => R(g, c, 0, 0, 2, 2));
  tex(scene, 'shadow', 12, 5, (g) => {
    g.fillStyle = 'rgba(11,14,26,0.45)';
    g.fillRect(3, 0, 6, 1); g.fillRect(1, 1, 10, 3); g.fillRect(3, 4, 6, 1);
  });
  // ore node, treasure mound, shrine stone
  tex(scene, 'node', 16, 16, (g) => {
    R(g, 0, 2, 5, 12, 10); R(g, 3, 3, 4, 10, 10); R(g, 4, 4, 5, 8, 7); R(g, 2, 3, 12, 10, 2);
    R(g, 15, 5, 3, 2, 4); R(g, 6, 5, 2, 1, 2); R(g, 15, 9, 6, 2, 3); R(g, 6, 9, 7, 1, 1);
  });
  tex(scene, 'icehole', 16, 16, (g) => {
    R(g, 3, 3, 5, 10, 7); R(g, 1, 4, 6, 8, 5); R(g, 0, 5, 7, 6, 3); R(g, 15, 6, 8, 3, 1); R(g, 6, 4, 6, 8, 1);
  });
  // footprints, ravens, hot spring, steam
  tex(scene, 'paw', 8, 8, (g) => { R(g, 3, 3, 4, 2, 2); R(g, 3, 1, 2, 1, 1); R(g, 3, 3, 1, 1, 1); R(g, 3, 5, 2, 1, 1); R(g, 3, 6, 4, 1, 1); });
  tex(scene, 'foot', 4, 4, (g) => { R(g, 3, 0, 0, 2, 3); R(g, 3, 1, 3, 1, 1); });
  tex(scene, 'raven0', 8, 6, (g) => { R(g, 0, 1, 2, 5, 3); R(g, 0, 5, 1, 2, 2); R(g, 0, 0, 2, 2, 1); R(g, 12, 6, 2, 1, 1); R(g, 0, 2, 5, 1, 1); });
  tex(scene, 'raven1', 8, 6, (g) => { R(g, 0, 1, 3, 5, 2); R(g, 0, 5, 2, 2, 1); R(g, 0, 0, 3, 2, 1); R(g, 0, 0, 0, 3, 1); R(g, 0, 5, 0, 3, 1); R(g, 12, 6, 3, 1, 1); });
  tex(scene, 'spring', 16, 16, (g) => {
    R(g, 2, 2, 5, 12, 8); R(g, 3, 1, 4, 14, 8); R(g, 15, 2, 5, 12, 6); R(g, 15, 3, 6, 10, 4); R(g, 6, 4, 6, 2, 1); R(g, 6, 9, 8, 3, 1); R(g, 5, 2, 4, 1, 1); R(g, 5, 13, 4, 1, 1);
  });
  // cottage furnishings
  tex(scene, 'stash', 16, 16, (g) => { R(g, 0, 1, 5, 14, 10); R(g, 9, 2, 6, 12, 8); R(g, 10, 2, 6, 12, 1); R(g, 13, 7, 9, 2, 2); R(g, 3, 1, 9, 14, 1); R(g, 12, 6, 7, 4, 2); });
  tex(scene, 'garden', 16, 16, (g) => { R(g, 0, 1, 8, 14, 7); R(g, 9, 2, 9, 12, 5); R(g, 7, 2, 7, 12, 2); for (const [x, y, c] of [[3, 4, 8], [7, 3, 8], [11, 5, 8], [5, 6, 11], [9, 5, 15]]) { R(g, c, x, y, 2, 3); R(g, 7, x, y + 2, 1, 2); } });
  tex(scene, 'trophywall', 16, 16, (g) => { R(g, 0, 1, 1, 14, 12); R(g, 9, 2, 2, 12, 10); R(g, 13, 7, 4, 2, 2); R(g, 6, 4, 5, 8, 4); R(g, 10, 3, 3, 3, 1); R(g, 10, 10, 3, 3, 1); R(g, 13, 7, 8, 2, 2); R(g, 6, 7, 9, 2, 1); });
  tex(scene, 'cookpot', 16, 16, (g) => { R(g, 0, 3, 7, 10, 7); R(g, 3, 4, 7, 8, 6); R(g, 12, 5, 7, 6, 2); R(g, 6, 5, 6, 6, 1); R(g, 9, 3, 13, 1, 3); R(g, 9, 12, 13, 1, 3); R(g, 9, 2, 6, 12, 1); });
  tex(scene, 'mound', 16, 16, (g) => {
    R(g, 0, 3, 11, 10, 3); R(g, 5, 2, 9, 12, 3); R(g, 6, 4, 8, 8, 2); R(g, 6, 5, 9, 6, 1); R(g, 13, 7, 8, 1, 1); R(g, 9, 10, 8, 1, 1);
  });
  tex(scene, 'shrine', 16, 24, (g) => {
    R(g, 0, 3, 21, 10, 3); R(g, 3, 4, 20, 8, 2); R(g, 0, 4, 4, 8, 17); R(g, 3, 5, 3, 6, 17); R(g, 4, 6, 5, 4, 15);
    R(g, 15, 7, 8, 2, 1); R(g, 15, 7, 10, 2, 1); R(g, 6, 7, 5, 2, 4); R(g, 15, 5, 4, 6, 1); R(g, 3, 4, 3, 8, 1);
  });
  // rune pressure plates (tinted per rune) for the crypt puzzle
  tex(scene, 'plate', 16, 16, (g) => {
    R(g, 0, 2, 2, 12, 12); R(g, 6, 3, 3, 10, 10); R(g, 5, 4, 4, 8, 8); R(g, 6, 5, 5, 6, 6); R(g, 5, 7, 6, 2, 4); R(g, 5, 6, 7, 4, 2);
  });
  tex(scene, 'plate_on', 16, 16, (g) => {
    R(g, 0, 2, 2, 12, 12); R(g, 13, 3, 3, 10, 10); R(g, 6, 4, 4, 8, 8); R(g, 13, 5, 5, 6, 6); R(g, 6, 7, 6, 2, 4); R(g, 6, 6, 7, 4, 2);
  });
  tex(scene, 'slash', 16, 24, (g) => {
    for (let a = -60; a <= 60; a += 2) {
      const rad = (a * Math.PI) / 180;
      for (let r = 9; r <= 14; r++) {
        const x = Math.round(2 + Math.cos(rad) * r), y = Math.round(12 + Math.sin(rad) * r);
        if (x >= 0 && x < 16 && y >= 0 && y < 24) R(g, r >= 13 ? 5 : 6, x, y);
      }
    }
  });
  tex(scene, 'arrow', 9, 3, (g) => {
    R(g, 10, 1, 1, 6, 1); R(g, 6, 7, 0, 1, 3); R(g, 5, 8, 1, 1, 1); R(g, 6, 0, 0, 1, 1); R(g, 6, 0, 2, 1, 1); R(g, 4, 1, 0, 1, 1); R(g, 4, 1, 2, 1, 1);
  });
  tex(scene, 'fireball', 8, 8, (g) => {
    R(g, 11, 1, 1, 6, 6); R(g, 12, 2, 0, 4, 8); R(g, 12, 0, 2, 8, 4); R(g, 13, 2, 2, 4, 4); R(g, 6, 3, 3, 2, 2);
  });
  tex(scene, 'frostbolt', 8, 8, (g) => {
    R(g, 3, 3, 0, 2, 8); R(g, 3, 0, 3, 8, 2); R(g, 15, 2, 1, 4, 6); R(g, 15, 1, 2, 6, 4); R(g, 6, 3, 3, 2, 2);
  });
  tex(scene, 'bolt', 6, 6, (g) => { R(g, 4, 1, 0, 4, 6); R(g, 5, 0, 1, 6, 4); R(g, 15, 2, 2, 2, 2); });
  tex(scene, 'ring', 64, 64, (g) => ring(g, 64, 3));
  tex(scene, 'disc', 64, 64, (g) => {
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) if (Math.hypot(x - 31.5, y - 31.5) <= 31.5) R(g, 6, x, y);
  });
  tex(scene, 'ring_small', 32, 32, (g) => ring(g, 32, 2));
  for (let i = 0; i < 3; i++) {
    tex(scene, 'flame' + i, 12, 14, (g) => {
      const w = [6, 8, 7][i], h = [10, 12, 11][i];
      R(g, 12, 6 - w / 2, 14 - h, w, h - 2); R(g, 13, 6 - w / 2 + 1, 14 - h + 3, w - 2, h - 5);
      R(g, 6, 5, 9, 2, 3); R(g, 11, 6 - w / 2, 12, w, 2);
      R(g, 12, 5 + i - 1, 14 - h - 1, 2, 2);
    });
  }
  tex(scene, 'mini_coin', 7, 7, (g) => { R(g, 13, 1, 0, 5, 7); R(g, 13, 0, 1, 7, 5); R(g, 12, 3, 2, 1, 3); R(g, 6, 1, 1, 1, 1); });
  tex(scene, 'mini_arrow', 11, 5, (g) => { R(g, 10, 1, 2, 8, 1); R(g, 5, 9, 1, 1, 3); R(g, 6, 8, 2, 1, 1); R(g, 6, 0, 1, 2, 1); R(g, 6, 0, 3, 2, 1); });
  for (const open of [0, 1]) {
    tex(scene, 'chest' + open, 16, 16, (g) => {
      R(g, 0, 2, 13, 12, 2);
      R(g, 9, 2, open ? 7 : 5, 12, open ? 6 : 8); R(g, 10, 3, open ? 8 : 6, 10, 1);
      R(g, 1, 2, 9, 12, 1); R(g, 13, 7, 9, 2, 3);
      if (open) { R(g, 1, 3, 3, 10, 4); R(g, 13, 6, 4, 4, 1); R(g, 9, 2, 10, 12, 1); R(g, 10, 3, 5, 10, 1); }
      else { R(g, 13, 7, 7, 2, 2); R(g, 9, 2, 5, 12, 1); }
    });
  }
  tex(scene, 'glow', 64, 64, (g) => {
    for (let r = 32; r > 0; r -= 4) {
      g.fillStyle = `rgba(255,255,255,${0.05 + (32 - r) / 32 * 0.16})`;
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) if (Math.hypot(x - 31.5, y - 31.5) < r && (x + y) % 2 === 0) g.fillRect(x, y, 1, 1);
    }
    for (let r = 32; r > 0; r -= 4) {
      g.fillStyle = `rgba(255,255,255,${0.05 + (32 - r) / 32 * 0.16})`;
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) if (Math.hypot(x - 31.5, y - 31.5) < r && (x + y) % 2 === 1 && r < 20) g.fillRect(x, y, 1, 1);
    }
  });
  const blob = (g, cx, cy, rx, ry, col) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) R(g, col, x, y);
  };
  const prop = (key, fn) => tex(scene, key, 16, 16, (g) => { fn(g); outline(g, 16, 16); });
  const rc = (g, x, y, w, h, col) => R(g, col, x, y, w, h); // x,y,w,h,colour (friendlier order)
  prop('pot', (g) => {
    rc(g, 6, 3, 4, 3, 9);                  // neck
    rc(g, 5, 3, 6, 1, 10);                 // lip
    blob(g, 8, 9.5, 5.2, 4.8, 9);          // body (shadow)
    blob(g, 7.4, 9, 4.2, 4, 10);           // body (light)
    rc(g, 5, 7, 2, 2, 5);                  // glint
    rc(g, 6, 11, 4, 1, 9);                 // band
  });
  prop('barrel', (g) => {
    blob(g, 8, 8.5, 6, 6, 9);
    blob(g, 8, 8.5, 4.6, 4.6, 10);
    for (const x of [6, 8, 10]) rc(g, x, 4, 1, 9, 9);      // staves
    rc(g, 3, 5, 10, 1, 1); rc(g, 3, 11, 10, 1, 1);        // hoops
  });
  prop('urn', (g) => {
    rc(g, 6, 3, 4, 3, 2);
    rc(g, 5, 3, 6, 1, 4);
    blob(g, 8, 9.5, 4.8, 5, 3);
    blob(g, 7.4, 9, 3.8, 4.2, 4);
    rc(g, 6, 8, 1, 3, 1); rc(g, 7, 10, 2, 1, 1);          // crack
  });
  prop('bed', (g) => {
    rc(g, 1, 2, 14, 12, 9); rc(g, 2, 3, 12, 10, 11); rc(g, 2, 3, 12, 4, 6); rc(g, 2, 3, 5, 3, 6);
    rc(g, 8, 4, 5, 3, 5); rc(g, 3, 8, 11, 5, 3); rc(g, 3, 10, 11, 1, 4);
  });
  prop('table', (g) => {
    rc(g, 1, 3, 14, 10, 9); rc(g, 1, 4, 14, 7, 10); rc(g, 2, 5, 12, 1, 9); rc(g, 2, 9, 12, 1, 9); rc(g, 6, 6, 3, 3, 13); rc(g, 6, 6, 3, 1, 12);
  });
  prop('shelf', (g) => {
    rc(g, 1, 1, 14, 14, 9); rc(g, 2, 2, 12, 5, 1); rc(g, 2, 9, 12, 5, 1);
    for (const [x, y, c] of [[2, 3, 11], [4, 3, 15], [6, 3, 13], [8, 3, 12], [10, 3, 8], [3, 10, 14], [5, 10, 15], [8, 10, 11], [11, 10, 13]]) rc(g, x, y, 2, 3, c);
    rc(g, 2, 7, 12, 1, 10);
  });
  prop('bookshelf', (g) => {
    rc(g, 1, 1, 14, 14, 9); rc(g, 2, 2, 12, 5, 1); rc(g, 2, 9, 12, 5, 1);
    for (let i = 0; i < 6; i++) { rc(g, 2 + i * 2, 2, 2, 5, [11, 3, 13, 14, 8, 12][i]); rc(g, 2 + i * 2, 9, 2, 5, [8, 14, 12, 3, 11, 13][i]); }
    rc(g, 2, 7, 12, 1, 10);
  });
  prop('cauldron', (g) => {
    blob(g, 8, 9, 6, 5, 2); blob(g, 8, 8, 5, 4, 3); blob(g, 8, 8, 4, 3, 15); rc(g, 5, 7, 2, 1, 6); rc(g, 9, 9, 2, 1, 6); rc(g, 3, 12, 2, 3, 2); rc(g, 11, 12, 2, 3, 2);
  });
  prop('book', (g) => {
    rc(g, 3, 5, 10, 8, 11); rc(g, 4, 6, 8, 6, 5); rc(g, 4, 6, 1, 6, 11); rc(g, 6, 8, 5, 1, 4); rc(g, 6, 10, 4, 1, 4);
  });
  prop('anvil', (g) => {
    rc(g, 3, 11, 10, 3, 2); rc(g, 5, 8, 6, 4, 3); rc(g, 2, 5, 12, 4, 4); rc(g, 12, 6, 3, 2, 3); rc(g, 3, 5, 9, 1, 5);
  });
  prop('herb_berry', (g) => {
    blob(g, 8, 9, 6, 4.5, 8); blob(g, 7, 8, 4.5, 3, 7);
    for (const [x, y] of [[5, 7], [9, 6], [7, 10], [11, 9], [4, 10]]) { rc(g, x, y, 2, 2, 11); rc(g, x, y, 1, 1, 12); }
  });
  prop('herb_lily', (g) => {
    rc(g, 7, 8, 2, 6, 8);
    for (const [x, y] of [[4, 5], [7, 3], [10, 5], [5, 8], [9, 8]]) { rc(g, x, y, 3, 3, 15); rc(g, x + 1, y + 1, 1, 1, 6); }
    rc(g, 5, 11, 2, 2, 8); rc(g, 9, 11, 2, 2, 8);
  });
  prop('sign', (g) => {
    rc(g, 7, 7, 2, 8, 9);                  // post
    rc(g, 2, 2, 12, 7, 10);                // board
    rc(g, 2, 8, 12, 1, 9);
    rc(g, 4, 4, 8, 1, 9); rc(g, 4, 6, 6, 1, 9);   // "text"
  });
  // stepped radial mask used to cut light out of the darkness layer
  tex(scene, 'lightmask', 64, 64, (g) => {
    const steps = 6;
    for (let i = 0; i < steps; i++) {
      const r = 32 * (1 - i / steps);
      g.fillStyle = 'rgba(255,255,255,' + (0.2 + i * 0.03) + ')';
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) if (Math.hypot(x - 31.5, y - 31.5) < r) g.fillRect(x, y, 1, 1);
    }
  });
  tex(scene, 'warn', 16, 16, (g) => { g.fillStyle = 'rgba(200,56,60,0.35)'; g.fillRect(0, 0, 16, 16); });
}

// Item icons (16x16). kind picks a drawing routine; col tints it.
export function buildIcon(scene, key, kind, col = 6) {
  tex(scene, key, 16, 16, (g) => {
    const l = (c, x0, y0, x1, y1) => { // pixel line
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let i = 0; i <= n; i++) R(g, c, Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n));
    };
    switch (kind) {
      case 'sword':
        l(col, 4, 11, 12, 3); l(col, 5, 11, 12, 4); l(6, 6, 10, 11, 5);
        R(g, 13, 3, 11, 4, 1); R(g, 13, 5, 9, 1, 4); l(9, 3, 12, 5, 10); R(g, 9, 2, 13, 2, 2); break;
      case 'axe':
        l(9, 7, 4, 7, 14); l(9, 8, 4, 8, 14); R(g, col, 8, 3, 6, 5); R(g, col, 9, 2, 5, 2); R(g, 6, 9, 3, 4, 1); R(g, 0, 8, 8, 6, 1); break;
      case 'spear':
        l(9, 3, 14, 12, 3); l(9, 4, 14, 13, 3); R(g, col, 11, 1, 3, 4); R(g, col, 12, 0, 1, 2); R(g, 6, 12, 1, 1, 3); break;
      case 'mace':
        l(9, 4, 14, 10, 6); l(9, 5, 14, 11, 6); R(g, col, 8, 2, 6, 6); R(g, 6, 9, 2, 2, 1); R(g, 0, 8, 8, 6, 1); R(g, col, 7, 4, 1, 2); R(g, col, 14, 4, 1, 2); break;
      case 'bow':
        for (let y = 2; y <= 13; y++) { const x = 4 + Math.round(Math.sin(((y - 2) / 11) * Math.PI) * 5); R(g, col, x, y); R(g, 9, x + 1, y); }
        l(6, 4, 2, 4, 13); R(g, 10, 5, 7, 7, 1); R(g, 6, 11, 7, 1, 1); break;
      case 'arrows':
        for (let i = 0; i < 3; i++) { l(10, 2 + i * 2, 13 - i, 11 + i, 4 - i); R(g, 6, 10 + i, 3 - i, 3, 1); R(g, col, 2 + i * 2, 12 - i, 2, 1); } break;
      case 'armor':
        R(g, col, 3, 3, 10, 10); R(g, 0, 6, 3, 4, 2); R(g, 2, 3, 3, 1, 10); R(g, 2, 12, 3, 1, 1);
        R(g, 6, 4, 6, 2, 1); R(g, 13, 7, 9, 2, 2); R(g, 0, 3, 13, 10, 1); R(g, 9, 3, 10, 10, 1); break;
      case 'charm':
        R(g, 10, 7, 2, 1, 3); R(g, 10, 6, 3, 1, 1); R(g, 10, 9, 3, 1, 1); R(g, 10, 5, 5, 1, 1); R(g, 10, 10, 5, 1, 1);
        R(g, 10, 4, 4, 1, 1); R(g, 10, 11, 4, 1, 1);
        R(g, col, 5, 7, 6, 6); R(g, 6, 6, 8, 2, 1); R(g, 0, 5, 12, 6, 1); break;
      case 'potion':
        R(g, 6, 6, 2, 4, 1); R(g, 9, 6, 1, 4, 2); R(g, col, 4, 7, 8, 7); R(g, 0, 4, 14, 8, 1); R(g, 6, 5, 8, 2, 2); R(g, 5, 3, 3, 1, 1);
        R(g, 4, 7, 7, 1, 7); R(g, 11, 7, 7, 1, 7); R(g, 6, 5, 9, 2, 1); break;
      case 'relic':
        R(g, col, 6, 2, 4, 12); R(g, col, 4, 4, 8, 8); R(g, col, 3, 6, 10, 4); R(g, 6, 6, 4, 2, 5); R(g, 6, 7, 4, 1, 3); R(g, 0, 7, 13, 2, 1); break;
      case 'coin':
        R(g, 13, 5, 5, 6, 6); R(g, 13, 4, 6, 8, 4); R(g, 12, 9, 6, 2, 2); R(g, 6, 5, 6, 1, 2); break;
      case 'fire':
        R(g, 11, 4, 4, 8, 9); R(g, 12, 6, 2, 4, 11); R(g, 13, 6, 8, 3, 3); R(g, 12, 7, 1, 2, 3); R(g, 11, 6, 0, 3, 5); break;
      case 'frost':
        R(g, 15, 7, 1, 2, 14); R(g, 15, 1, 7, 14, 2); for (let i = 0; i < 5; i++) { R(g, 5, 3 + i, 3 + i, 1, 1); R(g, 5, 12 - i, 3 + i, 1, 1); } R(g, 6, 7, 7, 2, 2); break;
      case 'shout':
        for (let i = 0; i < 3; i++) { R(g, i === 0 ? 6 : 4, 3 + i * 3, 8 - i * 3, 1, 1 + i * 6); } R(g, col, 2, 6, 3, 4); R(g, col, 4, 5, 1, 6); break;
      case 'pick': l(6, 3, 13, 11, 5); l(col, 3, 12, 11, 4); R(g, 9, 11, 3, 3, 3); R(g, 13, 2, 12, 2, 2); l(4, 4, 11, 6, 8); break;
      case 'gem': R(g, col, 6, 3, 4, 2); R(g, col, 4, 5, 8, 3); R(g, col, 5, 8, 6, 3); R(g, col, 7, 11, 2, 2); R(g, 6, 6, 4, 2, 1); R(g, 0, 4, 5, 1, 3); R(g, 0, 11, 5, 1, 3); R(g, 0, 6, 8, 1, 3); break;
      case 'ore': R(g, 3, 4, 5, 8, 8); R(g, 3, 5, 4, 6, 1); R(g, 3, 3, 6, 10, 6); R(g, col, 5, 7, 2, 2); R(g, col, 9, 9, 2, 2); R(g, col, 7, 5, 1, 1); R(g, 0, 3, 12, 10, 1); break;
      case 'ingot': R(g, col, 3, 7, 10, 5); R(g, 6, 4, 6, 8, 1); R(g, 0, 3, 12, 10, 1); R(g, 0, 3, 7, 10, 1); R(g, 3, 4, 8, 6, 1); break;
      case 'fang': R(g, col, 6, 3, 4, 3); R(g, col, 7, 6, 2, 4); R(g, col, 8, 10, 1, 2); R(g, 5, 7, 4, 1, 2); R(g, 0, 5, 3, 1, 3); break;
      case 'dust': for (const [x, y] of [[4, 8], [7, 5], [9, 9], [6, 11], [11, 7], [5, 6]]) R(g, col, x, y, 2, 2); R(g, 4, 8, 9, 2, 1); break;
      case 'berry': for (const [x, y] of [[5, 8], [9, 7], [7, 11]]) { R(g, col, x, y, 3, 3); R(g, 6, x, y, 1, 1); } R(g, 8, 8, 4, 1, 3); R(g, 8, 6, 5, 3, 1); break;
      case 'lily': R(g, 8, 8, 8, 1, 6); for (const [x, y] of [[6, 5], [9, 5], [7, 3], [5, 7], [10, 7]]) R(g, col, x, y, 2, 3); R(g, 6, 7, 6, 2, 2); break;
      case 'locket': for (let a = 0; a < 360; a += 20) R(g, 4, Math.round(8 + Math.cos(a * Math.PI / 180) * 4), Math.round(4 + Math.sin(a * Math.PI / 180) * 3)); R(g, col, 5, 8, 6, 6); R(g, 13, 6, 9, 4, 4); R(g, 0, 7, 10, 2, 1); R(g, 6, 5, 8, 2, 1); break;
      case 'fish':
        R(g, col, 3, 6, 9, 5); R(g, col, 2, 7, 1, 3); R(g, col, 12, 5, 3, 7); R(g, 6, 5, 7, 4, 1); R(g, 0, 4, 8, 1, 1); R(g, 0, 3, 6, 9, 1); R(g, 0, 3, 11, 9, 1); break;
      case 'dish':
        R(g, 5, 2, 9, 12, 2); R(g, 3, 3, 8, 10, 1); R(g, col, 4, 6, 8, 3); R(g, 9, 6, 8, 2, 1); R(g, 6, 5, 6, 1, 1); R(g, 6, 7, 6, 1, 1); break;
      case 'scroll':
        R(g, 10, 3, 3, 10, 9); R(g, 9, 3, 3, 10, 1); R(g, 9, 3, 11, 10, 1); R(g, 11, 5, 5, 1, 1); R(g, 11, 6, 8, 5, 1); R(g, 11, 8, 6, 1, 1); R(g, 11, 10, 11, 1, 1); break;
      case 'shield':
        R(g, 0, 3, 2, 10, 9); R(g, 0, 4, 11, 8, 2); R(g, 0, 6, 13, 4, 1);
        R(g, col, 4, 3, 8, 8); R(g, col, 5, 11, 6, 2); R(g, 6, 4, 3, 8, 1); R(g, 13, 7, 6, 2, 2); R(g, 2, 4, 10, 8, 1); break;
      case 'shock':
        l(13, 9, 1, 5, 8); l(13, 5, 8, 9, 8); l(13, 9, 8, 6, 15); l(13, 10, 1, 6, 8); l(6, 9, 2, 6, 8); R(g, 6, 8, 4, 1, 3); break;
      case 'heal':
        R(g, 5, 6, 2, 4, 12); R(g, 5, 2, 6, 12, 4); R(g, 8, 7, 3, 2, 10); R(g, 8, 3, 7, 10, 2); R(g, 6, 7, 3, 1, 2); break;
      case 'blink':
        R(g, 14, 2, 3, 3, 3); R(g, 14, 4, 5, 3, 3); R(g, 14, 6, 7, 3, 2); R(g, 14, 4, 9, 3, 3); R(g, 14, 2, 11, 3, 3);
        R(g, 6, 9, 3, 3, 3); R(g, 6, 11, 5, 3, 3); R(g, 6, 13, 7, 3, 2); R(g, 6, 11, 9, 3, 3); R(g, 6, 9, 11, 3, 3); R(g, 15, 7, 7, 1, 2); break;
      case 'meteor':
        R(g, 12, 8, 6, 5, 5); R(g, 13, 9, 7, 3, 3); R(g, 6, 9, 7, 1, 1); for (let i = 1; i <= 6; i++) { R(g, i < 3 ? 13 : 12, 8 - i, 6 - i, 2, 2); } R(g, 11, 4, 4, 2, 1); R(g, 11, 11, 9, 3, 1); break;
      case 'nova':
        for (const [x, y, w, h] of [[7, 1, 2, 14], [1, 7, 14, 2]]) R(g, 15, x, y, w, h);
        for (let k = 2; k <= 5; k++) { R(g, 6, 8 - k, 8 - k, 1, 1); R(g, 6, 7 + k, 8 - k, 1, 1); R(g, 6, 8 - k, 7 + k, 1, 1); R(g, 6, 7 + k, 7 + k, 1, 1); }
        R(g, 6, 7, 7, 2, 2); break;
      case 'wolf':
        R(g, 15, 3, 6, 10, 7); R(g, 6, 4, 6, 8, 1); R(g, 15, 3, 3, 2, 4); R(g, 15, 11, 3, 2, 4); R(g, 5, 4, 8, 2, 2); R(g, 5, 10, 8, 2, 2); R(g, 6, 6, 11, 4, 2); R(g, 0, 7, 9, 2, 2); R(g, 5, 7, 13, 2, 1); break;
      case 'ward':
        for (let a = 0; a < 360; a += 12) { const rx = Math.round(8 + Math.cos(a * Math.PI / 180) * 6), ry = Math.round(8 + Math.sin(a * Math.PI / 180) * 6); R(g, 15, rx, ry); R(g, 6, rx, ry - 1 < 0 ? 0 : ry, 1, 1); }
        R(g, 5, 5, 5, 6, 6); R(g, 15, 6, 6, 4, 4); break;
      default: R(g, col, 4, 4, 8, 8);
    }
  });
}

// Held weapon / shield sprites (drawn while swinging / blocking). `kind`: blade | greatblade | shield.
export function buildHeld(scene, key, kind, col = 5) {
  if (kind === 'shield') {
    tex(scene, key, 10, 12, (g) => {
      R(g, 0, 1, 0, 8, 9); R(g, 0, 2, 9, 6, 2); R(g, 0, 3, 11, 4, 1);
      R(g, col, 2, 1, 6, 7); R(g, col, 3, 8, 4, 2); R(g, 6, 2, 1, 6, 1); R(g, 2, 2, 7, 6, 1); R(g, 13, 4, 4, 2, 2); R(g, 3, 3, 8, 1, 1);
    });
    return;
  }
  if (kind === 'spear') {
    tex(scene, key, 24, 5, (g) => {
      R(g, 0, 0, 1, 23, 3); R(g, 9, 1, 2, 17, 1);               // shaft
      R(g, 0, 17, 0, 6, 5); R(g, col, 18, 1, 5, 3); R(g, 6, 18, 2, 4, 1); R(g, 0, 23, 2, 1, 1);   // head
    });
    return;
  }
  if (kind === 'mace') {
    tex(scene, key, 16, 9, (g) => {
      R(g, 0, 0, 3, 11, 3); R(g, 9, 1, 4, 10, 1);               // haft
      R(g, 0, 10, 0, 6, 9); R(g, col, 11, 1, 4, 7); R(g, 6, 11, 2, 2, 5); R(g, 0, 12, 4, 1, 1);   // flanged head
    });
    return;
  }
  if (kind === 'axe') {
    tex(scene, key, 16, 10, (g) => {
      R(g, 0, 0, 4, 12, 3); R(g, 9, 1, 5, 11, 1);               // haft
      R(g, 0, 8, 0, 7, 10); R(g, col, 9, 1, 5, 8); R(g, 6, 9, 2, 1, 6); R(g, 0, 11, 4, 1, 2);     // blade
    });
    return;
  }
  const L = kind === 'greatblade' ? 17 : 12;
  tex(scene, key, L + 4, 7, (g) => {
    R(g, 0, 0, 1, L + 4, 5);                 // outline
    R(g, 9, 1, 2, 3, 3);                     // grip
    R(g, 13, 4, 0, 2, 7);                    // crossguard
    R(g, col, 6, 2, L - 3, 3); R(g, 0, L + 3, 3, 1, 1);
    R(g, 6, 6, 2, L - 4, 1);                 // edge highlight
  });
}

// --------------------------------------------------------------------- entry
export function generateArt(scene) {
  buildCharacters(scene);
  buildTiles(scene);
  buildFx(scene);
}

// Which held-weapon sprite an item uses.
export const heldKind = (it) => (it.type === 'shield' ? 'shield' : it.style === 'spear' ? 'spear' : it.style === 'mace' ? 'mace' : it.style === 'axe' ? 'axe' : it.type === 'weapon2h' ? 'greatblade' : it.type === 'weapon' ? 'blade' : null);
