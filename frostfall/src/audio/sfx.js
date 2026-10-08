// Chiptune sound effects (and a tiny music box) synthesised live with Web Audio.
// No audio files. The AudioContext is created lazily on the first sound, which
// always follows a key press, so browsers' autoplay rules are satisfied.
import { settings, saveSettings } from '../systems/settings.js';
export { settings, saveSettings };

let ctx = null, master = null, sfxBus = null, musicBus = null, ambBus = null;
const musicLevel = () => (settings.music ? 0.5 * (settings.musicVol ?? 1) : 0);
function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = settings.volume; master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = settings.sfxVol ?? 1; sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = musicLevel(); musicBus.connect(master);
    ambBus = ctx.createGain(); ambBus.gain.value = settings.ambVol ?? 1; ambBus.connect(master);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
export function setVolume(v) { settings.volume = Math.max(0, Math.min(1, v)); if (master) master.gain.value = settings.volume; saveSettings(); }
export function setMusic(on) { settings.music = on; if (musicBus) musicBus.gain.value = musicLevel(); saveSettings(); }
// Channel mixes: 'music' | 'sfx' | 'amb', each 0..1.
export function setChannel(ch, v) {
  v = Math.max(0, Math.min(1, v));
  if (ch === 'music') { settings.musicVol = v; if (musicBus) musicBus.gain.value = musicLevel(); }
  else if (ch === 'sfx') { settings.sfxVol = v; if (sfxBus) sfxBus.gain.value = v; }
  else { settings.ambVol = v; if (ambBus) ambBus.gain.value = v; }
  saveSettings();
}

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
function noise(dur, vol = 0.2, delay = 0, lp0 = 4000, lp1 = 400, dest = null) {
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
  s.connect(f); f.connect(g); g.connect(dest || sfxBus);
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
  block: () => { tone('square', 180, 120, 0.07, 0.14); noise(0.08, 0.2, 0, 4000, 900); },
  parry: () => { tone('square', 900, 1500, 0.08, 0.12); tone('square', 1500, 2200, 0.12, 0.1, 0.06); noise(0.1, 0.15, 0, 7000, 2000); },
  guardbreak: () => { tone('sawtooth', 200, 50, 0.3, 0.2); noise(0.25, 0.25, 0, 3000, 200); },
  shock: () => { noise(0.18, 0.22, 0, 9000, 1500); tone('sawtooth', 1400, 200, 0.16, 0.1); tone('square', 2200, 600, 0.1, 0.06, 0.04); },
  heal: () => { [523, 659, 784].forEach((f, i) => tone('triangle', f, f * 1.01, 0.18, 0.1, i * 0.07)); },
  ward: () => { tone('triangle', 330, 660, 0.3, 0.12); tone('triangle', 495, 990, 0.3, 0.08, 0.05); },
  bark_wolf: () => { tone('sawtooth', 240, 120, 0.22, 0.12); noise(0.2, 0.1, 0, 1200, 300); },
  bark_undead: () => { tone('sawtooth', 110, 70, 0.4, 0.14); tone('square', 118, 62, 0.35, 0.06); },
  bark_human: () => { tone('square', 340, 280, 0.09, 0.09); tone('square', 420, 300, 0.12, 0.08, 0.09); },
  howl: () => { tone('triangle', 300, 620, 0.5, 0.1); tone('triangle', 620, 380, 0.5, 0.1, 0.5); },
  execute: () => { noise(0.25, 0.3, 0, 6000, 200); tone('sawtooth', 500, 60, 0.3, 0.2); tone('square', 120, 40, 0.3, 0.2); },
  smash: () => { noise(0.18, 0.22, 0, 5000, 600); tone('square', 260, 90, 0.1, 0.08); },
  step: () => { noise(0.045, 0.05, 0, 2600, 700); },
  step_snow: () => { noise(0.06, 0.05, 0, 1700, 500); },
  step_ice: () => { noise(0.03, 0.04, 0, 6000, 2500); tone('sine', 2100, 1500, 0.04, 0.025); },
  step_stone: () => { noise(0.03, 0.06, 0, 3800, 900); tone('square', 170, 110, 0.04, 0.03); },
  step_wood: () => { tone('triangle', 190, 120, 0.06, 0.07); noise(0.03, 0.03, 0, 2400, 600); },
  crackle: () => { noise(0.02 + Math.random() * 0.03, 0.05, 0, 7000, 2000, ambBus); if (Math.random() < 0.4) noise(0.015, 0.04, 0.05, 8000, 3000, ambBus); },
  spike: () => { noise(0.08, 0.2, 0, 7000, 2500); tone('square', 900, 300, 0.07, 0.09); tone('square', 120, 60, 0.1, 0.12, 0.02); },
  thunder: () => { noise(1.4, 0.3, 0, 900, 90, ambBus); tone('sawtooth', 70, 38, 1.1, 0.12, 0.05, ambBus); },
  werehowl: () => { tone('sawtooth', 220, 640, 0.7, 0.08); tone('triangle', 640, 300, 0.9, 0.07, 0.7); },
  howl_far: () => { tone('triangle', 260, 520, 0.8, 0.025, 0, ambBus); tone('triangle', 520, 330, 0.9, 0.025, 0.8, ambBus); },
  caw: () => { tone('sawtooth', 520, 330, 0.12, 0.03, 0, ambBus); tone('sawtooth', 480, 300, 0.12, 0.025, 0.14, ambBus); noise(0.08, 0.02, 0, 3000, 900, ambBus); },
  creak: () => { tone('sawtooth', 90, 130, 0.35, 0.03, 0, ambBus); tone('sawtooth', 130, 80, 0.3, 0.025, 0.3, ambBus); },
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
// Chiptune loops, one per zone, two sections (A, B) each. A drum + arpeggio layer
// fades in during combat, and a short brass stinger marks the first alert.
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
const SONGS = {
  village: { bpm: 84, lead: 'square', bass: 'triangle', root: 57,
    A: { chords: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -2, 2]], melody: [12, null, 15, 14, 12, null, 10, null, 8, null, 12, 10, 8, null, 7, null] },
    B: { chords: [[-4, 0, 3], [-2, 2, 5], [0, 3, 7], [-5, -2, 2]], melody: [15, null, 14, 12, null, 10, 12, null, 14, null, 12, 10, null, 8, 10, null] } },
  interior: { bpm: 90, lead: 'square', bass: 'triangle', root: 55,
    A: { chords: [[0, 4, 7], [-3, 0, 4], [-5, -1, 2], [-7, -3, 0]], melody: [12, null, 14, 16, 14, null, 12, null, 11, null, 12, 14, 12, null, 9, null] } },
  night: { bpm: 58, lead: 'triangle', bass: 'triangle', root: 45,
    A: { chords: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -2, 2]], melody: [null, null, 12, null, null, null, 10, null, null, null, 8, null, null, null, null, null] },
    B: { chords: [[-4, 0, 3], [0, 3, 7], [-5, -2, 2], [-2, 2, 5]], melody: [null, 15, null, null, null, 12, null, null, null, 10, null, null, 8, null, null, null] } },
  forest: { bpm: 72, lead: 'triangle', bass: 'square', root: 50,
    A: { chords: [[0, 3, 7], [-2, 2, 5], [-4, 0, 3], [-5, -2, 2]], melody: [null, 7, null, 10, 12, null, 10, null, null, 5, null, 8, 10, null, 8, null] },
    B: { chords: [[-2, 2, 5], [0, 3, 7], [-5, -2, 2], [-4, 0, 3]], melody: [null, 10, null, 12, 14, null, 12, null, null, 8, null, 10, 12, null, 7, null] } },
  pass: { bpm: 76, lead: 'triangle', bass: 'square', root: 52,
    A: { chords: [[0, 3, 7], [-2, 2, 5], [-4, 0, 3], [-7, -4, 0]], melody: [null, 12, null, 10, 7, null, 10, null, 12, null, 15, 14, 12, null, 10, null] },
    B: { chords: [[-4, 0, 3], [0, 3, 7], [-2, 2, 5], [-7, -4, 0]], melody: [12, null, null, 10, null, 7, null, null, 15, null, 14, null, 12, null, 10, null] } },
  crypt: { bpm: 66, lead: 'sawtooth', bass: 'triangle', root: 43,
    A: { chords: [[0, 3, 6], [-1, 2, 5], [0, 3, 6], [-3, 0, 3]], melody: [12, null, null, 11, null, null, 9, null, 12, null, null, 14, null, 11, null, null] },
    B: { chords: [[-3, 0, 3], [0, 3, 6], [-1, 2, 5], [0, 3, 6]], melody: [null, null, 11, null, null, 9, null, null, 12, null, null, 11, null, null, 9, null] } },
  boss: { bpm: 132, lead: 'square', bass: 'sawtooth', root: 43,
    A: { chords: [[0, 3, 7], [0, 3, 7], [-2, 1, 5], [-1, 2, 6]], melody: [12, 12, null, 15, 12, null, 10, 12, 13, 13, null, 16, 13, null, 11, 13] },
    B: { chords: [[-2, 1, 5], [-1, 2, 6], [0, 3, 7], [0, 3, 7]], melody: [13, 13, null, 16, 13, null, 11, 13, 12, 12, null, 15, 12, null, 10, 12] } },
};
SONGS.cavern = { bpm: 60, lead: 'triangle', bass: 'triangle', root: 40,
  A: { chords: [[0, 7, 12], [-2, 5, 10], [-4, 3, 8], [-5, 2, 7]], melody: [null, null, 19, null, null, 17, null, null, null, 15, null, null, 14, null, null, null] },
  B: { chords: [[-4, 3, 8], [-5, 2, 7], [0, 7, 12], [-2, 5, 10]], melody: [null, 14, null, null, 15, null, null, null, 17, null, null, 15, null, null, 12, null] } };
