// Round 8: dungeon set pieces. Mixed into GameScene.
//   spiketrap: strips of floor that cycle idle -> warning (red) -> strike; the warning is always 0.7 s so a roll or a run beats it
//   mire:      a flooded hall that slows you to 55% (the leeches like it)
//   ambush:    a trigger room: step in and the room fills with foes (once per dungeon)
import { T, C } from '../config.js';
import { S } from '../systems/state.js';
import { bus } from '../systems/bus.js';
import { sfx, music } from '../audio/sfx.js';
import { TUNE } from '../data/tuning.js';

const PHASE = { idle: 1.1, warn: 0.7, strike: 0.3 };

export const setPieceMethods = {
  initSetPieces() { this.spikeTraps = []; this.mires = []; this.ambushes = []; },
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
