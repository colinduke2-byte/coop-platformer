// Every feel / balance number in one place. Tweak here, not in the entity files.
export const TUNE = {
  follower: { reviveCooldown: 120, reviveHp: 0.4 },
  player: {
  speed: 72, sneakSpeed: 38, accel: 900,
  buffer: 0.14,                                   // seconds a roll or sword press is remembered while you cannot act yet
  regen: 30, regenDelay: 0.75,
  mpRegen: 4.5, mpDelay: 1.2,
  roll: { cost: 22, time: 0.34, speed: 152, iframes: 0.27, cooldown: 0.12 },
  sword: { cost: 14, total: 0.3, hitStart: 0.06, hitEnd: 0.2, move: 0.3, kb: 120, reach: 13, size: 18, xp: 3, chain: 0.4, rollCancel: 0.55 },
  lock: { range: 150, drop: 190 },
  perfect: { window: 0.17, counter: 2.0, mult: 1.6, refund: 24, slow: 0.3, slowMs: 500 },
  heavy: { cost: 30, windup: 0.3, total: 0.62, dmg: 2.3, kb: 300, size: 30, stun: 1.0, poise: 3 },
  // 3-hit combo: tap J again inside the chain window. The third swing is a heavy finisher.
  combo: [
    { dmg: 1, kb: 120, size: 18, total: 0.3, cost: 1, flip: false, scale: 1, stun: 0.22 },
    { dmg: 1.1, kb: 135, size: 18, total: 0.3, cost: 1, flip: true, scale: 1, stun: 0.24 },
    { dmg: 1.7, kb: 240, size: 24, total: 0.42, cost: 1.35, flip: false, scale: 1.4, stun: 0.5 },
  ],
  // armour weight classes: roll stamina, knockback taken, stamina regen
  // (a helmet adds half of its own class's effect on top of the body armour's; carry is added to the carry capacity)
  weights: {
    light: { roll: 0.8, knock: 1.25, sp: 1.1, move: 1.06, detect: 0.9, spell: 0.95, carry: -10 },
    medium: { roll: 1, knock: 1, sp: 1, move: 1, detect: 1, spell: 1, carry: 0 },
    heavy: { roll: 1.3, knock: 0.55, sp: 0.85, move: 0.92, detect: 1.15, spell: 1.1, carry: 20 },
  },
  riposte: { window: 1.1, mult: 1.8 },        // after a parry, the next sword blow
  // how a landed hit feels, per weapon style: hit-stop seconds, shake duration (ms) and strength
  hitFeel: {
    dagger: { stop: 0.025, ms: 50, amt: 0.0025 }, sword: { stop: 0.05, ms: 80, amt: 0.004 },
    staff: { stop: 0.02, ms: 40, amt: 0.002 }, halberd: { stop: 0.075, ms: 140, amt: 0.007 }, axe: { stop: 0.07, ms: 130, amt: 0.0065 }, spear: { stop: 0.03, ms: 60, amt: 0.003 }, mace: { stop: 0.085, ms: 150, amt: 0.0075 }, great: { stop: 0.09, ms: 170, amt: 0.009 }, hammer: { stop: 0.1, ms: 190, amt: 0.0105 },
  },
  // daggers: sneak attacks and hits to an enemy's back hit much harder; the fourth hit slips past armour
  dagger: { sneakBonus: 1.0, backMul: 1.4, backDot: 0.45 },
  // staves: the heavy attack fires a free bolt (stamina only)
  staff: { boltCost: 18, boltDmg: 6, boltWeaponMul: 0.6 },
  // weapon styles: each type of weapon has its own combo (sword uses `combo` above)
  styles: {
    dagger: [
      { dmg: 0.7, kb: 70, size: 16, total: 0.2, cost: 0.6, flip: false, scale: 1, stun: 0.12 },
      { dmg: 0.7, kb: 70, size: 16, total: 0.2, cost: 0.6, flip: true, scale: 1, stun: 0.12 },
      { dmg: 0.8, kb: 80, size: 16, total: 0.2, cost: 0.6, flip: false, scale: 1, stun: 0.14 },
      { dmg: 1.5, kb: 190, size: 20, total: 0.34, cost: 1.0, flip: true, scale: 1.25, stun: 0.4, pierce: 0.35 },
    ],
    staff: [      // a poke: the staff is for spells
      { dmg: 0.55, kb: 60, size: 16, reach: 14, total: 0.26, cost: 0.6, flip: false, scale: 1, stun: 0.12 },
      { dmg: 0.6, kb: 70, size: 16, reach: 14, total: 0.26, cost: 0.6, flip: true, scale: 1, stun: 0.14 },
    ],
    halberd: [    // two-handed, long and wide: sweep, reverse sweep, overhead plant
      { dmg: 1.15, kb: 160, size: 24, reach: 20, wide: 1.8, total: 0.5, cost: 1.3, flip: false, scale: 1, stun: 0.3 },
      { dmg: 1.2, kb: 170, size: 24, reach: 20, wide: 1.8, total: 0.52, cost: 1.3, flip: true, scale: 1, stun: 0.32 },
      { dmg: 2.1, kb: 300, size: 28, reach: 22, wide: 1.4, total: 0.66, cost: 1.9, flip: false, scale: 1.5, stun: 0.8, poise: 3, breaker: true, pierce: 0.4 },
    ],
    axe: [
      { dmg: 1.35, kb: 150, size: 20, total: 0.4, cost: 1.15, flip: false, scale: 1.2, stun: 0.3 },
      { dmg: 2.0, kb: 260, size: 26, total: 0.52, cost: 1.5, flip: true, scale: 1.5, stun: 0.55 },
    ],
    spear: [      // long reach and narrow: jab, jab, then a deep thrust
      { dmg: 0.85, kb: 60, size: 18, reach: 22, narrow: 0.55, total: 0.3, cost: 0.8, flip: false, scale: 1, stun: 0.15 },
      { dmg: 0.85, kb: 60, size: 18, reach: 22, narrow: 0.55, total: 0.3, cost: 0.8, flip: true, scale: 1, stun: 0.15 },
      { dmg: 1.6, kb: 190, size: 26, reach: 28, narrow: 0.5, total: 0.5, cost: 1.3, flip: false, scale: 1.3, stun: 0.4, poise: 1.3 },
    ],
    hammer: [     // two-handed, ponderous: shatters armour and guards
      { dmg: 1.5, kb: 180, size: 26, total: 0.62, cost: 1.6, flip: false, scale: 1.7, stun: 0.5, poise: 3, breaker: true, pierce: 0.6 },
      { dmg: 2.4, kb: 300, size: 32, total: 0.8, cost: 2.2, flip: true, scale: 2.0, stun: 0.9, poise: 4, breaker: true, pierce: 0.7 },
    ],
    mace: [       // slow, crushing: breaks guards, rattles armour
      { dmg: 1.2, kb: 120, size: 20, total: 0.5, cost: 1.25, flip: false, scale: 1.3, stun: 0.35, poise: 2.2, breaker: true, pierce: 0.45 },
      { dmg: 1.8, kb: 220, size: 24, total: 0.64, cost: 1.6, flip: true, scale: 1.6, stun: 0.6, poise: 3, breaker: true, pierce: 0.55 },
    ],
    great: [
      { dmg: 1.3, kb: 170, size: 30, total: 0.46, cost: 1.2, flip: false, scale: 1.5, stun: 0.35 },
      { dmg: 1.4, kb: 190, size: 30, total: 0.46, cost: 1.2, flip: true, scale: 1.5, stun: 0.4 },
      { dmg: 2.2, kb: 300, size: 36, total: 0.62, cost: 1.8, flip: false, scale: 1.8, stun: 0.7 },
    ],
  },
  hurt: { invuln: 0.7, stun: 0.2, kb: 130 },
  xbow: { windup: 0.55, reload: 0.75, dmgMul: 1.6, speed: 330, shotCost: 8, pierce: 2 },
  bow: { maxArrows: 30, minDraw: 0.18, fullDraw: 0.85, startCost: 5, shotCost: 5, chargeCost: 14, speedMin: 150, speedMax: 270, dmgMin: 0.45, dmgMax: 1.7, move: 0.45 },
  shouts: {
    force: { cd: 12, name: 'FORCE', col: 6 },
    frost: { cd: 14, name: 'FROST BREATH', col: 15, r: 84, dmg: 14, slow: 4 },
    cry: { cd: 20, name: 'BATTLE CRY', col: 12, time: 8, dmgMul: 1.35, r: 64 },
    surge: { cd: 12, name: 'TIDAL SURGE', col: 8, len: 120, w: 42, dmg: 10, kb: 340 },
    fire: { cd: 16, name: 'DRAGONFIRE', col: 12, r: 96, dmg: 24, burn: 4 },
    hearthcall: { cd: 24, name: 'HEARTHCALL', col: 8, heal: 0.3, r: 70 },
    cinderstep: { cd: 10, name: 'CINDERSTEP', col: 12, len: 96, dmg: 14, burn: 3 },
    grasp: { cd: 18, name: 'VERDANT GRASP', col: 8, r: 76, root: 3.2, dps: 5 },
  },
  shout: { cooldown: 12, radius: 74, push: 320, stun: 0.9, dmg: 5, lock: 0.45 },
  cast: { lock: 0.28, move: 0.4, heatCost: 0.35, heatMax: 3, heatDecay: 0.9 },
  block: { move: 0.55, parry: 0.18, arc: 0.2 },
  },
  boss: {
  slam: { windup: 0.85, recover: 0.8, dmg: 24, r: 30, reach: 24 },
  sweep: { windup: 0.6, recover: 0.7, dmg: 18, w: 52, h: 38, reach: 26 },
  volley: { windup: 0.75, recover: 0.7, dmg: 11, speed: 100, spread: 0.26 },
  nova: { windup: 1.05, recover: 1.0, dmg: 12, speed: 78, count: 14 },
  charge: { windup: 0.75, recover: 1.4, dmg: 26, speed: 190, time: 0.6 },
  },
  wyrm: {
    charge: { windup: 0.8, recover: 1.2, dmg: 24, speed: 200, time: 0.6 },
    nova: { windup: 1.05, recover: 1.0, dmg: 12, speed: 78, count: 16 },
    breath: { windup: 0.95, recover: 0.8, dmg: 12, speed: 96, count: 7, spread: 0.17 },
    spikes: { windup: 0.7, recover: 0.9, dmg: 20, n: 4, r: 26, delay: 1.0 },
    tail: { windup: 0.6, recover: 0.8, dmg: 18, r: 44 },
  },
  warlord: {
    slam: { windup: 0.8, recover: 0.8, dmg: 26, r: 32, reach: 24 },
    sweep: { windup: 0.55, recover: 0.7, dmg: 20, w: 56, h: 40, reach: 26 },
    volley: { windup: 0.7, recover: 0.7, dmg: 12, speed: 104, spread: 0.24 },
    nova: { windup: 1.0, recover: 1.0, dmg: 12, speed: 80, count: 14 },
    charge: { windup: 0.7, recover: 1.3, dmg: 28, speed: 200, time: 0.6 },
    tail: { windup: 0.6, recover: 0.8, dmg: 20, r: 40 },
    leap: { windup: 0.85, recover: 1.0, dmg: 28, r: 34 },
  },
  admiral: {
    slam: { windup: 0.75, recover: 0.8, dmg: 24, r: 36, reach: 26 },
    sweep: { windup: 0.5, recover: 0.7, dmg: 20, w: 58, h: 42, reach: 28 },
    volley: { windup: 0.65, recover: 0.7, dmg: 12, speed: 104, spread: 0.24 },
    breath: { windup: 0.9, recover: 0.8, dmg: 13, speed: 100, count: 8, spread: 0.2 },
    nova: { windup: 1.0, recover: 1.0, dmg: 12, speed: 82, count: 14 },
    charge: { windup: 0.7, recover: 1.3, dmg: 26, speed: 195, time: 0.6 },
    tail: { windup: 0.6, recover: 0.8, dmg: 20, r: 42 },
    leap: { windup: 0.85, recover: 1.0, dmg: 26, r: 36 },
    spikes: { windup: 0.7, recover: 0.9, dmg: 20, n: 5, r: 26, delay: 1.0 },
  },
  hollowking: {
    slam: { windup: 0.7, recover: 0.7, dmg: 30, r: 40, reach: 28 },
    sweep: { windup: 0.5, recover: 0.65, dmg: 24, w: 62, h: 46, reach: 30 },
    volley: { windup: 0.6, recover: 0.65, dmg: 14, speed: 116, spread: 0.28 },
    breath: { windup: 0.85, recover: 0.75, dmg: 15, speed: 108, count: 10, spread: 0.22 },
    nova: { windup: 0.9, recover: 0.9, dmg: 14, speed: 92, count: 18 },
    charge: { windup: 0.6, recover: 1.1, dmg: 32, speed: 215, time: 0.6 },
    tail: { windup: 0.5, recover: 0.7, dmg: 24, r: 46 },
    leap: { windup: 0.75, recover: 0.9, dmg: 32, r: 40 },
    spikes: { windup: 0.6, recover: 0.8, dmg: 24, n: 7, r: 28, delay: 0.9 },
  },
  miremother: {
    slam: { windup: 0.75, recover: 0.8, dmg: 24, r: 38, reach: 26 },
    sweep: { windup: 0.5, recover: 0.7, dmg: 20, w: 58, h: 42, reach: 28 },
    volley: { windup: 0.65, recover: 0.7, dmg: 12, speed: 100, spread: 0.26 },
    breath: { windup: 0.95, recover: 0.8, dmg: 13, speed: 96, count: 9, spread: 0.2 },
    nova: { windup: 1.0, recover: 1.0, dmg: 12, speed: 80, count: 14 },
    tail: { windup: 0.6, recover: 0.8, dmg: 20, r: 44 },
    leap: { windup: 0.85, recover: 1.0, dmg: 26, r: 36 },
    spikes: { windup: 0.7, recover: 0.9, dmg: 20, n: 6, r: 28, delay: 1.0 },
    charge: { windup: 0.75, recover: 1.3, dmg: 24, speed: 180, time: 0.6 },
  },
  hartking: {
    slam: { windup: 0.6, recover: 0.7, dmg: 26, r: 40, reach: 26 },
    sweep: { windup: 0.45, recover: 0.6, dmg: 22, w: 60, h: 44, reach: 28 },
    volley: { windup: 0.55, recover: 0.6, dmg: 13, speed: 124, spread: 0.3 },
    breath: { windup: 0.85, recover: 0.7, dmg: 14, speed: 104, count: 10, spread: 0.24 },
    nova: { windup: 0.9, recover: 0.85, dmg: 13, speed: 92, count: 16 },
    charge: { windup: 0.55, recover: 1.0, dmg: 28, speed: 230, time: 0.6 },
    tail: { windup: 0.5, recover: 0.65, dmg: 22, r: 44 },
    leap: { windup: 0.7, recover: 0.9, dmg: 28, r: 38 },
    spikes: { windup: 0.6, recover: 0.8, dmg: 22, n: 7, r: 28, delay: 0.85 },
  },
  lodecolossus: {
    slam: { windup: 0.8, recover: 0.8, dmg: 34, r: 46, reach: 30 },
    sweep: { windup: 0.55, recover: 0.7, dmg: 26, w: 64, h: 48, reach: 32 },
    volley: { windup: 0.7, recover: 0.7, dmg: 15, speed: 110, spread: 0.3 },
    breath: { windup: 1.0, recover: 0.8, dmg: 16, speed: 100, count: 10, spread: 0.24 },
    nova: { windup: 0.95, recover: 0.95, dmg: 15, speed: 88, count: 18 },
    charge: { windup: 0.7, recover: 1.3, dmg: 32, speed: 200, time: 0.6 },
    tail: { windup: 0.6, recover: 0.75, dmg: 26, r: 48 },
    leap: { windup: 0.85, recover: 1.0, dmg: 32, r: 42 },
    spikes: { windup: 0.7, recover: 0.9, dmg: 26, n: 8, r: 30, delay: 0.9 },
  },
  brinegut: {
    slam: { windup: 0.6, recover: 0.7, dmg: 26, r: 38, reach: 26 },
    sweep: { windup: 0.4, recover: 0.6, dmg: 22, w: 60, h: 44, reach: 28 },
    volley: { windup: 0.5, recover: 0.55, dmg: 14, speed: 140, spread: 0.3 },
    breath: { windup: 0.8, recover: 0.7, dmg: 14, speed: 110, count: 9, spread: 0.24 },
    nova: { windup: 0.9, recover: 0.85, dmg: 13, speed: 90, count: 16 },
    charge: { windup: 0.6, recover: 1.1, dmg: 30, speed: 220, time: 0.6 },
    tail: { windup: 0.5, recover: 0.65, dmg: 22, r: 44 },
    leap: { windup: 0.75, recover: 0.9, dmg: 28, r: 38 },
    spikes: { windup: 0.6, recover: 0.8, dmg: 22, n: 7, r: 28, delay: 0.85 },
  },
  blightmother: {
    slam: { windup: 0.65, recover: 0.7, dmg: 24, r: 40, reach: 26 },
    sweep: { windup: 0.45, recover: 0.6, dmg: 20, w: 60, h: 44, reach: 28 },
    volley: { windup: 0.55, recover: 0.6, dmg: 12, speed: 120, spread: 0.3 },
    breath: { windup: 0.85, recover: 0.7, dmg: 12, speed: 100, count: 10, spread: 0.24 },
    nova: { windup: 0.9, recover: 0.85, dmg: 12, speed: 90, count: 14 },
    charge: { windup: 0.7, recover: 1.2, dmg: 24, speed: 190, time: 0.6 },
    tail: { windup: 0.55, recover: 0.7, dmg: 20, r: 44 },
    leap: { windup: 0.8, recover: 0.95, dmg: 24, r: 36 },
    spikes: { windup: 0.65, recover: 0.85, dmg: 20, n: 7, r: 28, delay: 0.9 },
  },
  vaultsovereign: {
    slam: { windup: 0.7, recover: 0.75, dmg: 30, r: 42, reach: 28 },
    sweep: { windup: 0.5, recover: 0.65, dmg: 25, w: 62, h: 46, reach: 30 },
    volley: { windup: 0.6, recover: 0.65, dmg: 14, speed: 124, spread: 0.3 },
    breath: { windup: 0.9, recover: 0.75, dmg: 15, speed: 104, count: 10, spread: 0.24 },
    nova: { windup: 0.95, recover: 0.9, dmg: 14, speed: 90, count: 16 },
    charge: { windup: 0.65, recover: 1.15, dmg: 30, speed: 210, time: 0.6 },
    tail: { windup: 0.55, recover: 0.7, dmg: 24, r: 46 },
    leap: { windup: 0.8, recover: 0.95, dmg: 30, r: 40 },
    spikes: { windup: 0.65, recover: 0.85, dmg: 24, n: 8, r: 30, delay: 0.9 },
  },
  stormgiant: {
    slam: { windup: 0.7, recover: 0.75, dmg: 30, r: 42, reach: 28 },
    sweep: { windup: 0.5, recover: 0.65, dmg: 24, w: 62, h: 46, reach: 30 },
    volley: { windup: 0.6, recover: 0.65, dmg: 14, speed: 120, spread: 0.3 },
    breath: { windup: 0.9, recover: 0.75, dmg: 15, speed: 108, count: 10, spread: 0.22 },
    nova: { windup: 0.9, recover: 0.9, dmg: 14, speed: 94, count: 18 },
    charge: { windup: 0.65, recover: 1.2, dmg: 30, speed: 205, time: 0.6 },
    tail: { windup: 0.55, recover: 0.7, dmg: 24, r: 46 },
    leap: { windup: 0.8, recover: 0.95, dmg: 30, r: 40 },
    spikes: { windup: 0.65, recover: 0.85, dmg: 24, n: 7, r: 28, delay: 0.9 },
  },
  sovereign: {
    slam: { windup: 0.7, recover: 0.7, dmg: 28, r: 38, reach: 26 },
    sweep: { windup: 0.5, recover: 0.65, dmg: 22, w: 60, h: 44, reach: 28 },
    volley: { windup: 0.65, recover: 0.65, dmg: 13, speed: 112, spread: 0.26 },
    nova: { windup: 0.95, recover: 0.9, dmg: 13, speed: 88, count: 16 },
    charge: { windup: 0.65, recover: 1.2, dmg: 30, speed: 210, time: 0.6 },
    tail: { windup: 0.55, recover: 0.75, dmg: 22, r: 44 },
    leap: { windup: 0.8, recover: 0.95, dmg: 30, r: 38 },
    breath: { windup: 0.9, recover: 0.8, dmg: 14, speed: 104, count: 9, spread: 0.2 },
    spikes: { windup: 0.65, recover: 0.85, dmg: 22, n: 6, r: 28, delay: 0.95 },
  },
  kragnar: {
    slam: { windup: 0.75, recover: 0.8, dmg: 24, r: 34, reach: 24 },
    sweep: { windup: 0.55, recover: 0.7, dmg: 18, w: 56, h: 40, reach: 26 },
    volley: { windup: 0.7, recover: 0.7, dmg: 11, speed: 100, spread: 0.24 },
    nova: { windup: 1.0, recover: 1.0, dmg: 11, speed: 78, count: 14 },
    charge: { windup: 0.7, recover: 1.3, dmg: 26, speed: 190, time: 0.6 },
    tail: { windup: 0.6, recover: 0.8, dmg: 18, r: 40 },
    leap: { windup: 0.85, recover: 1.0, dmg: 26, r: 34 },
    spikes: { windup: 0.7, recover: 0.9, dmg: 18, n: 5, r: 26, delay: 1.0 },
  },
  tide: {
    charge: { windup: 0.9, recover: 1.4, dmg: 24, speed: 170, time: 0.55 },
    nova: { windup: 1.1, recover: 1.0, dmg: 13, speed: 76, count: 18 },
    breath: { windup: 0.95, recover: 0.8, dmg: 13, speed: 92, count: 9, spread: 0.15 },
    spikes: { windup: 0.7, recover: 0.8, dmg: 22, n: 5, r: 26, delay: 0.95 },
    tail: { windup: 0.6, recover: 0.8, dmg: 20, r: 46 },
    volley: { windup: 0.75, recover: 0.7, dmg: 11, speed: 90, spread: 0.3 },
  },
  root: {
    nova: { windup: 1.1, recover: 1.0, dmg: 13, speed: 74, count: 16 },
    breath: { windup: 1.0, recover: 0.9, dmg: 11, speed: 86, count: 11, spread: 0.12 },
    spikes: { windup: 0.7, recover: 0.7, dmg: 21, n: 6, r: 24, delay: 0.9 },
    tail: { windup: 0.65, recover: 0.8, dmg: 20, r: 50 },
    volley: { windup: 0.8, recover: 0.7, dmg: 12, speed: 88, spread: 0.28 },
    charge: { windup: 1.0, recover: 1.5, dmg: 24, speed: 150, time: 0.5 },
  },
  winter: {
    slam: { windup: 0.8, recover: 0.8, dmg: 28, r: 34, reach: 26 },
    sweep: { windup: 0.55, recover: 0.7, dmg: 22, w: 60, h: 42, reach: 28 },
    volley: { windup: 0.7, recover: 0.7, dmg: 13, speed: 108, spread: 0.24 },
    nova: { windup: 1.0, recover: 0.9, dmg: 14, speed: 84, count: 20 },
    charge: { windup: 0.7, recover: 1.2, dmg: 30, speed: 210, time: 0.6 },
    breath: { windup: 0.9, recover: 0.8, dmg: 14, speed: 100, count: 9, spread: 0.15 },
    spikes: { windup: 0.65, recover: 0.8, dmg: 24, n: 5, r: 26, delay: 0.9 },
    tail: { windup: 0.55, recover: 0.8, dmg: 24, r: 46 },
    leap: { windup: 0.8, recover: 0.9, dmg: 30, r: 36 },
  },
  dragon: {
    slam: { windup: 0.8, recover: 0.8, dmg: 30, r: 36, reach: 30 },
    sweep: { windup: 0.55, recover: 0.7, dmg: 24, w: 70, h: 46, reach: 34 },
    volley: { windup: 0.7, recover: 0.7, dmg: 14, speed: 112, spread: 0.2 },
    nova: { windup: 1.05, recover: 0.9, dmg: 14, speed: 86, count: 22 },
    charge: { windup: 0.85, recover: 1.1, dmg: 32, speed: 235, time: 0.7 },
    breath: { windup: 1.0, recover: 0.9, dmg: 14, speed: 112, count: 11, spread: 0.12 },
    spikes: { windup: 0.7, recover: 0.9, dmg: 26, n: 6, r: 30, delay: 0.95 },
    tail: { windup: 0.6, recover: 0.8, dmg: 26, r: 56 },
    leap: { windup: 0.85, recover: 0.9, dmg: 32, r: 40 },
  },
  boss2: {
    bite: { windup: 0.55, recover: 0.7, dmg: 17, speed: 215, time: 0.36 },
    claw: { windup: 0.3, recover: 0.5, dmg: 12, speed: 230, time: 0.28 },
    leap: { windup: 0.85, recover: 1.0, dmg: 21, r: 28, air: 0.5 },
    howl: { windup: 0.95, recover: 0.8 },
  },
  // Difficulty multipliers (Settings > Difficulty).
  // Ordinary monsters (not bosses, not passive animals) are tougher than their table entry: wolves, bears, bandits and the like.
  // carry weight: capacity = base + perSp per stamina above 100 + armour class + pony; equipped gear counts at equipHalf
  autosave: 240,                 // seconds between quiet autosaves while exploring (out of combat)
  burden: { base: 180, perSp: 1, pony: 60, equipHalf: 0.5, burdened: { move: 0.85, regen: 0.8 }, over: 1.25, overMove: 0.65, floor: 0.7, overFloor: 0.5, overRegen: 0.64 },
  mobs: { hp: 1.3, dmg: 1.15 },
  // art (visuals only): seconds between status particles on an enemy (features/art_status.js)
  art: { status: { burn: 0.11, drip: 0.28, chill: 0.2, shock: 0.32 } },
  // Ordinary enemies grow with progress (see systems/enemyscale.js): f blends region tier and story milestones; at f = 1 health is x3.5, damage x2.2 (with the +10 gear upgrades of systems/upgrades.js, late fights stay fair).
  // Per-boss health and damage multipliers on top of the difficulty setting, set from the balance bot (test/balance.mjs) so each boss is hard but fair for the gear and upgrades expected where it stands.
  bosses: { default: { hp: 1, dmg: 1 }, boss: { hp: 0.8 }, grimfang: { hp: 0.95 }, kragnar: { hp: 0.55 }, sovereign: { hp: 0.42 }, admiral: { hp: 1.25 }, hollowking: { hp: 0.36 }, blightmother: { hp: 0.46 }, vaultsovereign: { hp: 0.6 }, winter: { hp: 1.1 } },
  scaling: { regionW: 0.7, storyW: 0.3, curve: 1.6, hp: 4.4, dmg: 2.9, gold: 2.0, elite: 0.5 },
  // The economy (PR-03 and on): what shops pay, gold rewards, gold find. Owned by the economy pass.
  economy: {
    sellRate: 0.5,             // a shop pays this share of an item's value
    sellBulk: 0.25,            // ... and this share for bulk goods (items with bulk: true: ingots, ore, lockpicks), which shops sell in bundles
    critCap: 0.5,              // melee and bow crit chance never go above this (PR-05)
    goldFindCap: 0.6,          // gold-find bonuses from gear, sets, Pell and blessings add up to at most +60% (PR-25)
    pellGold: 0.1,             // Pell at your side: +10% gold
    plenty: [0.1, 0.025],      // the generated "of Plenty" affix: +10% gold, +2.5% per tier step (k = min(2, tier)): 10 / 12.5 / 15%
    // Gold rewards (CH14): [base, per tier] unless noted. All are paid through addGold, so gold find applies.
    rewards: {
      bloodAlpha: [120, 80], campRetaken: [15, 12], worldBoss: [150, 100],
      nemesis: [80, 60, 40],               // base, per kill it made, per tier
      bounty: [40, 30], bountyChampion: 1.6, // a champion's bounty pays x1.6
      wounded: [45, 35], hunt: 20, raid: [60, 40],
      arenaWave: [20, 12], gauntlet: 1.4,  // base, per wave; the Gauntlet pays x1.4
      discoverHidden: [20, 12], discover: [4, 4],
    },
    deathGoldKeep: 0.9,        // dying keeps this share of your gold
    // generated loot (PR-10): armour x rarityMult^armorPow, block x rarityMult^blockPow, affix strength grows to tier affixTierCap,
    // staves: spell power 1 + (staff[0] + staff[1] x tier) x rarityMult, at most staffMax; a Legendary helmet or charm: +legendPools
    gen: { armorPow: 0.5, blockPow: 0.25, affixTierCap: 3, staff: [0.1, 0.12], staffMax: 1.9, legendPools: 10 },
    repair: { base: 0.2, perLevel: 0.08, valueDiv: 2000, valueCap: 0.8 },   // gold per point of wear (PR-12; was 0.15 + value / 400)
    wear: { bowShot: 0.5, staffCast: 0.25 },     // bows wear per shot, staves per spell cast (PR-12; melee: 1 per landed hit)
    // New Game+ (PR-17): ordinary enemies' progress floor (floor[0] + floor[1] x (ng - 1)); bosses +bossHp / +bossDmg per cycle;
    // generated loot +lootTiers per cycle; the Mythic rarity's weight per cycle (Legendary is 3)
    ng: { floor: [0.5, 0.25], bossHp: 0.35, bossDmg: 0.12, lootTiers: 1, mythicWeight: 1.5 },
    // the Great Anvil's Ascend (PR-26), by the rarity it goes TO: Rare, Legendary, Mythic (NG+ only)
    ascend: { rare: { gold: 600, ember_ore: 2 }, legend: { gold: 1500, ember_ore: 3, heart_shard: 1 }, mythic: { gold: 3000, ember_ore: 5, winters_echo: 1 } },
    respec: { base: 150, perPerk: 50 },   // unlearning every perk at a shrine: base + per perk unlearned (PR-18)
    transferShare: 0.25,       // moving a temper to another item costs this share of the gold its levels cost (PR-19)
    gemFuse: [60, 180],        // gold to fuse three gems into a Flawless one, three Flawless into a Royal one (PR-23)
    staffRubyPct: 0.015,
    xpNear: 180,               // area and utility spells pay skill XP only with an alerted enemy this close (px, PR-15)       // a gem's damage point in a staff adds this much spell power (a Ruby, +3 damage: +4.5% spells) (PR-01)
  },
  difficulty: {
    // dmgTaken / enemyHp / regen: the core three. windup & chase scale enemy telegraph length and chase speed (bosses keep their own timing);
    // elite: how often elite and champion enemies appear; drops: food and potion drop chance; price: shop buy prices; durability: gear wear (null = the player's own setting, 'hard' = on unless switched off in the Hard setting)
    easy: { dmgTaken: 0.65, enemyHp: 1.2, regen: 1.8, windup: 1.25, chase: 0.92, elite: 0.6, drops: 1.5, price: 0.85, durability: false },
    normal: { dmgTaken: 1.04, enemyHp: 1.73, regen: 1, windup: 1, chase: 1, elite: 1, drops: 1, price: 1, durability: null },
    hard: { dmgTaken: 1.46, enemyHp: 2.15, regen: 0.6, windup: 0.85, chase: 1.08, elite: 1.5, drops: 0.7, price: 1.2, durability: 'hard' },
  },
  // Story rewards (the story area). pageRep: Anvil Court standing for The Missing Page, the Court's seal quest (A Core for the Anvil keeps its own 25).
  // asideDelay: seconds into a great fight before a companion with you speaks up.
  story: { pageRep: 20, asideDelay: 4.5 },
  // Audio (src/audio): mix, fades and timings. Gains are linear (0..1) on top of the Settings channels.
  audio: {
    rateMs: 35,                          // the same sound at most once per this many ms
    voices: 32,                          // most effect voices at once; extra non-urgent sounds are dropped
    limiter: { threshold: -10, knee: 6, ratio: 10, attack: 0.003, release: 0.25 },
    vary: { pitch: 0.05, vol: 0.1, widePitch: 0.08, wideVol: 0.15, step: 0.03 },   // random pitch / volume per play (AU05)
    near: 60, far: 1.3, pan: 0.7,        // positional sounds: full within near px, silent beyond far x screen width; pan clamp
    fadeOut: 1.5, fadeIn: 0.8,           // song crossfade (s)
    combatHold: 5, combatFade: 0.8,      // combat drums stay on this long after the last fight tick, and ramp over this (AU03)
    drums: { kick: 0.08, snare: 0.05, hat: 0.025, arp: 0.022, lead: 0.05, leadFight: 0.06 },
    silence: { loops: [2, 3], secs: [30, 90] },     // calm songs rest after a few loops (AU18)
    night: { tempo: 0.8 }, dungeon: { tempo: 0.85 }, bossBpm: 136,
    heartbeat: { below: 0.3, fast: 0.15, every: 1.0, everyFast: 0.62, lowpass: 1200 },
    duck: { talk: 0.5, ramp: 0.3, pauseLowpass: 1000 },
    statusTick: 1.0,                     // seconds between burn / poison / bleed ticks on the player
    ambFade: 1.5,                        // ambience bed crossfade (s)
  },
};