SONGS.throne = { bpm: 104, lead: 'sawtooth', bass: 'sawtooth', root: 41,
  A: { chords: [[0, 3, 7], [-4, 0, 3], [-2, 1, 5], [-5, -2, 2]], melody: [12, null, 12, 15, null, 17, 15, null, 14, null, 14, 12, null, 10, 12, null] },
  B: { chords: [[-2, 1, 5], [-5, -2, 2], [0, 3, 7], [-1, 2, 6]], melody: [17, null, 15, null, 17, 19, null, 17, 15, null, 14, null, 12, 14, 15, null] } };
SONGS.dragon = { bpm: 140, lead: 'square', bass: 'sawtooth', root: 38,
  A: { chords: [[0, 3, 7], [0, 3, 7], [1, 5, 8], [-2, 2, 5]], melody: [12, 12, 15, null, 12, 10, 12, null, 13, 13, 17, null, 13, 12, 10, null] },
  B: { chords: [[1, 5, 8], [-2, 2, 5], [0, 3, 7], [-1, 2, 6]], melody: [17, null, 15, 13, 17, null, 20, null, 19, 17, null, 15, 13, null, 12, null] } };
SONGS.ashen = { bpm: 96, lead: 'sawtooth', bass: 'triangle', root: 38,
  A: { chords: [[0, 3, 7], [-2, 2, 5], [-4, 0, 3], [-5, -1, 2]], melody: [12, null, 15, null, 14, 12, null, 10, 12, null, 15, 17, null, 15, 14, null] },
  B: { chords: [[-4, 0, 3], [-2, 2, 5], [0, 3, 7], [1, 5, 8]], melody: [15, null, 17, 15, null, 14, null, 12, 10, null, 12, 14, null, 12, 10, null] } };
