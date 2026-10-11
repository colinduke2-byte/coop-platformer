// Gear upgrades to +10: the table, the stat maths for every slot, smith caps, costs and the Heart Shard.
import { launch, check } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=424242');
await h.sleep(900);
const G = (fn, a) => h.ev(fn, a);
await G(() => { window.__ff.S.flags.introDone = true; });

const t = await G(async () => {
  const U = await import('/src/systems/upgrades.js');
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  const lv = Array.from({ length: 10 }, (_, i) => U.UPGRADE_COST[i + 1]);
  return {
    costs: lv.every((c) => c && c.gold > 0 && c.n > 0) && lv.every((c, i) => i === 0 || c.gold > lv[i - 1].gold),
    iron: lv.slice(0, 3).every((c) => c.mat === 'iron_ingot') && lv[0].gold === 50 && lv[2].gold === 140,
    ash: lv.slice(3, 6).every((c) => c.mat === 'ash_iron'), ore: lv.slice(6).every((c) => c.mat === 'ember_ore'),
    shards: !lv[6].mat2 && !lv[7].mat2 && lv[8].mat2 === 'heart_shard' && lv[9].mat2 === 'heart_shard',
    w3: near(U.totalGain('weapon', 3), 0.15), w6: near(U.totalGain('weapon', 6), 0.33), w10: near(U.totalGain('weapon', 10), 0.65),
    a10: near(U.totalGain('armor', 10), 0.205), h10: near(U.totalGain('helm', 10), 0.076), s10: near(U.totalGain('shield', 10), 0.15),
    capped: U.upgraded('shield', 10, 0.88) === 0.9, over: near(U.totalGain('weapon', 99), 0.65), none: U.totalGain('charm', 5) === 0,
    caps: U.SMITH_CAP.village === 3 && U.SMITH_CAP.emberhold === 6 && U.SMITH_CAP.anvil === 10,
  };
});
check('the table: 10 levels, rising gold, iron then ash iron then ember ore, shards for +9 and +10', t.costs && t.iron && t.ash && t.ore && t.shards, JSON.stringify(t));
check('gains: weapons +15% / +33% / +65% at +3 / +6 / +10; armour +20.5 points; helmet +7.6; shield +15 (capped at 90%)', t.w3 && t.w6 && t.w10 && t.a10 && t.h10 && t.s10 && t.capped && t.over && t.none, JSON.stringify(t));

// every slot changes the player's stats
const st = await G(async () => {
  const S = window.__ff.S, { stats, recalc } = await import('/src/systems/stats.js'), { ITEMS } = await import('/src/data/items.js');
  const out = {};
  for (const id of ['iron_sword', 'iron_shield', 'long_bow', 'iron_cuirass', 'iron_helm']) S.inv[id] = 1;
  S.equip.weapon = 'iron_sword'; S.equip.offhand = 'iron_shield'; S.equip.bow = 'long_bow'; S.equip.armor = 'iron_cuirass'; S.equip.head = 'iron_helm'; S.upgrades = {};
  recalc();
  const b = { w: stats.weaponDmg(), s: stats.shield().block, bow: stats.bowDmg(), a: stats.armor() };
  S.upgrades = { iron_sword: 10, iron_shield: 10, long_bow: 10, iron_cuirass: 10, iron_helm: 10 };
  recalc();
  const a = { w: stats.weaponDmg(), s: stats.shield().block, bow: stats.bowDmg(), a: stats.armor() };
  Object.assign(out, { wr: +(a.w / b.w).toFixed(3), sd: +(a.s - b.s).toFixed(3), bowr: +(a.bow / b.bow).toFixed(3), ad: +(a.a - b.a).toFixed(3), baseW: ITEMS.iron_sword.dmg });
  S.upgrades = {}; recalc();
  return out;
});
check('at +10 the weapon and bow hit 65% harder', st.wr === 1.65 && st.bowr === 1.65, JSON.stringify(st));
check('at +10 the shield blocks 15 points more and armour plus helmet add 28.1 points', st.sd === 0.15 && st.ad === 0.281, JSON.stringify(st));

