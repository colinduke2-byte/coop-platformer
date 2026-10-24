// The weather picture of the snowless regions (VX-12, VX-19): reacts to the bus event 'weather' (kind, region) that lighting
// emits on every map load and weather change, and draws dust, rain, ash, pollen, fireflies, glints or spores (art/weather.js).
// Snowy maps keep their snowfall (SnowFx, made by GameScene). One overlay per scene; nothing per frame on maps without one.
import { registerListener, registerTicker } from '../scenes/gameHooks.js';
import { CORE_ORDER } from '../scenes/gameTickers.js';
import { WeatherFx, skyMode, REGION_SKY } from '../art/weather.js';
import { S } from '../systems/state.js';

const sky = new WeakMap();          // scene -> { fx, region }

registerListener('weather', (sc, kind, region) => {
  const def = sc.def || {};
  const wants = !def.snow && REGION_SKY[region] && (def.outdoors || (def.stream && !def.interior));
  let s = sky.get(sc);
  if (!wants) { if (s?.fx?.g.scene) s.fx.destroy(); sky.delete(sc); return; }
  if (!s || !s.fx.g.scene) sky.set(sc, (s = { fx: new WeatherFx(sc), region }));
  s.region = region;
  s.fx.setMode(skyMode(kind, region, sc.isNight?.()));
}, 'artWeather');

registerTicker('artWeather', (sc, dt) => {
  const s = sky.get(sc);
  if (!s) return;
  if (!s.fx.g.scene) { sky.delete(sc); return; }              // the map changed and took the overlay with it
  s.fx.setMode(skyMode(S.weather, s.region, sc.isNight?.()));
  s.fx.update(dt);
}, CORE_ORDER.snow + 43);
