// Enemy stat blocks. kind: melee | lunge | shoot | boss
// detect = sight radius in px (halved or less when the player sneaks).
export const ENEMIES = {
  grimfang: {
    name: 'Grimfang', title: 'GRIMFANG, THE PALE ALPHA', tex: 'spr_grimfang', sideOnly: true, bark: 'wolf', weak: { fire: 1.3 },
    hp: 290, speed: 40, chase: 74, dmg: 17, detect: 9999,
    kind: 'boss', range: 40, windup: 0.6, atkDur: 0.2, recover: 0.7, cooldown: 0.9, kbResist: 0.95,
    body: [12, 6, 2, 8], loot: { gold: [80, 120], drops: [['pale_pelt', 1], ['wolf_fang', 1], ['wolf_fang', 1], ['hp_potion_g', 0.7]] },
  },
  wyrm: {
    name: 'Glacial Wyrm', title: 'THE RIME WYRM, SERPENT OF THE MAW', tex: 'spr_wyrm', sideOnly: true, bark: 'undead', weak: { fire: 1.5, shock: 1.2, frost: 0.1 },
    hp: 420, speed: 34, chase: 46, dmg: 22, detect: 9999,
    kind: 'boss', range: 44, windup: 0.8, atkDur: 0.2, recover: 0.7, cooldown: 1.0, kbResist: 0.95,
    body: [14, 8, 1, 7], loot: { gold: [140, 190], drops: [['hp_potion_g', 1], ['mp_potion_g', 0.6]] },
  },
  warlord: {
    name: 'Hrolf Ironmarch', title: 'HROLF IRONMARCH, THE UNBURIED', tex: 'spr_warlord', bark: 'undead', weak: { fire: 1.2, shock: 1.3, frost: 0.6 },
    hp: 520, speed: 32, chase: 40, dmg: 26, detect: 9999,
    kind: 'boss', range: 40, windup: 0.8, atkDur: 0.2, recover: 0.7, cooldown: 1.0, kbResist: 0.95,
    body: [8, 7, 4, 9], loot: { gold: [150, 210], drops: [['hp_potion_g', 1], ['iron_ingot', 1], ['iron_ingot', 1]] },
  },
  tide: {
    name: 'The Tidemother', title: 'THE TIDEMOTHER, DROWNED QUEEN', tex: 'spr_tide', sideOnly: true, bark: 'undead', weak: { shock: 1.6, fire: 0.8, frost: 0.3 },
    hp: 480, speed: 30, chase: 36, dmg: 22, detect: 9999,
    kind: 'boss', range: 44, windup: 0.8, atkDur: 0.2, recover: 0.7, cooldown: 1.0, kbResist: 0.95,
    body: [14, 8, 1, 7], loot: { gold: [150, 210], drops: [['mp_potion_g', 1], ['hp_potion_g', 1]] },
  },
  root: {
    name: 'The Ashen Root', title: 'THE ASHEN ROOT, BLIGHT MOTHER', tex: 'spr_root', sideOnly: true, bark: 'undead', weak: { fire: 1.8, frost: 0.9, shock: 0.7 },
    hp: 560, speed: 22, chase: 26, dmg: 22, detect: 9999,
    kind: 'boss', range: 44, windup: 0.8, atkDur: 0.2, recover: 0.7, cooldown: 1.1, kbResist: 0.95,
    body: [14, 8, 1, 7], loot: { gold: [150, 210], drops: [['hp_potion_g', 1], ['bone_dust', 1], ['frost_lily', 1]] },
  },
  winter: {
    name: 'The Long Winter', title: 'THE LONG WINTER, UNBOUND', tex: 'spr_winter', bark: 'undead', weak: { fire: 1.3, shock: 1.1, frost: 0.05 },
    hp: 1100, speed: 34, chase: 44, dmg: 28, detect: 9999,
    kind: 'boss', range: 42, windup: 0.8, atkDur: 0.2, recover: 0.7, cooldown: 0.9, kbResist: 0.95,
    body: [8, 7, 4, 9], loot: { gold: [300, 400], drops: [['hp_potion_g', 1], ['mp_potion_g', 1]] },
  },
  draugr: {
    name: 'Draugr', tex: 'spr_draugr', blade: 3, bark: 'undead', weak: { fire: 1.5, frost: 0.6 }, hp: 40, speed: 30, chase: 40, dmg: 15, detect: 66,
    kind: 'melee', range: 19, windup: 0.55, atkDur: 0.16, recover: 0.65, cooldown: 0.5, kbResist: 0.15,
    body: [8, 7, 4, 9], loot: { gold: [3, 9], drops: [['mp_potion', 0.1], ['arrows', 0.2, [2, 5]], ['hp_potion', 0.08], ['iron_sword', 0.04]] },
  },
  wolf: {
    name: 'Wolf', tex: 'spr_wolf', bark: 'wolf', weak: { fire: 1.2 }, hp: 28, speed: 38, chase: 78, dmg: 10, detect: 92,
    kind: 'lunge', range: 46, windup: 0.42, atkDur: 0.3, recover: 0.8, cooldown: 0.9, kbResist: 0, lunge: 175,
    body: [12, 6, 2, 8], loot: { gold: [1, 4], drops: [['hp_potion', 0.1], ['arrows', 0.25, [2, 4]]] },
  },
  bandit: {
    name: 'Bandit', tex: 'spr_bandit', blade: 5, bark: 'human', flee: true, hp: 37, speed: 38, chase: 54, dmg: 13, detect: 74,
    kind: 'melee', range: 20, windup: 0.38, atkDur: 0.14, recover: 0.5, cooldown: 0.35, kbResist: 0.1,
    body: [8, 7, 4, 9], loot: { gold: [6, 16], drops: [['hp_potion', 0.22], ['sp_potion', 0.15], ['arrows', 0.25, [2, 5]], ['iron_cuirass', 0.04], ['iron_sword', 0.06]] },
  },
  archer: {
    name: 'Bandit Archer', tex: 'spr_archer', bark: 'human', flee: true, call: 100, hp: 22, speed: 34, chase: 44, dmg: 10, detect: 96,
    kind: 'shoot', range: 118, keep: 58, windup: 0.62, atkDur: 0.1, recover: 0.5, cooldown: 1.5, kbResist: 0,
    body: [8, 7, 4, 9], loot: { gold: [5, 14], drops: [['arrows', 0.6, [3, 7]], ['hp_potion', 0.15], ['mp_potion', 0.1], ['long_bow', 0.03]] },
  },
  wight: {
    name: 'Frost Wight', tex: 'spr_wight', bark: 'undead', weak: { fire: 1.3, shock: 1.4, frost: 0.2 }, hp: 30, speed: 30, chase: 38, dmg: 13, detect: 90,
    kind: 'shoot', proj: 'eshot', projSpeed: 92, range: 112, keep: 54, windup: 0.7, atkDur: 0.1, recover: 0.6, cooldown: 1.8, kbResist: 0.1,
    body: [8, 7, 4, 9], loot: { gold: [6, 14], drops: [['mp_potion', 0.25], ['hp_potion', 0.12], ['sp_potion', 0.1]] },
  },
  boss: {
    name: 'Jarl Valdrek', title: 'JARL VALDREK THE HOLLOW KING', tex: 'spr_boss', bark: 'undead', weak: { fire: 1.2, frost: 0.5 }, hp: 300, speed: 30, chase: 30, dmg: 20, detect: 9999,
    kind: 'boss', range: 40, windup: 0.8, atkDur: 0.2, recover: 0.7, cooldown: 1.1, kbResist: 0.95,
    body: [8, 7, 4, 9], loot: { gold: [90, 130], drops: [['nordic_blade', 1], ['hp_potion', 1], ['hp_potion', 1], ['nordic_plate', 0.0]] },
  },
  warden: {
    name: 'Draugr Warden', tex: 'spr_warden', blade: 4, bark: 'undead', weak: { fire: 1.4, shock: 1.3, frost: 0.6 }, shield: true,
    hp: 60, speed: 26, chase: 34, dmg: 17, detect: 62,
    kind: 'melee', range: 19, windup: 0.65, atkDur: 0.16, recover: 0.8, cooldown: 0.7, kbResist: 0.5,
    body: [8, 7, 4, 9], loot: { gold: [8, 18], drops: [['hp_potion', 0.18], ['wooden_shield', 0.12], ['iron_shield', 0.04], ['bone_dust', 0.5]] },
  },
  alpha: {
    name: 'Wolf Alpha', tex: 'spr_alpha', sideOnly: true, bark: 'wolf', call: 150, weak: { fire: 1.3 },
    hp: 62, speed: 44, chase: 92, dmg: 16, detect: 110,
    kind: 'lunge', range: 52, windup: 0.4, atkDur: 0.32, recover: 0.7, cooldown: 0.8, kbResist: 0.3, lunge: 200,
    body: [12, 6, 2, 8], loot: { gold: [6, 14], drops: [['wolf_fang', 1], ['hp_potion', 0.25]] },
  },
  chief: {
    name: 'Bandit Chief', tex: 'spr_chief', blade: 5, bark: 'human', call: 120,
    hp: 95, speed: 36, chase: 56, dmg: 20, detect: 80,
    kind: 'melee', range: 22, windup: 0.42, atkDur: 0.16, recover: 0.55, cooldown: 0.3, kbResist: 0.4,
    body: [8, 7, 4, 9], loot: { gold: [30, 60], drops: [['iron_shield', 0.5], ['steel_sword', 0.25], ['lockpick', 1], ['hp_potion', 0.6], ['iron_ingot', 0.7]] },
  },
  conjurer: {
    name: 'Hexcaster', tex: 'spr_conjurer', bark: 'undead', weak: { fire: 1.3, shock: 1.5 },
    hp: 30, speed: 28, chase: 36, dmg: 17, detect: 96,
    kind: 'cast', range: 120, keep: 64, zoneR: 24, zoneDelay: 1.0, windup: 0.8, atkDur: 0.1, recover: 0.7, cooldown: 2.6, kbResist: 0.1,
    body: [8, 7, 4, 9], loot: { gold: [10, 22], drops: [['mp_potion', 0.4], ['frost_lily', 0.5], ['bone_dust', 0.4]] },
  },
  deer: {
    name: 'Deer', tex: 'spr_wolf', sideOnly: true, tint: 0xd8a870, passive: true, hp: 14, speed: 24, chase: 92, dmg: 0, detect: 70,
    kind: 'melee', range: 0, windup: 1, atkDur: 0.1, recover: 0.5, cooldown: 9, kbResist: 0,
    body: [12, 6, 2, 8], loot: { gold: [0, 0], drops: [['venison', 1], ['hide', 0.7]] },
  },
  // --- predators of the wild
  bear: {
    name: 'Snow Bear', tex: 'spr_bear', sideOnly: true, scale: 1.5, bark: 'wolf', weak: { fire: 1.2 }, hp: 95, speed: 30, chase: 62, dmg: 20, detect: 84,
    kind: 'melee', range: 24, windup: 0.62, atkDur: 0.2, recover: 0.8, cooldown: 0.7, kbResist: 0.65,
    body: [14, 8, 1, 7], loot: { gold: [4, 12], drops: [['venison', 1], ['hide', 0.9], ['hp_potion', 0.15]] },
  },
  lynx: {
    name: 'Shadow Lynx', tex: 'spr_lynx', sideOnly: true, ambush: true, bark: 'wolf', weak: { fire: 1.2 }, hp: 26, speed: 36, chase: 86, dmg: 15, detect: 92,
    kind: 'lunge', range: 84, windup: 0.3, atkDur: 0.34, recover: 0.8, cooldown: 1.3, kbResist: 0, lunge: 270,
    body: [12, 6, 2, 8], loot: { gold: [2, 7], drops: [['hide', 0.5], ['arrows', 0.25, [2, 4]]] },
  },
  boar: {
    name: 'Tusk Boar', tex: 'spr_boar', sideOnly: true, bark: 'wolf', weak: { fire: 1.2 }, hp: 58, speed: 34, chase: 70, dmg: 17, detect: 70,
    kind: 'lunge', range: 74, windup: 0.55, atkDur: 0.4, recover: 0.9, cooldown: 1.0, kbResist: 0.4, lunge: 215,
    body: [14, 7, 1, 7], loot: { gold: [2, 8], drops: [['venison', 1], ['hide', 0.5]] },
  },
  // --- strange things
  imp: {
    name: 'Cinder Imp', tex: 'spr_imp', scale: 0.85, suicide: true, bark: 'undead', weak: { frost: 1.6, fire: 0.1 }, hp: 12, speed: 52, chase: 112, dmg: 22, detect: 96,
    kind: 'melee', range: 18, windup: 0.32, atkDur: 0.1, recover: 0.4, cooldown: 0.4, kbResist: 0,
    body: [8, 7, 4, 9], loot: { gold: [3, 9], drops: [['bone_dust', 0.4]] },
  },
  necro: {
    name: 'Grave Caller', tex: 'spr_necro', raise: 6.5, bark: 'undead', weak: { fire: 1.4, shock: 1.5 }, hp: 44, speed: 26, chase: 34, dmg: 16, detect: 100,
    kind: 'cast', range: 118, keep: 70, zoneR: 22, zoneDelay: 1.0, windup: 0.85, atkDur: 0.1, recover: 0.7, cooldown: 2.8, kbResist: 0.1,
    body: [8, 7, 4, 9], loot: { gold: [14, 30], drops: [['mp_potion', 0.4], ['bone_dust', 0.8], ['frost_lily', 0.5]] },
  },
  shroom: {
    name: 'Spore Mother', tex: 'spr_shroom', sideOnly: true, stationary: true, scale: 1.3, bark: 'undead', weak: { fire: 1.8 }, hp: 48, speed: 0, chase: 0, dmg: 12, detect: 100,
    kind: 'cast', range: 110, keep: 0, zoneR: 20, zoneN: 4, zoneDelay: 0.9, windup: 0.8, atkDur: 0.1, recover: 0.6, cooldown: 2.4, kbResist: 0.9,
    body: [12, 8, 2, 7], loot: { gold: [6, 14], drops: [['snowberry', 0.8], ['frost_lily', 0.5]] },
  },
  golem: {
    name: 'Rime Golem', tex: 'spr_golem', scale: 1.7, armored: true, bark: 'undead', weak: { fire: 1.1, shock: 1.3, frost: 0.2 }, hp: 170, speed: 20, chase: 30, dmg: 28, detect: 70,
    kind: 'melee', range: 26, windup: 0.95, atkDur: 0.2, recover: 1.0, cooldown: 0.9, kbResist: 0.9,
    body: [8, 7, 4, 9], loot: { gold: [20, 40], drops: [['iron_ingot', 0.9], ['frost_lily', 0.6], ['hp_potion', 0.3]] },
  },
  wisp: {
    name: 'Pale Wisp', tex: 'spr_wisp', sideOnly: true, fly: true, blink: 3.2, bark: 'undead', weak: { shock: 1.4, frost: 0.5 }, hp: 18, speed: 30, chase: 52, dmg: 12, detect: 110,
    kind: 'shoot', proj: 'eshot', projSpeed: 78, range: 120, keep: 60, windup: 0.7, atkDur: 0.1, recover: 0.5, cooldown: 1.7, kbResist: 0.2,
    body: [8, 8, 4, 4], loot: { gold: [4, 12], drops: [['mp_potion', 0.35]] },
  },
  frostworm: {
    name: 'Frost Worm', tex: 'spr_worm', sideOnly: true, burrow: true, scale: 1.4, bark: 'wolf', weak: { fire: 1.5 }, hp: 70, speed: 40, chase: 84, dmg: 20, detect: 130,
    kind: 'melee', range: 22, windup: 0.5, atkDur: 0.2, recover: 0.7, cooldown: 0.8, kbResist: 0.5,
    body: [12, 8, 2, 7], loot: { gold: [8, 18], drops: [['frost_lily', 0.7], ['bone_dust', 0.5]] },
  },
  mimic: {
    name: 'Mimic', tex: 'spr_mimic', sideOnly: true, bark: 'wolf', weak: { fire: 1.3, shock: 1.2 }, hp: 74, speed: 36, chase: 74, dmg: 19, detect: 0,
    kind: 'lunge', range: 60, windup: 0.4, atkDur: 0.34, recover: 0.8, cooldown: 0.9, kbResist: 0.3, lunge: 190,
    body: [14, 8, 1, 7], loot: { gold: [30, 60], drops: [['hp_potion', 0.6], ['lockpick', 0.6]] },
  },
  // --- dragonkind
  wyvern: {
    name: 'Ash Wyvern', tex: 'spr_wyvern', sideOnly: true, fly: true, orbit: true, scale: 1.5, bark: 'wolf', weak: { frost: 1.5, shock: 1.1, fire: 0.1 }, hp: 72, speed: 40, chase: 78, dmg: 19, detect: 130,
    kind: 'lunge', range: 150, windup: 0.5, atkDur: 0.45, recover: 0.9, cooldown: 1.2, kbResist: 0.3, lunge: 250,
    body: [12, 8, 2, 4], loot: { gold: [12, 28], drops: [['hide', 0.9], ['hp_potion', 0.2], ['iron_ingot', 0.4]] },
  },
  dragon: {
    name: 'Skaldrath', title: 'SKALDRATH, THE EMBER WYRM', tex: 'spr_dragon', sideOnly: true, bark: 'wolf', weak: { frost: 1.6, shock: 1.1, fire: 0.05 },
    hp: 1000, speed: 36, chase: 46, dmg: 30, detect: 9999,
    kind: 'boss', range: 46, windup: 0.8, atkDur: 0.2, recover: 0.7, cooldown: 0.9, kbResist: 0.95,
    body: [14, 8, 1, 7], loot: { gold: [350, 500], drops: [['hp_potion_g', 1], ['mp_potion_g', 1]] },
  },
  // --- combat-variety enemies: each one asks the player to change habits ---
  reaver: {
    name: 'Rime Reaver', tex: 'spr_draugr', tint: 0x9fc0ff, blade: 3, bark: 'undead', weak: { fire: 1.4, frost: 0.5 }, punishRoll: true,
    hp: 55, speed: 34, chase: 58, dmg: 16, detect: 72,
    kind: 'melee', range: 20, windup: 0.5, atkDur: 0.16, recover: 0.5, cooldown: 0.4, kbResist: 0.2,
    body: [8, 7, 4, 9], loot: { gold: [10, 20], drops: [['bone_dust', 0.5], ['hp_potion', 0.2], ['iron_ingot', 0.25]] },
  },
  knight: {
    name: 'Rime Knight', tex: 'spr_warden', tint: 0xcfe8ff, blade: 4, bark: 'undead', weak: { fire: 1.2, shock: 1.3, frost: 0.4 }, armored: true,
    hp: 70, speed: 28, chase: 42, dmg: 19, detect: 66,
    kind: 'melee', range: 20, windup: 0.75, atkDur: 0.16, recover: 0.8, cooldown: 0.8, kbResist: 0.6,
    body: [8, 7, 4, 9], loot: { gold: [14, 28], drops: [['iron_ingot', 0.6], ['hp_potion', 0.25], ['iron_shield', 0.1], ['bone_dust', 0.5]] },
  },
  fencer: {
    name: 'Snow Fencer', tex: 'spr_bandit', tint: 0xbfe4ff, blade: 5, bark: 'human', dodge: true,
    hp: 40, speed: 40, chase: 72, dmg: 12, detect: 82,
    kind: 'melee', range: 21, windup: 0.3, atkDur: 0.14, recover: 0.45, cooldown: 0.25, kbResist: 0.1,
    body: [8, 7, 4, 9], loot: { gold: [10, 24], drops: [['sp_potion', 0.3], ['hunting_knife', 0.1], ['lockpick', 0.3]] },
  },
};

// Spoken lines (shown above the head). Keys: alert / flee / rally.
export const BARKS = {
  wolf: { alert: ['GRRR', 'GRAAR'], flee: ['*WHINE*'] },
  undead: { alert: ['COLD...', 'JOIN US', 'WARM BLOOD', 'NO REST...'], flee: ['...'] },
  human: { alert: ['HEY!', 'GET HIM!', 'INTRUDER!', 'YOUR COIN!'], flee: ['RETREAT!', 'NOT WORTH IT!'] },
};
