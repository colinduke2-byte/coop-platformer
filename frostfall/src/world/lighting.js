// Day/night clock, weather, and the darkness layer with light cut-outs (mixed into GameScene).
import Phaser from 'phaser';
import { W, H, C } from '../config.js';
import { S } from '../systems/state.js';
import { bus } from '../systems/bus.js';
import { tip } from '../systems/tips.js';

const DAY_MIN = 1440;
const lerpColor = (a, b, t) => {
  const c = Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(a), Phaser.Display.Color.ValueToColor(b), 100, Math.round(t * 100));
  return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
};

export const hourOf = () => (S.time % DAY_MIN) / 60;
export const isNightHour = (h) => h >= 20.5 || h < 5.5;

export const lightingMethods = {
  initLighting() {
    this.darkRT = this.add.renderTexture(0, 0, W, H).setOrigin(0).setScrollFactor(0).setDepth(99800);
    this.stamp = this.add.image(0, 0, 'lightmask').setVisible(false);
    this.ambientOverride = null;
    this.weatherT = 120 + Math.random() * 120;
    this.applyWeather(true);
  },

  isNight() { return this.def.snow && isNightHour(hourOf()); },
  outdoors() { return !!this.def.snow; },

  // { color, alpha } of the darkness layer right now.
  ambient() {
    if (this.ambientOverride) return this.ambientOverride;
    const base = this.def.dim || 0;
    let color = 0x0b0e1a, alpha = base;
    if (this.def.snow) {
      const h = hourOf();
      let night = 0, dusk = 0;
      if (h >= 20.5 || h < 5) night = 1;
      else if (h >= 18) { night = (h - 18) / 2.5; dusk = Math.sin(Math.min(1, (h - 18) / 2.5) * Math.PI); }
      else if (h < 7) { night = 1 - (h - 5) / 2; dusk = Math.sin(((h - 5) / 2) * Math.PI) * 0.6; }
      const nAlpha = 0.52 * night;
      color = lerpColor(0x0b0e1a, 0x0b1536, night);
      if (dusk > 0.05) { color = lerpColor(color, 0x3a1a2a, dusk * 0.5); }
      alpha = Math.max(base, nAlpha);
      if (S.weather === 'blizzard') { color = lerpColor(color, 0x7b8fb5, 0.7 * (1 - night)); alpha = Math.max(alpha, 0.2 + 0.2 * night); }
    }
    return { color, alpha };
  },

  nightness() { return this.def.snow ? Math.min(1, this.ambient().alpha / 0.5) : 0; },

  updateLighting(dt) {
    const rt = this.darkRT, cam = this.cameras.main;
    const amb = this.ambient();
    rt.clear();
    if (amb.alpha < 0.01) return;
    rt.fill(amb.color, amb.alpha);
    const ox = cam.worldView.x, oy = cam.worldView.y;
    const dark = Math.min(1, amb.alpha / 0.35);          // stronger cut-outs when it is darker
    const cut = (x, y, r, a) => {
      const sx = Math.round(x - ox), sy = Math.round(y - oy);
      if (sx < -r || sy < -r || sx > W + r || sy > H + r) return;
      this.stamp.setScale(r / 32).setAlpha(Math.min(1, a));
      rt.erase(this.stamp, sx, sy);
    };
    for (const l of this.lights) {
      const flick = 1 + Math.sin(l.ph) * 0.04 + Math.sin(l.ph * 2.3) * 0.03;
      cut(l.x, l.y, l.r * 1.25 * flick, 0.95 * dark + 0.05);
    }
    // the dreamer carries a little warmth of their own
    const p = this.player;
    cut(p.x, p.y, 38 + 5 * Math.sin(this.t * 5), 0.85 * dark);
    if (this.follower) cut(this.follower.x, this.follower.y, 22, 0.5 * dark);
  },

  // ---- time and weather
  updateClock(dt) {
    if (!this.def.snow) return;                           // time stands still indoors / underground
    const before = hourOf();
    S.time = (S.time + dt * 2) % DAY_MIN;
    const h = hourOf();
    if (Math.floor(before) !== Math.floor(h)) {
      if (Math.floor(h) === 21) { bus.emit('toast', 'NIGHT FALLS', 4); tip('night'); }
      if (Math.floor(h) === 6) bus.emit('toast', 'DAWN BREAKS', 13);
    }
    this.weatherT -= dt;
    if (this.weatherT <= 0) {
      this.weatherT = 150 + Math.random() * 120;
      const r = Math.random();
      const next = S.weather === 'blizzard' ? 'snow' : r < 0.22 ? 'clear' : r < 0.42 ? 'blizzard' : 'snow';
      if (next !== S.weather) {
        S.weather = next;
        this.applyWeather();
        if (next === 'blizzard') bus.emit('toast', 'A BLIZZARD ROLLS IN', 15);
        else if (next === 'clear') bus.emit('toast', 'THE SNOW THINS', 5);
      }
    }
  },

  applyWeather() {
    this.snow?.setMode(S.weather);
  },

  // Multiplier on enemies' sight: darkness and blizzards help the sneaky.
  stealthEnv() {
    if (!this.def.snow) return 1;
    return (this.isNight() ? 0.85 : 1) * (S.weather === 'blizzard' ? 0.75 : 1);
  },
};
