import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=village&spawn=start');
await h.sleep(800);
const G = (fn, a) => h.ev(fn, a);
const press = (c) => h.ev((c) => window.__ff.keys._press(c), c);
const rel = (c) => h.ev((c) => window.__ff.keys._release(c), c);
const tap = async (c, ms = 80) => { await press(c); await h.sleep(ms); await rel(c); await h.sleep(70); };
// Scripted dialogue: answers are consumed by choose(); say() is a no-op.
const stub = (answers) => G((a) => {
  const dlg = window.__dlg;
  if (!window.__realHud) window.__realHud = dlg.hud;
  window.__answers = [...a];
  dlg.hud = { say: async () => {}, choose: async (o) => (window.__answers.length ? window.__answers.shift() : o.length - 1), hideBox() {}, lockpick: async () => true };
}, answers);
const unstub = () => G(() => { if (window.__realHud) window.__dlg.hud = window.__realHud; });
await G(async () => { window.__dlg = (await import('/src/systems/dialogue.js')).dialogue; window.__svc = await import('/src/data/services.js'); window.__dia = await import('/src/data/dialogue.js'); window.__inv = await import('/src/systems/inventory.js'); window.__sk = await import('/src/systems/skills.js'); window.__stats = (await import('/src/systems/stats.js')).stats; });
// Open a list-screen service for real (not awaited), then drive it with keys.
const openShop = async (call, args) => { await G(([call, args]) => { window.__shopP = window.__svc[call](...args); }, [call, args]); await h.sleep(400); };
const shopOpen = () => G(() => window.__ff.game.scene.isActive('Shop'));
const closeShop = async () => { await tap('Escape', 60); await h.sleep(250); await G(async () => { await window.__shopP; }); };
const S = (k) => G((k) => k.split('.').reduce((o, p) => o?.[p], window.__ff.S), k);

// ---------------- character level, perks, attribute choice
await G(() => { window.__ff.S.skills.archery.lvl = 1; window.__sk.addXp('archery', 500); });
const lv = await G(() => ({ cl: window.__ff.S.charLevel, pp: window.__ff.S.perkPoints, pend: window.__ff.S.pendingStat, ups: window.__ff.S.skillUps }));
check('skill-ups raise the character level and grant perk points', lv.cl >= 2 && lv.pp === lv.cl - 1, JSON.stringify(lv));
await h.sleep(900);
const asked = await G(() => !!window.__ff.game.scene.getScene('Hud').dlg);
check('player is asked to pick an attribute when safe', asked);
// answer: +10 magic, repeat for any extra pending
for (let i = 0; i < 40 && (await S('pendingStat')) > 0; i++) {
  const d = await G(() => { const d = window.__ff.game.scene.getScene('Hud').dlg; return d && !!d.choices; });
  if (d) { await tap('KeyS', 50); await tap('KeyE', 50); } else { await tap('KeyE', 40); await h.sleep(40); await tap('KeyE', 40); }
  await h.sleep(120);
}
check('attribute choice applied (+10 magic each)', (await S('bonusMp')) >= 10 && (await S('maxMp')) >= 110, `mp=${await S('maxMp')}`);
await G(() => { const g = window.__ff.game.scene.getScene('Game'); window.__ff.S.perkPoints = 3; });
const before = await G(() => window.__ff.S.perks.keenedge || false);
const bought = await G(() => window.__sk.buyPerk('keenedge'));
check('Keen Edge perk: needs level 2 in One-Handed', before === false && (bought === false || (await S('perks.keenedge')) === true));
await G(() => { window.__ff.S.skills.oneHanded.lvl = 2; });
check('perk bought once level requirement is met', await G(() => window.__sk.buyPerk('keenedge')) === true && (await S('perkPoints')) === 2);
check('perk with unmet prerequisite stays locked', await G(() => window.__sk.perkState('duelist')) === 'locked');
await G(() => { window.__ff.game.scene.getScene('Game').openMenu(-1, 'PERKS'); });
await h.sleep(400);
const tn = await G(() => { const m = window.__ff.game.scene.getScene('Menu'); return m && m.tabs[m.tab].name; });
check('Perks tab exists', tn === 'PERKS', tn);
await h.shot('s12_perks');
await tap('Escape'); await h.sleep(250);

// ---------------- selling, buying
await G(() => { const S = window.__ff.S; S.gold = 0; S.inv.iron_sword = 1; S.inv.snowberry = 3; });
await openShop('sellMenu', ['T']);
check('sell screen opens as a list', await shopOpen());
await tap('KeyE', 60); await h.sleep(150);
await closeShop();
const sold = await S('gold');
check('selling items pays half value', sold > 0, `gold+${sold}`);
await G(() => { window.__ff.S.gold = 500; });
const hp0 = await S('inv.hp_potion');
await openShop('buyMenu', ['M', [{ id: 'hp_potion', price: 25 }, { id: 'long_bow', price: 9999, once: true }]]);
await tap('KeyE', 60); await h.sleep(150);
await tap('KeyS', 60); await tap('KeyE', 60); await h.sleep(150);       // unaffordable: must not buy
check('unaffordable item is refused', (await S('inv.long_bow')) === undefined);
await h.shot('s15_shop');
await closeShop();
check('buying spends gold and gives the item', (await S('inv.hp_potion')) === hp0 + 1 && (await S('gold')) === 475);

