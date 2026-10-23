// The music player: one chiptune track at a time, crossfaded, with a combat drum layer, per-pass variation, rests,
// and short stings (fight, ambush, boss intro, victory, death, respawn, region motif).
//
// music.play(name) only records what the game wants. A 150 ms scheduler works out which song that means here
// (night -> this region's night version, the region dungeons' 'throne' -> this region's dungeon version, 'boss' -> this
// region's boss version or a final boss's own theme) and crossfades to it on the next bar.
import { TUNE } from '../data/tuning.js';
import { settings } from '../systems/settings.js';
import { nodes, ac, tone, noise, musicLevel, isHidden, ramp } from './core.js';
import { compile, NOTE, SONGS, REGION_SONG, HAND_NIGHT, BOSS_THEME } from './songs.js';
import { place, where } from './state.js';
import { ambience } from './ambience.js';

const T = () => TUNE.audio;
const rnd = (a, b) => a + Math.random() * (b - a);
const st = { req: null, holdUntil: 0, dead: false, phase: 1, fightWant: false, lastFight: -1e9 };
let track = null;           // the song playing now
const fading = [];          // songs still playing out their last notes while they fade
let timer = null;
const now = () => (nodes.ctx ? nodes.ctx.currentTime : 0);
const wallNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

// Which song a request means in this place (AU17, AU19).
export function resolve(name) {
  if (!name || name === 'victory') return null;
  const rs = where.region && REGION_SONG[where.region];
  if (name === 'night') {
    const z = place.music;
    return z && SONGS[z] && !HAND_NIGHT.has(z) && !SONGS[z].boss && z !== 'crypt' && z !== 'cavern' && z !== 'interior' ? 'night:' + z : 'night';
  }
  if (name === 'boss') {
    if (BOSS_THEME[where.bossKind]) return BOSS_THEME[where.bossKind];
    return rs && where.region !== 'reach' ? 'boss:' + rs : 'boss';
  }
  if (name === 'throne' && place.cave && !place.arena && place.bossMusic !== 'throne' && rs && where.region !== 'reach') return 'dungeon:' + rs;
  return name;
}

function newTrack(key, at) {
  const a = nodes.ctx, c = compile(key);
  if (!c) return null;
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(1, at + T().fadeIn);
  g.connect(nodes.musicBus);
  const cg = a.createGain(); cg.gain.value = 0; cg.connect(g);
  const L = T().silence.loops;
  return { key, c, gain: g, cg, step: 0, nextT: at, endT: Infinity, loops: 0, v: {}, layer: 0, layerWant: 0, layerOffAt: 0, restAfter: Math.round(rnd(L[0], L[1])), silentUntil: 0, sec: -1 };
}
function fadeOut(tr, from, secs) {
  if (!tr) return;
  const g = tr.gain.gain, t0 = Math.max(now(), from);
  try { g.cancelScheduledValues(now()); g.setValueAtTime(g.value, now()); g.setValueAtTime(g.value, t0); g.linearRampToValueAtTime(0.0001, t0 + secs); } catch { /* ignore */ }
  tr.endT = t0 + secs;
  fading.push(tr);
}
// the time of the track's next bar line if it is close, else its next step (where a new song may come in)
function nextEntry(tr) {
  if (!tr) return now() + 0.1;
  const sd = stepDur(tr), left = (16 - (tr.step % 16)) % 16;
  return left * sd < 2.5 ? tr.nextT + left * sd : tr.nextT;
}
const stepDur = (tr) => 60 / (tr.c.bpm * (1 + 0.07 * (tr.c.boss ? st.phase - 1 : 0))) / 2;

// AU03 / AU14: how loud the drum layer should be: boss songs get a kick in phase one and the full kit from phase two;
// other songs get the full kit while there is a fight (held TUNE.audio.combatHold seconds after the last one).
function layerTarget(tr) {
  if (st.phase >= 2) return 1;
  if (tr.c.boss) return 0.5;
  return st.fightWant || wallNow() - st.lastFight < T().combatHold * 1000 ? 1 : 0;
}

