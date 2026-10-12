// Armour classes and carry weight: class effects on speed / detection / spell cost, helmets at half strength, item weights, capacity and burden levels.
import { launch, check } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=424242');
await h.sleep(900);
const G = (fn, a) => h.ev(fn, a);
await G(() => { window.__ff.S.flags.introDone = true; });

const r = await G(async () => {
  const S = window.__ff.S, B = await import('/src/systems/burden.js'), { stats, recalc } = await import('/src/systems/stats.js');
  const { ITEMS } = await import('/src/data/items.js');
  const wear = (armor, head) => { S.inv = { ...S.inv }; if (armor) S.inv[armor] = 1; if (head) S.inv[head] = 1; S.equip.armor = armor || null; S.equip.head = head || null; recalc(); };
  const out = {};
  wear(null, null); out.baseMove = stats.trait('moveMul'); out.baseDetect = stats.trait('detectMul');
  wear('nordic_plate'); const heavy = B.classMix(); out.heavy = heavy;
  wear('fur_tunic'); const light = B.classMix(); out.light = light;
  wear('iron_cuirass'); out.medium = B.classMix();
  wear('fur_tunic', 'nordic_helm'); out.lightMedHelm = B.classMix();
  wear('fur_tunic', 'leather_cap'); out.lightLightHelm = B.classMix();
  const heavyHelm = Object.keys(ITEMS).find((k) => ITEMS[k].type === 'helmet' && ITEMS[k].weight === 'heavy');
  wear('fur_tunic', heavyHelm); out.lightHeavyHelm = B.classMix(); out.heavyHelmId = heavyHelm;
  wear('nordic_plate'); out.heavyMoveTrait = stats.trait('moveMul'); out.heavyDetectTrait = stats.trait('detectMul');
  // weights
  out.w = { potion: B.itemWeight('hp_potion'), quest: Object.keys(ITEMS).filter((k) => ITEMS[k].type === 'quest').every((k) => B.itemWeight(k) === 0), heavyArmor: B.itemWeight('nordic_plate'), lightArmor: B.itemWeight('fur_tunic') };
  // capacity and levels
  S.inv = { hp_potion: 2 }; S.equip = {}; S.arrows = 0; S.maxSp = 100; S.mounted = false; recalc();
  out.cap0 = B.capacity(); out.lvl0 = B.level(); out.mm0 = B.moveMul();
  S.inv = { iron_sword: 1 }; S.equip = {}; S.inv.iron_sword = 1;
  const itemW = B.itemWeight('iron_sword');
  S.inv = { iron_sword: Math.ceil(out.cap0 / itemW) + 1 }; out.lvl1 = B.level(); out.mm1 = B.moveMul(); out.roll1 = B.canRoll();
  S.inv = { iron_sword: Math.ceil(out.cap0 * 1.4 / itemW) }; out.lvl2 = B.level(); out.mm2 = B.moveMul(); out.roll2 = B.canRoll();
  S.inv = { iron_sword: 1 }; S.equip.weapon = 'iron_sword'; out.equippedHalf = B.carried() === itemW * 0.5;
  S.inv = {}; S.equip = {}; S.mounted = true; out.capPony = B.capacity(); S.mounted = false;
  S.maxSp = 140; out.capSp = B.capacity(); S.maxSp = 100;
  S.equip = { armor: 'nordic_plate' }; S.inv = { nordic_plate: 1 }; out.capHeavy = B.capacity();
  S.equip = { armor: 'fur_tunic' }; S.inv = { fur_tunic: 1 }; out.capLight = B.capacity();
  S.arrows = 100; S.inv = {}; S.equip = {}; out.arrows = B.carried();
  return out;
});
const near = (a, b) => Math.abs(a - b) < 0.001;
check('heavy armour is slower, louder, harder to knock back and costs more stamina to roll; light is the opposite', r.heavy.move < 1 && r.heavy.detect > 1 && r.heavy.knock < 1 && r.heavy.roll > 1 && r.heavy.sp < 1 && r.light.move > 1 && r.light.detect < 1 && r.light.knock > 1 && r.light.roll < 1 && r.light.sp > 1 && r.medium.move === 1, JSON.stringify([r.heavy, r.light]));
check('a helmet adds half of its own class to the body armour', near(r.lightMedHelm.move, r.light.move) && near(r.lightHeavyHelm.move, r.light.move * (1 + (0.92 - 1) * 0.5)) && r.lightLightHelm.move > r.light.move, JSON.stringify([r.lightHeavyHelm, r.light]));
check('class effects reach the real stats (move, detect)', r.heavyMoveTrait < r.baseMove && r.heavyDetectTrait > r.baseDetect, JSON.stringify([r.heavyMoveTrait, r.baseMove]));
check('weights: potions are light, quest items weigh nothing, heavy armour outweighs light', r.w.potion <= 0.5 && r.w.quest && r.w.heavyArmor > r.w.lightArmor, JSON.stringify(r.w));
check('capacity: base 120, more with stamina and the pony, heavy armour +, light -', r.cap0 === 120 && r.capSp > r.cap0 && r.capPony > r.cap0 && r.capHeavy > r.cap0 && r.capLight < r.cap0, JSON.stringify(r));
check('burden levels: light load is fine, over capacity burdened (slower), far over overloaded (slower still, no rolling)', r.lvl0 === 'ok' && r.mm0 === 1 && r.lvl1 === 'burdened' && r.mm1 < 1 && r.roll1 && r.lvl2 === 'over' && r.mm2 < r.mm1 && !r.roll2, JSON.stringify(r));
check('equipped gear counts at half weight; arrows are nearly weightless', r.equippedHalf && r.arrows <= 6, JSON.stringify([r.equippedHalf, r.arrows]));

check('no page errors', h.errors.length === 0, h.errors.join(' | '));
await h.close();
