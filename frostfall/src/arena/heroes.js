// Arena Mode (quick play): fixed hero loadouts, scoring and personal records. Nothing here touches a save slot.
import { S, resetState } from '../systems/state.js';
import { recalc } from '../systems/stats.js';
import { readSlot, loadGame } from '../systems/save.js';
import { settings } from '../systems/settings.js';
import { dayStamp, dailyMods } from '../systems/daily.js';
import { ARENAS, arenaById } from './arenas.js';

const POTS = { hp_potion: 5, mp_potion: 3, sp_potion: 3 };
// Each hero is plain data: gear, skill levels, perks, tomes, hearts (for shouts) and the starting spell.
export const HEROES = [
  { id: 'warden', name: 'WARDEN', col: 6, blurb: ['IRON SWORD AND SHIELD.', 'BLOCK, PARRY, HOLD THE LINE.'],
    equip: { weapon: 'iron_sword', offhand: 'iron_shield', armor: 'iron_cuirass' }, skills: { oneHanded: 7, restoration: 2 }, perks: ['keenedge', 'duelist'], spell: 'heal', hearts: {} },
  { id: 'reaver', name: 'REAVER', col: 12, blurb: ['GREATSWORD. SLOW, HUGE HITS.', 'BATTLE CRY ON R.'],
    equip: { weapon: 'iron_greatsword', armor: 'iron_cuirass' }, skills: { oneHanded: 7 }, perks: ['keenedge'], spell: 'heal', hearts: { iron: true }, shout: 'cry' },
  { id: 'ranger', name: 'RANGER', col: 8, blurb: ['LONGBOW AND FIRE ARROWS.', 'KITE THEM. BLINK AWAY.'],
    equip: { weapon: 'hunting_knife', bow: 'long_bow', armor: 'hunter_garb' }, skills: { archery: 9, sneak: 4, oneHanded: 3 }, perks: ['steadyhand', 'eagleeye', 'piercing'], spell: 'blink', arrows: 60, extra: { fire_arrow: 40 } },
  { id: 'frostmage', name: 'FROSTMAGE', col: 15, blurb: ['GLACIER SPEAR, FROST AND WARD.', 'FROST BREATH ON R.'],
    equip: { weapon: 'hunting_knife', armor: 'mage_robe' }, mp: 40, skills: { destruction: 8, restoration: 3 }, perks: ['spellweaver'], spell: 'glacier', tomes: { glacier: true }, hearts: { rime: true }, shout: 'frost' },
  { id: 'pyromancer', name: 'PYROMANCER', col: 11, blurb: ['FIREBALL, EMBER NOVA, METEOR.', 'BURN EVERYTHING.'],
    equip: { weapon: 'hunting_knife', armor: 'mage_robe' }, mp: 40, skills: { destruction: 7 }, perks: ['spellweaver', 'pyromancer'], spell: 'fire', tomes: { embernova: true, meteor: true } },
  { id: 'shadow', name: 'SHADOW', col: 14, blurb: ['TWIN DAGGERS. SNEAK, STRIKE.', 'BLINK AND CINDERSTEP.'],
    equip: { weapon: 'hunting_knife', offhand: 'hunting_knife', armor: 'hunter_garb' }, skills: { sneak: 8, oneHanded: 7 }, perks: ['shadowstep', 'ghost', 'keenedge'], spell: 'blink', flags: { kragnarDead: true }, shout: 'cinderstep' },
];
export const heroById = (id) => HEROES.find((h) => h.id === id);

// Begin a fresh quick run in memory. The save slots are never written while S.quick is set (see systems/save.js).
export const MODES = [
  { id: 'survival', name: 'SURVIVAL', blurb: 'ENDLESS WAVES. A CHAMPION EVERY 5.' },
  { id: 'boon', name: 'BOON TRIAL', blurb: 'PICK A BOON BETWEEN WAVES.' },
  { id: 'gauntlet', name: 'GAUNTLET', blurb: 'A CHAMPION IN EVERY WAVE.' },
  { id: 'rush', name: 'BOSS RUSH', blurb: 'TEN BOSSES, ONE AFTER ANOTHER.' },
  { id: 'daily', name: 'DAILY ARENA', blurb: 'SAME WAVES AND TWO MODIFIERS FOR ALL.' },
];
export const modeById = (id) => MODES.find((m) => m.id === id) || MODES[0];
// Today's arena is fixed by the date, so the daily is the same room for everyone.
export const dailyArena = (day = dayStamp()) => ARENAS[day % ARENAS.length].id;

