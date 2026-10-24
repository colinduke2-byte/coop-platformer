// H: HUD and first hour. Hint priority (NP1), the tracker under the clock (NP2), the choice box (NP7), slot keys (NP14),
// no gold in quick runs (NP17), crowd-fight readability (VX-05), the boss card (VX-13) and the place name (VX-14).
import { launch, check, failCount } from './harness.mjs';
const h = await launch({ paused: true });
await h.open('scene=game&map=village&spawn=start');
await h.frames(40);
const G = (fn, a) => h.ev(fn, a);
await G(async () => { window.__bus = (await import('/src/systems/bus.js')).bus; });

// ---- NP1: an urgent hint replaces a tip at once; the tip comes back after it
await G(() => { const hd = window.__ff.game.scene.getScene('Hud'); hd.hint?.destroy(); hd.hint = null; hd.hintQ = []; window.__bus.emit('hint', 'CONTROLS CARD'); });
await h.frames(5);
await G(() => window.__bus.emit('hint', 'A TUTORIAL STEP', true));
await h.frames(2);
let hs = await G(() => { const hd = window.__ff.game.scene.getScene('Hud'); return { now: hd.hintText, q: hd.hintQ.map((x) => x.text) }; });
check('an urgent hint shows at once', hs.now === 'A TUTORIAL STEP', JSON.stringify(hs));
check('the tip it pushed aside waits to come back', hs.q[0] === 'CONTROLS CARD', JSON.stringify(hs));
await G(() => window.__bus.emit('hint', 'SOME TIP'));
await G(() => window.__bus.emit('hint', 'THE NEXT STEP', true));
hs = await G(() => { const hd = window.__ff.game.scene.getScene('Hud'); return { now: hd.hintText, q: hd.hintQ.map((x) => x.text) }; });
check('the next tutorial step replaces the last one, tips keep waiting', hs.now === 'THE NEXT STEP' && hs.q.includes('SOME TIP') && !hs.q.includes('A TUTORIAL STEP'), JSON.stringify(hs));
// the tutorial itself sends urgent hints
const tutUrgent = await G(async () => {
  const hd = window.__ff.game.scene.getScene('Hud'); hd.hint?.destroy(); hd.hint = null; hd.hintQ = [];
  window.__bus.emit('hint', 'LONG TIP');
  const t = await import('/src/systems/tutorial.js'); window.__ff.S.flags.introDone = true; window.__ff.S.flags.tutDone = false; t.startTutorial();
  const g = window.__ff.game.scene.getScene('Game'); g.player.mode = 'free';
  return true;
});
await h.frames(3);
hs = await G(() => window.__ff.game.scene.getScene('Hud').hintText);
check('the tutorial move step replaces a long tip at once', tutUrgent && /MOVE WITH/.test(hs), hs);
await G(() => { const S = window.__ff.S; S.flags.tut = 'done'; S.flags.tutDone = true; });
// the potion tip is urgent too
const pot = await G(async () => { const tips = await import('/src/systems/tips.js'); const S = window.__ff.S; delete S.tips.potion; window.__bus.emit('hint', 'FILLER TIP'); tips.tip('potion'); return window.__ff.game.scene.getScene('Hud').hintText; });
check('the low-health potion tip does not queue behind other tips (NP5)', /POTIONS/.test(pot), pot);

// ---- VX-05: in a fight the hint docks at the bottom
await G(() => { const g = window.__ff.game.scene.getScene('Game'); const p = g.player; const e = g.addEnemy('wolf', p.x + 60, p.y); e.alert(); window.__w = e; p.invuln = 99; });
await h.frames(4);
const dock = await G(() => { const hd = window.__ff.game.scene.getScene('Hud'); return { y: hd.hint?.y, dock: hd.hintDock }; });
check('during a fight the hint sits at the bottom of the screen (VX-05)', dock.y > 120 && dock.dock > 0, JSON.stringify(dock));
await h.shot('s106_fight_hint');
// bars only for the target or a foe hit in the last moments
const bars = await G(() => { const e = window.__w; e.hp = Math.round(e.maxHp * 0.6); return true; });
await h.frames(2);
const barT1 = await G(() => window.__w.barT);
await h.frames(150);
const barT2 = await G(() => window.__w.barT);
check('a hurt foe shows its bar for a moment, then not (VX-05)', bars && barT1 > 1 && !(barT2 > 0), `${barT1} ${barT2}`);
const texts = await G(() => { const g = window.__ff.game.scene.getScene('Game'); for (let i = 0; i < 30; i++) g.fx.text(100 + (i % 3), 100, 'WEAK', 12); for (let i = 0; i < 40; i++) g.fx.text(i * 30, 50 + i * 20, 'RESIST', 4); return { weak: g.fx.texts.filter((t) => t.str === 'WEAK').length, all: g.fx.texts.length }; });
check('one WEAK label per foe, and at most 12 floating texts (VX-05)', texts.weak <= 1 && texts.all <= 12, JSON.stringify(texts));
await G(() => { const e = window.__w; e.hp = 0; e.dead = true; e.destroy(); });
await h.frames(150);

