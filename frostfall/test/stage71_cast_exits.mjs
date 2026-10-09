// The cast button (whatever it is bound to) leaves menus, shops, lockpicking and conversations.
import { launch, check } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=424242');
await h.sleep(800);
const G = (fn, a) => h.ev(fn, a);
const tap = async (c) => { await G((c) => window.__ff.keys._press(c), c); await h.sleep(70); await G((c) => window.__ff.keys._release(c), c); await h.sleep(200); };
const active = (name) => G((n) => window.__ff.game.scene.isActive(n), name);
await G(() => { window.__ff.S.flags.introDone = true; });

// pause / inventory menu
await G(() => window.__ff.game.scene.getScene('Game').openMenu(0));
await h.sleep(500);
check('the menu is open', await active('Menu'));
await tap('KeyL');
check('the cast button closes the menu', !(await active('Menu')));

// a different tab too
await G(() => window.__ff.game.scene.getScene('Game').openMenu(-1, 'QUESTS'));
await h.sleep(500);
await tap('KeyL');
check('...on any tab', !(await active('Menu')));

// shop / list menus
await G(async () => { const { listScreen } = await import('/src/scenes/ShopScene.js'); window.__shopDone = false; listScreen({ title: 'TEST', rows: () => [{ name: 'Alpha', ok: true, tag: 1, lines: [] }, { name: 'Beta', ok: true, tag: 2, lines: [] }], onSelect: () => {} }).then(() => { window.__shopDone = true; }); });
await h.sleep(600);
const shopOpen = await active('Shop');
await tap('KeyL');
check('the cast button leaves a shop list', shopOpen && !(await active('Shop')) && await G(() => window.__shopDone));

// conversations: skip the text, still get to choose, and back out with the leave option
await G(async () => {
  const { runScript, say, choose } = await import('/src/systems/dialogue.js');
  window.__talk = { lines: 0, pick: null, end: false };
  runScript(async () => { await say('Test', 'First thing to say. '.repeat(6)); window.__talk.lines++; await say('Test', 'Second thing. '.repeat(6)); window.__talk.lines++; await say('Test', 'Third thing. '.repeat(6)); window.__talk.lines++; window.__talk.pick = await choose(['Buy', 'Sell', 'Leave']); window.__talk.end = true; });
});
await h.sleep(700);
await tap('KeyL');
await h.sleep(500);
const t1 = await G(() => ({ ...window.__talk, choosing: !!window.__ff.game.scene.getScene('Hud').dlg?.choices }));
check('the cast button skips the rest of the talk but still shows the choice', t1.lines === 3 && t1.choosing && t1.pick === null, JSON.stringify(t1));
await h.sleep(300);
await tap('KeyL');
await h.sleep(400);
const t2 = await G(() => window.__talk);
check('...and backs out of it with the Leave option', t2.pick === 2 && t2.end, JSON.stringify(t2));
check('the game is free again (no dialogue stuck open)', await G(() => !window.__ff.game.scene.getScene('Hud').dlg));
check('no page errors', h.errors.length === 0, h.errors.join(' | '));
await h.close();
