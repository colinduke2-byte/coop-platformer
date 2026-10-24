// Second attacks for key regular enemies (CB23) and the behaviour that makes late enemies smarter (CB22).
// Enemy.js calls these hooks; the numbers are in TUNE.combat.alt and TUNE.combat.late.
import { TUNE } from '../data/tuning.js';
import { norm, dir8 } from '../util.js';
import { sfx } from '../audio/sfx.js';

// kind -> the second move: slam (a crushing ground zone up close), string (a crushing overhead, then a second swing),
// bash (a shield bash that breaks a raised guard), feint (a short tell that is called off to bait a roll),
// lead (an aimed shot at where you will be), ring (a ring of bursts around you, not only one on your feet)
const ALT = {
  troll: 'slam', stonegiant: 'slam',
  chief: 'string', captainkarrow: 'string',
  knight: 'bash', hedgeknight: 'bash',
  wolf: 'feint', bogwolf: 'feint', ashwolf: 'feint',
  archer: 'lead',
};
export function altKind(e) {
  if (ALT[e.kind]) return ALT[e.kind];
  if (e.cfg.kind === 'cast' && (e.cfg.zoneN || 1) === 1 && e.cfg.keep > 0 && !e.cfg.heals) return 'ring';
  return null;
}

// Called as a wind-up starts: decides whether this attack is the second move. Returns the wind-up length to use.
export function chooseAlt(e, d) {
  const A = TUNE.combat.alt, k = e.altType ??= altKind(e);
  e.atkN = (e.atkN || 0) + 1;
  e.alt = null; e.altCrush = false; e.feint = false;
  let wind = e.cfg.windup;
  if (e.marksman) e.alt = 'lead';
  if (!k) return wind;
  if (k === 'slam' && d < A.slamRange && e.atkN % A.every === 0) { e.alt = 'slam'; e.altCrush = true; wind *= A.slamWind; }
  else if ((k === 'string' || k === 'bash') && e.atkN % A.every === 0) { e.alt = k; e.altCrush = true; wind *= A.crushWind; if (k === 'string') e.forceFollow = 1; }
  else if (k === 'feint' && e.atkN % 2 === 0) { e.alt = 'feint'; e.feint = true; wind = Math.max(TUNE.combat.minWindup.normal, wind * A.feintWind); }
  else if ((k === 'lead' || k === 'ring') && e.atkN % A.every === 0) e.alt = k;
  return wind;
}

// The direction to shoot: straight at you, or (lead) at where you will be when the shot arrives.
export function shotDir(e, player, spd) {
  if (e.alt !== 'lead') return e.dashDir;
  const pv = player.body.velocity, d = Math.hypot(player.x - e.x, player.y - e.y), t = Math.min(1, d / (spd || 125));
  return norm(player.x + pv.x * t - e.x, player.y + pv.y * t - e.y);
}

// The slam and the ring: zones instead of the usual hit. Returns true when the attack was handled here.
export function altAttack(e, player) {
  const A = TUNE.combat.alt, sc = e.scene;
  if (e.alt === 'slam') {
    const x = e.x + e.face.x * 12, y = e.y + 4 + e.face.y * 10;
    sc.addZone(x, y, A.slamR, A.slamDelay, Math.round(e.cfg.dmg * A.slamDmg), e);
    e.hitDone = true; e.body.setVelocity(0, 0); sfx.play('smash'); sc.shake(120, 0.006);
    return true;
  }
  if (e.alt === 'ring' && e.cfg.kind === 'cast') {
    const c = e.castTarget, n = A.ringN;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, x = c.x + Math.cos(a) * A.ringR, y = c.y + Math.sin(a) * A.ringR;
      if (!sc.solidAt(x, y)) sc.addZone(x, y, Math.round(e.cfg.zoneR * 0.75), e.cfg.zoneDelay, e.cfg.dmg, e);
    }
    e.body.setVelocity(0, 0); sfx.play('frost');
    return true;
  }
  return false;
}

// CB22: a second swing straight after the first, more likely the later in the game (always for Relentless elites and
// for a string). Returns true when it started one.
export function followUp(e, player) {
  if (e.chained) { e.chained = false; return false; }
  if (e.cfg.kind !== 'melee' && e.cfg.kind !== 'lunge') return false;
  const L = TUNE.combat.late, f = e.progressF || 0;
  let go = e.forceFollow > 0 || e.relentless;
  if (!go && f > L.followAt) go = Math.random() < L.follow * Math.min(1, (f - L.followAt) / (1 - L.followAt));
  e.forceFollow = 0;
  if (!go || player.mode === 'dead' || Math.hypot(player.x - e.x, player.y - e.y) > e.cfg.range * 1.8) return false;
  e.chained = true; e.alt = null; e.altCrush = false; e.feint = false;
  const to = norm(player.x - e.x, player.y - e.y);
  e.startWindup(to, Math.max(TUNE.combat.minWindup.normal, e.cfg.windup * L.followWind));
  e.face = dir8(to.x, to.y);
  return true;
}

// Late-game elite affixes that change behaviour (CB22). Offered only to enemies past TUNE.combat.late.affixAt.
export const LATE_AFFIXES = {
  unflinching: { name: 'Unflinching', tint: 0xd8c8a0, hint: 'KEEPS ITS SWING', apply: (e) => { e.windupArmor = Math.max(e.windupArmor || 0, TUNE.combat.windupArmor * 1.5); } },
  relentless: { name: 'Relentless', tint: 0xff6060, hint: 'STRIKES TWICE', apply: (e) => { e.relentless = true; } },
  duellist: { name: 'Duellist', tint: 0xf4d460, hint: 'PARRIES COMBOS', apply: (e) => { e.duellist = true; } },
  marksman: { name: 'Marksman', tint: 0x80d0ff, hint: 'LEADS ITS SHOTS', apply: (e) => { e.marksman = true; } },
};
const fits = { unflinching: (e) => e.cfg.kind === 'melee', relentless: (e) => e.cfg.kind === 'melee' || e.cfg.kind === 'lunge', duellist: (e) => e.cfg.kind === 'melee', marksman: (e) => e.cfg.kind === 'shoot' };
export const lateAffixesFor = (e) => ((e.progressF || 0) > TUNE.combat.late.affixAt ? Object.keys(LATE_AFFIXES).filter((k) => fits[k](e)) : []);

// Duellist: turns your third combo blow aside. Returns true when it parried.
export function duel(e, info) {
  if (!e.duellist || info.src !== 'melee' || info.heavy || e.stun > 0 || e.state === 'attack') return false;
  const p = e.scene.player;
  if (!p || p.comboN !== 2) return false;
  const k = norm(p.x - e.x, p.y - e.y);
  if (e.face.x * k.x + e.face.y * k.y < 0.3) return false;
  p.stunT = Math.max(p.stunT, TUNE.combat.late.duelStun); p.mode = 'hurt'; p.swing = null;
  e.scene.fx.text(e.x, e.y - 22, 'PARRIED', 13, 0.8); sfx.play('parry');
  return true;
}