SONGS.coast = { bpm: 72, lead: 'triangle', bass: 'sine', root: 36,
  A: { chords: [[0, 7, 12], [-3, 4, 9], [-5, 2, 7], [-7, 0, 5]], melody: [null, 19, null, 17, null, null, 16, null, 14, null, null, 16, null, 19, null, null] },
  B: { chords: [[-5, 2, 7], [-7, 0, 5], [0, 7, 12], [-3, 4, 9]], melody: [null, 16, null, null, 14, null, 12, null, null, 14, 16, null, 19, null, null, null] } };
SONGS.kingdom = { bpm: 84, lead: 'triangle', bass: 'triangle', root: 40,
  A: { chords: [[0, 3, 7], [-4, 0, 3], [-2, 1, 5], [-7, -3, 0]], melody: [15, null, null, 17, null, 19, null, null, 17, null, 15, null, 14, null, null, null] },
  B: { chords: [[-2, 1, 5], [-7, -3, 0], [0, 3, 7], [-5, -2, 2]], melody: [19, null, 17, null, null, 15, null, 14, null, 15, null, 17, 19, null, null, null] } };
SONGS.fens = { bpm: 62, lead: 'sine', bass: 'triangle', root: 33,
  A: { chords: [[0, 3, 7], [-2, 1, 5], [-4, 0, 3], [-5, -2, 2]], melody: [null, 15, null, null, 14, null, 12, null, null, 10, null, 12, null, null, 14, null] },
  B: { chords: [[-4, 0, 3], [-5, -2, 2], [0, 3, 7], [-2, 1, 5]], melody: [12, null, null, 14, null, 15, null, null, 17, null, 15, null, 14, null, null, null] } };