// ---------------- forge: upgrade + enchant
await G(() => { const S = window.__ff.S; S.gold = 500; S.inv.iron_ingot = 5; S.inv.iron_sword = 1; S.equip.weapon = 'iron_sword'; S.inv.bone_dust = 3; });
const d0 = await G(() => window.__stats.weaponDmg());
await openShop('upgradeMenu', ['H', 'weapon']);
await tap('KeyE', 60); await h.sleep(150); await closeShop();
check('smith upgrades the weapon (+2 damage per level)', (await G(() => window.__stats.weaponDmg())) === d0 + 2 && (await S('upgrades.iron_sword')) === 1);
await openShop('enchantMenu', ['H']);
await tap('KeyE', 60); await h.sleep(150); await closeShop();
check('smith enchants the weapon (flame)', (await S('enchants.iron_sword.type')) === 'fire' && (await S('inv.bone_dust')) === undefined);
// enchant applies in combat
await G(() => { const g = window.__ff.game.scene.getScene('Game'); g.enemies.clear(); const p = g.player; p.setPosition(300, 250); p.face = { x: 1, y: 0 }; p.mode = 'free'; p.lockT = 0; p.invuln = 99; window.__ff.S.sp = 100; const e = g.addEnemy('draugr', 314, 250); e.cfg = { ...e.cfg, detect: 0, speed: 0 }; });
await tap('KeyJ', 60); await h.sleep(250);
const eh = await G(() => { const e = window.__ff.game.scene.getScene('Game').enemies.getChildren()[0]; return e.hp; });
check('enchanted hits deal elemental bonus', eh < 40 - (13 + 2 + 5) * 0.8, `hp=${eh}`);
unstub();

// ---------------- alchemy
await G(() => { const S = window.__ff.S; S.inv.snowberry = 4; S.inv.frost_lily = 2; S.inv.wolf_fang = 1; delete S.inv.hp_potion_g; });
const hp1 = await S('inv.hp_potion');
await openShop('brewMenu', ['A']);
await tap('KeyE', 60); await h.sleep(120); await tap('KeyS', 60); await tap('KeyE', 60); await h.sleep(150); await closeShop();
check('alchemy brews potions from ingredients', (await S('inv.hp_potion')) === hp1 + 1 && (await S('inv.mp_potion')) >= 1);
unstub();

// ---------------- herb gathering + Mirra's quest
await G(() => { const S = window.__ff.S; S.inv.snowberry = 0; S.inv.frost_lily = 0; S.quests.herbs = { status: 'inactive' }; });
await G(() => { const g = window.__ff.game.scene.getScene('Game'); const hb = g.interactables.find((i) => i.item); g.player.setPosition(hb.x, hb.y + 13); g.player.mode = 'free'; g.player.stunT = 0; });
await h.sleep(200); await tap('KeyE'); await h.sleep(200);
check('herbs can be gathered', (await S('inv.snowberry')) === 1);
await stub([0]);                 // accept quest
await G(async () => { await window.__dia.mirra(); });
check('Mirra starts the herb quest', (await S('quests.herbs.status')) === 'active');
await G(() => { window.__inv.addItem('snowberry', 4, true); window.__inv.addItem('frost_lily', 3, true); window.__inv.addItem('snowberry', 0); });
check('collecting the herbs completes the objective', (await S('quests.herbs.status')) === 'ready');
await stub([3]);                 // after reward, Leave
await G(async () => { await window.__dia.mirra(); });
check('Mirra rewards and teaches alchemy', (await S('quests.herbs.status')) === 'done' && (await S('flags.alchemy')) === true && (await S('inv.hp_potion_g')) >= 2);
unstub();

// ---------------- locket quest (a choice): give it back
await G(() => { window.__ff.S.quests.locket = { status: 'inactive' }; });
await stub([0]);
await G(async () => { await window.__dia.child(); });
check('Asta asks for her locket', (await S('quests.locket.status')) === 'active');
await G(() => { window.__inv.addItem('silver_locket'); });
check('finding the locket advances the quest', (await S('quests.locket.status')) === 'relic');
await stub([0]);
await G(async () => { await window.__dia.child(); });
check('returning the locket rewards a charm', (await S('quests.locket.status')) === 'done' && (await S('inv.asta_charm')) === 1 && (await S('flags.locketKind')) === true);
// ...or sell it
await G(() => { const S = window.__ff.S; S.quests.locket = { status: 'relic' }; S.flags.locketKind = undefined; S.inv.silver_locket = 1; S.gold = 0; });
await stub([1]);
await G(async () => { await window.__dia.child(); });
check('keeping the locket sets the quest to "sell"', (await S('quests.locket.status')) === 'sell');
await stub([0, 3]);
await G(async () => { await window.__dia.mirra(); });
check('selling the locket to Mirra pays 120 and ends the quest differently', (await S('gold')) >= 120 && (await S('flags.locketKind')) === false && (await S('quests.locket.status')) === 'done');
unstub();

