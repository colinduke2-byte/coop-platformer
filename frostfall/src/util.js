export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const rand = (a, b) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
export const sign = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);

// Deterministic hash noise so tiles look the same every run.
export function hash(x, y, s = 0) {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

// 8-direction facing helpers. Facing is a unit vector snapped to 8 directions.
export function dir8(dx, dy) {
  const sx = Math.abs(dx) > 0.38 * Math.hypot(dx, dy) ? sign(dx) : 0;
  const sy = Math.abs(dy) > 0.38 * Math.hypot(dx, dy) ? sign(dy) : 0;
  const l = Math.hypot(sx, sy) || 1;
  return { x: sx / l, y: sy / l };
}
export function norm(dx, dy) {
  const l = Math.hypot(dx, dy);
  return l === 0 ? { x: 0, y: 0 } : { x: dx / l, y: dy / l };
}
// Which of 'down' | 'up' | 'side' a facing vector uses for sprites.
export function facingKind(fx, fy) {
  if (Math.abs(fy) > Math.abs(fx) + 0.01) return fy > 0 ? 'down' : 'up';
  return 'side';
}

// Four-beat walk cycle: stride, pass, stride, pass (frames 1, 0, 2, 0 of a 3-frame walk).
const WALK = [1, 0, 2, 0];
export const walkFrame = (phase) => WALK[Math.floor(phase) % 4];

// CH10: copy groups of methods onto a class prototype, e.g. mixin(GameScene.prototype, { fogMethods, lootMethods }).
// Throws when a name is already taken (by the class itself, its Phaser base class or another group), so two features
// that each add a `tick` or `reset` can never silently replace one another. Getters / setters are copied as accessors.
export function mixin(proto, groups) {
  const from = new Map();
  for (const [group, obj] of Object.entries(groups)) {
    for (const [k, d] of Object.entries(Object.getOwnPropertyDescriptors(obj))) {
      if (from.has(k)) throw new Error(`mixin: "${k}" is defined by both ${from.get(k)} and ${group}`);
      if (k in proto) throw new Error(`mixin: ${group}.${k} would replace a method the class (or its base class) already has`);
      from.set(k, group);
      Object.defineProperty(proto, k, d);
    }
  }
  return proto;
}

// CH11: put a new id into a content table (ITEMS, ENEMIES, NPC_DEFS, SCRIPTS, QUESTS...), refusing one that is already
// there, for ids built at run time. Plain `TABLE.id = ...` / literal entries are checked by test/unit/foundation.mjs.
export function defineOnce(table, id, def, tableName = 'table') {
  if (Object.prototype.hasOwnProperty.call(table, id)) throw new Error(`${tableName}.${id} is already defined`);
  table[id] = def;
  return def;
}
