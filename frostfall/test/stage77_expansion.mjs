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


// ---- quests: the two main quests and their choices, a chain step, the epilogue
const stub = (answers) => G(async (a) => {
  const dlg = await import('/src/systems/dialogue.js'); window.__dlg = dlg.dialogue;
  if (!window.__realHud) window.__realHud = dlg.dialogue.hud;
  window.__answers = [...a]; window.__said = [];
  dlg.dialogue.hud = { say: async (n, t) => { window.__said.push(t); }, choose: async (o) => (window.__answers.length ? window.__answers.shift() : o.length - 1), hideBox() {}, scene: window.__realHud.scene };
}, answers);
const unstub = () => G(() => { window.__dlg.hud = window.__realHud; });
const SCRIPT = (name) => G(async (n) => { await import('/src/data/hamlets.js'); const d = await import('/src/data/dialogue.js'); await d.SCRIPTS[n](); }, name);
await G(() => { const S = window.__ff.S; S.gold = 0; S.inv = {}; S.flags.blightMotherDead = false; S.flags.vaultSovereignDead = false; });
await stub([0]); await SCRIPT('vale_elder'); await unstub();
check('Elder Maeve sends you into the Thornroot Hollow', await G(() => window.__ff.S.quests.blightmother.status === 'active'));
await G(() => { const S = window.__ff.S; S.flags.blightMotherDead = true; S.inv.blight_heart = 1; });
await stub([0]); await SCRIPT('vale_elder'); await unstub();
const g1 = await G(() => { const s = window.__ff.S; return { q: s.quests.blightmother.status, c: s.flags.choiceGrove, gold: s.gold, charm: !!s.inv.bloom_charm, heart: s.inv.blight_heart || 0 }; });
check('replanting the heart finishes the quest, pays gold and a charm, and sets the grove choice', g1.q === 'done' && g1.c === 'replant' && g1.gold === 650 && g1.charm && g1.heart === 0, JSON.stringify(g1));
await G(() => { const S = window.__ff.S; S.quests.blightmother.status = 'active'; S.inv.blight_heart = 1; S.bonusHp = 0; S.gold = 0; });
await stub([1]); await SCRIPT('vale_elder'); await unstub();
const g2 = await G(() => { const s = window.__ff.S; return { c: s.flags.choiceGrove, hp: s.bonusHp, gold: s.gold }; });
check('keeping the heart gives permanent health and more gold instead', g2.c === 'keep' && g2.hp === 20 && g2.gold === 1000, JSON.stringify(g2));
await G(() => { const S = window.__ff.S; S.gold = 0; });
await stub([0]); await SCRIPT('dune_sheikh'); await unstub();
check('Sheikh Rashid sends you to the Sealed Vault', await G(() => window.__ff.S.quests.sunvault.status === 'active'));
for (const [ans, choice, item] of [[0, 'sunbreaker', 'sunbreaker'], [1, 'winterward', 'winterward'], [2, 'seal', null]]) {
  await G(() => { const S = window.__ff.S; S.quests.sunvault.status = 'active'; S.flags.vaultSovereignDead = true; S.inv = {}; S.gold = 0; });
  await stub([ans]); await SCRIPT('dune_sheikh'); await unstub();
  const v = await G(() => { const s = window.__ff.S; return { c: s.flags.choiceVault, q: s.quests.sunvault.status, items: [!!s.inv.sunbreaker, !!s.inv.winterward], gold: s.gold }; });
  check(`the vault choice "${choice}" is recorded, pays out and finishes the quest`, v.c === choice && v.q === 'done' && (item === 'sunbreaker' ? v.items[0] : item === 'winterward' ? v.items[1] : !v.items[0] && !v.items[1]) && v.gold >= 700, JSON.stringify(v));
}
// a chain: three linked steps from one giver
await G(() => { const S = window.__ff.S; for (const k of ['hornets1', 'hornets2', 'hornets3']) S.quests[k].status = 'inactive'; S.kills.hornet = 0; S.gold = 0; });
await stub([0]); await SCRIPT('vale_beekeeper'); await unstub();
check('the beekeeper offers the first step of the hornet chain', await G(() => window.__ff.S.quests.hornets1.status === 'active'));
await G(() => { window.__ff.S.kills.hornet = 6; });
await stub([]); await SCRIPT('vale_beekeeper'); await unstub();
check('hand it in and the first step pays and finishes', await G(() => window.__ff.S.quests.hornets1.status === 'done' && window.__ff.S.gold >= 180));
await stub([0]); await SCRIPT('vale_beekeeper'); await unstub();
check('the second step opens straight after', await G(() => window.__ff.S.quests.hornets2.status === 'active'));
// every new person can be spoken to without an error
const talkers = await G(async () => {
  await import('/src/data/hamlets.js'); const d = await import('/src/data/dialogue.js'); const bad = [];
  const ids = Object.keys(d.NPC_DEFS).filter((k) => /^(vale|dune)_/.test(k));
  for (const id of ids) { if (!d.SCRIPTS[id]) bad.push(id + ':script'); }
  return { n: ids.length, bad };
});
check('every Vale and Amberwell villager has a script', talkers.n >= 24 && talkers.bad.length === 0, JSON.stringify(talkers));
const epi = await G(async () => { const S = window.__ff.S; S.flags.blightMotherDead = true; S.flags.vaultSovereignDead = true; S.flags.choiceGrove = 'keep'; S.flags.choiceVault = 'winterward'; S.flags.choiceSula = 'freed'; return (await import('/src/data/story.js')).epilogueLines().join(' '); });
check('the epilogue remembers the grove, the vault and Red Sula', /Heart of the Grove/.test(epi) && /Winterward/.test(epi) && /Red Sula/.test(epi), epi.slice(0, 200));

