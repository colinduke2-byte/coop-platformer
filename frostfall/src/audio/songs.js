// The music: song data, the key each song is in, and the variants made from it (night, dungeon, boss).
// Pure data and functions (no Web Audio), so tests can analyse it in Node (test/stage97_music.mjs).
//
// A song: bpm, lead / bass waveforms, root (MIDI), sections A, B (and C). A section is 4 bars of 16 eighth-note steps;
// each bar has a chord (semitones from the root) and the section has one 16-step melody (semitones above the chord).
// AU15: the melody follows each chord *diatonically*: it moves by scale degrees inside the song's key, never in parallel
// semitones, so it stays in key; a note a semitone off a borrowed chord's tone snaps to that tone.
import { TUNE } from '../data/tuning.js';

export const SCALES = { minor: [0, 2, 3, 5, 7, 8, 10], major: [0, 2, 4, 5, 7, 9, 11], phrygian: [0, 1, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10] };
export const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
const mod = (n, m) => ((n % m) + m) % m;

export const SONGS = {
  village: { bpm: 84, lead: 'square', bass: 'triangle', root: 57, arp: 'even',
    A: { chords: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -2, 2]], melody: [12, null, 15, 14, 12, null, 10, null, 8, null, 12, 10, 8, null, 7, null] },
    B: { chords: [[-4, 0, 3], [-2, 2, 5], [0, 3, 7], [-5, -2, 2]], melody: [15, null, 14, 12, null, 10, 12, null, 14, null, 12, 10, null, 8, 10, null] } },
  // AU18: every house, inn and shop plays this, so it is now three sections long (was one 21 s phrase)
  interior: { bpm: 90, lead: 'square', bass: 'triangle', root: 55, arp: 'both',
    A: { chords: [[0, 4, 7], [-3, 0, 4], [-5, -1, 2], [-7, -3, 0]], melody: [12, null, 14, 16, 14, null, 12, null, 11, null, 12, 14, 12, null, 9, null] },
    B: { chords: [[-7, -3, 0], [-5, -1, 2], [0, 4, 7], [-3, 0, 4]], melody: [16, null, 14, 12, null, 11, 12, null, 14, null, 16, null, 19, null, null, null] },
    C: { chords: [[-3, 0, 4], [-7, -3, 0], [-5, -1, 2], [-5, -1, 2]], melody: [12, null, null, 11, 12, null, 14, null, 16, null, 14, null, 12, null, null, null] } },
  // AU18: night no longer shares the village's progression
  night: { bpm: 58, lead: 'triangle', bass: 'triangle', root: 45, arp: 'none',
    A: { chords: [[0, 3, 7], [-7, -4, 0], [-4, 0, 3], [-5, -2, 2]], melody: [null, null, 12, null, null, null, 10, null, null, null, 8, null, null, null, null, null] },
    B: { chords: [[-4, 0, 3], [0, 3, 7], [-5, -2, 2], [-2, 2, 5]], melody: [null, 15, null, null, null, 12, null, null, null, 10, null, null, 8, null, null, null] } },
  forest: { bpm: 72, lead: 'triangle', bass: 'square', root: 50,
    A: { chords: [[0, 3, 7], [-2, 2, 5], [-4, 0, 3], [-5, -2, 2]], melody: [null, 7, null, 10, 12, null, 10, null, null, 5, null, 8, 10, null, 8, null] },
    B: { chords: [[-2, 2, 5], [0, 3, 7], [-5, -2, 2], [-4, 0, 3]], melody: [null, 10, null, 12, 14, null, 12, null, null, 8, null, 10, 12, null, 7, null] } },
  pass: { bpm: 76, lead: 'triangle', bass: 'square', root: 52,
    A: { chords: [[0, 3, 7], [-2, 2, 5], [-4, 0, 3], [-7, -4, 0]], melody: [null, 12, null, 10, 7, null, 10, null, 12, null, 15, 14, 12, null, 10, null] },
    B: { chords: [[-4, 0, 3], [0, 3, 7], [-2, 2, 5], [-7, -4, 0]], melody: [12, null, null, 10, null, 7, null, null, 15, null, 14, null, 12, null, 10, null] } },
  // the crypt is deliberately diminished: its melody keeps the old parallel movement (scale: null)
  crypt: { bpm: 66, lead: 'sawtooth', bass: 'triangle', root: 43, scale: null,
    A: { chords: [[0, 3, 6], [-1, 2, 5], [0, 3, 6], [-3, 0, 3]], melody: [12, null, null, 11, null, null, 9, null, 12, null, null, 14, null, 11, null, null] },
    B: { chords: [[-3, 0, 3], [0, 3, 6], [-1, 2, 5], [0, 3, 6]], melody: [null, null, 11, null, null, 9, null, null, 12, null, null, 11, null, null, 9, null] } },
  boss: { bpm: 132, lead: 'square', bass: 'sawtooth', root: 43, boss: true,
    A: { chords: [[0, 3, 7], [0, 3, 7], [-2, 1, 5], [-1, 2, 6]], melody: [12, 12, null, 15, 12, null, 10, 12, 13, 13, null, 16, 13, null, 11, 13] },
    B: { chords: [[-2, 1, 5], [-1, 2, 6], [0, 3, 7], [0, 3, 7]], melody: [13, 13, null, 16, 13, null, 11, 13, 12, 12, null, 15, 12, null, 10, 12] } },
  cavern: { bpm: 60, lead: 'triangle', bass: 'triangle', root: 40,
    A: { chords: [[0, 7, 12], [-2, 5, 10], [-4, 3, 8], [-5, 2, 7]], melody: [null, null, 19, null, null, 17, null, null, null, 15, null, null, 14, null, null, null] },
    B: { chords: [[-4, 3, 8], [-5, 2, 7], [0, 7, 12], [-2, 5, 10]], melody: [null, 14, null, null, 15, null, null, null, 17, null, null, 15, null, null, 12, null] } },
  throne: { bpm: 104, lead: 'sawtooth', bass: 'sawtooth', root: 41, boss: true,
    A: { chords: [[0, 3, 7], [-4, 0, 3], [-2, 1, 5], [-5, -2, 2]], melody: [12, null, 12, 15, null, 17, 15, null, 14, null, 14, 12, null, 10, 12, null] },
    B: { chords: [[-2, 1, 5], [-5, -2, 2], [0, 3, 7], [-1, 2, 6]], melody: [17, null, 15, null, 17, 19, null, 17, 15, null, 14, null, 12, 14, 15, null] } },
  dragon: { bpm: 140, lead: 'square', bass: 'sawtooth', root: 38, boss: true,
    A: { chords: [[0, 3, 7], [0, 3, 7], [1, 5, 8], [-2, 2, 5]], melody: [12, 12, 15, null, 12, 10, 12, null, 13, 13, 17, null, 13, 12, 10, null] },
    B: { chords: [[1, 5, 8], [-2, 2, 5], [0, 3, 7], [-1, 2, 6]], melody: [17, null, 15, 13, 17, null, 20, null, 19, 17, null, 15, 13, null, 12, null] } },
  ashen: { bpm: 96, lead: 'sawtooth', bass: 'triangle', root: 38,
    A: { chords: [[0, 3, 7], [-2, 2, 5], [-4, 0, 3], [-5, -1, 2]], melody: [12, null, 15, null, 14, 12, null, 10, 12, null, 15, 17, null, 15, 14, null] },
    B: { chords: [[-4, 0, 3], [-2, 2, 5], [0, 3, 7], [1, 5, 8]], melody: [15, null, 17, 15, null, 14, null, 12, 10, null, 12, 14, null, 12, 10, null] } },
  coast: { bpm: 72, lead: 'triangle', bass: 'sine', root: 36, scale: 'major',
    A: { chords: [[0, 7, 12], [-3, 4, 9], [-5, 2, 7], [-7, 0, 5]], melody: [null, 19, null, 17, null, null, 16, null, 14, null, null, 16, null, 19, null, null] },
    B: { chords: [[-5, 2, 7], [-7, 0, 5], [0, 7, 12], [-3, 4, 9]], melody: [null, 16, null, null, 14, null, 12, null, null, 14, 16, null, 19, null, null, null] } },
  kingdom: { bpm: 84, lead: 'triangle', bass: 'triangle', root: 40,
    A: { chords: [[0, 3, 7], [-4, 0, 3], [-2, 1, 5], [-7, -3, 0]], melody: [15, null, null, 17, null, 19, null, null, 17, null, 15, null, 14, null, null, null] },
    B: { chords: [[-2, 1, 5], [-7, -3, 0], [0, 3, 7], [-5, -2, 2]], melody: [19, null, 17, null, null, 15, null, 14, null, 15, null, 17, 19, null, null, null] } },
  fens: { bpm: 62, lead: 'sine', bass: 'triangle', root: 33,
    A: { chords: [[0, 3, 7], [-2, 1, 5], [-4, 0, 3], [-5, -2, 2]], melody: [null, 15, null, null, 14, null, 12, null, null, 10, null, 12, null, null, 14, null] },
    B: { chords: [[-4, 0, 3], [-5, -2, 2], [0, 3, 7], [-2, 1, 5]], melody: [12, null, null, 14, null, 15, null, null, 17, null, 15, null, 14, null, null, null] } },
  highlands: { bpm: 100, lead: 'triangle', bass: 'sawtooth', root: 40, scale: 'major',
    A: { chords: [[0, 7, 12], [-2, 5, 10], [-5, 2, 7], [-3, 4, 9]], melody: [19, null, 17, null, 16, null, 14, null, 16, null, 17, 19, null, 21, null, null] },
    B: { chords: [[-5, 2, 7], [-3, 4, 9], [0, 7, 12], [-2, 5, 10]], melody: [21, null, 19, null, 17, null, 16, 17, 19, null, null, 16, null, 14, null, null] } },
  // hub songs: Emberhold rings with the forge, Reedwick sways, Skarn Hold stamps its feet
  // AU18: these five no longer share their A progression with another song
  emberhold: { bpm: 92, lead: 'square', bass: 'sawtooth', root: 45,
    A: { chords: [[0, 3, 7], [-4, 0, 3], [-7, -4, 0], [-5, -2, 2]], melody: [12, null, 12, 15, null, 17, null, 15, 14, null, 12, null, 10, null, 12, null] },
    B: { chords: [[-4, 0, 3], [-7, -4, 0], [0, 3, 7], [-2, 2, 5]], melody: [15, null, 17, null, 19, null, 17, 15, 14, null, null, 12, 10, null, 12, null] } },
  reedwick: { bpm: 66, lead: 'sine', bass: 'triangle', root: 52,
    A: { chords: [[0, 4, 7], [-8, -5, -1], [-7, -3, 0], [-5, -1, 2]], melody: [null, 16, null, 14, null, 12, null, null, 11, null, 12, null, 14, null, null, null] },
    B: { chords: [[-5, -1, 2], [-7, -3, 0], [0, 4, 7], [-3, 0, 4]], melody: [14, null, null, 16, null, 14, null, 12, null, null, 11, null, 12, null, null, null] } },
  skarnhold: { bpm: 108, lead: 'triangle', bass: 'square', root: 50, scale: 'major',
    A: { chords: [[0, 7, 12], [-5, 2, 7], [-2, 5, 10], [0, 7, 12]], melody: [19, null, 19, 17, null, 16, null, 14, 16, null, 17, null, 19, null, null, null] },
    B: { chords: [[-5, 2, 7], [-3, 4, 9], [0, 7, 12], [-2, 5, 10]], melody: [16, null, 17, null, 19, 21, null, 19, 17, null, 16, null, 14, null, null, null] } },
  glasswood: { bpm: 78, lead: 'triangle', bass: 'sine', root: 52,
    A: { chords: [[0, 4, 7], [-5, -1, 2], [-3, 0, 4], [-7, -3, 0]], melody: [19, null, 16, null, 14, null, 16, 19, null, 21, null, 19, null, 16, null, null] },
    B: { chords: [[-3, 0, 4], [-7, -3, 0], [0, 4, 7], [-5, -1, 2]], melody: [16, null, 19, null, 21, null, 23, null, 21, null, 19, 16, null, 14, null, null] } },
  vale: { bpm: 92, lead: 'triangle', bass: 'sine', root: 55,
    A: { chords: [[0, 4, 7], [-3, 0, 4], [-5, -1, 2], [-7, -3, 0]], melody: [19, null, 21, 19, null, 16, null, 19, 21, null, 23, 21, null, 19, null, null] },
    B: { chords: [[-5, -1, 2], [-7, -3, 0], [0, 4, 7], [-3, 0, 4]], melody: [16, null, 19, null, 16, 14, null, 16, 19, null, 21, null, 19, 16, null, null] } },
  // the desert sings in the phrygian mode (the flat second gives it its heat)
  sunscorch: { bpm: 84, lead: 'square', bass: 'triangle', root: 50, scale: 'phrygian',
    A: { chords: [[0, 3, 7], [1, 5, 8], [-2, 1, 5], [0, 3, 7]], melody: [17, null, 19, 20, null, 19, null, 17, 15, null, 17, null, 20, null, 19, null] },
    B: { chords: [[-4, 0, 3], [-5, -2, 1], [0, 3, 7], [1, 5, 8]], melody: [15, null, 17, null, 19, 17, null, 15, 13, null, 15, null, 17, 19, null, null] } },
  underdeep: { bpm: 56, lead: 'sine', bass: 'triangle', root: 33, scale: 'minor',
    A: { chords: [[0, 7, 12], [-2, 5, 10], [-5, 2, 7], [-7, 0, 5]], melody: [null, null, null, 19, null, null, 17, null, null, null, 15, null, null, 14, null, null] },
    B: { chords: [[-5, 2, 7], [-7, 0, 5], [0, 7, 12], [-2, 5, 10]], melody: [null, 14, null, null, null, 15, null, null, 17, null, null, null, 15, null, 12, null] } },
  saltmarket: { bpm: 96, lead: 'square', bass: 'triangle', root: 48,
    A: { chords: [[0, 4, 7], [-7, -3, 0], [-5, -1, 2], [0, 4, 7]], melody: [12, null, 16, 16, null, 19, null, 16, 14, null, 14, 16, null, 14, 12, null] },
    B: { chords: [[-3, 0, 4], [-7, -3, 0], [0, 4, 7], [-5, -1, 2]], melody: [16, null, 19, null, 21, 19, null, 16, 14, null, 12, null, 14, 16, null, null] } },
  // AU19: hand-written themes for the two final bosses
  sovereign: { bpm: 144, lead: 'sawtooth', bass: 'square', root: 38, boss: true, scale: 'minor',
    A: { chords: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -1, 2]], melody: [12, 12, null, 15, 17, null, 15, 12, 10, null, 12, 15, null, 14, 12, null] },
    B: { chords: [[-4, 0, 3], [-7, -4, 0], [-2, 2, 5], [-5, -1, 2]], melody: [19, null, 17, 15, null, 17, null, 19, 20, null, 19, 17, null, 15, 14, null] } },
  hollowking: { bpm: 120, lead: 'square', bass: 'sawtooth', root: 40, boss: true, scale: 'minor',
    A: { chords: [[0, 3, 7], [-2, 2, 5], [-4, 0, 3], [-5, -1, 2]], melody: [12, null, null, 15, 14, null, 12, null, 10, null, 12, null, 7, null, null, null] },
    B: { chords: [[-4, 0, 3], [-2, 2, 5], [0, 3, 7], [-5, -1, 2]], melody: [15, null, 17, 19, null, 17, 15, null, 14, null, 15, null, 12, null, 10, null] } },
};
// region id (data/regions.js) -> its song; used for night, dungeon and boss variants
export const REGION_SONG = { reach: 'forest', ashen: 'ashen', coast: 'coast', kingdom: 'kingdom', fens: 'fens', highlands: 'highlands', glasswood: 'glasswood', underdeep: 'underdeep', vale: 'vale', sunscorch: 'sunscorch' };
// the songs that keep the hand-written night tune (the Reach and the village)
export const HAND_NIGHT = new Set(['village', 'forest']);
// boss kind -> hand-written theme
export const BOSS_THEME = { sovereign: 'sovereign', hollowking: 'hollowking' };

