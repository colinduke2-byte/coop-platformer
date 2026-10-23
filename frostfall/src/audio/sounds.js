// Every effect recipe, by name. sfx.play(name) looks names up here; a missing name is a bug (test/stage96_audio.mjs).
// Recipes are built from tone() and noise() (core.js). Sounds that belong to the world's air (birds, frogs, thunder)
// go to the ambience bus; everything else goes to the effects bus and gets the per-play pitch/volume variation.
import { tone, noise, nodes } from './core.js';

const amb = () => nodes.ambBus;
const arp = (type, fs, gap, dur, vol, d0 = 0) => fs.forEach((f, i) => tone(type, f, f, dur, vol, d0 + i * gap));

export const SOUNDS = {
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
  // AU07: the cues you must read in a crowd are louder and have a timbre nothing else uses
  alert: () => { tone('triangle', 520, 470, 0.07, 0.11); tone('triangle', 560, 820, 0.11, 0.11, 0.08); },              // "huh?"
  telegraph: () => { tone('triangle', 260, 760, 0.22, 0.12); noise(0.22, 0.05, 0, 900, 4000, null, 'bandpass', 2); },  // a rising whoosh
  telegraph_boss: () => { tone('triangle', 110, 360, 0.42, 0.14); tone('sawtooth', 55, 90, 0.42, 0.06); noise(0.4, 0.06, 0, 400, 2400, null, 'bandpass', 2); },
  heavy_windup: () => { tone('triangle', 180, 300, 0.2, 0.06); noise(0.18, 0.04, 0, 600, 1600); },   // your own heavy blow drawing back
  pickup: () => { tone('square', 880, 880, 0.05, 0.08); tone('square', 1320, 1320, 0.07, 0.08, 0.05); },
  coin: () => { tone('square', 1200, 1200, 0.04, 0.07); tone('square', 1700, 1700, 0.08, 0.07, 0.04); },
  potion: () => { tone('triangle', 300, 700, 0.15, 0.12); tone('triangle', 500, 900, 0.15, 0.1, 0.12); },
  levelup: () => { arp('square', [523, 659, 784, 1047], 0.09, 0.12, 0.09); tone('triangle', 1047, 1047, 0.4, 0.08, 0.36); },
  blip: () => { tone('square', 520 + Math.random() * 120, 500, 0.03, 0.035); },
  select: () => { tone('square', 660, 660, 0.04, 0.07); },
  move: () => { tone('square', 440, 440, 0.025, 0.05); },
  back: () => { tone('square', 330, 220, 0.07, 0.07); },
  equip: () => { tone('square', 400, 400, 0.05, 0.08); tone('square', 600, 600, 0.07, 0.08, 0.05); },
  die: () => { tone('sawtooth', 300, 40, 0.8, 0.2); noise(0.7, 0.2, 0, 1500, 100); },
  kill: () => { tone('square', 200, 40, 0.18, 0.12); noise(0.14, 0.18, 0, 2500, 200); },
  roar: () => { tone('sawtooth', 90, 45, 0.9, 0.25); tone('square', 140, 60, 0.8, 0.14); noise(0.8, 0.25, 0, 900, 100); },
  chest: () => { tone('square', 200, 260, 0.1, 0.1); arp('square', [660, 880, 1100], 0.07, 0.09, 0.08, 0.1); },
  quest: () => { arp('triangle', [392, 523, 659, 784], 0.12, 0.2, 0.12); },
  door: () => { tone('square', 150, 90, 0.2, 0.1); noise(0.2, 0.1, 0, 800, 200); },
  save: () => { tone('square', 784, 784, 0.07, 0.08); tone('square', 1047, 1047, 0.1, 0.08, 0.07); },
  ending: () => { arp('triangle', [262, 330, 392, 523, 659, 784, 1047], 0.18, 0.5, 0.1); },
  block: () => { tone('square', 180, 120, 0.07, 0.14); noise(0.08, 0.2, 0, 4000, 900); },
  parry: () => { tone('square', 900, 1500, 0.08, 0.12); tone('square', 1500, 2200, 0.12, 0.1, 0.06); noise(0.1, 0.15, 0, 7000, 2000); },
  guardbreak: () => { tone('sawtooth', 200, 50, 0.3, 0.2); noise(0.25, 0.25, 0, 3000, 200); },
  shock: () => { noise(0.18, 0.22, 0, 9000, 1500); tone('sawtooth', 1400, 200, 0.16, 0.1); tone('square', 2200, 600, 0.1, 0.06, 0.04); },
  heal: () => { [523, 659, 784].forEach((f, i) => tone('triangle', f, f * 1.01, 0.18, 0.1, i * 0.07)); },
  ward: () => { tone('triangle', 330, 660, 0.3, 0.12); tone('triangle', 495, 990, 0.3, 0.08, 0.05); },
  howl: () => { tone('triangle', 300, 620, 0.5, 0.1); tone('triangle', 620, 380, 0.5, 0.1, 0.5); },
  execute: () => { noise(0.25, 0.3, 0, 6000, 200); tone('sawtooth', 500, 60, 0.3, 0.2); tone('square', 120, 40, 0.3, 0.2); },
  smash: () => { noise(0.18, 0.22, 0, 5000, 600); tone('square', 260, 90, 0.1, 0.08); },
  step: () => { noise(0.045, 0.05, 0, 2600, 700); },
  step_snow: () => { noise(0.06, 0.05, 0, 1700, 500); },
  step_ice: () => { noise(0.03, 0.04, 0, 6000, 2500); tone('sine', 2100, 1500, 0.04, 0.025); },
  step_stone: () => { noise(0.03, 0.06, 0, 3800, 900); tone('square', 170, 110, 0.04, 0.03); },
  step_wood: () => { tone('triangle', 190, 120, 0.06, 0.07); noise(0.03, 0.03, 0, 2400, 600); },
  step_hoof: () => { tone('triangle', 260, 150, 0.05, 0.06); noise(0.03, 0.05, 0, 3000, 900); tone('triangle', 240, 140, 0.05, 0.05, 0.09); },   // AU12: the pony
  crackle: () => { noise(0.02 + Math.random() * 0.03, 0.05, 0, 7000, 2000, amb()); if (Math.random() < 0.4) noise(0.015, 0.04, 0.05, 8000, 3000, amb()); },
  spike: () => { noise(0.08, 0.2, 0, 7000, 2500); tone('square', 900, 300, 0.07, 0.09); tone('square', 120, 60, 0.1, 0.12, 0.02); },
  thunder: () => { noise(1.4, 0.3, 0, 900, 90, amb()); tone('sawtooth', 70, 38, 1.1, 0.12, 0.05, amb()); },
  werehowl: () => { tone('sawtooth', 220, 640, 0.7, 0.08); tone('triangle', 640, 300, 0.9, 0.07, 0.7); },
  howl_far: () => { tone('triangle', 260, 520, 0.8, 0.025, 0, amb()); tone('triangle', 520, 330, 0.9, 0.025, 0.8, amb()); },
  caw: () => { tone('sawtooth', 520, 330, 0.12, 0.03, 0, amb()); tone('sawtooth', 480, 300, 0.12, 0.025, 0.14, amb()); noise(0.08, 0.02, 0, 3000, 900, amb()); },
  creak: () => { tone('sawtooth', 90, 130, 0.35, 0.03, 0, amb()); tone('sawtooth', 130, 80, 0.3, 0.025, 0.3, amb()); },
  nova: () => { tone('sawtooth', 600, 100, 0.5, 0.14); noise(0.4, 0.2, 0, 6000, 400); },

  // AU01: the smith's repair / reforge, an anvil "tink-tink" with a bright tick
  upgrade: () => { tone('square', 1250, 1180, 0.07, 0.08); noise(0.03, 0.08, 0, 9000, 4000); tone('square', 1580, 1500, 0.1, 0.08, 0.11); noise(0.03, 0.07, 0.11, 9000, 4000); tone('triangle', 2500, 2400, 0.25, 0.03, 0.12); },
  // AU06: an ordinary critical hit: a sharper hit with a bright edge (sneak attacks keep the full 'crit')
  crit_hit: () => { noise(0.12, 0.26, 0, 4500, 300); tone('square', 260, 70, 0.14, 0.15); tone('square', 900, 1300, 0.06, 0.06, 0.03); },
  // AU12: what the blow lands on
  hit_bone: () => { noise(0.07, 0.2, 0, 5000, 1200); tone('square', 420, 160, 0.06, 0.1); tone('triangle', 900, 500, 0.05, 0.05, 0.02); },
  hit_stone: () => { noise(0.09, 0.22, 0, 2500, 250); tone('square', 120, 70, 0.1, 0.13); tone('triangle', 1700, 1500, 0.08, 0.04); },
  hit_metal: () => { noise(0.06, 0.16, 0, 8000, 2500); tone('square', 210, 140, 0.08, 0.1); tone('triangle', 1900, 1850, 0.22, 0.05); tone('triangle', 2870, 2800, 0.16, 0.03); },

  // AU09: each spell has its own sound
  blink: () => { tone('sine', 300, 2400, 0.14, 0.1); arp('triangle', [2100, 2800, 3500], 0.04, 0.06, 0.04, 0.1); },
  nova_ice: () => { arp('triangle', [1760, 1320, 2093, 1568, 2637], 0.035, 0.18, 0.06); noise(0.35, 0.12, 0, 8000, 1500); },
  glacier: () => { tone('triangle', 400, 160, 0.5, 0.1); noise(0.45, 0.16, 0, 3000, 300); tone('triangle', 1600, 1100, 0.3, 0.05, 0.1); },
  ember_nova: () => { noise(0.5, 0.22, 0, 2500, 200); tone('sawtooth', 180, 60, 0.45, 0.12); tone('sawtooth', 360, 900, 0.2, 0.05, 0.05); },
  meteor_fall: () => { tone('sine', 2600, 500, 0.85, 0.07); noise(0.85, 0.06, 0, 6000, 900, null, 'bandpass', 3); },
  meteor_hit: () => { noise(0.6, 0.3, 0, 1600, 80); tone('square', 90, 30, 0.5, 0.16); tone('sawtooth', 300, 70, 0.3, 0.06, 0.04); },
  sunbeam_charge: () => { tone('triangle', 523, 1047, 0.5, 0.05); tone('triangle', 659, 1319, 0.5, 0.04, 0.05); tone('triangle', 784, 1568, 0.5, 0.04, 0.1); },
  sunbeam: () => { arp('triangle', [784, 988, 1175, 1568], 0.02, 0.5, 0.06); noise(0.4, 0.1, 0, 9000, 3000); },
  thorns: () => { noise(0.3, 0.2, 0, 900, 150); tone('sawtooth', 90, 130, 0.3, 0.06); tone('square', 70, 50, 0.12, 0.08, 0.12); },
  sand: () => { noise(0.7, 0.18, 0, 600, 2600, null, 'bandpass', 2); noise(0.6, 0.08, 0.2, 5000, 3000, null, 'highpass'); },
  bolt_fire: () => { noise(0.25, 0.14, 0, 1400, 300); tone('sawtooth', 200, 380, 0.18, 0.07); },
  bolt_frost: () => { tone('triangle', 1600, 1000, 0.1, 0.08); tone('triangle', 2100, 1500, 0.1, 0.05, 0.05); },
  // enemies' frost is lower and rougher than yours, so you can tell whose it is
  frost_enemy: () => { tone('sawtooth', 700, 450, 0.14, 0.06); tone('triangle', 1100, 700, 0.16, 0.07, 0.04); noise(0.12, 0.08, 0, 5000, 1500); },
  enemy_heal: () => { tone('triangle', 400, 600, 0.2, 0.06); tone('triangle', 600, 800, 0.2, 0.05, 0.1); },
  raise: () => { tone('sawtooth', 80, 160, 0.5, 0.08); noise(0.4, 0.1, 0, 600, 1500); tone('triangle', 330, 311, 0.4, 0.04, 0.2); },

  // AU11: jingles that say what happened
  quest_start: () => { tone('triangle', 392, 392, 0.14, 0.11); tone('triangle', 587, 587, 0.26, 0.11, 0.13); },
  quest_update: () => { tone('triangle', 784, 784, 0.18, 0.1); tone('triangle', 1175, 1175, 0.12, 0.04, 0.02); },
  quest_done: () => { arp('triangle', [392, 523, 659, 784], 0.12, 0.2, 0.11); [523, 659, 784].forEach((f) => tone('triangle', f, f, 0.6, 0.05, 0.5)); },
  discover: () => { arp('sine', [392, 587, 784, 1175], 0.14, 0.5, 0.07); },          // a soft, open fifths arpeggio
  achievement: () => { arp('square', [659, 784, 988], 0.07, 0.1, 0.06); tone('triangle', 1319, 1319, 0.5, 0.07, 0.22); tone('triangle', 988, 988, 0.5, 0.05, 0.22); },
  skill_up: () => { SOUNDS.levelup(); },
  // the character level: a longer fanfare (music ducks under it: see hooks.js)
  char_level: () => {
    arp('square', [392, 523, 659, 784], 0.1, 0.14, 0.08);
    [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.9, 0.05 - i * 0.006, 0.42));
    tone('square', 1047, 1047, 0.12, 0.07, 0.42); tone('square', 1319, 1319, 0.35, 0.06, 0.56);
  },
  buy: () => { tone('square', 1200, 1200, 0.04, 0.06); tone('square', 1600, 1600, 0.06, 0.06, 0.04); tone('triangle', 784, 784, 0.15, 0.06, 0.1); },
  forge: () => { tone('square', 1100, 1050, 0.08, 0.08); noise(0.04, 0.12, 0, 9000, 3000); tone('triangle', 523, 523, 0.3, 0.07, 0.12); tone('triangle', 784, 784, 0.35, 0.06, 0.2); },
  deny: () => { tone('square', 220, 200, 0.06, 0.07); tone('square', 175, 160, 0.09, 0.07, 0.07); },

  // AU13: statuses
  status_burn: () => { noise(0.35, 0.14, 0, 1200, 3500); tone('sawtooth', 140, 260, 0.25, 0.05); },
  status_bleed: () => { noise(0.12, 0.14, 0, 1400, 300); tone('sine', 300, 120, 0.12, 0.07); },
  status_poison: () => { tone('sine', 300, 180, 0.12, 0.07); tone('sine', 360, 200, 0.12, 0.06, 0.1); tone('sine', 260, 150, 0.14, 0.05, 0.2); },
  status_chill: () => { tone('triangle', 2000, 1600, 0.12, 0.05); noise(0.15, 0.06, 0, 9000, 5000); },
  status_freeze: () => { tone('triangle', 1800, 900, 0.2, 0.08); noise(0.25, 0.14, 0, 7000, 1500); tone('square', 2600, 2400, 0.05, 0.04, 0.15); },
  status_shock: () => { noise(0.1, 0.12, 0, 9000, 3000); tone('sawtooth', 1800, 600, 0.1, 0.05); },
  status_fear: () => { tone('triangle', 466, 440, 0.4, 0.05); tone('triangle', 659, 622, 0.4, 0.04); },
  status_slow: () => { tone('triangle', 400, 200, 0.3, 0.06); },
  status_root: () => { tone('sawtooth', 100, 80, 0.25, 0.06); noise(0.2, 0.1, 0, 800, 200); },
  status_winded: () => { SOUNDS.breath(); },
  breath: () => { noise(0.35, 0.09, 0, 900, 2500, null, 'bandpass', 1.5); noise(0.45, 0.07, 0.42, 1800, 700, null, 'bandpass', 1.5); },    // AU22: stamina hits zero
  tick_burn: () => { noise(0.05, 0.06, 0, 6000, 1500); noise(0.03, 0.05, 0.05, 7000, 2500); },
  tick_poison: () => { tone('sine', 220, 150, 0.08, 0.05); },
  tick_bleed: () => { noise(0.05, 0.07, 0, 1600, 400); },
  break: () => { tone('square', 1400, 300, 0.08, 0.1); noise(0.12, 0.2, 0, 8000, 1000); tone('triangle', 600, 580, 0.2, 0.04, 0.06); },    // gear broke
  heavy: () => { tone('sine', 120, 60, 0.2, 0.14); noise(0.15, 0.1, 0, 600, 120); },                                                    // overloaded
  heartbeat: () => { tone('sine', 62, 48, 0.13, 0.17); tone('sine', 58, 44, 0.16, 0.13, 0.2); },

  // ambience spot sounds (ambience bus; see ambience.js)
  amb_gull: () => { tone('triangle', 1500, 1100, 0.18, 0.025, 0, amb()); tone('triangle', 1450, 1000, 0.22, 0.02, 0.24, amb()); },
  amb_frog: () => { tone('square', 140, 120, 0.06, 0.018, 0, amb()); tone('square', 150, 120, 0.06, 0.016, 0.1, amb()); },
  amb_bubble: () => { tone('sine', 300, 900, 0.06, 0.02, 0, amb()); },
  amb_bird: () => { const f = 2200 + Math.random() * 900; for (let i = 0; i < 3; i++) tone('sine', f * (1 + i * 0.06), f * 1.3, 0.05, 0.012, i * 0.08, amb()); },
  amb_cricket: () => { for (let i = 0; i < 4; i++) tone('square', 4200, 4100, 0.02, 0.005, i * 0.05, amb()); },
  amb_insects: () => { tone('sawtooth', 640, 660, 0.9, 0.004, 0, amb()); },
  amb_chime: () => { const scale = [659, 740, 831, 988, 1109, 1319, 1480]; const f = scale[Math.floor(Math.random() * scale.length)]; tone('sine', f, f, 1.6, 0.018, 0, amb()); tone('sine', f * 2, f * 2, 0.8, 0.006, 0, amb()); },
  amb_lava: () => { tone('sine', 90, 260, 0.08, 0.03, 0, amb()); noise(0.12, 0.03, 0.05, 1200, 300, amb()); },
  amb_clank: () => { tone('square', 1100, 1050, 0.06, 0.02, 0, amb()); tone('triangle', 2200, 2150, 0.3, 0.008, 0, amb()); },
  amb_gust: () => { noise(1.6, 0.05, 0, 400, 1800, amb(), 'bandpass', 1.2); },
  amb_sand: () => { noise(1.2, 0.04, 0, 3000, 6000, amb(), 'highpass'); },
  amb_ember: () => { noise(0.02, 0.03, 0, 9000, 4000, amb()); noise(0.015, 0.02, 0.06, 9000, 5000, amb()); },
  amb_foghorn: () => { tone('sawtooth', 73, 72, 2.2, 0.012, 0, amb()); tone('sine', 110, 109, 2.2, 0.01, 0, amb()); },
  amb_drip: () => { tone('sine', 1900, 1300, 0.12, 0.035, 0, amb()); tone('sine', 950, 700, 0.2, 0.02, 0.07, amb()); },
};