SONGS.highlands = { bpm: 100, lead: 'triangle', bass: 'sawtooth', root: 40,
  A: { chords: [[0, 7, 12], [-2, 5, 10], [-5, 2, 7], [-3, 4, 9]], melody: [19, null, 17, null, 16, null, 14, null, 16, null, 17, 19, null, 21, null, null] },
  B: { chords: [[-5, 2, 7], [-3, 4, 9], [0, 7, 12], [-2, 5, 10]], melody: [21, null, 19, null, 17, null, 16, 17, 19, null, null, 16, null, 14, null, null] } };
// hub songs: Emberhold rings with the forge, Reedwick sways, Skarn Hold stamps its feet
SONGS.emberhold = { bpm: 92, lead: 'square', bass: 'sawtooth', root: 45,
  A: { chords: [[0, 3, 7], [-2, 2, 5], [-4, 0, 3], [-7, -4, 0]], melody: [12, null, 12, 15, null, 17, null, 15, 14, null, 12, null, 10, null, 12, null] },
  B: { chords: [[-4, 0, 3], [-7, -4, 0], [0, 3, 7], [-2, 2, 5]], melody: [15, null, 17, null, 19, null, 17, 15, 14, null, null, 12, 10, null, 12, null] } };
SONGS.reedwick = { bpm: 66, lead: 'sine', bass: 'triangle', root: 52,
  A: { chords: [[0, 4, 7], [-3, 0, 4], [-5, -1, 2], [-7, -3, 0]], melody: [null, 16, null, 14, null, 12, null, null, 11, null, 12, null, 14, null, null, null] },
  B: { chords: [[-5, -1, 2], [-7, -3, 0], [0, 4, 7], [-3, 0, 4]], melody: [14, null, null, 16, null, 14, null, 12, null, null, 11, null, 12, null, null, null] } };
SONGS.skarnhold = { bpm: 108, lead: 'triangle', bass: 'square', root: 50,
  A: { chords: [[0, 7, 12], [-2, 5, 10], [-5, 2, 7], [-3, 4, 9]], melody: [19, null, 19, 17, null, 16, null, 14, 16, null, 17, null, 19, null, null, null] },
  B: { chords: [[-5, 2, 7], [-3, 4, 9], [0, 7, 12], [-2, 5, 10]], melody: [16, null, 17, null, 19, 21, null, 19, 17, null, 16, null, 14, null, null, null] } };
