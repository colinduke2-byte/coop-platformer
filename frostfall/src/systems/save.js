// Save / load via localStorage: 3 slots, a backup and a once-per-session snapshot of each, corruption recovery,
// a version check, export / import as text, and honest messages when the browser blocks or fills storage.
import { S, loadInto } from './state.js';
import { recalc } from './stats.js';
import { bus } from './bus.js';
import { sfx } from '../audio/sfx.js';
import { settings, saveSettings } from './settings.js';
import { MAPS } from '../data/maps.js';
import { rehydrateGen } from './genloot.js';

export const SLOTS = 3;
export const SAVE_VERSION = 4;           // 3: fog stored run-length encoded, unused generated-item definitions pruned; 4: the Court's seal is The Missing Page
const keyFor = (slot) => (slot === 1 ? 'frostfall_save_v1' : `frostfall_save_s${slot}`);
const bakFor = (slot) => keyFor(slot) + '_bak';
const sesFor = (slot) => keyFor(slot) + '_session';
const badFor = (slot) => keyFor(slot) + '_corrupt';
export const RESCUE_KEY = 'frostfall_rescue';

// ---- storage health: probed once at boot
export const storage = { ok: true, why: '' };
export function probeStorage() {
  try { localStorage.setItem('frostfall_probe', '1'); localStorage.removeItem('frostfall_probe'); storage.ok = true; storage.why = ''; } catch (e) { storage.ok = false; storage.why = e?.name === 'QuotaExceededError' ? 'full' : 'blocked'; }
  return storage.ok;
}
const get = (k) => { try { return localStorage.getItem(k); } catch { return null; } };

// ---- another tab with the game open: the second tab does not write saves (the last writer would win otherwise)
export const tabs = { other: false };
try {
  const ch = new BroadcastChannel('frostfall');
  ch.onmessage = (e) => {
    if (e.data === 'hello') ch.postMessage('here');
    else if (e.data === 'here' && !tabs.other) { tabs.other = true; bus.emit('toast', 'FROSTFALL IS OPEN IN ANOTHER TAB. THIS TAB WILL NOT SAVE', 11); }
  };
  ch.postMessage('hello');
} catch { /* no BroadcastChannel (old browser or sandboxed frame) */ }

// ---- encoding: fog strings of 0/1 become run lengths ("~" + base-36 runs, starting with a run of 0s)
export function encodeFog(str) {
  if (!str || str[0] === '~') return str || '';
  const runs = []; let cur = '0', n = 0;
  for (let i = 0; i < str.length; i++) { const c = str[i] === '1' ? '1' : '0'; if (c === cur) n++; else { runs.push(n.toString(36)); cur = c; n = 1; } }
  runs.push(n.toString(36));
  return '~' + runs.join('.');
}
export function decodeFog(enc) {
  if (!enc || enc[0] !== '~') return enc || '';
  let out = '', c = '0';
  for (const r of enc.slice(1).split('.')) { out += c.repeat(parseInt(r, 36) || 0); c = c === '0' ? '1' : '0'; }
  return out;
}
// What actually gets written: fog compressed, and only the generated items something still refers to.
function serialise() {
  const { gen, fog, ...rest } = S;
  const body = JSON.stringify(rest);
  const used = new Set(body.match(/g_[a-z0-9]+/g) || []);
  const keepGen = {}; for (const id of Object.keys(gen || {})) if (used.has(id)) keepGen[id] = gen[id];
  const fogOut = {}; for (const [m, f] of Object.entries(fog || {})) fogOut[m] = encodeFog(f);
  return JSON.stringify({ v: SAVE_VERSION, t: Date.now(), s: { ...rest, gen: keepGen, fog: fogOut } });
}
// Older saves are brought up to date here, one version at a time.
const MIGRATIONS = {
  2: (d) => d,                                            // v2 -> v3: nothing to convert (fog decoding accepts both forms)
  // v3 -> v4: the Anvil Court's seal used to come with A Core for the Anvil; a save that earned it that way keeps it
  3: (d) => { const q = d.s?.quests; if (q?.anvilcore?.status === 'done' && q.missingpage?.status !== 'done') q.missingpage = { status: 'done' }; return d; },
};
function migrate(d) {
  let v = d.v || 2;
  while (v < SAVE_VERSION) { d = (MIGRATIONS[v] || ((x) => x))(d); v++; }
  d.v = SAVE_VERSION;
  return d;
}

// A save must look sane before we trust it.
export function validate(d) {
  return !!(d && d.s && typeof d.s === 'object' && MAPS[d.s.map] && Number.isFinite(d.s.maxHp) && Number.isFinite(d.s.hp)
    && d.s.skills && typeof d.s.skills === 'object' && d.s.inv && typeof d.s.inv === 'object' && d.s.quests && typeof d.s.quests === 'object');
}

