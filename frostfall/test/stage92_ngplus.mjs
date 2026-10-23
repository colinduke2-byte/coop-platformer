// New Game+ with things to earn (PR-17), arena rewards (PR-24) and the Great Anvil's Ascend (PR-26).
import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=forest&spawn=west&seed=424242');
await h.sleep(900);
const G = (fn, a) => h.ev(fn, a);
await G(() => { window.__ff.S.flags.introDone = true; });

const ng = await G(async () => {
  const S = window.__ff.S, g = window.__ff.game.scene.getScene('Game'), p = g.player;
  const spawn = (k, tier = 0) => { const e = g.addEnemy(k, p.x + 80, p.y + 80, { tier }); const r = { hp: e.maxHp, f: e.progressF }; e.destroy(); return r; };
  S.flags = { introDone: true }; S.ngPlus = 0;
  const w0 = spawn('wolf'), b0 = spawn('kragnar');
  S.ngPlus = 1; const w1 = spawn('wolf'), b1 = spawn('kragnar');
  S.ngPlus = 2; const w2 = spawn('wolf');
  S.ngPlus = 1;
  const { makeGenItem, genItem, RARITY } = await import('/src/systems/genloot.js');
  const tierUp = S.gen[makeGenItem(1, Math.random, 0)].tier === 2;
  let mythicNg0 = 0, mythicNg3 = 0;
  for (let i = 0; i < 3000; i++) { if (genItem(5, Math.random, null, { ng: 0 }).rarity === 'mythic') mythicNg0++; if (genItem(5, Math.random, null, { ng: 3 }).rarity === 'mythic') mythicNg3++; }
  const myth = genItem(5, Math.random, RARITY.findIndex((r) => r.id === 'mythic'), { slot: 'weapon' });
  // the Ascended tempers
  const U = await import('/src/systems/upgrades.js'), { buyUpgrade } = await import('/src/data/services.js');
  S.inv.iron_sword = 1; S.equip.weapon = 'iron_sword'; S.upgrades = { iron_sword: 10 }; S.gold = 99999; S.inv.ember_ore = 30; S.inv.winters_echo = 0;
  const noEcho = buyUpgrade('weapon', U.maxLevel()) === 'short';
  const { bus } = await import('/src/systems/bus.js'); bus.emit('boss:killed', { cfg: { title: 'TEST' } });
  const echo = S.inv.winters_echo === 1;
  S.inv.winters_echo = 3;
  const l11 = buyUpgrade('weapon', U.maxLevel()) === 'ok' && buyUpgrade('weapon', U.maxLevel()) === 'ok' && S.upgrades.iron_sword === 12 && buyUpgrade('weapon', U.maxLevel()) === 'max';
  const gain12 = Math.abs(U.totalGain('weapon', 12) - 0.81) < 1e-9;
  S.ngPlus = 0; const cap0 = U.maxLevel() === 10 && Math.abs(U.totalGain('weapon', 12) - 0.65) < 1e-9;
  S.upgrades = {}; S.equip.weapon = null;
  const { CLOAKS, TROPHIES } = await import('/src/systems/achievements.js');
  return {
    floor: w0.f < 0.3 && w1.f >= 0.5 && w2.f >= 0.75 && w1.hp > w0.hp * 1.4, boss: b1.hp > b0.hp * 1.3, tierUp, mythic: mythicNg0 === 0 && mythicNg3 > 0, mythSig: /WINTERBORN/.test(myth.desc),
    noEcho, echo, l11, gain12, cap0, trophies: ['ng2', 'ng3', 'arena20', 'arena30'].every((id) => TROPHIES.some((t) => t.id === id)) && CLOAKS.some((c) => c.trophy === 'ng2'),
    vals: { w0, w1, w2, b0, b1, mythicNg3 },
  };
});
check('PR-17: in NG+ early regions keep up (progress floor 0.5, 0.75), bosses scale, loot rolls a tier higher, Mythic exists only in NG+', ng.floor && ng.boss && ng.tierUp && ng.mythic && ng.mythSig, JSON.stringify(ng));
check('PR-17: Ascended tempers +11/+12 need a Winter\'s Echo, which NG+ bosses drop; outside NG+ the cap stays +10', ng.noEcho && ng.echo && ng.l11 && ng.gain12 && ng.cap0, JSON.stringify(ng));
check('PR-17/PR-24: each NG cycle and the deep arena runs have a trophy and a cloak colour', ng.trophies, JSON.stringify(ng));

const ar = await G(async () => {
  const S = window.__ff.S, A = await import('/src/systems/arenarewards.js'), { STORY_FLAGS } = await import('/src/systems/enemyscale.js');
  S.flags = { introDone: true }; S.gold = 0; const early = A.waveGold(10, 'classic');
  for (const f of STORY_FLAGS) S.flags[f] = true; S.gold = 0; const late = A.waveGold(10, 'classic');
  S.flags = { introDone: true };
  S.arena = { best: 0 }; delete S.inv.arena_token;
  const first = A.arenaMilestones(12), again = A.arenaMilestones(12), deep = A.arenaMilestones(31);
  return { early: early === 140, late: late === 420, token: first.join() === 'arena_token' && again.length === 0 && S.inv.arena_token === 1, deep: deep.join() === 'arena_crown,champion_blade', vals: [early, late, first, deep] };
});
check('PR-24: arena wave gold grows with the story (wave 10: 140 -> 420 gold); prizes at best waves 10, 20 and 30, once each', Object.values(ar).every(Boolean), JSON.stringify(ar));

const asc = await G(async () => {
  const S = window.__ff.S, { genItem, registerGen } = await import('/src/systems/genloot.js'), { ascendItem } = await import('/src/data/services.js');
  S.ngPlus = 0;
  registerGen('g_ascmag', genItem(2, Math.random, 1, { slot: 'armor', baseName: 'Hauberk' })); S.inv.g_ascmag = 1;
  S.gold = 700; S.inv.ember_ore = 2;
  const r1 = ascendItem('g_ascmag'), rare = S.gen.g_ascmag.rarity === 'rare' && S.gen.g_ascmag.affixLines.length === 2 && S.gold === 100 && !S.inv.ember_ore;
  const short = ascendItem('g_ascmag') === 'short';
  S.gold = 5000; S.inv.ember_ore = 9; S.inv.heart_shard = 1;
  const r2 = ascendItem('g_ascmag') === 'ok' && S.gen.g_ascmag.rarity === 'legend';
  const noMythic = ascendItem('g_ascmag') === 'no';
  S.ngPlus = 1; S.inv.winters_echo = 1; S.gold = 5000; const myth = ascendItem('g_ascmag') === 'ok' && S.gen.g_ascmag.rarity === 'mythic';
  S.ngPlus = 0; delete S.inv.g_ascmag;
  return { r1: r1 === 'ok', rare, short, r2, noMythic, myth };
});
check('PR-26: the Great Anvil ascends Magic -> Rare (600 g, 2 ore) -> Legendary (1500 g, 3 ore, a shard), and to Mythic only in NG+', Object.values(asc).every(Boolean), JSON.stringify(asc));

check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'NGPLUS FAILED' : 'NGPLUS PASSED');
process.exit(failCount() ? 1 : 0);
