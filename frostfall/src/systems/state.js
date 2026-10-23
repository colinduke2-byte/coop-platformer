// The one mutable game-state object: this is exactly what gets saved.
export const SKILLS = ['oneHanded', 'archery', 'destruction', 'restoration', 'sneak'];

// ids of quests registered by data modules (data/regions4_story.js); newState gives each a default state
export const EXTRA_QUEST_IDS = [];
export function newState() {
  return withExtras({
    map: 'village', spawn: 'start', x: null, y: null,
    maxHp: 100, maxMp: 100, maxSp: 100,
    hp: 100, mp: 100, sp: 100,
    arrows: 15, gold: 0, spell: 'fire',
    skills: Object.fromEntries(SKILLS.map((k) => [k, { lvl: 1, xp: 0 }])),
    inv: { hp_potion: 2, mp_potion: 1, sp_potion: 1, rusty_sword: 1, hunting_bow: 1, fur_tunic: 1 },
    equip: { weapon: 'rusty_sword', offhand: null, bow: 'hunting_bow', head: null, armor: 'fur_tunic', charm: null },
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
    // fields that start empty and are filled by the system that owns them (kinds in OPTIONAL_KINDS below)
    ...Object.fromEntries(Object.keys(OPTIONAL_KINDS).map((k) => [k, null])),
  });
}

// CH5: every field of S is declared. These start as null (null behaves like the old "missing" for every check in the
// game: S.x || ..., S.x?.y, S.x ||= ...) and, once set, must have this kind; a save with another kind there loads null.
// A new persistent field goes here (or above with a real default), on its own line, never only into the code that uses it.
// Transient run modes (quick, daily, boons, mounted) are never written: Arena Mode and dailies do not save, and a map
// load clears the other two.
export const OPTIONAL_KINDS = {
  ammo: 'string',          // selected arrow type (playerBow)
  arena: 'object',         // Hollow Arena records { best, modes }
  blessing: 'string',      // shrine blessing id (systems/bless)
  boons: 'object',         // arena trial boons (transient)
  buyback: 'array',        // items sold at shops, to buy back (data/stock)
  cloak: 'number',         // cloak colour (palette index, systems/achievements CLOAKS)
  companion: 'string',     // hired companion: 'ragna' | 'pell'
  contracts: 'object',     // daily contracts board (data/contracts)
  daily: 'object',         // Daily Challenge run (transient, never saved)
  dur: 'object',           // gear durability per item id (systems/durability)
  fish: 'object',          // fishing records
  followMode: 'string',    // follower orders
  mods: 'object',          // challenge / daily modifiers (data/mods)
  mounted: 'boolean',      // riding the pony (transient)
  nemesis: 'object',       // the creature that killed you last { kind, x, y, kills, tier }
  nemesisSlain: 'number',
  pet: 'string',           // 'cub' | 'hound'
  quick: 'object',         // Arena Mode run (transient, never saved)
  runes: 'object',         // runes socketed per item (systems/sockets)
  shout: 'string',         // selected shout id
  stash: 'object',         // home stash: item id -> count
  tomes: 'object',         // learned spell tomes
  trophies: 'object',      // trophy id -> true
};
// New Game+ keeps these top-level fields (everything else starts fresh); flags keep only NG_KEEP_FLAGS. ngPlus counts up.
// Fields not listed (arena records, fishing records, durability, shout, ammo, companion...) start over: that was the
// behaviour before CH5 too; changing it is a design call.
export const NG_KEEP = ['skills', 'perks', 'perkPoints', 'charLevel', 'skillUps', 'bonusHp', 'bonusMp', 'bonusSp', 'inv', 'equip', 'upgrades', 'enchants',
  'gold', 'arrows', 'gen', 'hearts', 'lore', 'tips', 'kills', 'seen', 'spell',
  // what you own carries over too: the stash, gems and runes in your gear, learned tomes, trophies, cloak and pet
  'stash', 'sockets', 'runes', 'tomes', 'trophies', 'cloak', 'pet'];
