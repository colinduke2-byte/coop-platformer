// Shared behaviour for the companions that fight beside you: Ragna and Pell (Follower), the hound or cub (Hound) and the
// Spirit Wolf. They keep their distance (no more standing inside a foe), strike in a hit-and-run cycle, and can be hurt
// and knocked down. Numbers: TUNE.companion.
//  - allyHit(): a companion's blow. It always says who struck (from, ally) so the rules meant for your own blows (the
//    Duellist's parry, combos, hit-stop...) leave it alone, it never stun-locks a foe, and its number has its own colour.
//  - steer(): the velocity toward a point with a soft push away from foes, you and the other companions.
//  - skirmish(): circle on the far side of a foe, crouch, dart in, strike, spring back out.
//  - vitals: hp, hurt(), the DOWN state and getting back up.
import Phaser from 'phaser';
import { TUNE } from '../data/tuning.js';
import { S } from '../systems/state.js';
import { sfx } from '../audio/sfx.js';
import { norm } from '../util.js';
import { txtS } from '../art/font.js';

const CT = () => TUNE.companion;

// every companion on the map that can act (or is down)
export const companionsOf = (sc) => [sc.follower, sc.hound, sc.spirit].filter((c) => c && c.active && !c.dead && c.body);
export const bodyR = (o) => (o.body ? Math.max(o.body.width, o.body.height) / 2 : 6);
const cx = (o) => (o.body ? o.body.center.x : o.x);
const cy = (o) => (o.body ? o.body.center.y : o.y);
// distance between two bodies' edges (negative: they overlap)
export const gapTo = (a, b) => Math.hypot(cx(b) - cx(a), cy(b) - cy(a)) - bodyR(a) - bodyR(b);

// ---- a companion's blow ------------------------------------------------------------------------------------------------
// info as for Enemy.takeHit. `from` is who struck (an arrow passes its archer). Returns the damage dealt.
export function allyHit(c, e, info, from = c) {
  const sc = c.scene, T = CT();
  const cool = (e.allyStaggerT ?? -99) > sc.t;                      // a companion staggered this foe a moment ago
  const hit = { kx: e.x - c.x, ky: e.y - c.y, src: 'melee', ...info, from, ally: true };
  delete hit.heavy; delete hit.forceStun;                           // a companion's blow is always a light one
  if (cool) { hit.stun = 0; hit.kb = 0; hit.poise = 0.001; hit.noFlinch = true; }
  const stun0 = e.stun || 0, stag0 = e.staggerT || 0;
  const dealt = e.takeHit(hit);
  if (!cool && ((e.stun || 0) > stun0 + 0.01 || (e.staggerT || 0) > stag0)) e.allyStaggerT = sc.t + T.staggerCd;
  e.allyHitAt = sc.t; e.allyHitBy = from;
  if (dealt > 0) { sc.fx.text(e.x, e.y - 10, String(Math.min(dealt, 999)), T.numCol); if (from.active) bark(from, 'strike'); }
  return dealt;
}

// ---- movement ----------------------------------------------------------------------------------------------------------
// Velocity toward (tx, ty) at `speed` (slowing on arrival), plus a soft push out of foes, you and the other companions,
// and a slide along a wall instead of pushing into it.
export function steer(c, tx, ty, speed, arrive = 6) {
  const sc = c.scene, T = CT().sep;
  const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy);
  let vx = 0, vy = 0;
  if (d > 0.5) { const k = speed * Math.min(1, d / Math.max(1, arrive)); vx = (dx / d) * k; vy = (dy / d) * k; }
  const push = (o, gap) => {
    const ox = cx(c) - cx(o), oy = cy(c) - cy(o), od = Math.hypot(ox, oy) || 0.01;
    const want = bodyR(c) + bodyR(o) + gap;
    if (od >= want) return;
    const f = T.push * (1 - od / want);
    vx += (ox / od) * f; vy += (oy / od) * f;
  };
  for (const e of sc.enemies.getChildren()) if (!e.dead && !e.hidden && !e.cfg?.fly && Math.abs(e.x - c.x) < 40 && Math.abs(e.y - c.y) < 40) push(e, T.enemy);
  if (sc.player && sc.player.mode !== 'dead') push(sc.player, T.player);
  for (const o of companionsOf(sc)) if (o !== c) push(o, T.ally);
  const b = c.body;
  if ((b.blocked.left && vx < 0) || (b.blocked.right && vx > 0)) { vx = 0; if (Math.abs(vy) < speed * 0.3) vy = (Math.sign(dy) || (c.slideDir ||= 1)) * speed * 0.7; }
  if ((b.blocked.up && vy < 0) || (b.blocked.down && vy > 0)) { vy = 0; if (Math.abs(vx) < speed * 0.3) vx = (Math.sign(dx) || (c.slideDir ||= 1)) * speed * 0.7; }
  const sp = Math.hypot(vx, vy), cap = speed * 1.4 + 20;
  if (sp > cap) { vx *= cap / sp; vy *= cap / sp; }
  return { vx, vy };
}

