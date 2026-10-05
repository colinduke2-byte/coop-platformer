// Chiptune sound effects (and a tiny music box) synthesised live with Web Audio.
// No audio files. The AudioContext is created lazily on the first sound, which
// always follows a key press, so browsers' autoplay rules are satisfied.
import { settings, saveSettings } from '../systems/settings.js';
export { settings, saveSettings };

let ctx = null, master = null, sfxBus = null, musicBus = null;
function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = settings.volume; master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 1; sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = settings.music ? 0.5 : 0; musicBus.connect(master);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
export function setVolume(v) { settings.volume = Math.max(0, Math.min(1, v)); if (master) master.gain.value = settings.volume; saveSettings(); }
export function setMusic(on) { settings.music = on; if (musicBus) musicBus.gain.value = on ? 0.5 : 0; saveSettings(); }

// type, start freq, end freq, duration, volume, delay
function tone(type, f0, f1, dur, vol = 0.15, delay = 0, dest = null) {
  const a = ac(); if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g); g.connect(dest || sfxBus);
  o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol = 0.2, delay = 0, lp0 = 4000, lp1 = 400) {
  const a = ac(); if (!a) return;
  const t = a.currentTime + delay;
  const len = Math.max(1, Math.floor(a.sampleRate * dur));
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const s = a.createBufferSource(); s.buffer = buf;
  const f = a.createBiquadFilter(); f.type = 'lowpass';
  f.frequency.setValueAtTime(lp0, t); f.frequency.exponentialRampToValueAtTime(Math.max(60, lp1), t + dur);
  const g = a.createGain();
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  s.connect(f); f.connect(g); g.connect(sfxBus);
  s.start(t); s.stop(t + dur + 0.02);
}