function playStep(tr, t) {
  const c = tr.c, D = T().drums, sd = stepDur(tr), dest = tr.gain;
  const si = Math.floor(tr.step / 64) % c.form.length, sec = c.sections[c.form[si]];
  const bar = Math.floor((tr.step % 64) / 16), s = tr.step % 16, ch = sec.chords[bar];
  const fresh = tr.step % 64 === 0;
  if (fresh && tr.sec !== tr.step) {      // AU18: a new pass of a section: maybe vary it
    tr.sec = tr.step;
    const first = tr.loops === 0 && si === 0;
    const top = Math.max(...sec.notes.flat().filter((n) => n != null), 0);
    tr.v = first ? {} : { oct: top < 80 && Math.random() < 0.25, drop: Math.random() < 0.3, pass: Math.random() < 0.4, noArp: Math.random() < 0.25 };
  }
  // the drum layer comes in (or leaves) on a bar line, with a ramp instead of a switch
  const want = layerTarget(tr);
  if (s === 0 && want !== tr.layer) {
    const was = tr.layer;
    tr.layer = want;
    try { const g = tr.cg.gain; g.cancelScheduledValues(t); g.setValueAtTime(was ? (was === 1 ? 1 : 0.7) : 0.0001, t); g.linearRampToValueAtTime(want ? (want === 1 ? 1 : 0.7) : 0.0001, t + T().combatFade); } catch { /* ignore */ }
    if (!want) tr.layerOffAt = t + T().combatFade + 0.1;
  }
  const v = tr.v;
  if (s % c.bassEvery === 0) tone(c.bass, NOTE(c.root + ch[0] - 12), NOTE(c.root + ch[0] - 12), sd * c.bassEvery * 0.9, 0.09, t - now(), dest);
  if (c.pedal && s === 0 && bar % 2 === 0) tone('triangle', NOTE(c.root - 24), NOTE(c.root - 24), sd * 30, 0.05, t - now(), dest);
  if (!v.noArp) {
    if (s % 2 === 1 && (c.arp === 'odd' || c.arp === 'both')) { const n = NOTE(c.root + ch[(s >> 1) % 3] + 12); tone('square', n, n, sd * 0.7, 0.025, t - now(), dest); }
    if (s % 2 === 0 && (c.arp === 'even' || c.arp === 'both')) { const n = NOTE(c.root + ch[(s >> 1) % 3] + 12); tone('square', n, n, sd * 0.6, 0.02, t - now(), dest); }
  }
  let n = sec.notes[bar][s];
  if (n == null && v.pass) n = sec.pass[bar][s];
  if (n != null && v.drop && s % 4 !== 0 && Math.random() < 0.25) n = null;
  if (n != null) { if (v.oct) n += 12; const f = NOTE(n); tone(c.lead, f, f, sd * 1.6, tr.layer === 1 ? Math.max(c.leadVol, D.leadFight) : c.leadVol, t - now(), dest); }
  if (tr.layer > 0 || t < tr.layerOffAt) {           // the combat layer: kick, snare, hats, a driving arpeggio
    const cg = tr.cg;
    if (s % 4 === 0) tone('triangle', 150, 45, 0.12, D.kick, t - now(), cg);
    if (tr.layer !== 0.5) {
      if (s % 8 === 4) noise(0.1, D.snare, t - now(), 5000, 800, cg);
      if (s % 2 === 1) noise(0.03, D.hat, t - now(), 9000, 4000, cg);
      if (tr.key !== 'boss') { const f = NOTE(c.root + ch[(s >> 1) % 3] + 24); tone('square', f, f, sd * 0.5, D.arp, t - now(), cg); }
    }
  }
}