// ---- generated families
// AU10: swings by weapon style; '_heavy' for the combo finisher and the heavy attack
const SWING = {
  //       whoosh lp from-to,   noise dur/vol,  tone        f0    f1  dur   vol
  dagger: { lp: [8000, 1500], n: [0.07, 0.12], t: ['square', 760, 380, 0.05, 0.05] },
  sword: { lp: [6000, 900], n: [0.12, 0.18], t: ['square', 520, 220, 0.09, 0.07] },
  blunt: { lp: [2600, 300], n: [0.16, 0.2], t: ['triangle', 260, 90, 0.14, 0.1] },      // axe, mace, hammer
  great: { lp: [3200, 250], n: [0.22, 0.2], t: ['sawtooth', 300, 90, 0.2, 0.07] },      // greatsword, halberd
  spear: { lp: [7000, 2500], n: [0.09, 0.14], t: ['square', 640, 520, 0.06, 0.05] },
  staff: { lp: [2000, 500], n: [0.14, 0.14], t: ['triangle', 330, 180, 0.1, 0.07] },
};
for (const [k, s] of Object.entries(SWING)) {
  const play = (h) => { noise(s.n[0] * (h ? 1.5 : 1), s.n[1] * (h ? 1.25 : 1), 0, s.lp[0] * (h ? 0.7 : 1), s.lp[1], null); const [ty, f0, f1, d, v] = s.t; tone(ty, f0 * (h ? 0.75 : 1), f1 * (h ? 0.7 : 1), d * (h ? 1.4 : 1), v * (h ? 1.3 : 1)); if (h) tone('sine', 110, 50, 0.18, 0.1); };
  SOUNDS['swing_' + k] = () => play(false);
  SOUNDS['swing_' + k + '_heavy'] = () => play(true);
}
export const SWING_STYLE = { dagger: 'dagger', sword: 'sword', axe: 'blunt', mace: 'blunt', hammer: 'blunt', great: 'great', halberd: 'great', spear: 'spear', staff: 'staff' };

