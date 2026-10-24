// CB21: each boss's own signature move, its scripted strings, and (for the three-phase bosses) a new rule for the last phase.
// CB26: on Hard the signature comes from the first phase and strings are more frequent.
// Boss.js calls planAttack (pick), fireSig (the move), afterFire (the phase-3 rule) and trackPlayer (for path-following moves).
import Projectile from './Projectile.js';
import { TUNE } from '../data/tuning.js';
import { settings } from '../systems/settings.js';
import { sfx } from '../audio/sfx.js';
import { enemyTimer } from './bulletTime.js';

const T = () => TUNE.combat.sig;
const base = (b) => (b.B.spikes || b.B.slam || b.B.tail || b.B.nova).dmg;
const zone = (b, x, y, r, delay, dmg) => { if (!b.scene.solidAt(x, y)) b.scene.addZone(x, y, r, delay, dmg, b); };
const line = (b, x0, y0, ang, n, step, r, d0, dd, dmg, from = 1) => { for (let i = from; i < from + n; i++) zone(b, x0 + Math.cos(ang) * i * step, y0 + Math.sin(ang) * i * step, r, d0 + (i - from) * dd, dmg); };
const ring = (b, cx, cy, R, n, r, delay, dmg, ph = 0) => { for (let i = 0; i < n; i++) { const a = ph + (i / n) * Math.PI * 2; zone(b, cx + Math.cos(a) * R, cy + Math.sin(a) * R, r, delay, dmg); } };
const shot = (b, x, y, vx, vy, dmg, life = 2.4) => { const pr = new Projectile(b.scene, x, y, 'eshot', vx, vy, { dmg, life, owner: b }); b.scene.eshots.add(pr); pr.body.setVelocity(vx, vy); };
const later = (b, s, fn) => enemyTimer(b.scene, s * 1000, () => { if (!b.dead && b.scene) fn(); });     // slowed by a perfect dodge
const toP = (b, p) => Math.atan2(p.y - b.cy, p.x - b.cx);

