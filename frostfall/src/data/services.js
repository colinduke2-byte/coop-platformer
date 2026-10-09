// Shared NPC services: buying, selling, forging, enchanting, brewing. All dialogue-driven.
import { S } from '../systems/state.js';
import { diff } from '../systems/difficulty.js';
import { say, choose } from '../systems/dialogue.js';
import { bus } from '../systems/bus.js';
import { ITEMS, SLOT_OF } from './items.js';
import { addItem, removeItem, count, addGold, addArrows } from '../systems/inventory.js';
import { TUNE } from './tuning.js';
import { FURNITURE } from './maps.js';
import { recalc } from '../systems/stats.js';
import { sfx } from '../audio/sfx.js';
import { durOn, durOf, durMax, repairCost, repairItem, damaged } from '../systems/durability.js';
import { noteSold } from './stock.js';
import { rarityIndex, reforgeGen } from '../systems/genloot.js';
import { COOKABLE, cook } from '../systems/food.js';
import { listScreen } from '../scenes/ShopScene.js';

// Pick one entry from a long list, four at a time. Returns the index or -1 (back).
export async function pick(options, back = 'Back') {
  let page = 0;
  const per = 4;
  for (;;) {
    const slice = options.slice(page * per, page * per + per);
    const more = (page + 1) * per < options.length;
    const labels = [...slice, ...(more ? ['More...'] : []), back];
    const c = await choose(labels);
    if (c < slice.length) return page * per + c;
    if (more && c === slice.length) { page++; continue; }
    return -1;
  }
}

const price = (id) => ITEMS[id].value || 1;
const bp = (w) => Math.max(1, Math.round(w.price * diff().price));   // shop buy price on the current difficulty
export const sellPrice = (id) => Math.max(1, Math.floor(price(id) * 0.5));

// Short stat lines for the detail pane of the list screens.
export function statLines(id) {
  const it = ITEMS[id];
  if (!it) return [];
  const out = [];
  if (it.dmg) out.push([`DAMAGE ${it.dmg}`, 6]);
  if (it.armor) out.push([`ARMOR ${Math.round(it.armor * 100)}%`, 6]);
  if (it.block) out.push([`BLOCKS ${Math.round(it.block * 100)}%`, 6]);
  if (it.type === 'weapon2h') out.push(['TWO-HANDED', 15]);
  if (it.style === 'dagger') { out.push(['FAST. SNEAK AND BACK HITS HURT', 15]); if (it.pierce) out.push([`4TH HIT PIERCES ${Math.round(it.pierce * 100)}% ARMOUR`, 15]); if (it.assassinate) out.push(['SNEAK KILLS ANY NON-BOSS', 14]); if (it.crit) out.push([`CRIT ${Math.round(it.crit * 100)}%`, 13]); for (const f of it.inflict || []) out.push([`${f.type.toUpperCase()}${f.sneakOnly ? ' ON SNEAK ATTACK' : ''}`, 11]); }
  if (it.style === 'staff') {
    out.push(['WEAK IN MELEE. HEAVY ATTACK: FREE BOLT', 15]);
    if (it.spellMul) out.push([`SPELLS +${Math.round((it.spellMul - 1) * 100)}%`, 8]);
    for (const [k, v] of Object.entries(it.elemMul || {})) out.push([`${k.toUpperCase()} SPELLS +${Math.round((v - 1) * 100)}%`, 8]);
    for (const [k, v] of Object.entries(it.spellCost || {})) out.push([`${k.toUpperCase()} COSTS ${v <= 0.5 ? 'HALF' : '-' + Math.round((1 - v) * 100) + '%'}`, 8]);
    if (it.mpRegenMul) out.push([`MANA REGEN +${Math.round((it.mpRegenMul - 1) * 100)}%`, 8]);
    if (it.freeEvery) out.push([`EVERY ${it.freeEvery}TH CAST IS FREE`, 13]);
    if (it.spellCrit) out.push([`SPELL CRIT ${Math.round(it.spellCrit * 100)}%`, 13]);
    if (it.chainAdd) out.push(['LIGHTNING CHAINS +1', 13]);
    if (it.rootChance) out.push([`${Math.round(it.rootChance * 100)}% OF FROST BOLTS ROOT`, 15]);
    if (it.wardMul || it.wardTime) out.push(['STRONGER, LONGER WARD', 15]);
    if (it.slowAdd) out.push(['FROST SLOWS LONGER', 15]);
  }
  if (it.style === 'halberd') {
    out.push(['WIDE SWEEPS. OVERHEAD PLANT STAGGERS', 15]);
    if (it.pull) out.push(['HOOK PULLS SMALL FOES IN', 15]);
    if (it.vsUndead) out.push([`UNDEAD +${Math.round((it.vsUndead - 1) * 100)}%`, 13]);
    if (it.plantStun) out.push(['LONGER STAGGER', 15]);
    if (it.swingGuard) out.push([`-${Math.round(it.swingGuard * 100)}% DAMAGE WHILE SWINGING`, 8]);
    if (it.pierce) out.push([`PLANT PIERCES ${Math.round(it.pierce * 100)}% ARMOUR`, 15]);
    if (it.killFreeze) out.push(['KILLS FREEZE NEARBY FOES', 15]);
    if (it.crit) out.push([`CRIT ${Math.round(it.crit * 100)}%`, 13]);
    for (const f of it.inflict || []) out.push([`${f.type.toUpperCase()}`, 11]);
  }
  if (it.style === 'spear') out.push(['LONG REACH', 15]); else if (it.style === 'mace') out.push(['BREAKS GUARDS', 15]); else if (it.style === 'axe') out.push(['HEAVY CHOPS', 15]);
  if (durOn() && (it.type === 'weapon' || it.type === 'weapon2h' || it.type === 'armor' || it.type === 'shield')) out.push([`DURABILITY ${durOf(id)}/${durMax(id)}`, durOf(id) <= 0 ? 11 : 5]);
  if (it.weight) out.push([`${it.weight.toUpperCase()} ARMOUR`, it.weight === 'heavy' ? 11 : it.weight === 'light' ? 8 : 5]);
  if (it.moveMul) out.push([`SPEED ${it.moveMul > 1 ? '+' : ''}${Math.round((it.moveMul - 1) * 100)}%`, it.moveMul > 1 ? 8 : 11]);
  if (it.detectMul) out.push(['HARDER TO SPOT', 8]);
  if (it.manaCostMul) out.push(['SPELLS COST -15%', 8]);
  if (it.spRegenMul) out.push(['STAMINA REGEN -20%', 11]);
  for (const [k, n] of [['maxHp', 'HEALTH'], ['maxMp', 'MANA'], ['maxSp', 'STAMINA']]) if (it[k]) out.push([`+${it[k]} ${n}`, 8]);
  return out;
}