// buying: caps, costs, materials
const buy = await G(async () => {
  const S = window.__ff.S, { buyUpgrade } = await import('/src/data/services.js'), { recalc } = await import('/src/systems/stats.js');
  S.equip.weapon = 'iron_sword'; S.upgrades = {}; S.gold = 99999; S.inv.iron_ingot = 6; S.inv.ash_iron = 9; S.inv.ember_ore = 20; S.inv.heart_shard = 0;
  const out = {};
  out.l1 = buyUpgrade('weapon', 3) === 'ok' && S.upgrades.iron_sword === 1 && S.gold === 99999 - 50 && S.inv.iron_ingot === 5;
  out.l3 = buyUpgrade('weapon', 3) === 'ok' && buyUpgrade('weapon', 3) === 'ok' && S.upgrades.iron_sword === 3 && !S.inv.iron_ingot;
  out.villageCap = buyUpgrade('weapon', 3) === 'cap' && S.upgrades.iron_sword === 3;
  out.l6 = buyUpgrade('weapon', 6) === 'ok' && buyUpgrade('weapon', 6) === 'ok' && buyUpgrade('weapon', 6) === 'ok' && S.upgrades.iron_sword === 6 && !S.inv.ash_iron;
  out.embCap = buyUpgrade('weapon', 6) === 'cap';
  out.l8 = buyUpgrade('weapon', 10) === 'ok' && buyUpgrade('weapon', 10) === 'ok' && S.upgrades.iron_sword === 8;
  out.noShard = buyUpgrade('weapon', 10) === 'short' && S.upgrades.iron_sword === 8;
  S.inv.heart_shard = 2;
  out.l10 = buyUpgrade('weapon', 10) === 'ok' && buyUpgrade('weapon', 10) === 'ok' && S.upgrades.iron_sword === 10 && !S.inv.heart_shard && buyUpgrade('weapon', 10) === 'max';
  S.gold = 0; S.upgrades.iron_sword = 0; S.inv.iron_ingot = 5; out.poor = buyUpgrade('weapon', 3) === 'short';
  S.equip.charm = 'warm_amulet'; out.charm = buyUpgrade('charm', 3) === 'none';
  S.upgrades = {}; recalc();
  return out;
});
check('smiths: +1 costs 50 gold and 1 ingot; the village stops at +3, Emberhold at +6, the Great Anvil goes to +10', buy.l1 && buy.l3 && buy.villageCap && buy.l6 && buy.embCap && buy.l8, JSON.stringify(buy));
check('+9 and +10 need a Heart Shard each; at +10 it is done; no gold means no upgrade; charms cannot be upgraded', buy.noShard && buy.l10 && buy.poor && buy.charm, JSON.stringify(buy));

// the Great Anvil needs the Anvil Court's trust; the Emberhold smith stops at +6; old saves with +3 keep working
const gate = await G(async () => {
  const S = window.__ff.S, E = await import('/src/data/emberhold.js'), { stats, recalc } = await import('/src/systems/stats.js');
  S.equip.weapon = 'iron_sword'; S.inv.iron_sword = 1; S.upgrades = { iron_sword: 6 }; S.gold = 5000; S.inv.ember_ore = 10; S.flags.emberforged = true;
  const out = {};
  S.rep = { anvil: 0 }; out.locked = E.masterTemper('weapon') === 'locked' && S.upgrades.iron_sword === 6;
  S.rep = { anvil: 50 }; out.ok = E.masterTemper('weapon') === 'ok' && S.upgrades.iron_sword === 7;
  S.upgrades = { iron_sword: 3 }; recalc(); out.old = Math.abs(stats.weaponDmg() - 13 * 1.15) < 1e-6;
  S.upgrades = {}; recalc();
  return out;
});
check('the Great Anvil is locked until the Anvil Court trusts you, then works', gate.locked && gate.ok, JSON.stringify(gate));
check('an old +3 weapon uses the new bonus (+15%)', gate.old, JSON.stringify(gate));

// heart shard exists and the region bosses drop it
const hs = await G(async () => {
  const { ITEMS } = await import('/src/data/items.js'), PB = (await import('/src/entities/PatternBoss.js')).default;
  return { item: !!ITEMS.heart_shard && ITEMS.heart_shard.type === 'misc', drop: PB.prototype.victory.toString().includes('heart_shard') };
});
check('the Heart Shard exists and region bosses drop one', hs.item && hs.drop, JSON.stringify(hs));
check('no page errors', h.errors.length === 0, h.errors.join(' | '));
await h.close();