// name shown as a callout; fire(b, playerCentre)
export const SIGNATURES = {
  boss: { name: 'GRAVE CROWN', fire: (b) => { const d = Math.round(base(b) * 0.8); ring(b, b.cx, b.cy, 44, 8, 14, 0.9, d); ring(b, b.cx, b.cy, 80, 12, 14, 1.4, d, 0.26); } },
  wyrm: { name: 'ICE FURROW', fire: (b, p) => { const a = toP(b, p), d = Math.round(base(b) * 0.8); line(b, b.cx, b.cy, a - 0.35, 7, 20, 13, 0.7, 0.08, d); line(b, b.cx, b.cy, a + 0.35, 7, 20, 13, 0.7, 0.08, d); } },
  warlord: { name: 'IRON MARCH', fire: (b, p) => { const a = toP(b, p), d = Math.round(base(b) * 0.8); for (let row = 1; row <= 3; row++) { const cx = b.cx + Math.cos(a) * row * 30, cy = b.cy + Math.sin(a) * row * 30; line(b, cx - Math.cos(a + Math.PI / 2) * 50, cy - Math.sin(a + Math.PI / 2) * 50, a + Math.PI / 2, 5, 20, 12, 0.5 + row * 0.3, 0, d, 0); } } },
  tide: { name: 'RISING TIDE', fire: (b, p) => { const d = Math.round(base(b) * 0.75); ring(b, p.x, p.y, 84, 12, 13, 0.8, d); ring(b, p.x, p.y, 58, 9, 13, 1.15, d, 0.3); ring(b, p.x, p.y, 32, 6, 13, 1.5, d, 0.5); } },
  root: { name: 'ROOT LATTICE', fire: (b, p) => { const d = Math.round(base(b) * 0.8); for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) zone(b, p.x + i * 32, p.y + j * 32, 15, (i + j) % 2 === 0 ? 0.9 : 1.6, d); } },
  winter: { name: 'FROZEN ORBIT', fire: (b, p) => { const n = 12, d = Math.round(b.B.nova.dmg); for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; shot(b, p.x + Math.cos(a) * 96, p.y + Math.sin(a) * 96, -Math.cos(a) * 58, -Math.sin(a) * 58, d, 2.6); } } },
  dragon: { name: 'SKYFALL', fire: (b, p) => { const a = toP(b, p) + Math.PI / 2, d = Math.round(base(b) * 0.8); line(b, p.x - Math.cos(a) * 100, p.y - Math.sin(a) * 100, a, 9, 22, 15, 0.8, 0.12, d, 0); } },
  kragnar: { name: 'LODE RUPTURE', fire: (b, p) => { const d = Math.round(base(b) * 0.85); zone(b, p.x, p.y, 15, 0.9, d); for (let k = 0; k < 4; k++) line(b, p.x, p.y, k * Math.PI / 2, 3, 24, 13, 1.0, 0.12, d); } },
  sovereign: { name: 'PYRE CROSS', fire: (b, p) => { const d = Math.round(base(b) * 0.8), x = p.x, y = p.y; for (let k = 0; k < 4; k++) line(b, x, y, Math.PI / 4 + k * Math.PI / 2, 3, 24, 13, 0.85, 0.1, d); zone(b, x, y, 15, 0.85, d); later(b, 0.9, () => { for (let k = 0; k < 4; k++) line(b, x, y, k * Math.PI / 2, 3, 24, 13, 0.75, 0.1, d); }); } },
  admiral: { name: 'ANCHOR DROP', fire: (b, p) => { const d = Math.round(base(b) * 0.9), x = p.x, y = p.y; zone(b, x, y, 34, 1.0, d); later(b, 1.0, () => { for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; shot(b, x, y, Math.cos(a) * 80, Math.sin(a) * 80, Math.round(d * 0.5)); } }); } },
  hollowking: { name: 'THE COURT', then: ['sweep'], fire: (b, p) => { const a = toP(b, p), px = Math.cos(a + Math.PI / 2), py = Math.sin(a + Math.PI / 2), d = Math.round(base(b) * 0.8); for (const s of [-1, 1]) line(b, p.x + px * s * 30 - Math.cos(a) * 45, p.y + py * s * 30 - Math.sin(a) * 45, a, 5, 22, 13, 0.75, 0.05, d, 0); } },
  miremother: { name: 'TEARS', fire: (b) => { const d = Math.round(b.B.nova.dmg); for (let w = 0; w < 3; w++) later(b, w * 0.3, () => { for (let i = 0; i < 8; i++) { const a = w * 0.26 + (i / 8) * Math.PI * 2; shot(b, b.cx, b.cy, Math.cos(a) * 82, Math.sin(a) * 82, d); } sfx.play('frost'); }); } },
  stormgiant: { name: 'CHAIN LIGHTNING', fire: (b, p) => { const tr = (b.trail || []).slice(-6), d = Math.round(base(b) * 0.75); (tr.length ? tr : [p]).forEach((q, i) => zone(b, q.x, q.y, 15, 0.6 + i * 0.12, d)); zone(b, p.x, p.y, 15, 0.6 + tr.length * 0.12 + 0.1, d); b.scene.flashScreen?.(40, 220, 235, 255); } },
  hartking: { name: 'GLASS CORRIDOR', then: ['charge'], fire: (b, p) => { const a = toP(b, p), px = Math.cos(a + Math.PI / 2), py = Math.sin(a + Math.PI / 2), d = Math.round(base(b) * 0.8); for (const s of [-1, 1]) line(b, b.cx + px * s * 28, b.cy + py * s * 28, a, 7, 20, 12, 1.1, 0.04, d); } },
  lodecolossus: { name: 'SEISMIC STOMP', fire: (b) => { const d = Math.round(base(b) * 0.75); ring(b, b.cx, b.cy, 30, 8, 15, 0.7, d); ring(b, b.cx, b.cy, 60, 12, 15, 1.0, d, 0.2); ring(b, b.cx, b.cy, 90, 16, 15, 1.3, d, 0.1); } },
  brinegut: { name: 'HARPOON', then: ['slam'], fire: (b, p, pl) => { const a = toP(b, p); shot(b, b.cx, b.cy, Math.cos(a) * 170, Math.sin(a) * 170, Math.round(b.B.volley.dmg * 0.6), 1.2); pl.body.setVelocity(-Math.cos(a) * T().pull, -Math.sin(a) * T().pull); b.scene.fx.text(pl.x, pl.y - 20, 'HOOKED', 11, 0.6); } },
  blightmother: { name: 'SPORE BLOOM', fire: (b, p) => { const d = Math.round(base(b) * 0.7); for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.4, x = p.x + Math.cos(a) * 40, y = p.y + Math.sin(a) * 40; zone(b, x, y, 16, 1.0, d); later(b, 1.0, () => { for (let k = 0; k < 4; k++) { const q = k * Math.PI / 2 + a; shot(b, x, y, Math.cos(q) * 70, Math.sin(q) * 70, Math.round(d * 0.5), 1.4); } }); } } },
  vaultsovereign: { name: 'SUN DIAL', fire: (b, p) => { const a0 = toP(b, p) - 0.9, d = Math.round(base(b) * 0.75); for (let k = 0; k < 5; k++) line(b, b.cx, b.cy, a0 + k * 0.45, 5, 22, 12, 0.8 + k * 0.25, 0.02, d); } },
};

