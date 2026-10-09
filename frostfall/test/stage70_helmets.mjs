// Helmets and worn gear: the head slot, sixteen distinct helmets, stats, sets, where they are found, and armour/helmets drawn on the hero.
import { launch, check } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=424242');
await h.sleep(700);
const G = (fn, a) => h.ev(fn, a);
const HELMS = ['leather_cap', 'iron_helm', 'nordic_helm', 'hunter_hood', 'frost_circlet', 'bulwark_helm', 'scale_helm', 'warden_helm', 'clan_skull', 'court_helm', 'deep_helm', 'tide_cap', 'ember_helm', 'rime_helm', 'prism_helm', 'pale_cowl'];

const info = await G(async (ids) => {
  const { ITEMS, iconKey, SLOT_OF } = await import('/src/data/items.js');
  const sc = window.__ff.game.scene.getScene('Game');
  const sig = (key) => { const t = sc.textures.get(key), img = t.getSourceImage(), c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); return Array.from(x.getImageData(0, 0, c.width, c.height).data).reduce((a, v, i) => (a * 31 + v + i) >>> 0, 7); };
  return { slot: SLOT_OF.helmet, items: ids.map((id) => ({ id, type: ITEMS[id]?.type, armor: ITEMS[id]?.armor, icon: sc.textures.exists(iconKey(id)) && sig(iconKey(id)), kind: ITEMS[id]?.icon?.[0] })) };
}, HELMS);
check('helmets use the head slot', info.slot === 'head');
check('all 16 helmets exist with armour', info.items.every((i) => i.type === 'helmet' && i.armor > 0), JSON.stringify(info.items.filter((i) => i.type !== 'helmet')));
check('each has an icon, and every helmet looks different', info.items.every((i) => i.icon) && new Set(info.items.map((i) => i.icon)).size === 16 && new Set(info.items.map((i) => i.kind)).size === 16);

// ---- equipping
const eqr = await G(async () => {
  const S = window.__ff.S, inv = await import('/src/systems/inventory.js'), { stats: st, recalc } = await import('/src/systems/stats.js'); inv.recalc = recalc;
  S.equip.head = null; S.equip.armor = null; S.equip.charm = null; recalc();
  const a0 = st.armor(), hp0 = S.maxHp, mp0 = S.maxMp;
  inv.addItem('bulwark_helm', 1, true); inv.equip('bulwark_helm');
  const a1 = st.armor(); const slot = S.equip.head;
  inv.addItem('scale_helm', 1, true); inv.equip('scale_helm');
  const hp1 = S.maxHp;
  inv.addItem('frost_circlet', 1, true); inv.equip('frost_circlet');
  const mp1 = S.maxMp, mul = st.trait('manaCostMul');
  inv.unequip('head');
  return { a0, a1, slot, hp0, hp1, mp0, mp1, mul, after: S.equip.head, a2: st.armor() };
});
check('a helmet adds armour and unequips cleanly', eqr.slot === 'bulwark_helm' && eqr.a1 > eqr.a0 && eqr.after == null && Math.abs(eqr.a2 - eqr.a0) < 1e-9, JSON.stringify(eqr));
check('helmet health and mana bonuses count', eqr.hp1 === eqr.hp0 + 15 && eqr.mp1 === eqr.mp0 + 15 && Math.abs(eqr.mul - 0.95) < 1e-9, JSON.stringify(eqr));

