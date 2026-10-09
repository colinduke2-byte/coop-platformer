// Staves and halberds: distinct models, the spell and sweep rules, and where each one is found.
import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game');
await h.sleep(700);
const G = (fn, a) => h.ev(fn, a);
await G(() => window.__ff.game.scene.getScene('Game').addEnemy('draugr', 380, 250));
const STAVES = ['walking_staff', 'hazel_staff', 'frostbirch_staff', 'reed_staff', 'stormcrown_rod', 'prism_staff', 'cinder_staff', 'tidecaller_staff', 'sovereign_scepter', 'delver_lodestaff', 'winter_staff', 'ember_staff'];
const HALBERDS = ['woodsmans_bill', 'iron_halberd', 'warden_glaive', 'clan_glaive', 'ironwatch_bardiche', 'harbour_glaive', 'glass_voulge', 'court_halberd', 'ember_halberd', 'lode_glaive', 'reaper_halberd'];

const info = await G(async (ids) => {
  const { ITEMS, iconKey } = await import('/src/data/items.js');
  const sc = window.__ff.game.scene.getScene('Game');
  const sig = (key) => { const img = sc.textures.get(key).getSourceImage(), c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; let a = 7; for (let i = 0; i < d.length; i++) a = (a * 31 + d[i] + i) >>> 0; return a; };
  return ids.map((id) => ({ id, style: ITEMS[id]?.style, type: ITEMS[id]?.type, dmg: ITEMS[id]?.dmg, icon: sc.textures.exists(iconKey(id)) && sig(iconKey(id)), held: sc.textures.exists('held_' + id) && sig('held_' + id), kind: ITEMS[id]?.icon?.[0] }));
}, [...STAVES, ...HALBERDS]);
const st = info.filter((i) => STAVES.includes(i.id)), hb = info.filter((i) => HALBERDS.includes(i.id));
check('12 staves exist as one-handed staff weapons with art', st.every((i) => i.style === 'staff' && i.type === 'weapon' && i.icon && i.held), JSON.stringify(st.filter((i) => i.style !== 'staff' || !i.icon)));
check('11 halberds exist as two-handed halberds with art', hb.every((i) => i.style === 'halberd' && i.type === 'weapon2h' && i.icon && i.held), JSON.stringify(hb.filter((i) => i.style !== 'halberd' || !i.icon)));
check('every staff and halberd looks different', new Set(st.map((i) => i.held)).size === 12 && new Set(hb.map((i) => i.held)).size === 11 && new Set(st.map((i) => i.icon)).size === 12 && new Set(hb.map((i) => i.icon)).size === 11);
check('each staff and halberd has its own head shape (11 shapes each, one shared)', new Set(st.map((i) => i.kind)).size === 12 && new Set(hb.map((i) => i.kind)).size === 11);
check('halberd damage climbs from the Bill to the Reaper', hb.every((i, k) => k === 0 || i.dmg >= hb[k - 1].dmg), hb.map((i) => i.dmg).join());

const where = await G(async () => {
  const { POOLS } = await import('/src/data/stock.js');
  const { EMBERFORGE, ARMOURY } = await import('/src/data/emberhold.js');
  const { ENEMIES } = await import('/src/data/enemies.js');
  const mg = await import('/src/world/minesgen.js');
  const drops = (k) => JSON.stringify(ENEMIES[k].loot.drops);
  const dump = (fn) => JSON.stringify(fn(7));
  return {
    mirra: POOLS.Mirra.some((r) => r[0] === 'hazel_staff') && POOLS.Mirra.some((r) => r[0] === 'walking_staff'),
    hilda: POOLS.Hilda.some((r) => r[0] === 'woodsmans_bill') && POOLS.Hilda.some((r) => r[0] === 'iron_halberd'),
    forge: EMBERFORGE.some((r) => r.id === 'ember_staff') && EMBERFORGE.some((r) => r.id === 'ember_halberd'),
    armoury: ARMOURY.some((r) => r.id === 'tidecaller_staff'),
    drops: drops('wyrm').includes('frostbirch_staff') && drops('boghag').includes('reed_staff') && drops('nomadshaman').includes('stormcrown_rod') && drops('glimmerkin').includes('prism_staff') && drops('conjurer').includes('cinder_staff') && drops('lodecolossus').includes('delver_lodestaff') && drops('winter').includes('winter_staff') && drops('winter').includes('reaper_halberd'),
    hdrops: drops('warden').includes('warden_glaive') && drops('nomad').includes('clan_glaive') && drops('warlord').includes('ironwatch_bardiche') && drops('crystalgolem').includes('glass_voulge') && drops('sentinel').includes('court_halberd'),
    chests: dump(mg.buildForge).includes('sovereign_scepter') && dump(mg.buildLodeNest).includes('lode_glaive') && dump(mg.buildSmugglerCove).includes('harbour_glaive'),
  };
});
check('Mirra sells staves; Hilda sells halberds', where.mirra && where.hilda, JSON.stringify(where));
check('the Emberforge makes the staff and halberd; the Tide Guild armoury sells the Tidecaller\'s Staff', where.forge && where.armoury);
check('enemy drops: staves (Wyrm, Bog Hag, Shaman, Glimmerkin, Conjurer, Colossus, Long Winter)', where.drops);
check('enemy drops: halberds (Warden, Clan Raider, Hrolf, Crystal Golem, Sentinel, Long Winter)', where.hdrops);
check('boss chests: Sovereign (scepter), Lode Chasm (glaive), Seaweed Cove (harbour glaive)', where.chests);

