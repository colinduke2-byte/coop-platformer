// Arena run: trial modes, waves, boons.
// Mixed into GameScene (see the bottom of scenes/GameScene.js).
import { makeGenItem } from '../systems/genloot.js';
import { C } from '../config.js';
import { S } from '../systems/state.js';
import { bus } from '../systems/bus.js';
import { recalc } from '../systems/stats.js';
import Pickup from '../entities/Pickup.js';
import { maybeRelic } from '../systems/relics.js';
import { arenaWave } from '../world/arena.js';
import { runScript, choose } from '../systems/dialogue.js';
import { sfx } from '../audio/sfx.js';
import { modMul, BOONS, BOON_IDS } from '../data/mods.js';

export const arenaMethods = {
  // ---- the Hollow Arena
  startArena(mode = 'classic') {
    S.boons = {}; recalc();
    this.arena = { active: true, wave: 1, t: 3, foes: [], mode, offering: false };
    bus.emit('toast', 'THE TRIAL BEGINS!', 13); sfx.play('roar');
  },
  endArena(yield_ = false) {
    if (!this.arena) return;
    const done = this.arena.cleared || 0;
    this.arena.active = false; S.boons = {}; recalc();
    for (const e of this.arena.foes) if (e.active && !e.dead) e.despawn?.();
    this.arena.foes = [];
    bus.emit('toast', yield_ ? `YOU YIELD AT WAVE ${done}` : `WAVES CLEARED: ${done}`, 13);
  },
  // Between waves of the Boon Trial and the Gauntlet: pick one of three boons, which last until the trial ends.
  offerBoons(a) {
    a.offering = true;
    const pool = BOON_IDS.slice(), opts = [];
    while (opts.length < 3) opts.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    runScript(async () => {
      const c = await choose(opts.map((id) => `${BOONS[id].name}: ${BOONS[id].desc}`));
      const id = opts[c] || opts[0];
      S.boons = { ...(S.boons || {}), [id]: ((S.boons || {})[id] || 0) + 1 };
      recalc();
      if (BOONS[id].waveHeal || S.boons.lifeblood) S.hp = Math.min(S.maxHp, S.hp + S.maxHp * (BOONS.lifeblood.waveHeal * (S.boons.lifeblood || 0)));
      bus.emit('toast', `BOON: ${BOONS[id].name.toUpperCase()}`, 14); sfx.play('quest');
      a.offering = false; a.t = 3;
    });
  },
  arenaTick(dt) {
    const a = this.arena;
    if (!a || !a.active || this.player.mode === 'dead') return;
    a.foes = a.foes.filter((e) => e.active && !e.dead);
    if (a.foes.length || a.offering) return;
    if (a.cleared !== a.wave - 1) {
      // the previous wave just fell
      if (a.wave > 1) {
        const w = a.wave - 1;
        S.arena ||= { best: 0 };
        S.arena.best = Math.max(S.arena.best || 0, w);
        S.arena.modes = S.arena.modes || {}; S.arena.modes[a.mode] = Math.max(S.arena.modes[a.mode] || 0, w);
        const gold = Math.round((20 + w * 12) * modMul('goldMul') * (a.mode === 'gauntlet' ? 1.4 : 1));
        S.gold += gold;
        bus.emit('toast', `WAVE ${w} CLEARED  +${gold} GOLD`, 13); sfx.play('quest');
        if (w % 3 === 0 || w % 5 === 0) this.pickups.push(new Pickup(this, this.player.x, this.player.y - 14, { type: 'item', id: makeGenItem(Math.min(3, Math.floor(w / 3)), Math.random, w % 5 === 0 ? 1 : null) }));
        if (w % 5 === 0) maybeRelic(this, 0.35);
      }
      a.cleared = a.wave - 1;
      a.t = 4;
      if (a.mode !== 'classic' && a.wave > 1) { this.offerBoons(a); return; }
    }
    a.t -= dt;
    if (a.t > 0) return;
    const foes = arenaWave(a.wave, Math.random, a.mode);
    const pts = [[4, 11], [27, 11], [16, 4], [8, 5], [24, 5], [5, 17], [26, 17], [16, 8]];
    foes.forEach((f, i) => {
      const [tx, ty] = pts[i % pts.length];
      const e = this.addEnemy(f.kind, tx * 16 + 8, ty * 16 + 8, { tier: f.tier, elite: f.elite });
      e.alert(true);
      a.foes.push(e);
    });
    bus.emit('toast', foes.some((f) => f.elite) ? `WAVE ${a.wave}: A CHAMPION APPEARS!` : `WAVE ${a.wave}`, foes.some((f) => f.elite) ? 11 : 15);
    sfx.play('roar');
    a.wave++;
  },
  // Arena reacts when the boss enrages: red light, harsher darkness.
  arenaPhase(n) {
    if (n === 2) {
      this.ambientOverride = { color: 0x2a0710, alpha: Math.max(0.45, this.def.dim || 0) };
      for (const l of this.lights) l.l.setTint(C[11]);
    }
  },
};
