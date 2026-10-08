// Round 8: dungeon set pieces. Mixed into GameScene.
//   spiketrap: strips of floor that cycle idle -> warning (red) -> strike; the warning is always 0.7 s so a roll or a run beats it
//   mire:      a flooded hall that slows you to 55% (the leeches like it)
//   crumble:   cracked floor that shakes when stepped on, then drops away for a few seconds (a fall hurts)
//   ambush:    a trigger room: step in and the room fills with foes (once per dungeon)
import { T, C } from '../config.js';
import { S } from '../systems/state.js';
import { bus } from '../systems/bus.js';
import { sfx, music } from '../audio/sfx.js';
import { TUNE } from '../data/tuning.js';

const PHASE = { idle: 1.1, warn: 0.7, strike: 0.3 };

export const setPieceMethods = {
  initSetPieces() { this.spikeTraps = []; this.mires = []; this.ambushes = []; this.crumbles = []; },
  addSetPiece(e, wx, wy) {
    if (e.t === 'spiketrap') {
      const g = this.add.graphics().setDepth(3);
      this.spikeTraps.push({ x0: e.x * T, y0: e.y * T, w: e.w * T, h: e.h * T, g, phase: 'idle', t: (e.offset || 0), drawn: '', dmg: e.dmg || 12, tier: e.tier || 0 });
    } else if (e.t === 'mire') {
      const g = this.add.graphics().setDepth(1);
      const r = { x0: e.x * T, y0: e.y * T, w: e.w * T, h: e.h * T };
      g.fillStyle(0x0c2a24, 0.62); g.fillRect(r.x0, r.y0, r.w, r.h);
      g.fillStyle(0x3f7050, 0.5); for (let i = 0; i < r.w * r.h / 90; i++) g.fillRect(r.x0 + ((i * 37) % r.w), r.y0 + ((i * 53) % r.h), 3, 1);
      this.mires.push(r);
    } else if (e.t === 'crumble') {
      const g = this.add.graphics().setDepth(2), cells = [];
      for (let ty = 0; ty < (e.h || 1); ty++) for (let tx = 0; tx < e.w; tx++) cells.push({ x: (e.x + tx) * T, y: (e.y + ty) * T, st: 0, t: 0, drawn: -1 });
      this.crumbles.push({ g, cells, tier: e.tier || 0 });
    } else if (e.t === 'ambush') {
      this.ambushes.push({ x0: e.x * T, y0: e.y * T, w: e.w * T, h: e.h * T, kinds: e.kinds || ['bandit'], n: e.n || 4, tier: e.tier || 0, key: `amb_${this.mapId}_${e.x}_${e.y}`, done: !!S.flags[`amb_${this.mapId}_${e.x}_${e.y}`] });
    }
  },
  // 1 normally, 0.55 inside a flooded hall
  mireMul() {
    const p = this.player;
    for (const r of this.mires) if (p.x > r.x0 && p.x < r.x0 + r.w && p.y > r.y0 && p.y < r.y0 + r.h) return 0.55;
    return 1;
  },
  setPieceTick(dt) {
    const p = this.player;
    for (const s of this.spikeTraps) {
      if (Math.abs(p.x - (s.x0 + s.w / 2)) > s.w / 2 + 170 || Math.abs(p.y - (s.y0 + s.h / 2)) > s.h / 2 + 130) continue;       // far away: asleep
      s.t += dt;
      const cycle = PHASE.idle + PHASE.warn + PHASE.strike, k = s.t % cycle;
      const ph = k < PHASE.idle ? 'idle' : k < PHASE.idle + PHASE.warn ? 'warn' : 'strike';
      const flash = ph === 'warn' ? (Math.floor(s.t * 10) % 2 ? 'a' : 'b') : '';
      if (ph + flash !== s.drawn) {
        s.drawn = ph + flash; const g = s.g; g.clear();
        for (let ty = 0; ty < s.h / T; ty++) for (let tx = 0; tx < s.w / T; tx++) {
          const x = s.x0 + tx * T, y = s.y0 + ty * T;
          if (ph === 'idle') { g.fillStyle(C[1], 0.8); g.fillRect(x + 3, y + 4, 1, 1); g.fillRect(x + 11, y + 4, 1, 1); g.fillRect(x + 3, y + 11, 1, 1); g.fillRect(x + 11, y + 11, 1, 1); }
          else if (ph === 'warn') { g.fillStyle(C[11], flash === 'a' ? 0.45 : 0.22); g.fillRect(x + 1, y + 1, T - 2, T - 2); g.fillStyle(C[1], 0.9); g.fillRect(x + 3, y + 8, 2, 2); g.fillRect(x + 11, y + 8, 2, 2); }
          else { g.fillStyle(C[0]); g.fillRect(x, y + 14, T, 2); for (const sx of [2, 6, 10]) { g.fillStyle(C[5]); g.fillRect(x + sx, y + 3, 3, 11); g.fillStyle(C[6]); g.fillRect(x + sx + 1, y + 1, 1, 4); } }
        }
        if (ph === 'strike') {
          sfx.play('spike'); this.shake(120, 0.004);
          if (p.x > s.x0 - 2 && p.x < s.x0 + s.w + 2 && p.y + 4 > s.y0 && p.y + 4 < s.y0 + s.h && p.mode !== 'dead') p.hurt(s.dmg * (1 + 0.13 * s.tier), p.x, s.y0 + s.h / 2, { kb: 60 });
        }
      }
    }
    for (const cr of this.crumbles) {
      for (const c of cr.cells) {
        if (Math.abs(p.x - c.x) > 200 || Math.abs(p.y - c.y) > 160) continue;
        const on = p.x > c.x - 2 && p.x < c.x + T + 2 && p.y + 4 > c.y && p.y + 4 < c.y + T && p.mode !== 'dead';
        if (c.st === 0 && on && p.mode !== 'roll') { c.st = 1; c.t = 0.7; }
        else if (c.t > 0) {
          c.t -= dt;
          if (c.t <= 0) {
            if (c.st === 1) { c.st = 2; c.t = 4; sfx.play('spike'); if (on && p.mode !== 'roll') p.hurt(14 * (1 + 0.13 * cr.tier), c.x + 8, c.y + 8, { kb: 40 }); }
            else { c.st = 0; }
          }
        }
        const flash = c.st === 1 ? 10 + (Math.floor(c.t * 14) % 2) : c.st;
        if (flash !== c.drawn) {
          c.drawn = flash;
          cr.dirty = true;
        }
      }
      if (cr.dirty) {
        cr.dirty = false; const g = cr.g; g.clear();
        for (const c of cr.cells) {
          if (c.st === 2) { g.fillStyle(C[0]); g.fillRect(c.x, c.y, T, T); g.fillStyle(C[1], 0.5); g.fillRect(c.x + 2, c.y + T - 3, T - 4, 2); }
          else { const sh = c.st === 1 ? (Math.floor(c.t * 14) % 2) : 0; g.fillStyle(C[1], 0.7); g.fillRect(c.x + 3, c.y + 4 + sh, 1, 7); g.fillRect(c.x + 4, c.y + 8 + sh, 5, 1); g.fillRect(c.x + 9, c.y + 3 + sh, 1, 6); if (c.st === 1) { g.fillStyle(C[11], 0.3); g.fillRect(c.x, c.y, T, T); } }
        }
      }
    }
    for (const a of this.ambushes) {
      if (a.done || p.x < a.x0 || p.x > a.x0 + a.w || p.y < a.y0 || p.y > a.y0 + a.h) continue;
      a.done = true; S.flags[a.key] = true;
      let made = 0;
      for (let i = 0; i < a.n * 8 && made < a.n; i++) {
        const x = a.x0 + 12 + Math.random() * (a.w - 24), y = a.y0 + 12 + Math.random() * (a.h - 24);
        if (Math.hypot(x - p.x, y - p.y) < 40 || this.solidAt(x, y)) continue;
        const en = this.addEnemy(a.kinds[made % a.kinds.length], x, y, { tier: a.tier });
        en.alert(true); this.fx.puff(x, y, 7, 6, 30, 0.4); made++;
      }
      bus.emit('toast', 'AMBUSH!', 11); sfx.play('alert'); music.stinger();
    }
  },
};
