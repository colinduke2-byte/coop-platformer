import { launch, check, failCount } from './harness.mjs';

const h = await launch();
await h.open('scene=game');
await h.sleep(600);
const G = (fn, a) => h.ev(fn, a);
const press = (c) => h.ev((c) => window.__ff.keys._press(c), c);
const rel = (c) => h.ev((c) => window.__ff.keys._release(c), c);
const tap = async (c, ms = 90) => { await press(c); await h.sleep(ms); await rel(c); await h.sleep(60); };
const st = () => G(() => { const S = window.__ff.S; return { equip: { ...S.equip }, inv: { ...S.inv }, hp: S.hp, maxHp: S.maxHp, skills: JSON.parse(JSON.stringify(S.skills)), scenes: window.__ff.game.scene.getScenes(true).map((s) => s.scene.key), modal: null }; });

// give the player some gear
await G(() => { const S = window.__ff.S; S.inv.iron_sword = 1; S.inv.warm_amulet = 1; S.inv.iron_cuirass = 1; S.hp = 40; });
await tap('KeyI');
await h.sleep(300);
let s = await st();
check('I opens the inventory menu (world frozen)', s.scenes.includes('Menu'));
await h.shot('s5_inventory');
// list sorted: weapons first (iron, rusty), bow, armors, charm, potions
const first = await G(() => { const m = window.__ff.game.scene.getScene('Menu'); return m.inventory(); });
check('inventory is sorted by type', ['iron_sword', 'rusty_sword'].includes(first[0]) && first.indexOf('hunting_bow') > 1, first.join());
// equip iron sword: cursor is on first item
const idx = first.indexOf('iron_sword');
for (let i = 0; i < idx; i++) await tap('KeyS');
await tap('KeyE');
s = await st();
check('equip iron sword', s.equip.weapon === 'iron_sword', s.equip.weapon);
await tap('KeyE');
s = await st();
check('E again unequips', s.equip.weapon === null);
await tap('KeyE');
// equip amulet -> max hp up
const idx2 = first.indexOf('warm_amulet');
await G(() => { const m = window.__ff.game.scene.getScene('Menu'); m.cursor = 0; m.scroll = 0; m.dirty = true; });
for (let i = 0; i < idx2; i++) await tap('KeyS');
await tap('KeyE');
s = await st();
check('amulet raises max HP', s.maxHp === 125 && s.equip.charm === 'warm_amulet', `maxHp=${s.maxHp}`);
// drink a health potion
const idx3 = first.indexOf('hp_potion');
await G(() => { const m = window.__ff.game.scene.getScene('Menu'); m.cursor = 0; m.scroll = 0; m.dirty = true; });
for (let i = 0; i < idx3; i++) await tap('KeyS');
await tap('KeyE');
s = await st();
check('potion from menu heals and is consumed', s.hp > 40 && s.inv.hp_potion === 1, `hp=${s.hp} potions=${s.inv.hp_potion}`);
// skills tab
await tap('KeyD');
await h.sleep(200);
await h.shot('s5_skills');
await tap('Escape');
await h.sleep(200);
s = await st();
check('Esc closes the menu', !s.scenes.includes('Menu'));

// ---- skill leveling through use
const dmgBefore = await G(() => { const g = window.__ff.game.scene.getScene('Game'); return g.player ? 1 : 0; });
await G(() => { const g = window.__ff.game.scene.getScene('Game'); g.addEnemy('draugr', g.player.x + 50, g.player.y).cfg = { ...g.enemies.getChildren()[0]?.cfg, hp: 9999 }; });
const lv0 = (await st()).skills.oneHanded.lvl;
// swing at a dummy repeatedly: each hit gives xp
await G(() => {
  const g = window.__ff.game.scene.getScene('Game'); const e = g.enemies.getChildren()[0]; e.hp = e.maxHp = 9999; e.cfg = { ...e.cfg, detect: 0, speed: 0 };
  window.__ff.S.equip.weapon = 'steel_sword'; window.__ff.S.inv.steel_sword = 1;
});
for (let i = 0; i < 12; i++) {
  await G(() => { const g = window.__ff.game.scene.getScene('Game'); const e = g.enemies.getChildren()[0]; g.player.setPosition(e.x - 13, e.y); g.player.face = { x: 1, y: 0 }; g.player.invuln = 9; g.player.lockT = 0; window.__ff.S.sp = 100; });
  await tap('KeyJ', 60); await h.sleep(330);
}
await G(() => { window.__ff.S.skills.oneHanded.xp = 36; });   // level 1 needs 37 xp: cross it with one last swing
await G(() => { const g = window.__ff.game.scene.getScene('Game'); const e = g.enemies.getChildren()[0]; g.player.setPosition(e.x - 13, e.y); g.player.face = { x: 1, y: 0 }; g.player.lockT = 0; window.__ff.S.sp = 100; });
await tap('KeyJ', 60); await h.sleep(330);
s = await st();
check('one-handed levels up from use', s.skills.oneHanded.lvl > lv0, `${lv0}->${s.skills.oneHanded.lvl}`);
await h.sleep(300);
await h.shot('s5_levelup');
const banner = await G(() => !!window.__ff.game.scene.getScene('Hud').bannerObj);
check('level-up popup shown', banner);
const mult = await G(async () => (await import('/src/systems/skills.js')).bonus.melee());
check('level grants a damage bonus', mult > 1, `x${mult}`);
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'STAGE 5 FAILED' : 'STAGE 5 PASSED');
process.exit(failCount() ? 1 : 0);
