// Audio by analysis (Node only, no browser): you cannot listen in a test, so check what can be measured.
//   - every melody note is in its song's key (or a tone of the chord under it): AU15
//   - loops are long enough (AU18), every region has night, dungeon and boss versions (AU17, AU19)
//   - the music and every effect stay under a gain budget (no clipping), using a fake AudioContext that records voices
//   - every sound name used in src/ exists
import fs from 'node:fs';
import path from 'node:path';
import { check, failCount } from './harness.mjs';

const root = new URL('..', import.meta.url).pathname;
const S = await import(root + 'src/audio/songs.js');
const { TUNE } = await import(root + 'src/data/tuning.js');
const mod = (n, m) => ((n % m) + m) % m;

// ---- AU15: in key
const variants = Object.values(S.REGION_SONG).flatMap((r) => ['night:' + r, 'dungeon:' + r, 'boss:' + r]);
const keys = [...Object.keys(S.SONGS), ...variants];
const bad = [], strict = {};
for (const k of keys) {
  const c = S.compile(k);
  if (!c) { bad.push(k + ' does not compile'); continue; }
  if (!c.scale) continue;            // the crypt is deliberately diminished
  let tot = 0, outKey = 0;
  for (const sec of Object.values(c.sections)) sec.notes.forEach((row, b) => row.forEach((n) => {
    if (n == null) return;
    tot++;
    const pc = mod(n - c.root, 12), chord = sec.chords[b].map((x) => mod(x, 12));
    if (!c.scale.includes(pc)) { outKey++; if (!chord.includes(pc)) bad.push(`${k}: note ${n} outside key and chord`); }
  }));
  strict[k] = Math.round((100 * outKey) / Math.max(1, tot));
}
check('every melody note is in its key or on the chord under it (all songs and variants)', bad.length === 0, bad.slice(0, 5).join('; '));
check('village and forest melodies are fully in key (were 23% and 20% out)', strict.village === 0 && strict.forest === 0, JSON.stringify({ village: strict.village, forest: strict.forest }));
const deg = S.melodyNote(15, [-4, 0, 3], S.SCALES.minor);
check('a melody note moves by scale degrees with the chord (A minor, F chord: C stays C, not C#)', mod(deg, 12) === 0, String(deg));

// ---- AU18: loop lengths and form
const calm = ['village', 'interior', 'forest', 'pass', 'coast', 'kingdom', 'fens', 'highlands', 'ashen', 'emberhold', 'reedwick', 'skarnhold', 'glasswood', 'vale', 'sunscorch', 'underdeep', 'saltmarket', 'night', 'cavern'];
const short = calm.map((k) => [k, S.loopSecs(S.compile(k))]).filter(([, s]) => s < 70);
check('every calm song loops for at least 70 s (interior was 21 s)', short.length === 0, JSON.stringify(short));
check('interior has three sections and loops for over 80 s', S.compile('interior').form.includes('C') && S.loopSecs(S.compile('interior')) > 80, String(S.loopSecs(S.compile('interior'))));
const firstProg = (k) => JSON.stringify(S.SONGS[k].A.chords);
const pairs = [['village', 'night'], ['interior', 'reedwick'], ['forest', 'sunscorch'], ['pass', 'emberhold'], ['highlands', 'skarnhold'], ['glasswood', 'saltmarket']];
check('the six song pairs no longer share their A progression', pairs.every(([a, b]) => firstProg(a) !== firstProg(b)), JSON.stringify(pairs.filter(([a, b]) => firstProg(a) === firstProg(b))));

// ---- AU17 / AU19: variants
const regions = Object.entries(S.REGION_SONG);
const nightOk = regions.every(([, s]) => { const v = S.songDef('night:' + s), b = S.SONGS[s]; return v && v.bpm === Math.round(b.bpm * TUNE.audio.night.tempo) && v.arp === 'none'; });
check('every region has a night version (slower, no arpeggio)', nightOk);
check('every region has a dungeon and a boss version', regions.every(([, s]) => S.compile('dungeon:' + s)?.dungeon && S.compile('boss:' + s)?.boss));
check('the two final bosses have their own themes', S.SONGS.sovereign?.boss && S.SONGS.hollowking?.boss && S.BOSS_THEME.sovereign === 'sovereign');

// ---- gain budget: music at its busiest (every voice at once) on the music bus
const D = TUNE.audio.drums;
const musicPeak = 0.09 + 0.025 + 0.02 + Math.max(D.lead, D.leadFight) + D.kick + D.snare + D.hat + D.arp + 0.05;
check('the music at its busiest stays under 0.5 before the music level (no clipping)', musicPeak < 0.5, musicPeak.toFixed(3));
check('combat drums no longer drown the melody (kick <= 1.5x lead)', D.kick <= 1.5 * D.leadFight && D.kick < 0.13, JSON.stringify(D));

