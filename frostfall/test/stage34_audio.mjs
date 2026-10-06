import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=424242');
await h.sleep(700);
const G = (fn, a) => h.ev(fn, a);
await G(() => { window.gs = () => window.__ff.game.scene.getScene('Game'); window.__ff.S.flags.introDone = true; });
// ---- mixer
const mix = await G(async () => {
  const a = await import('/src/audio/sfx.js');
  a.setChannel('music', 0.3); a.setChannel('sfx', 0.5); a.setChannel('amb', 0.2);
  const s = a.settings; const r = { m: s.musicVol, s: s.sfxVol, a: s.ambVol };
  a.setChannel('music', 7); r.clamp = s.musicVol;
  a.setChannel('music', 1); a.setChannel('sfx', 1); a.setChannel('amb', 1);
  return r;
});
check('music, effects and ambience have separate levels (clamped 0..1)', mix.m === 0.3 && mix.s === 0.5 && mix.a === 0.2 && mix.clamp === 1, JSON.stringify(mix));
// ---- footsteps follow the ground
const steps = await G(async () => {
  const g = window.gs(), p = g.player, T = (await import('/src/config.js')).TILE;
  const out = {};
  for (const [name, id] of [['ice', T.ICE], ['wood', T.WOODFLOOR], ['stone', T.CFLOOR], ['snow', T.SNOW]]) { g.tileIdAt = () => id; out[name] = p.stepSound(); }
  return out;
});
check('each surface has its own footstep', steps.ice === 'step_ice' && steps.wood === 'step_wood' && steps.stone === 'step_stone' && steps.snow === 'step_snow', JSON.stringify(steps));
// ---- every new sound plays without throwing
const snd = await G(async () => { const a = await import('/src/audio/sfx.js'); const names = ['step_snow', 'step_ice', 'step_stone', 'step_wood', 'crackle', 'howl_far', 'creak']; a.unlock(); for (const n of names) a.sfx.play(n); return names.length; });
check('new ambient and footstep sounds play', snd === 7);
// ---- boss phases drive the music
const ph = await G(async () => { const a = await import('/src/audio/sfx.js'); a.music.play('dragon'); const p1 = a.music.phase(); a.music.setPhase(2); a.music.setIntensity(false); const out = { p1, p2: a.music.phase(), layer: a.music.intensity() }; a.music.play('village'); out.reset = a.music.phase(); return out; });
check('boss phase two speeds the music up and keeps the drum layer on, and resets afterwards', ph.p1 === 1 && ph.p2 === 2 && ph.layer === 1 && ph.reset === 1, JSON.stringify(ph));
// ---- ambient tick near a fire / at night does not error
await G(() => { const g = window.gs(); g.fires = [{ x: g.player.x + 10, y: g.player.y }]; for (let i = 0; i < 30; i++) { g.ambT = 0; g.howlT = 0; g.ambientTick(0.1); } });
// ---- the settings menu shows the new sliders
await G(() => window.gs().scene.launch('Menu', { name: 'SYSTEM' }));
await h.sleep(500);
await h.shot('s34_system');
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'AUDIO FAILED' : 'AUDIO PASSED');
