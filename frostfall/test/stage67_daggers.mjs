// Daggers: twelve distinct blades, the sneak and back-hit rules, status on hit, and where each one is found.
import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game');
await h.sleep(700);
const G = (fn, a) => h.ev(fn, a);
const press = (c) => G((c) => window.__ff.keys._press(c), c);
const rel = (c) => G((c) => window.__ff.keys._release(c), c);
const tap = async (c, ms = 60) => { await press(c); await h.sleep(ms); await rel(c); };
await G(() => window.__ff.game.scene.getScene('Game').addEnemy('draugr', 380, 250));

const IDS = ['hunting_knife', 'skinning_knife', 'bone_shiv', 'grimfang_bite', 'reed_stiletto', 'clan_dirk', 'smuggler_knife', 'glass_dagger', 'tide_kris', 'court_misericorde', 'ember_dagger', 'nightshade'];
// ---- the items and their art
const info = await G(async (ids) => {
  const { ITEMS, iconKey } = await import('/src/data/items.js');
  const sc = window.__ff.game.scene.getScene('Game');
  const sig = (key) => { const t = sc.textures.get(key), img = t.getSourceImage(), c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); return Array.from(x.getImageData(0, 0, c.width, c.height).data).join(',').length + ':' + Array.from(x.getImageData(0, 0, c.width, c.height).data).reduce((a, v, i) => (a * 31 + v + i) >>> 0, 7); };
  return ids.map((id) => ({ id, style: ITEMS[id]?.style, dmg: ITEMS[id]?.dmg, icon: sc.textures.exists(iconKey(id)) && sig(iconKey(id)), held: sc.textures.exists('held_' + id) && sig('held_' + id), kind: ITEMS[id]?.icon?.[0] }));
}, IDS);
check('all 12 daggers exist with style dagger', info.every((i) => i.style === 'dagger' && i.dmg > 0), JSON.stringify(info.filter((i) => i.style !== 'dagger')));
check('each has an icon and a held sprite', info.every((i) => i.icon && i.held));
check('every dagger looks different (icon and held sprite)', new Set(info.map((i) => i.icon)).size === 12 && new Set(info.map((i) => i.held)).size === 12);
check('at least ten different blade shapes', new Set(info.map((i) => i.kind)).size >= 10, [...new Set(info.map((i) => i.kind))].join());
check('damage climbs through the ladder', info.find((i) => i.id === 'nightshade').dmg > info.find((i) => i.id === 'court_misericorde').dmg && info.find((i) => i.id === 'court_misericorde').dmg > info.find((i) => i.id === 'clan_dirk').dmg && info.find((i) => i.id === 'clan_dirk').dmg > info.find((i) => i.id === 'hunting_knife').dmg);

// ---- where they are found
const where = await G(async () => {
  const { POOLS } = await import('/src/data/stock.js');
  const { EMBERFORGE } = await import('/src/data/emberhold.js');
  const { ENEMIES } = await import('/src/data/enemies.js');
  const mg = await import('/src/world/minesgen.js');
  const dump = (fn) => { try { return JSON.stringify(fn(7)); } catch (e) { return 'ERR ' + e.message; } };
  const drops = (k) => JSON.stringify(ENEMIES[k].loot.drops);
  return {
    hilda: POOLS.Hilda.some((r) => r[0] === 'skinning_knife'), forge: EMBERFORGE.some((r) => r.id === 'ember_dagger'),
    grim: drops('grimfang').includes('grimfang_bite'), shiv: drops('warden').includes('bone_shiv'),
    tide: dump(mg.buildTidebreak).includes('tide_kris'), seph: dump(mg.buildSepulchre).includes('court_misericorde'), mire: dump(mg.buildMireBarrow).includes('reed_stiletto'),
    storm: dump(mg.buildStormspire).includes('clan_dirk'), hart: dump(mg.buildHartSpire).includes('glass_dagger'), lode: dump(mg.buildLodeNest).includes('nightshade'),
  };
});
console.log('where', JSON.stringify(where));
check('Hilda sells the Skinning Knife', where.hilda);
check('the Emberforge makes the Emberforged Dagger', where.forge);
check('Grimfang drops Grimfang\'s Bite; wardens drop Bone Shivs', where.grim && where.shiv);
check('boss chests hold the regional daggers (Tidebreak, Sepulchre, Mire, Stormspire, Hart Spire, Lode Chasm)', where.tide && where.seph && where.mire && where.storm && where.hart && where.lode, JSON.stringify(where));

