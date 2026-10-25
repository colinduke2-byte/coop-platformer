// H: the first hour. Starter quest and the next-step line (NP3, NP20), drills (NP22), nemesis gate (NP10), the first trip
// (NP11, NP25), danger names (NP24), the Field Guide (NP21), first-visit service tips (NP16), town map names (NP23),
// villager name plates (NP8) and the title order (NP27).
import { launch, check, failCount } from './harness.mjs';
const h = await launch({ paused: true });
await h.open('scene=game&map=village&spawn=start');
await h.frames(40);
const G = (fn, a) => h.ev(fn, a);
await G(async () => { window.__bus = (await import('/src/systems/bus.js')).bus; window.__d = await import('/src/systems/dialogue.js'); window.__dd = await import('/src/data/dialogue.js'); });
// talk through a script: E on every line, the first option on every choice (or `pick`)
const talk = (id, pick = 0) => G(async ([id, pick]) => {
  const d = window.__d, k = window.__ff.keys, hd = window.__ff.game.scene.getScene('Hud');
  const done = d.runScript(() => window.__dd.SCRIPTS[id]());
  for (let i = 0; i < 400 && d.scriptRunning(); i++) {
    if (hd.dlg?.choices) { hd.dlg.sel = pick < 0 ? hd.dlg.choices.length - 1 : Math.min(pick, hd.dlg.choices.length - 1); }
    k._press('KeyE'); await window.__ffStep.frames(2, 16.7); k._release('KeyE'); await window.__ffStep.frames(2, 16.7);
  }
  await done; return true;
}, [id, pick]);

// ---- NP3: the tutorial's end starts the starter quest, tracked, pointing at Bjorn
await G(() => { const S = window.__ff.S; S.flags.introDone = true; S.flags.tutDone = true; S.flags.tut = 'done'; window.__bus.emit('tutorial:done'); });
await h.frames(3);
let st = await G(() => ({ q: window.__ff.S.quests.starter, tracked: window.__ff.S.tracked, line: window.__ff.game.scene.getScene('Hud').questTxt[0].text }));
check('the starter quest starts and is tracked (NP3)', st.q?.status === 'active' && st.tracked === 'starter', JSON.stringify(st));
check('the tracker says to speak to Bjorn', /BJORN/.test(st.line), st.line);
await h.shot('s107_starter');
await talk('sigrid');
check('Sigrid sends you to Bjorn first', await G(() => window.__ff.S.quests.king.status === 'inactive'));
await talk('bjorn', 1);          // skip the drills, take the usual talk
st = await G(() => ({ q: window.__ff.S.quests.starter, drill: window.__ff.S.flags.drill }));
check('meeting Bjorn moves the quest on; skipping the drills is remembered', st.q.bjorn && st.drill === 'skipped', JSON.stringify(st));
await talk('mirra', -1);
await talk('sigrid');
st = await G(() => ({ starter: window.__ff.S.quests.starter.status, king: window.__ff.S.quests.king.status }));
check('Sigrid closes the starter quest and offers the story quest (NP20)', st.starter === 'done' && st.king === 'active', JSON.stringify(st));

// ---- NP20: with nothing active the tracker suggests a next step
await G(() => { const S = window.__ff.S; for (const q of Object.values(S.quests)) if (q.status === 'active' || q.status === 'ready') q.status = 'done'; S.quests.wolves.status = 'inactive'; });
await h.frames(3);
const nx = await G(() => window.__ff.game.scene.getScene('Hud').questTxt[0].text);
check('an empty tracker shows a next step (NP20)', /^NEXT: /.test(nx), nx);

// ---- NP22: the drills
await G(() => { window.__ff.S.flags.drill = null; });
await talk('bjorn', 0);
check('Bjorn starts the drills and lends a shield', await G(() => window.__ff.S.flags.drill === 'parry' && !!window.__ff.S.equip.offhand));
await h.frames(3);
await G(() => { window.__ff.game.scene.getScene('Game').player.riposteT = 0.5; });
await h.frames(2);
check('a parry passes drill 1', await G(() => window.__ff.S.flags.drill === 'sneak'));
await h.frames(3);
await G(() => { const g = window.__ff.game.scene.getScene('Game'); const w = g.enemies.getChildren().find((e) => e.drill && !e.dead); w.hp -= 3; });
await h.frames(2);
check('a strike on the sleeping wolf passes drill 2', await G(() => window.__ff.S.flags.drill === 'bow'));
const arrows0 = await G(() => window.__ff.S.arrows);
await h.hold('KeyK', 90, 6);
check('a full draw passes drill 3 and pays arrows', await G(() => window.__ff.S.flags.drill === 'done') && (await G(() => window.__ff.S.arrows)) >= arrows0 + 9);