// Returns { data, recovered, newer } or null. Tries the slot, then its backup, then the session snapshot.
export function readSlot(slot = settings.slot) {
  for (const [k, recovered] of [[keyFor(slot), false], [bakFor(slot), true], [sesFor(slot), true]]) {
    const raw = get(k);
    if (!raw) continue;
    try {
      const d = JSON.parse(raw);
      if (validate(d)) return { data: d, recovered, newer: (d.v || 2) > SAVE_VERSION };
    } catch { /* corrupt: try the next copy */ }
  }
  return null;
}
// 'ok' | 'empty' | 'damaged' (something is stored but no copy can be read)
export function slotState(slot) {
  if (readSlot(slot)) return 'ok';
  return get(keyFor(slot)) || get(bakFor(slot)) ? 'damaged' : 'empty';
}

export function hasSave(slot = settings.slot) { return !!readSlot(slot); }
export function anySave() { for (let i = 1; i <= SLOTS; i++) if (readSlot(i)) return true; return false; }

// small per-slot summary, cached until the next write (menus redraw often)
const infoCache = new Map();
export const forgetInfo = () => infoCache.clear();
// another tab (or a tool) changed storage: the summaries may be stale
if (typeof window !== 'undefined') window.addEventListener('storage', (e) => { if (!e.key || e.key.startsWith('frostfall_save')) forgetInfo(); });
export function saveInfo(slot = settings.slot) {
  if (infoCache.has(slot)) return infoCache.get(slot);
  const r = readSlot(slot);
  const info = r ? { t: r.data.t, map: r.data.s.map, playtime: r.data.s.playtime, level: r.data.s.charLevel || 1, recovered: r.recovered, ending: !!r.data.s.flags?.ending3, ngPlus: r.data.s.ngPlus || 0, newer: r.newer } : null;
  infoCache.set(slot, info);
  return info;
}
export function listSaves() { return Array.from({ length: SLOTS }, (_, i) => ({ slot: i + 1, info: saveInfo(i + 1) })); }

let sessionSnapped = new Set();             // slots that already have this session's snapshot
let persistAsked = false;
const lastSave = { at: 0 };
export const lastSaveTime = () => lastSave.at;

// auto: silent save to the current slot that keeps no position (used when changing maps).
// quiet: silent save that keeps the position (timed autosave, tab hidden or closed).
export function saveGame(scene, { auto = false, quiet = false, slot = settings.slot } = {}) {
  if (S.quick || S.daily) return false;     // Arena Mode and the Daily Challenge never write the campaign save
  if (tabs.other) { if (!auto && !quiet) bus.emit('toast', 'NOT SAVED: FROSTFALL IS OPEN IN ANOTHER TAB', 11); return false; }
  try {
    if (auto) { S.x = S.y = null; S.bossState = null; }
    else if (scene?.player) { S.x = Math.round(scene.player.x); S.y = Math.round(scene.player.y); }
    if (!auto && scene?.mapId) S.map = scene.mapId;
    // remember an ongoing boss fight (hp + phase) so a reload resumes it
    const b = scene?.boss;
    if (!auto && b && b.engaged && !b.dead && !b.yieldDone) S.bossState = { map: scene.mapId, hp: Math.round(b.hp), phase: b.bphase };
    else if (!auto) S.bossState = null;
    const prev = get(keyFor(slot));
    if (prev) {
      let good = false; try { good = validate(JSON.parse(prev)); } catch { /* damaged */ }
      try {
        if (good) {
          localStorage.setItem(bakFor(slot), prev);
          // once per session keep an older copy too, in case a bug spoils the game state in memory
          if (!sessionSnapped.has(slot)) { localStorage.setItem(sesFor(slot), prev); sessionSnapped.add(slot); }
        } else if (!get(badFor(slot))) localStorage.setItem(badFor(slot), prev);   // keep the damaged file for a bug report
      } catch { /* the backup is a bonus: never let it block the real save */ }
    }
    const out = serialise();
    localStorage.setItem(keyFor(slot), out);
    if (get(keyFor(slot))?.length !== out.length) throw new Error('verify');
    infoCache.delete(slot);
    lastSave.at = Date.now();
    bus.emit('saved', { quiet: auto || quiet });
    if (!persistAsked) { persistAsked = true; try { navigator.storage?.persist?.(); } catch { /* optional */ } }
    if (!auto && !quiet) { bus.emit('toast', slot > 1 || settings.slot > 1 ? `GAME SAVED (SLOT ${slot})` : 'GAME SAVED', 15); sfx.play('save'); }
    return true;
  } catch (e) {
    const full = e?.name === 'QuotaExceededError' || e?.code === 22;
    bus.emit('toast', full ? 'SAVE FAILED: BROWSER STORAGE IS FULL' : storage.ok ? 'SAVE FAILED' : 'SAVE FAILED: THIS BROWSER BLOCKS SAVES. USE EXPORT SAVE', 11);
    return false;
  }
}

