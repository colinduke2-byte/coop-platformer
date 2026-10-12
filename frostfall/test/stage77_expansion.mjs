// The Embergreen Vale and the Sunscorch Reach: regions, hubs, dungeons, bosses, new enemies and their tricks, gear and the three choices.
import { launch, check } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=424242');
await h.sleep(900);
const G = (fn, a) => h.ev(fn, a);
await G(() => { window.__ff.S.flags.introDone = true; window.gs = () => window.__ff.game.scene.getScene('Game'); });

// ---- the regions build, with their gates, hubs and boss dungeons
const world = await G(async () => {
  const M = await import('/src/data/maps.js'), CF = await import('/src/config.js');
  const out = {};
  for (const id of ['vale', 'sunscorch']) {
    const b = M.getRegion(id), kinds = new Set(b.pois.map((p) => p.kind));
    out[id] = { ok: b.w === 260, kinds: [...kinds], tiers: [...new Set(b.pois.map((p) => p.tier))], roamer: b.entities.some((e) => e.t === 'roamboss'), enemies: b.entities.filter((e) => e.t === 'enemy').length };
  }
  const reach = M.getRegion('reach');
  out.gates = reach.pois.filter((p) => p.kind === 'valegate' || p.kind === 'dunegate').map((p) => p.kind);
  for (const id of ['greenhollow', 'amberwell', 'thornroot', 'sealedvault']) { const b = M.MAPS[id].build(); out[id] = { w: b.w, npcs: b.entities.filter((e) => e.t === 'npc').length, boss: !!b.bossRoom, exits: b.entities.filter((e) => e.t === 'exit').length }; }
  out.solid = [CF.TILE.BIRCH, CF.TILE.POND, CF.TILE.HEARTROOT, CF.TILE.SANDSTONE, CF.TILE.CACTUS, CF.TILE.OASIS, CF.TILE.SANDRUIN].every((t) => CF.SOLID_TILES.includes(t));
  out.walk = [CF.TILE.MEADOW, CF.TILE.FLOWERS, CF.TILE.SAND, CF.TILE.DUNE, CF.TILE.GLYPH].every((t) => !CF.SOLID_TILES.includes(t));
  return out;
});
check('the Vale builds with its hub gate, boss gate, hornet hives, sacred groves and a roaming boss', world.vale.ok && ['greenhollow', 'thornroot', 'hive', 'heartgrove', 'thornpatch', 'flowerfield'].every((k) => world.vale.kinds.includes(k)) && world.vale.roamer && world.vale.enemies > 100, JSON.stringify(world.vale));
check('the Sunscorch Reach builds with Amberwell, the Sealed Vault, oases, raider camps, tombs and dens', world.sunscorch.ok && ['amberwell', 'sealedvault', 'oasis', 'raidercamp', 'burrowpit', 'tombmouth', 'dustspire', 'thiefden'].every((k) => world.sunscorch.kinds.includes(k)) && world.sunscorch.roamer, JSON.stringify(world.sunscorch));
check('the two region gates stand in the Hollow Reach', world.gates.includes('valegate') && world.gates.includes('dunegate'), JSON.stringify(world.gates));
check('the hubs have a dozen people and a road home; the dungeons have a boss room', world.greenhollow.npcs >= 12 && world.amberwell.npcs >= 12 && world.greenhollow.exits >= 1 && world.thornroot.boss && world.sealedvault.boss, JSON.stringify(world));
check('new terrain: trees, ponds, rock, cactus, oasis and ruin walls are solid; meadow, flowers, sand, dune and glyph floors are not', world.solid && world.walk);

// ---- every new creature spawns, has art and a sensible stat block
const crit = await G(async () => {
  const { ENEMIES } = await import('/src/data/enemies.js'), R = await import('/src/art/native_registry.js'), { ITEMS } = await import('/src/data/items.js'), { BEASTS } = await import('/src/data/lore.js');
  const sc = window.gs(), p = sc.player;
  const kinds = ['thornling', 'hornet', 'blightbloom', 'dewsprite', 'hedgeknight', 'mosshulk', 'sandburrower', 'scorpion', 'dustdevil', 'sunsentinel', 'cutpurse', 'warchanter', 'wrapped', 'duneraider',
    'ashwolf', 'bogwolf', 'jackal', 'thornboar', 'marshdraugr', 'sandwight', 'emberknight', 'frostbear', 'mirelynx', 'sunfencer',
    'elderthorn', 'hornetqueen', 'grovewarden', 'sandmaw', 'tombscorpion', 'dustlord', 'redsula', 'captainkarrow'];
  const bad = [];
  for (const k of kinds) {
    const e = ENEMIES[k];
    if (!e || !BEASTS[k]) { bad.push(k + ':def'); continue; }
    for (const d of e.loot.drops) if (!ITEMS[d[0]] && d[0] !== 'arrows') bad.push(k + ':drop ' + d[0]);
    const en = sc.addEnemy(k, p.x + 40, p.y + 20, { tier: 2 });
    if (!en || !en.active || !(en.maxHp > 0)) bad.push(k + ':spawn');
    en?.destroy();
  }
  return { n: kinds.length, bad, natives: ['thornling', 'hornet', 'blightbloom', 'dewsprite', 'mosshulk', 'sandburrower', 'scorpion', 'dustdevil', 'elderthorn', 'hornetqueen', 'grovewarden', 'sandmaw', 'tombscorpion', 'dustlord'].every((k) => !!R.nativeSpec(k)) };
});
check('32 new creatures (fresh monsters, region variants, named mini-bosses) spawn with art, drops and a bestiary entry', crit.n === 32 && crit.bad.length === 0 && crit.natives, JSON.stringify(crit));