// ---- W: world
TUNE.world = {
  // WQ19: weather per region. roll = weights for the next weather when the weather timer fires (snowy maps keep their old roll).
  // stealth: enemies' sight multiplier; wind: sideways push on arrows (px/s). Hazards: a telegraphed circle every [min, max]
  // seconds near you while that weather lasts (ash embers on the Peaks, lightning on the Stormcrown heath, rockfall in the Underdeep).
  weather: {
    roll: {
      ashen: { clear: 0.62, ash: 0.38 }, fens: { clear: 0.45, rain: 0.3, fog: 0.25 }, sunscorch: { clear: 0.72, sandstorm: 0.28 },
      vale: { clear: 0.7, rain: 0.3 }, glasswood: { clear: 0.68, chime: 0.32 }, kingdom: { clear: 0.7, rain: 0.3 }, underdeep: { clear: 1 },
    },
    stormShare: 0.5,               // highlands: share of blizzards that are thunderstorms instead
    stealth: { blizzard: 0.75, whiteout: 0.5, sandstorm: 0.5, fog: 0.6, rain: 0.9, ash: 0.85, storm: 0.8 },
    wind: { blizzard: 14, whiteout: 42, sandstorm: 36, storm: 18 },
    ember: { every: [7, 12], r: 14, delay: 1.1, dmg: 6, perTier: 4 },
    lightning: { every: [6, 11], r: 18, delay: 1.3, dmg: 10, perTier: 5, safeR: 7 },
    tremor: { every: [70, 130], rocks: 3, r: 16, delay: 1.2, dmg: 8, perTier: 4 },
    chime: { every: 6, slow: 1.4, r: 150 },
    rainRegrow: { every: 14, r: 260, max: 3 },
    fireInRain: 0.8,               // fire damage multiplier in rain (weatherMul('fire'); Enemy.takeHit applies it to fire blows)
  },
  // WQ12 / WQ24: what a chartmaker or hermit pays per region milestone: [gold, + gold per tier of the region's entrance]
  survey: { half: [120, 40], landmarks: [150, 50], full: [400, 120] },
  // WQ17: minor finds. A cairn makes you rested (+25 max health) for cairnSecs, once a day; a freed fox pays foxGold
  minor: { cairnSecs: 120, foxGold: 15, trailGold: 300 },        // WQ22: a trail's box pays trailGold once every relic is found
  // WQ18: a landmark's secret pays gold + perTier per tier (and a rare piece of gear for the bigger ones); a warming one lasts warmSecs
  secret: { gold: 90, perTier: 60, warmSecs: 300 },
  // WQ20: every everyDays game days perRegion cleared places per region are retaken (crew one tier up and a lieutenant);
  // clearing them again pays clearGold [base, per tier]; a hub board contract pays boardGold [base, per tier] on top
  // WQ25: hub people check the clock every `every` seconds (dusk 20:30 to the inn, dawn 5:30 back)
  hours: { every: 2 },
  // WQ21: what each new-shape regional quest pays (gold, and a rare piece of gear of this tier)
  rquest: { gold: 450, tier: 3 },
  retake: { everyDays: 4, perRegion: 1, clearGold: [80, 50], boardGold: [70, 50] },
};

