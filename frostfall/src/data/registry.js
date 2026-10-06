// The data layer: one place that validates game content (enemies, items, spawn tables) and lets content packs add more.
// Packs are plain JSON: { "name": "...", "enemies": { id: {...} }, "items": { id: {...} }, "spawns": { "0": { "wild": ["id"] } } }
// Load one with `__ff.loadPack({...})` in the console, or `?pack=<url>` on the page URL. Invalid entries are rejected with a reason.
import { ENEMIES, BARKS } from './enemies.js';
import { ITEMS } from './items.js';
import { STATUS } from '../systems/status.js';

const ITEM_TYPES = new Set(['weapon', 'weapon2h', 'shield', 'bow', 'armor', 'charm', 'potion', 'food', 'ammo', 'ingredient', 'misc', 'quest', 'map']);
const AI_KINDS = new Set(['melee', 'cast', 'shoot', 'lunge', 'boss']);
const num = (v) => typeof v === 'number' && Number.isFinite(v);

// Returns a list of problems (empty = fine).
export function validateEnemy(id, e, items = ITEMS) {
  const bad = [];
  const need = (k, ok = num) => { if (!ok(e[k])) bad.push(`${id}.${k} missing or not a valid value`); };
  if (typeof e.name !== 'string') bad.push(`${id}.name missing`);
  if (typeof e.tex !== 'string') bad.push(`${id}.tex missing`);
  for (const k of ['hp', 'speed', 'chase', 'detect']) need(k);
  if (num(e.hp) && e.hp <= 0) bad.push(`${id}.hp must be positive`);
  if (!num(e.dmg) || e.dmg < 0) bad.push(`${id}.dmg must be a number >= 0`);
  if (!AI_KINDS.has(e.kind)) bad.push(`${id}.kind "${e.kind}" is not one of ${[...AI_KINDS].join('/')}`);
  if (!Array.isArray(e.body) || e.body.length !== 4 || !e.body.every(num)) bad.push(`${id}.body must be [w, h, offsetX, offsetY]`);
  if (e.bark && !BARKS[e.bark]) bad.push(`${id}.bark "${e.bark}" has no bark table`);
  for (const [it] of e.loot?.drops || []) if (it !== 'arrows' && !items[it]) bad.push(`${id} drops unknown item "${it}"`);
  for (const s of e.inflicts || []) if (!STATUS[s.type]) bad.push(`${id}.inflicts unknown status "${s.type}"`);
  for (const s of e.immune || []) if (!STATUS[s] && !['bleed', 'poison', 'burn', 'chill', 'freeze', 'shock', 'fear', 'slow', 'root'].includes(s)) bad.push(`${id}.immune unknown status "${s}"`);
  return bad;
}

export function validateItem(id, it, items = ITEMS) {
  const bad = [];
  if (typeof it.name !== 'string') bad.push(`${id}.name missing`);
  if (!ITEM_TYPES.has(it.type)) bad.push(`${id}.type "${it.type}" unknown`);
  if (!num(it.value)) bad.push(`${id}.value must be a number`);
  if (!Array.isArray(it.icon) || it.icon.length !== 2) bad.push(`${id}.icon must be [shape, colour]`);
  if (it.type === 'potion' && !['hp', 'mp', 'sp'].includes(it.restore)) bad.push(`${id}.restore must be hp/mp/sp`);
  if (it.type === 'food' && !it.food) bad.push(`${id} is food but has no .food buffs`);
  if (it.cook && !items[it.cook]) bad.push(`${id}.cook points to unknown item "${it.cook}"`);
  return bad;
}

// Everything in the game, checked. Used by the unit tests and by pack loading.
export function validateAll(enemies = ENEMIES, items = ITEMS, spawnTables = null) {
  const bad = [];
  for (const [id, e] of Object.entries(enemies)) bad.push(...validateEnemy(id, e, items));
  for (const [id, it] of Object.entries(items)) bad.push(...validateItem(id, it, items));
  for (const [tier, t] of Object.entries(spawnTables || {})) for (const grp of ['melee', 'ranged', 'wild']) for (const k of t[grp] || []) if (!enemies[k]) bad.push(`spawn tier ${tier}.${grp} uses unknown creature "${k}"`);
  return bad;
}

// Add a content pack. Returns { added: [...], rejected: [...] }.
export function loadPack(pack, spawnTables = null) {
  const out = { name: pack?.name || 'pack', added: [], rejected: [] };
  for (const [id, e] of Object.entries(pack?.enemies || {})) {
    const bad = validateEnemy(id, e, { ...ITEMS, ...(pack.items || {}) });
    if (bad.length || ENEMIES[id]) out.rejected.push(...(bad.length ? bad : [`${id} already exists`])); else { ENEMIES[id] = e; out.added.push('enemy:' + id); }
  }
  for (const [id, it] of Object.entries(pack?.items || {})) {
    const bad = validateItem(id, it, { ...ITEMS, ...pack.items });
    if (bad.length || ITEMS[id]) out.rejected.push(...(bad.length ? bad : [`${id} already exists`])); else { ITEMS[id] = it; out.added.push('item:' + id); }
  }
  if (spawnTables) for (const [tier, t] of Object.entries(pack?.spawns || {})) {
    const dest = spawnTables[Number(tier)];
    if (!dest) { out.rejected.push(`spawn tier ${tier} does not exist`); continue; }
    for (const grp of ['melee', 'ranged', 'wild']) for (const k of t[grp] || []) { if (ENEMIES[k]) { dest[grp].push(k); out.added.push(`spawn:${tier}.${grp}.${k}`); } else out.rejected.push(`spawn ${k} is not a known creature`); }
  }
  return out;
}