// Walk to (tx, ty), around walls on the tile path when the straight line is blocked.
export function goTo(c, tx, ty, speed, dt, arrive = 6) {
  const sc = c.scene;
  if (!sc.clearLine(c.x, c.y, tx, ty, 4)) {
    c.pathT = (c.pathT || 0) - dt;
    if (c.pathT <= 0 || !c.wp) { c.wp = sc.nextWaypoint(c.x, c.y, tx, ty); c.pathT = 0.3; }
    if (c.wp) { tx = c.wp.x; ty = c.wp.y; arrive = 0; }
  } else c.wp = null;
  return steer(c, tx, ty, speed, arrive);
}

// ---- hit and run -------------------------------------------------------------------------------------------------------
// The cycle: 'circle' at striking distance plus TUNE.companion.out, on the side of the foe away from you (Pell: behind it),
// 'wind' (a short crouch, the tell), 'dash' in, strike once at reach, 'back' out about backPx, and round again.
// P: the companion's TUNE block; strike(e, dir) lands the blow. Returns the velocity and the state.
export function skirmish(c, dt, tgt, P, strike, opts = {}) {
  const sc = c.scene, T = CT();
  const k = (c.sk ||= { st: 'circle', t: 0, cd: 0.4, orbit: Math.random() < 0.5 ? 1 : -1, tgt: null });
  if (k.tgt !== tgt) { k.tgt = tgt; if (k.st !== 'back') { k.st = 'circle'; k.t = 0; } }
  k.cd -= dt; k.t -= dt;
  const reachD = bodyR(c) + bodyR(tgt) + P.reach;                   // centre distance at which a blow lands
  const standD = reachD + T.out;
  const ex = cx(tgt), ey = cy(tgt), mx = cx(c), my = cy(c);
  const d = Math.hypot(ex - mx, ey - my);
  const to = norm(ex - mx, ey - my);
  let v = { vx: 0, vy: 0 };
  switch (k.st) {
    case 'circle': {
      // where to stand: on the far side of the foe from you (flanking), or behind its back
      const pl = sc.player;
      let want = Math.atan2(ey - pl.y, ex - pl.x);
      if (opts.back && tgt.face && (tgt.face.x || tgt.face.y)) want = Math.atan2(-tgt.face.y, -tgt.face.x);
      if (Math.hypot(ex - pl.x, ey - pl.y) < 4) want = Math.atan2(my - ey, mx - ex);
      const now = Math.atan2(my - ey, mx - ex);
      let diff = Phaser.Math.Angle.Wrap(want - now);
      k.orbit = Math.abs(diff) > 0.3 ? Math.sign(diff) : k.orbit;
      const step = Math.min(Math.abs(diff), (P.speed / Math.max(standD, 8)) * 0.35);     // swing round the foe, not through it
      let a = now + Math.sign(diff || k.orbit) * step;
      let px = ex + Math.cos(a) * standD, py = ey + Math.sin(a) * standD;
      if (sc.solidAt(px, py)) { k.orbit *= -1; a = now - Math.sign(diff || 1) * step; px = ex + Math.cos(a) * standD; py = ey + Math.sin(a) * standD; }
      v = d > standD + 40 ? goTo(c, px, py, P.speed, dt) : steer(c, px, py, P.speed);
      k.circleT = (k.circleT || 0) + dt;
      const placed = Math.abs(diff) < 0.9 || k.circleT > 1.4;
      if (k.cd <= 0 && placed && d < standD + 10 && sc.hasLOS(mx, my, ex, ey) && !(tgt.hidden)) { k.st = 'wind'; k.t = P.wind; k.circleT = 0; if (opts.windSfx) sfx.play(opts.windSfx, c); }
      break;
    }
    case 'wind': {                                                  // the crouch: still, facing the foe
      v = steer(c, mx, my, 0);
      if (k.t <= 0) { k.st = 'dash'; k.t = (standD + 12) / P.dash + 0.08; k.dir = to; }
      break;
    }
    case 'dash': {
      if (d <= reachD + 1) {                                        // in reach: strike, then spring out
        strike(tgt, to);
        k.st = 'back'; k.t = P.backPx / P.back + 0.05; k.from = { x: c.x, y: c.y }; k.dir = to;
        v = { vx: -to.x * P.back, vy: -to.y * P.back };
        break;
      }
      const sp = Math.min(P.dash, (d - reachD) / Math.max(dt, 1 / 120));     // stop at reach, never inside the foe
      v = { vx: to.x * sp, vy: to.y * sp };
      if (k.t <= 0) { k.st = 'back'; k.t = P.backPx / P.back; k.from = { x: c.x, y: c.y }; k.dir = to; }
      break;
    }
    case 'back': {                                                  // spring back out, then circle again
      const away = norm(mx - ex, my - ey);
      v = steer(c, c.x + away.x * 40, c.y + away.y * 40, P.back, 0);
      const moved = k.from ? Math.hypot(c.x - k.from.x, c.y - k.from.y) : P.backPx;
      if (k.t <= 0 || moved >= P.backPx) { k.st = 'circle'; k.cd = P.cd * (0.85 + Math.random() * 0.3); k.circleT = 0; }
      break;
    }
  }
  return { ...v, st: k.st };
}