function schedule() {
  if (!nodes.ctx || isHidden()) return;
  const a = ac(); if (!a) return;
  const t0 = a.currentTime;
  for (let i = fading.length - 1; i >= 0; i--) {
    const f = fading[i];
    if (t0 > f.endT + 0.5) { try { f.gain.disconnect(); } catch { /* ignore */ } fading.splice(i, 1); continue; }
    while (f.nextT < Math.min(t0 + 0.6, f.endT)) { if (musicLevel() > 0 && !(f.silentUntil > f.nextT)) playStep(f, f.nextT); f.nextT += stepDur(f); f.step++; }
  }
  // switch songs when what is wanted changed (never during a sting or while dead)
  const key = st.dead || t0 < st.holdUntil ? (track ? track.key : null) : resolve(st.req);
  if ((track ? track.key : null) !== key) {
    const at = Math.max(nextEntry(track), t0 + 0.05);
    if (track) fadeOut(track, at - T().fadeOut * 0.5, T().fadeOut);
    track = key ? newTrack(key, at) : null;
  }
  if (!track) return;
  if (musicLevel() <= 0) { track.nextT = t0 + 0.1; return; }      // music off: schedule nothing
  // AU18: a rest after a few loops (calm songs only); a fight ends it at once
  if (track.silentUntil) {
    const fight = layerTarget(track) > 0;
    if (t0 < track.silentUntil && !fight) { track.nextT = t0 + 0.1; return; }
    track.silentUntil = 0; track.step = 0; track.loops = 0; track.sec = -1; track.nextT = t0 + 0.1;
    try { const g = track.gain.gain; g.cancelScheduledValues(t0); g.setValueAtTime(0.0001, t0); g.linearRampToValueAtTime(1, t0 + 2); } catch { /* ignore */ }
  }
  while (track.nextT < t0 + 0.6) {
    playStep(track, track.nextT);
    track.nextT += stepDur(track); track.step++;
    if (track.step % (64 * track.c.form.length) === 0) {
      track.loops++;
      if (track.loops >= track.restAfter && !track.c.boss && layerTarget(track) === 0) {
        const S = T().silence;
        track.silentUntil = track.nextT + rnd(S.secs[0], S.secs[1]);
        try { const g = track.gain.gain; g.cancelScheduledValues(t0); g.setValueAtTime(g.value, t0); g.linearRampToValueAtTime(0.0001, track.nextT + 0.5); } catch { /* ignore */ }
        const L = S.loops; track.restAfter = Math.round(rnd(L[0], L[1]));
        break;
      }
    }
  }
}
function ensureTimer() { if (!timer) timer = setInterval(schedule, 150); }

