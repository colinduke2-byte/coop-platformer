// Weather logic per region (WQ3, WQ19). S.weather is one value; what it may be depends on where you are:
//   snowy maps (the Reach, the Coast, the Stormcrown, their towns): clear / snow / blizzard / whiteout / aurora, and on the
//   Stormcrown a thunderstorm ('storm'); everywhere else the region's own kinds (TUNE.world.weather.roll):
//   Ashen Peaks ash  |  Weeping Fens rain, fog  |  Sunscorch sandstorm  |  Embergreen Vale rain  |  Glasswood chime (a ringing
//   wind)  |  Old Kingdom rain  |  Underdeep none (it has tremors instead).
// The bus event 'weather' (kind, region) carries these names; art and audio draw and play them.
import { TUNE } from '../data/tuning.js';

export const SNOW_KINDS = ['clear', 'snow', 'blizzard', 'whiteout', 'aurora'];
export const SNOWY_REGIONS = new Set(['reach', 'coast', 'highlands']);
const W = () => TUNE.world.weather;

// the kinds a region can have (`snowy` = the map has snow, which decides for odd maps)
export function kindsOf(region, snowy) {
  if (snowy || SNOWY_REGIONS.has(region) || !W().roll[region]) return region === 'highlands' ? [...SNOW_KINDS, 'storm'] : SNOW_KINDS;
  return Object.keys(W().roll[region]);
}
export const fits = (kind, region, snowy) => kindsOf(region, snowy).includes(kind);

// the region's heaviest weather (what the Eternal Winter modifier turns into where it does not snow)
export function heavyOf(region, snowy) {
  const k = kindsOf(region, snowy);
  return k.includes('blizzard') ? 'blizzard' : k.filter((x) => x !== 'clear').pop() || 'clear';
}

// The weather to switch to when a snowless region's timer fires: a weighted pick, never the same storm twice in a row.
export function rollRegion(region, cur, r = Math.random()) {
  const tab = W().roll[region] || { clear: 1 };
  const ks = Object.keys(tab).filter((k) => k === 'clear' || k !== cur);
  const tot = ks.reduce((s, k) => s + tab[k], 0);
  let acc = 0;
  for (const k of ks) { acc += tab[k] / tot; if (r < acc) return k; }
  return 'clear';
}

// What a weather you carried in from another region becomes here.
export function arrive(kind, region, snowy) {
  if (fits(kind, region, snowy)) return kind;
  if (snowy || SNOWY_REGIONS.has(region)) return kind === 'clear' ? 'clear' : 'snow';
  return 'clear';
}

export const stealthMul = (kind) => W().stealth[kind] ?? 1;
export const windOf = (kind) => W().wind[kind] || 0;
export const weatherMul = (element, kind) => (element === 'fire' && kind === 'rain' ? W().fireInRain : 1);
// Storms that chill you through ordinary clothes (only where it snows: WQ3)
export const chills = (kind, snowy) => !!snowy && (kind === 'blizzard' || kind === 'whiteout');

// The toast for a change of weather.
export const TOASTS = {
  blizzard: ['A BLIZZARD ROLLS IN', 15], whiteout: ['WHITEOUT: YOU CAN HARDLY SEE', 15], aurora: ['THE AURORA SHIMMERS: SPELLS COST LESS', 8],
  storm: ['THUNDER ON THE HEATH: KEEP OFF THE OPEN GROUND', 13],
  ash: ['ASH FALLS FROM THE PEAKS: EMBERS BURN', 12], sandstorm: ['A SANDSTORM: THE DUNES HIDE EVERYTHING', 10],
  fog: ['FOG RISES FROM THE BLACK WATER', 4], rain: ['RAIN SWEEPS IN', 4], chime: ['THE CHIME WIND: CRYSTAL RINGS', 15],
};
export const clearToast = (from, region) => (from === 'sandstorm' ? ['THE DUST SETTLES', 13] : from === 'ash' ? ['THE ASH SETTLES', 5] : from === 'fog' ? ['THE FOG LIFTS', 5]
  : from === 'rain' ? ['THE RAIN PASSES', 13] : from === 'chime' ? ['THE WIND FALLS STILL', 5] : SNOWY_REGIONS.has(region) ? ['THE SNOW THINS', 5] : null);

// What the snowfall picture (SnowFx) shows for a kind it does not know.
export const snowMode = (kind) => (kind === 'storm' ? 'blizzard' : kind);
// The art overlay of the snowless regions (art/weather.js REGION_SKY) names its modes per region; these are the modes for
// the region kinds above, merged into that table when it exists (features/world.js).
export const ART_SKY = {
  ashen: { ash: 'ash' }, fens: { rain: 'rain', fog: 'mist' }, sunscorch: { sandstorm: 'sandstorm' }, vale: { rain: 'rain' },
  glasswood: { chime: 'glitter' }, kingdom: { rain: 'drizzle' },
};