// ---- every effect under a gain budget: run each recipe against a fake AudioContext that records the voices
const voices = [];
const param = (v = 0) => ({ value: v, setValueAtTime(x) { this.value = x; return this; }, linearRampToValueAtTime() { return this; }, exponentialRampToValueAtTime() { return this; }, cancelScheduledValues() { return this; } });
class Node0 { connect() {} disconnect() {} }
class FakeCtx {
  constructor() { this.currentTime = 0; this.sampleRate = 8000; this.state = 'running'; this.destination = new Node0(); }
  resume() {} suspend() {}
  createGain() { const n = new Node0(); n.gain = param(1); return n; }
  createOscillator() { const n = new Node0(); n.frequency = param(440); n.start = (t) => { n.t0 = t; }; n.stop = (t) => { n.t1 = t; voices.push(n); }; return n; }
  createBiquadFilter() { const n = new Node0(); n.frequency = param(); n.Q = param(); return n; }
  createBufferSource() { const n = new Node0(); n.start = (t) => { n.t0 = t; }; n.stop = (t) => { n.t1 = t; voices.push(n); }; return n; }
  createBuffer(c, len, sr) { const d = new Float32Array(len); return { sampleRate: sr, getChannelData: () => d }; }
  createDynamicsCompressor() { const n = new Node0(); for (const k of ['threshold', 'knee', 'ratio', 'attack', 'release']) n[k] = param(); return n; }
  createStereoPanner() { const n = new Node0(); n.pan = param(); return n; }
}
globalThis.window = { AudioContext: FakeCtx };
const core = await import(root + 'src/audio/core.js');
const { SOUNDS } = await import(root + 'src/audio/sounds.js');
// record each voice's gain: patch connect on gains created by tone()/noise() to remember the start value
const origGain = FakeCtx.prototype.createGain;
FakeCtx.prototype.createGain = function () { const g = origGain.call(this); const sv = g.gain.setValueAtTime.bind(g.gain); g.gain.setValueAtTime = (x, t) => { if (g.first == null) g.first = x; return sv(x, t); }; return g; };
core.ac();             // the buses exist before any recipe runs, so each voice below owns exactly one gain
const peaks = {};
for (const [name, fn] of Object.entries(SOUNDS)) {
  const gains = [];
  const og = FakeCtx.prototype.createGain;
  FakeCtx.prototype.createGain = function () { const g = og.call(this); gains.push(g); return g; };
  voices.length = 0;
  try { fn(); } catch (e) { peaks[name] = 'threw ' + e.message; FakeCtx.prototype.createGain = og; continue; }
  FakeCtx.prototype.createGain = og;
  // upper bound of the loudest moment: the sum of every voice gain that sounds at that moment (decays ignored)
  const vs = voices.map((v, i) => ({ t0: v.t0, t1: v.t1, g: gains[i]?.first ?? 0 }));
  let peak = 0;
  for (const a of vs) peak = Math.max(peak, vs.filter((b) => b.t0 <= a.t0 && b.t1 > a.t0).reduce((s, b) => s + b.g, 0));
  peaks[name] = peak;
}
const threw = Object.entries(peaks).filter(([, p]) => typeof p === 'string');
check('every sound recipe runs', threw.length === 0, JSON.stringify(threw));
console.log('  loudest:', Object.entries(peaks).filter(([, p]) => typeof p === 'number').sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n, p]) => n + ' ' + p.toFixed(2)).join(', '));
const loud = Object.entries(peaks).filter(([, p]) => p > 0.8);
check('no single sound sums above 0.8 (x master 0.6 = under 0.5; the limiter catches stacks)', loud.length === 0, JSON.stringify(loud));
const L = TUNE.audio.limiter;
check('the master limiter is set (threshold -10 dB, ratio >= 8)', core.ac() && core.nodes.limiter && L.threshold <= -6 && L.ratio >= 8);

// ---- every name used exists
const files = [];
const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (p.endsWith('.js')) files.push(p); } };
walk(root + 'src');
const used = new Set();
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  for (const m of s.matchAll(/sfx\.play\(([^;]*?)\)(?:;|\s|$)/g)) for (const x of m[1].matchAll(/'([a-z][a-z_0-9]*)'(?!\s*\+)/g)) used.add(x[1]);
}
// arguments of the name helpers and conditions, not names
for (const w of ['fire', 'werewolf', 'wolf', 'bark', 'alert', 'kill']) if (!SOUNDS[w]) used.delete(w);
const { sfx } = await import(root + 'src/audio/play.js');
const { STATUS } = await import(root + 'src/systems/status.js');
const gen = [
  ...Object.keys(STATUS).map((k) => 'status_' + k), 'tick_burn', 'tick_poison', 'tick_bleed', 'char_level', 'heartbeat', 'breath',
  ...['dagger', 'sword', 'axe', 'mace', 'hammer', 'great', 'halberd', 'spear', 'staff', 'bow', undefined].flatMap((st) => [sfx.swing({ style: st }), sfx.swing({ style: st }, true)]),
  ...['wolf', 'undead', 'human', undefined].flatMap((b) => ['bark', 'alert', 'kill'].map((w) => sfx.voice({ bark: b }, w))),
  ...['golem', 'spider', 'wisp', 'slime', 'shroom', 'crab'].flatMap((t) => ['bark', 'alert', 'kill'].map((w) => sfx.voice({ tex: 'spr_' + t }, w))),
  ...['ELDER BJORN', 'LITTLE PIP', 'THE HOLLOW KING', 'MIRRA', 'SIGRID', ''].map((n) => sfx.talk(n)),
  sfx.hitOn({ cfg: { armored: true } }), sfx.hitOn({ cfg: { tex: 'spr_golem' } }), sfx.hitOn({ cfg: { tex: 'spr_draugr', bark: 'undead' } }), sfx.hitOn({ cfg: { bark: 'wolf' } }),
  'step_ice', 'step_wood', 'step_stone', 'step_snow', 'step_hoof', 'door',
];
const missing = [...used, ...gen].filter((n) => !SOUNDS[n]);
check(`every sound name used in src/ and every generated name exists (${used.size} literal, ${gen.length} generated)`, missing.length === 0, JSON.stringify([...new Set(missing)]));
console.log(failCount() ? 'MUSIC FAILED' : 'MUSIC PASSED');
process.exit(failCount() ? 1 : 0);