// ---- staves
const eq = (id) => G((id) => { const S = window.__ff.S; S.inv[id] = 1; S.equip.weapon = id; S.hp = S.maxHp; S.mp = 100; S.sp = 100; S.tomes = { ...(S.tomes || {}), ward: true }; }, id);
const num = (fn, a) => G(fn, a);
await eq('walking_staff');
const base = await num(() => window.__ff.game.scene.getScene('Game').player.spellPow());
await eq('hazel_staff'); const hz = await num(() => window.__ff.game.scene.getScene('Game').player.spellPow());
await eq('winter_staff'); const wn = await num(() => window.__ff.game.scene.getScene('Game').player.spellPow());
check('a staff multiplies spell power (Hazel +8%, Long Winter +35%)', Math.abs(hz / base - 1.08) < 0.01 && wn / base > 1.3, `${base} ${hz} ${wn}`);
const cost = (id, spell) => G(async ([id, spell]) => { const S = window.__ff.S, { SPELLS } = await import('/src/entities/playerMagic.js'); S.inv[id] = 1; S.equip.weapon = id; S.spell = spell; return window.__ff.game.scene.getScene('Game').player.spellCost(SPELLS[spell]); }, [id, spell]);
const c0 = await cost('walking_staff', 'frost'), c1 = await cost('frostbirch_staff', 'frost'), n0 = await cost('walking_staff', 'nova'), n1 = await cost('winter_staff', 'nova');
check('Frostbirch makes frost cost 15% less; the Long Winter staff halves Frost Nova', Math.abs(c1 / c0 - 0.85) < 0.01 && Math.abs(n1 / n0 - 0.5) < 0.01, `${c0} ${c1} ${n0} ${n1}`);
// every fourth cast with the Scepter is free
await eq('sovereign_scepter');
const casts = await G(async () => { const S = window.__ff.S, p = window.__ff.game.scene.getScene('Game').player; S.spell = 'frost'; p.castW = 0; const out = []; for (let i = 0; i < 8; i++) { S.mp = 100; p.mpDelay = 0; p.heat = 0; p.lockT = 0; p.cast(); out.push(Math.round(100 - S.mp)); } return out; });
check('the Sovereign\'s Scepter makes every fourth cast free', casts.filter((c) => c === 0).length === 2 && casts[3] === 0 && casts[7] === 0, JSON.stringify(casts));
await eq('tidecaller_staff');
const ward = await G(() => { const S = window.__ff.S, p = window.__ff.game.scene.getScene('Game').player; S.spell = 'ward'; S.mp = 100; p.mpDelay = 0; p.heat = 0; p.cast(); return { t: p.ward?.t, hp: p.ward?.hp }; });
check('the Tidecaller\'s Staff lengthens Ward by half', ward.t >= 11.5, JSON.stringify(ward));
await eq('hazel_staff');
const bolt = await G(() => { const g = window.__ff.game.scene.getScene('Game'), p = g.player, S = window.__ff.S; p.mode = 'free'; p.swing = null; p.lockT = 0; S.mp = 100; S.sp = 100; const shots = g.shots.getLength(), mp = S.mp, sp = S.sp; p.startHeavy(); return { shots: g.shots.getLength() - shots, mp: mp - S.mp, sp: sp - S.sp }; });
check('a staff heavy attack fires a free bolt (stamina, no mana)', bolt.shots === 1 && bolt.mp === 0 && bolt.sp > 0, JSON.stringify(bolt));
const regen = async (id) => { await eq(id); return G(async () => { const S = window.__ff.S, p = window.__ff.game.scene.getScene('Game').player; S.mp = 10; p.mpDelay = 0; await new Promise((r) => setTimeout(r, 1200)); return S.mp - 10; }); };
const r0 = await regen('walking_staff'), r1 = await regen('delver_lodestaff');
check('the Lodestaff regenerates mana ~45% faster', r1 / r0 > 1.25 && r1 / r0 < 1.7, `${r0} ${r1}`);

