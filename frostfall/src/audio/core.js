// The audio graph and the two synth voices (tone, noise) everything else is built from. No audio files.
// The AudioContext is created lazily on the first sound, which always follows a key press, so autoplay rules are met.
//
//   effects  -> sfxBus ------------------------------\
//   ambience -> ambBus -> ambDuck --------------------> master -> pauseFilter -> limiter -> speakers
//   music    -> (track gains) -> musicBus -> musicDuck -> musicFilter -/
//
// sfxBus / musicBus / ambBus carry the Settings channel levels and nothing else; ducking (dialogue), the low-health
// muffle and the pause muffle have their own nodes so they never overwrite a player's mix.
import { settings, saveSettings } from '../systems/settings.js';
import { TUNE } from '../data/tuning.js';

const A = () => TUNE.audio;
export const nodes = { ctx: null, master: null, sfxBus: null, musicBus: null, ambBus: null, musicDuck: null, ambDuck: null, musicFilter: null, pauseFilter: null, limiter: null };
export const musicLevel = () => (settings.music ? 0.5 * (settings.musicVol ?? 1) : 0);
let hidden = false;
export const isHidden = () => hidden;

export function ac() {
  let ctx = nodes.ctx;
  if (!ctx) {
    const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return null;
    ctx = nodes.ctx = new AC();
    const L = A().limiter;
    // AU08: a limiter on the master bus, so a boss death (roar + die + boom + shake) cannot clip
    const lim = nodes.limiter = ctx.createDynamicsCompressor();
    lim.threshold.value = L.threshold; lim.knee.value = L.knee; lim.ratio.value = L.ratio; lim.attack.value = L.attack; lim.release.value = L.release;
    lim.connect(ctx.destination);
    const pf = nodes.pauseFilter = ctx.createBiquadFilter(); pf.type = 'lowpass'; pf.frequency.value = 20000; pf.Q.value = 0.5; pf.connect(lim);
    const master = nodes.master = ctx.createGain(); master.gain.value = settings.volume; master.connect(pf);
    nodes.sfxBus = ctx.createGain(); nodes.sfxBus.gain.value = settings.sfxVol ?? 1; nodes.sfxBus.connect(master);
    const mf = nodes.musicFilter = ctx.createBiquadFilter(); mf.type = 'lowpass'; mf.frequency.value = 20000; mf.Q.value = 0.6; mf.connect(master);
    nodes.musicDuck = ctx.createGain(); nodes.musicDuck.connect(mf);
    nodes.musicBus = ctx.createGain(); nodes.musicBus.gain.value = musicLevel(); nodes.musicBus.connect(nodes.musicDuck);
    nodes.ambDuck = ctx.createGain(); nodes.ambDuck.connect(master);
    nodes.ambBus = ctx.createGain(); nodes.ambBus.gain.value = settings.ambVol ?? 1; nodes.ambBus.connect(nodes.ambDuck);
  }
  if ((ctx.state === 'suspended' || ctx.state === 'interrupted') && !hidden) ctx.resume();
  return ctx;
}
// The tab is hidden (or the phone switched apps): stop the audio clock so nothing plays and no battery is spent.
export function setHidden(h) {
  hidden = h;
  try { if (nodes.ctx) { if (h) nodes.ctx.suspend(); else nodes.ctx.resume(); } } catch { /* ignore */ }
}
// Called from user gestures. iOS only starts audio from inside a gesture, and only after something has played: a
// one-sample silent buffer does that. 'interrupted' (a phone call, Siri) is treated like 'suspended'.
let unlocked = false;
export function unlock() {
  try {
    const ctx = nodes.ctx;
    if (!ctx) ac();
    else if (ctx.state === 'suspended' || ctx.state === 'interrupted') { if (!hidden) ctx.resume(); }
    if (nodes.ctx && !unlocked) { unlocked = true; const b = nodes.ctx.createBuffer(1, 1, 22050), src = nodes.ctx.createBufferSource(); src.buffer = b; src.connect(nodes.ctx.destination); src.start(0); }
  } catch { /* ignore */ }
}
// One shared buffer of white noise; each noisy sound plays a random slice of it instead of making its own.
let noiseBuf = null, brownBuf = null;
export function noiseBuffer(a) {
  if (noiseBuf && noiseBuf.sampleRate === a.sampleRate) return noiseBuf;
  const len = a.sampleRate * 2;
  noiseBuf = a.createBuffer(1, len, a.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}
// A soft, rumbly ("brown") noise loop for wind and surf beds, made once and shared by every bed.
export function brownBuffer(a) {
  if (brownBuf && brownBuf.sampleRate === a.sampleRate) return brownBuf;
  const len = a.sampleRate * 3;
  brownBuf = a.createBuffer(1, len, a.sampleRate);
  const d = brownBuf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) { last = last * 0.97 + (Math.random() * 2 - 1) * 0.03; d[i] = last * 6; }
  return brownBuf;
}
export function setVolume(v) { settings.volume = Math.max(0, Math.min(1, v)); if (nodes.master) nodes.master.gain.value = settings.volume; saveSettings(); }
export function setMusic(on) { settings.music = on; if (nodes.musicBus) nodes.musicBus.gain.value = musicLevel(); saveSettings(); }
// Channel mixes: 'music' | 'sfx' | 'amb', each 0..1.
export function setChannel(ch, v) {
  v = Math.max(0, Math.min(1, v));
  if (ch === 'music') { settings.musicVol = v; if (nodes.musicBus) nodes.musicBus.gain.value = musicLevel(); }
  else if (ch === 'sfx') { settings.sfxVol = v; if (nodes.sfxBus) nodes.sfxBus.gain.value = v; }
  else { settings.ambVol = v; if (nodes.ambBus) nodes.ambBus.gain.value = v; }
  saveSettings();
}
// Smoothly move an AudioParam to v over `secs` (never a click).
export function ramp(param, v, secs) {
  const a = nodes.ctx; if (!a || !param) return;
  const t = a.currentTime;
  try { param.cancelScheduledValues(t); param.setValueAtTime(param.value, t); param.linearRampToValueAtTime(v, t + Math.max(0.01, secs)); } catch { param.value = v; }
}