// ---- vitals: hp, hurt, down ----------------------------------------------------------------------------------------------
// The interface an enemy needs to treat a companion as its target (Enemy.update reads these from its `player`).
export const victimMethods = {
  get hurtRect() { const b = this.body; return (this._hurtR ||= new Phaser.Geom.Rectangle()).setTo(b.x - 1, b.y - 3, b.width + 2, b.height + 3); },
  get mode() { return this.downed ? 'dead' : this.hurtT > 0 ? 'hurt' : 'free'; },
  get swing() { return this.sk?.st === 'dash' ? true : null; },
  detectMult() { return 1; },
  // A blow on a companion. Returns true when it landed.
  hurt(dmg, sx, sy, opts = {}) {
    if (this.downed || this.dead || !this.active || (this.invuln || 0) > 0) return false;
    const sc = this.scene, T = CT();
    dmg = Math.max(1, Math.round(dmg * T.dmgTaken));
    this.hp = Math.max(0, (this.hp ?? this.maxHp) - dmg);
    this.invuln = 0.35; this.hurtT = T.hurtT;
    const n = norm(this.x - sx, this.y - sy);
    this.body.setVelocity(n.x * (opts.kb ?? 90) * 0.8, n.y * (opts.kb ?? 90) * 0.8);
    this.setTintFill?.(0xffffff); this.flashing = true;
    sc.fx.text(this.x, this.y - 14, String(dmg), 11, 0.6);
    sc.fx.puff(this.x, this.y, 11, 4, 30, 0.25);
    sfx.play('hurt', this);
    if (this.sk) { this.sk.st = 'back'; this.sk.t = 0.25; this.sk.from = { x: this.x, y: this.y }; }
    if (this.hp <= 0) this.goDown();
    else if (this.hp < this.maxHp * 0.35) bark(this, 'hurt');
    return true;
  },
};

