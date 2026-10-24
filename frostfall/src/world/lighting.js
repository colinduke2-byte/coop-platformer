// Day/night clock, weather, and the darkness layer with light cut-outs (mixed into GameScene).
import { W, H, C } from '../config.js';
import { S } from '../systems/state.js';
import { bus } from '../systems/bus.js';
import { tip } from '../systems/tips.js';
import { advanceTime, isFull, isBlood } from '../systems/moon.js';

const DAY_MIN = 1440;
// integer RGB blend (no Color objects: this runs every frame)
const lerpColor = (a, b, t) => {
  const k = Math.round(t * 100) / 100;
  const r = ((a >> 16) & 255) + (((b >> 16) & 255) - ((a >> 16) & 255)) * k;
  const g = ((a >> 8) & 255) + (((b >> 8) & 255) - ((a >> 8) & 255)) * k;
  const bl = (a & 255) + ((b & 255) - (a & 255)) * k;
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl);
};

import { hasMod } from '../data/mods.js';
import { regionOfMap } from '../data/regions.js';
import { elixirVal } from '../systems/elixir.js';

// VX-15: each region has its own night (indigo desert, green-black fens, red-black ash), and a storm washes the screen in its own
// colour (sand, ash, rain). Dusk warms toward orange then purple; dawn is cool. Visuals only.
const NIGHT_OF = { reach: 0x0b1536, coast: 0x0b1536, highlands: 0x0b1536, sunscorch: 0x1a1446, fens: 0x08180f, ashen: 0x1c0a10, glasswood: 0x061a24, vale: 0x0c1430, kingdom: 0x10122c };
const STORM_OF = { sunscorch: C[10], ashen: C[2], fens: C[2] };
const DUSK_WARM = C[12], DUSK_PURPLE = C[14], DAWN_COOL = C[4];
import { TUNE } from '../data/tuning.js';
import { SNOWY_REGIONS, rollRegion, heavyOf, arrive, snowMode, stealthMul, TOASTS, clearToast, weatherAfter } from './weather.js';
// WQ19: [colour, how much of it, the least darkness] for the regions' own weather
const WEATHER_TINT = { sandstorm: [0xc89048, 0.75, 0.3], fog: [0x8a9496, 0.8, 0.34], ash: [0x4a2c2a, 0.6, 0.22], rain: [0x3a4a6a, 0.5, 0.16], storm: [0x2a3048, 0.7, 0.3], chime: [0x9ad8e8, 0.35, 0.08] };
export const hourOf = () => (S.time % DAY_MIN) / 60;
export const isNightHour = (h) => h >= 20.5 || h < 5.5;
// CH4: THE definition of night for gameplay (spawns, events, merchants, music, stealth): an outdoor map between 20:30 and
// 05:30. scene.isNight() and nightlife's isNightNow() both use it. nightness() (how dark it looks: dusk, whiteout...) is
// for visuals and sound only; never decide gameplay with it.
export const isNightFor = (def) => !!(def.snow || def.outdoors) && isNightHour(hourOf());