// ---- H: HUD and first hour
TUNE.hud = {
  // hints: seconds on screen; a new tip waits while the current one has more than `keep` s left, trims it to `trim` s,
  // and at most `queue` wait. Urgent hints (tutorial steps, low-health potion tip) replace the current one at once (NP1).
  hintLife: 12, hintKeep: 4, hintTrim: 6, hintQueue: 3,
  // the hint docks at the bottom while an alerted foe is this close (px), and for `fightHold` s after (VX-05)
  fightR: 220, fightHold: 2,
  // VX-05: at most this many floating combat texts at once; an enemy's small HP bar shows for `barHold` s after it is hit
  // (always while it is your lock-on target)
  maxTexts: 12, barHold: 2,
  // NP5: the sneak tip fires when an unaware foe is this close (px); NP24: foes name themselves in their danger colour
  // up to this character level (DANGER NAMES: AUTO), for this many seconds
  sneakTipR: 140, dangerNamesLevel: 5, dangerNameLife: 1.5,
  nemesisLevel: 3,               // NP10: a killer becomes your nemesis only from this character level on
  // NP11: below this character level, foes within safeR px of a village exit are moved out to that radius on arrival
  safeLevel: 3, safeR: 400, safeWindow: 1.5,
  storyNudgeRuns: 3,             // NP26: Arena runs before the title points a player with no story save at NEW GAME
  shopTip: 7,                    // seconds a first-visit tip stays on a crafting service's message line (NP16)
  // A1 LARGE TEXT: line height (px) and characters per line of the 2x font, toasts kept at once, the menu help line's
  // page time (s)
  bigLine: 16, bigChars: 26, bigToasts: 3, bigHelpPage: 2.5,
  introWhiteOut: 900, introWhiteIn: 1800,   // VX-25: ms the intro takes to fade to white, and the village to fade in from it
};

