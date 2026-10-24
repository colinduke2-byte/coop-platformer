// Arena Mode records on this device (never in a save slot): { 'hero:mode': { score, waves, runs }, _pick: { cloak, mod } }.
// Pure localStorage, no game imports, so the campaign (achievements' cloak list) can read the best wave without an import cycle.
const KEY = 'frostfall_arena_records';
export function loadRecords() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; } }
export function saveRecords(r) { try { localStorage.setItem(KEY, JSON.stringify(r)); } catch { /* storage blocked */ } }
export const recordKey = (heroId, mode) => `${heroId}:${mode}`;
const runs = (r) => Object.entries(r).filter(([k, v]) => !k.startsWith('_') && v && typeof v === 'object');
// best wave in any wave mode (Boss Rush counts bosses, not waves) and best score in any mode
export const bestWave = (r = loadRecords()) => runs(r).filter(([k]) => !k.endsWith(':rush')).reduce((m, [, v]) => Math.max(m, v.waves || 0), 0);
export const bestScore = (r = loadRecords()) => runs(r).reduce((m, [, v]) => Math.max(m, v.score || 0), 0);
