// Controller prompts: once the last input came from a pad, help lines, shop footers, interact prompts and the SYSTEM
// tab's control list name pad buttons instead of keys; a key press switches them back.
//   node test/stage82_pad_ui.mjs
import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.page.addInitScript(() => {
  window.__pads = [];
  navigator.getGamepads = () => window.__pads;
  window.__mk = (down) => ({ connected: true, id: 'Xbox (STANDARD GAMEPAD)', mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: down.includes(i), value: down.includes(i) ? 1 : 0 })) });
});
await h.open('scene=game&map=village&spawn=start&seed=4242');
await h.sleep(1000);
const G = (fn, a) => h.ev(fn, a);
await G(() => { window.__ff.S.flags.introDone = true; });

const conv = await G(async () => {
  const A = await import('/src/systems/access.js');
  const kb = A.padHint('W/S MOVE  E SELECT  ESC CLOSE');
  return { kb };
});
check('keyboard mode leaves hints alone', conv.kb === 'W/S MOVE  E SELECT  ESC CLOSE', JSON.stringify(conv));

// a pad button press (LB, unbound in the field) switches to pad mode
await G(() => { window.__pads = [window.__mk([10])]; });
await h.sleep(200);
await G(() => { window.__pads = [window.__mk([])]; });
await h.sleep(200);
const pad = await G(async () => {
  const A = await import('/src/systems/access.js'), K = await import('/src/systems/keys.js');
  return {
    on: K.padActive(),
    a: A.padHint('W/S MOVE  E SELECT  ESC CLOSE'),
    b: A.padHint('E SELECT   ESC DONE   CLICK OK'),
    c: A.padHint('E: TALK'),
    d: A.padHint('A/D TAB  V DROP  OR CLICK'),
    plain: A.padHint('NOTHING HERE'),
    fit: A.padHint('E USE  F OFFHAND  V DROP  Q FILTER  R SORT VALUE', 51),
  };
});
check('pad mode is on after a button press', pad.on, JSON.stringify(pad));
check('help lines name pad buttons', pad.a === 'UP/DOWN MOVE  B SELECT  START CLOSE' && /^B SELECT/.test(pad.b) && !/CLICK/.test(pad.b) && pad.c === 'B: TALK', JSON.stringify(pad));
check('a long pad line is shortened to fit, keeping every hint', pad.fit.length <= 51 && /SORT VALUE$/.test(pad.fit), pad.fit);
check('lines without keys are untouched; mouse hints are dropped', pad.plain === 'NOTHING HERE' && pad.d.startsWith('LEFT/RIGHT TAB') && !/CLICK/.test(pad.d), JSON.stringify(pad));

for (const [i, name] of [[0, 'items'], [-1, 'SYSTEM']]) {
  await G(([t, n]) => window.__ff.game.scene.getScene('Game').openMenu(t, n === 'items' ? undefined : n), [i, name]);
  await h.sleep(500);
  await h.shot('s82_pad_' + name.toLowerCase());
  const txt = await G(() => { const all = []; const walk = (l) => l.forEach((c) => { if (c.list) walk(c.list); else if (c.type === 'BitmapText') all.push(c.text); }); walk(window.__ff.game.scene.getScene('Menu').children.list); return all.join('|'); });
  if (name === 'SYSTEM') check('SYSTEM tab lists controller buttons', /L-STICK/.test(txt) && /DODGE ROLL/.test(txt) && !/SPACE/.test(txt), txt.slice(0, 400));
  else check('ITEMS help line uses pad buttons and fits the screen', /\bB USE/.test(txt) && !/E USE/.test(txt) && txt.split('|').every((l) => l.length <= 52), txt.slice(0, 400));
  await G(() => { const sm = window.__ff.game.scene; sm.stop('Menu'); if (sm.isPaused('Game')) sm.resume('Game'); });
  await h.sleep(300);
}

// the tutorial names the pad buttons too
const tut = await G(async () => {
  const { bus } = await import('/src/systems/bus.js'), T = await import('/src/systems/tutorial.js'), S = window.__ff.S;
  const said = []; const on = (t) => said.push(t); bus.on('hint', on);
  S.flags.tutDone = false; S.flags.tut = 'roll';
  T.updateTutorial(window.__ff.game.scene.getScene('Game'), 0.016);
  bus.off('hint', on); S.flags.tut = 'done'; S.flags.tutDone = true;
  return said.join('|');
});
check('the tutorial says which pad button rolls', /PRESS A TO DODGE ROLL/.test(tut), tut);

// the title screen's How To Play card lists pad buttons
await G(() => { const sm = window.__ff.game.scene; sm.getScenes(true).forEach((s) => sm.stop(s.scene.key)); sm.start('Title'); });
await h.sleep(1200);
await G(() => window.__ff.game.scene.getScene('Title').openHowTo());
await h.sleep(300);
await h.shot('s82_pad_howto');
const how = await G(() => window.__ff.game.scene.getScene('Title').howTxt.map((t) => t.text).join('|'));
const foot = await G(() => { const t = window.__ff.game.scene.getScene('Title'); return t.children.list.filter((c) => c.y === 172 && c.text).map((c) => c.text).join('|'); });
check('the title footer names pad buttons', /UP\/DOWN SELECT  B CONFIRM/.test(foot), foot);
check('How To Play shows controller buttons', /MOVE  LEFT STICK/.test(how) && /DODGE ROLL  A/.test(how) && !/SPACE/.test(how), how);

// a key press switches back
await G(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyZ' })));
await G(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyZ' })));
const back = await G(async () => (await import('/src/systems/keys.js')).padActive());
check('a key press switches prompts back to keys', back === false);

check('no page errors', h.errors.length === 0, h.errors.slice(0, 5).join('\n'));
await h.close();
console.log(failCount() ? 'PAD UI FAILED' : 'PAD UI PASSED');
process.exit(failCount() ? 1 : 0);
