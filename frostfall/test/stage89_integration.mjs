// Integration checks between the Wave 1 branches (integrator, stage 84-89 range).
//  - world x combat: rain weakens fire spells and fire arrows on maps with weather (weatherMul('fire', 'rain'))
//   node test/stage89_integration.mjs
import { launch, check, failCount } from './harness.mjs';
const h = await launch({ paused: true });
await h.open('scene=game&map=forest&spawn=west&seed=4242');
await h.wait(1500);
const G = (fn, a) => h.ev(fn, a);

const r = await G(async () => {
  const g = window.__ff.game.scene.getScene('Game'), S = window.__ff.S, p = g.player;
  const { TUNE } = await import('/src/data/tuning.js');
  const hit = (weather, info) => {
    S.weather = weather;
    const e = g.addEnemy('wolf', p.x + 60, p.y, { tier: 0 });
    e.maxHp = e.hp = 9999; e.cfg = { ...e.cfg, weak: {}, armored: false };
    const dealt = e.takeHit({ dmg: 100, kx: 1, ky: 0, kb: 0, ...info });
    e.destroy();
    return dealt;
  };
  return {
    outdoors: !!(g.def.outdoors || g.def.stream || g.def.snow),
    fireClear: hit('clear', { src: 'fire', element: 'fire' }), fireRain: hit('rain', { src: 'fire', element: 'fire' }),
    arrowRain: hit('rain', { src: 'arrow', element: 'fire' }), frostRain: hit('rain', { src: 'frost', element: 'frost' }),
    frostClear: hit('clear', { src: 'frost', element: 'frost' }), mul: TUNE.world.weather.fireInRain,
  };
});
check('the test map has weather', r.outdoors, JSON.stringify(r));
check('rain weakens a fire spell by fireInRain', r.fireClear > 0 && Math.abs(r.fireRain - r.fireClear * r.mul) <= 1, JSON.stringify(r));
check('rain weakens a fire arrow the same way', Math.abs(r.arrowRain - r.fireRain) <= 1, JSON.stringify(r));
check('rain leaves other elements alone', r.frostRain === r.frostClear, JSON.stringify(r));
await h.close();
console.log(failCount() ? 'INTEGRATION FAILED' : 'INTEGRATION PASSED');
