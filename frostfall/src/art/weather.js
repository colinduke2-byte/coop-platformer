// Weather you can see in the snowless regions (VX-12, VX-19). The snowy maps keep SnowFx (art/snow.js); every other outdoor map
// gets this overlay instead, chosen from the weather kind (S.weather: clear / snow / blizzard...) and the region:
//   Ashen Peaks  ember haze, falling ash, an ashstorm          Weeping Fens  rain, a downpour, mist at night
//   Sunscorch    blowing dust, a sandstorm                     Embergreen Vale  pollen by day, fireflies at night, rain
//   Glasswood    glints in the air, glittering motes           Old Kingdom  drizzle, pale ghost-lights at night
//   Underdeep    drifting spores and drips (always)
// One Graphics in screen space, pixels and short streaks in palette colours, at most 160 particles; Reduce Motion thins it.
import { W, H, C } from '../config.js';
import { settings } from '../systems/settings.js';

// What each weather kind is called and drawn as, per region. `kinds` = the weather kinds the region can have at all (others are
// turned into the nearest allowed one when you arrive: no blizzards in the desert, no aurora outside the snow).
export const REGION_SKY = {
  ashen: { kinds: ['clear', 'snow', 'blizzard'], clear: 'haze', snow: 'ash', blizzard: 'ashstorm',
    toast: { snow: ['ASH BEGINS TO FALL', 2], blizzard: ['AN ASHSTORM ROLLS IN', 12], clear: ['THE ASH SETTLES', 5] } },
  fens: { kinds: ['clear', 'snow', 'blizzard'], clear: 'mist', snow: 'rain', blizzard: 'downpour',
    toast: { snow: ['RAIN SWEEPS THE FENS', 4], blizzard: ['A DOWNPOUR ROLLS IN', 15], clear: ['THE RAIN EASES', 5] } },
  sunscorch: { kinds: ['clear', 'snow', 'blizzard'], clear: 'clear', snow: 'dust', blizzard: 'sandstorm',
    toast: { snow: ['THE WIND LIFTS THE DUST', 10], blizzard: ['A SANDSTORM ROLLS IN', 12], clear: ['THE DUST SETTLES', 13] } },
  vale: { kinds: ['clear', 'snow'], clear: 'pollen', snow: 'rain', toast: { snow: ['A WARM RAIN FALLS', 8], clear: ['THE RAIN PASSES', 13] } },
  glasswood: { kinds: ['clear', 'snow'], clear: 'glints', snow: 'glitter', toast: { snow: ['THE AIR GLITTERS', 15], clear: ['THE GLITTER FADES', 5] } },
  kingdom: { kinds: ['clear', 'snow'], clear: 'clear', snow: 'drizzle', toast: { snow: ['A COLD DRIZZLE FALLS', 4], clear: ['THE DRIZZLE STOPS', 5] } },
  underdeep: { kinds: ['clear'], clear: 'spores' },
};
// The overlay mode for a weather kind in a region (night swaps pollen for fireflies, mist and ghost-lights only show at night).
export function skyMode(kind, region, night) {
  const r = REGION_SKY[region];
  if (!r) return 'clear';
  let m = r[kind] || r.clear || 'clear';
  if (m === 'pollen' && night) m = 'fireflies';
  if (m === 'mist' && !night) m = 'clear';
  if (region === 'kingdom' && night && m === 'clear') m = 'ghosts';
  return m;
}
// The weather kind a region allows that is closest to `kind`.
export function clampKind(kind, region) {
  const r = REGION_SKY[region];
  if (!r || r.kinds.includes(kind)) return kind;
  if ((kind === 'whiteout' || kind === 'blizzard') && r.kinds.includes('blizzard')) return 'blizzard';
  if ((kind === 'whiteout' || kind === 'blizzard') && r.kinds.includes('snow')) return 'snow';
  return 'clear';
}

// n particles, colours, fall speed vy, wind vx, streak length (0 = a dot), rising embers share, twinkle (fade in place)
const MODES = {
  clear: { n: 0 },
  haze: { n: 14, cols: [12, 13, 11], vy: -10, vx: 4, len: 0, flicker: true },
  ash: { n: 60, cols: [2, 3, 1, 2], vy: 14, vx: 8, len: 0, size: 2, ember: 0.12 },
  ashstorm: { n: 150, cols: [2, 1, 3, 0], vy: 30, vx: 70, len: 0, size: 2, ember: 0.12 },
  rain: { n: 70, cols: [4, 5, 4], vy: 170, vx: -18, len: 4 },
  drizzle: { n: 40, cols: [4, 3], vy: 140, vx: -10, len: 3 },
  downpour: { n: 150, cols: [4, 5, 3], vy: 230, vx: -55, len: 6 },
  mist: { n: 22, cols: [4, 3], vy: 0, vx: 6, len: 8, alpha: 0.25 },
  dust: { n: 50, cols: [9, 13, 6, 9], vy: 4, vx: 70, len: 4, alpha: 0.7 },
  sandstorm: { n: 160, cols: [9, 13, 6, 9, 10], vy: 12, vx: 160, len: 7 },
  pollen: { n: 18, cols: [13, 6, 13], vy: -3, vx: 5, len: 0, flicker: true },
  fireflies: { n: 18, cols: [13, 8, 13], vy: 0, vx: 0, len: 0, flicker: true, wander: true },
  glints: { n: 16, cols: [15, 6], twinkle: true },
  glitter: { n: 40, cols: [15, 6, 5], twinkle: true, vy: 8 },
  ghosts: { n: 6, cols: [5, 15], vy: 0, vx: 0, len: 0, size: 2, flicker: true, wander: true },
  spores: { n: 26, cols: [14, 15, 8, 14], vy: -5, vx: 3, len: 0, flicker: true, drips: true },
};

