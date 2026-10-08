import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=forest&spawn=west&seed=424242'); await h.sleep(1200);
const G = (fn, a) => h.ev(fn, a);
const r = await G(async () => {
  const D = await import('/src/systems/danger.js'), S = window.__ff.S, { recalc } = await import('/src/systems/stats.js'), { ENEMIES } = await import('/src/data/enemies.js');
  const out = {};
  S.equip.weapon = 'rusty_sword'; S.equip.armor = 'fur_tunic'; S.equip.offhand = null; S.skills.oneHanded.lvl = 1; recalc();
  out.wolfStart = D.dangerOf(ENEMIES.wolf.hp, ENEMIES.wolf.dmg); out.golemStart = D.dangerOf(ENEMIES.golem.hp * 1.84, ENEMIES.golem.dmg * 1.39);
  out.readyStart = D.readyTierNow();
  S.inv.nordic_blade = 1; S.equip.weapon = 'nordic_blade'; S.inv.nordic_plate = 1; S.equip.armor = 'nordic_plate'; S.skills.oneHanded.lvl = 12; S.bonusHp = 33; S.perks.keenedge = true; recalc();
  out.wolfGeared = D.dangerOf(ENEMIES.wolf.hp, ENEMIES.wolf.dmg); out.readyGeared = D.readyTierNow();
  return out;
});
check('a starter character finds a tier-3 golem far more dangerous than a wolf', r.golemStart >= 4 && r.wolfStart <= 3 && r.golemStart > r.wolfStart, JSON.stringify(r));
check('good gear makes a wolf easy and raises the tier you are ready for', r.wolfGeared <= 2 && r.readyGeared > r.readyStart, JSON.stringify(r));
// the warning fires once for a place beyond you
const w = await G(async () => {
  const D = await import('/src/systems/danger.js'), S = window.__ff.S, g = window.__ff.game.scene.getScene('Game');
  S.equip.weapon = 'rusty_sword'; S.equip.armor = 'fur_tunic'; S.skills.oneHanded.lvl = 1; delete S.flags['warned_forest_3'];
  const fake = { def: { stream: true }, built: { entities: Array.from({ length: 20 }, (_, i) => ({ t: 'enemy', x: 10 + i, y: 10, tier: 3 })) }, player: { x: 160, y: 160 }, mapId: 'forest' };
  const a = D.dangerWarning(fake), b = D.dangerWarning(fake);
  return { a, b };
});
check('arriving in a far tougher place warns once', !!w.a && w.a.includes('BEYOND') && w.b === null, JSON.stringify(w));
// the target bar colours its name
await G(() => { const g = window.__ff.game.scene.getScene('Game'); const e = g.addEnemy('golem', g.player.x + 40, g.player.y, { tier: 3 }); g.player.target = e; });
await h.sleep(500);
check('the target bar shows the danger word for deadly foes', await G(() => { const hud = window.__ff.game.scene.getScene('Hud'); return !!hud.tgtTxt && /DEADLY|HOPELESS/.test(hud.tgtTxt.text); }));
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'DANGER FAILED' : 'DANGER PASSED');
