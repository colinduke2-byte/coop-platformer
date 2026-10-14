// Saves and crash safety: daily runs never touch the campaign, compressed fog, damaged slots, sanitised loads,
// export / import, the NEW GAME slot picker, and a game loop that survives a throwing scene.
//   node test/stage83_saves.mjs
import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=4242');
await h.sleep(1200);
const G = (fn, a) => h.ev(fn, a);
// make two saves, a damaged slot 3, and a daily run that must not save
const r = await G(async () => {
  const sv = await import('/src/systems/save.js'), { settings } = await import('/src/systems/settings.js');
  const S = window.__ff.S, g = window.__ff.game.scene.getScene('Game');
  S.flags.introDone = true; settings.slot = 1; sv.saveGame(g); 
  settings.slot = 2; S.gold = 777; sv.saveGame(g);
  localStorage.setItem('frostfall_save_s3', '{broken');
  const seed2 = JSON.parse(localStorage.getItem('frostfall_save_s2')).s.seed;
  S.daily = { day: 1 }; S.seed = 123; const dailySaved = sv.saveGame(g, { auto: true }); delete S.daily;
  const after = JSON.parse(localStorage.getItem('frostfall_save_s2')).s.seed;
  const fogEnc = JSON.parse(localStorage.getItem('frostfall_save_s2')).s.fog.village;
  return { dailySaved, same: seed2 === after, fogEnc: String(fogEnc).slice(0, 20), states: [1, 2, 3].map(sv.slotState), size: localStorage.getItem('frostfall_save_s2').length };
});
console.log(JSON.stringify(r));
check('daily run never writes the campaign save', r.dailySaved === false && r.same);
check('fog is stored compressed', r.fogEnc.startsWith('~'));
check('slot states: ok ok damaged', r.states.join() === 'ok,ok,damaged');
// bad field in a save does not freeze anything
const bad = await G(async () => {
  const sv = await import('/src/systems/save.js');
  const d = JSON.parse(localStorage.getItem('frostfall_save_s2')); d.s.flags = null; d.s.gold = 'lots'; d.s.skills.archery = 5;
  localStorage.setItem('frostfall_save_s2', JSON.stringify(d));
  const ok = sv.loadGame(2); const S = window.__ff.S;
  return { ok, flags: typeof S.flags, gold: S.gold, arch: S.skills.archery, fog: (S.fog.village || '').slice(0, 5) };
});
console.log(JSON.stringify(bad));
check('a save with damaged fields loads with defaults for them', bad.ok && bad.flags === 'object' && typeof bad.gold === 'number' && bad.arch.lvl === 1 && /^[01]+$/.test(bad.fog));
// export / import round trip
const io = await G(async () => {
  const sv = await import('/src/systems/save.js');
  const code = sv.toCode(sv.exportSave(1));
  sv.deleteSave(1);
  const err = sv.importSave(code, 1);
  return { err, state: sv.slotState(1), junk: sv.importSave('hello', 1) };
});
check('export then import restores a slot; junk is refused', io.err === '' && io.state === 'ok' && io.junk === 'NOT A FROSTFALL SAVE', JSON.stringify(io));
// title slot picker
await G(() => { const sm = window.__ff.game.scene; sm.getScenes(true).forEach((s) => sm.stop(s.scene.key)); sm.start('Title'); });
await h.sleep(1200);
await G(() => { const t = window.__ff.game.scene.getScene('Title'); t.sel = 0; window.__ff.keys._press('KeyE'); });
await h.sleep(120); await G(() => window.__ff.keys._release('KeyE')); await h.sleep(300);
await h.shot('zz_slots_new');
const pick = await G(() => { const t = window.__ff.game.scene.getScene('Title'); return { mode: t.slotMode, rows: t.slotTxt?.map((x) => x.text), sub: t.slotSub?.map((x) => x.text) }; });
console.log(JSON.stringify(pick));
check('NEW GAME with saves opens the slot picker', pick.mode === 'new' && pick.rows.length === 3);
// loop survives an error
const loop = await G(async () => {
  const g = window.__ff.game, t = g.scene.getScene('Title'); const f0 = g.loop.frame;
  const orig = t.update; let n = 0; t.update = function (...a) { if (n++ < 3) throw new Error('boom test'); return orig.apply(this, a); };
  await new Promise((r) => setTimeout(r, 600));
  return { advanced: g.loop.frame - f0 };
});
check('the game loop keeps running after a scene throws', loop.advanced > 10, JSON.stringify(loop));
check('no page errors (apart from the test throw)', h.errors.filter((e) => !/boom test/.test(e)).length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'SAVES FAILED' : 'SAVES PASSED');
process.exit(failCount() ? 1 : 0);
