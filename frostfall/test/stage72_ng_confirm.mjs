// New Game+ asks "are you sure?" before it starts; No and Esc leave everything as it was.
import { launch, check } from './harness.mjs';
const h = await launch();
await h.open('');
await h.sleep(1500);
const G = (fn, a) => h.ev(fn, a);
const tap = async (c, ms = 80) => { await G((c) => window.__ff.keys._press(c), c); await h.sleep(ms); await G((c) => window.__ff.keys._release(c), c); await h.sleep(250); };
// a finished game in slot 1, so the title offers NEW GAME+
await G(async () => {
  const { S, resetState } = await import('/src/systems/state.js'), { saveGame } = await import('/src/systems/save.js'), { settings } = await import('/src/systems/settings.js');
  resetState(); S.flags.ending = 'give'; S.gold = 123; settings.slot = 1; saveGame(1);
  window.__ff.game.scene.getScene('Title').scene.restart();
});
await h.sleep(1500);
const T = () => G(() => { const t = window.__ff.game.scene.getScene('Title'); return { items: t.items.map((i) => i.id), ng: !!t.ngMode, sel: t.ngSel, title: window.__ff.game.scene.isActive('Title'), game: window.__ff.game.scene.isActive('Game') }; });
const pick = () => G(() => { const t = window.__ff.game.scene.getScene('Title'); t.sel = t.items.findIndex((i) => i.id === 'ng'); t.warm = 0; });
check('the title offers NEW GAME+ after a finished game', (await T()).items.includes('ng'));
await pick(); await tap('KeyE', 80); await h.sleep(300);
let s = await T();
check('choosing NEW GAME+ asks first and does not start the game', s.ng && s.title && !s.game && s.sel === 0, JSON.stringify(s));
await h.shot('s72_ng_confirm');
await tap('KeyE', 80); await h.sleep(300);
s = await T();
check('the default answer (NO) goes back to the menu', !s.ng && s.title && !s.game, JSON.stringify(s));
await pick(); await tap('KeyE', 80); await h.sleep(300); await tap('Escape', 80); await h.sleep(300);
s = await T();
check('Esc also backs out', !s.ng && s.title && !s.game, JSON.stringify(s));
await pick(); await tap('KeyE', 80); await h.sleep(300); await tap('KeyS', 60); await tap('KeyE', 80); await h.sleep(2500);
const g = await G(() => ({ game: window.__ff.game.scene.isActive('Game'), ng: window.__ff.S.ngPlus }));
check('YES starts New Game+', g.game && g.ng === 1, JSON.stringify(g));
check('no page errors', h.errors.length === 0, h.errors.join(' | '));
await h.close();