// AU12: enemy voices. bark (a growl or a line), alert (they notice you: the "huh?" plus their colour), kill (their death)
const VOICE = {
  wolf: { bark: () => { tone('sawtooth', 240, 120, 0.22, 0.12); noise(0.2, 0.1, 0, 1200, 300); }, col: () => tone('sawtooth', 300, 200, 0.12, 0.05, 0.12), die: () => { tone('sawtooth', 380, 140, 0.25, 0.08); noise(0.14, 0.14, 0, 2500, 200); } },
  undead: { bark: () => { tone('sawtooth', 110, 70, 0.4, 0.14); tone('square', 118, 62, 0.35, 0.06); }, col: () => tone('sawtooth', 100, 80, 0.25, 0.05, 0.1), die: () => { noise(0.25, 0.18, 0, 5000, 600); tone('square', 600, 200, 0.08, 0.06); tone('square', 420, 150, 0.08, 0.05, 0.08); tone('triangle', 300, 120, 0.12, 0.05, 0.16); } },
  human: { bark: () => { tone('square', 340, 280, 0.09, 0.09); tone('square', 420, 300, 0.12, 0.08, 0.09); }, col: () => tone('square', 300, 260, 0.08, 0.04, 0.12), die: () => { tone('square', 330, 140, 0.25, 0.09); noise(0.14, 0.14, 0, 2000, 200); } },
  construct: { bark: () => { noise(0.4, 0.16, 0, 500, 120); tone('square', 70, 55, 0.4, 0.08); }, col: () => tone('triangle', 1300, 1280, 0.3, 0.04, 0.1), die: () => { noise(0.5, 0.25, 0, 1800, 100); tone('square', 90, 35, 0.4, 0.12); tone('triangle', 1500, 1400, 0.5, 0.04, 0.05); } },
  crawler: { bark: () => { for (let i = 0; i < 5; i++) noise(0.02, 0.1, i * 0.04, 6000, 3000); }, col: () => { for (let i = 0; i < 3; i++) noise(0.02, 0.08, 0.1 + i * 0.035, 7000, 3500); }, die: () => { noise(0.15, 0.18, 0, 5000, 800); tone('square', 900, 200, 0.1, 0.06); for (let i = 0; i < 3; i++) noise(0.02, 0.06, 0.1 + i * 0.05, 7000, 3000); } },
  spirit: { bark: () => { noise(0.6, 0.08, 0, 1200, 3000, null, 'bandpass', 4); tone('sine', 520, 380, 0.6, 0.04); }, col: () => noise(0.4, 0.06, 0.08, 2500, 1200, null, 'bandpass', 5), die: () => { tone('sine', 900, 200, 0.6, 0.07); noise(0.6, 0.1, 0, 3000, 400, null, 'bandpass', 3); } },
  slime: { bark: () => { tone('sine', 180, 420, 0.1, 0.1); tone('sine', 220, 120, 0.12, 0.08, 0.1); }, col: () => tone('sine', 200, 500, 0.08, 0.06, 0.12), die: () => { tone('sine', 140, 520, 0.12, 0.12); noise(0.15, 0.12, 0.05, 1400, 200); tone('sine', 300, 90, 0.18, 0.08, 0.1); } },
};
for (const [v, d] of Object.entries(VOICE)) {
  SOUNDS['bark_' + v] = d.bark;
  SOUNDS['alert_' + v] = () => { SOUNDS.alert(); d.col(); };
  SOUNDS['kill_' + v] = d.die;
}
export const VOICES = Object.keys(VOICE);

// AU23: speaking voices for the dialogue blip; the base pitch comes from the speaker (set just before the play)
export const talk = { pitch: 1 };
const TALK = { low: ['triangle', 300], mid: ['square', 470], high: ['square', 760], soft: ['triangle', 620], boss: ['sawtooth', 180] };
for (const [k, [ty, f]] of Object.entries(TALK)) SOUNDS['talk_' + k] = () => { const p = f * talk.pitch * (0.95 + Math.random() * 0.1); tone(ty, p, p * 0.93, 0.035, k === 'boss' ? 0.04 : 0.035); };
export const TALK_KINDS = Object.keys(TALK);