function loadData(d) {
  d = migrate(d);
  const s = { ...d.s };
  if (s.fog) { const f = {}; for (const [m, v] of Object.entries(s.fog)) f[m] = typeof v === 'string' ? decodeFog(v) : ''; s.fog = f; }
  loadInto(s);
  rehydrateGen();
  recalc();
}

// Returns true if a save was loaded into S. Falls back to the backup when the main file is damaged or will not load.
export function loadGame(slot = settings.slot) {
  const copies = [];
  for (const [k, recovered] of [[keyFor(slot), false], [bakFor(slot), true], [sesFor(slot), true]]) {
    const raw = get(k); if (!raw) continue;
    try { const d = JSON.parse(raw); if (validate(d)) copies.push({ d, recovered }); } catch { /* skip */ }
  }
  for (const { d, recovered } of copies) {
    if ((d.v || 2) > SAVE_VERSION) { bus.emit('toast', 'THIS SAVE IS FROM A NEWER VERSION. RELOAD THE PAGE', 11); return false; }
    try {
      loadData(d);
      settings.slot = slot; saveSettings();
      if (recovered) bus.emit('toast', 'SAVE RECOVERED FROM BACKUP', 13);
      return true;
    } catch (e) {
      console.warn('save copy failed to load', e);
      try { const raw = get(keyFor(slot)); if (raw && !get(badFor(slot))) localStorage.setItem(badFor(slot), raw); } catch { /* ignore */ }
    }
  }
  if (copies.length) bus.emit('toast', 'SAVE DAMAGED. A COPY WAS KEPT FOR A BUG REPORT', 11);
  return false;
}

export function deleteSave(slot = settings.slot) {
  try { for (const k of [keyFor(slot), bakFor(slot), sesFor(slot), badFor(slot)]) localStorage.removeItem(k); } catch { /* ignore */ }
  infoCache.delete(slot);
}

// ---- crash rescue: the game state at the moment something broke, kept apart from the slots
export function writeRescue() {
  if (S.quick || S.daily) return false;
  try { localStorage.setItem(RESCUE_KEY, serialise()); return true; } catch { return false; }
}
export function rescueInfo() {
  const raw = get(RESCUE_KEY); if (!raw) return null;
  try { const d = JSON.parse(raw); return validate(d) ? { t: d.t, map: d.s.map, level: d.s.charLevel || 1, playtime: d.s.playtime } : null; } catch { return null; }
}
export function loadRescue() {
  const raw = get(RESCUE_KEY); if (!raw) return false;
  try { const d = JSON.parse(raw); if (!validate(d)) return false; loadData(d); localStorage.removeItem(RESCUE_KEY); return true; } catch { return false; }
}
export function dropRescue() { try { localStorage.removeItem(RESCUE_KEY); } catch { /* ignore */ } }

// ---- export / import: a save as plain text (a downloadable file, or a code to copy)
export function exportSave(slot = settings.slot) {
  const raw = get(keyFor(slot)) || get(bakFor(slot));
  if (raw) return raw;
  return S.quick || S.daily ? null : serialise();          // nothing stored (blocked storage): export the game in memory
}
export const toCode = (text) => 'FF1:' + btoa(unescape(encodeURIComponent(text)));
export function fromCode(text) {
  const t = String(text || '').trim();
  if (t.startsWith('FF1:')) return decodeURIComponent(escape(atob(t.slice(4).replace(/\s+/g, ''))));
  return t;
}
// Returns '' on success or a message saying what was wrong.
export function importSave(text, slot = settings.slot) {
  let d;
  try { d = JSON.parse(fromCode(text)); } catch { return 'NOT A FROSTFALL SAVE'; }
  if (!validate(d)) return 'NOT A FROSTFALL SAVE';
  if ((d.v || 2) > SAVE_VERSION) return 'THAT SAVE IS FROM A NEWER VERSION';
  try {
    const prev = get(keyFor(slot));
    if (prev) localStorage.setItem(bakFor(slot), prev);
    localStorage.setItem(keyFor(slot), JSON.stringify(d));
  } catch { return storage.ok ? 'COULD NOT WRITE THE SAVE' : 'THIS BROWSER BLOCKS SAVES'; }
  infoCache.delete(slot);
  return '';
}

// Total bytes of everything the game keeps in storage (for bug reports).
export function storageBytes() {
  let n = 0;
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k?.startsWith('frostfall')) n += (localStorage.getItem(k) || '').length; } } catch { /* blocked */ }
  return n;
}

export const fmtTime = (sec) => {
  const m = Math.floor((sec || 0) / 60);
  return `${Math.floor(m / 60)}H ${String(m % 60).padStart(2, '0')}M`;
};