export class WeatherFx {
  constructor(scene) {
    this.g = scene.add.graphics().setScrollFactor(0).setDepth(99985);
    this.p = Array.from({ length: 160 }, () => this.spawn({}, true));
    this.mode = 'clear'; this.m = MODES.clear; this.t = 0;
  }
  spawn(q, anywhere) {
    q.x = Math.random() * W; q.y = anywhere ? Math.random() * H : -6; q.ph = Math.random() * 6.3; q.s = 0.6 + Math.random() * 0.8;
    q.c = Math.floor(Math.random() * 8); q.life = 0.6 + Math.random() * 1.6; q.age = Math.random() * q.life; q.e = Math.random();
    return q;
  }
  setMode(mode) { if (mode !== this.mode) { this.mode = mode; this.m = MODES[mode] || MODES.clear; } }
  update(dt) {
    const g = this.g, m = this.m;
    g.clear();
    if (!m.n) return;
    this.t += dt;
    const n = settings.reduceMotion ? Math.min(m.n, 24) : m.n;
    for (let i = 0; i < n; i++) {
      const q = this.p[i], col = C[m.cols[q.c % m.cols.length]];
      if (m.twinkle) {                                  // glints: a + that flares and fades where it is
        q.age += dt; if (q.age > q.life) { this.spawn(q, true); q.age = 0; }
        q.y += (m.vy || 0) * q.s * dt;
        const k = Math.sin((q.age / q.life) * Math.PI), x = Math.floor(q.x), y = Math.floor(q.y);
        g.fillStyle(col, 0.9 * k); g.fillRect(x, y, 1, 1);
        if (k > 0.6) { g.fillStyle(col, 0.5 * k); g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3); }
        continue;
      }
      const ember = m.ember && q.e < m.ember;
      const vy = ember ? -14 : m.vy * q.s, vx = ember ? 6 : m.vx * q.s;
      if (m.wander) { q.ph += dt; q.x += Math.sin(q.ph * 0.9 + i) * 10 * dt; q.y += Math.cos(q.ph * 0.7 + i * 2) * 7 * dt; }
      else { q.x += (vx + Math.sin(this.t * 1.3 + q.ph) * 4) * dt; q.y += vy * dt; }
      if (q.y > H + 6) { this.spawn(q); } else if (q.y < -8) { this.spawn(q); q.y = H + 4; }
      if (q.x > W + 6) q.x -= W + 10; else if (q.x < -6) q.x += W + 10;
      const a = (m.alpha ?? 0.85) * (m.flicker ? 0.45 + 0.55 * Math.abs(Math.sin(this.t * 2.2 + q.ph * 3)) : 1);
      g.fillStyle(ember ? C[q.e < m.ember / 2 ? 12 : 13] : col, a);
      const x = Math.floor(q.x), y = Math.floor(q.y);
      if (m.len && !ember) {                            // a streak along its motion, one pixel wide
        const l = m.len, sx = vx / (Math.hypot(vx, vy) || 1), sy = vy / (Math.hypot(vx, vy) || 1);
        for (let k = 0; k < l; k++) g.fillRect(Math.floor(x - sx * k), Math.floor(y - sy * k), 1, 1);
      } else g.fillRect(x, y, m.size && q.e > 0.5 ? m.size : 1, m.size && q.e > 0.5 ? m.size : 1);
    }
    if (m.drips) {                                      // the Underdeep: a drop falls from the dark now and then
      this.drip = (this.drip ?? { x: 0, y: H, v: 0 });
      const d = this.drip;
      if (d.y >= H) { d.x = Math.floor(Math.random() * W); d.y = -2; d.v = 0; }
      d.v += 220 * dt; d.y += d.v * dt;
      g.fillStyle(C[15], 0.8); g.fillRect(d.x, Math.floor(d.y), 1, 2);
    }
  }
  destroy() { this.g.destroy(); }
}
