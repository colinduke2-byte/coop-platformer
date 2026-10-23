// "Is this an upgrade?" (PR-21): an item against what is worn in its slot, upgrades included. Pure: reads S and ITEMS.
// MenuScene shows compareText() in the pack pane; addItem marks pickup toasts with upMark().
import { S } from './state.js';
import { ITEMS, SLOT_OF } from '../data/items.js';
import { upgraded, kindOf } from './upgrades.js';
import { socketCount } from './sockets.js';
import { setOf, SETS, wornSets } from './sets.js';
import { TUNE } from '../data/tuning.js';

const lvOf = (id) => S.upgrades?.[id] || 0;
// The main number of an item, upgraded: damage, armour, block or spell power.
export function mainStat(id) {
  const it = ITEMS[id];
  if (!it) return { key: null, v: 0 };
  const kd = kindOf(it);
  if (kd === 'staff') return { key: 'SPELL', v: upgraded('staff', lvOf(id), it.spellMul ?? 1), pct: true };
  if (it.dmg) return { key: 'DMG', v: upgraded(kd, lvOf(id), it.dmg) };
  if (it.block != null) return { key: 'BLOCK', v: upgraded(kd, lvOf(id), it.block), pct: true };
  if (it.armor != null) return { key: 'ARMOR', v: upgraded(kd, lvOf(id), it.armor), pct: true };
  return { key: null, v: 0 };
}
// The item worn where this one would go (null when nothing is, or for things that do not equip).
export function rival(id) {
  const it = ITEMS[id], slot = SLOT_OF[it?.type];
  if (!slot) return null;
  const cur = S.equip?.[slot];
  return cur && cur !== id ? cur : null;
}
// 1 when the item's main number beats the worn piece's, -1 when it is worse, 0 when equal / not comparable / already worn.
export function upDown(id) {
  const it = ITEMS[id], slot = SLOT_OF[it?.type];
  if (!slot || S.equip?.[slot] === id) return 0;
  const cur = rival(id), a = mainStat(id), b = cur ? mainStat(cur) : { key: a.key, v: 0 };
  if (!a.key || (cur && a.key !== b.key)) return 0;
  return a.v > b.v + 1e-9 ? 1 : a.v < b.v - 1e-9 ? -1 : 0;
}
export const upMark = (id) => ({ 1: ' ▲', '-1': ' ▼' })[upDown(id)] || '';

const pct = (v) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}%`;
const moveOf = (it) => { const W = TUNE.player.weights[it.weight]; const cls = W && (it.type === 'armor' || it.type === 'helmet') ? (it.type === 'helmet' ? 1 + (W.move - 1) * 0.5 : W.move) : 1; return (it.moveMul ?? 1) * cls; };
// Lines of what changes if you wear this instead: crit, element, lifesteal, sockets, speed, set progress, and the upgrade hint.
export function compareLines(id) {
  const it = ITEMS[id];
  if (!it || !SLOT_OF[it.type]) return [];
  const curId = rival(id), cur = ITEMS[curId] || {}, out = [];
  const a = mainStat(id), b = curId ? mainStat(curId) : null;
  if (a.key) {
    const d = b && b.key === a.key ? a.v - b.v : null;
    const show = (v) => (a.pct ? (a.key === 'SPELL' ? pct(v - 1) : `${Math.round(v * 100)}%`) : `${Math.round(v * 10) / 10}`);
    out.push(`${a.key} ${show(a.v)}${d ? ` (${d > 0 ? '▲' : '▼'}${a.pct ? Math.abs(Math.round(d * 100)) + '%' : Math.abs(Math.round(d * 10) / 10)})` : ''}`);
  }
  if (!curId) return out;
  const dc = (it.crit || 0) - (cur.crit || 0); if (Math.abs(dc) >= 0.005) out.push(`CRIT ${pct(dc)}`);
  const dl = (it.lifesteal || 0) - (cur.lifesteal || 0); if (Math.abs(dl) >= 0.005) out.push(`LIFESTEAL ${pct(dl)}`);
  const ea = S.enchants?.[id]?.type || it.elem?.type || null, eb = S.enchants?.[curId]?.type || cur.elem?.type || null;
  if (ea !== eb) out.push(ea ? `HITS AS ${ea.toUpperCase()}` : `LOSES ${eb.toUpperCase()}`);
  const ds = socketCount(id) - socketCount(curId); if (ds) out.push(`SOCKETS ${ds > 0 ? '+' : ''}${ds}`);
  const dm = moveOf(it) - moveOf(cur); if (Math.abs(dm) >= 0.005) out.push(`SPEED ${pct(dm)}`);
  const sa = setOf(id), sb = setOf(curId);
  if (sa !== sb && sa) { const n = (wornSets()[sa] || 0) + 1; out.push(`${SETS[sa].name.toUpperCase()} ${n}/${SETS[sa].items.length}`); }
  else if (sb && sa !== sb) out.push(`BREAKS ${SETS[sb].name.toUpperCase()}`);
  // the PR-19 tie-in: what the new piece would be at the worn piece's forge level
  const lv = lvOf(curId), kd = kindOf(it);
  if (lv > lvOf(id) && kd && a.key) {
    const base = a.key === 'SPELL' ? it.spellMul ?? 1 : a.key === 'DMG' ? it.dmg : a.key === 'BLOCK' ? it.block : it.armor, v = upgraded(kd, lv, base);
    out.push(`AT +${lv}: ${a.key} ${a.key === 'SPELL' ? pct(v - 1) : a.pct ? Math.round(v * 100) + '%' : Math.round(v * 10) / 10}`);
  }
  return out;
}
export const compareText = (id) => { const l = compareLines(id); return l.length ? l.join('. ') + '. ' : ''; };