// ---- sets and places
const where = await G(async () => {
  const { SETS } = await import('/src/systems/sets.js');
  const { POOLS } = await import('/src/data/stock.js');
  const { EMBERFORGE, ARMOURY } = await import('/src/data/emberhold.js');
  const { ENEMIES } = await import('/src/data/enemies.js');
  const { THEME_HELM } = await import('/src/world/barrowgen.js');
  const { genItem } = await import('/src/systems/genloot.js');
  const gens = []; for (let i = 0; i < 400; i++) { const it = genItem(1, Math.random, null, { slot: 'helmet' }); gens.push(it); }
  return {
    sets: ['ember_helm', 'court_helm', 'prism_helm', 'deep_helm', 'tide_cap', 'warden_helm'].every((id) => Object.values(SETS).some((s) => s.items.includes(id))),
    shop: POOLS.Hilda.some((r) => r[0] === 'iron_helm') && POOLS.Mirra.some((r) => r[0] === 'frost_circlet'),
    forge: EMBERFORGE.some((r) => r.id === 'ember_helm'), armoury: ['court_helm', 'tide_cap', 'warden_helm'].every((id) => ARMOURY.some((r) => r.id === id)),
    drops: JSON.stringify(ENEMIES.boss.loot.drops).includes('nordic_helm'), themes: Object.keys(THEME_HELM).length >= 5,
    gen: gens.every((g) => g.type === 'helmet' && g.armor > 0 && g.icon[0].startsWith('helm_')),
  };
});
check('helmets belong to their sets', where.sets);
check('shops, forge, armoury, boss drops and barrow chests supply helmets', where.shop && where.forge && where.armoury && where.drops && where.themes, JSON.stringify(where));
check('generated loot rolls helmets', where.gen);

// ---- worn on the hero
const worn = await G(async () => {
  const { wornHeroKey } = await import('/src/art/sprites.js');
  const { ITEMS } = await import('/src/data/items.js');
  const sc = window.__ff.game.scene.getScene('Game'), S = window.__ff.S, p = sc.player;
  const sig = (key) => { const t = sc.textures.get(key), img = t.getSourceImage(), c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); return Array.from(x.getImageData(0, 0, c.width, c.height).data).reduce((a, v, i) => (a * 31 + v + i) >>> 0, 7); };
  const kind = (id) => ITEMS[id].icon[0];
  const armours = Object.values(ITEMS).filter((i) => i.type === 'armor' && !i.gen).map((i) => kind(Object.keys(ITEMS).find((k) => ITEMS[k] === i)));
  const uniqA = [...new Set(armours)];
  const sa = uniqA.map((k) => sig(wornHeroKey(sc, k, null, 11)));
  const kinds = ['helm_cap', 'helm_nasal', 'helm_nordic', 'helm_hood', 'helm_circlet', 'helm_great', 'helm_scale', 'helm_warden', 'helm_skull', 'helm_court', 'helm_deep', 'helm_tide', 'helm_ember', 'helm_rime', 'helm_prism', 'helm_pelt'];
  const sh = kinds.map((k) => sig(wornHeroKey(sc, null, null, 11, k)));
  S.equip.armor = 'nordic_plate'; S.equip.head = 'court_helm'; S.equip.charm = null;
  const before = p.texture.key;
  await new Promise((r) => setTimeout(r, 300));
  const after = p.texture.key;
  S.equip.armor = null; S.equip.head = null;
  await new Promise((r) => setTimeout(r, 300));
  const plain = p.texture.key;
  const frames = ['down0', 'up0', 'side0', 'atkdown1', 'hurt0', 'dead0'].every((f) => sc.textures.get(after).has(f));
  return { nA: uniqA.length, dA: new Set(sa).size, dH: new Set(sh).size, before, after, plain, frames };
});
check('every armour makes the hero look different', worn.dA === worn.nA && worn.nA >= 20, JSON.stringify(worn));
check('every helmet makes the hero look different', worn.dH === 16, JSON.stringify(worn));
check('equipping changes the hero sprite, unequipping restores it', worn.after.startsWith('spr_worn_') && worn.after !== worn.before && worn.plain.startsWith('spr_') && !worn.plain.startsWith('spr_worn_'), JSON.stringify(worn));
check('the worn sheet has every pose', worn.frames);
check('no page errors', h.errors.length === 0, h.errors.join(' | '));
await h.close();