const SOUNDS = {
  sword: () => { noise(0.12, 0.18, 0, 6000, 900); tone('square', 520, 220, 0.09, 0.07); },
  hit: () => { noise(0.1, 0.25, 0, 3000, 300); tone('square', 180, 60, 0.12, 0.16); },
  crit: () => { noise(0.14, 0.3, 0, 5000, 300); tone('square', 320, 80, 0.16, 0.18); tone('square', 640, 900, 0.08, 0.1, 0.05); },
  hurt: () => { tone('sawtooth', 240, 70, 0.22, 0.2); noise(0.12, 0.2, 0, 2000, 200); },
  roll: () => { noise(0.2, 0.12, 0, 1500, 3500); },
  nostamina: () => { tone('square', 120, 90, 0.08, 0.1); },
  draw: () => { tone('triangle', 200, 420, 0.28, 0.06); },
  shoot: () => { tone('square', 700, 200, 0.1, 0.1); noise(0.07, 0.12, 0, 5000, 1500); },
  arrowhit: () => { tone('square', 300, 150, 0.06, 0.1); noise(0.05, 0.1); },
  fire: () => { noise(0.35, 0.2, 0, 1500, 300); tone('sawtooth', 160, 400, 0.25, 0.1); },
  boom: () => { noise(0.4, 0.3, 0, 1800, 120); tone('square', 120, 40, 0.3, 0.16); },
  frost: () => { tone('triangle', 1400, 900, 0.12, 0.1); tone('triangle', 1800, 1200, 0.14, 0.08, 0.06); tone('square', 2400, 1800, 0.08, 0.04, 0.1); },
  shout: () => { tone('sawtooth', 110, 55, 0.6, 0.22); tone('square', 220, 70, 0.55, 0.12); noise(0.5, 0.2, 0, 1200, 120); },
  alert: () => { tone('square', 660, 880, 0.08, 0.06); },
  telegraph: () => { tone('square', 300, 300, 0.05, 0.06); tone('square', 380, 380, 0.05, 0.06, 0.07); },
  pickup: () => { tone('square', 880, 880, 0.05, 0.08); tone('square', 1320, 1320, 0.07, 0.08, 0.05); },
  coin: () => { tone('square', 1200, 1200, 0.04, 0.07); tone('square', 1700, 1700, 0.08, 0.07, 0.04); },
  potion: () => { tone('triangle', 300, 700, 0.15, 0.12); tone('triangle', 500, 900, 0.15, 0.1, 0.12); },
  levelup: () => { [523, 659, 784, 1047].forEach((f, i) => tone('square', f, f, 0.12, 0.09, i * 0.09)); tone('triangle', 1047, 1047, 0.4, 0.08, 0.36); },
  blip: () => { tone('square', 520 + Math.random() * 120, 500, 0.03, 0.035); },
  select: () => { tone('square', 660, 660, 0.04, 0.07); },
  move: () => { tone('square', 440, 440, 0.025, 0.05); },
  back: () => { tone('square', 330, 220, 0.07, 0.07); },
  equip: () => { tone('square', 400, 400, 0.05, 0.08); tone('square', 600, 600, 0.07, 0.08, 0.05); },
  die: () => { tone('sawtooth', 300, 40, 0.8, 0.2); noise(0.7, 0.2, 0, 1500, 100); },
  kill: () => { tone('square', 200, 40, 0.18, 0.12); noise(0.14, 0.18, 0, 2500, 200); },
  roar: () => { tone('sawtooth', 90, 45, 0.9, 0.25); tone('square', 140, 60, 0.8, 0.14); noise(0.8, 0.25, 0, 900, 100); },
  chest: () => { tone('square', 200, 260, 0.1, 0.1); [660, 880, 1100].forEach((f, i) => tone('square', f, f, 0.09, 0.08, 0.1 + i * 0.07)); },
  quest: () => { [392, 523, 659, 784].forEach((f, i) => tone('triangle', f, f, 0.2, 0.12, i * 0.12)); },
  door: () => { tone('square', 150, 90, 0.2, 0.1); noise(0.2, 0.1, 0, 800, 200); },
  save: () => { tone('square', 784, 784, 0.07, 0.08); tone('square', 1047, 1047, 0.1, 0.08, 0.07); },
  ending: () => { [262, 330, 392, 523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.5, 0.1, i * 0.18)); },
  smash: () => { noise(0.18, 0.22, 0, 5000, 600); tone('square', 260, 90, 0.1, 0.08); },
  step: () => { noise(0.045, 0.05, 0, 2600, 700); },
  nova: () => { tone('sawtooth', 600, 100, 0.5, 0.14); noise(0.4, 0.2, 0, 6000, 400); },
};

export function unlock() { try { if (ctx && ctx.state === 'suspended') ctx.resume(); else if (!ctx) ac(); } catch { /* ignore */ } }

export const sfx = {
  play(name) {
    if (settings.volume <= 0) return;
    try { SOUNDS[name]?.(); } catch { /* audio is best-effort */ }
  },
};