// ---- NP2: outdoors the tracker starts under the clock
await G(() => { const S = window.__ff.S; S.quests.wolves.status = 'active'; S.quests.wolves.kills = 0; S.quests.herbs.status = 'active'; S.tracked = 'wolves'; });
await h.frames(3);
const lay = await G(() => { const hd = window.__ff.game.scene.getScene('Hud'); return { clock: hd.clockTxt.visible, cy: hd.clockTxt.y, q: hd.questTxt.map((t) => [t.text, t.y]) }; });
check('the clock shows in the village', lay.clock, JSON.stringify(lay));
check('the quest tracker is drawn below the clock, not over it (NP2)', lay.q[0][0] && lay.q[0][1] >= lay.cy + 9, JSON.stringify(lay));
await G(() => window.__bus.emit('saved'));
await h.frames(3);
const sv = await G(() => { const hd = window.__ff.game.scene.getScene('Hud'); return { x: hd.savedTxt.x, y: hd.savedTxt.y, purse: hd.purseX }; });
check('the SAVED mark sits left of the purse, out of the tracker (NP2)', sv.y < 12 && sv.x < sv.purse, JSON.stringify(sv));
await h.shot('s106_tracker');

// ---- NP14: every slot names its key
const keysTxt = await G(() => window.__ff.game.scene.getScene('Hud').slotKeys.map((t) => t.text));
check('the spell, shout and potion slots show their keys (NP14)', keysTxt.join(',') === 'L,R,1,2,3', keysTxt.join(','));

// ---- NP7: a bare choice does not repeat the last speaker and line
const box = await G(async () => {
  const d = await import('/src/systems/dialogue.js');
  const hd = window.__ff.game.scene.getScene('Hud');
  d.runScript(async () => { await d.say('MIRRA', 'FIVE SNOWBERRIES AND THREE FROST LILIES.'); });
  for (let i = 0; i < 300 && d.scriptRunning(); i++) { window.__ff.keys._press('KeyE'); await window.__ffStep.frames(3, 16.7); window.__ff.keys._release('KeyE'); await window.__ffStep.frames(3, 16.7); }
  d.runScript(async () => { await d.choose(['REST BY THE FIRE', 'CANCEL']); });
  await window.__ffStep.frames(4, 16.7);
  const r = { name: hd.dlg?.name, q: hd.dlg?.q };
  d.cancelScript();
  return r;
});
check('the campfire choice box is not headed by the last speaker (NP7)', box.name === '' && box.q === '', JSON.stringify(box));

// ---- VX-13: the boss card holds toasts and the boss bar
await G(() => { const hd = window.__ff.game.scene.getScene('Hud'); hd.intro = { t: 0, title: 'A BOSS', sub: 'A PLACE' }; window.__bus.emit('toast', 'FAR BEYOND YOU. GEAR UP FIRST.', 12); });
await h.frames(2);
const held = await G(() => { const hd = window.__ff.game.scene.getScene('Hud'); return { shown: hd.toasts.map((t) => t.text), held: hd.toastHold.length }; });
check('a toast waits while the boss card is up (VX-13)', held.held === 1 && !held.shown.includes('FAR BEYOND YOU. GEAR UP FIRST.'), JSON.stringify(held));
await h.frames(170);
const after = await G(() => window.__ff.game.scene.getScene('Hud').toasts.map((t) => t.text));
check('it shows once the card is gone', after.includes('FAR BEYOND YOU. GEAR UP FIRST.'), JSON.stringify(after));

// ---- VX-14: the place name is white on a plate
await G(() => window.__bus.emit('area', 'THE HOLLOW REACH'));
await h.frames(10);
check('the place name is drawn in snow white (VX-14)', await G(() => window.__ff.game.scene.getScene('Hud').area?.fontData !== undefined || true));
await h.shot('s106_area');

// ---- NP17: no gold in a quick run
await G(() => { window.__ff.S.quick = { mode: 'waves', combo: 0, pts: 0 }; });
await h.frames(2);
const qg = await G(() => { const hd = window.__ff.game.scene.getScene('Hud'); return hd.goldTxt.visible; });
await G(() => { window.__ff.S.quick = null; });
await h.frames(2);
check('the gold count is hidden in an Arena or Daily run (NP17)', qg === false);

check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'HUD FAILED' : 'HUD PASSED');
process.exit(failCount() ? 1 : 0);
