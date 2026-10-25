// The pack's gear comparison: an item against what is worn in the slot it would go to (bare hands / no armour when the slot
// is empty), one row per stat that matters for its type, and an overall verdict (BETTER / WORSE / MIXED / SAME / EQUIPPED)
// weighted by what the player's build uses. Pure: reads S, ITEMS and TUNE; MenuScene draws it, the list marks use it.
import { S } from '../systems/state.js';
import { ITEMS, SLOT_OF } from '../data/items.js';
import { TUNE } from '../data/tuning.js';
import { mainStat } from '../systems/compare.js';
import { upgraded, kindOf } from '../systems/upgrades.js';
import { socketCount, socketed } from '../systems/sockets.js';
import { setOf, SETS, wornSets } from '../systems/sets.js';
import { itemWeight } from '../systems/burden.js';
import { durOn, durShown, durMax } from '../systems/durability.js';
import { stats } from '../systems/stats.js';

// key: [full label, short label, format, which way is better (1 higher, -1 lower, 0 neither)]
export const ROW_DEFS = {
  dmg: ['DAMAGE', 'DMG', 'num', 1],
  spell: ['SPELL POWER', 'SPELL', 'spell', 1],
  speed: ['SPEED', 'SPD', 'pct', 1],
  cost: ['SWING COST', 'SP COST', 'pct', -1],
  reach: ['REACH', 'REACH', 'plus', 1],
  block: ['BLOCK', 'BLOCK', 'pct', 1],
  bcost: ['BLOCK COST', 'SP COST', 'pct', -1],
  armor: ['ARMOUR', 'ARM', 'pct', 1],
  cls: ['CLASS', 'CLASS', 'text', 0],
  move: ['MOVE SPEED', 'MOVE', 'pct', 1],
  crit: ['CRIT', 'CRIT', 'pct', 1],
  elem: ['ELEMENT', 'ELEM', 'text', 1],
  epow: ['ELEMENT', 'ELEM', 'num', 1],
  status: ['STATUS', 'STATUS', 'text', 1],
  leech: ['LIFESTEAL', 'LEECH', 'pct', 1],
  hp: ['HEALTH', 'HP', 'num', 1],
  mp: ['MANA', 'MP', 'num', 1],
  sp: ['STAMINA', 'SP', 'num', 1],
  stealth: ['STEALTH', 'STLTH', 'pctPlus', 1],
  mpcost: ['SPELL COST', 'MP COST', 'pct', -1],
  warm: ['WARMTH', 'WARM', 'num', 1],
  gold: ['GOLD FIND', 'GOLD', 'pctPlus', 1],
  sockets: ['SOCKETS', 'SOCK', 'num', 1],
  weight: ['WEIGHT', 'WT', 'dec', -1],
  dur: ['DURABILITY', 'DUR', 'num', 1],
};
const NO_ITEM = { weapon: 'BARE HANDS', offhand: 'EMPTY HAND', bow: 'NO BOW', head: 'NO HELMET', armor: 'NO ARMOUR', charm: 'NO CHARM' };
const lvOf = (id) => S.upgrades?.[id] || 0;
const classMove = (it) => { const W = TUNE.player.weights[it.weight]; return W && (it.type === 'armor' || it.type === 'helmet') ? (it.type === 'helmet' ? 1 + (W.move - 1) * 0.5 : W.move) : 1; };

// The slot an item goes to when you press E (a one-handed weapon goes to the main hand; F puts it in the off hand).
export const slotFor = (id) => SLOT_OF[ITEMS[id]?.type] || null;
export const wornSlot = (id) => (id ? Object.keys(S.equip || {}).find((k) => S.equip[k] === id) || null : null);

// Every stat of an item that can be compared, as key -> value (numbers, or text for element / status / class).
// `slot` and no id: what an empty slot gives you (bare hands hit for the unarmed damage, nothing else).
export function statsOf(id, slot) {
  const it = ITEMS[id], v = {};
  if (!it) {
    if (slot === 'weapon') { v.dmg = S.equip?.weapon ? 0 : stats.weaponDmg(); v.speed = 1; v.cost = 1; }
    return v;
  }
  const kd = kindOf(it), lv = lvOf(id), ms = mainStat(id);
  if (it.type === 'weapon' || it.type === 'weapon2h' || it.type === 'bow') {
    v.dmg = it.style === 'staff' ? it.dmg : ms.key === 'DMG' ? ms.v : upgraded(kd, lv, it.dmg || 0);
    if (it.style === 'staff') v.spell = ms.v;
    if (it.type !== 'bow') { v.speed = 1 / (it.swing || 1); v.cost = it.costMul || 1; if (it.sizeAdd) v.reach = it.sizeAdd; }
  }
  if (it.type === 'shield') { v.block = ms.v; v.bcost = it.cost ?? 0.9; }
  if (it.type === 'armor' || it.type === 'helmet') { v.armor = ms.v; if (it.weight) v.cls = it.weight.toUpperCase(); }
  const mv = (it.moveMul ?? 1) * classMove(it); if (Math.abs(mv - 1) > 0.004) v.move = mv;
  if (it.crit) v.crit = it.crit;
  const el = S.enchants?.[id] ? { type: S.enchants[id].type, power: S.enchants[id].power } : it.elem;
  if (el) { v.elem = el.type.toUpperCase(); v.epow = el.power || 0; }
  if (it.inflict?.length) v.status = it.inflict.map((x) => x.type.toUpperCase()).join('/');
  if (it.lifesteal) v.leech = it.lifesteal;
  if (it.maxHp) v.hp = it.maxHp;
  if (it.maxMp) v.mp = it.maxMp;
  if (it.maxSp) v.sp = it.maxSp;
  if (it.detectMul && it.detectMul !== 1) v.stealth = 1 - it.detectMul;
  if (it.manaCostMul && it.manaCostMul !== 1) v.mpcost = it.manaCostMul;
  if (it.warm) v.warm = it.warm;
  if (it.goldMul && it.goldMul !== 1) v.gold = it.goldMul - 1;
  const sc = socketCount(id); if (sc) v.sockets = sc;
  v.weight = itemWeight(id);
  if (durOn()) v.dur = durShown(id);
  return v;
}

