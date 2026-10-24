// Per-item state for handcrafted gear (PR-08). Generated gear already has a unique id; a bought or crafted Glass Dagger does not,
// so two of them used to share one forge level, and a +10 item sold and bought again came back +10. Now the first time a piece
// gets something of its own (a forge level, an enchant, a gem or rune, wear), that one copy becomes an instance: a new id
// ("i_<base>_<n>") that behaves exactly like its base item, with S.upgrades / enchants / sockets / runes / dur keyed by it.
// S.inst maps instance id -> base id and is all that is saved; the definitions are rebuilt from the base on load.
import { S, onStateReset } from './state.js';
import { ITEMS } from '../data/items.js';

const GEAR = new Set(['weapon', 'weapon2h', 'bow', 'shield', 'armor', 'helmet']);
export const STORES = ['upgrades', 'enchants', 'sockets', 'runes', 'dur'];
export const baseOf = (id) => ITEMS[id]?.instOf || id;
export const needsInstance = (id) => { const it = ITEMS[id]; return !!it && !it.gen && !it.instOf && GEAR.has(it.type); };
const register = (id, base) => { if (ITEMS[base]) ITEMS[id] = { ...ITEMS[base], instOf: base }; };
let n = 0;
export function newInstanceId(base, st = S) {
  let id;
  do id = `i_${base}_${Date.now().toString(36)}${(n++).toString(36)}`; while (st.inst?.[id]);
  (st.inst ||= {})[id] = base;
  register(id, base);
  return id;
}
// The id to key per-item state with for the copy of `id` worn in `slot` (or else any carried copy): splits one copy off the
// base id into its own instance the first time (slot false: a carried copy, never the worn one). Ids that are already unique
// (generated, instances, non-gear) come back as they are.
export function own(id, slot = null) {
  if (!needsInstance(id) || !(S.inv[id] > 0)) return id;
  const iid = newInstanceId(id);
  S.inv[id] -= 1; if (S.inv[id] <= 0) delete S.inv[id];
  S.inv[iid] = 1;
  const sl = slot === false ? null : slot && S.equip?.[slot] === id ? slot : Object.keys(S.equip || {}).find((k) => S.equip[k] === id);
  if (sl) S.equip[sl] = iid;
  // state still keyed by the base id (set by older code or a tool) goes with the worn copy, as the save migration does
  if (sl) for (const k of STORES) if (S[k] && id in S[k]) { S[k][iid] = S[k][id]; delete S[k][id]; }
  return iid;
}
export function rehydrateInst() { for (const [id, base] of Object.entries(S.inst || {})) register(id, base); }
onStateReset((st) => { for (const id of Object.keys(ITEMS)) if (id.startsWith('i_') && !st.inst?.[id]) delete ITEMS[id]; });

// Save migration v4 -> v5 (systems/save.js): state that older saves keyed by a handcrafted item's id moves to one instance of it,
// the worn copy first (so of two Glass Daggers, the main-hand one keeps the +5). Things you no longer own lose it.
export function migrateInstances(s) {
  const bases = new Set();
  for (const k of STORES) for (const id of Object.keys(s[k] || {})) if (needsInstance(id)) bases.add(id);
  for (const base of bases) {
    const where = (s.inv?.[base] || 0) > 0 ? 'inv' : (s.stash?.[base] || 0) > 0 ? 'stash' : null;
    let iid = null;
    if (where) {
      iid = newInstanceId(base, s);
      s[where][base] -= 1; if (s[where][base] <= 0) delete s[where][base];
      s[where][iid] = 1;
      const sl = where === 'inv' ? ['weapon', 'offhand', 'bow', 'armor', 'head'].find((k) => s.equip?.[k] === base) : null;
      if (sl) s.equip[sl] = iid;
    }
    for (const k of STORES) if (s[k] && base in s[k]) { if (iid) s[k][iid] = s[k][base]; delete s[k][base]; }
  }
  return s;
}
