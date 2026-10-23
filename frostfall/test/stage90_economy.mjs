// Economy fixes in the running game: gem and crit slots (PR-05), gold find (PR-06, PR-25), selling (PR-07),
// heavy armour speed (PR-09), generated loot (PR-10), tooltips (PR-13), gold rewards (PR-16, CH14), comparison (PR-21).
import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=424242');
await h.sleep(900);
const G = (fn, a) => h.ev(fn, a);
await G(() => { window.__ff.S.flags.introDone = true; });
const reset = `const S = window.__ff.S; for (const k of Object.keys(S.equip)) S.equip[k] = null; S.sockets = {}; S.upgrades = {}; S.enchants = {}; S.blessing = null; S.follower = false; S.companion = null; S.mods = null;`;

// ---- PR-05: gems and crit stay in their own item
const gem = await G(async (reset) => {
  eval(reset);
  const S = window.__ff.S, { stats } = await import('/src/systems/stats.js');
  for (const id of ['steel_sword', 'long_bow', 'iron_cuirass', 'antler_bow', 'glass_dagger', 'gem_ruby']) S.inv[id] = 3;
  S.equip.weapon = 'steel_sword'; S.equip.bow = 'long_bow'; S.equip.armor = 'iron_cuirass';
  const w0 = stats.weaponDmg(), b0 = stats.bowDmg();
  S.sockets = { iron_cuirass: ['gem_ruby'] }; const wArmorRuby = stats.weaponDmg();
  S.sockets = { long_bow: ['gem_ruby'] }; const wBowRuby = stats.weaponDmg(), bBowRuby = stats.bowDmg();
  S.sockets = { steel_sword: ['gem_ruby'] }; const wSwordRuby = stats.weaponDmg();
  S.sockets = {}; S.equip.bow = 'antler_bow'; const meleeWithCritBow = stats.meleeCrit(), bowCrit = stats.bowCrit();
  // a stack of crit far past the cap
  S.equip.weapon = 'glass_dagger'; S.equip.offhand = 'glass_dagger'; S.inv.glass_dagger = 3;
  const big = stats.meleeCrit();
  const { ITEMS } = await import('/src/data/items.js'); ITEMS.__critcharm = { name: 'T', type: 'charm', crit: 0.4, value: 1 }; S.inv.__critcharm = 1; S.equip.charm = '__critcharm';
  const capped = stats.meleeCrit(); S.equip.charm = null; delete S.inv.__critcharm; delete ITEMS.__critcharm;
  return { armorRubyNoDmg: wArmorRuby === w0, bowRubyNotSword: wBowRuby === w0 && bBowRuby === b0 + 3, swordRuby: wSwordRuby === w0 + 3, bowCritNotMelee: meleeWithCritBow === 0 && bowCrit > 0, offhandCrit: big > 0.3, cap: capped === 0.5, big };
}, reset);
check('PR-05: a ruby counts only in the item it sits in; bow crit never adds to melee; an off-hand weapon adds; crit is capped at 50%', Object.values(gem).every(Boolean), JSON.stringify(gem));

// ---- PR-06 / PR-25: gold find adds up, includes set bonuses, and is capped
const gold = await G(async (reset) => {
  eval(reset);
  const S = window.__ff.S, { stats } = await import('/src/systems/stats.js'), { addGold } = await import('/src/systems/inventory.js');
  for (const id of ['court_plate', 'court_helm', 'court_signet', 'court_hammer']) S.inv[id] = 1;
  const base = stats.goldFind();
  S.equip.charm = 'court_signet'; const signet = stats.goldFind();
  S.equip.armor = 'court_plate'; S.equip.head = 'court_helm'; const set3 = stats.goldFind();
  S.blessing = 'fox'; S.follower = true; S.companion = 'pell'; const capped = stats.goldFind();
  S.blessing = null; S.follower = false; S.companion = null;
  for (const k of Object.keys(S.equip)) S.equip[k] = null;
  S.gold = 0; const paid = addGold(100, { quiet: true }), flat = addGold(100, { mul: false, quiet: true });
  return { base: base === 1, signet: Math.abs(signet - 1.1) < 1e-9, set: Math.abs(set3 - 1.25) < 1e-9, cap: Math.abs(capped - 1.6) < 1e-9, paid: paid === 100 && flat === 100 && S.gold === 200, vals: [base, signet, set3, capped] };
}, reset);
check('PR-06/PR-25: the Court set adds +15% gold; gold-find sources add up and stop at +60%', Object.values(gold).every(Boolean), JSON.stringify(gold));

// ---- PR-07: selling the last Legendary or set piece asks first; Magic items have their own durability
const sell = await G(async (reset) => {
  eval(reset);
  const { isPrecious } = await import('/src/data/services.js'), { makeGenItem } = await import('/src/systems/genloot.js'), { durMax } = await import('/src/systems/durability.js');
  const leg = makeGenItem(2, Math.random, 3), mag = makeGenItem(2, Math.random, 1), rare = makeGenItem(2, Math.random, 2);
  const magIt = window.__ff.S.gen[mag];
  return { leg: isPrecious(leg), rare: isPrecious(rare), set: isPrecious('court_signet'), notMagic: !isPrecious(mag), notPlain: !isPrecious('iron_sword'), magicDur: durMax(mag) === 80 && magIt.rarity === 'magic' };
}, reset);
check('PR-07: Legendary, Rare and set pieces ask before the last one is sold; Magic durability is 80', Object.values(sell).every(Boolean), JSON.stringify(sell));

