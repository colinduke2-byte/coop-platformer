// Tiny global event bus (no Phaser dependency so pure logic can be unit-tested in Node).
const map = new Map();
export const bus = {
  on(ev, fn) { if (!map.has(ev)) map.set(ev, new Set()); map.get(ev).add(fn); return bus; },
  off(ev, fn) { map.get(ev)?.delete(fn); return bus; },
  once(ev, fn) { const w = (...a) => { bus.off(ev, w); fn(...a); }; return bus.on(ev, w); },
  emit(ev, ...args) { const s = map.get(ev); if (s) for (const fn of [...s]) fn(...args); return !!s; },
};