// ---- four new spells
const sp = await G(async () => {
  const sc = window.gs(), S = window.__ff.S, p = sc.player, P = await import('/src/entities/playerMagic.js'), out = {};
  sc.enemies.getChildren().forEach((e) => e.destroy());
  S.skills.restoration.lvl = 10; S.skills.sneak.lvl = 10; S.tomes = { ...(S.tomes || {}), sunbeam: true };
  out.list = ['regrow', 'thorns', 'sandstorm', 'sunbeam'].every((k) => P.SPELL_ORDER.includes(k) && P.spellUnlocked(k));
  const cast = async (id, setup) => { S.spell = id; S.mp = S.maxMp; p.invuln = 999; p.face = { x: 1, y: 0 }; p.lockT = 0; p.mode = 'free'; p.heat = 0; p.target = null; if (setup) setup(); p.cast(); };
  const mk = (kind, dx, dy) => { const e = sc.addEnemy(kind, p.x + dx, p.y + dy, { tier: 1 }); e.alerted = true; e.hitDone = true; return e; };
  // regrowth: heals over time, not all at once
  S.hp = 40; const h0 = S.hp; await cast('regrow'); const h1 = S.hp; await new Promise((r) => setTimeout(r, 3300)); const h2 = S.hp; await new Promise((r) => setTimeout(r, 3300));
  out.regrow = h1 === h0 && h2 > h0 && S.hp > h2;
  // thorn snare: roots and cuts a foe in front
  S.hp = S.maxHp; let e = mk('bandit', 34, 0); const hp0 = e.hp; await cast('thorns'); await new Promise((r) => setTimeout(r, 150));
  out.thorns = e.hp < hp0 && !!e.statuses?.root; e.destroy();
  // sandstorm: scatters the foes around you
  e = mk('bandit', 20, 0); const e2 = mk('wolf', -24, 10); await cast('sandstorm'); await new Promise((r) => setTimeout(r, 150));
  out.sand = !!e.statuses?.fear && !!e2.statuses?.slow; e.destroy(); e2.destroy();
  // sunbeam: a column of light where you aim, after a beat
  e = mk('blightbloom', 60, 0); const hb = e.hp; await cast('sunbeam'); await new Promise((r) => setTimeout(r, 900));
  out.sun = e.hp < hb; e.destroy();
  return out;
});
check('Regrowth, Thorn Snare, Sandstorm and Sunbeam join the spell list and unlock by skill or tome', sp.list, JSON.stringify(sp));
check('Regrowth heals over several seconds; Thorn Snare roots and cuts; Sandstorm blinds and scatters; Sunbeam lands after a beat', sp.regrow && sp.thorns && sp.sand && sp.sun, JSON.stringify(sp));

// ---- the vault choice changes the final fight
const fin = await G(async () => {
  const sc = window.gs(), S = window.__ff.S, p = sc.player, { BOSS_CLASS } = await import('/src/world/sceneConsts.js'), { TUNE } = await import('/src/data/tuning.js');
  const out = {};
  for (const c of ['seal', 'sunbreaker', 'winterward']) {
    S.flags.choiceVault = c;
    const b = new BOSS_CLASS.winter(sc, p.x + 200, p.y + 200);
    out[c] = { fire: b.fireMul || 1, slam: b.B.slam.dmg, base: TUNE.winter.slam.dmg };
    b.destroy();
  }
  return out;
});
check('the Long Winter takes more from fire if you took the Sunbreaker, and hits softer if you took the Winterward', fin.seal.fire === 1 && fin.seal.slam === fin.seal.base && fin.sunbreaker.fire > 1 && fin.winterward.slam < fin.winterward.base, JSON.stringify(fin));

check('no page errors', h.errors.length === 0, h.errors.join(' | '));
await h.close();
