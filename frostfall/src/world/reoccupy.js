// WQ15 + WQ20: the world changes back. Every few days one or two cleared camps, towers, ruins or dens in each region are
// retaken by a tougher crew (one tier up, with a named lieutenant, and a new sign). Dungeons, landmarks and the places a
// quest is built on are never retaken. Each hub has a bounty board for its region: the retaken places and the camps nobody
// has cleared yet. Logic here is pure (state + the built region); the scene side is in features/world_reoccupy.js.
import { S } from '../systems/state.js';
import { TUNE } from '../data/tuning.js';
import { getRegion } from '../data/maps.js';
import { REGIONS, REGION_ORDER } from '../data/regions.js';

export const RETAKE_KINDS = new Set(['camp', 'tower', 'ruin', 'den']);
export const BANNERS = ['THE HOLLOW BANNER FLIES HERE NOW.', 'A NEW CREW HAS MOVED IN. THEY BROUGHT A CAPTAIN.', 'SOMEONE HAS TAKEN THIS PLACE BACK. THEY MEAN TO KEEP IT.'];
export const LIEUTENANTS = ['Grenna the Red', 'Ulf Half-Hand', 'Sorve the Quiet', 'Hakon Ironjaw', 'Bera of the Ash', 'Torvi Coldeye', 'Ingrid Saltblood', 'Ketil the Lame'];

const book = () => (S.flags.retaken ||= {});
const lastRoll = () => (S.flags.retakeDay ??= Math.floor(S.days || 0));
export const retakenOn = (map) => Object.entries(book()).filter(([k, v]) => k.startsWith(map + ':') && !v.cleared).map(([k, v]) => ({ id: k.slice(map.length + 1), ...v }));

// The camps, towers, ruins and dens of a region you have cleared and that are not held again already.
export function retakeable(rid) {
  const map = REGIONS[rid].map;
  return getRegion(rid).pois.filter((p) => RETAKE_KINDS.has(p.kind) && S.bounty?.[p.id] && !(book()[map + ':' + p.id] && !book()[map + ':' + p.id].cleared));
}

// Once every `everyDays` game days: each region loses `perRegion` cleared places to a new crew. Returns the new entries.
// rnd: a 0..1 function (seeded by the day so a reload does not reroll).
export function rollRetakes(rnd) {
  const R = TUNE.world.retake, day = Math.floor(S.days || 0);
  if (day - lastRoll() < R.everyDays) return [];
  S.flags.retakeDay = day;
  const made = [];
  for (const rid of REGION_ORDER) {
    if (REGIONS[rid].locked()) continue;
    const pool = retakeable(rid);
    for (let n = 0; n < R.perRegion && pool.length; n++) {
      const p = pool.splice(Math.floor(rnd() * pool.length), 1)[0], key = REGIONS[rid].map + ':' + p.id;
      book()[key] = { day, tier: Math.min(3, (p.tier || 0) + 1), who: LIEUTENANTS[Math.floor(rnd() * LIEUTENANTS.length)], sign: BANNERS[Math.floor(rnd() * BANNERS.length)], cleared: false };
      made.push({ rid, key, p });
    }
  }
  return made;
}

// ---- the hub boards: today's contracts for a region
export function boardOf(rid) {
  const day = Math.floor(S.days || 0), all = (S.flags.rboard ||= {});
  const cur = all[rid];
  if (cur && cur.day === day) return cur;
  const map = REGIONS[rid].map, keep = (cur?.active || []).filter((id) => !cur.paid?.[id]);
  const reg = getRegion(rid);
  const held = retakenOn(map).map((r) => ({ id: r.id, retaken: true, tier: r.tier, who: r.who }));
  const open = reg.pois.filter((p) => RETAKE_KINDS.has(p.kind) && !S.bounty?.[p.id]).slice(0, 6).map((p) => ({ id: p.id, retaken: false, tier: p.tier || 0 }));
  const offers = [...held, ...open].slice(0, 5).map((o) => {
    const p = reg.pois.find((q) => q.id === o.id);
    return { ...o, kind: p.kind, x: p.x, y: p.y, gold: TUNE.world.retake.boardGold[0] + TUNE.world.retake.boardGold[1] * o.tier };
  });
  for (const id of keep) if (!offers.some((o) => o.id === id) && cur.offers.find((o) => o.id === id)) offers.push(cur.offers.find((o) => o.id === id));
  return (all[rid] = { day, offers, active: keep, paid: {} });
}
// a board contract is done when its place is cleared (a retaken one: when the new crew is down)
export function contractDone(rid, o) {
  const map = REGIONS[rid].map;
  return o.retaken ? !!book()[map + ':' + o.id]?.cleared : !!S.bounty?.[o.id];
}
export const markCleared = (map, id) => { const r = book()[map + ':' + id]; if (r) r.cleared = true; };
