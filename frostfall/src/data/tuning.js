// Every feel / balance number in one place. Tweak here, not in the entity files.
export const TUNE = {
  player: {
  speed: 72, sneakSpeed: 38, accel: 900,
  regen: 30, regenDelay: 0.75,
  mpRegen: 4.5, mpDelay: 1.2,
  roll: { cost: 22, time: 0.34, speed: 152, iframes: 0.27, cooldown: 0.12 },
  sword: { cost: 14, total: 0.3, hitStart: 0.06, hitEnd: 0.2, move: 0.3, kb: 120, reach: 13, size: 18, xp: 3, chain: 0.4 },
  // 3-hit combo: tap J again inside the chain window. The third swing is a heavy finisher.
  combo: [
    { dmg: 1, kb: 120, size: 18, total: 0.3, cost: 1, flip: false, scale: 1, stun: 0.22 },
    { dmg: 1.1, kb: 135, size: 18, total: 0.3, cost: 1, flip: true, scale: 1, stun: 0.24 },
    { dmg: 1.7, kb: 240, size: 24, total: 0.42, cost: 1.35, flip: false, scale: 1.4, stun: 0.5 },
  ],
  hurt: { invuln: 0.7, stun: 0.2, kb: 130 },
  bow: { minDraw: 0.18, fullDraw: 0.85, startCost: 5, shotCost: 5, chargeCost: 14, speedMin: 150, speedMax: 270, dmgMin: 0.45, dmgMax: 1.7, move: 0.45 },
  shout: { cooldown: 12, radius: 74, push: 320, stun: 0.9, dmg: 5, lock: 0.45 },
  cast: { lock: 0.28, move: 0.4 },
  },
  boss: {
  slam: { windup: 0.85, recover: 0.8, dmg: 24, r: 30, reach: 24 },
  sweep: { windup: 0.6, recover: 0.7, dmg: 18, w: 52, h: 38, reach: 26 },
  volley: { windup: 0.75, recover: 0.7, dmg: 11, speed: 100, spread: 0.26 },
  nova: { windup: 1.05, recover: 1.0, dmg: 12, speed: 78, count: 14 },
  charge: { windup: 0.75, recover: 1.4, dmg: 26, speed: 190, time: 0.6 },
  },
  // Difficulty multipliers (Settings > Difficulty).
  difficulty: {
    easy: { dmgTaken: 0.7, enemyHp: 0.8, regen: 1.6 },
    normal: { dmgTaken: 1, enemyHp: 1, regen: 1 },
    hard: { dmgTaken: 1.35, enemyHp: 1.3, regen: 0.6 },
  },
};