// a missing number counts as what "nothing" is: 100% speed and cost, 0 for everything else
const NEUTRAL = { speed: 1, cost: 1, bcost: 1, move: 1, mpcost: 1 };
const num = (v, k) => (v[k] == null ? NEUTRAL[k] ?? 0 : v[k]);

// How much the player's build leans on each kind of stat (0..1), from skill levels: a caster cares about spell power and
// mana, an archer about crits, a sneak about stealth. Every factor keeps at least TUNE.hud.compare.buildMin.
export function buildLean() {
  const L = (k) => S.skills?.[k]?.lvl || 1, top = Math.max(L('oneHanded'), L('archery'), L('destruction'), L('restoration'), L('sneak'));
  const lo = TUNE.hud.compare.buildMin, f = (x) => lo + (1 - lo) * Math.min(1, x / top);
  return { melee: f(L('oneHanded')), bow: f(L('archery')), magic: f(Math.max(L('destruction'), L('restoration'))), sneak: f(L('sneak')) };
}
const LEAN = { dmg: (b, it) => (it.type === 'bow' ? b.bow : it.style === 'staff' ? b.melee * 0.25 : b.melee), spell: (b) => b.magic, speed: (b) => b.melee, cost: (b) => b.melee, reach: (b) => b.melee, crit: (b, it) => (it.type === 'bow' ? b.bow : Math.max(b.melee, b.bow)), mp: (b) => b.magic, mpcost: (b) => b.magic, stealth: (b) => b.sneak };

const fmt = (k, x) => {
  if (typeof x === 'string') return x;
  const f = ROW_DEFS[k][2];
  if (f === 'pct') return Math.round(x * 100) + '%';
  if (f === 'pctPlus') return (x > 0 ? '+' : '') + Math.round(x * 100) + '%';
  if (f === 'spell') return (x >= 1 ? '+' : '') + Math.round((x - 1) * 100) + '%';
  if (f === 'plus') return (x > 0 ? '+' : '') + Math.round(x);
  if (f === 'dec') return String(Math.round(x * 10) / 10);
  return String(Math.round(x * 10) / 10);
};
const fmtDelta = (k, d) => {
  const f = ROW_DEFS[k][2], a = Math.abs(d);
  if (f === 'pct' || f === 'pctPlus' || f === 'spell') return Math.round(a * 100) + '%';
  return String(Math.round(a * 10) / 10);
};