export const lightingMethods = {
  initLighting() {
    this.darkRT = this.add.renderTexture(0, 0, W, H).setOrigin(0).setScrollFactor(0).setDepth(99800);
    this.stamp = this.add.image(0, 0, 'lightmask').setVisible(false);
    this.ambientOverride = null;
    this.weatherT = 120 + Math.random() * 120;
    if (hasMod('winter')) S.weather = 'blizzard';
    this.applyWeather(true);
  },

  isNight() { return isNightFor(this.def); },
  outdoors() { return !!(this.def.snow || this.def.outdoors); },

  // { color, alpha } of the darkness layer right now.
  ambient() {
    if (this.ambientOverride) return this.ambientOverride;
    // computed once per frame (lighting, night checks and NPCs all ask), or again if the clock or weather was changed
    const f = this.game.loop.frame;
    if (this._ambF === f && this._ambT === S.time && this._ambW === S.weather && this._amb) return this._amb;
    this._ambF = f; this._ambT = S.time; this._ambW = S.weather;
    return (this._amb = this.ambientNow());
  },
  ambientNow() {
    const base = this.def.dim || 0;
    let color = 0x0b0e1a, alpha = base;
    if ((this.def.snow || this.def.outdoors)) {
      const h = hourOf();
      let night = 0, dusk = 0, dawn = 0, duskK = 0;
      if (h >= 20.5 || h < 5) night = 1;
      else if (h >= 18) { night = (h - 18) / 2.5; duskK = Math.min(1, (h - 17.5) / 3); dusk = Math.sin(duskK * Math.PI); }
      else if (h >= 17.5) { duskK = (h - 17.5) / 3; dusk = Math.sin(duskK * Math.PI); }
      else if (h < 7) { night = 1 - (h - 5) / 2; dawn = Math.sin(((h - 5) / 2) * Math.PI); }
      const nAlpha = 0.52 * night, region = this._skyRegion ??= regionOfMap(this.mapId);
      color = lerpColor(0x0b0e1a, NIGHT_OF[region] ?? 0x0b1536, night);
      alpha = Math.max(base, nAlpha * (1 - elixirVal('nightsight', 0)));
      // dusk: a warm wash that turns from orange to purple as the sun goes; dawn: a cool one
      if (dusk > 0.05) { color = lerpColor(color, lerpColor(DUSK_WARM, DUSK_PURPLE, Math.max(0, duskK * 1.6 - 0.4)), Math.min(1, dusk * 1.2)); alpha = Math.max(alpha, 0.3 * dusk); }
      if (dawn > 0.05) { color = lerpColor(color, DAWN_COOL, dawn * 0.8); alpha = Math.max(alpha, 0.22 * dawn); }
      if (S.weather === 'blizzard') { color = lerpColor(color, STORM_OF[region] ?? 0x7b8fb5, 0.7 * (1 - night)); alpha = Math.max(alpha, (STORM_OF[region] ? 0.28 : 0.2) + 0.2 * night); }
      if (S.weather === 'whiteout') { color = lerpColor(0xe4ecf6, 0x3a4a6a, night * 0.8); alpha = Math.max(alpha, 0.56); }
      // WQ19: the regions' own weather darkens the day in its own colour (the particles are the art overlay's)
      const wt = WEATHER_TINT[S.weather];
      if (wt) { color = lerpColor(color, wt[0], wt[1] * (1 - night * 0.6)); alpha = Math.max(alpha, wt[2] + 0.15 * night); }
    }
    return { color, alpha };
  },

  // visuals and sound only (CH4): 0 by day, 1 in full dark, and in between at dusk, dawn and in a whiteout
  nightness() { return (this.def.snow || this.def.outdoors) ? Math.min(1, this.ambient().alpha / 0.5) : 0; },

  updateLighting(dt) {
    const rt = this.darkRT, cam = this.cameras.main;
    const amb = this.ambient();
    // full daylight: hide the layer instead of clearing a screen-sized texture every frame
    if (amb.alpha < 0.01) { if (rt.visible) { rt.clear(); rt.setVisible(false); } return; }
    if (!rt.visible) rt.setVisible(true);
    rt.clear();
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
    cut(p.x, p.y, 38 + (S.inv.lantern > 0 ? 28 : 0) + 5 * Math.sin(this.t * 5), 0.85 * dark);
    if (this.follower) cut(this.follower.x, this.follower.y, 22, 0.5 * dark);
  },

  // ---- time and weather
  updateClock(dt) {
    if (!(this.def.snow || this.def.outdoors)) return;                           // time stands still indoors / underground
    const before = hourOf();
    advanceTime(dt * 2);
    if (hasMod('moonbound')) { S.time = 23 * 60; S.days = Math.floor((S.days || 0) / 8) * 8 + 4; }
    const h = hourOf();
    if (Math.floor(before) !== Math.floor(h)) {
      if (Math.floor(h) === 21) { bus.emit('toast', isBlood() ? 'THE BLOOD MOON RISES' : isFull() ? 'NIGHT FALLS. THE FULL MOON RISES' : 'NIGHT FALLS', isFull() ? 8 : 4); tip('night'); }
      if (Math.floor(h) === 6) { bus.emit('toast', 'DAWN BREAKS', 13); if (S.weather === 'aurora') { S.weather = 'clear'; this.applyWeather(); } }
    }
    this.weatherT -= dt;
    if (this.weatherT <= 0) {
      this.weatherT = 150 + Math.random() * 120;
      const region = regionOfMap(this.mapId), snowy = !!this.def.snow;
      let next;
      if (snowy || SNOWY_REGIONS.has(region) || !TUNE.world.weather.roll[region]) {
        const r = Math.random();
        const eb = S.flags.finale === 'thaw' ? 0.25 : S.flags.finale === 'crown' ? -0.2 : 0;     // after the finale the weather remembers
        const next0 = S.weather === 'blizzard' || S.weather === 'storm' ? (r < 0.3 ? 'whiteout' : 'snow') : S.weather === 'whiteout' || S.weather === 'aurora' ? 'snow' : r < 0.22 + eb ? 'clear' : r < 0.42 + eb * 0.2 ? 'blizzard' : 'snow';
        next = hasMod('winter') ? 'blizzard' : next0;
        if (!hasMod('winter') && this.isNight() && next !== 'blizzard' && next !== 'whiteout' && Math.random() < 0.3) next = 'aurora';
        if (region === 'highlands' && next === 'blizzard' && Math.random() < TUNE.world.weather.stormShare) next = 'storm';     // WQ19: the Stormcrown's thunder
      } else next = hasMod('winter') ? heavyOf(region, snowy) : rollRegion(region, S.weather);   // WQ3 / WQ19: the region's own weather, never a blizzard
      next = weatherAfter(region, next);
      if (next !== S.weather) {
        const was = S.weather;
        S.weather = next;
        this.applyWeather();
        const t = next === 'clear' ? clearToast(was, region) : TOASTS[next];
        if (t) bus.emit('toast', t[0], t[1]);
        if (next === 'aurora') this.auroraWisps();
      }
    }
  },

  // Hand-off event (Wave 0): bus 'weather' (kind, region) on every map load and every change of S.weather, so art and audio
  // can react without touching this file. region is a REGIONS id from data/regions.js ('reach', 'sunscorch'...).
  applyWeather() {
    // WQ3: a weather carried in from another region turns into one this region can have (no blizzard in the desert)
    const region = this._skyRegion = regionOfMap(this.mapId), snowy = !!this.def.snow;     // _skyRegion: ambientNow's region night colours
    if (this.def.snow || this.def.outdoors || this.def.stream) S.weather = hasMod('winter') ? heavyOf(region, snowy) : arrive(S.weather, region, snowy);
    this.snow?.setMode(snowMode(S.weather));
    bus.emit('weather', S.weather, regionOfMap(this.mapId));
  },

  // Multiplier on enemies' sight: darkness and blizzards help the sneaky.
  stealthEnv() {
    if (!(this.def.snow || this.def.outdoors)) return 1;
    return (this.isNight() ? 0.85 : 1) * stealthMul(S.weather);
  },
};
