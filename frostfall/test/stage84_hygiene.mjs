// State hygiene (Wave 0, CH1-CH7): nothing from one map, one save or one conversation leaks into the next.
//  - the world stays frozen while a smith conversation opens and closes a shop sub-screen (CH2: modal holds)
//  - conversations can be cancelled, and a second one waits for the first instead of orphaning it (CH6)
//   node test/stage84_hygiene.mjs
import { launch, check, failCount } from './harness.mjs';
const h = await launch({ paused: true });
await h.open('scene=game&map=village&spawn=start&seed=4242');
await h.wait(1500);
const G = (fn, a) => h.ev(fn, a);
// answer whatever the dialogue box is waiting for (a line: any value; a choice: the option's index)
await G(() => {
  window.__answer = (v) => { const hud = window.__ff.game.scene.getScene('Hud'); const d = hud.dlg; if (!d) return false; hud.dlg = null; d.res(v); return true; };
  window.__ff.S.flags.introDone = true;
});

// ---- CH2: a smith's shop screen, opened and closed from inside the conversation, must not unfreeze the world
await G(async () => {
  const { runScript } = await import('/src/systems/dialogue.js');
  const { SCRIPTS } = await import('/src/data/dialogue.js');
  window.__smithDone = null;
  runScript(() => SCRIPTS.vale_smith()).then((r) => { window.__smithDone = r; });
});
await h.wait(100);
await G(() => window.__answer());                     // the smith's hello
await h.wait(100);
await G(() => window.__answer(0));                    // "Buy": opens the BUY list screen (the Shop scene)
await h.wait(200);
const inShop = await G(async () => ({ shop: window.__ff.game.scene.isActive('Shop'), modal: (await import('/src/systems/ui.js')).ui.modal }));
check('the smith opens the shop screen, and the world is frozen', inShop.shop && inShop.modal, JSON.stringify(inShop));
await G(() => window.__ff.game.scene.getScene('Shop').leave());
await h.wait(200);
const t0 = await G(() => window.__ff.game.scene.getScene('Game').t);
await h.wait(500);
const back = await G(async () => {
  const { ui } = await import('/src/systems/ui.js');
  return { modal: ui.modal, holds: ui.holdTags(), choice: !!window.__ff.game.scene.getScene('Hud').dlg?.choices, t: window.__ff.game.scene.getScene('Game').t };
});
check('after the shop closes, the smith asks again and the world stays frozen', back.modal && back.choice && back.t === t0, JSON.stringify({ ...back, t0 }));
await G(() => window.__answer(6));                    // "Leave"
await h.wait(100);
const after = await G(async () => ({ modal: (await import('/src/systems/ui.js')).ui.modal, done: window.__smithDone, t: window.__ff.game.scene.getScene('Game').t }));
await h.wait(200);
const t2 = await G(() => window.__ff.game.scene.getScene('Game').t);
check('leaving the smith unfreezes the world', !after.modal && after.done === true && t2 > after.t, JSON.stringify({ ...after, t2 }));

// ---- holds: each owner releases only its own
const holds = await G(async () => {
  const { ui } = await import('/src/systems/ui.js');
  const seen = [];
  const off = ui.onModal((v) => seen.push(v));
  const a = ui.hold('a'), b = ui.hold('b');
  a(); const stillB = ui.modal; a();
  b(); const none = ui.modal;
  ui.hold('c'); ui.hold('c'); ui.release('c'); const relTag = ui.modal;
  off();
  return { stillB, none, relTag, seen };
});
check('a hold keeps the world frozen until its own owner lets go', holds.stillB && !holds.none && !holds.relTag && holds.seen.join() === 'true,false,true,false', JSON.stringify(holds));

// ---- CH6: two conversations at once run one after the other; a cancelled one ends cleanly
const two = await G(async () => {
  const { runScript, say } = await import('/src/systems/dialogue.js');
  window.__log = [];
  window.__p1 = runScript(async () => { await say('A', 'one'); window.__log.push('A done'); });
  window.__p2 = runScript(async () => { window.__log.push('B start'); await say('B', 'two'); window.__log.push('B done'); });
  return { name: window.__ff.game.scene.getScene('Hud').dlg?.name };
});
await h.wait(50);
await G(() => window.__answer());
await h.wait(50);
const mid = await G(() => ({ name: window.__ff.game.scene.getScene('Hud').dlg?.name, log: [...window.__log] }));
await G(() => window.__answer());
await h.wait(50);
const end = await G(async () => ({ log: [...window.__log], r: await Promise.all([window.__p1, window.__p2]), modal: (await import('/src/systems/ui.js')).ui.modal }));
check('a second conversation waits for the first, then runs', two.name === 'A' && mid.name === 'B' && end.log.join() === 'A done,B start,B done' && end.r.join() === 'true,true' && !end.modal, JSON.stringify({ two, mid, end }));

const cut = await G(async () => {
  const { runScript, say, cancelScript } = await import('/src/systems/dialogue.js');
  const { ui } = await import('/src/systems/ui.js');
  window.__log = [];
  const p = runScript(async () => { await say('A', 'one'); window.__log.push('A after'); await say('A', 'two'); });
  const q = runScript(async () => { window.__log.push('queued ran'); });
  cancelScript();
  const r = await Promise.all([p, q]);
  return { r, log: window.__log, modal: ui.modal, box: !!window.__ff.game.scene.getScene('Hud').dlg };
});
check('a cancelled conversation ends at once, drops the queue and frees the world', cut.r.join() === 'false,false' && !cut.log.length && !cut.modal && !cut.box, JSON.stringify(cut));

