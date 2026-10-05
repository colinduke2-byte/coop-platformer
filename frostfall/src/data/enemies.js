// Enemy stat blocks. kind: melee | lunge | shoot | boss
// detect = sight radius in px (halved or less when the player sneaks).
export const ENEMIES = {
  draugr: {
    name: 'Draugr', tex: 'spr_draugr', hp: 40, speed: 30, chase: 40, dmg: 13, detect: 66,
    kind: 'melee', range: 19, windup: 0.55, atkDur: 0.16, recover: 0.65, cooldown: 0.5, kbResist: 0.15,
    body: [8, 7, 4, 9], loot: { gold: [3, 9], drops: [['mp_potion', 0.1], ['arrows', 0.2, [2, 5]], ['hp_potion', 0.08], ['iron_sword', 0.04]] },
  },
  wolf: {
    name: 'Wolf', tex: 'spr_wolf', hp: 24, speed: 38, chase: 78, dmg: 9, detect: 92,
    kind: 'lunge', range: 46, windup: 0.42, atkDur: 0.3, recover: 0.8, cooldown: 0.9, kbResist: 0, lunge: 175,
    body: [12, 6, 2, 8], loot: { gold: [1, 4], drops: [['hp_potion', 0.1], ['arrows', 0.25, [2, 4]]] },
  },
  bandit: {
    name: 'Bandit', tex: 'spr_bandit', hp: 34, speed: 38, chase: 54, dmg: 11, detect: 74,
    kind: 'melee', range: 20, windup: 0.38, atkDur: 0.14, recover: 0.5, cooldown: 0.35, kbResist: 0.1,
    body: [8, 7, 4, 9], loot: { gold: [6, 16], drops: [['hp_potion', 0.22], ['sp_potion', 0.15], ['arrows', 0.25, [2, 5]], ['iron_cuirass', 0.04], ['iron_sword', 0.06]] },
  },
  archer: {
    name: 'Bandit Archer', tex: 'spr_archer', hp: 22, speed: 34, chase: 44, dmg: 9, detect: 96,
    kind: 'shoot', range: 118, keep: 58, windup: 0.62, atkDur: 0.1, recover: 0.5, cooldown: 1.5, kbResist: 0,
    body: [8, 7, 4, 9], loot: { gold: [5, 14], drops: [['arrows', 0.6, [3, 7]], ['hp_potion', 0.15], ['mp_potion', 0.1], ['long_bow', 0.03]] },
  },
  wight: {
    name: 'Frost Wight', tex: 'spr_wight', hp: 30, speed: 30, chase: 38, dmg: 11, detect: 90,
    kind: 'shoot', proj: 'eshot', projSpeed: 92, range: 112, keep: 54, windup: 0.7, atkDur: 0.1, recover: 0.6, cooldown: 1.8, kbResist: 0.1,
    body: [8, 7, 4, 9], loot: { gold: [6, 14], drops: [['mp_potion', 0.25], ['hp_potion', 0.12], ['sp_potion', 0.1]] },
  },
  boss: {
    name: 'Jarl Valdrek', tex: 'spr_boss', hp: 300, speed: 30, chase: 30, dmg: 20, detect: 9999,
    kind: 'boss', range: 40, windup: 0.8, atkDur: 0.2, recover: 0.7, cooldown: 1.1, kbResist: 0.95,
    body: [8, 7, 4, 9], loot: { gold: [90, 130], drops: [['nordic_blade', 1], ['hp_potion', 1], ['hp_potion', 1], ['nordic_plate', 0.0]] },
  },
};
