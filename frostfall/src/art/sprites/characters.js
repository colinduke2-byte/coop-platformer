// Characters, worn gear and creature sheets (split out of art/sprites.js, CH16).
import { wornStyle, wornExtra, wornHelmet } from '../worn.js';
import { R, canvas, line, outline, px, tri } from './base.js';

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
  if (s.worn) wornExtra(r, dir, s.worn, pose);
  if (s.helmet) wornHelmet(r, dir, s.helmet);
  if (s.role) roleMark(r, dir, pose, fr, s);
}

// VX-20: a role you can read from the silhouette, drawn into the sheet: a kite shield (knights, wardens), a two-hander over the
// shoulder (reavers), a bow on the back (archers), a staff (casters), a spear (sentinels, harpooners), a lantern (delvers).
// Weapons that the windup already shows (Enemy.updateBlade) are only drawn at rest.
function roleMark(r, dir, pose, fr, s) {
  const atk = pose === 'atk', bob = fr === 1 ? -1 : fr === 2 ? 1 : 0;
  switch (s.role) {
    case 'shield':                     // steel kite shield with the style's trim as its emblem
      if (dir === 'down') { r(0, 1, 7, 4, 6); r(3, 1, 7, 3, 5); r(4, 1, 7, 3, 1); r(s.trim === 3 ? 13 : s.trim, 2, 8, 1, 3); r(0, 2, 12, 2, 1); }
      else if (dir === 'up') { r(0, 5, 6, 6, 7); r(3, 6, 7, 4, 5); r(4, 6, 7, 4, 1); r(0, 7, 12, 2, 1); }
      else if (dir === 'side') { r(0, 10, 7, 4, 6); r(3, 11, 7, 2, 5); r(4, 11, 7, 2, 1); r(s.trim === 3 ? 13 : s.trim, 11, 9, 1, 2); }
      break;
    case 'greatsword':                 // a two-hander resting on the shoulder, blade up behind the head
      if (atk) break;
      if (dir === 'down') { for (let i = 0; i < 7; i++) r(5, 13 - (i >> 1), 9 - i, 1, 1); r(0, 14, 2, 1, 1); r(9, 12, 10, 2, 1); r(13, 11, 9, 1, 1); }
      else if (dir === 'up') { for (let i = 0; i < 7; i++) r(5, 3 + (i >> 1), 9 - i, 1, 1); r(9, 3, 10, 2, 1); }
      else if (dir === 'side') { for (let i = 0; i < 8; i++) r(5, 4 - (i >> 2), 11 - i, 1, 1); r(9, 4, 12, 2, 1); r(13, 5, 11, 1, 1); }
      break;
    case 'bow':                        // a bow slung across the back, string pale
      if (dir === 'down') { r(9, 12, 3, 1, 2); r(9, 13, 5, 1, 4); r(9, 12, 9, 1, 2); r(6, 11, 4, 1, 6); }
      else if (dir === 'up') { r(9, 4, 4, 1, 1); r(9, 5, 5, 1, 1); r(9, 6, 6, 4, 1); r(9, 10, 7, 1, 1); r(9, 11, 8, 1, 1); r(6, 5, 5, 6, 1); }
      else if (dir === 'side') { r(9, 4, 4, 1, 2); r(9, 3, 6, 1, 4); r(9, 4, 10, 1, 2); r(6, 5, 5, 1, 6); }
      break;
    case 'staff': {                    // a tall staff in the off hand, its head glowing
      const gl = s.glow ?? 15;
      if (atk && dir !== 'down') break;
      if (dir === 'down') { r(9, 2, 3 + bob, 1, 12); r(gl, 1, 1 + bob, 3, 2); r(6, 2, 1 + bob, 1, 1); }
      else if (dir === 'up') { r(9, 13, 3 - bob, 1, 12); r(gl, 12, 1 - bob, 3, 2); }
      else if (dir === 'side') { r(9, 12, 3, 1, 12); r(gl, 11, 1, 3, 2); r(6, 12, 1, 1, 1); }
      break;
    }
    case 'spear':                      // a spear held upright at rest
      if (atk) break;
      if (dir === 'down') { r(9, 2, 3 + bob, 1, 12); r(5, 2, 0 + bob, 1, 3); r(6, 2, 0 + bob, 1, 1); r(0, 1, 2 + bob, 1, 1); r(0, 3, 2 + bob, 1, 1); }
      else if (dir === 'up') { r(9, 13, 3 - bob, 1, 12); r(5, 13, 0 - bob, 1, 3); }
      else if (dir === 'side') { r(9, 12, 3, 1, 12); r(5, 12, 0, 1, 3); r(6, 12, 0, 1, 1); }
      break;
    case 'lantern':                    // a lit lantern swinging from the hand
      if (dir === 'down') { r(0, 12, 11 - bob, 3, 4); r(13, 13, 12 - bob, 1, 2); r(12, 13, 13 - bob, 1, 1); r(3, 13, 10 - bob, 1, 1); }
      else if (dir === 'side') { r(0, 11, 11, 3, 4); r(13, 12, 12, 1, 2); r(3, 12, 10, 1, 1); }
      break;
  }
}