// ---------------------------------------------------------------------- buy
export async function buyMenu(who, wares) {
  await listScreen({
    title: who.toUpperCase() + ': BUY',
    hint: 'E BUY   ESC DONE   OR CLICK',
    rows: () => wares.map((w) => {
      const have = w.once && count(w.id), pr = bp(w);
      const ok = !have && S.gold >= pr;
      return {
        id: w.id, name: w.name || ITEMS[w.id].name, tag: have ? 'OWNED' : pr + 'G', ok, tagCol: have ? 4 : ok ? 13 : 11,
        sub: have ? 'ALREADY OWNED' : ok ? 'CAN AFFORD' : `NEED ${pr - S.gold} G`,
        lines: [...statLines(w.id), w.id === 'arrows' ? [`YOU HAVE ${S.arrows}`, 4] : [`YOU HAVE ${count(w.id)}`, 4]],
        desc: w.id === 'arrows' ? 'Ten arrows for the bow. Missed shots can be picked up again.' : null,
      };
    }),
    onSelect: (i, ui) => {
      const w = wares[i];
      if (w.once && count(w.id)) { ui.say('YOU ALREADY CARRY ONE', 4); sfx.play('nostamina'); return; }
      if (S.gold < bp(w)) { ui.say('NOT ENOUGH GOLD', 11); sfx.play('nostamina'); return; }
      if (w.id === 'arrows' && S.arrows >= TUNE.player.bow.maxArrows) { ui.say('QUIVER IS FULL', 4); sfx.play('nostamina'); return; }
      S.gold -= bp(w);
      if (w.id === 'arrows') addArrows(w.n);
      else addItem(w.id, w.n || 1);
      ui.say('BOUGHT ' + (w.name || ITEMS[w.id].name).toUpperCase(), 8);
      sfx.play('coin');
    },
  });
}

