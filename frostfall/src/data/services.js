// Shared NPC services: buying, selling, forging, enchanting, brewing. All dialogue-driven.
import { S } from '../systems/state.js';
import { say, choose } from '../systems/dialogue.js';
import { bus } from '../systems/bus.js';
import { ITEMS, SLOT_OF } from './items.js';
import { addItem, removeItem, count, addGold } from '../systems/inventory.js';
import { recalc } from '../systems/stats.js';
import { sfx } from '../audio/sfx.js';

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

// ---------------------------------------------------------------------- buy
export async function buyMenu(who, wares) {
  for (;;) {
    const labels = wares.map((w) => `${w.name || ITEMS[w.id].name} ${w.price}G`);
    const i = await pick(labels, 'Done');
    if (i < 0) return;
    const w = wares[i];
    if (w.once && count(w.id)) { await say(who, 'You already carry one.'); continue; }
    if (S.gold < w.price) { sfx.play('nostamina'); await say(who, 'Come back when you have the coin.'); continue; }
    S.gold -= w.price;
    if (w.id === 'arrows') { S.arrows += w.n; bus.emit('toast', `+${w.n} ARROWS`, 5); }
    else addItem(w.id, w.n || 1);
    sfx.play('coin');
  }
}

// --------------------------------------------------------------------- sell
const equippedIds = () => new Set(Object.values(S.equip).filter(Boolean));
export function sellable() {
  const eq = equippedIds();
  return Object.keys(S.inv).filter((id) => ITEMS[id] && ITEMS[id].type !== 'quest' && (S.inv[id] > (eq.has(id) ? 1 : 0)));
}
export async function sellMenu(who) {
  for (;;) {
    const list = sellable();
    if (!list.length) { await say(who, 'You have nothing I would buy.'); return; }
    const i = await pick(list.map((id) => `${ITEMS[id].name} x${S.inv[id] - (equippedIds().has(id) ? 1 : 0)} ${sellPrice(id)}G`), 'Done');
    if (i < 0) return;
    const id = list[i];
    const avail = S.inv[id] - (equippedIds().has(id) ? 1 : 0);
    let n = 1;
    if (avail > 1) { const c = await choose(['Sell one', `Sell all (${avail})`, 'Cancel']); if (c === 2) continue; n = c === 1 ? avail : 1; }
    S.inv[id] -= n; if (S.inv[id] <= 0) delete S.inv[id];
    S.gold += sellPrice(id) * n;
    bus.emit('toast', `+${sellPrice(id) * n} GOLD`, 13);
    sfx.play('coin');
  }
}

// -------------------------------------------------------------------- forge
export const UPGRADE_GOLD = [50, 90, 140];
export const UPGRADE_INGOT = [1, 2, 3];
export async function upgradeMenu(who, slot) {
  const id = S.equip[slot];
  if (!id) { await say(who, 'You have nothing equipped there.'); return; }
  const lv = (S.upgrades[id] || 0);
  if (lv >= 3) { await say(who, `That ${ITEMS[id].name} is as good as it will ever be.`); return; }
  const g = UPGRADE_GOLD[lv], ing = UPGRADE_INGOT[lv];
  const bonus = slot === 'armor' ? '+2% armor' : '+2 damage';
  const c = await choose([`Upgrade to +${lv + 1}: ${g}G ${ing} ingot${ing > 1 ? 's' : ''}`, 'Not now']);
  if (c !== 0) return;
  if (S.gold < g || count('iron_ingot') < ing) { sfx.play('nostamina'); await say(who, `You need ${g} gold and ${ing} iron ingot${ing > 1 ? 's' : ''}. Bandits carry them.`); return; }
  S.gold -= g; removeItem('iron_ingot', ing);
  S.upgrades[id] = lv + 1;
  sfx.play('levelup'); bus.emit('toast', `${ITEMS[id].name.toUpperCase()} +${lv + 1} (${bonus})`, 13);
  await say(who, 'There. Sharper, sturdier. Mind the edge.');
}

export const ENCHANTS = [
  { type: 'fire', name: 'Flame', mat: 'bone_dust', n: 3, gold: 90, power: 5, desc: 'burns for +5' },
  { type: 'frost', name: 'Frost', mat: 'frost_lily', n: 3, gold: 90, power: 4, desc: 'slows foes, +4' },
  { type: 'shock', name: 'Storm', mat: 'wolf_fang', n: 3, gold: 90, power: 6, desc: 'shocks for +6' },
];
export async function enchantMenu(who) {
  const id = S.equip.weapon;
  if (!id) { await say(who, 'Wield a weapon first.'); return; }
  const labels = ENCHANTS.map((e) => `${e.name}: ${e.n} ${ITEMS[e.mat].name}, ${e.gold}G`);
  const i = await pick(labels);
  if (i < 0) return;
  const e = ENCHANTS[i];
  if (S.gold < e.gold || count(e.mat) < e.n) { sfx.play('nostamina'); await say(who, `I need ${e.n} ${ITEMS[e.mat].name} and ${e.gold} gold for that.`); return; }
  S.gold -= e.gold; removeItem(e.mat, e.n);
  S.enchants[id] = { type: e.type, power: e.power };
  sfx.play('levelup');
  bus.emit('toast', `${ITEMS[id].name.toUpperCase()} ENCHANTED: ${e.name.toUpperCase()}`, 15);
  await say(who, `It hums now. The ${e.name.toLowerCase()} will ${e.desc} on every hit.`);
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
  for (;;) {
    const labels = RECIPES.map((r) => `${ITEMS[r.id].name} (${Object.entries(r.needs).map(([k, n]) => n + ' ' + ITEMS[k].name.split(' ').pop()).join(' + ')})${canBrew(r) ? '' : ' -'}`);
    const i = await pick(labels, 'Done');
    if (i < 0) return;
    const r = RECIPES[i];
    if (!canBrew(r)) { sfx.play('nostamina'); await say(who, 'You are missing ingredients. Snowberries and frost lilies grow in the forest.'); continue; }
    for (const [k, n] of Object.entries(r.needs)) removeItem(k, n);
    addItem(r.id);
    sfx.play('potion');
  }
}
export { recalc };