// ---- stings (music bus, so the Music setting turns them off too)
const SR = (d, t) => tone(...d, t, nodes.musicBus);
function canSting() { return settings.music && musicLevel() > 0 && ac() && !isHidden(); }
// duck the playing song for `secs` (to `to` of its level) and bring it back
function duck(secs, to = 0.25) {
  if (!track) return;
  const g = track.gain.gain, t0 = now();
  try { g.cancelScheduledValues(t0); g.setValueAtTime(g.value, t0); g.linearRampToValueAtTime(to, t0 + 0.2); g.setValueAtTime(to, t0 + secs); g.linearRampToValueAtTime(1, t0 + secs + 0.8); } catch { /* ignore */ }
}
const STINGS = {
  // the first alert of a fight: a short brass call
  fight: () => { [[392, 0], [392, 0.12], [311, 0.24], [262, 0.4]].forEach(([f, d]) => { SR(['sawtooth', f, f * 0.99, 0.28, 0.07], d); SR(['square', f / 2, f / 2, 0.28, 0.05], d); }); noise(0.3, 0.08, 0, 3000, 300, nodes.musicBus); },
  // AU24: an ambush is faster and more urgent; a raid is a horn call; a blood moon is low and slow
  ambush: () => { [[466, 0], [466, 0.08], [466, 0.16], [370, 0.26], [466, 0.36]].forEach(([f, d]) => { SR(['sawtooth', f, f, 0.12, 0.06], d); SR(['square', f / 2, f / 2, 0.12, 0.05], d); }); noise(0.25, 0.08, 0.36, 4000, 300, nodes.musicBus); },
  raid: () => { [[196, 0, 0.5], [262, 0.5, 0.5], [196, 1.0, 0.9]].forEach(([f, d, l]) => { SR(['sawtooth', f, f * 0.98, l, 0.07], d); SR(['triangle', f * 1.5, f * 1.5, l, 0.03], d); }); },
  blood: () => { [[110, 0, 1.2], [104, 1.0, 1.2], [73, 2.0, 2.4]].forEach(([f, d, l]) => { SR(['sawtooth', f, f, l, 0.08], d); SR(['triangle', f * 2, f * 2, l, 0.03], d); }); duck(3.5, 0.3); },
  // AU19: a brass hit when a boss's title card shows, and a fanfare when it falls
  boss_intro: () => { [98, 147, 196, 233].forEach((f, i) => SR(['sawtooth', f, f * 0.99, 0.9, 0.05 - i * 0.006], 0)); noise(0.6, 0.12, 0, 2500, 150, nodes.musicBus); SR(['square', 49, 40, 0.8, 0.08], 0); },
  victory: () => {
    [[392, 0, 0.16], [392, 0.16, 0.16], [392, 0.32, 0.16], [523, 0.5, 0.5], [466, 1.0, 0.3], [523, 1.3, 0.3], [659, 1.6, 0.9]].forEach(([f, d, l]) => { SR(['square', f, f, l, 0.06], d); SR(['triangle', f / 2, f / 2, l, 0.05], d); });
    [523, 659, 784].forEach((f) => SR(['triangle', f, f, 1.6, 0.035], 1.6));
  },
  // AU24: death: a falling minor phrase; respawn: a soft rising one
  death: () => { [[440, 0], [415, 0.35], [349, 0.7], [330, 1.05], [220, 1.5]].forEach(([f, d], i) => { SR(['triangle', f, f * 0.99, i === 4 ? 1.8 : 0.45, 0.08], d); SR(['sine', f / 2, f / 2, i === 4 ? 1.8 : 0.45, 0.05], d); }); },
  respawn: () => { [[262, 0], [330, 0.25], [392, 0.5], [523, 0.75]].forEach(([f, d]) => SR(['sine', f, f, 0.8, 0.05], d)); },
};
// the opening notes of a region's song, played when you cross into it (AU24)
function regionMotif(region) {
  const c = compile(REGION_SONG[region]); if (!c) return 0;
  const notes = c.sections.A.notes[0].filter((n) => n != null).slice(0, 4);
  const gap = 60 / c.bpm * 0.75;
  notes.forEach((n, i) => SR([c.lead, NOTE(n), NOTE(n), gap * (i === 3 ? 3 : 1.4), 0.06], i * gap));
  SR([c.bass, NOTE(c.root - 12), NOTE(c.root - 12), gap * 5, 0.07], 0);
  return gap * 4 + 0.6;
}

let bloodNodes = null;
// a blood moon: a low tritone pedal under the night music until dawn
function bloodDrone(on) {
  if (on) {
    if (bloodNodes) return;
    const a = ac(); if (!a) return;
    const g = a.createGain(); g.gain.value = 0; g.connect(nodes.musicBus);
    const os = [55, 77.8].map((f) => { const o = a.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.connect(g); o.start(); return o; });
    ramp(g.gain, 0.05, 3);
    bloodNodes = { g, os };
  } else {
    if (!bloodNodes) return;
    const b = bloodNodes; bloodNodes = null;
    ramp(b.g.gain, 0, 2);
    setTimeout(() => { b.os.forEach((o) => { try { o.stop(); } catch { /* ignore */ } }); try { b.g.disconnect(); } catch { /* ignore */ } }, 2500);
  }
}