// The scale a song is in: its own `scale`, else judged from the first chord (minor third / major third), else from the
// melody (power-chord songs). null (the crypt) means the melody moves in parallel.
export function scaleOf(def) {
  if (def.scale === null) return null;
  if (def.scale) return SCALES[def.scale];
  const c = def.A.chords[0];
  if (c.includes(3)) return SCALES.minor;
  if (c.includes(4)) return SCALES.major;
  return def.A.melody.some((m) => m != null && mod(m, 12) === 3) ? SCALES.minor : SCALES.major;
}
// semitone -> scale degree (nearest, ties go down) and back
export function degOf(semi, scale) {
  const o = Math.floor(semi / 12), r = semi - o * 12;
  let best = 0, bd = 99;
  for (let i = 0; i < 7; i++) { const d = Math.abs(scale[i] - r); if (d < bd) { bd = d; best = i; } }
  if (r - scale[6] > 12 - r) return (o + 1) * 7;      // closer to the next octave's tonic
  return o * 7 + best;
}
export const semiOf = (deg, scale) => { const o = Math.floor(deg / 7); return o * 12 + scale[deg - o * 7]; };
// One melody note (semitones above the root) over a chord.
export function melodyNote(m, chord, scale, lift = 0) {
  if (!scale) return m + chord[0];
  let n = semiOf(degOf(m, scale) + lift + degOf(chord[0], scale), scale);
  // a borrowed chord (a tone outside the key): a note a semitone from one of its tones becomes that tone
  const pcs = chord.map((c) => mod(c, 12));
  if (!pcs.includes(mod(n, 12))) {
    for (const p of pcs) {
      const d = mod(p - mod(n, 12), 12);
      if (d === 1) { n += 1; break; }
      if (d === 11) { n -= 1; break; }
    }
  }
  return n;
}
// AU18: a bridge (C) for songs that have only A and B: the A melody lifted two scale degrees, its halves swapped,
// over a new walk through the song's own chords.
function bridgeOf(def) {
  const A = def.A, B = def.B || def.A;
  const mel = [...A.melody.slice(8), ...A.melody.slice(0, 8)];
  return { chords: [A.chords[2], B.chords[1], A.chords[1], A.chords[3]], melody: mel, lift: 2 };
}