// ---- halberds
const setup = (id, ex = 316, ey = 250) => G(([id, ex, ey]) => {
  const g = window.__ff.game.scene.getScene('Game'), S = window.__ff.S;
  if (!g.enemies.getChildren()[0]) g.addEnemy('draugr', 380, 250);
  const e = g.enemies.getChildren()[0];
  S.inv[id] = 1; S.equip.weapon = id; S.equip.offhand = null; S.hp = S.maxHp; S.sp = 100;
  g.player.setPosition(300, 250); g.player.face = { x: 1, y: 0 }; g.player.mode = 'free'; g.player.invuln = 99; g.player.comboT = 0; g.player.swing = null;
  e.setPosition(ex, ey); e.home = { x: ex, y: ey }; e.hp = e.maxHp = 600; e.cfg = { ...e.cfg, detect: 0, speed: 0 }; e.alerted = false; e.state = 'idle'; e.stun = 0; e.slowT = 0; e.statuses = {}; e.dead = false;
}, [id, ex, ey]);
const swing = async () => { await G(() => window.__ff.keys._press('KeyJ')); await h.sleep(70); await G(() => window.__ff.keys._release('KeyJ')); await h.sleep(520); };
const dmgOf = () => G(() => { const e = window.__ff.game.scene.getScene('Game').enemies.getChildren()[0]; return e ? e.maxHp - e.hp : 600; });
await setup('iron_halberd', 316, 268); await swing(); const sideHalb = await dmgOf();
await setup('iron_sword', 316, 268); await swing(); const sideSword = await dmgOf();
check('a halberd sweep reaches a foe off to the side that a sword misses', sideHalb > 0 && sideSword === 0, `${sideHalb} vs ${sideSword}`);
await setup('iron_halberd'); await swing(); const dIron = await dmgOf();
await setup('warden_glaive'); await swing(); const dWarden = await dmgOf();
check('the Warden\'s Glaive hits the dead harder (draugr are undead)', dWarden / dIron > 1.3, `${dIron} ${dWarden}`);
const guard = async (id) => { await setup(id); return G(() => { const g = window.__ff.game.scene.getScene('Game'), p = g.player, S = window.__ff.S; p.invuln = 0; p.iframes = 0; p.ward = null; p.mode = 'free'; p.swing = { t: 0, hit: new Set(), c: { total: 1 } }; S.hp = 100; S.maxHp = 100; p.hurt(30, 0, 0, {}); const lost = 100 - S.hp; p.swing = null; return lost; }); };
const gl0 = await guard('iron_halberd'), gl1 = await guard('court_halberd');
check('the Court Halberd takes 30% less damage while swinging', gl1 > 0 && gl0 > 0 && gl1 / gl0 < 0.8, `${gl0} ${gl1}`);
const tune = await G(async () => { const { TUNE } = await import('/src/data/tuning.js'); const { ITEMS } = await import('/src/data/items.js'); return { combo: TUNE.player.styles.halberd.length, wide: TUNE.player.styles.halberd[0].wide, plant: TUNE.player.styles.halberd[2].breaker, pull: ITEMS.woodsmans_bill.pull, freeze: ITEMS.reaper_halberd.killFreeze, pierce: ITEMS.lode_glaive.pierce }; });
check('three-step halberd combo ends in a guard-breaking plant', tune.combo === 3 && tune.wide > 1.5 && tune.plant === true && tune.pull > 0 && tune.freeze > 0 && tune.pierce >= 0.5, JSON.stringify(tune));
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
process.exit(failCount() ? 1 : 0);
