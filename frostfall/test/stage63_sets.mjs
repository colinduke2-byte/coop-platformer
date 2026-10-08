import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=forest&spawn=west&seed=424242'); await h.sleep(1500);
const G = (fn, a) => h.ev(fn, a);
await G(() => { window.__ff.S.flags.introDone = true; });
const r = await G(async () => {
  const S = window.__ff.S, E = await import('/src/data/emberhold.js'), St = await import('/src/systems/stats.js'), Se = await import('/src/systems/sets.js'), { ITEMS } = await import('/src/data/items.js');
  const out = {};
  // set pieces count and bonuses
  S.equip.armor = 'court_plate'; S.equip.weapon = 'court_hammer'; S.equip.charm = null;
  const a2 = St.stats.armor(); out.two = Se.wornSets().court === 2;
  S.equip.charm = 'court_signet'; const a3 = St.stats.armor(); out.three = Se.wornSets().court === 3 && a3 > a2 && St.stats.sum('goldMul') > 0.1;
  St.recalc(); out.hp = S.maxHp >= 100 + 15 + 10 + 20;
  S.equip.charm = null; S.equip.weapon = 'iron_sword'; St.recalc(); out.lost = Se.wornSets().court === 1 && Se.setBonus('armor') === 0;
  out.items = Object.values(Se.SETS).every((s) => s.items.every((i) => ITEMS[i]));
  // armoury gating by reputation
  S.rep = { anvil: 0, delvers: 0, wardens: 0 }; S.gold = 5000;
  out.locked = E.buyArmoury('court_plate') === 'locked';
  S.rep.anvil = 50; out.bought = E.buyArmoury('court_plate') === 'ok' && S.gold === 4300;
  out.stillLockedTop = E.buyArmoury('court_signet') === 'locked';
  // master temper
  S.flags.emberforged = true; S.equip.weapon = 'iron_sword'; S.upgrades.iron_sword = 2; out.early = E.masterTemper('weapon') === 'early';
  S.upgrades.iron_sword = 3; S.inv.ember_ore = 0; out.short = E.masterTemper('weapon') === 'short';
  S.inv.ember_ore = 10; const d0 = St.stats.weaponDmg(); out.t4 = E.masterTemper('weapon') === 'ok' && S.upgrades.iron_sword === 4 && St.stats.weaponDmg() > d0;
  out.t5 = E.masterTemper('weapon') === 'ok' && S.upgrades.iron_sword === 5 && E.masterTemper('weapon') === 'max';
  return out;
});
check('sets, faction armoury and master tempering work', Object.values(r).every(Boolean), JSON.stringify(r));
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'SETS FAILED' : 'SETS PASSED');
process.exit(failCount() ? 1 : 0);
