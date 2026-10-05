// The one mutable game-state object: this is exactly what gets saved.
export const SKILLS = ['oneHanded', 'archery', 'destruction', 'restoration', 'sneak'];

export function newState() {
  return {
    map: 'village', spawn: 'start', x: null, y: null,
    maxHp: 100, maxMp: 100, maxSp: 100,
    hp: 100, mp: 100, sp: 100,
    arrows: 15, gold: 0, spell: 'fire',
    skills: Object.fromEntries(SKILLS.map((k) => [k, { lvl: 1, xp: 0 }])),
    inv: { hp_potion: 2, mp_potion: 1, sp_potion: 1, rusty_sword: 1, hunting_bow: 1, fur_tunic: 1 },
    equip: { weapon: 'rusty_sword', offhand: null, bow: 'hunting_bow', armor: 'fur_tunic', charm: null },
    quests: {
      wolves: { status: 'inactive', kills: 0 },
      king: { status: 'inactive' },
      herbs: { status: 'inactive' },
      locket: { status: 'inactive' },
      alpha: { status: 'inactive' },
    },
    flags: {},
    fog: {},
    perks: {}, perkPoints: 0, charLevel: 1, pendingStat: 0, skillUps: 0,
    bonusHp: 0, bonusMp: 0, bonusSp: 0,
    upgrades: {}, enchants: {},
    lore: {}, kills: {}, seen: {}, tips: {},
    time: 9 * 60, weather: 'snow', respawn: { map: 'village', spawn: 'start' },
    follower: false, bossState: null,
    playtime: 0,
  };
}

// Singleton: mutate in place so every module sees the same object.
export const S = newState();

export function resetState() {
  const fresh = newState();
  for (const k of Object.keys(S)) delete S[k];
  Object.assign(S, fresh);
}
export function loadInto(data) {
  const fresh = newState();
  for (const k of Object.keys(S)) delete S[k];
  Object.assign(S, fresh, data);
  // make sure nested defaults exist for older saves
  for (const k of SKILLS) S.skills[k] ||= { lvl: 1, xp: 0 };
  S.equip = { ...fresh.equip, ...S.equip };
  S.quests = { ...fresh.quests, ...S.quests };
}