// ---- PR-16 / CH14: discovery gold counts the modifiers once; world rewards go through addGold (gold find applies)
const rew = await G(async (reset) => {
  eval(reset);
  const S = window.__ff.S, sc = window.__ff.game.scene.getScene('Game'), { TUNE } = await import('/src/data/tuning.js');
  S.mods = { pilgrim: true }; S.gold = 0;
  sc.discover({ id: 'eco_test', kind: 'cache', tier: 0, x: 0, y: 0 }, 'eco:test');
  const disc = S.gold;
  S.mods = null; S.gold = 0;
  for (const id of ['court_signet']) S.inv[id] = 1;
  S.equip.charm = 'court_signet';
  const { completeContract } = await import('/src/data/contracts.js');
  S.contracts = { active: ['eco_c'], done: {}, offers: [{ id: 'eco_c', gold: 100, gear: 0, x: 0, y: 0 }] };
  completeContract('eco_c', null);
  const contract = S.gold;
  S.equip.charm = null; delete S.discovered['eco:test'];
  return { disc: disc === Math.round(TUNE.economy.rewards.discoverHidden[0] * 1.3), contract: contract === 110, vals: [disc, contract] };
}, reset);
check('PR-16/CH14: a discovery under Pilgrim pays x1.3 (not x1.69); a contract pays through gold find (+10% signet)', Object.values(rew).every(Boolean), JSON.stringify(rew));

// ---- PR-09: heavy armour slows once (its class), and the tooltip shows the total
const heavy = await G(async (reset) => {
  eval(reset);
  const S = window.__ff.S, { stats } = await import('/src/systems/stats.js'), { genItem, registerGen, rehydrateGen } = await import('/src/systems/genloot.js'), { statLines } = await import('/src/data/services.js'), { TUNE } = await import('/src/data/tuning.js');
  const plate = genItem(2, Math.random, 0, { slot: 'armor', baseName: 'Plate' }), helm = genItem(2, Math.random, 0, { slot: 'helmet', baseName: 'Greathelm' });
  registerGen('g_ecoplate', plate); registerGen('g_ecohelm', helm); S.inv.g_ecoplate = 1; S.inv.g_ecohelm = 1;
  S.equip.armor = 'g_ecoplate'; S.equip.head = 'g_ecohelm';
  const W = TUNE.player.weights.heavy.move, want = W * (1 + (W - 1) * 0.5) * stats.trait('moveMul') / stats.trait('moveMul');
  const mv = stats.trait('moveMul');
  // an old save's Plate with its own 0.94 is put right on load
  S.gen.g_ecoold = { ...plate, moveMul: 0.94 }; rehydrateGen();
  const old = S.gen.g_ecoold.moveMul;
  const lines = statLines('bulwark_plate').map((l) => l[0]).join(' | ');
  for (const k of ['g_ecoplate', 'g_ecohelm', 'g_ecoold']) { delete S.gen[k]; delete S.inv[k]; }
  for (const k of Object.keys(S.equip)) S.equip[k] = null;
  return { noOwn: plate.moveMul == null && helm.moveMul == null, once: Math.abs(mv - want) < 1e-9, old: old === undefined, tooltip: /SPEED -19% WITH CLASS/.test(lines), lines };
}, reset);
check('PR-09: generated Plate and Greathelm slow only through the heavy class; old saves are fixed; Bulwark Plate shows its total speed', Object.values(heavy).every(Boolean), JSON.stringify(heavy));

// ---- PR-13: element tooltips say what an element does, and the target bar shows weak / resists
const el = await G(async (reset) => {
  eval(reset);
  const S = window.__ff.S, { stats } = await import('/src/systems/stats.js'), { statLines, ENCHANTS } = await import('/src/data/services.js');
  S.inv.ember_blade = 1; S.equip.weapon = 'ember_blade';
  const line = statLines('ember_blade').map((l) => l[0]).join(' | ');
  const weak = stats.elemVs({ weak: { fire: 1.5 } }), res = stats.elemVs({ weak: { fire: 0.3 } }), none = stats.elemVs({});
  S.equip.weapon = null;
  return { line: /HITS AS FIRE/.test(line), weak: weak === 'WEAK' && res === 'RESISTS' && none === '', words: ENCHANTS.every((e) => /count as/.test(e.desc)) };
}, reset);
check('PR-13: weapons show which element they hit as; the target bar knows WEAK and RESISTS; enchants say what they do', Object.values(el).every(Boolean), JSON.stringify(el));

// @@MORE@@

check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'ECONOMY FAILED' : 'ECONOMY PASSED');
process.exit(failCount() ? 1 : 0);