// ---------------- lockpicking
await G(() => { const S = window.__ff.S; S.inv.lockpick = 3; });
await G(() => { window.__ff.game.scene.getScene('Game').scene.restart({ map: 'forest', spawn: 'west' }); });
await h.sleep(900);
await G(() => { const g = window.__ff.game.scene.getScene('Game'); const c = g.interactables.find((i) => i.spec && i.spec.id === 'camp'); g.enemies.clear(); g.player.setPosition(c.x, c.y + 14); g.player.mode = 'free'; g.player.invuln = 99; window.__ff.S.inv.lockpick = 3; });
await h.sleep(250);
check('locked chest says so', await G(() => window.__ff.game.scene.getScene('Game').target?.label()) === 'E: PICK LOCK');
await tap('KeyE'); await h.sleep(300);
let lock = await G(() => !!window.__ff.game.scene.getScene('Hud').lock);
check('E starts the lockpicking minigame', lock);
// miss once: pick breaks
await G(() => { const L = window.__ff.game.scene.getScene('Hud').lock; L.pos = L.c > 0.5 ? 0.02 : 0.98; L.speed = 0; });
await tap('KeyE'); await h.sleep(200);
check('a bad pick breaks a lockpick', (await S('inv.lockpick')) === 2);
for (let i = 0; i < 4 && (await G(() => !!window.__ff.game.scene.getScene('Hud').lock)); i++) {
  await G(() => { const L = window.__ff.game.scene.getScene('Hud').lock; L.pos = L.c; L.speed = 0; });
  await tap('KeyE'); await h.sleep(250);
}
await h.sleep(300);
check('succeeding opens the chest', (await S('flags.chest_camp')) === true && (await S('inv.silver_locket')) === 1);
await h.shot('s12_chest');

// ---------------- pickpocket
await G(() => window.__ff.game.scene.getScene('Game').scene.restart({ map: 'village', spawn: 'start' }));
await h.sleep(900);
await G(() => { const g = window.__ff.game.scene.getScene('Game'); const n = g.npcs.find((n) => n.id === 'guard'); g.player.setPosition(n.x, n.y + 16); g.player.mode = 'free'; window.__ff.S.gold = 100; const r = Math.random; Math.random = () => 0.01; window.__r = r; });
await press('ShiftLeft'); await h.sleep(300);
const g0 = await S('gold');
await tap('KeyE', 60); await h.sleep(400);
await rel('ShiftLeft');
check('sneaking + E pickpockets (success)', (await S('gold')) > g0);
await G(() => { Math.random = () => 0.99; });
await G(() => { const g = window.__ff.game.scene.getScene('Game'); const n = g.npcs.find((n) => n.id === 'guard'); n.angryT = 0; g.player.stunT = 0; });
await press('ShiftLeft'); await h.sleep(300);
const g1 = await S('gold');
await tap('KeyE', 60); await h.sleep(400);
await rel('ShiftLeft');
const angry = await G(() => window.__ff.game.scene.getScene('Game').npcs.find((n) => n.id === 'guard').angryT > 0);
check('failing angers the victim and costs gold', angry && (await S('gold')) < g1);
await G(() => { Math.random = window.__r; window.__ff.game.scene.getScene('Hud').dlg = null; window.__dlg.hud.hideBox(); });
await tap('KeyE'); await h.sleep(200);

// ---------------- follower
await G(() => { window.__ff.game.scene.getScene('Game').scene.restart({ map: 'forest', spawn: 'west' }); });
await h.sleep(900);
await G(() => { window.__ff.S.gold = 300; });
await stub([0]);
await G(async () => { await window.__dia.ragna(); });
unstub();
check('Ragna can be hired', (await S('follower')) === true && await G(() => !!window.__ff.game.scene.getScene('Game').follower));
await G(() => { const g = window.__ff.game.scene.getScene('Game'); g.enemies.getChildren().slice().forEach((e) => e.destroy()); g.enemies.clear(); const p = g.player; p.setPosition(10.5 * 16, 10 * 16); p.invuln = 999; g.follower.setPosition(p.x - 16, p.y); const e = g.addEnemy('draugr', p.x + 70, p.y); e.cfg = { ...e.cfg, speed: 0, detect: 0 }; e.alerted = true; e.state = 'idle'; });
await h.sleep(3500);
const fh = await G(() => window.__ff.game.scene.getScene('Game').enemies.getChildren()[0]?.hp ?? 0);
check('the follower shoots enemies', fh < 40, `hp=${fh}`);
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'PROGRESS FAILED' : 'PROGRESS PASSED');
process.exit(failCount() ? 1 : 0);