// ---- per-play shaping of effect voices (set by sfx.play around one recipe call; music and ambience pass their own dest)
// pitch: frequency multiplier (AU05), vol: gain multiplier, dest: a positional pan/gain node (AU21) or null = sfxBus.
export const shape = { pitch: 1, vol: 1, dest: null };
// AU08: live effect voices, so a crowd fight can be capped instead of piling up
export const voices = { n: 0 };
const ended = () => { voices.n--; };

// type, start freq, end freq, duration, volume, delay, destination
export function tone(type, f0, f1, dur, vol = 0.15, delay = 0, dest = null) {
  const a = ac(); if (!a) return;
  const fx = !dest;
  if (fx) { f0 *= shape.pitch; f1 *= shape.pitch; vol *= shape.vol; dest = shape.dest || nodes.sfxBus; }
  const t = a.currentTime + delay;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g); g.connect(dest);
  if (fx) { voices.n++; o.onended = ended; }
  o.start(t); o.stop(t + dur + 0.02);
}
// a short burst of filtered noise: duration, volume, delay, lowpass start, lowpass end, destination [, filter type, Q]
export function noise(dur, vol = 0.2, delay = 0, lp0 = 4000, lp1 = 400, dest = null, type = 'lowpass', q = 1) {
  const a = ac(); if (!a) return;
  const fx = !dest;
  if (fx) { lp0 *= shape.pitch; lp1 *= shape.pitch; vol *= shape.vol; dest = shape.dest || nodes.sfxBus; }
  const t = a.currentTime + delay;
  const s = a.createBufferSource(); s.buffer = noiseBuffer(a);
  const f = a.createBiquadFilter(); f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(lp0, t); f.frequency.exponentialRampToValueAtTime(Math.max(60, lp1), t + dur);
  const g = a.createGain();
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  s.connect(f); f.connect(g); g.connect(dest);
  if (fx) { voices.n++; s.onended = ended; }
  s.start(t, Math.random() * Math.max(0, 2 - dur - 0.05)); s.stop(t + dur + 0.02);
}