export function beginQuickRun(heroId, opts = {}) {
  const mode = opts.mode || 'survival', day = dayStamp();
  const arena = mode === 'daily' ? dailyArena(day) : (arenaUnlocked(opts.arena || 'pit') ? (opts.arena || 'pit') : 'pit');
  const hero = heroById(heroId);
  if (heroId === 'own') {
    if (!hasOwnHero() || !loadGame(settings.slot)) return false;
  } else {
    resetState();
    const inv = { ...POTS, ...(hero.extra || {}) };
    for (const id of Object.values(hero.equip)) inv[id] = (inv[id] || 0) + 1;
    if (hero.equip.offhand && hero.equip.offhand === hero.equip.weapon) inv[hero.equip.weapon] = 2;
    S.inv = inv; S.equip = { weapon: 'rusty_sword', offhand: null, bow: 'hunting_bow', head: null, armor: null, charm: null, ...hero.equip };
    if (!S.equip.bow) S.equip.bow = 'hunting_bow';
    S.inv.hunting_bow = S.inv.hunting_bow || 1;
    for (const [k, v] of Object.entries(hero.skills)) S.skills[k].lvl = v;
    S.perks = Object.fromEntries(hero.perks.map((p) => [p, true]));
    S.spell = hero.spell; S.tomes = { ...(hero.tomes || {}) }; S.hearts = { ...(hero.hearts || {}) };
    S.arrows = hero.arrows || 25; S.bonusMp = hero.mp || 0;
    if (hero.shout) S.shout = hero.shout;
    Object.assign(S.flags, hero.flags || {});
  }
  S.flags.introDone = true; S.flags.tutDone = true;
  S.quick = { hero: heroId, mode, arena, startedAt: Date.now() };
  if (mode === 'daily') { S.quick.daily = day; S.mods = Object.fromEntries(dailyMods(day).map((m) => [m, true])); }
  recalc(); S.hp = S.maxHp; S.mp = S.maxMp; S.sp = S.maxSp;
  return true;
}

// Rooms open as you reach waves in any run (Boss Rush does not count). One constant to change if this feels too slow.
export const ARENA_UNLOCK = { pit: 0, lake: 5, foundry: 8, court: 10 };
export const bestWave = () => Object.entries(loadRecords()).filter(([k]) => !k.endsWith(':rush')).reduce((m, [, v]) => Math.max(m, v.waves || 0), 0);
export const arenaUnlocked = (id) => bestWave() >= (ARENA_UNLOCK[id] || 0);
export const nextRoomAt = () => Object.values(ARENA_UNLOCK).filter((w) => w > bestWave()).sort((a, b) => a - b)[0] || 0;

export const hasOwnHero = () => !!readSlot(settings.slot);

// ---- score and records (this device only)
// waves cleared (or bosses felled x5), the combo-weighted points from kills, and champions
export const quickScore = (waves, pts, champions, mode = 'survival') => waves * (mode === 'rush' ? 500 : 100) + pts + champions * 40;
const KEY = 'frostfall_arena_records';
export function loadRecords() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } }
export const recordKey = (heroId, mode) => `${heroId}:${mode}`;
export function submitRecord(heroId, score, waves, mode = 'survival') {
  const key = recordKey(heroId, mode), r = loadRecords(), cur = r[key] || { score: 0, waves: 0, runs: 0 };
  const isBest = score > cur.score;
  r[key] = { score: Math.max(cur.score, score), waves: Math.max(cur.waves, waves), runs: cur.runs + 1 };
  try { localStorage.setItem(KEY, JSON.stringify(r)); } catch { /* storage blocked */ }
  return { isBest, best: r[key] };
}