let song = null, songName = null, nextT = 0, step = 0, timer = null, intensity = 0, bossPhase = 1;
function schedule() {
  const a = ac(); if (!a || !song) return;
  const stepDur = 60 / (song.bpm * (1 + 0.07 * (bossPhase - 1))) / 2;
  while (nextT < a.currentTime + 0.6) {
    const secB = song.B && Math.floor(step / 64) % 2 === 1;
    const sec = secB ? song.B : song.A;
    const bar = Math.floor((step % 64) / 16) % sec.chords.length;
    const s = step % 16;
    const ch = sec.chords[bar];
    const t = Math.max(0, nextT - a.currentTime);
    if (s % 4 === 0) tone(song.bass, NOTE(song.root + ch[0] - 12), NOTE(song.root + ch[0] - 12), stepDur * 3.6, 0.09, t, musicBus);
    if (s % 2 === 1 && songName !== 'village' && songName !== 'night') tone('square', NOTE(song.root + ch[(s >> 1) % 3] + 12), NOTE(song.root + ch[(s >> 1) % 3] + 12), stepDur * 0.7, 0.025, t, musicBus);
    if (s % 2 === 0 && (songName === 'village' || songName === 'interior')) tone('square', NOTE(song.root + ch[(s >> 1) % 3] + 12), NOTE(song.root + ch[(s >> 1) % 3] + 12), stepDur * 0.6, 0.02, t, musicBus);
    const m = sec.melody[s];
    if (m != null) tone(song.lead, NOTE(song.root + ch[0] + m), NOTE(song.root + ch[0] + m), stepDur * 1.6, 0.05, t, musicBus);
    if (intensity > 0) {                                  // combat layer: drums + a driving arpeggio
      if (s % 4 === 0) tone('triangle', 150, 45, 0.12, 0.13, t, musicBus);
      if (s % 8 === 4) noise(0.1, 0.08, t, 5000, 800, musicBus);
      if (s % 2 === 1) noise(0.03, 0.025, t, 9000, 4000, musicBus);
      if (songName !== 'boss') tone('square', NOTE(song.root + ch[(s >> 1) % 3] + 24), NOTE(song.root + ch[(s >> 1) % 3] + 24), stepDur * 0.5, 0.022, t, musicBus);
    }
    nextT += stepDur; step++;
  }
}
export const music = {
  play(name) {
    if (name === songName) return;
    songName = name; song = SONGS[name] || null; step = 0; bossPhase = 1;
    const a = ac(); if (!a) return;
    nextT = a.currentTime + 0.1;
    if (!timer) timer = setInterval(schedule, 150);
    schedule();
  },
  current() { return songName; },
  setIntensity(v) { intensity = v || bossPhase >= 2 ? 1 : 0; },
  // Boss phases speed the music up 7% each and keep the drum layer on from phase two.
  setPhase(p) { bossPhase = Math.max(1, p | 0); if (bossPhase >= 2) intensity = 1; },
  phase() { return bossPhase; },
  intensity() { return intensity; },
  // A short brass call when a fight begins.
  stinger() {
    if (!settings.music) return;
    [[392, 0], [392, 0.12], [311, 0.24], [262, 0.4]].forEach(([f, d]) => { tone('sawtooth', f, f * 0.99, 0.28, 0.07, d, musicBus); tone('square', f / 2, f / 2, 0.28, 0.05, d, musicBus); });
    noise(0.3, 0.08, 0, 3000, 300, musicBus);
  },
  stop() { songName = null; song = null; intensity = 0; ambience.stop(); },
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
      src.connect(f); f.connect(g); g.connect(ambBus);
      src.start(); lfo.start(); lfo2.start();
      ambNodes = [src, lfo, lfo2];
    } else if (kind === 'crypt') {
      for (const fr of [55, 55.6, 82.4]) {
        const o = a.createOscillator(), g = a.createGain();
        o.type = 'sine'; o.frequency.value = fr; g.gain.value = fr > 80 ? 0.012 : 0.028;
        o.connect(g); g.connect(ambBus); o.start(); ambNodes.push(o);
      }
      const drip = () => { tone('sine', 1900, 1300, 0.12, 0.035, 0, ambBus); tone('sine', 950, 700, 0.2, 0.02, 0.07, ambBus); };
      ambTimer = setInterval(() => { if (Math.random() < 0.6) drip(); }, 3200);
    }
  },
  stop() {
    ambNodes.forEach((n) => { try { n.stop(); } catch { /* ignore */ } });
    ambNodes = []; ambName = null;
    if (ambTimer) { clearInterval(ambTimer); ambTimer = null; }
  },
};
