// Shared NPC services: buying, selling, forging, enchanting, brewing. All dialogue-driven.
import { S } from '../systems/state.js';
import { say, choose } from '../systems/dialogue.js';
import { bus } from '../systems/bus.js';
import { ITEMS, SLOT_OF } from './items.js';
import { addItem, removeItem, count, addGold } from '../systems/inventory.js';
import { recalc } from '../systems/stats.js';
import { sfx } from '../audio/sfx.js';
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
  for (const [k, n] of [['maxHp', 'HEALTH'], ['maxMp', 'MANA'], ['maxSp', 'STAMINA']]) if (it[k]) out.push([`+${it[k]} ${n}`, 8]);
  return out;
}

// ---------------------------------------------------------------------- buy
export async function buyMenu(who, wares) {
  await listScreen({
    title: who.toUpperCase() + ': BUY',
    hint: 'E BUY   ESC DONE   OR CLICK',
    rows: () => wares.map((w) => {
      const have = w.once && count(w.id);
      const ok = !have && S.gold >= w.price;
      return {
        id: w.id, name: w.name || ITEMS[w.id].name, tag: have ? 'OWNED' : w.price + 'G', ok, tagCol: have ? 4 : ok ? 13 : 11,
        sub: have ? 'ALREADY OWNED' : ok ? 'CAN AFFORD' : `NEED ${w.price - S.gold} G`,
        lines: [...statLines(w.id), w.id === 'arrows' ? [`YOU HAVE ${S.arrows}`, 4] : [`YOU HAVE ${count(w.id)}`, 4]],
        desc: w.id === 'arrows' ? 'Ten arrows for the bow. Missed shots can be picked up again.' : null,
      };
    }),
    onSelect: (i, ui) => {
      const w = wares[i];
      if (w.once && count(w.id)) { ui.say('YOU ALREADY CARRY ONE', 4); sfx.play('nostamina'); return; }
      if (S.gold < w.price) { ui.say('NOT ENOUGH GOLD', 11); sfx.play('nostamina'); return; }
      S.gold -= w.price;
      if (w.id === 'arrows') { S.arrows += w.n; bus.emit('toast', `+${w.n} ARROWS`, 5); }
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
export async function sellMenu(who) {
  if (!sellable().length) { await say(who, 'You have nothing I would buy.'); return; }
  const avail = (id) => S.inv[id] - (equippedIds().has(id) ? 1 : 0);
  const sellN = (id, n, ui) => {
    S.inv[id] -= n; if (S.inv[id] <= 0) delete S.inv[id];
    S.gold += sellPrice(id) * n;
    ui.say(`SOLD ${n} FOR ${sellPrice(id) * n}G`, 13);
    sfx.play('coin');
  };
  await listScreen({
    title: who.toUpperCase() + ': SELL',
    hint: 'E SELL ONE   Q SELL ALL   ESC DONE',
    empty: 'NOTHING LEFT TO SELL',
    rows: () => sellable().map((id) => ({
      id, name: ITEMS[id].name, tag: `x${avail(id)}  ${sellPrice(id)}G`, ok: true,
      sub: `WORTH ${sellPrice(id)}G EACH`, lines: statLines(id),
    })),
    onSelect: (i, ui) => { const id = sellable()[i]; if (id) sellN(id, 1, ui); },
    onAlt: (i, ui) => { const id = sellable()[i]; if (id) sellN(id, avail(id), ui); },
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
      if (!canBrew(r)) { sfx.play('nostamina'); ui.say('MISSING INGREDIENTS (FOREST HERBS)', 11); return; }
      for (const [k, n] of Object.entries(r.needs)) removeItem(k, n);
      addItem(r.id);
      ui.say('BREWED ' + ITEMS[r.id].name.toUpperCase(), 8);
      sfx.play('potion');
    },
  });
}
export { recalc };