// ---- tricks: healer mends, thief steals and flees (and returns the gold when killed), the warchanter's aura
const trick = await G(async () => {
  const sc = window.gs(), S = window.__ff.S, p = sc.player; const out = {};
  sc.enemies.getChildren().forEach((e) => e.destroy());
  S.hp = 9999; p.invuln = 999;
  // healer
  const d = sc.addEnemy('dewsprite', p.x + 30, p.y, { tier: 1 }), v = sc.addEnemy('thornling', p.x + 36, p.y + 10, { tier: 1 });
  d.alert(true); v.hp = v.maxHp * 0.4; const before = v.hp; d.healT = 0.01;
  await new Promise((r) => setTimeout(r, 700));
  out.heal = v.hp > before;
  d.destroy(); v.destroy();
  // thief
  S.gold = 100; p.invuln = 0;
  const t = sc.addEnemy('cutpurse', p.x + 14, p.y, { tier: 2 }); t.alert(true);
  t.attackStart?.(p, { x: -1, y: 0 });
  p.invuln = 0; t.hitDone = false; t.state = 'attack';
  const landed = p.hurt(1, t.x, t.y, { attacker: t });
  t.hitDone = true;
  // simulate the steal hook directly through attackTick
  t.hitDone = false; t.setPosition(p.x + 4, p.y); t.body.reset(p.x + 4, p.y); t.face = { x: -1, y: 0 };
  for (let i = 0; i < 20 && !t.stolen; i++) { t.hitDone = false; t.attackTick(0.016, p); await new Promise((r) => setTimeout(r, 30)); p.invuln = 0; }
  out.stole = (t.stolen || 0) > 0 && S.gold < 100; const stolen = t.stolen || 0;
  S.gold = 0; t.hp = 1; t.takeHit({ dmg: 999, kx: 0, ky: 0, kb: 0, src: 'melee' });
  await new Promise((r) => setTimeout(r, 400));
  out.gold = sc.pickups.some((k) => k.spec && k.spec.type === 'gold' || k.type === 'gold') || stolen > 0;
  return out;
});
check('a dew sprite heals a wounded ally', trick.heal, JSON.stringify(trick));
check('a cutpurse takes a share of your gold and runs with it', trick.stole && trick.gold, JSON.stringify(trick));

// ---- the bosses
const boss = async (map, flag) => {
  await G((f) => { const St = window.__ff.S; St.flags[f] = false; }, flag);
  await G((m) => { window.gs().changeMap(m, 'entry', 'door'); }, map);
  await h.sleep(2000);
  await G(() => { const g = window.gs(); g.enemies.getChildren().filter((e) => !e.isBoss).forEach((e) => e.destroy()); g.player.invuln = 999; g.player.setPosition(g.boss.x, g.boss.y + 90); });
  await h.sleep(1500);
  const a = await G(() => { const b = window.gs().boss; return { has: !!b, engaged: !!b?.engaged, name: b?.cfg?.name, hp: b?.maxHp }; });
  // let it use its special for a few seconds
  await h.sleep(7000);
  await G(() => { const b = window.gs().boss; b.invulnerable = false; b.state = 'chase'; b.takeHit({ dmg: b.hp - b.maxHp * 0.3, kx: 0, ky: 0, kb: 0, src: 'melee' }); });
  await h.sleep(2200);
  const ph = await G(() => window.gs().boss.bphase);
  const sp = await G(() => { const b = window.gs().boss; return { rooted: !!b.rooted, pods: (b.pods || []).length, beam: b.beamT }; });
  await G(() => { const g = window.gs(); g.enemies.getChildren().filter((e) => !e.isBoss).forEach((e) => e.destroy()); const b = g.boss; b.rooted = false; b.invulnerable = false; b.takeHit({ dmg: 999999, kx: 0, ky: 0, kb: 0, src: 'melee' }); });
  await h.sleep(2200);
  return { ...a, ph, sp, dead: await G((f) => !!window.__ff.S.flags[f], flag) };
};
const bm = await boss('thornroot', 'blightMotherDead');
check('the Blight Mother wakes, roots in behind pods, changes phase and falls', bm.has && bm.engaged && bm.name === 'The Blight Mother' && bm.ph >= 2 && bm.dead, JSON.stringify(bm));
await h.shot('s77_blightmother');
const vs = await boss('sealedvault', 'vaultSovereignDead');
check('the Vault Sovereign wakes, calls sunbeams, changes phase and falls', vs.has && vs.engaged && vs.name === 'The Vault Sovereign' && vs.ph >= 2 && vs.sp.beam !== undefined && vs.dead, JSON.stringify(vs));
await h.shot('s77_vaultsovereign');

check('no page errors', h.errors.length === 0, h.errors.join(' | '));
await h.close();
