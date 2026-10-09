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

// Helmets as seen on the hero's head. top/band: dome rows 2-3, nasal, cheeks, full (closed helm, with a slit row), horns, spikes (a crest),
// plume, gem (forehead), lamp (a lit lantern on the brow), ears, brim (a wide cap) and hood (cloth hood with a face opening).
export const WORN_HELM = {
  helm_cap:     { top: 9, band: 10, cheeks: 9 },
  helm_nasal:   { top: 4, band: 3, nasal: 5, cheeks: 3 },
  helm_nordic:  { top: 4, band: 13, nasal: 5, horns: 6, cheeks: 3 },
  helm_hood:    { hood: 7, band: 8 },
  helm_circlet: { band: 13, gem: 14 },
  helm_great:   { full: 4, slit: 1, spikes: 3 },
  helm_scale:   { top: 12, band: 11, spikes: 13, nasal: 11 },
  helm_warden:  { top: 3, band: 5, cheeks: 3, plume: 15, nasal: 5 },
  helm_skull:   { top: 6, band: 10, cheeks: 10, ears: 6, gem: 11 },
  helm_court:   { full: 4, slit: 1, crown: 13, plume: 11 },
  helm_deep:    { top: 1, band: 3, lamp: 13, cheeks: 1 },
  helm_tide:    { top: 3, band: 1, brim: 3, gem: 13 },
  helm_ember:   { top: 1, band: 11, spikes: 12, nasal: 1, gem: 12, cheeks: 1 },
  helm_rime:    { top: 4, band: 6, spikes: 6, nasal: 6, cheeks: 4 },
  helm_prism:   { top: 5, band: 15, spikes: 6, gem: 15, cheeks: 4 },
  helm_pelt:    { top: 6, band: 5, ears: 5, cheeks: 5 },
};

// Charms that are worn on the head. Everything else is a pocket charm and shows nothing.
export const WORN_HEAD = {
  charm_embercrown: { crown: 12 },
  charm_hollow:     { crown: 13, helm: 2 },
  charm_antlers:    { horns: 15 },
};

// Style for the hero wearing these (either may be undefined). The rest of the style stays the hero's own.
export function wornStyle(base, armorKind, charmKind, helmKind) {
  const a = WORN_ARMOR[armorKind], h = WORN_HEAD[charmKind], m = WORN_HELM[helmKind];
  if (!a && !h && !m) return null;
  const s = { ...base };
  if (a) {
    for (const k of ['body', 'trim', 'legs', 'boots', 'chest']) s[k] = a[k];
    s.hood = a.hood ?? undefined;
    s.cape = a.cape ?? base.cape;
    s.worn = a;
  }
  if (h) Object.assign(s, h);
  if (m) { s.helmet = m; if (m.hood != null) s.hood = m.hood; }
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

// A helmet over the hero's head. Front and back views share x 5..10, y 2..6; the side view faces right on x 6..11.
export function wornHelmet(r, view, m) {
  const front = view === 'down', back = view === 'up', side = view === 'side';
  const x0 = side ? 6 : 5, x1 = side ? 11 : 10, W = x1 - x0 + 1;
  if (m.hood != null) { if (m.band != null && front) r(m.band, 6, 6, 4, 1); return; }
  if (m.full != null) {
    r(m.full, x0, 2, W, 5);
    if (!back) r(m.slit ?? 1, side ? 8 : x0, 4, side ? 4 : W, 1);
    if (side) r(m.full, 6, 5, 1, 2);
  } else {
    if (m.top != null) r(m.top, x0, 2, W, back ? 3 : 1);
    if (m.band != null) r(m.band, x0, 3, W, 1);
    if (m.cheeks != null && !back) { if (side) r(m.cheeks, 6, 4, 1, 3); else { r(m.cheeks, 5, 4, 1, 3); r(m.cheeks, 10, 4, 1, 3); } }
    if (m.nasal != null && !back) { if (side) r(m.nasal, 11, 4, 1, 2); else r(m.nasal, 8, 4, 1, 2); }
  }
  if (m.brim != null) r(m.brim, x0 - 1, 3, W + 2, 1);
  if (m.gem != null && !back) r(m.gem, side ? 11 : 8, 3, 1, 1);
  if (m.horns != null) { if (side) { r(m.horns, 6, 1, 1, 2); r(m.horns, 5, 0, 1, 2); } else { r(m.horns, 4, 1, 1, 2); r(m.horns, 11, 1, 1, 2); r(m.horns, 3, 0, 1, 2); r(m.horns, 12, 0, 1, 2); } }
  if (m.spikes != null) { if (side) { r(m.spikes, 7, 1, 1, 1); r(m.spikes, 9, 0, 1, 2); } else { r(m.spikes, 6, 1, 1, 1); r(m.spikes, 8, 0, 1, 2); r(m.spikes, 10, 1, 1, 1); } }
  if (m.crown != null) { if (side) { r(m.crown, 6, 1, 5, 1); r(m.crown, 7, 0, 1, 1); r(m.crown, 9, 0, 1, 1); } else { r(m.crown, 5, 1, 6, 1); r(m.crown, 5, 0, 1, 1); r(m.crown, 8, 0, 1, 1); r(m.crown, 10, 0, 1, 1); } }
  if (m.plume != null) { if (side) { r(m.plume, 4, 1, 3, 1); r(m.plume, 3, 2, 3, 1); } else { r(m.plume, 10, 0, 2, 1); r(m.plume, 11, 1, 1, 2); } }
  if (m.ears != null) { if (side) { r(m.ears, 7, 1, 1, 1); r(m.ears, 10, 1, 1, 1); } else { r(m.ears, 5, 1, 1, 1); r(m.ears, 10, 1, 1, 1); } }
  if (m.lamp != null && !back) { r(m.lamp, side ? 11 : 8, 2, 1, 2); r(12, side ? 11 : 8, 1, 1, 1); }
}
