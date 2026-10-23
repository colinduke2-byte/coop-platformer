// Tiny global event bus (no Phaser dependency so pure logic can be unit-tested in Node).
const map = new Map();
export const bus = {
  on(ev, fn) { if (!map.has(ev)) map.set(ev, new Set()); map.get(ev).add(fn); return bus; },
  off(ev, fn) { map.get(ev)?.delete(fn); return bus; },
  once(ev, fn) { const w = (...a) => { bus.off(ev, w); fn(...a); }; return bus.on(ev, w); },
  // a listener may remove itself while we call it, so several listeners are called from a copy; one needs none
  emit(ev, ...args) { const s = map.get(ev); if (!s || !s.size) return !!s; if (s.size === 1) { for (const fn of s) fn(...args); } else for (const fn of [...s]) fn(...args); return true; },
};

// CH13: a bus listener that lives as long as a Phaser scene: it is removed when the scene shuts down (or is destroyed),
// so a relaunched scene never leaves a handler behind. Returns a function that removes it earlier.
//   listen(this, 'toast', (text) => ...);          // in a scene's create()
export function listen(scene, ev, fn) {
  bus.on(ev, fn);
  const off = () => { bus.off(ev, fn); scene.events.off('shutdown', off); scene.events.off('destroy', off); };
  scene.events.once('shutdown', off);
  scene.events.once('destroy', off);
  return off;
}