// --------------------------------------------------------------------- sell
const equippedIds = () => new Set(Object.values(S.equip).filter(Boolean));
export function sellable() {
  const eq = equippedIds();
  return Object.keys(S.inv).filter((id) => ITEMS[id] && ITEMS[id].type !== 'quest' && (S.inv[id] > (eq.has(id) ? 1 : 0)));
}
// Junk: trade goods with no use (hides, tusks, oil...). One row at the top of the sell list sells all of it.
export const junkItems = () => sellable().filter((id) => ITEMS[id].type === 'junk' || ITEMS[id].junk);
export function sellJunk() {
  let n = 0, gold = 0;
  for (const id of junkItems()) { const k = S.inv[id] - (equippedIds().has(id) ? 1 : 0); S.inv[id] -= k; if (S.inv[id] <= 0) delete S.inv[id]; const g = sellPrice(id) * k; S.gold += g; noteSold(id, k, g); n += k; gold += g; }
  return { n, gold };
}
export async function sellMenu(who) {
  if (!sellable().length) { await say(who, 'You have nothing I would buy.'); return; }
  const avail = (id) => S.inv[id] - (equippedIds().has(id) ? 1 : 0);
  const sellN = (id, n, ui) => {
    S.inv[id] -= n; if (S.inv[id] <= 0) delete S.inv[id];
    S.gold += sellPrice(id) * n; noteSold(id, n, sellPrice(id) * n);
    ui.say(`SOLD ${n} FOR ${sellPrice(id) * n}G`, 13);
    sfx.play('coin');
  };
  await listScreen({
    title: who.toUpperCase() + ': SELL',
    hint: 'E SELL ONE   Q SELL ALL   ESC DONE',
    empty: 'NOTHING LEFT TO SELL',
    rows: () => {
      const j = junkItems(), jg = j.reduce((a, id) => a + sellPrice(id) * avail(id), 0);
      const top = j.length ? [{ id: null, name: 'SELL ALL JUNK', tag: `${jg}G`, ok: true, sub: `${j.length} KINDS OF TRADE GOODS`, lines: [['HIDES, TUSKS, OIL AND THE LIKE.', 4], ['GEAR, GEMS AND POTIONS ARE KEPT.', 4]] }] : [];
      return [...top, ...sellable().map((id) => ({
        id, name: ITEMS[id].name, tag: `x${avail(id)}  ${sellPrice(id)}G`, ok: true,
        sub: `WORTH ${sellPrice(id)}G EACH`, lines: statLines(id),
      }))];
    },
    onSelect: (i, ui) => {
      const off = junkItems().length ? 1 : 0;
      if (off && i === 0) { const r = sellJunk(); ui.say(`SOLD ${r.n} FOR ${r.gold}G`, 13); sfx.play('coin'); return; }
      const id = sellable()[i - off]; if (id) sellN(id, 1, ui);
    },
    onAlt: (i, ui) => { const off = junkItems().length ? 1 : 0; if (off && i === 0) return; const id = sellable()[i - off]; if (id) sellN(id, avail(id), ui); },
  });
}

// -------------------------------------------------------------------- forge
export const UPGRADE_GOLD = [50, 90, 140];
export const UPGRADE_INGOT = [1, 2, 3];
export async function upgradeMenu(who, slot) {
  const id = S.equip[slot];
  if (!id) { await say(who, 'You have nothing equipped there.'); return; }
  const lv = (S.upgrades[id] || 0);
  if (lv >= 3) { await say(who, `That ${ITEMS[id].name} is as good as it will ever be.`); return; }
  await listScreen({
    title: 'FORGE: ' + (slot === 'armor' ? 'ARMOUR' : 'WEAPON'),
    hint: 'E UPGRADE   ESC DONE',
    rows: () => {
      const cur = S.upgrades[id] || 0;
      if (cur >= 3) return [{ id, name: ITEMS[id].name + ' +3', tag: 'MAX', ok: false, tagCol: 4, sub: 'FULLY UPGRADED', lines: statLines(id) }];
      const g = UPGRADE_GOLD[cur], ing = UPGRADE_INGOT[cur], have = count('iron_ingot');
      const ok = S.gold >= g && have >= ing;
      return [{
        id, name: `${ITEMS[id].name} +${cur + 1}`, tag: `${g}G ${ing}I`, ok, sub: ok ? 'READY' : 'NEED MATERIALS',
        lines: [...statLines(id), [slot === 'armor' ? 'GAIN +2% ARMOR' : 'GAIN +2 DAMAGE', 8], [`GOLD ${S.gold}/${g}`, S.gold >= g ? 8 : 11], [`INGOTS ${have}/${ing}`, have >= ing ? 8 : 11]],
        desc: 'Bandits carry iron ingots.',
      }];
    },
    onSelect: (i, ui) => {
      const cur = S.upgrades[id] || 0;
      if (cur >= 3) return;
      const g = UPGRADE_GOLD[cur], ing = UPGRADE_INGOT[cur];
      if (S.gold < g || count('iron_ingot') < ing) { sfx.play('nostamina'); ui.say(`NEED ${g} GOLD AND ${ing} INGOT${ing > 1 ? 'S' : ''}`, 11); return; }
      S.gold -= g; removeItem('iron_ingot', ing);
      S.upgrades[id] = cur + 1;
      sfx.play('levelup'); bus.emit('toast', `${ITEMS[id].name.toUpperCase()} +${cur + 1}`, 13);
      ui.say('UPGRADED TO +' + (cur + 1), 8);
    },
  });
}