// ---- variants (AU17 night, AU19 dungeon and boss)
const softer = { square: 'triangle', sawtooth: 'triangle', triangle: 'sine', sine: 'sine' };
export function variant(kind, name) {
  const base = SONGS[name]; if (!base) return null;
  const T = TUNE.audio;
  if (kind === 'night') {
    // slower, an octave down, every other melody note, no arpeggio, half the bass
    const thin = (sec) => { let k = 0; return { ...sec, melody: sec.melody.map((m) => (m == null ? null : (k++ % 2 ? null : m))) }; };
    return { ...base, bpm: Math.round(base.bpm * T.night.tempo), lead: softer[base.lead] || 'triangle', arp: 'none', oct: -12, bassEvery: 8, leadVol: 0.045, A: thin(base.A), B: base.B && thin(base.B), C: undefined, form: ['A', 'B'], night: true };
  }
  if (kind === 'dungeon') {
    // the region song in a minor key with a sawtooth lead, slower, no arpeggio, a low pedal under it
    const sc = SCALES.minor, triad = (ch) => { const d = degOf(ch[0], sc); if (ch[1] - ch[0] === 7) { const r = semiOf(d, sc); return [r, r + 7, r + 12]; } return [semiOf(d, sc), semiOf(d + 2, sc), semiOf(d + 4, sc)]; };
    const fix = (sec) => sec && { ...sec, chords: sec.chords.map(triad) };
    return { ...base, scale: 'minor', bpm: Math.round(base.bpm * T.dungeon.tempo), lead: 'sawtooth', leadVol: 0.04, arp: 'none', pedal: true, A: fix(base.A), B: fix(base.B), C: undefined, form: ['A', 'B', 'A', 'C'], dungeon: true };
  }
  if (kind === 'boss') {
    // the region's key, chords and melody notes on the boss rhythm and tempo
    const R = SONGS.boss;
    const fit = (sec, rh) => { if (!sec) return undefined; const notes = sec.melody.filter((m) => m != null); let k = 0; return { ...sec, melody: rh.melody.map((m) => (m == null ? null : notes[k++ % notes.length])) }; };
    return { ...base, bpm: T.bossBpm, lead: base.lead === 'sawtooth' ? 'sawtooth' : 'square', bass: 'sawtooth', arp: 'odd', boss: true, A: fit(base.A, R.A), B: fit(base.B || base.A, R.B), C: undefined, form: ['A', 'B'] };
  }
  return null;
}