// ---- NP21: the Field Guide lists the controls and seen tips
const guide = await G(async () => {
  const S = window.__ff.S; S.tips.block = true;
  const g = window.__ff.game.scene.getScene('Game'); g.openMenu(-1, 'LORE');
  await window.__ffStep.frames(10, 16.7);
  const m = window.__ff.game.scene.getScene('Menu');
  // JOURNAL's strip: LORE -> BEASTS -> GUIDE (two presses of Q)
  for (let i = 0; i < 2; i++) { window.__ff.keys._press('KeyQ'); await window.__ffStep.frames(2, 16.7); window.__ff.keys._release('KeyQ'); await window.__ffStep.frames(2, 16.7); }
  await window.__ffStep.frames(4, 16.7);
  const texts = m.dyn.list.map((o) => o.text || o._raw || '').join('|');
  return texts;
});
check('Lore > GUIDE lists the controls, the colours and a seen tip (NP21)', /CONTROLS/.test(guide) && /DANGER COLOURS/.test(guide) && /BLOCK AND PARRY/.test(guide), guide.slice(0, 300));
await h.shot('s107_guide');
await G(() => window.__ff.game.scene.getScene('Menu').scene.stop());
await h.frames(5);

// ---- NP10: no nemesis below level 3
const nem = await G(async () => {
  const S = window.__ff.S, g = window.__ff.game.scene.getScene('Game');
  const pl = g.player; const old = g.def.stream; g.def.stream = true;
  S.charLevel = 1; delete S.nemesis; pl.noteKiller({ kind: 'wolf', tier: 0, x: 1, y: 1, cfg: { name: 'Wolf' } });
  const low = !!S.nemesis;
  S.charLevel = 3; pl.noteKiller({ kind: 'wolf', tier: 0, x: 1, y: 1, cfg: { name: 'Wolf' } });
  const high = !!S.nemesis; delete S.nemesis; S.charLevel = 1; g.def.stream = old;
  return { low, high };
});
check('a level 1 death makes no nemesis, a level 3 one does (NP10)', !nem.low && nem.high, JSON.stringify(nem));

// ---- NP16: the first visit to a service explains it on its message line
const shopTip = await G(async () => {
  const sv = await import('/src/data/services.js'); delete window.__ff.S.tips.cook;
  sv.cookMenu();
  await window.__ffStep.frames(6, 16.7);
  const sh = window.__ff.game.scene.getScene('Shop'); const m = sh.msg; sh.scene.stop(); return m;
});
check('the campfire explains cooking the first time (NP16)', /MEAL/.test(shopTip || ''), shopTip);
await h.frames(5);

// ---- NP8: villager names sit on a plate
check('villager names have a dark plate (NP8)', await G(() => window.__ff.game.scene.getScene('Game').npcs.every((n) => !!n.nameTxt.plate)));

// ---- NP11 + NP25: the first trip out
await G(() => { const S = window.__ff.S; S.flags.firstTrip = false; S.charLevel = 1; delete S.flags.waypoint; window.__ff.game.scene.getScene('Game').changeMap('forest', 'west'); });
await h.frames(220);          // the region's title card (2.6 s) goes first; the warning follows it
const trip = await G(() => { const g = window.__ff.game.scene.getScene('Game'), p = g.player; return { map: g.mapId, wp: window.__ff.S.flags.waypoint, hint: window.__ff.game.scene.getScene('Hud').hintText, near: Math.min(9999, ...g.enemies.getChildren().filter((e) => !e.dead && !e.cfg.passive).map((e) => Math.hypot(e.x - p.x, e.y - p.y))) }; });
check('the first trip warns and marks the nearest campfire (NP25)', trip.map === 'forest' && /STAY ON THE ROAD/.test(trip.hint || '') && trip.wp?.map === 'forest', JSON.stringify(trip));
check('no foe waits within 300 px of the village exit for a newcomer (NP11)', trip.near > 300, String(trip.near));
await h.shot('s107_trip');

// ---- NP24: a foe that notices you names itself in its danger colour
const dn = await G(async () => {
  const f = await import('/src/features/hud_firsthour.js'); const g = window.__ff.game.scene.getScene('Game'), p = g.player;
  const e = g.addEnemy('wolf', p.x + 50, p.y); e.alert(true);
  await window.__ffStep.frames(2, 16.7);
  const label = g.fx.texts.find((t) => /WOLF/.test(t.str || ''));
  return { dg: f.dangerNameOn(e), label: label?.str };
});
check('an alerted foe floats its name (NP24)', !!dn.label, JSON.stringify(dn));

check('no page errors', h.errors.length === 0, h.errors.join('\n'));

// ---- NP27: a fresh player sees NEW GAME (START HERE) first, the Arena under MORE MODES
await G(() => { try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/save|slot|rescue/i.test(k)) localStorage.removeItem(k); } } catch { /* */ } });
await h.open('');
await h.frames(30);
const title = await G(() => { const t = window.__ff.game.scene.getScene('Title'); return t?.items?.map((i) => i.label); });
check('the title starts a newcomer at NEW GAME (NP27)', Array.isArray(title) && title[0] === 'NEW GAME (START HERE)' && title.indexOf('ARENA') > title.indexOf('- MORE MODES -'), JSON.stringify(title));
await h.shot('s107_title');
await h.close();
console.log(failCount() ? 'FIRST HOUR FAILED' : 'FIRST HOUR PASSED');
process.exit(failCount() ? 1 : 0);