// two or three scripted strings per boss, from its own moves
const STRINGS = {
  boss: [['sweep', 'sweep', 'slam'], ['volley', 'slam']],
  wyrm: [['tail', 'breath'], ['spikes', 'charge']],
  warlord: [['sweep', 'sweep', 'slam'], ['leap', 'tail']],
  tide: [['spikes', 'breath'], ['tail', 'spikes']],
  root: [['spikes', 'tail'], ['breath', 'spikes']],
  winter: [['sweep', 'slam', 'tail'], ['leap', 'nova']],
  dragon: [['tail', 'sweep'], ['breath', 'spikes'], ['charge', 'tail']],
  kragnar: [['slam', 'slam', 'tail'], ['leap', 'spikes']],
  sovereign: [['sweep', 'sweep', 'slam'], ['leap', 'nova'], ['breath', 'charge']],
  admiral: [['sweep', 'slam'], ['volley', 'leap']],
  hollowking: [['sweep', 'slam', 'sweep'], ['leap', 'nova']],
  miremother: [['sweep', 'tail'], ['breath', 'spikes']],
  stormgiant: [['slam', 'sweep'], ['leap', 'nova'], ['volley', 'charge']],
  hartking: [['charge', 'charge'], ['sweep', 'slam'], ['leap', 'spikes']],
  lodecolossus: [['slam', 'slam', 'tail'], ['leap', 'spikes']],
  brinegut: [['volley', 'charge'], ['sweep', 'slam']],
  blightmother: [['sweep', 'tail'], ['volley', 'spikes']],
  vaultsovereign: [['slam', 'sweep'], ['charge', 'leap'], ['nova', 'spikes']],
};

// the last phase's new rule: echo (slams and tails strike again at the same spot), trail (charges leave bursts behind),
// sigOften (the signature comes twice as often and is followed by a string)
const RULE3 = { winter: 'echo', dragon: 'trail', sovereign: 'echo', hollowking: 'sigOften', stormgiant: 'trail', hartking: 'trail', lodecolossus: 'echo', vaultsovereign: 'sigOften' };

const hard = () => settings.difficulty === 'hard';
export const sigOf = (b) => SIGNATURES[b.kind] || null;
export const rule3 = (b) => (b.bphase >= 3 ? RULE3[b.kind] || null : null);

// The next move: the rest of a string, the signature when it is due, or (sometimes) the start of a string. null = the pool.
export function planAttack(b, opts) {
  const sc = b.scene, sig = sigOf(b), ST = T();
  if (b.queue?.length) { const a = b.queue.shift(); if (a === 'sig' || b.B[a]) return a; }
  b.sigReady ??= sc.t + ST.first;
  if (sig && b.bphase >= (hard() ? 1 : ST.fromPhase) && sc.t >= b.sigReady) {
    b.sigReady = sc.t + ST.cd * (rule3(b) === 'sigOften' ? 0.5 : 1);
    b.queue = [...(sig.then || [])];
    if (rule3(b) === 'sigOften') b.queue.push(...pickString(b, opts) || []);
    return 'sig';
  }
  const strs = STRINGS[b.kind];
  if (strs && Math.random() < (hard() ? ST.stringHard : ST.string)) {
    const s = pickString(b, opts);
    if (s) { b.queue = s.slice(1); return s[0]; }
  }
  return null;
}
function pickString(b, opts) {
  const ok = (STRINGS[b.kind] || []).filter((s) => s.every((a) => b.B[a]) && opts.includes(s[0]));
  return ok.length ? [...ok[Math.floor(Math.random() * ok.length)]] : null;
}

export function fireSig(b, player) {
  const sig = sigOf(b), sc = b.scene;
  b.setState('attack', 0.4);
  if (!sig) return;
  sfx.play('roar'); sc.shake(200, 0.008);
  sc.fx.text(b.x, b.y - 34, sig.name, 13, 1.1);
  sig.fire(b, player.body.center, player);
}

// the phase-3 rules, after a move fires
export function afterFire(b, a) {
  const r = rule3(b), sc = b.scene;
  if (r === 'echo') {
    if (a === 'slam') { const c = b.slamCenter(); later(b, 0.1, () => sc.addZone(c.x, c.y, b.B.slam.r, T().echo, b.B.slam.dmg, b)); }
    if (a === 'tail' && b.B.tail) { const x = b.cx, y = b.cy + 4; later(b, 0.1, () => sc.addZone(x, y, b.B.tail.r, T().echo, b.B.tail.dmg, b)); }
  } else if (r === 'trail' && a === 'charge') {
    const n = 5, dc = b.dashCfg();
    for (let i = 1; i <= n; i++) later(b, (dc.time * i) / n, () => zone(b, b.cx, b.cy, 14, T().trail, Math.round(dc.dmg * 0.6)));
  }
}

// a short memory of where the player has been (for moves that follow your path)
export function trackPlayer(b, player, dt) {
  if (b.kind !== 'stormgiant') return;
  b.trailT = (b.trailT || 0) - dt;
  if (b.trailT > 0) return;
  b.trailT = 0.2;
  (b.trail ||= []).push({ x: player.body.center.x, y: player.body.center.y });
  if (b.trail.length > 8) b.trail.shift();
}
