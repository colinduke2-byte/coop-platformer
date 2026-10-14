// Tiny shared flags between scenes.
// modal: dialogue / menu / banner open: the world freezes. Setting it tells any watcher (the touch controls hide their
// combat buttons while a menu or a conversation is up).
const watchers = new Set();
let modal = false;
export const ui = {
  get modal() { return modal; },
  set modal(v) { v = !!v; if (v === modal) return; modal = v; for (const fn of watchers) { try { fn(v); } catch { /* never break the caller */ } } },
  onModal(fn) { watchers.add(fn); return () => watchers.delete(fn); },
  lastMenuTab: null,
};