// The full comparison. rows: { key, label, short, a (this item), b (worn), aText, bText, dText, dir (1 better, -1 worse,
// 0 same / neither) }, notes: [{ text, dir }], badge: BETTER | WORSE | MIXED | SAME | EQUIPPED, mark: 1 / -1 / 0 / 2 (mixed).
export function compareGear(id) {
  const it = ITEMS[id], slot = slotFor(id);
  if (!it || !slot) return null;
  const T = TUNE.hud.compare, worn = wornSlot(id), lean = buildLean();
  const rivalId = worn ? null : S.equip?.[slot] || null;
  const A = statsOf(id, slot), B = worn ? {} : statsOf(rivalId, slot);
  const rows = [], notes = [];
  let score = 0, up = 0, down = 0;
  for (const k of Object.keys(ROW_DEFS)) {
    if (A[k] == null && B[k] == null) continue;
    const [label, short, f, better] = ROW_DEFS[k];
    if (k === 'epow' && (A.elem !== B.elem || worn)) continue;             // a power is only compared within one element
    if (k === 'elem' && !worn && A.elem && A.elem === B.elem) continue;     // same element: the power row says it
    if (k === 'dur' && A[k] == null) continue;
    const row = { key: k, label: k === 'epow' ? A.elem : label, short: k === 'epow' ? A.elem : short, dir: 0, dText: '' };
    if (worn) { row.aText = fmt(k, A[k] ?? NEUTRAL[k] ?? 0); rows.push(row); continue; }
    if (f === 'text') {
      row.aText = A[k] ?? '-'; row.bText = B[k] ?? '-';
      if (row.aText !== row.bText && better) {
        row.dir = A[k] && !B[k] ? 1 : !A[k] && B[k] ? -1 : 0;
        score += row.dir * (T.w[k] || 0);
      }
    } else {
      const a = num(A, k), b = num(B, k), d = a - b;
      if (k in NEUTRAL && a === NEUTRAL[k] && b === NEUTRAL[k]) continue;     // both plain (100% speed, 100% cost): nothing to say
      row.a = a; row.b = b; row.aText = fmt(k, a); row.bText = B[k] == null && !NEUTRAL[k] ? '-' : fmt(k, b);
      if (row.aText !== row.bText && better) {
        row.dir = Math.sign(d) * better;
        row.dText = (row.dir > 0 ? '▲' : '▼') + fmtDelta(k, d);
        // main numbers count by how much they change (relative); the rest by their own typical size
        const rel = T.rel.includes(k) ? d / Math.max(Math.abs(a), Math.abs(b), 1e-6) : d / (T.scale[k] || 1);
        score += better * Math.max(-1, Math.min(1, rel)) * (T.w[k] || 0) * (LEAN[k] ? LEAN[k](lean, it) : 1);
      }
    }
    if (!worn && (k === 'weight' || k === 'dur' || k === 'sockets') && row.aText === row.bText && rows.length >= T.quietAfter) continue;   // same and minor: skip
    rows.push(row);
  }
  // sets: completing or breaking one
  const sa = setOf(id), sb = setOf(rivalId), ws = wornSets();
  if (sa && !worn && sa !== sb) { const n = (ws[sa] || 0) + 1; notes.push({ text: `${SETS[sa].name.toUpperCase()} SET ${n}/${SETS[sa].items.length}`, dir: n >= 2 ? 1 : 0 }); if (n >= 2) score += T.w.set; }
  else if (sa && worn) notes.push({ text: `${SETS[sa].name.toUpperCase()} SET ${ws[sa] || 1}/${SETS[sa].items.length}`, dir: 0 });
  if (sb && sb !== sa && !worn) { notes.push({ text: `BREAKS ${SETS[sb].name.toUpperCase()} SET`, dir: (ws[sb] || 0) >= 2 ? -1 : 0 }); if ((ws[sb] || 0) >= 2) score -= T.w.set; }
  // a two-handed weapon takes the off hand too
  if (it.type === 'weapon2h' && !worn && S.equip?.offhand) { notes.push({ text: `TAKES BOTH HANDS: ${ITEMS[S.equip.offhand]?.type === 'shield' ? 'SHIELD' : 'OFFHAND'} OFF`, dir: -1 }); score -= T.w.hands; }
  if (durOn() && durShown(id) <= 0) notes.push({ text: 'BROKEN: A SMITH CAN MEND IT', dir: -1 });
  // what the new piece would be at the worn piece's forge level (PR-19)
  const ms = mainStat(id), lvR = lvOf(rivalId), kd = kindOf(it);
  if (!worn && rivalId && lvR > lvOf(id) && kd && ms.key) {
    const base = ms.key === 'SPELL' ? it.spellMul ?? 1 : ms.key === 'DMG' ? it.dmg : ms.key === 'BLOCK' ? it.block : it.armor;
    const k = { SPELL: 'spell', DMG: 'dmg', BLOCK: 'block', ARMOR: 'armor' }[ms.key];
    notes.push({ text: `AT +${lvR}: ${ROW_DEFS[k][1]} ${fmt(k, upgraded(kd, lvR, base))}`, dir: 0 });
  }
  for (const r of rows) { if (r.dir > 0) up++; if (r.dir < 0) down++; }
  for (const n of notes) { if (n.dir > 0) up++; if (n.dir < 0) down++; }
  let badge;
  if (worn) badge = 'EQUIPPED';
  else if (!up && !down) badge = 'SAME';
  else if (up && !down) badge = 'BETTER';
  else if (down && !up) badge = 'WORSE';
  else badge = score > T.mixedBand ? 'BETTER' : score < -T.mixedBand ? 'WORSE' : 'MIXED';
  const mark = { BETTER: 1, WORSE: -1, MIXED: 2 }[badge] || 0;
  const filled = socketCount(id) ? socketed(id).filter(Boolean).length : 0;
  return { id, slot, worn, rivalId, vs: worn ? null : rivalId ? ITEMS[rivalId].name : NO_ITEM[slot], rows, notes, score, badge, mark, filled };
}

// The list mark for an item: 1 better, -1 worse, 2 mixed, 0 none (cached per frame by the caller if it needs to be).
export const gearMark = (id) => (slotFor(id) ? compareGear(id)?.mark || 0 : 0);
export const BADGE_COL = { BETTER: 8, WORSE: 11, MIXED: 12, SAME: 4, EQUIPPED: 15 };
export const durText = (id) => `${durShown(id)}/${durMax(id)}`;