// ---- combat rules
const snap = () => G(() => { const g = window.__ff.game.scene.getScene('Game'); const e = g.enemies.getChildren()[0]; if (!e) return { hp: 0, max: 0, dead: true, st: [] }; return { hp: e.hp, max: e.maxHp, dead: e.dead, st: Object.keys(e.statuses || {}) }; });
const setup = (weapon, face = { x: 1, y: 0 }) => G(([w, f]) => {
  const g = window.__ff.game.scene.getScene('Game'), S = window.__ff.S;
  if (!g.enemies.getChildren()[0]) g.addEnemy('draugr', 380, 250);
  const e = g.enemies.getChildren()[0];
  S.inv[w] = 1; S.equip.weapon = w; S.hp = 100; S.mp = 100; S.sp = 100;
  g.player.setPosition(300, 250); g.player.face = { x: 1, y: 0 }; g.player.mode = 'free'; g.player.invuln = 99; g.player.comboT = 0; g.player.swing = null;
  e.setPosition(314, 250); e.home = { x: 314, y: 250 }; e.hp = e.maxHp = 400; e.cfg = { ...e.cfg, detect: 0, speed: 0 }; e.alerted = false; e.state = 'idle'; e.slowT = 0; e.stun = 0; e.statuses = {}; e.face = { ...f }; e.dead = false;
}, [weapon, face]);
const stab = async (sneak) => { if (sneak) { await press('ShiftLeft'); await h.sleep(120); } await tap('KeyJ', 60); await h.sleep(260); if (sneak) await rel('ShiftLeft'); };
// median of a few swings; the first swing after a weapon change is thrown away (it can land twice)
const avgHit = async (weapon, face, sneak, n = 5) => { const v = []; for (let i = 0; i < n + 1; i++) { await setup(weapon, face); await stab(sneak); const s = await snap(); if (i) v.push(s.max - s.hp); await h.sleep(150); } v.sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; };

const back = await avgHit('skinning_knife', { x: 1, y: 0 }, false);       // enemy faces away from the player (player is to its left)
const front = await avgHit('skinning_knife', { x: -1, y: 0 }, false);
console.log('back/front', back, front);
check('a dagger in the back hits ~1.4x harder than from the front', back > front * 1.2, `${back} vs ${front}`);
const sneakD = await avgHit('skinning_knife', { x: -1, y: 0 }, true);
check('a dagger sneak attack beats the 3x sneak multiplier (it adds +1.0x)', sneakD > 10 * 0.7 * 3.05 * 1.12, `${sneakD}`);
await setup('nightshade', { x: -1, y: 0 }); await stab(true);
let s = await snap();
check('Nightshade kills a non-boss outright from a sneak attack', s.dead || s.hp <= 0, JSON.stringify(s));
await setup('bone_shiv', { x: -1, y: 0 }); await stab(false);
s = await snap();
check('Bone Shiv makes the target bleed', s.st.includes('bleed'), JSON.stringify(s));
await setup('reed_stiletto', { x: -1, y: 0 }); await stab(true);
s = await snap();
check('Reedwick Stiletto poisons on a sneak attack', s.st.includes('poison'), JSON.stringify(s));
const tune = await G(async () => { const { TUNE } = await import('/src/data/tuning.js'); const { ITEMS } = await import('/src/data/items.js'); return { fourth: TUNE.player.styles.dagger[3].pierce, mis: ITEMS.court_misericorde.pierce, sb: TUNE.player.dagger.sneakBonus }; });
check('the dagger finisher pierces armour (and the Misericorde pierces more)', tune.fourth > 0.18 && tune.mis > tune.fourth, JSON.stringify(tune));
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
process.exit(failCount() ? 1 : 0);