export const STYLES = {
  player: { skin: 10, hair: 9, body: 3, trim: 9, legs: 2, boots: 9, chest: 6, cape: 11 },
  sigrid: { skin: 10, hair: 6, hood: 4, body: 5, trim: 3, legs: 3, boots: 9, chest: 6, beard: null },
  bjorn:  { skin: 10, hair: 9, body: 9, trim: 1, legs: 2, boots: 1, chest: 10, beard: 9, cape: 7 },
  mirra:  { skin: 10, hair: 14, hood: 14, body: 14, trim: 13, legs: 1, boots: 9, chest: 13 },
  draugr: { skin: 4, hair: 3, body: 2, trim: 1, legs: 1, boots: 0, eye: 0, glow: 15, helm: 3 },
  bandit: { skin: 10, hair: 1, hood: 1, body: 9, trim: 0, legs: 2, boots: 0, chest: 11, mask: 11 },
  archer: { skin: 10, hair: 7, hood: 7, body: 8, trim: 9, legs: 9, boots: 0, chest: 10, mask: 9 , role: 'bow' },
  guard:  { skin: 10, hair: 3, helm: 4, body: 3, trim: 13, legs: 2, boots: 9, chest: 5, beard: 9 },
  child:  { skin: 10, hair: 13, body: 11, trim: 9, legs: 3, boots: 9, chest: 5 },
  warden: { skin: 4, hair: 3, body: 2, trim: 3, legs: 1, boots: 0, glow: 15, helm: 5, chest: 4 , role: 'shield' },
  chief:  { skin: 10, hair: 11, body: 11, trim: 13, legs: 2, boots: 0, helm: 3, beard: 9, cape: 1, chest: 13 },
  conjurer: { skin: 5, hair: 15, hood: 15, body: 3, trim: 14, legs: 1, boots: 0, glow: 13, chest: 14 , role: 'staff' },
  hilda:  { skin: 10, hair: 12, body: 9, trim: 5, legs: 2, boots: 0, chest: 4, beard: null },
  ragna:  { skin: 10, hair: 13, hood: 8, body: 8, trim: 9, legs: 7, boots: 9, chest: 10 },
  warlord: { skin: 4, hair: 3, body: 3, trim: 13, legs: 2, boots: 0, glow: 12, helm: 4, chest: 11, beard: 3, cape: 11, horns: 4 },
  winter: { skin: 6, hair: 15, body: 15, trim: 6, legs: 3, boots: 0, glow: 15, helm: 6, horns: 5, crown: 15, cape: 5, chest: 6 },
  imp: { skin: 11, hair: 12, body: 11, trim: 12, legs: 11, boots: 0, glow: 13, horns: 12, chest: 12 },
  necro: { skin: 4, hair: 14, hood: 1, body: 1, trim: 14, legs: 0, boots: 0, glow: 14, chest: 14 , role: 'staff' },
  golem: { skin: 4, hair: 3, body: 3, trim: 15, legs: 2, boots: 1, glow: 15, helm: 4, chest: 5 },
  trader: { skin: 10, hair: 9, hood: 12, body: 12, trim: 13, legs: 9, boots: 9, chest: 13, cape: 9 },
  ghost:  { skin: 15, hair: 15, hood: 15, body: 15, trim: 14, legs: 14, boots: 14, glow: 14, chest: 14 },
  bogwraith: { skin: 8, hair: 7, hood: 7, body: 7, trim: 8, legs: 1, boots: 0, glow: 15, chest: 8 },
  boghag: { skin: 8, hair: 14, hood: 1, body: 7, trim: 14, legs: 1, boots: 0, glow: 13, chest: 9, cape: 7 , role: 'staff' },
  miremother: { skin: 8, hair: 7, hood: 7, body: 7, trim: 15, legs: 1, boots: 0, glow: 15, chest: 8, crown: 14, cape: 1, horns: 9 },
  nomad: { skin: 10, hair: 9, hood: 10, body: 10, trim: 9, legs: 9, boots: 1, chest: 4, cape: 9 },
  shaman: { skin: 10, hair: 6, hood: 15, body: 3, trim: 15, legs: 2, boots: 1, glow: 15, chest: 14, horns: 6, cape: 4 , role: 'staff' },
  stonegiant: { skin: 3, hair: 2, body: 2, trim: 4, legs: 2, boots: 1, helm: 3, chest: 4, beard: 3, horns: 4 },
  hartking: { skin: 4, hair: 6, body: 15, trim: 5, legs: 3, boots: 1, glow: 15, helm: 5, chest: 15, beard: 6, cape: 5, crown: 15, horns: 15 },
  lodecolossus: { skin: 2, hair: 1, body: 2, trim: 12, legs: 1, boots: 0, glow: 12, helm: 3, chest: 3, beard: 1, horns: 12 },
  brinegut: { skin: 10, hair: 1, hood: 1, body: 4, trim: 13, legs: 1, boots: 0, chest: 4, cape: 11, helm: 1, beard: 9, crown: 13 },
  stormgiant: { skin: 5, hair: 6, body: 3, trim: 15, legs: 2, boots: 0, glow: 15, helm: 4, chest: 15, beard: 6, cape: 15, crown: 13, horns: 6 },
  wight:  { skin: 5, hair: 14, hood: 14, body: 1, trim: 14, legs: 1, boots: 0, glow: 15, chest: 15 },
  troll:  { skin: 8, hair: 7, body: 9, trim: 1, legs: 7, boots: 0, eye: 11, chest: 10, horns: 10 },
  trapper: { skin: 10, hair: 9, hood: 9, body: 9, trim: 7, legs: 2, boots: 1, chest: 7, cape: 7 },
  fisher: { skin: 10, hair: 6, hood: 15, body: 15, trim: 5, legs: 3, boots: 1, chest: 4 },
  prospector: { skin: 10, hair: 11, helm: 3, body: 3, trim: 9, legs: 2, boots: 1, chest: 9, beard: 11 , role: 'lantern' },
  // Phase 14 creatures (humanoid)
  cindersmith: { skin: 11, hair: 0, helm: 1, body: 1, trim: 12, legs: 0, boots: 0, glow: 12, chest: 11, beard: 0, cape: 9 },
  lavawraith: { skin: 12, hair: 13, hood: 11, body: 11, trim: 13, legs: 11, boots: 11, glow: 13, chest: 12 },
  harpooner: { skin: 10, hair: 5, hood: 15, body: 15, trim: 5, legs: 3, boots: 1, chest: 4, mask: 3 , role: 'spear' },
  tidehag: { skin: 8, hair: 7, hood: 7, body: 14, trim: 15, legs: 7, boots: 0, glow: 15, chest: 14 , role: 'staff' },
  phantom: { skin: 6, hair: 5, body: 5, trim: 14, legs: 5, boots: 5, glow: 14, crown: 13, chest: 6 },
  herald: { skin: 10, hair: 13, helm: 13, body: 14, trim: 13, legs: 14, boots: 13, glow: 13, chest: 13, cape: 11, crown: 13 },
  sentinel: { skin: 6, hair: 5, helm: 6, body: 4, trim: 3, legs: 4, boots: 3, glow: 15, chest: 5, horns: 6 , role: 'spear' },
  stalker: { skin: 8, hair: 7, hood: 7, body: 8, trim: 7, legs: 7, boots: 7, chest: 8, mask: 7 },
  // the Embergreen Vale and the Sunscorch Reach
  hedgeknight: { skin: 8, hair: 7, helm: 8, body: 7, trim: 13, legs: 7, boots: 1, glow: 13, chest: 8, horns: 9 , role: 'shield' },
  cutpurse: { skin: 10, hair: 1, hood: 14, body: 14, trim: 13, legs: 1, boots: 0, chest: 1, mask: 1, cape: 14 },
  warchanter: { skin: 10, hair: 13, helm: 13, body: 11, trim: 13, legs: 9, boots: 1, glow: 13, chest: 12, horns: 12, cape: 12 },
  sunsentinel: { skin: 13, hair: 9, helm: 13, body: 10, trim: 12, legs: 9, boots: 9, glow: 12, chest: 13, horns: 13, crown: 12 },
  wrapped: { skin: 5, hair: 5, hood: 5, body: 5, trim: 10, legs: 5, boots: 4, glow: 11, chest: 6, mask: 6 },
  duneraider: { skin: 10, hair: 9, hood: 10, body: 12, trim: 13, legs: 9, boots: 9, chest: 11, mask: 6, cape: 11 },
  blightmother: { skin: 8, hair: 7, hood: 7, body: 7, trim: 13, legs: 1, boots: 0, glow: 11, chest: 8, crown: 14, cape: 8, horns: 9 },
  vaultsovereign: { skin: 13, hair: 9, helm: 13, body: 10, trim: 12, legs: 9, boots: 9, glow: 15, chest: 12, crown: 13, cape: 11, horns: 13, beard: 9 },
  // Vale and Sunscorch townsfolk
  vale_elder: { skin: 10, hair: 6, hood: 8, body: 8, trim: 13, legs: 9, boots: 9, chest: 10, cape: 7 },
  vale_gardener: { skin: 10, hair: 9, hood: 13, body: 8, trim: 9, legs: 7, boots: 9, chest: 7 },
  vale_beekeeper: { skin: 10, hair: 13, hood: 13, body: 13, trim: 9, legs: 9, boots: 1, chest: 12, mask: 13 },
  vale_bard: { skin: 10, hair: 11, body: 14, trim: 13, legs: 3, boots: 9, chest: 13, cape: 14 },
  dune_sheikh: { skin: 10, hair: 6, hood: 6, body: 12, trim: 13, legs: 9, boots: 9, chest: 13, cape: 11, beard: 6 },
  dune_trader: { skin: 10, hair: 9, hood: 13, body: 13, trim: 12, legs: 9, boots: 9, chest: 10, cape: 12 },
  dune_scholar: { skin: 10, hair: 6, hood: 5, body: 5, trim: 14, legs: 3, boots: 9, chest: 13 },
  dune_guard: { skin: 10, hair: 1, helm: 10, body: 12, trim: 13, legs: 9, boots: 9, chest: 13, cape: 11 },
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
// A sturdy pony with a saddle blanket (the mount you can buy from the smith).
function ponyFrame(ctx, ox, fr) {
  const r = (c, x, y, w, h) => R(ctx, c, ox + x, y, w, h);
  const a = fr === 1, b = fr === 2;
  r(9, 3, 11, 1, a ? 4 : 5); r(9, 5, 11, 1, b ? 4 : 5); r(9, 10, 11, 1, b ? 4 : 5); r(9, 12, 11, 1, a ? 4 : 5);
  r(10, 2, 6, 12, 6); r(9, 2, 6, 12, 1); r(6, 4, 11, 8, 1);                      // body, dark back, pale belly
  r(11, 5, 6, 5, 2); r(12, 5, 6, 5, 1);                                          // saddle blanket
  r(10, 11, 3, 3, 4); r(10, 13, 2, 3, 3); r(10, 14, 4, 3, 2); r(9, 12, 1, 1, 2); // neck, head, muzzle, ear
  r(0, 14, 3, 1, 1); r(9, 11, 2, 1, 4); r(9, 1, 6, 2, 5);                        // eye, mane, tail
}
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

// Fen leech: a fat black slug with a ring of teeth, facing right.
function leechFrame(ctx, ox, fr) {
  const r = (c, x, y, w, h) => R(ctx, c, ox + x, y, w, h);
  const a = fr === 1 ? 1 : 0, b = fr === 2 ? 1 : 0;
  r(1, 2, 11 - a, 9, 3); r(0, 3, 10 - a, 7, 1); r(2, 4, 12 - a, 5, 1);               // body and sheen
  r(9, 5, 12 + b, 2, 1); r(9, 8, 12 + b, 2, 1);                                      // underbelly ridges
  r(1, 10, 10 - b, 3, 4); r(11, 12, 11, 2, 1); r(11, 13, 10, 1, 1); r(13, 12, 12, 1, 1);   // head, eye, teeth
  r(8, 11, 9, 1, 1);                                                                  // a sickly spot
}

// Cave weaver: a long-legged spider, seen from the side, facing right.
function spiderFrame(ctx, ox, fr) {
  const r = (c, x, y, w, h) => R(ctx, c, ox + x, y, w, h);
  const a = fr === 1 ? 1 : 0, b = fr === 2 ? 1 : 0;
  r(1, 4, 6, 6, 5); r(0, 5, 7, 4, 3); r(8, 6, 7, 2, 1); r(1, 9, 7, 3, 3); r(11, 11, 8, 1, 1); r(11, 11, 10, 1, 1);
  for (let i = 0; i < 4; i++) { const x = 3 + i * 2, up = i % 2 ? a : b; r(0, x - 2, 4 + up, 1, 3); r(0, x - 2, 3 + up, 2, 1); r(0, x - 1 + (i > 1 ? 4 : 0), 11, 1, 3 - up); r(0, x - 2 + (i > 1 ? 4 : 0), 13 - up, 2, 1); }
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

// Hero sheet wearing the given armour and head charm (kinds like 'armor_plate'), cloak colour col. Built on demand and cached.
export function wornHeroKey(scene, armorKind, charmKind, col, helmKind = null) {
  const st = wornStyle({ ...STYLES.player, cape: col }, armorKind, charmKind, helmKind);
  if (!st) return null;
  const key = `spr_worn_${armorKind || '-'}_${charmKind || '-'}_${helmKind || '-'}_${col}`;
  if (scene.textures.exists(key)) return key;
  const frames = ['down', 'up', 'side', 'atkdown', 'atkup', 'atkside', 'hurt', 'dead'];
  const cv = canvas(16 * frames.length * 3, 16), ctx = cv.getContext('2d');
  frames.forEach((d, di) => { for (let f = 0; f < 3; f++) humanoid(ctx, (di * 3 + f) * 16, d, f, st); });
  outline(ctx, cv.width, cv.height);
  const tex = scene.textures.addCanvas(key, cv);
  frames.forEach((d, di) => { for (let f = 0; f < 3; f++) tex.add(`${d}${f}`, 0, (di * 3 + f) * 16, 0, 16, 16); });
  return key;
}

// A 16px humanoid sheet of a style with a role mark added (VX-20): for kinds that share a sheet but not a role (the Rime Reaver
// carries a two-hander, the draugr it is drawn from does not). Registered as a scale-1 native in native/scales.js.
export function roleSheet(scene, key, styleName, role) {
  const st = { ...STYLES[styleName], role };
  const frames = ['down', 'up', 'side', 'atkdown', 'atkup', 'atkside', 'hurt', 'dead'];
  const cv = canvas(16 * frames.length * 3, 16), ctx = cv.getContext('2d');
  frames.forEach((d, di) => { for (let f = 0; f < 3; f++) humanoid(ctx, (di * 3 + f) * 16, d, f, st); });
  outline(ctx, cv.width, cv.height);
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.addCanvas(key, cv);
  frames.forEach((d, di) => { for (let f = 0; f < 3; f++) tex.add(`${d}${f}`, 0, (di * 3 + f) * 16, 0, 16, 16); });
  return tex;
}

export function buildCharacters(scene) {
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
  animalSheet(scene, 'spr_pony', ponyFrame);
  animalSheet(scene, 'spr_elk', (c, x, f) => deerFrame(c, x, f, { body: 4, back: 3, belly: 6, leg: 3, ant: 6 }));
  animalSheet(scene, 'spr_fox', foxFrame);
  animalSheet(scene, 'spr_hare', hareFrame);
  animalSheet(scene, 'spr_leech', leechFrame);
  animalSheet(scene, 'spr_spider', spiderFrame);
  animalSheet(scene, 'spr_werewolf', (c, x, f) => wolfFrame(c, x, f, { fur: 9, dark: 7, light: 10, leg: 7 }));
  animalSheet(scene, 'spr_grimfang', (c, x, f) => wolfFrame(c, x, f, { fur: 5, dark: 4, light: 6, leg: 4 }));
  make('spr_wyrm', (ctx, x, d, f) => wyrmFrame(ctx, x, f), ['side']);
  make('spr_tide', (ctx, x, d, f) => tideFrame(ctx, x, f), ['side']);
  make('spr_root', (ctx, x, d, f) => rootFrame(ctx, x, f), ['side']);
  animalSheet(scene, 'spr_bear', bearFrame);
  animalSheet(scene, 'spr_lynx', lynxFrame);
  animalSheet(scene, 'spr_boar', boarFrame);
  animalSheet(scene, 'spr_wisp', wispFrame);         // side0-2 + hurt0 + death0 (VX-04)
  animalSheet(scene, 'spr_worm', wormFrame);         // side0-2 + hurt0 + death0 (VX-04)
  animalSheet(scene, 'spr_mimic', mimicFrame);         // side0-2 + hurt0 + death0 (VX-04)
  animalSheet(scene, 'spr_wyvern', wyvernFrame);         // side0-2 + hurt0 + death0 (VX-04)
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
  animalSheet(scene, 'spr_shroom', (ctx, x, f) => { const r = (c, xx, y, w, h) => R(ctx, c, x + xx, y, w, h); const p = [0, 1, 0][f]; r(11, 3, 5 - p, 10, 4 + p); r(14, 4, 5 - p, 8, 1); r(13, 5, 7, 2, 1); r(13, 9, 7, 2, 1); r(6, 6, 8, 4, 6); r(5, 7, 9, 2, 4); r(10, 5, 12, 6, 2); r(7, 4, 6, 1, 1); });
  animalSheet(scene, 'spr_ashhound', (c, x, f) => wolfFrame(c, x, f, { fur: 1, dark: 0, light: 12, leg: 0 }));
  // a lava slime (squashes as it creeps), a wreck crab, and a frost barnacle (a turret in a shell)
  animalSheet(scene, 'spr_slime', (ctx, ox, f) => {
    const r = (c, x, y, w, h) => R(ctx, c, ox + x, y, w, h), sq = [0, 1, 0][f];
    r(11, 3, 8 - sq, 10, 5 + sq); r(11, 2, 9, 12, 4); r(12, 4, 9 - sq, 8, 2); r(13, 5, 8 - sq, 3, 1); r(0, 5, 10, 1, 2); r(0, 10, 10, 1, 2); r(13, 4, 12, 3, 1); r(0, 3, 13, 10, 1);
  });
  animalSheet(scene, 'spr_crab', (ctx, ox, f) => {
    const r = (c, x, y, w, h) => R(ctx, c, ox + x, y, w, h), a = f === 1 ? 1 : 0, b = f === 2 ? 1 : 0;
    r(4, 4, 7, 8, 5); r(3, 5, 8, 6, 3); r(5, 5, 7, 6, 1); r(0, 5, 6, 1, 1); r(0, 10, 6, 1, 1); r(11, 0, 5 - a, 3, 3); r(11, 13, 5 - b, 3, 3); r(11, 1, 6 - a, 1, 1); r(11, 14, 6 - b, 1, 1);
    for (const x of [3, 5, 9, 11]) r(9, x, 12, 1, 2 + ((x + f) % 2));
  });
  animalSheet(scene, 'spr_barnacle', (ctx, ox, f) => {
    const r = (c, x, y, w, h) => R(ctx, c, ox + x, y, w, h);
    r(3, 3, 11, 10, 3); r(5, 4, 8, 8, 4); r(6, 5, 5, 6, 4); r(5, 6, 7, 4, 1); r(6, 7, 6, 2, 1); r(0, 6, 8, 4, 2 + (f === 1 ? 1 : 0)); r(15, 7, 8 + (f === 1 ? 1 : 0), 2, 1); r(0, 3, 13, 10, 1);
  });
  animalSheet(scene, 'spr_alpha', (c, x, f) => wolfFrame(c, x, f, { fur: 2, dark: 1, light: 3, leg: 1 }));
}

