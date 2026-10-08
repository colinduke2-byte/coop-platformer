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
      hearts: { status: 'inactive' },
      company: { status: 'inactive' },
      trail: { status: 'inactive' },
      toll: { status: 'inactive' },
      silence: { status: 'inactive' },
      anvilcore: { status: 'inactive' }, pelldebt: { status: 'inactive' }, tornmap: { status: 'inactive' }, letter: { status: 'inactive' }, journal: { status: 'inactive' }, ragnagrave: { status: 'inactive' },
      roadwatch: { status: 'inactive' },
      crown: { status: 'inactive' },
      admiral: { status: 'inactive' },
      hamlets: { status: 'inactive' },
      circles: { status: 'inactive' },
      barrows3: { status: 'inactive' },
      denmother: { status: 'inactive' },
      towerwatch: { status: 'inactive' },
      hollowking: { status: 'inactive' },
      smugglers: { status: 'inactive' },
      miremother: { status: 'inactive' }, leeches: { status: 'inactive' }, orchids: { status: 'inactive' },
      stormgiant: { status: 'inactive' }, feathers: { status: 'inactive' }, greytusk: { status: 'inactive' },
      hartking: { status: 'inactive' }, glimmers: { status: 'inactive' }, bloom: { status: 'inactive' }, moonlit: { status: 'inactive' },
      lodecolossus: { status: 'inactive' }, weavers: { status: 'inactive' }, glowcaps: { status: 'inactive' },
      brinegut: { status: 'inactive' }, pearls: { status: 'inactive' }, channel: { status: 'inactive' }, saltrun: { status: 'inactive' },
    },
    flags: {},
    fog: {},
    perks: {}, perkPoints: 0, charLevel: 1, pendingStat: 0, skillUps: 0,
    bonusHp: 0, bonusMp: 0, bonusSp: 0,
    upgrades: {}, enchants: {}, sockets: {}, rep: { anvil: 0, delvers: 0, wardens: 0 },
    lore: {}, kills: {}, seen: {}, found: {}, tips: {},
    time: 9 * 60, days: 0, weather: 'snow', respawn: { map: 'village', spawn: 'start' },
    follower: false, bossState: null, tracked: null,
    playtime: 0,
    seed: Math.floor(Math.random() * 1e9),     // the run seed: lays out the open world and its dungeons
    discovered: {}, sighted: {},
    hearts: {}, gen: {}, killed: {}, bounty: {}, shrines: {}, run: { kills: 0, camps: 0, barrows: 0, champions: 0, chests: 0 }, ngPlus: 0,
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

// New Game+: keep your character (level, skills, perks, gear, gold) and start a fresh, harder world.
export function startNgPlus() {
  const keep = {
    skills: S.skills, perks: S.perks, perkPoints: S.perkPoints, charLevel: S.charLevel, skillUps: S.skillUps,
    bonusHp: S.bonusHp, bonusMp: S.bonusMp, bonusSp: S.bonusSp, inv: S.inv, equip: S.equip, upgrades: S.upgrades, enchants: S.enchants,
    gold: S.gold, arrows: S.arrows, gen: S.gen, hearts: S.hearts, lore: S.lore, tips: S.tips, kills: S.kills, seen: S.seen, spell: S.spell, ngPlus: (S.ngPlus || 0) + 1,
    flags: { introDone: true, tutDone: true, alchemy: S.flags.alchemy, houseBought: S.flags.houseBought, furn: S.flags.furn },
  };
  const fresh = newState();
  for (const k of Object.keys(S)) delete S[k];
  Object.assign(S, fresh, JSON.parse(JSON.stringify(keep)));
  S.inv.frostheart = 0; delete S.inv.frostheart; delete S.inv.pale_pelt;
  S.hp = 1e9; S.mp = 1e9; S.sp = 1e9;
}