export const ENCHANTS = [
  { type: 'fire', name: 'Flame', mat: 'bone_dust', n: 3, gold: 90, power: 5, desc: 'burns for +5' },
  { type: 'frost', name: 'Frost', mat: 'frost_lily', n: 3, gold: 90, power: 4, desc: 'slows foes, +4' },
  { type: 'shock', name: 'Storm', mat: 'wolf_fang', n: 3, gold: 90, power: 6, desc: 'shocks for +6' },
];
export async function enchantMenu(who) {
  const id = S.equip.weapon;
  if (!id) { await say(who, 'Wield a weapon first.'); return; }
  const rows = () => ENCHANTS.map((e) => {
    const have = count(e.mat), ok = S.gold >= e.gold && have >= e.n;
    return {
      id: e.mat, name: e.name + ' Enchant', tag: e.gold + 'G', ok,
      sub: S.enchants[id]?.type === e.type ? 'ACTIVE' : ok ? 'READY' : 'NEED MATERIALS',
      desc: `Your ${ITEMS[id].name} ${e.desc} on every hit. Replaces any other enchant.`,
      lines: [[`${ITEMS[e.mat].name.toUpperCase()} ${have}/${e.n}`, have >= e.n ? 8 : 11], [`GOLD ${S.gold}/${e.gold}`, S.gold >= e.gold ? 8 : 11]],
    };
  });
  await listScreen({
    title: 'ENCHANT: ' + ITEMS[id].name.toUpperCase(), hint: 'E ENCHANT   ESC DONE', rows,
    onSelect: (i, ui) => {
      const e = ENCHANTS[i];
      if (S.gold < e.gold || count(e.mat) < e.n) { sfx.play('nostamina'); ui.say(`NEED ${e.n} ${ITEMS[e.mat].name.toUpperCase()} AND ${e.gold} GOLD`, 11); return; }
      S.gold -= e.gold; removeItem(e.mat, e.n);
      S.enchants[id] = { type: e.type, power: e.power };
      sfx.play('levelup');
      bus.emit('toast', `${ITEMS[id].name.toUpperCase()} ENCHANTED: ${e.name.toUpperCase()}`, 15);
      ui.say(e.name.toUpperCase() + ' ENCHANT APPLIED', 15);
    },
  });
}