// Give a companion its hp and the victim interface. hpShare: a share of your max HP, so it keeps pace with you.
export function initVitals(c, hpShare) {
  for (const [k, d] of Object.entries(Object.getOwnPropertyDescriptors(victimMethods))) if (!(k in c)) Object.defineProperty(c, k, d);
  c.maxHp = Math.max(10, Math.round((S.maxHp || 100) * hpShare));
  c.hp = c.maxHp; c.downed = false; c.downT = 0; c.invuln = 0; c.hurtT = 0;
}

// Per frame, before the companion acts. Returns true while it is down (it must not act).
export function tickVitals(c, dt) {
  c.invuln = (c.invuln || 0) - dt; c.hurtT = (c.hurtT || 0) - dt;
  if (c.flashing && c.hurtT <= 0.15) { c.flashing = false; if (c.baseTint != null) c.setTint(c.baseTint); else c.clearTint(); }
  if (!c.downed) return false;
  c.downT -= dt;
  c.body.setVelocity(0, 0);
  const s = Math.max(0, Math.ceil(c.downT));
  if (c.downLabel) {
    if (c.downLabel.n !== s) { c.downLabel.n = s; c.downLabel.setText('DOWN ' + s); }
    c.downLabel.setPosition(Math.round(c.x - c.downLabel.width / 2), Math.round(c.y - 13)).setDepth(99300);
  }
  if (c.downT <= 0) getUp(c);
  return c.downed;
}

export function goDownCommon(c) {
  const T = CT();
  c.downed = true; c.downT = T.down.t; c.sk = null;
  c.body.setVelocity(0, 0);
  c.downLabel = txtS(c.scene, 0, 0, 'DOWN ' + Math.ceil(T.down.t), 11, 0);
  c.downLabel.n = Math.ceil(T.down.t);
  c.scene.fx.puff(c.x, c.y + 4, 5, 8, 40, 0.4);
  for (const e of c.scene.enemies.getChildren()) if (e.foe === c) e.foe = null;
  bark(c, 'down', true);
}

export function getUp(c) {
  const T = CT();
  c.downed = false; c.downT = 0;
  c.hp = Math.max(1, Math.round(c.maxHp * T.down.upHp)); c.invuln = T.down.invuln;
  c.downLabel?.destroy(); c.downLabel = null;
  c.setAngle?.(0); c.setAlpha?.(c.baseAlpha ?? 1);
  c.scene.fx.puff(c.x, c.y, 13, 6, 30, 0.4); c.scene.fx.ring(c.x, c.y + 4, 0.5, 0.3, 'ring', 0xf4d460);
  sfx.play('heal', c);
  bark(c, 'up', true);
}

// ---- barks ------------------------------------------------------------------------------------------------------------------
const BARKS = {
  ragna: { strike: ['GOT HIM', 'ONE MORE', 'ARROW AWAY'], hold: ['YOU ARE IN MY WAY', 'STEP ASIDE', 'NO CLEAR SHOT'], hurt: ['I AM HIT'], down: ['RAGNA IS DOWN'], up: ['UP AGAIN', 'STILL HERE'] },
  pell: { strike: ['TOO SLOW', 'BEHIND YOU', 'QUICK HANDS'], hurt: ['OUCH, OUCH'], down: ['PELL IS DOWN'], up: ['BACK IN IT', 'NOT DEAD YET'] },
  hound: { down: ['THE HOUND IS DOWN'], up: ['THE HOUND RISES'] },
  cub: { down: ['THE CUB IS DOWN'], up: ['THE CUB GETS UP'] },
};
// A short line over the companion now and then (always for a must: going down, getting up).
export function bark(c, kind, must = false) {
  const sc = c.scene, T = CT().bark, set = BARKS[c.kind];
  const lines = set?.[kind];
  if (!lines) return;
  if (!must && (Math.random() > T.chance || sc.t - (c.lastBark ?? -99) < T.gap)) return;
  c.lastBark = sc.t;
  sc.fx.text(c.x, c.y - 22, lines[Math.floor(Math.random() * lines.length)], CT().numCol, 1.1);
}
