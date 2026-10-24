// AU20: ambience in layers. A map gets a bed for its region (wind, shore, marsh, meadow, glass, lava, desert, deep,
// crypt, a fireplace indoors), a town murmur in the hubs, and a weather layer outdoors (blizzard, whiteout, aurora,
// rain, storm, sandstorm, fog, ash). Each layer is one looping noise source (or a few quiet oscillators) plus spot
// sounds drawn on one shared 0.5 s timer. Layers crossfade when the map, the weather or the region changes.
//
// GameScene still calls ambience.play('wind' | 'crypt' | null) per map; the bed is picked from that, the map
// (music.setPlace) and the region and weather (the 'weather' bus event; see hooks.js).
import { TUNE } from '../data/tuning.js';
import { nodes, ac, brownBuffer, noiseBuffer, ramp, isHidden } from './core.js';
import { SOUNDS } from './sounds.js';
import { place, where, HUBS } from './state.js';

// A looping noise bed: buffer, filter, level, and an optional slow swell (gain LFO) and drift (filter LFO).
function noiseBed(a, out, o) {
  const src = a.createBufferSource(); src.buffer = o.white ? noiseBuffer(a) : brownBuffer(a); src.loop = true;
  const f = a.createBiquadFilter(); f.type = o.type || 'bandpass'; f.frequency.value = o.f; f.Q.value = o.q ?? 0.7;
  const g = a.createGain(); g.gain.value = o.vol;
  src.connect(f); f.connect(g); g.connect(out);
  const made = [src];
  if (o.swell) { const l = a.createOscillator(); l.frequency.value = o.swell[0]; const lg = a.createGain(); lg.gain.value = o.swell[1]; l.connect(lg); lg.connect(g.gain); l.start(); made.push(l); }
  if (o.drift) { const l = a.createOscillator(); l.frequency.value = o.drift[0]; const lg = a.createGain(); lg.gain.value = o.drift[1]; l.connect(lg); lg.connect(f.frequency); l.start(); made.push(l); }
  src.start(0, Math.random() * 2);
  return made;
}
function drones(a, out, list, shimmer = 0) {
  return list.flatMap(([fr, vol, type = 'sine']) => {
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.value = fr; g.gain.value = vol;
    o.connect(g); g.connect(out); o.start();
    if (!shimmer) return [o];
    const l = a.createOscillator(); l.frequency.value = shimmer * (0.7 + Math.random() * 0.6); const lg = a.createGain(); lg.gain.value = vol * 0.9;
    l.connect(lg); lg.connect(g.gain); l.start();
    return [o, l];
  });
}

// name -> { make(ctx, out) -> nodes to stop, spots: [[sound, per second, 'day' | 'night' | undefined]] }
export const LAYERS = {
  wind: { make: (a, o) => noiseBed(a, o, { f: 520, q: 0.7, vol: 0.05, swell: [0.13, 0.035], drift: [0.05, 180] }) },
  crypt: { make: (a, o) => drones(a, o, [[55, 0.028], [55.6, 0.028], [82.4, 0.012]]), spots: [['amb_drip', 0.19]] },
  deep: { make: (a, o) => [...drones(a, o, [[41.2, 0.03], [41.6, 0.024], [61.7, 0.01]]), ...noiseBed(a, o, { type: 'lowpass', f: 160, vol: 0.03, swell: [0.04, 0.02] })], spots: [['amb_drip', 0.12], ['creak', 0.02]] },
  shore: { make: (a, o) => noiseBed(a, o, { type: 'lowpass', f: 650, q: 0.5, vol: 0.06, swell: [0.13, 0.05], drift: [0.13, 250] }), spots: [['amb_gull', 0.07, 'day']] },
  marsh: { make: (a, o) => noiseBed(a, o, { f: 320, vol: 0.025, swell: [0.09, 0.015] }), spots: [['amb_frog', 0.35], ['amb_bubble', 0.2], ['amb_insects', 0.15, 'night']] },
  meadow: { make: (a, o) => noiseBed(a, o, { f: 700, vol: 0.02, swell: [0.11, 0.012] }), spots: [['amb_bird', 0.4, 'day'], ['amb_cricket', 0.7, 'night']] },
  glass: { make: (a, o) => noiseBed(a, o, { f: 900, vol: 0.018, swell: [0.1, 0.01] }), spots: [['amb_chime', 0.25]] },
  lava: { make: (a, o) => noiseBed(a, o, { type: 'lowpass', f: 120, q: 0.8, vol: 0.09, swell: [0.07, 0.04] }), spots: [['amb_lava', 0.4]] },
  desert: { make: (a, o) => [...noiseBed(a, o, { f: 1200, q: 0.5, vol: 0.035, swell: [0.09, 0.02], drift: [0.04, 300] }), ...noiseBed(a, o, { white: true, type: 'highpass', f: 5000, vol: 0.006 })], spots: [['amb_sand', 0.08]] },
  town: { make: (a, o) => noiseBed(a, o, { f: 380, q: 1.6, vol: 0.022, swell: [0.45, 0.012] }), spots: [['creak', 0.03, 'day']] },
  forge: { make: () => [], spots: [['amb_clank', 0.45, 'day'], ['amb_clank', 0.12, 'night']] },
  interior: { make: (a, o) => noiseBed(a, o, { type: 'lowpass', f: 220, vol: 0.016 }), spots: [['crackle', 1.4], ['creak', 0.02]] },
  // weather (outdoors only)
  blizzard: { make: (a, o) => noiseBed(a, o, { f: 900, q: 0.6, vol: 0.07, swell: [0.2, 0.04], drift: [0.09, 300] }), spots: [['amb_gust', 0.2]] },
  whiteout: { make: (a, o) => noiseBed(a, o, { f: 1100, q: 0.5, vol: 0.1, swell: [0.25, 0.05], drift: [0.12, 400] }), spots: [['amb_gust', 0.35]] },
  aurora: { make: (a, o) => drones(a, o, [[659, 0.004], [831, 0.0035], [988, 0.003], [1319, 0.002]], 0.3) },
  rain: { make: (a, o) => noiseBed(a, o, { white: true, f: 3000, q: 0.5, vol: 0.03, swell: [0.07, 0.008] }) },
  storm: { make: (a, o) => noiseBed(a, o, { white: true, f: 2500, q: 0.5, vol: 0.045, swell: [0.1, 0.012] }), spots: [['thunder', 0.03]] },
  sandstorm: { make: (a, o) => [...noiseBed(a, o, { f: 800, q: 0.6, vol: 0.09, swell: [0.22, 0.05], drift: [0.15, 350] }), ...noiseBed(a, o, { white: true, type: 'highpass', f: 4000, vol: 0.02, swell: [0.3, 0.01] })], spots: [['amb_sand', 0.3], ['amb_gust', 0.15]] },
  fog: { make: (a, o) => noiseBed(a, o, { type: 'lowpass', f: 250, vol: 0.03, swell: [0.05, 0.015] }), spots: [['amb_foghorn', 0.025], ['amb_drip', 0.05]] },
  ash: { make: (a, o) => noiseBed(a, o, { type: 'lowpass', f: 150, vol: 0.05, swell: [0.06, 0.02] }), spots: [['amb_ember', 0.8], ['amb_lava', 0.06]] },
};
export const REGION_BED = { reach: 'wind', ashen: 'lava', coast: 'shore', kingdom: 'wind', fens: 'marsh', highlands: 'wind', glasswood: 'glass', vale: 'meadow', sunscorch: 'desert', underdeep: 'deep' };
// S.weather -> its layer ('snow' and 'clear' add none; a blizzard / whiteout / sandstorm replaces the calm wind)
export const WEATHER_BED = { blizzard: 'blizzard', whiteout: 'whiteout', aurora: 'aurora', rain: 'rain', storm: 'storm', sandstorm: 'sandstorm', fog: 'fog', ash: 'ash' };
const LOUD_WEATHER = new Set(['blizzard', 'whiteout', 'sandstorm']);