export const music = {
  play(name) {
    if (name === 'victory') { this.stinger('victory'); return; }
    // a map loaded at night: go straight to the night music instead of a second of the day song first
    if (place.fresh) { place.fresh = false; if (where.night && place.outdoors && name === place.music) name = 'night'; }
    if (name === st.req) return;
    st.req = name; st.phase = 1;
    where.night = name === 'night';
    if (!where.night && where.blood) { where.blood = false; bloodDrone(false); }
    const a = ac(); if (!a) return;
    ensureTimer();
    setTimeout(schedule, 0);      // after the rest of this frame (the map's weather event names the region)
  },
  current() { return st.req; },
  playing() { return track ? track.key : null; },
  setIntensity(v) { if (v) st.lastFight = wallNow(); st.fightWant = !!v; },
  // Boss phases speed the music up 7% each and bring in the full drum kit from phase two.
  setPhase(p) { st.phase = Math.max(1, p | 0); },
  phase() { return st.phase; },
  intensity() { return track ? (layerTarget(track) > 0 ? 1 : 0) : (st.phase >= 2 || st.fightWant ? 1 : 0); },
  // A short call: 'fight' (default), 'ambush', 'raid', 'blood', 'boss_intro', 'victory', 'death', 'respawn'.
  stinger(kind = 'fight') {
    if (!canSting()) return;
    const k = STINGS[kind] ? kind : 'fight';
    if (k === 'victory') {
      // AU04: no more bounce through the crypt song: fade out, fanfare, then the map's own song comes back
      if (track) fadeOut(track, now(), 0.8);
      track = null; st.req = null; st.phase = 1; st.holdUntil = now() + 3.6;
    } else if (k === 'death') {
      if (track) fadeOut(track, now(), 1.5);
      track = null; st.dead = true; st.holdUntil = now() + 3;
    } else if (k === 'blood') { where.blood = true; bloodDrone(true); }
    try { STINGS[k](); } catch { /* best effort */ }
  },
  // Crossing into a new region: its motif, then its song.
  regionMotif(region) {
    if (!canSting() || !REGION_SONG[region]) return;
    if (track) fadeOut(track, now(), 0.6);
    track = null;
    st.holdUntil = now() + regionMotif(region);
  },
  respawned() { if (!st.dead) return; st.dead = false; st.holdUntil = 0; if (canSting()) STINGS.respawn(); },
  duck,
  // GameScene, on every map load: what this map is (for night / dungeon / boss variants and the ambience beds).
  setPlace(map, def = {}) {
    Object.assign(place, { map, music: def.music || null, bossMusic: def.bossMusic || null, interior: !!def.interior, cave: !!(def.cave || def.crypt), arena: !!(def.arena || def.quick), outdoors: !!(def.snow || def.outdoors), ambience: def.ambience || null, fresh: true });
    where.bossKind = null;
  },
  clearPlace() { Object.assign(place, { map: null, music: null, bossMusic: null, interior: false, cave: false, arena: false, outdoors: false, ambience: null }); where.region = null; where.bossKind = null; st.dead = false; st.holdUntil = 0; },
  stop() {
    if (track) fadeOut(track, now(), 0.6);
    track = null; st.req = null; st.phase = 1; st.fightWant = false; st.lastFight = -1e9;
    if (where.blood) { where.blood = false; bloodDrone(false); }
    ambience.stop();
  },
  // for tests and the F-key debug overlay
  debug() { return { req: st.req, key: track ? track.key : null, layer: track ? track.layer : 0, want: track ? layerTarget(track) : 0, silent: !!(track && track.silentUntil), hold: Math.max(0, st.holdUntil - now()), dead: st.dead, fading: fading.length, phase: st.phase, step: track ? track.step : 0, loops: track ? track.loops : 0 }; },
  _schedule: schedule,
  _track: () => track,
};
