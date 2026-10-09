// Worn gear on the 16x16 hero. Each armour is a style for the hero's body (colours of the torso, belt, legs, boots) plus a few
// extras drawn over it: shoulder pads, a collar, a skirt or coat tail, mail dots, a chest badge, a sash, a hood or a cape.
// Head pieces (crowns, antlers) go through the hero's own head slots. Colours are PAL indices.
export const WORN_ARMOR = {
  armor_fur:      { body: 9, trim: 10, legs: 2, boots: 9, chest: 10, collar: 10, pads: 10 },
  armor_cuirass:  { body: 4, trim: 3, legs: 2, boots: 1, chest: 5, pads: 3, emblem: 5 },
  armor_plate:    { body: 4, trim: 15, legs: 3, boots: 2, chest: 6, pads: 15, big: 1, emblem: 15 },
  armor_leathers: { body: 8, trim: 9, legs: 7, boots: 9, chest: 9, hood: 7, sash: 9 },
  armor_robe:     { body: 14, trim: 13, legs: 14, boots: 13, chest: 13, skirt: 14, hem: 13, collar: 13, sash: 13 },
  armor_bulwark:  { body: 3, trim: 2, legs: 2, boots: 1, chest: 4, pads: 4, big: 1, emblem: 4, collar: 2 },
  armor_scale:    { body: 12, trim: 11, legs: 11, boots: 1, chest: 13, dots: 13, pads: 11 },
  armor_peat:     { body: 7, trim: 8, legs: 1, boots: 9, chest: 8, dots: 8, collar: 9, cape: 7 },
  armor_clanfurs: { body: 10, trim: 9, legs: 9, boots: 9, chest: 5, collar: 9, big: 1, pads: 9 },
  armor_cloak:    { body: 9, trim: 1, legs: 1, boots: 0, chest: 10, hood: 9, cape: 9 },
  armor_rime:     { body: 3, trim: 15, legs: 2, boots: 1, chest: 6, pads: 15, dots: 6, big: 1 },
  armor_pelt:     { body: 6, trim: 4, legs: 9, boots: 9, chest: 5, collar: 6, big: 1, pads: 5 },
  armor_sealskin: { body: 2, trim: 15, legs: 1, boots: 0, chest: 4, dots: 4, collar: 3 },
  armor_courtplate: { body: 4, trim: 13, legs: 2, boots: 13, chest: 13, pads: 13, emblem: 13, cape: 11 },
  armor_hauberk:  { body: 9, trim: 8, legs: 1, boots: 9, chest: 4, dots: 4, collar: 8 },
  armor_wardencuir: { body: 3, trim: 5, legs: 2, boots: 1, chest: 5, pads: 4, emblem: 15, cape: 15 },
  armor_prism:    { body: 5, trim: 15, legs: 4, boots: 15, chest: 6, pads: 15, dots: 6 },
  armor_deepplate: { body: 2, trim: 12, legs: 1, boots: 1, chest: 3, pads: 3, big: 1, emblem: 12 },
  armor_tidecoat: { body: 3, trim: 15, legs: 2, boots: 1, chest: 4, skirt: 3, hem: 15, collar: 4 },
  armor_seacoat:  { body: 4, trim: 5, legs: 3, boots: 1, chest: 13, skirt: 4, hem: 5, dots: 13 },
  armor_embermail: { body: 11, trim: 12, legs: 1, boots: 1, chest: 13, dots: 12, pads: 12, big: 1, emblem: 13 },
};

// Charms that are worn on the head. Everything else is a pocket charm and shows nothing.
export const WORN_HEAD = {
  charm_embercrown: { crown: 12 },
  charm_hollow:     { crown: 13, helm: 2 },
  charm_antlers:    { horns: 15 },
};

// Style for the hero wearing these (either may be undefined). The rest of the style stays the hero's own.
export function wornStyle(base, armorKind, charmKind) {
  const a = WORN_ARMOR[armorKind], h = WORN_HEAD[charmKind];
  if (!a && !h) return null;
  const s = { ...base };
  if (a) {
    for (const k of ['body', 'trim', 'legs', 'boots', 'chest']) s[k] = a[k];
    s.hood = a.hood ?? undefined;
    s.cape = a.cape ?? base.cape;
    s.worn = a;
  }
  if (h) Object.assign(s, h);
  return s;
}

// Extras over the finished hero. r(colour, x, y, w, h) is already offset for the frame; view is 'down' | 'up' | 'side' (faces right).
export function wornExtra(r, view, w, pose) {
  const front = view === 'down', side = view === 'side';
  const x0 = side ? 5 : 4, x1 = side ? 10 : 11, W = x1 - x0 + 1;
  if (w.dots != null) for (let y = 8; y <= 10; y++) for (let x = x0 + 1; x < x1; x++) if ((x + y) % 2 === 0 && !(y === 10)) r(w.dots, x, y, 1, 1);
  if (w.sash != null) { if (side) r(w.sash, 6, 8, 3, 1); else { r(w.sash, 5, 8, 2, 1); r(w.sash, 7, 9, 3, 1); } }
  if (w.emblem != null && front) r(w.emblem, 7, 8, 2, 2);
  if (w.skirt != null) { r(w.skirt, x0, 12, W, 1); r(w.hem ?? w.skirt, x0, 13, 2, 1); r(w.hem ?? w.skirt, x1 - 1, 13, 2, 1); if (side) r(w.hem ?? w.skirt, 6, 13, 3, 1); }
  if (w.collar != null) { r(w.collar, x0, 7, W, 1); if (w.big) r(w.collar, x0 - 1, 7, W + 2, 2); }
  if (w.pads != null && !pose) {
    if (side) r(w.pads, 6, 6, 3, 2);
    else if (w.big) { r(w.pads, 2, 6, 3, 3); r(w.pads, 11, 6, 3, 3); r(w.chest, 2, 6, 3, 1); r(w.chest, 11, 6, 3, 1); }
    else { r(w.pads, 3, 7, 2, 2); r(w.pads, 11, 7, 2, 2); }
  } else if (w.pads != null) {
    if (side) r(w.pads, 6, 6, 3, 2); else { r(w.pads, 3, 6, 2, 2); r(w.pads, 11, 6, 2, 2); }
  }
}
