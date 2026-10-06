import { elixirVal } from './elixir.js';
// One status-effect system for enemies and the player.
// A target is anything with `statuses` (created on demand), `x`, `y`, and optionally `statusHit(n, col)` for damage-over-time.
//   burn    fire damage over time                      (cleansed by frost, potions, water)
//   bleed   physical damage over time, worse on the move
//   poison  slow, steady damage
//   chill   stacks; at 3 stacks becomes freeze
//   freeze  cannot move or act for a moment (bosses only slow)
//   shock   takes extra damage
//   fear    runs away (enemies only)
//   slow    moves at half speed
//   root    cannot move
//   winded  out of breath after running dry of stamina: slower for a moment
export const STATUS = {
  burn: { name: 'BURN', col: 12, dot: true, dps: 4, tick: 0.5, dur: 4 },
  bleed: { name: 'BLEED', col: 11, dot: true, dps: 3, tick: 0.5, dur: 5, movingMul: 1.6 },
  poison: { name: 'POISON', col: 8, dot: true, dps: 2, tick: 0.75, dur: 8 },
  chill: { name: 'CHILL', col: 15, speed: 0.7, dur: 4, stacks: 3 },
  freeze: { name: 'FROZEN', col: 15, speed: 0, act: false, dur: 1.4 },
  shock: { name: 'SHOCK', col: 13, takenMul: 1.25, dur: 4 },
  fear: { name: 'FEAR', col: 14, flee: true, dur: 3 },
  slow: { name: 'SLOW', col: 15, speed: 0.5, dur: 3 },
  winded: { name: 'WINDED', col: 8, speed: 0.75, dur: 1.8 },
  root: { name: 'ROOT', col: 8, speed: 0, dur: 2 },
};

const CURES = { potion: ['bleed', 'poison', 'burn'], rest: ['bleed', 'poison', 'burn', 'chill', 'shock', 'fear', 'slow', 'root', 'freeze'], frost: ['burn'], fire: ['chill', 'freeze'] };

const store = (t) => (t.statuses ||= {});
export const hasStatus = (t, type) => !!t.statuses?.[type];

// Apply (or refresh) a status. Returns true if it took hold.
// opts: { t: seconds, dps: damage per second, stacks }
export function applyStatus(t, type, opts = {}) {
  const def = STATUS[type];
  if (!def || t.dead) return false;
  const imm = t.cfg?.immune;
  if (imm && imm.includes(type)) return false;
  if (t.isPlayer && (elixirVal('immune', null) || []).includes(type)) return false;
  const st = store(t);
  // chill stacks into a freeze
  if (type === 'chill') {
    const c = st.chill || { t: 0, stacks: 0 };
    c.stacks = Math.min(def.stacks, c.stacks + (opts.stacks || 1)); c.t = Math.max(c.t, opts.t ?? def.dur);
    st.chill = c;
    if (c.stacks >= def.stacks && !st.freeze) {
      delete st.chill;
      return applyStatus(t, 'freeze', { t: t.isBoss ? 0 : undefined });
    }
    return true;
  }
  if (type === 'freeze') {
    if (t.isBoss || t.cfg?.title) { return applyStatus(t, 'slow', { t: 2 }); }      // bosses are only slowed
    if (st.burn) { delete st.burn; }                                                // ice puts fires out
  }
  if (type === 'burn' && (st.freeze || st.chill)) { delete st.freeze; delete st.chill; return true; }   // fire thaws instead
  const cur = st[type];
  const dur = opts.t ?? def.dur;
  if (cur) { cur.t = Math.max(cur.t, dur); cur.dps = Math.max(cur.dps, opts.dps ?? def.dps ?? 0); }
  else st[type] = { t: dur, dps: opts.dps ?? def.dps ?? 0, acc: 0 };
  return true;
}

export function clearStatus(t, group) {
  if (!t.statuses) return;
  for (const k of group === 'all' ? Object.keys(t.statuses) : (CURES[group] || [group])) delete t.statuses[k];
}

// Combined effect of everything on a target.
export function statusMods(t) {
  const m = { speed: 1, takenMul: 1, act: true, flee: false };
  const st = t.statuses;
  if (!st) return m;
  for (const [k, v] of Object.entries(st)) {
    const d = STATUS[k];
    if (!v || !d) continue;
    if (d.speed != null) m.speed = Math.min(m.speed, k === 'chill' ? 1 - (1 - d.speed) * v.stacks / 2 : d.speed);
    if (d.takenMul) m.takenMul *= d.takenMul;
    if (d.act === false) m.act = false;
    if (d.flee) m.flee = true;
  }
  return m;
}

// Advance timers and deal damage-over-time. `moving` makes bleed worse.
export function tickStatuses(t, dt, moving = false) {
  const st = t.statuses;
  if (!st) return;
  for (const k of Object.keys(st)) {
    const v = st[k], d = STATUS[k];
    v.t -= dt;
    if (d.dot) {
      v.acc += dt;
      if (v.acc >= d.tick) {
        v.acc -= d.tick;
        const n = Math.max(1, Math.round(v.dps * d.tick * (moving && d.movingMul ? d.movingMul : 1)));
        t.statusHit?.(n, d.col, k);
        if (t.dead || t.mode === 'dead') return;
      }
    }
    if (v.t <= 0) delete st[k];
  }
}

// Short labels for the HUD / debug: [[text, colour], ...]
export function statusList(t) {
  const out = [];
  for (const [k, v] of Object.entries(t.statuses || {})) out.push([STATUS[k].name + (k === 'chill' ? ' ' + v.stacks : ''), STATUS[k].col]);
  return out;
}

// Statuses a creature's cfg.inflicts can put on a victim: [{ type, chance, t, dps }]
export function inflictOn(victim, list) {
  if (!list) return;
  for (const s of list) if (Math.random() < (s.chance ?? 1)) applyStatus(victim, s.type, { t: s.t, dps: s.dps });
}

// Elements imply statuses for hits that did not ask for one.
export const ELEMENT_STATUS = { fire: { type: 'burn', chance: 0.35 }, frost: { type: 'chill', chance: 1 }, shock: { type: 'shock', chance: 0.5 } };
