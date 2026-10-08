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
  admiral: {
    name: 'Admiral Veyl', title: 'ADMIRAL VEYL, THE DROWNED', tex: 'spr_admiral', bark: 'undead', weak: { shock: 1.5, fire: 1.1, frost: 0.3 },
    hp: 780, speed: 34, chase: 42, dmg: 24, detect: 9999,
    kind: 'boss', range: 42, windup: 0.75, atkDur: 0.2, recover: 0.7, cooldown: 0.9, kbResist: 0.96,
    body: [8, 7, 4, 9], loot: { gold: [220, 300], drops: [['admiral_cutlass', 1], ['hp_potion_g', 1], ['gem_sapphire', 0.6]] },
  },
  hollowking: {
    name: 'The Hollow King', title: 'THE HOLLOW KING, LAST OF THE KINGS', tex: 'spr_hollowking', bark: 'undead', weak: { fire: 1.3, shock: 1.2, frost: 0.4 },
    hp: 1500, speed: 38, chase: 48, dmg: 30, detect: 9999,
    kind: 'boss', range: 44, windup: 0.65, atkDur: 0.2, recover: 0.6, cooldown: 0.75, kbResist: 0.98,
    body: [8, 7, 4, 9], loot: { gold: [500, 650], drops: [['kings_blade', 1], ['kings_signet', 1], ['hp_potion_g', 2], ['gem_bloodstone', 1]] },
  },
  sovereign: {
    name: 'The Ashen Sovereign', title: 'THE ASHEN SOVEREIGN, CROWN OF THE FIRST FIRE', tex: 'spr_sovereign', bark: 'undead', weak: { frost: 1.6, shock: 1.0, fire: 0.2 },
    hp: 980, speed: 38, chase: 46, dmg: 28, detect: 9999,
    kind: 'boss', range: 42, windup: 0.7, atkDur: 0.2, recover: 0.65, cooldown: 0.8, kbResist: 0.97,
    body: [8, 7, 4, 9], loot: { gold: [320, 420], drops: [['sovereign_heart', 1], ['hp_potion_g', 2], ['ember_ore', 2]] },
  },
  kragnar: {
    name: 'Kragnar', title: 'KRAGNAR THE HOLLOWED, KING UNDER THE LODE', tex: 'spr_kragnar', bark: 'undead', weak: { frost: 1.4, shock: 1.1, fire: 0.5 },
    hp: 560, speed: 34, chase: 42, dmg: 24, detect: 9999,
    kind: 'boss', range: 40, windup: 0.75, atkDur: 0.2, recover: 0.7, cooldown: 0.9, kbResist: 0.95,
    body: [8, 7, 4, 9], loot: { gold: [160, 220], drops: [['kragnar_core', 1], ['ember_ore', 1], ['hp_potion_g', 1]] },
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
  werewolf: {
    name: 'Werewolf', tex: 'spr_werewolf', scale: 1.25, bark: 'wolf', weak: { fire: 1.4, shock: 1.1 }, hp: 52, speed: 46, chase: 96, dmg: 16, detect: 120,
    kind: 'lunge', range: 52, windup: 0.4, atkDur: 0.3, recover: 0.7, cooldown: 0.8, kbResist: 0.25, lunge: 200,
    body: [12, 6, 2, 8], loot: { gold: [6, 16], drops: [['hp_potion', 0.2], ['wolf_fang', 0.5], ['pale_pelt', 0.15]] },
  },
  ghost: {
    name: 'Restless Ghost', tex: 'spr_ghost', ghostly: true, bark: 'undead', weak: { shock: 1.4, fire: 0.7, frost: 0.2 }, hp: 28, speed: 26, chase: 40, dmg: 14, detect: 100,
    kind: 'shoot', proj: 'eshot', projSpeed: 84, range: 108, keep: 56, windup: 0.75, atkDur: 0.1, recover: 0.6, cooldown: 1.9, kbResist: 0.3,
    body: [8, 7, 4, 9], loot: { gold: [5, 14], drops: [['mp_potion', 0.3], ['bone_dust', 0.4]] },
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
    body: [8, 7, 4, 9], loot: { gold: [30, 60], drops: [['iron_shield', 0.5], ['steel_sword', 0.25], ['lockpick', 1], ['hp_potion', 0.6], ['iron_ingot', 0.7], ['smugglers_note', 0.3]] },
  },
  conjurer: {
    name: 'Hexcaster', tex: 'spr_conjurer', bark: 'undead', weak: { fire: 1.3, shock: 1.5 },
    hp: 30, speed: 28, chase: 36, dmg: 17, detect: 96,
    kind: 'cast', range: 120, keep: 64, zoneR: 24, zoneDelay: 1.0, windup: 0.8, atkDur: 0.1, recover: 0.7, cooldown: 2.6, kbResist: 0.1,
    body: [8, 7, 4, 9], loot: { gold: [10, 22], drops: [['mp_potion', 0.4], ['frost_lily', 0.5], ['bone_dust', 0.4]] },
  },
  deer: {
    name: 'Deer', tex: 'spr_deer', sideOnly: true, passive: true, hp: 14, speed: 24, chase: 92, dmg: 0, detect: 70,
    kind: 'melee', range: 0, windup: 1, atkDur: 0.1, recover: 0.5, cooldown: 9, kbResist: 0,
    body: [12, 6, 2, 8], loot: { gold: [0, 0], drops: [['venison', 1], ['hide', 0.7]] },
  },
  hare: {
    name: 'Snow Hare', tex: 'spr_hare', sideOnly: true, passive: true, hp: 6, speed: 30, chase: 118, dmg: 0, detect: 80,
    kind: 'melee', range: 0, windup: 1, atkDur: 0.1, recover: 0.5, cooldown: 9, kbResist: 0,
    body: [12, 6, 2, 8], loot: { gold: [0, 0], drops: [['venison', 0.7], ['hide', 0.25]] },
  },
  fox: {
    name: 'Ember Fox', tex: 'spr_fox', sideOnly: true, passive: true, hp: 10, speed: 30, chase: 104, dmg: 0, detect: 90,
    kind: 'melee', range: 0, windup: 1, atkDur: 0.1, recover: 0.5, cooldown: 9, kbResist: 0,
    body: [12, 6, 2, 8], loot: { gold: [4, 14], drops: [['hide', 0.8], ['wolf_fang', 0.3]] },
  },
  bearcub: {
    name: 'Bear Cub', tex: 'spr_bear', sideOnly: true, scale: 0.65, bark: 'wolf', weak: { fire: 1.2 }, hp: 24, speed: 38, chase: 78, dmg: 6, detect: 70,
    kind: 'melee', range: 16, windup: 0.4, atkDur: 0.14, recover: 0.5, cooldown: 0.6, kbResist: 0,
    body: [12, 7, 2, 8], loot: { gold: [1, 3], drops: [['hide', 0.5]] },
  },
  // --- roaming world bosses (see world/roamers.js)
  elk: {
    name: 'Winter Elk', tex: 'spr_elk', sideOnly: true, scale: 1.9, bark: 'wolf', weak: { fire: 1.3 }, hp: 300, speed: 34, chase: 96, dmg: 24, detect: 110,
    kind: 'lunge', range: 84, windup: 0.7, atkDur: 0.45, recover: 1.0, cooldown: 1.1, kbResist: 0.7, lunge: 250,
    body: [16, 8, 0, 7], loot: { gold: [90, 160], drops: [['venison', 1], ['hide', 1], ['hp_potion_g', 0.8]] },
  },
  troll: {
    name: 'Bridge Troll', tex: 'spr_troll', scale: 2.0, bark: 'undead', weak: { fire: 1.5 }, hp: 460, speed: 26, chase: 44, dmg: 30, detect: 90, regenRate: 0.012,
    kind: 'melee', range: 30, windup: 0.95, atkDur: 0.22, recover: 1.1, cooldown: 0.8, kbResist: 0.85,
    body: [9, 8, 3, 8], loot: { gold: [120, 220], drops: [['hp_potion_g', 0.8], ['mp_potion_g', 0.5], ['iron_ingot', 1]] },
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
    body: [28, 14, 10, 14], loot: { gold: [350, 500], drops: [['hp_potion_g', 1], ['mp_potion_g', 1]] },
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

// ---- Phase 14: twelve new creatures, three or four for each region beyond the Reach
Object.assign(ENEMIES, {
  ashhound: {
    name: 'Ash Hound', tex: 'spr_ashhound', sideOnly: true, bark: 'wolf', weak: { frost: 1.4 }, hp: 34, speed: 50, chase: 98, dmg: 11, detect: 100,
    kind: 'lunge', range: 72, windup: 0.32, atkDur: 0.3, recover: 0.55, cooldown: 0.6, kbResist: 0.15, lunge: 220,
    body: [10, 6, 2, 8], loot: { gold: [4, 12], drops: [['bone_dust', 0.5], ['hide', 0.4]] },
  },
  cindersmith: {
    name: 'Cinder Smith', tex: 'spr_cindersmith', blade: 12, bark: 'human', armored: true, weak: { frost: 1.3, shock: 1.2 }, hp: 96, speed: 22, chase: 34, dmg: 24, detect: 70,
    kind: 'melee', range: 24, windup: 0.9, atkDur: 0.18, recover: 1.0, cooldown: 1.0, kbResist: 0.7,
    body: [8, 7, 4, 9], loot: { gold: [18, 34], drops: [['warhammer', 0.04], ['rune_ignite', 0.05], ['iron_ingot', 0.7], ['ash_iron', 0.5], ['hp_potion', 0.2]] },
  },
  magmaslime: {
    name: 'Magma Slime', tex: 'spr_slime', sideOnly: true, splits: { kind: 'slimeling', n: 2 }, weak: { frost: 1.5, fire: 0.2 }, hp: 42, speed: 24, chase: 50, dmg: 10, detect: 80,
    kind: 'melee', range: 20, windup: 0.5, atkDur: 0.16, recover: 0.6, cooldown: 0.6, kbResist: 0.3,
    body: [10, 7, 3, 8], loot: { gold: [3, 9], drops: [['ember_ore', 0.08], ['bone_dust', 0.3]] },
  },
  slimeling: {
    name: 'Slimeling', tex: 'spr_slime', sideOnly: true, scale: 0.7, weak: { frost: 1.5, fire: 0.2 }, hp: 14, speed: 34, chase: 66, dmg: 5, detect: 90,
    kind: 'melee', range: 16, windup: 0.4, atkDur: 0.14, recover: 0.5, cooldown: 0.5, kbResist: 0.1,
    body: [10, 7, 3, 8], loot: { gold: [1, 4], drops: [] },
  },
  lavawraith: {
    name: 'Lava Wraith', tex: 'spr_lavawraith', fly: true, bark: 'undead', weak: { frost: 1.6, shock: 1.2, fire: 0.1 }, hp: 36, speed: 28, chase: 42, dmg: 13, detect: 120,
    kind: 'shoot', proj: 'eshot', projSpeed: 108, range: 118, keep: 62, windup: 0.6, atkDur: 0.1, recover: 0.5, cooldown: 1.5, kbResist: 0.2,
    body: [8, 7, 4, 9], loot: { gold: [8, 18], drops: [['tome_embernova', 0.04], ['rune_drain', 0.04], ['mp_potion', 0.3], ['ember_ore', 0.1]] },
  },
  harpooner: {
    name: 'Ice Harpooner', tex: 'spr_harpooner', bark: 'human', pull: true, weak: { fire: 1.2, shock: 1.2 }, hp: 34, speed: 30, chase: 40, dmg: 9, detect: 108,
    kind: 'shoot', proj: 'arrow', projSpeed: 140, range: 124, keep: 70, windup: 0.8, atkDur: 0.1, recover: 0.7, cooldown: 2.4, kbResist: 0.1,
    body: [8, 7, 4, 9], loot: { gold: [8, 18], drops: [['crossbow', 0.05], ['arrows', 0.6, [3, 8]], ['hunting_knife', 0.05]] },
  },
  wreckcrab: {
    name: 'Wreck Crab', tex: 'spr_crab', sideOnly: true, shield: true, bark: 'wolf', weak: { shock: 1.4, fire: 0.9 }, hp: 70, speed: 22, chase: 44, dmg: 15, detect: 76,
    kind: 'melee', range: 22, windup: 0.55, atkDur: 0.16, recover: 0.7, cooldown: 0.7, kbResist: 0.5,
    body: [10, 7, 3, 8], loot: { gold: [6, 16], drops: [['hide', 0.3], ['smoked_pike', 0.15], ['iron_ingot', 0.2]] },
  },
  tidehag: {
    name: 'Tide Hag', tex: 'spr_tidehag', raise: 8, raiseKind: 'draugr', bark: 'undead', weak: { fire: 1.3, shock: 1.6, frost: 0.3 }, hp: 48, speed: 24, chase: 32, dmg: 16, detect: 100,
    kind: 'cast', range: 118, keep: 72, zoneR: 22, zoneDelay: 1.1, windup: 0.85, atkDur: 0.1, recover: 0.7, cooldown: 3.0, kbResist: 0.1,
    body: [8, 7, 4, 9], loot: { gold: [14, 30], drops: [['tome_glacier', 0.04], ['rune_rime', 0.05], ['mp_potion', 0.4], ['frost_lily', 0.5], ['bone_dust', 0.6], ['gem_sapphire', 0.06]] },
  },
  barnacle: {
    name: 'Frost Barnacle', tex: 'spr_barnacle', sideOnly: true, bark: 'wolf', weak: { fire: 1.4, shock: 0.8 }, hp: 40, speed: 0, chase: 0, dmg: 12, detect: 100,
    kind: 'shoot', proj: 'eshot', projSpeed: 100, range: 124, keep: 0, windup: 0.9, atkDur: 0.1, recover: 0.5, cooldown: 1.8, kbResist: 1,
    body: [10, 8, 3, 6], loot: { gold: [4, 10], drops: [['frost_lily', 0.4]] },
  },
  phantom: {
    name: 'Court Phantom', tex: 'spr_phantom', fly: true, blink: 3.4, bark: 'undead', weak: { fire: 1.2, shock: 1.5, frost: 0.4 }, hp: 44, speed: 32, chase: 56, dmg: 17, detect: 110,
    kind: 'melee', range: 20, windup: 0.4, atkDur: 0.14, recover: 0.6, cooldown: 0.7, kbResist: 0.2,
    body: [8, 7, 4, 9], loot: { gold: [14, 28], drops: [['rune_storm', 0.05], ['mp_potion', 0.35], ['bone_dust', 0.5]] },
  },
  herald: {
    name: 'Hollow Herald', tex: 'spr_herald', aura: true, bark: 'undead', weak: { fire: 1.2, shock: 1.3, frost: 0.4 }, hp: 60, speed: 24, chase: 34, dmg: 10, detect: 110,
    kind: 'shoot', proj: 'eshot', projSpeed: 90, range: 116, keep: 74, windup: 0.8, atkDur: 0.1, recover: 0.7, cooldown: 2.2, kbResist: 0.3,
    body: [8, 7, 4, 9], loot: { gold: [18, 36], drops: [['rune_ward', 0.05], ['mp_potion', 0.4], ['gem_amber', 0.08], ['hp_potion', 0.3]] },
  },
  sentinel: {
    name: 'Bone Sentinel', tex: 'spr_sentinel', leash: 64, armored: true, bark: 'undead', weak: { fire: 1.3, shock: 1.1, frost: 0.3 }, hp: 120, speed: 22, chase: 40, dmg: 26, detect: 70,
    kind: 'melee', range: 24, windup: 0.85, atkDur: 0.18, recover: 0.9, cooldown: 0.9, kbResist: 0.8,
    body: [8, 7, 4, 9], loot: { gold: [20, 40], drops: [['rune_thorns', 0.05], ['iron_ingot', 0.5], ['bone_dust', 0.8], ['gem_onyx', 0.06]] },
  },
  stalker: {
    name: 'Moss Stalker', tex: 'spr_stalker', ambush: true, bark: 'human', weak: { fire: 1.6 }, hp: 52, speed: 34, chase: 80, dmg: 16, detect: 92,
    kind: 'melee', range: 20, windup: 0.3, atkDur: 0.14, recover: 0.7, cooldown: 0.8, kbResist: 0.2,
    body: [8, 7, 4, 9], loot: { gold: [10, 24], drops: [['hide', 0.5], ['frost_lily', 0.4], ['lockpick', 0.2]] },
  },
});

// What each creature's hits do on top of damage (see systems/status.js): [{ type, chance, t, dps }]
const INFLICTS = {
  wolf: [{ type: 'bleed', chance: 0.15, t: 4, dps: 2 }], alpha: [{ type: 'bleed', chance: 0.3, t: 5, dps: 3 }],
  bear: [{ type: 'bleed', chance: 0.4, t: 5, dps: 4 }], elk: [{ type: 'bleed', chance: 0.3, t: 5, dps: 4 }], troll: [{ type: 'slow', chance: 0.4, t: 2.5 }], lynx: [{ type: 'bleed', chance: 0.45, t: 5, dps: 3 }],
  boar: [{ type: 'bleed', chance: 0.2, t: 4, dps: 3 }], imp: [{ type: 'burn', chance: 0.7, t: 3, dps: 4 }],
  wyvern: [{ type: 'burn', chance: 0.35, t: 3, dps: 4 }], dragon: [{ type: 'burn', chance: 0.7, t: 4, dps: 6 }],
  wisp: [{ type: 'shock', chance: 0.6, t: 4 }], golem: [{ type: 'chill', chance: 0.5, stacks: 1 }],
  frostworm: [{ type: 'chill', chance: 0.8, stacks: 1 }], wyrm: [{ type: 'chill', chance: 0.6, stacks: 1 }],
  shroom: [{ type: 'poison', chance: 0.8, t: 8, dps: 2 }], bandit: [{ type: 'bleed', chance: 0.1, t: 4, dps: 2 }],
  winter: [{ type: 'chill', chance: 0.7, stacks: 1 }], tide: [{ type: 'slow', chance: 0.5, t: 3 }],
  ashhound: [{ type: 'burn', chance: 0.4, t: 3, dps: 3 }], cindersmith: [{ type: 'burn', chance: 0.35, t: 3, dps: 4 }], magmaslime: [{ type: 'burn', chance: 0.3, t: 3, dps: 3 }],
  lavawraith: [{ type: 'burn', chance: 0.5, t: 3, dps: 4 }], harpooner: [{ type: 'bleed', chance: 0.25, t: 4, dps: 3 }], barnacle: [{ type: 'chill', chance: 0.5, stacks: 1 }],
  tidehag: [{ type: 'slow', chance: 0.4, t: 3 }], phantom: [{ type: 'fear', chance: 0.25, t: 2.5 }], stalker: [{ type: 'poison', chance: 0.3, t: 6, dps: 2 }],
};
const IMMUNE = { ashhound: ['burn'], cindersmith: ['burn'], magmaslime: ['burn', 'bleed', 'poison'], slimeling: ['burn', 'bleed', 'poison'], lavawraith: ['burn', 'bleed', 'poison'], barnacle: ['chill', 'freeze'], phantom: ['bleed', 'poison', 'fear'], herald: ['fear'], sentinel: ['bleed', 'poison', 'fear'], tidehag: ['chill', 'freeze'], imp: ['burn'], dragon: ['burn'], golem: ['freeze', 'bleed', 'poison'], frostworm: ['chill', 'freeze'], wyrm: ['chill', 'freeze'], winter: ['chill', 'freeze'], wisp: ['bleed', 'poison'], draugr: ['fear'], wight: ['fear'] };
// ---- Round 6: the Weeping Fens and the Stormcrown Highlands
Object.assign(ENEMIES, {
  bogwraith: {
    name: 'Bog Wraith', tex: 'spr_bogwraith', fly: true, blink: 3.0, bark: 'undead', weak: { fire: 1.2, shock: 1.4, frost: 0.6 }, hp: 40, speed: 28, chase: 50, dmg: 14, detect: 120,
    kind: 'shoot', proj: 'eshot', projSpeed: 92, range: 116, keep: 64, windup: 0.65, atkDur: 0.1, recover: 0.5, cooldown: 1.6, kbResist: 0.2,
    body: [8, 7, 4, 9], loot: { gold: [10, 22], drops: [['mp_potion', 0.35], ['bone_dust', 0.4], ['marsh_orchid', 0.3]] },
  },
  boghag: {
    name: 'Bog Hag', tex: 'spr_boghag', raise: 7, raiseKind: 'leech', bark: 'undead', weak: { fire: 1.5, shock: 1.3 }, hp: 58, speed: 24, chase: 32, dmg: 17, detect: 100,
    kind: 'cast', range: 118, keep: 72, zoneR: 24, zoneDelay: 1.0, windup: 0.85, atkDur: 0.1, recover: 0.7, cooldown: 2.8, kbResist: 0.15,
    body: [8, 7, 4, 9], loot: { gold: [14, 32], drops: [['mp_potion', 0.4], ['marsh_orchid', 0.6], ['bone_dust', 0.5], ['gem_emerald', 0.07]] },
  },
  leech: {
    name: 'Fen Leech', tex: 'spr_leech', sideOnly: true, scale: 1.0, bark: 'wolf', weak: { fire: 1.5, shock: 0.8 }, hp: 14, speed: 48, chase: 104, dmg: 6, detect: 80,
    kind: 'lunge', range: 30, windup: 0.3, atkDur: 0.2, recover: 0.6, cooldown: 0.7, kbResist: 0, lunge: 150,
    body: [10, 5, 3, 9], loot: { gold: [1, 3], drops: [['marsh_orchid', 0.1]] },
  },
  mudlurker: {
    name: 'Mud Lurker', tex: 'spr_stalker', tint: 0x7fb070, ambush: true, bark: 'human', weak: { fire: 1.6, shock: 1.1 }, hp: 56, speed: 32, chase: 84, dmg: 17, detect: 80,
    kind: 'melee', range: 20, windup: 0.3, atkDur: 0.14, recover: 0.7, cooldown: 0.8, kbResist: 0.3,
    body: [8, 7, 4, 9], loot: { gold: [10, 24], drops: [['hide', 0.4], ['marsh_orchid', 0.4], ['lockpick', 0.15]] },
  },
  miremother: {
    name: 'The Mire Mother', title: 'THE MIRE MOTHER, WEEPER OF THE FENS', tex: 'spr_miremother', bark: 'undead', weak: { fire: 1.7, shock: 1.1, frost: 0.5 },
    hp: 900, speed: 34, chase: 44, dmg: 26, detect: 9999,
    kind: 'boss', range: 42, windup: 0.75, atkDur: 0.2, recover: 0.7, cooldown: 0.9, kbResist: 0.96,
    body: [8, 7, 4, 9], loot: { gold: [320, 420], drops: [['mire_heart', 1], ['hp_potion_g', 2], ['marsh_orchid', 3]] },
  },
  thunderbird: {
    name: 'Thunderbird', tex: 'spr_wyvern', tint: 0xa8d8ff, sideOnly: true, fly: true, orbit: true, scale: 1.3, bark: 'wolf', weak: { fire: 1.2, frost: 0.9, shock: 0.1 }, hp: 64, speed: 44, chase: 84, dmg: 18, detect: 140,
    kind: 'lunge', range: 150, windup: 0.5, atkDur: 0.45, recover: 0.9, cooldown: 1.2, kbResist: 0.3, lunge: 260,
    body: [12, 8, 2, 4], loot: { gold: [12, 28], drops: [['hide', 0.6], ['storm_feather', 0.5], ['hp_potion', 0.2]] },
  },
  mammoth: {
    name: 'Wild Mammoth', tex: 'spr_bear', tint: 0xcdb08a, sideOnly: true, scale: 2.0, bark: 'wolf', weak: { fire: 1.3, shock: 1.0 }, hp: 100, speed: 30, chase: 82, dmg: 21, detect: 90,
    kind: 'lunge', range: 74, windup: 0.8, atkDur: 0.4, recover: 1.0, cooldown: 1.2, kbResist: 0.85, lunge: 230,
    body: [14, 8, 1, 7], loot: { gold: [60, 110], drops: [['hide', 1], ['venison', 1], ['hp_potion_g', 0.6], ['mammoth_tusk', 0.5]] },
  },
  nomad: {
    name: 'Clan Raider', tex: 'spr_nomad', blade: 5, bark: 'human', flee: true, hp: 46, speed: 38, chase: 58, dmg: 15, detect: 80,
    kind: 'melee', range: 20, windup: 0.38, atkDur: 0.14, recover: 0.5, cooldown: 0.35, kbResist: 0.15,
    body: [8, 7, 4, 9], loot: { gold: [8, 20], drops: [['hp_potion', 0.22], ['arrows', 0.25, [2, 5]], ['hide', 0.3], ['iron_sword', 0.05]] },
  },
  nomadshaman: {
    name: 'Storm Shaman', tex: 'spr_shaman', bark: 'human', weak: { fire: 1.2, frost: 1.1, shock: 0.1 }, hp: 44, speed: 28, chase: 36, dmg: 17, detect: 100,
    kind: 'cast', range: 120, keep: 68, zoneR: 24, zoneDelay: 1.0, windup: 0.8, atkDur: 0.1, recover: 0.7, cooldown: 2.4, kbResist: 0.1,
    body: [8, 7, 4, 9], loot: { gold: [14, 30], drops: [['mp_potion', 0.4], ['storm_feather', 0.3], ['gem_sapphire', 0.07]] },
  },
  stonegiant: {
    name: 'Stone Giant', tex: 'spr_stonegiant', scale: 2.2, armored: true, bark: 'undead', weak: { shock: 1.4, frost: 0.8, fire: 0.6 }, hp: 200, speed: 24, chase: 40, dmg: 26, detect: 90,
    kind: 'melee', range: 32, windup: 1.0, atkDur: 0.24, recover: 1.1, cooldown: 0.9, kbResist: 0.9,
    body: [9, 8, 3, 8], loot: { gold: [120, 220], drops: [['hp_potion_g', 0.8], ['iron_ingot', 1], ['gem_onyx', 0.3]] },
  },
  stormgiant: {
    name: 'The Storm Giant', title: 'THE STORM GIANT, KEEPER OF THE STORMCROWN', tex: 'spr_stormgiant', bark: 'undead', weak: { frost: 1.3, fire: 1.0, shock: 0.05 },
    hp: 1150, speed: 34, chase: 44, dmg: 30, detect: 9999,
    kind: 'boss', range: 44, windup: 0.7, atkDur: 0.2, recover: 0.7, cooldown: 0.85, kbResist: 0.97,
    body: [8, 7, 4, 9], loot: { gold: [420, 560], drops: [['storm_heart', 1], ['hp_potion_g', 2], ['gem_sapphire', 1]] },
  },
});
Object.assign(INFLICTS, {
  werewolf: [{ type: 'bleed', chance: 0.35, t: 5, dps: 3 }], ghost: [{ type: 'fear', chance: 0.2, t: 2.5 }],
  bogwraith: [{ type: 'poison', chance: 0.4, t: 5, dps: 2 }], boghag: [{ type: 'slow', chance: 0.4, t: 3 }], leech: [{ type: 'poison', chance: 0.6, t: 5, dps: 2 }], mudlurker: [{ type: 'poison', chance: 0.35, t: 6, dps: 2 }],
  miremother: [{ type: 'poison', chance: 0.5, t: 6, dps: 3 }], thunderbird: [{ type: 'shock', chance: 0.4, t: 3 }], nomadshaman: [{ type: 'shock', chance: 0.5, t: 3 }],
  mammoth: [{ type: 'bleed', chance: 0.3, t: 5, dps: 4 }], stormgiant: [{ type: 'shock', chance: 0.5, t: 3 }],
});
Object.assign(IMMUNE, { bogwraith: ['poison', 'bleed'], boghag: ['poison'], leech: ['poison'], mudlurker: ['poison'], miremother: ['poison'], thunderbird: ['shock'], nomadshaman: ['shock'], stonegiant: ['bleed', 'poison'], stormgiant: ['shock'] });
// ---- Round 6 (leftovers): the Glasswood, the Underdeep, Saltmarket's Cove
Object.assign(ENEMIES, {
  glimmerkin: {
    name: 'Glimmerkin', tex: 'spr_wisp', tint: 0xc8fff0, sideOnly: true, fly: true, blink: 2.6, bark: 'undead', weak: { shock: 1.2, fire: 1.1, frost: 0.7 }, hp: 34, speed: 32, chase: 54, dmg: 12, detect: 116,
    kind: 'shoot', proj: 'eshot', projSpeed: 88, range: 116, keep: 62, windup: 0.6, atkDur: 0.1, recover: 0.5, cooldown: 1.5, kbResist: 0.2,
    body: [8, 8, 4, 4], loot: { gold: [8, 18], drops: [['glimmer_dust', 0.5], ['mp_potion', 0.3]] },
  },
  crystalgolem: {
    name: 'Crystal Golem', tex: 'spr_golem', tint: 0xa8f0ff, scale: 1.6, armored: true, bark: 'undead', weak: { shock: 1.2, fire: 0.9, frost: 0.4 }, hp: 150, speed: 22, chase: 34, dmg: 26, detect: 72,
    kind: 'melee', range: 26, windup: 0.9, atkDur: 0.2, recover: 1.0, cooldown: 0.9, kbResist: 0.88,
    body: [8, 7, 4, 9], loot: { gold: [18, 40], drops: [['glimmer_dust', 0.5], ['iron_ingot', 0.6], ['gem_topaz', 0.05]] },
  },
  glassstag: {
    name: 'Glass Stag', tex: 'spr_elk', tint: 0xbfe8ff, sideOnly: true, scale: 1.2, bark: 'wolf', weak: { fire: 1.2, shock: 1.0 }, hp: 90, speed: 42, chase: 96, dmg: 20, detect: 96,
    kind: 'lunge', range: 60, windup: 0.55, atkDur: 0.35, recover: 0.9, cooldown: 1.1, kbResist: 0.5, lunge: 230,
    body: [12, 8, 2, 7], loot: { gold: [20, 40], drops: [['hide', 0.7], ['venison', 0.8], ['glimmer_dust', 0.4]] },
  },
  hartking: {
    name: 'The Hartking', title: 'THE HARTKING, WEARER OF THE WOOD', tex: 'spr_hartking', bark: 'undead', weak: { fire: 1.5, shock: 1.1, frost: 0.5 },
    hp: 1000, speed: 38, chase: 48, dmg: 28, detect: 9999,
    kind: 'boss', range: 42, windup: 0.7, atkDur: 0.2, recover: 0.7, cooldown: 0.85, kbResist: 0.96,
    body: [8, 7, 4, 9], loot: { gold: [360, 480], drops: [['glass_heart', 1], ['hp_potion_g', 2], ['glimmer_dust', 4]] },
  },
  caveweaver: {
    name: 'Cave Weaver', tex: 'spr_spider', sideOnly: true, scale: 1.2, ambush: true, bark: 'wolf', weak: { fire: 1.7, frost: 0.9 }, hp: 44, speed: 40, chase: 92, dmg: 14, detect: 84,
    kind: 'lunge', range: 40, windup: 0.4, atkDur: 0.25, recover: 0.7, cooldown: 0.9, kbResist: 0.15, lunge: 170,
    body: [10, 7, 3, 8], loot: { gold: [8, 20], drops: [['weaver_silk', 0.5], ['bone_dust', 0.3], ['hide', 0.2]] },
  },
  lodeling: {
    name: 'Lodeling', tex: 'spr_crab', tint: 0xc09060, sideOnly: true, shield: true, scale: 1.2, bark: 'wolf', weak: { shock: 1.2, frost: 1.0, fire: 0.6 }, hp: 96, speed: 24, chase: 48, dmg: 22, detect: 76,
    kind: 'melee', range: 24, windup: 0.6, atkDur: 0.16, recover: 0.7, cooldown: 0.8, kbResist: 0.6,
    body: [10, 7, 3, 8], loot: { gold: [14, 30], drops: [['iron_ingot', 0.7], ['ember_ore', 0.05], ['gem_amber', 0.05]] },
  },
  deepdelver: {
    name: 'Hollowed Delver', tex: 'spr_prospector', tint: 0x9ab0c8, bark: 'undead', weak: { fire: 1.3, shock: 1.2, frost: 0.8 }, hp: 70, speed: 34, chase: 56, dmg: 20, detect: 80,
    kind: 'melee', range: 22, windup: 0.42, atkDur: 0.14, recover: 0.6, cooldown: 0.55, kbResist: 0.3,
    body: [8, 7, 4, 9], loot: { gold: [12, 28], drops: [['iron_ingot', 0.4], ['hp_potion', 0.25], ['lockpick', 0.15], ['bone_dust', 0.3]] },
  },
  gloomcap: {
    name: 'Gloomcap', tex: 'spr_shroom', tint: 0xb0a0ff, sideOnly: true, stationary: true, scale: 1.3, bark: 'undead', weak: { fire: 1.8 }, hp: 52, speed: 0, chase: 0, dmg: 13, detect: 100,
    kind: 'cast', range: 112, keep: 0, zoneR: 22, zoneN: 4, zoneDelay: 0.9, windup: 0.8, atkDur: 0.1, recover: 0.6, cooldown: 2.3, kbResist: 0.9,
    body: [12, 8, 2, 7], loot: { gold: [8, 18], drops: [['glowcap', 0.7], ['bone_dust', 0.2]] },
  },
  lodecolossus: {
    name: 'The Lode Colossus', title: 'THE LODE COLOSSUS, EATER OF THE DEEP', tex: 'spr_lodecolossus', armored: false, bark: 'undead', weak: { shock: 1.3, frost: 1.1, fire: 0.5 },
    hp: 1300, speed: 30, chase: 40, dmg: 32, detect: 9999,
    kind: 'boss', range: 46, windup: 0.8, atkDur: 0.2, recover: 0.8, cooldown: 0.9, kbResist: 0.97,
    body: [8, 7, 4, 9], loot: { gold: [440, 600], drops: [['lode_heart', 1], ['hp_potion_g', 2], ['ember_ore', 3]] },
  },
  brinegut: {
    name: 'Captain Brinegut', title: 'CAPTAIN BRINEGUT, LORD OF SEAWEED COVE', tex: 'spr_brinegut', bark: 'human', weak: { fire: 1.2, shock: 1.3, frost: 0.9 },
    hp: 1100, speed: 40, chase: 52, dmg: 28, detect: 9999,
    kind: 'boss', range: 42, windup: 0.65, atkDur: 0.2, recover: 0.65, cooldown: 0.8, kbResist: 0.95,
    body: [8, 7, 4, 9], loot: { gold: [420, 560], drops: [['brine_ledger', 1], ['hp_potion_g', 2], ['pearl', 3]] },
  },
});
Object.assign(INFLICTS, {
  glimmerkin: [{ type: 'shock', chance: 0.3, t: 3 }], crystalgolem: [{ type: 'slow', chance: 0.3, t: 3 }], glassstag: [{ type: 'bleed', chance: 0.3, t: 4, dps: 3 }],
  hartking: [{ type: 'bleed', chance: 0.4, t: 5, dps: 3 }], caveweaver: [{ type: 'poison', chance: 0.6, t: 6, dps: 3 }], gloomcap: [{ type: 'poison', chance: 0.7, t: 7, dps: 2 }],
  lodecolossus: [{ type: 'burn', chance: 0.4, t: 3, dps: 4 }], brinegut: [{ type: 'bleed', chance: 0.4, t: 5, dps: 3 }],
});
Object.assign(IMMUNE, { glimmerkin: ['shock'], crystalgolem: ['bleed', 'poison'], hartking: ['bleed'], caveweaver: ['poison'], gloomcap: ['poison'], lodeling: ['poison', 'bleed'], lodecolossus: ['burn', 'poison'] });
for (const k of ['wreckcrab', 'barnacle']) if (ENEMIES[k]) ENEMIES[k].loot.drops.push(['pearl', k === 'barnacle' ? 0.22 : 0.18], ['salt_crystal', 0.18]);
for (const k of ['crystalgolem', 'lodeling', 'lodecolossus']) ENEMIES[k].crush = true;
// creatures whose blows smash through a raised shield (only a perfectly timed parry beats them)
for (const k of ['bear', 'golem', 'boar', 'knight', 'reaver', 'warlord', 'elk', 'troll', 'cindersmith', 'sentinel', 'mammoth', 'stonegiant']) if (ENEMIES[k]) ENEMIES[k].crush = true;
// pack hunters circle to opposite sides and pounce together; some humans slip away and drink a healing draught
for (const k of ['wolf', 'alpha', 'lynx', 'fencer', 'ashhound', 'werewolf', 'leech']) if (ENEMIES[k]) ENEMIES[k].flank = true;
for (const k of ['bandit', 'fencer']) if (ENEMIES[k]) { ENEMIES[k].flee = true; ENEMIES[k].drinks = true; }
for (const [k, v] of Object.entries(INFLICTS)) if (ENEMIES[k]) ENEMIES[k].inflicts = v;
for (const [k, v] of Object.entries(IMMUNE)) if (ENEMIES[k]) ENEMIES[k].immune = v;

// Spoken lines (shown above the head). Keys: alert / flee / rally.
export const BARKS = {
  wolf: { alert: ['GRRR', 'GRAAR'], flee: ['*WHINE*'] },
  undead: { alert: ['COLD...', 'JOIN US', 'WARM BLOOD', 'NO REST...'], flee: ['...'] },
  human: { alert: ['HEY!', 'GET HIM!', 'INTRUDER!', 'YOUR COIN!'], flee: ['RETREAT!', 'NOT WORTH IT!'] },
};