// The layers this place wants right now.
export function wantedLayers(kind) {
  if (place.interior) return ['interior'];
  if (!kind) return [];
  if (kind === 'crypt') return [where.region === 'underdeep' && !place.cave ? 'deep' : 'crypt'];
  const out = [];
  const w = place.outdoors || !place.map ? WEATHER_BED[where.weather] : null;
  const bed = REGION_BED[where.region] || 'wind';
  if (!(w && LOUD_WEATHER.has(w) && bed === 'wind')) out.push(bed);
  if (HUBS.has(place.map)) out.push('town');
  if (place.map === 'emberhold') out.push('forge');
  if (w) out.push(w);
  return out;
}

const active = new Map();     // layer name -> { gain, made, spots }
let kindWanted = null, spotTimer = null, pending = false;
function startLayer(name) {
  const a = ac(); if (!a) return;
  const L = LAYERS[name]; if (!L) return;
  const g = a.createGain(); g.gain.value = 0; g.connect(nodes.ambBus);
  let made = [];
  try { made = L.make(a, g); } catch { /* best effort */ }
  ramp(g.gain, 1, TUNE.audio.ambFade);
  active.set(name, { gain: g, made, spots: L.spots || [] });
}
function stopLayer(name, secs = TUNE.audio.ambFade) {
  const l = active.get(name); if (!l) return;
  active.delete(name);
  ramp(l.gain.gain, 0, secs);
  setTimeout(() => { l.made.forEach((n) => { try { n.stop(); } catch { /* ignore */ } }); try { l.gain.disconnect(); } catch { /* ignore */ } }, secs * 1000 + 200);
}
function spotTick() {
  if (isHidden() || !active.size) return;
  for (const l of active.values()) for (const [snd, rate, when] of l.spots) {
    if (when === 'day' && where.night) continue;
    if (when === 'night' && !where.night) continue;
    if (Math.random() < rate * 0.5) { try { SOUNDS[snd]?.(); } catch { /* ignore */ } }
  }
}

export const ambience = {
  // 'wind' (any outdoor map), 'crypt' (caves), null (none, or the room tone indoors)
  play(kind) {
    kindWanted = kind || null;
    if (!pending) { pending = true; setTimeout(() => { pending = false; this.refresh(); }, 0); }
  },
  // Bring the layers in line with the place, region and weather (called again on every 'weather' event).
  refresh() {
    const a = ac(); if (!a) return;
    const want = new Set(wantedLayers(kindWanted));
    for (const n of [...active.keys()]) if (!want.has(n)) stopLayer(n);
    for (const n of want) if (!active.has(n)) startLayer(n);
    if (!spotTimer && want.size) spotTimer = setInterval(spotTick, 500);
  },
  stop() {
    kindWanted = null;
    for (const n of [...active.keys()]) stopLayer(n, 0.3);
    if (spotTimer) { clearInterval(spotTimer); spotTimer = null; }
  },
  layers() { return [...active.keys()]; },
  kind() { return kindWanted; },
};
