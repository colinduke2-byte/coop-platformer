// Enemy stat blocks. kind: melee | lunge | shoot | boss
// detect = sight radius in px (halved or less when the player sneaks).
export const ENEMIES = {
  grimfang: {
    name: 'Grimfang', title: 'GRIMFANG, THE PALE ALPHA', tex: 'spr_grimfang', sideOnly: true, bark: 'wolf', weak: { fire: 1.3 },
    hp: 290, speed: 40, chase: 74, dmg: 17, detect: 9999,
    kind: 'boss', range: 40, windup: 0.6, atkDur: 0.2, recover: 0.7, cooldown: 0.9, kbResist: 0.95,
    body: [12, 6, 2, 8], loot: { gold: [80, 120], drops: [['pale_pelt', 1], ['wolf_fang', 1], ['wolf_fang', 1], ['hp_potion_g', 0.7]] },
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