export const NG_KEEP_FLAGS = ['alchemy', 'houseBought', 'emberHouse', 'furn'];
function withExtras(st) { for (const id of EXTRA_QUEST_IDS) st.quests[id] ||= { status: 'inactive' }; return st; }

// Singleton: mutate in place so every module sees the same object.
export const S = newState();

// Modules that keep derived state outside S (generated items in ITEMS, the message log...) clear it here whenever S is
// replaced: New Game, loading a save, New Game+ (CH8). Handlers run after S holds the new state.
const resetHooks = [];
export const onStateReset = (fn) => { resetHooks.push(fn); };
const afterReset = () => { for (const fn of resetHooks) fn(S); };

export function resetState() {
  const fresh = newState();
  for (const k of Object.keys(S)) delete S[k];
  Object.assign(S, fresh);
  afterReset();
}
// A value from a save is only trusted when it has the same kind as the default (object, array, number, string...).
const kindOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);
export function loadInto(data) {
  const fresh = newState();
  for (const k of Object.keys(S)) delete S[k];
  Object.assign(S, fresh);
  for (const [k, v] of Object.entries(data || {})) {
    if (!(k in fresh)) { if (v !== undefined) S[k] = v; continue; }          // extra keys (stash, runes...) are kept as they are
    const want = kindOf(fresh[k]), got = kindOf(v);
    if (want === 'null') { if (v === null || !OPTIONAL_KINDS[k] || kindOf(v) === OPTIONAL_KINDS[k]) S[k] = v; }   // x, y, tracked... take anything
    else if (want === 'number') S[k] = Number.isFinite(v) ? v : fresh[k];
    else if (want === got) S[k] = v;
  }
  // nested defaults (older saves, damaged fields)
  for (const k of SKILLS) { const sk = S.skills[k]; S.skills[k] = sk && typeof sk === 'object' && Number.isFinite(sk.lvl) ? { lvl: sk.lvl, xp: Number.isFinite(sk.xp) ? sk.xp : 0 } : { lvl: 1, xp: 0 }; }
  S.equip = { ...fresh.equip, ...S.equip };
  for (const [k, v] of Object.entries(S.equip)) if (v !== null && typeof v !== 'string') S.equip[k] = null;
  S.quests = { ...fresh.quests, ...S.quests };
  for (const [k, q] of Object.entries(S.quests)) if (!q || typeof q !== 'object' || typeof q.status !== 'string') S.quests[k] = { status: 'inactive' };
  for (const [k, n] of Object.entries(S.inv)) if (!Number.isFinite(n) || n <= 0) delete S.inv[k];
  for (const k of ['flags', 'fog', 'perks', 'kills', 'gen', 'upgrades', 'enchants', 'sockets', 'rep', 'lore', 'seen', 'found', 'tips', 'discovered', 'sighted', 'hearts', 'killed', 'bounty', 'shrines', 'run']) if (!S[k] || typeof S[k] !== 'object') S[k] = fresh[k];
  if (!S.respawn?.map) S.respawn = fresh.respawn;
  for (const k of ['hp', 'mp', 'sp']) S[k] = Math.max(1, Math.min(S[k], S['max' + k[0].toUpperCase() + k.slice(1)] || S[k]));
  afterReset();
}

// New Game+: keep your character (level, skills, perks, gear, gold) and start a fresh, harder world.
export function startNgPlus() {
  const keep = Object.fromEntries(NG_KEEP.map((k) => [k, S[k]]));
  keep.ngPlus = (S.ngPlus || 0) + 1;
  keep.flags = { introDone: true, tutDone: true, ...Object.fromEntries(NG_KEEP_FLAGS.map((k) => [k, S.flags[k]])) };
  const fresh = newState();
  for (const k of Object.keys(S)) delete S[k];
  for (const k of Object.keys(keep)) if (keep[k] === undefined || keep[k] === null) delete keep[k];
  Object.assign(S, fresh, JSON.parse(JSON.stringify(keep)));
  S.inv.frostheart = 0; delete S.inv.frostheart; delete S.inv.pale_pelt; delete S.inv.blight_heart;
  S.hp = 1e9; S.mp = 1e9; S.sp = 1e9;
  afterReset();
}