// A song's key: 'night:fens', 'dungeon:sunscorch', 'boss:coast' or a plain name.
export function songDef(key) {
  if (!key) return null;
  const i = key.indexOf(':');
  return i < 0 ? SONGS[key] || null : variant(key.slice(0, i), key.slice(i + 1));
}

// Ready-to-play form: every note worked out once. notes[sec][bar][step] = MIDI or null; pass[...] = a passing note for
// an empty step between two close notes (used by the per-pass variation).
const cache = new Map();
export function compile(key) {
  if (cache.has(key)) return cache.get(key);
  const def = songDef(key); if (!def) return null;
  const scale = scaleOf(def), root = def.root + (def.oct || 0);
  const secs = { A: def.A, B: def.B };
  const form = def.form || (def.boss || !def.B ? (def.B ? ['A', 'B'] : ['A']) : ['A', 'B', 'A', 'C']);
  if (form.includes('C')) secs.C = def.C || bridgeOf(def);
  const out = { key, bpm: def.bpm, lead: def.lead, bass: def.bass, root: def.root, form, scale, boss: !!def.boss, night: !!def.night, dungeon: !!def.dungeon,
    arp: def.arp || 'odd', bassEvery: def.bassEvery || 4, leadVol: def.leadVol || TUNE.audio.drums.lead, pedal: !!def.pedal, sections: {} };
  for (const [name, sec] of Object.entries(secs)) {
    if (!sec) continue;
    const bars = [], pass = [];
    for (let b = 0; b < 4; b++) {
      const ch = sec.chords[b % sec.chords.length];
      const row = sec.melody.map((m) => (m == null ? null : root + melodyNote(m, ch, scale, sec.lift || 0)));
      const pr = row.map((n, s) => {
        if (n != null || !scale || s === 0 || s === 15) return null;
        const a = row[s - 1], c = row[s + 1];
        if (a == null || c == null || Math.abs(a - c) < 3 || Math.abs(a - c) > 5) return null;
        return root + semiOf(Math.round((degOf(a - root, scale) + degOf(c - root, scale)) / 2), scale);
      });
      bars.push(row); pass.push(pr);
    }
    out.sections[name] = { chords: [0, 1, 2, 3].map((b) => sec.chords[b % sec.chords.length]), notes: bars, pass };
  }
  cache.set(key, out);
  return out;
}
// seconds in one full loop of a compiled song
export const loopSecs = (c) => c.form.length * 64 * (60 / c.bpm / 2);