// ------------------------------------------------------------------ alchemy
export const RECIPES = [
  { id: 'hp_potion', needs: { snowberry: 2 } },
  { id: 'mp_potion', needs: { frost_lily: 2 } },
  { id: 'sp_potion', needs: { wolf_fang: 1, snowberry: 1 } },
  { id: 'hp_potion_g', needs: { snowberry: 3, wolf_fang: 1 } },
  { id: 'mp_potion_g', needs: { frost_lily: 3, bone_dust: 1 } },
  { id: 'berserker_draught', needs: { wolf_fang: 2, bone_dust: 1 } },
  { id: 'quicksilver_tonic', needs: { frost_lily: 1, snowberry: 1, wolf_fang: 1 } },
  { id: 'nightsight_elixir', needs: { frost_lily: 2, bone_dust: 1 } },
  { id: 'ironhide_brew', needs: { iron_ingot: 1, snowberry: 2, hide: 1 } },
  { id: 'frostward_tonic', needs: { frost_lily: 2, bone_dust: 2 } },
  { id: 'fen_tonic', needs: { marsh_orchid: 2, snowberry: 1 } },
  { id: 'bogward_brew', needs: { marsh_orchid: 2, bone_dust: 1 } },
  { id: 'moonlit_draught', needs: { moonpetal: 2, frost_lily: 1 } },
  { id: 'storm_brew', needs: { storm_feather: 2, frost_lily: 1 } },
];
const canBrew = (r) => Object.entries(r.needs).every(([k, n]) => count(k) >= n);
export async function brewMenu(who = 'Alchemy') {
  await listScreen({
    title: 'ALCHEMY', hint: 'E BREW   ESC DONE',
    rows: () => RECIPES.map((r) => {
      const ok = canBrew(r);
      return {
        id: r.id, name: ITEMS[r.id].name, tag: `x${count(r.id)}`, ok, tagCol: 4, sub: ok ? 'READY TO BREW' : 'NEED ITEMS',
        lines: Object.entries(r.needs).map(([k, n]) => [`${ITEMS[k].name.toUpperCase()} ${count(k)}/${n}`, count(k) >= n ? 8 : 11]),
      };
    }),
    onSelect: (i, ui) => {
      const r = RECIPES[i];
      if (!canBrew(r)) { sfx.play('nostamina'); ui.say('MISSING INGREDIENTS (HERBS AND REGION FINDS)', 11); return; }
      for (const [k, n] of Object.entries(r.needs)) removeItem(k, n);
      addItem(r.id);
      ui.say('BREWED ' + ITEMS[r.id].name.toUpperCase(), 8);
      sfx.play('potion');
    },
  });
}

// ----------------------------------------------------------------- fletching
export const FLETCH = [
  { id: 'fire_arrow', n: 5, arrows: 5, mat: 'bone_dust', matN: 1, gold: 12 },
  { id: 'bleed_arrow', n: 5, arrows: 5, mat: 'wolf_fang', matN: 1, gold: 12 },
];
export async function fletchMenu() {
  const can = (f) => S.arrows >= f.arrows && count(f.mat) >= f.matN && S.gold >= f.gold;
  await listScreen({
    title: 'FLETCHING', hint: 'E CRAFT   ESC DONE',
    rows: () => FLETCH.map((f) => ({
      id: f.id, name: `${ITEMS[f.id].name} x${f.n}`, tag: `${f.gold}G`, ok: can(f), sub: can(f) ? 'READY' : 'NEED ITEMS',
      lines: [[`ARROWS ${S.arrows}/${f.arrows}`, S.arrows >= f.arrows ? 8 : 11], [`${ITEMS[f.mat].name.toUpperCase()} ${count(f.mat)}/${f.matN}`, count(f.mat) >= f.matN ? 8 : 11], [`YOU HAVE ${count(f.id)}`, 4]],
    })),
    onSelect: (i, ui) => {
      const f = FLETCH[i];
      if (!can(f)) { sfx.play('nostamina'); ui.say('NEED ARROWS, A MATERIAL AND GOLD', 11); return; }
      S.arrows -= f.arrows; removeItem(f.mat, f.matN); S.gold -= f.gold; addItem(f.id, f.n);
      ui.say('CRAFTED ' + f.n + ' ' + ITEMS[f.id].name.toUpperCase(), 8); sfx.play('potion');
    },
  });
}

// ---------------------------------------------------------------- furnishing
export async function furnishMenu(scene) {
  S.flags.furn = S.flags.furn || {};
  await listScreen({
    title: 'FURNISH THE COTTAGE', hint: 'E BUY   ESC DONE',
    rows: () => FURNITURE.map((f) => {
      const own = !!S.flags.furn[f.id], ok = !own && S.gold >= f.price;
      return { id: f.tex === 'cauldron' ? 'snowberry' : null, name: f.name, tag: own ? 'OWNED' : f.price + 'G', tagCol: own ? 4 : ok ? 13 : 11, ok, sub: own ? 'IN THE ROOM' : ok ? 'CAN AFFORD' : `NEED ${f.price - S.gold} G`, desc: f.desc };
    }),
    onSelect: (i, ui) => {
      const f = FURNITURE[i];
      if (S.flags.furn[f.id]) { ui.say('YOU ALREADY HAVE THAT', 4); return; }
      if (S.gold < f.price) { sfx.play('nostamina'); ui.say('NOT ENOUGH GOLD', 11); return; }
      S.gold -= f.price; S.flags.furn[f.id] = true;
      scene.addFurniture(f);
      sfx.play('coin'); ui.say('PLACED: ' + f.name.toUpperCase(), 8);
    },
  });
}
export { recalc };

