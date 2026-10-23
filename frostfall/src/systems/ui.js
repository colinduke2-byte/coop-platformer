// Tiny shared flags between scenes.
// modal: dialogue / menu / banner open: the world freezes. It is derived from a set of holds (CH2): every screen that
// freezes the world takes its own hold and releases only that one, so closing a shop inside a conversation can no longer
// unfreeze the world while the conversation is still on screen.
//   const release = ui.hold('shop');   ...   release();      // or ui.release('shop'), which drops every hold with that tag
// Never assign ui.modal in src/ (lint forbids it). Watchers (ui.onModal) hear every change of the derived value; the touch
// controls hide their combat buttons while a menu or a conversation is up.
const watchers = new Set();
const holds = new Map();            // token -> tag
let modal = false;
function sync() {
  const v = holds.size > 0;
  if (v === modal) return;
  modal = v;
  for (const fn of watchers) { try { fn(v); } catch { /* never break the caller */ } }
}
export const ui = {
  get modal() { return modal; },
  // Old API, kept for tests and the console: true takes an anonymous hold, false drops every hold.
  set modal(v) { if (v) ui.hold('legacy'); else ui.releaseAll(); },
  // Freeze the world until the returned function is called (calling it twice, or after releaseAll, does nothing).
  hold(tag = 'hold') {
    const token = { tag };
    holds.set(token, tag);
    sync();
    return () => { if (holds.delete(token)) sync(); };
  },
  // Drop every hold carrying this tag.
  release(tag) { for (const [t, g] of holds) if (g === tag) holds.delete(t); sync(); },
  // A new map, loading a save, quitting to the title, the death safety net: nothing may stay frozen.
  releaseAll() { holds.clear(); sync(); },
  // tags of the holds now outstanding (for tests and bug reports)
  holdTags() { return [...holds.values()]; },
  onModal(fn) { watchers.add(fn); return () => watchers.delete(fn); },
  lastMenuTab: null,
};