// ------------------------------------------------------------------- music
// A slow 2-voice chiptune loop per zone, scheduled a bar ahead.
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
const SONGS = {
  village: { bpm: 84, lead: 'square', bass: 'triangle', root: 57,
    chords: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -2, 2]],
    melody: [12, null, 15, 14, 12, null, 10, null, 8, null, 12, 10, 8, null, 7, null] },
  forest: { bpm: 72, lead: 'triangle', bass: 'square', root: 50,
    chords: [[0, 3, 7], [-2, 2, 5], [-4, 0, 3], [-5, -2, 2]],
    melody: [null, 7, null, 10, 12, null, 10, null, null, 5, null, 8, 10, null, 8, null] },
  crypt: { bpm: 66, lead: 'sawtooth', bass: 'triangle', root: 43,
    chords: [[0, 3, 6], [-1, 2, 5], [0, 3, 6], [-3, 0, 3]],
    melody: [12, null, null, 11, null, null, 9, null, 12, null, null, 14, null, 11, null, null] },
  boss: { bpm: 132, lead: 'square', bass: 'sawtooth', root: 43,
    chords: [[0, 3, 7], [0, 3, 7], [-2, 1, 5], [-1, 2, 6]],
    melody: [12, 12, null, 15, 12, null, 10, 12, 13, 13, null, 16, 13, null, 11, 13] },
};
let song = null, songName = null, nextT = 0, step = 0, timer = null;
function schedule() {
  const a = ac(); if (!a || !song) return;
  const stepDur = 60 / song.bpm / 2;
  while (nextT < a.currentTime + 0.6) {
    const bar = Math.floor(step / 16) % song.chords.length;
    const s = step % 16;
    const ch = song.chords[bar];
    const t = Math.max(0, nextT - a.currentTime);
    if (s % 4 === 0) tone(song.bass, NOTE(song.root + ch[0] - 12), NOTE(song.root + ch[0] - 12), stepDur * 3.6, 0.09, t, musicBus);
    if (s % 2 === 1 && songName !== 'village') tone('square', NOTE(song.root + ch[(s >> 1) % 3] + 12), NOTE(song.root + ch[(s >> 1) % 3] + 12), stepDur * 0.7, 0.025, t, musicBus);
    if (s % 2 === 0 && songName === 'village') tone('square', NOTE(song.root + ch[(s >> 1) % 3] + 12), NOTE(song.root + ch[(s >> 1) % 3] + 12), stepDur * 0.6, 0.02, t, musicBus);
    const m = song.melody[s];
    if (m != null) tone(song.lead, NOTE(song.root + ch[0] + m), NOTE(song.root + ch[0] + m), stepDur * 1.6, 0.05, t, musicBus);
    nextT += stepDur; step++;
  }
}
export const music = {
  play(name) {
    if (name === songName) return;
    songName = name; song = SONGS[name] || null; step = 0;
    const a = ac(); if (!a) return;
    nextT = a.currentTime + 0.1;
    if (!timer) timer = setInterval(schedule, 150);
    schedule();
  },
  stop() { songName = null; song = null; ambience.stop(); },
};

// ---------------------------------------------------------------- ambience
// Wind for the snowy zones, a cold drone with distant drips for the crypt.
let ambNodes = [], ambTimer = null, ambName = null;
export const ambience = {
  play(kind) {
    if (kind === ambName) return;
    this.stop();
    const a = ac(); if (!a || !kind) return;
    ambName = kind;
    if (kind === 'wind') {
      const len = a.sampleRate * 3;
      const buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) { last = last * 0.97 + (Math.random() * 2 - 1) * 0.03; d[i] = last * 6; }
      const src = a.createBufferSource(); src.buffer = buf; src.loop = true;
      const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 520; f.Q.value = 0.7;
      const g = a.createGain(); g.gain.value = 0.05;
      const lfo = a.createOscillator(); lfo.frequency.value = 0.13;
      const lg = a.createGain(); lg.gain.value = 0.035;
      lfo.connect(lg); lg.connect(g.gain);
      const lfo2 = a.createOscillator(); lfo2.frequency.value = 0.05;
      const lg2 = a.createGain(); lg2.gain.value = 180; lfo2.connect(lg2); lg2.connect(f.frequency);
      src.connect(f); f.connect(g); g.connect(musicBus);
      src.start(); lfo.start(); lfo2.start();
      ambNodes = [src, lfo, lfo2];
    } else if (kind === 'crypt') {
      for (const fr of [55, 55.6, 82.4]) {
        const o = a.createOscillator(), g = a.createGain();
        o.type = 'sine'; o.frequency.value = fr; g.gain.value = fr > 80 ? 0.012 : 0.028;
        o.connect(g); g.connect(musicBus); o.start(); ambNodes.push(o);
      }
      const drip = () => { tone('sine', 1900, 1300, 0.12, 0.035, 0, musicBus); tone('sine', 950, 700, 0.2, 0.02, 0.07, musicBus); };
      ambTimer = setInterval(() => { if (Math.random() < 0.6) drip(); }, 3200);
    }
  },
  stop() {
    ambNodes.forEach((n) => { try { n.stop(); } catch { /* ignore */ } });
    ambNodes = []; ambName = null;
    if (ambTimer) { clearInterval(ambTimer); ambTimer = null; }
  },
};