// Campfire cooking: turn fish and game into a five-minute meal buff.
export async function cookMenu() {
  await listScreen({
    title: 'CAMPFIRE', hint: 'E COOK   ESC DONE',
    rows: () => {
      const l = COOKABLE();
      if (!l.length) return [{ id: 'none', name: 'NOTHING TO COOK', tag: '', ok: false, tagCol: 4, sub: 'FISH AT ICE HOLES, HUNT DEER', lines: [] }];
      return l.map((r) => ({ id: r.to, name: ITEMS[r.to].name, tag: 'x' + count(r.to), ok: true, tagCol: 4, sub: r.label.toUpperCase(), lines: [[ITEMS[r.to].desc.toUpperCase().slice(0, 40), 5]] }));
    },
    onSelect: (i, ui) => {
      const l = COOKABLE();
      if (!l[i]) { sfx.play('nostamina'); return; }
      cook(l[i]);
      ui.say('COOKED ' + ITEMS[l[i].to].name.toUpperCase(), 8);
    },
  });
}

// ------------------------------------------------- repair, reforge, buy back
export async function repairMenu(who) {
  if (!durOn()) { await say(who, 'Your gear is not wearing out. (Turn on DURABILITY in Pause > System if you want it to.)'); return; }
  await listScreen({
    title: 'REPAIR', hint: 'E REPAIR   Q REPAIR ALL   ESC DONE', empty: 'EVERYTHING YOU CARRY IS IN GOOD SHAPE',
    rows: () => damaged().map((id) => {
      const c = repairCost(id), ok = S.gold >= c;
      return { id, name: ITEMS[id].name, tag: c + 'G', ok, tagCol: ok ? 13 : 11, sub: `${durOf(id)}/${durMax(id)}${durOf(id) <= 0 ? '  BROKEN' : ''}`, lines: statLines(id) };
    }),
    onSelect: (i, ui) => {
      const id = damaged()[i]; if (!id) return;
      const c = repairCost(id);
      if (S.gold < c) { sfx.play('nostamina'); ui.say('NOT ENOUGH GOLD', 11); return; }
      S.gold -= c; repairItem(id); sfx.play('upgrade'); ui.say('REPAIRED ' + ITEMS[id].name.toUpperCase(), 8);
    },
    onAlt: (i, ui) => {
      const all = damaged(), total = all.reduce((a, id) => a + repairCost(id), 0);
      if (!all.length) return;
      if (S.gold < total) { sfx.play('nostamina'); ui.say(`NEED ${total} GOLD FOR EVERYTHING`, 11); return; }
      S.gold -= total; all.forEach(repairItem); sfx.play('upgrade'); ui.say('ALL GEAR REPAIRED', 8);
    },
  });
}

const reforgeCost = (id) => ({ gold: 50 + 60 * rarityIndex(ITEMS[id]), ingots: 1 + rarityIndex(ITEMS[id]) });
const reforgeable = () => Object.keys(S.inv).filter((id) => ITEMS[id]?.gen && S.inv[id] > 0);
export async function reforgeMenu(who) {
  if (!reforgeable().length) { await say(who, 'I can only reforge the strange gear you find out in the Reach. Bring me some.'); return; }
  await listScreen({
    title: 'REFORGE', hint: 'E REFORGE   ESC DONE',
    rows: () => reforgeable().map((id) => {
      const c = reforgeCost(id), ok = S.gold >= c.gold && count('iron_ingot') >= c.ingots;
      return { id, name: ITEMS[id].name, tag: `${c.gold}G ${c.ingots}I`, ok, tagCol: ok ? 13 : 11, sub: ok ? 'NEW AFFIXES' : 'NEED GOLD AND INGOTS', lines: statLines(id), desc: ITEMS[id].desc };
    }),
    onSelect: (i, ui) => {
      const id = reforgeable()[i]; if (!id) return;
      const c = reforgeCost(id);
      if (S.gold < c.gold || count('iron_ingot') < c.ingots) { sfx.play('nostamina'); ui.say(`NEED ${c.gold} GOLD AND ${c.ingots} INGOT${c.ingots > 1 ? 'S' : ''}`, 11); return; }
      S.gold -= c.gold; removeItem('iron_ingot', c.ingots);
      reforgeGen(id); recalc(); sfx.play('upgrade'); ui.say('REFORGED: ' + ITEMS[id].name.toUpperCase(), 8);
    },
  });
}