// ---- C: combat (feel numbers for the combat pass; see docs/audit/combat.md)
TUNE.combat = {
  aimAssist: { deg: 12, range: 150 },
  parryLockout: 0.4,                           // CB10: seconds after a parry that caught nothing before the next raise can parry again
  deflect: { mul: 1, bossMul: 0.5, speed: 160, life: 1.2 },   // CB25: a parried shot flies back with this share of its damage
  sword: { riposteAdd: 0.4 },                  // CB24: a sword's riposte window is longer
  // CB3: when each style's blow lands, as fractions of the swing's length (start, end); the blade art crosses its middle at the start
  hitWin: { dagger: [0.25, 0.6], sword: [0.2, 0.6], staff: [0.2, 0.6], spear: [0.3, 0.6], axe: [0.35, 0.65], mace: [0.35, 0.65], halberd: [0.35, 0.65], great: [0.4, 0.7], hammer: [0.5, 0.75] },
  hitStopCap: 0.09,                            // CB4: hit-stop of an ordinary (non-finisher) hit never exceeds this
  namedExec: 0.1,                              // CB9: a named foe is only executed below this share of health, and only while staggered
  // CB24: each style's heavy attack (over TUNE.player.heavy); arc = half-angle in degrees, r = radius, shock = ground shock ahead
  heavy: {
    dagger: { cost: 22, windup: 0.12, total: 0.4, dmg: 1.9, kb: 120, size: 20, stun: 0.6, range: 52, step: 14 },
    axe: { windup: 0.34, total: 0.7, dmg: 2.0, arc: 135, r: 30, stun: 0.8 },
    spear: { windup: 0.28, total: 0.6, dmg: 2.1, size: 30, reach: 34, narrow: 0.45, root: 0.6, lunge: 170, stun: 0.6 },
    halberd: { windup: 0.36, total: 0.76, dmg: 1.9, arc: 180, r: 36, tip: 0.65, tipMul: 1.3, kb: 260 },
    mace: { windup: 0.36, total: 0.7, dmg: 2.1, shock: { r: 28, ahead: 14 }, stun: 0.9 },
    hammer: { windup: 0.42, total: 0.82, dmg: 2.4, shock: { r: 34, ahead: 16 }, stun: 1.0, crushGuard: true },
  },
  minWindup: { easy: 0.4, normal: 0.4, hard: 0.36 },       // CB12: no regular enemy's tell is shorter than this
  windupArmor: 0.12, armorKb: 0.6,                          // CB1: foes with kbResist >= armorKb (and mini-bosses) keep their swing unless one hit's poise passes this share of max health
  namedPoise: 2,                                            // CB9: mini-bosses need this much more poise damage to stagger
  strafeFlip: 0.5,                                          // CB19: seconds between turns when a waiting foe circles into a wall
  camInset: 6,
  relock: 0.4,                                              // CB16: seconds after a kill in which the lock moves to the next foe                                              // CB15: a ranged foe only starts its tell this far inside the screen
  // CB23: second moves of key enemies (every Nth attack); slam = a crushing ground zone, string / bash = a crushing blow
  alt: { every: 3, slamRange: 40, slamR: 30, slamDelay: 0.45, slamDmg: 1.1, slamWind: 1.15, crushWind: 1.15, feintWind: 0.7, feintCd: 0.35, ringN: 6, ringR: 30 },
  // CB22: late foes (progress f from systems/enemyscale.js): three attack slots past slotsAt, cooldown x(1 - cooldown*f),
  // a follow-up swing past followAt (chance rises to `follow` at f = 1), behaviour affixes past affixAt
  late: { slotsAt: 0.6, cooldown: 0.25, followAt: 0.4, follow: 0.35, followWind: 0.75, affixAt: 0.4, duelStun: 0.45 },
  // CB21 / CB26: boss signatures (first use `first` s after the fight starts, then every `cd` s, from phase `fromPhase`;
  // phase 1 on Hard), the chance that a pick starts a scripted string, and the phase-3 echo / trail burst delays
  sig: { windup: 0.7, recover: 0.8, first: 7, cd: 13, fromPhase: 2, string: 0.15, stringHard: 0.4, echo: 0.5, trail: 0.7, pull: 150 },
  great: { charge: [0.45, 0.9], hold: 0.6, mult: [1, 1.35, 1.75], move: 0.3 },     // CB24: hold heavy to charge (seconds per level, damage per level)
  axe: { keep: 2.5, maxStacks: 5, bleedT: 4, dpsPerStack: 1.5 },                   // CB24: axe blows on one foe stack its bleeding          // CB6: arrows and bolts bend toward a foe this many degrees off your facing
  // CB7 / CB26 / CB28: boss tells and recovery per phase (1, 2, 3); a shortened tell never goes below the floor
  bossPhase: { windup: [1, 0.8, 0.75], recover: [1, 0.75, 0.7], floor: 0.38, meleeFloor: 0.4, MELEE: ['slam', 'sweep', 'tail', 'charge'], hardWindup: 0.9, hardPhase2: 0.6 },
};
