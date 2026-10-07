// Arena Mode run logic, mixed into GameScene: combo meter, orbs, wave twists, room hazards, Boss Rush.
// The wave loop itself is world/arenaRun.js; it calls the hooks below (onQuickFoe, quickWaveHook, quickApplyTwist...).
import Phaser from 'phaser';
import { S } from '../systems/state.js';
import { bus } from '../systems/bus.js';
import { sfx, music } from '../audio/sfx.js';
import { C } from '../config.js';
import { recalc } from '../systems/stats.js';
import { modMul } from '../data/mods.js';
import { BOSS_CLASS } from '../world/sceneConsts.js';
import Pickup from '../entities/Pickup.js';

export const COMBO_WINDOW = 3;
export const comboMult = (n) => Math.min(3, 1 + Math.floor(Math.max(0, n - 1) / 4) * 0.25);
// Easiest to hardest. Looping past the last one repeats them with tougher bosses.
export const RUSH_ORDER = ['wyrm', 'warlord', 'tide', 'root', 'kragnar', 'admiral', 'dragon', 'sovereign', 'winter', 'hollowking'];

export const TWISTS = {
  fast: { name: 'FAST FOES', col: 12 },
  armoured: { name: 'ARMOURED FOES', col: 6 },
  bloodmoon: { name: 'BLOOD MOON', col: 11 },
  darkness: { name: 'DARKNESS', col: 15 },
  swarm: { name: 'SWARM', col: 8 },
  elites: { name: 'DOUBLE CHAMPIONS', col: 13 },
};
const TWIST_IDS = Object.keys(TWISTS);

const ORBS = {
  health: { col: '#e0384a', hi: '#ff9aa0' },
  stamina: { col: '#38b8e0', hi: '#a0ecff' },
  rage: { col: '#f08a2a', hi: '#ffd07a' },
  bomb: { col: '#c070f0', hi: '#ecc0ff' },
};
export function ensureOrbTextures(scene) {
  for (const [k, o] of Object.entries(ORBS)) {
    const key = 'orb_' + k;
    if (scene.textures.exists(key)) continue;
    const c = scene.textures.createCanvas(key, 10, 10), x = c.context;
    x.fillStyle = '#0b0e1a'; x.beginPath(); x.arc(5, 5, 5, 0, 7); x.fill();
    x.fillStyle = o.col; x.beginPath(); x.arc(5, 5, 4, 0, 7); x.fill();
    x.fillStyle = o.hi; x.fillRect(3, 3, 2, 2);
    c.refresh();
  }
}