export async function buybackMenu(who) {
  const list = () => (S.buyback || []).filter((r) => r.n > 0 && ITEMS[r.id]);
  if (!list().length) { await say(who, 'You have not sold me anything lately.'); return; }
  await listScreen({
    title: who.toUpperCase() + ': BUY BACK', hint: 'E BUY ONE   ESC DONE', empty: 'NOTHING TO BUY BACK',
    rows: () => list().map((r) => { const p = Math.max(1, Math.round(r.paid / r.n * 1.2)); return { id: r.id, name: ITEMS[r.id].name, tag: `x${r.n}  ${p}G`, ok: S.gold >= p, tagCol: S.gold >= p ? 13 : 11, sub: `SOLD FOR ${Math.round(r.paid / r.n)}G EACH`, lines: statLines(r.id) }; }),
    onSelect: (i, ui) => {
      const r = list()[i]; if (!r) return;
      const p = Math.max(1, Math.round(r.paid / r.n * 1.2));
      if (S.gold < p) { sfx.play('nostamina'); ui.say('NOT ENOUGH GOLD', 11); return; }
      S.gold -= p; r.paid -= Math.round(r.paid / r.n); r.n--; addItem(r.id); sfx.play('coin'); ui.say('BOUGHT BACK ' + ITEMS[r.id].name.toUpperCase(), 8);
    },
  });
}

// ----------------------------------------------------------------- home stash
export async function stashMenu() {
  S.stash = S.stash || {};
  const carried = () => Object.keys(S.inv).filter((id) => ITEMS[id] && S.inv[id] > (equippedIds().has(id) ? 1 : 0) && ITEMS[id].type !== 'quest');
  const stored = () => Object.keys(S.stash).filter((id) => S.stash[id] > 0 && ITEMS[id]);
  for (;;) {
    const c = await choose(['Put things in the stash', 'Take things out', 'Close']);
    if (c === 0) {
      await listScreen({ title: 'STASH: DEPOSIT', hint: 'E PUT ONE   Q PUT ALL   ESC DONE', empty: 'NOTHING TO STORE',
        rows: () => carried().map((id) => ({ id, name: ITEMS[id].name, tag: 'x' + (S.inv[id] - (equippedIds().has(id) ? 1 : 0)), ok: true, sub: 'IN YOUR PACK', lines: statLines(id) })),
        onSelect: (i, ui) => { const id = carried()[i]; if (!id) return; S.inv[id]--; if (S.inv[id] <= 0) delete S.inv[id]; S.stash[id] = (S.stash[id] || 0) + 1; sfx.play('select'); ui.say('STORED ' + ITEMS[id].name.toUpperCase(), 8); },
        onAlt: (i, ui) => { const id = carried()[i]; if (!id) return; const n = S.inv[id] - (equippedIds().has(id) ? 1 : 0); S.inv[id] -= n; if (S.inv[id] <= 0) delete S.inv[id]; S.stash[id] = (S.stash[id] || 0) + n; sfx.play('select'); ui.say(`STORED ${n}`, 8); } });
    } else if (c === 1) {
      await listScreen({ title: 'STASH: TAKE', hint: 'E TAKE ONE   Q TAKE ALL   ESC DONE', empty: 'THE STASH IS EMPTY',
        rows: () => stored().map((id) => ({ id, name: ITEMS[id].name, tag: 'x' + S.stash[id], ok: true, sub: 'IN THE STASH', lines: statLines(id) })),
        onSelect: (i, ui) => { const id = stored()[i]; if (!id) return; S.stash[id]--; if (S.stash[id] <= 0) delete S.stash[id]; addItem(id); sfx.play('select'); ui.say('TOOK ' + ITEMS[id].name.toUpperCase(), 8); },
        onAlt: (i, ui) => { const id = stored()[i]; if (!id) return; const n = S.stash[id]; delete S.stash[id]; addItem(id, n); sfx.play('select'); ui.say(`TOOK ${n}`, 8); } });
    } else return;
  }
}