// a door mid-conversation cancels it (the script does not run on into the next map)
await G(async () => {
  const { runScript, say } = await import('/src/systems/dialogue.js');
  window.__log = [];
  window.__p3 = runScript(async () => { await say('A', 'one'); window.__log.push('after the door'); });
  window.__ff.game.scene.getScene('Game').scene.restart({ map: 'village', spawn: 'start' });
});
await h.wait(800);
const door = await G(async () => ({ r: await window.__p3, log: window.__log, modal: (await import('/src/systems/ui.js')).ui.modal, box: !!window.__ff.game.scene.getScene('Hud').dlg }));
check('a map change cancels the conversation that was open', door.r === false && !door.log.length && !door.modal && !door.box, JSON.stringify(door));

// ---- CH3: the Game scene's own fields after map changes are those of a fresh load
const keysOf = () => G(() => Object.keys(window.__ff.game.scene.getScene('Game')).sort());
const go = async (map, spawn = 'start', ms = 1500) => { await G(([m, sp]) => { window.__ff.game.scene.getScene('Game').scene.restart({ map: m, spawn: sp }); }, [map, spawn]); await h.wait(ms); };
const fresh = await keysOf();
await go('forest');
const forest1 = await G(() => {
  const g = window.__ff.game.scene.getScene('Game');
  g.spawnGhostMerchant(); g.spawnTrader();
  g.slowmo(4, 5000);
  return { ghost: !!g.ghostEvt, trader: !!g.trader, tracks: (g.trackPts || []).length, wp: window.__ff.S.flags.waypoint };
});
await go('village');
const village = await G(() => {
  const g = window.__ff.game.scene.getScene('Game');
  return { ghost: !!g.ghostEvt, trader: !!g.trader, tracks: (g.trackPts || []).length, wp: window.__ff.S.flags.waypoint || null, slow: g.slowT || 0, tweens: g.tweens.timeScale };
});
const villageKeys = await keysOf();
await go('forest');
const forest2 = await G(() => { const g = window.__ff.game.scene.getScene('Game'); return { ghost: !!g.ghostEvt, tracks: (g.trackPts || []).length }; });
await h.wait(300);
check('a ghost merchant and a trader do not follow you to the next map', forest1.ghost && forest1.trader && !village.ghost && !village.trader && !forest2.ghost, JSON.stringify({ forest1, village, forest2 }));
check("the trader's waypoint goes with the trader", forest1.wp?.evt && village.wp === null, JSON.stringify({ a: forest1.wp, b: village.wp }));
check('hoofprints stay in the Reach and are not added again on every visit', forest1.tracks > 20 && village.tracks === 0 && forest2.tracks === forest1.tracks, JSON.stringify({ forest1, village, forest2 }));
check('bullet time does not carry over to the next map', village.slow === 0 && village.tweens === 1, JSON.stringify(village));
check('after forest -> village the scene has exactly the fields of a fresh village load', JSON.stringify(villageKeys) === JSON.stringify(fresh),
  JSON.stringify({ extra: villageKeys.filter((k) => !fresh.includes(k)), missing: fresh.filter((k) => !villageKeys.includes(k)) }));

// ---- CH1: an arena trial ends when you leave the arena: by the door, by dying, or from Arena Mode into the campaign
await go('arena', 'in');
const arena = await G(() => { const g = window.__ff.game.scene.getScene('Game'); g.startArena('classic'); return { active: g.arena.active }; });
await h.wait(5000);
const inArena = await G(() => { const g = window.__ff.game.scene.getScene('Game'); return { wave: g.arena?.wave, foes: g.arena?.foes.length }; });
await go('village');
const gold0 = await G(() => window.__ff.S.gold);
await h.wait(8000);
const out = await G(() => { const g = window.__ff.game.scene.getScene('Game'); return { arena: g.arena || null, enemies: g.enemies.getChildren().length, gold: window.__ff.S.gold, boons: Object.keys(window.__ff.S.boons || {}).length }; });
check('an arena trial does not follow you out of the arena (no waves, no gold)', arena.active && inArena.foes > 0 && !out.arena && out.enemies === 0 && out.gold === gold0 && !out.boons, JSON.stringify({ inArena, out, gold0 }));
await go('arena', 'in');
await G(() => { const g = window.__ff.game.scene.getScene('Game'); g.startArena('boon'); window.__ff.S.respawn = { map: 'arena', spawn: 'in' }; window.__ff.S.hp = 0; });
await h.wait(5000);
const died = await G(() => { const g = window.__ff.game.scene.getScene('Game'); return { map: g.mapId, arena: g.arena || null, hp: window.__ff.S.hp, label: g.interactables.find((i) => i.constructor.name === 'ArenaMaster')?.label() }; });
check('dying in the arena ends the trial', died.map === 'arena' && died.hp > 0 && !died.arena && /ENTER/.test(died.label || ''), JSON.stringify(died));
await G(() => { window.__ff.S.respawn = { map: 'village', spawn: 'start' }; });

check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'HYGIENE FAILED' : 'HYGIENE PASSED');
process.exit(failCount() ? 1 : 0);