export const quickMethods = {
  // ---- start: set up the run state, then the wave loop or the boss rush
  startQuick() {
    const q = S.quick;
    ensureOrbTextures(this);
    Object.assign(q, { combo: 0, comboT: 0, pts: 0, rageT: 0, bossBeat: 0, seenHurt: this.player.lastHurt || 0, emberT: 4 });
    const mode = q.mode || 'survival';
    if (mode === 'rush') {
      this.arena = { active: true, wave: 1, t: 3, foes: [], mode: 'rush', offering: false, cleared: 0, boss: null };
      bus.emit('toast', 'THE BOSS RUSH BEGINS!', 13);
    } else {
      this.startArena({ survival: 'classic', boon: 'boon', gauntlet: 'gauntlet', daily: 'classic' }[mode] || 'classic');
      if (mode === 'daily') this.arena.rnd = seededRng(q.daily || 1);
    }
    sfx.play('roar');
  },

  quickTick(dt) {
    const q = S.quick, a = this.arena;
    if (!q || !a || !a.active || this.player.mode === 'dead') return;
    // the combo drains with time and breaks when you are hit
    if (this.player.lastHurt !== q.seenHurt) { q.seenHurt = this.player.lastHurt; if (q.combo >= 5) bus.emit('toast', 'COMBO LOST', 11); q.combo = 0; }
    if (q.combo > 0) { q.comboT -= dt; if (q.comboT <= 0) q.combo = 0; }
    if (q.rageT > 0) { q.rageT -= dt; if (q.rageT <= 0) { q.rageT = 0; bus.emit('toast', 'RAGE ENDS', 4); } }
    if (this.def.hazard === 'embers') this.emberTick(dt);
  },

  // ---- a foe fell: combo, score and orbs
  onQuickFoe(e) {
    const q = S.quick;
    if (!q) return;
    q.combo++; q.comboT = COMBO_WINDOW;
    q.pts += Math.round(10 * comboMult(q.combo));
    if (q.combo === 5 || q.combo === 9 || q.combo === 13) { bus.emit('toast', `COMBO x${comboMult(q.combo).toFixed(2).replace(/0$/, '')}`, 13); sfx.play('quest'); }
    const champ = e.champion || e.spec?.elite || e.elite;
    const chance = (champ ? 1 : 0.2) * modMul('dropMul', 1);
    const n = champ ? 2 : 1;
    for (let i = 0; i < n; i++) if (Math.random() < chance) this.dropOrb(e.x + (i ? 8 : 0), e.y);
  },
  dropOrb(x, y, kind = null) {
    const roll = Math.random();
    const k = kind || (roll < 0.4 ? 'health' : roll < 0.65 ? 'stamina' : roll < 0.85 ? 'rage' : 'bomb');
    this.pickups.push(new Pickup(this, x, y, { type: 'orb', kind: k }));
  },
  collectOrb(kind) {
    const p = this.player;
    if (kind === 'health') { S.hp = Math.min(S.maxHp, S.hp + S.maxHp * 0.3); bus.emit('toast', 'HEALTH', 11); }
    else if (kind === 'stamina') { S.sp = S.maxSp; S.mp = Math.min(S.maxMp, S.mp + S.maxMp * 0.5); bus.emit('toast', 'STAMINA AND MANA', 15); }
    else if (kind === 'rage') { S.quick.rageT = 12; bus.emit('toast', 'RAGE: +40% DAMAGE FOR 12 S', 12); }
    else if (kind === 'bomb') {
      bus.emit('toast', 'BOMB!', 13); sfx.play('nova'); this.shake(300, 0.012);
      this.fx.ring(p.x, p.y, 3.2, 0.5, 'ring', C[13]);
      for (const e of this.enemies.getChildren()) {
        if (e.dead || !e.active || Math.hypot(e.x - p.x, e.y - p.y) > 78) continue;
        e.takeHit({ dmg: e.isBoss ? 40 : 60, kx: e.x - p.x, ky: e.y - p.y, kb: 220, src: 'bomb' });
      }
    }
  },

  // ---- wave twists: a modifier on some waves, announced as the wave starts
  quickWaveHook(a, foes) {
    a.twist = null;
    if (!S.quick) return;
    if (a.mode === 'gauntlet' || a.wave < 3) return;
    const rnd = a.rnd || Math.random;
    if (a.wave % 3 !== 0 && rnd() > 0.25) return;
    a.twist = TWIST_IDS[Math.floor(rnd() * TWIST_IDS.length)];
    const tier = Math.min(3, Math.floor((a.wave - 1) / 3));
    if (a.twist === 'swarm') for (let i = 0; i < Math.min(6, 2 + Math.floor(a.wave / 3)); i++) foes.push({ kind: foes[Math.floor(rnd() * foes.length)].kind, tier, elite: false });
    if (a.twist === 'elites') for (const k of ['knight', 'bear']) foes.push({ kind: k, tier: Math.min(3, tier + 1), elite: true });
    if (a.twist === 'darkness') this.ambientOverride = { color: 0x04050c, alpha: 0.6 };
    bus.emit('toast', `TWIST: ${TWISTS[a.twist].name}`, TWISTS[a.twist].col);
  },
  quickApplyTwist(e) {
    if (!S.quick) return;
    const t = this.arena?.twist;
    if (!t || e.isBoss) return;
    if (t === 'fast') e.cfg = { ...e.cfg, speed: e.cfg.speed * 1.35, chase: e.cfg.chase * 1.35 };
    else if (t === 'armoured') { e.maxHp = Math.round(e.maxHp * 1.6); e.hp = e.maxHp; }
    else if (t === 'bloodmoon') e.cfg = { ...e.cfg, dmg: Math.round(e.cfg.dmg * 1.3) };
  },
  quickWaveCleared(w) {
    const a = this.arena;
    if (a.twist === 'darkness') this.ambientOverride = null;
    a.twist = null;
    // a health orb at the end of every wave, so a hurt hero is never stuck
    this.dropOrb(this.player.x, this.player.y - 12, 'health');
  },

  // ---- Ember Foundry: telegraphed embers fall near you
  emberTick(dt) {
    const q = S.quick, a = this.arena, p = this.player;
    q.emberT -= dt;
    if (q.emberT > 0 || a.offering) return;
    q.emberT = Math.max(1.6, 4.5 - (a.wave || 1) * 0.18) * (0.7 + Math.random() * 0.6);
    for (let i = 0; i < 12; i++) {
      const x = p.x + (Math.random() - 0.5) * 120, y = p.y + (Math.random() - 0.5) * 90;
      if (this.solidAt(x, y)) continue;
      const tele = [this.add.image(x, y, 'disc').setTint(C[12]).setAlpha(0.28).setScale(26 / 32).setDepth(5), this.add.image(x, y, 'ring').setTint(C[12]).setAlpha(0.85).setScale(26 / 32).setDepth(6)];
      this.time.delayedCall(950, () => {
        tele.forEach((t) => t.destroy());
        if (!this.scene.isActive('Game') || this.player.mode === 'dead') return;
        sfx.play('nova'); this.fx.ring(x, y, 1.6, 0.35, 'ring', C[12]); this.fx.puff(x, y, 12, 10, 50, 0.4);
        if (Math.hypot(this.player.x - x, this.player.y - y) < 26) this.player.hurt(12 + (this.arena?.wave || 1), x, y, {});
      });
      break;
    }
  },

  // ---- Boss Rush: one boss at a time, a boon between each
  rushTick(dt) {
    const a = this.arena, q = S.quick;
    if (a.offering) return;
    if (a.boss) {
      const b = a.boss;
      if (!(b.dead || b.yieldDone)) return;
      a.boss = null; this.boss = null; a.cleared++; q.bossBeat = a.cleared; q.pts += 300 + 60 * Math.floor(a.cleared / RUSH_ORDER.length);
      this.ambientOverride = null;
      for (const e of a.foes) if (e.active && !e.dead) e.despawn?.();
      a.foes = [];
      S.hp = Math.min(S.maxHp, S.hp + S.maxHp * 0.35); S.sp = S.maxSp;
      bus.emit('toast', `BOSS ${a.cleared} DOWN`, 13); sfx.play('quest'); music.play('crypt');
      this.offerBoons(a);
      return;
    }
    a.t -= dt;
    if (a.t > 0) return;
    const lap = Math.floor(a.cleared / RUSH_ORDER.length), kind = RUSH_ORDER[a.cleared % RUSH_ORDER.length];
    const B = BOSS_CLASS[kind];
    const b = new B(this, 16 * 16, 7 * 16);
    if (lap > 0) { b.maxHp = Math.round(b.maxHp * (1 + 0.5 * lap)); b.hp = b.maxHp; }
    this.enemies.add(b); this.boss = b; a.boss = b; a.wave++;
    b.engage();
    music.play('boss');
  },
};

export function seededRng(seed) {
  let h = (seed >>> 0) || 1;
  return () => { h = (Math.imul(h ^ (h >>> 15), 2246822507) + 3266489917) >>> 0; h ^= h >>> 13; return (h >>> 0) / 4294967296; };
}
