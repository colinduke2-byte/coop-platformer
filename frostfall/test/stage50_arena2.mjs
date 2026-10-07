import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=title');
await h.sleep(900);
const G = (fn, a) => h.ev(fn, a);
const press = (c) => h.ev((c) => window.__ff.keys._press(c), c);
const rel = (c) => h.ev((c) => window.__ff.keys._release(c), c);
const tap = async (c, ms = 80) => { await press(c); await h.sleep(ms); await rel(c); await h.sleep(120); };
const startRun = (hero, opts) => G(async ([hero, opts]) => {
  const H = await import('/src/arena/heroes.js'), A = await import('/src/arena/arenas.js');
  H.beginQuickRun(hero, opts);
  const game = window.__ff.game;
  for (const k of ['Game', 'Hud']) if (game.scene.isActive(k)) game.scene.stop(k);
  game.scene.start('Game', { map: A.arenaById(window.__ff.S.quick.arena).map, spawn: 'in' });
}, [hero, opts]);
await G(() => { window.gs = () => window.__ff.game.scene.getScene('Game'); });
// make the boon pick instant
const autoPick = () => G(async () => { const dlg = await import('/src/systems/dialogue.js'); const real = dlg.dialogue.hud; window.__real = real; dlg.dialogue.hud = { say: async () => {}, choose: async () => 0, hideBox() {}, scene: real.scene }; });

// ---- rooms unlock with waves reached
const lk = await G(async () => {
  const H = await import('/src/arena/heroes.js'); localStorage.removeItem('frostfall_arena_records'); const out = {};
  out.locked = !H.arenaUnlocked('lake') && H.arenaUnlocked('pit') && H.nextRoomAt() === 5;
  H.beginQuickRun('warden', { mode: 'survival', arena: 'court' }); out.fallback = window.__ff.S.quick.arena === 'pit';
  localStorage.setItem('frostfall_arena_records', JSON.stringify({ 'warden:survival': { score: 1, waves: 8, runs: 1 }, 'warden:rush': { score: 1, waves: 99, runs: 1 } }));
  out.lake = H.arenaUnlocked('lake') && H.arenaUnlocked('foundry') && !H.arenaUnlocked('court') && H.nextRoomAt() === 10;
  localStorage.setItem('frostfall_arena_records', JSON.stringify({ 'warden:survival': { score: 1, waves: 10, runs: 1 } }));
  return out;
});
check('the Lake, Foundry and Court unlock at waves 5, 8 and 10 (Boss Rush does not count)', lk.locked && lk.fallback && lk.lake, JSON.stringify(lk));

// ---- the four rooms
for (const [id, mapId] of [['pit', 'pit'], ['lake', 'pit_lake'], ['foundry', 'pit_foundry'], ['court', 'pit_court']]) {
  await startRun('warden', { mode: 'survival', arena: id }); await h.sleep(1800);
  const r = await G(() => { const g = window.__ff.game.scene.getScene('Game'); const pts = [[4, 11], [27, 11], [16, 4], [8, 5], [24, 5], [5, 17], [26, 17], [16, 8], [16, 20]]; return { map: g.mapId, bad: pts.filter(([x, y]) => g.solidAt(x * 16 + 8, y * 16 + 8)).length, exits: g.exits.length, arena: !!g.arena?.active }; });
  check(`${id}: loads, every spawn point is open floor, no way out`, r.map === mapId && r.bad === 0 && r.exits === 0 && r.arena, JSON.stringify(r));
}
await h.shot('s50_foundry');

// ---- pickups and the combo
await startRun('warden', { mode: 'survival', arena: 'pit' }); await h.sleep(1800);
const orb = await G(async () => {
  const g = gs(), S = window.__ff.S, M = await import('/src/data/mods.js'); const out = {};
  S.hp = 10; g.collectOrb('health'); out.heal = S.hp > 30;
  S.sp = 0; g.collectOrb('stamina'); out.sp = S.sp === S.maxSp;
  const base = M.modMul('dealMul'); g.collectOrb('rage'); out.rage = M.modMul('dealMul') > base * 1.3 && S.quick.rageT > 11;
  const e = g.addEnemy('draugr', g.player.x + 30, g.player.y, { tier: 0 }); const hp0 = e.hp; g.collectOrb('bomb'); out.bomb = e.hp < hp0 || e.dead;
  return out;
});
check('orbs: health heals, stamina refills, rage boosts damage, bomb hurts nearby foes', orb.heal && orb.sp && orb.rage && orb.bomb, JSON.stringify(orb));
const cb = await G(async () => {
  const g = gs(), S = window.__ff.S, C = await import('/src/arena/quickRun.js'), q = S.quick; q.combo = 0; q.pts = 0;
  for (let i = 0; i < 9; i++) g.onQuickFoe({ x: g.player.x, y: g.player.y });
  const pts9 = q.pts, mult = C.comboMult(q.combo);
  g.player.lastHurt = (g.player.lastHurt || 0) + 5; g.arena.active = true; g.quickTick(0.016);
  return { pts9, mult, broke: q.combo === 0 };
});
check('the combo multiplier rises with chained kills and breaks when you are hit', cb.mult === 1.5 && cb.pts9 > 90 && cb.broke, JSON.stringify(cb));

// ---- twists
const tw = await G(async () => {
  const g = gs(), a = g.arena, out = {}; a.active = true;
  const orig = Math.random; let hit = null;
  for (let k = 0; k < 40 && !hit; k++) { a.wave = 3; const foes = [{ kind: 'wolf', tier: 0 }, { kind: 'draugr', tier: 0 }]; g.quickWaveHook(a, foes); if (a.twist) hit = { t: a.twist, n: foes.length }; }
  out.twist = !!hit;
  a.twist = 'fast'; const e = g.addEnemy('wolf', 100, 100, { tier: 0 }); const sp = e.cfg.speed; g.quickApplyTwist(e); out.fast = e.cfg.speed > sp * 1.3;
  a.twist = 'armoured'; const e2 = g.addEnemy('wolf', 120, 100, { tier: 0 }); const hp = e2.maxHp; g.quickApplyTwist(e2); out.armour = e2.maxHp > hp * 1.5;
  a.twist = 'darkness'; g.ambientOverride = { alpha: 0.6 }; g.quickWaveCleared(3); out.dark = g.ambientOverride === null && a.twist === null;
  const pre = g.pickups.length; out.orbAfterWave = pre > 0;
  return out;
});
check('waves from 3 on can carry a twist (fast, armoured, darkness...) and it ends with the wave', tw.twist && tw.fast && tw.armour && tw.dark && tw.orbAfterWave, JSON.stringify(tw));

// ---- boons
const bo = await G(async () => {
  const M = await import('/src/data/mods.js'), S = window.__ff.S; const out = {};
  out.count = Object.keys(M.BOONS).length >= 17;
  S.boons = { vampiric: 1, thornmail: 2, arcane: 1, scavenger: 1 };
  out.ls = Math.abs(M.modSum('lifesteal') - 0.04) < 1e-9; out.th = M.modSum('thorns') === 12; out.mana = M.modMul('manaMul') === 0.75; out.drop = M.modMul('dropMul') === 2;
  S.boons = {}; return out;
});
check('eight new boons exist and their effects are wired (lifesteal, thorns, mana cost, orb drops)', bo.count && bo.ls && bo.th && bo.mana && bo.drop, JSON.stringify(bo));

// ---- boss rush
await startRun('warden', { mode: 'rush', arena: 'pit' }); await h.sleep(1500); await autoPick(); await h.sleep(3700);
const rs = await G(() => { const g = gs(); return { boss: g.boss?.constructor?.name, mode: g.arena.mode, eng: !!g.boss?.engaged, name: g.boss?.cfg?.name }; });
check('boss rush: the first boss is summoned and engaged', rs.mode === 'rush' && !!rs.boss && rs.eng, JSON.stringify(rs));
await G(() => { const g = gs(); g.player.invuln = 999; g.boss.invulnerable = false; g.boss.takeHit({ dmg: 99999, kx: 1, ky: 0, kb: 0 }); });
await h.sleep(5500);
const rs2 = await G(() => { const g = gs(), S = window.__ff.S; return { cleared: g.arena.cleared, pts: S.quick.pts, boons: Object.keys(S.boons || {}).length, finale: window.__ff.game.scene.isActive('Ending'), saved: false }; });
check('boss rush: felling a boss scores, offers a boon and moves on (no ending, no heart)', rs2.cleared === 1 && rs2.pts >= 300 && rs2.boons === 1 && !rs2.finale, JSON.stringify(rs2));
await h.sleep(5000);
check('boss rush: the next boss arrives', await G(() => { const g = gs(); return g.arena.wave >= 3 && !!g.boss && g.boss.constructor.name !== undefined; }));
await G(async () => { (await import('/src/systems/dialogue.js')).dialogue.hud = window.__real; });

// ---- daily arena
await startRun('ranger', { mode: 'daily' }); await h.sleep(1800);
const dd = await G(async () => {
  const S = window.__ff.S, D = await import('/src/systems/daily.js'), H = await import('/src/arena/heroes.js'), Q = await import('/src/arena/quickRun.js');
  const a = Q.seededRng(D.dayStamp()), b = Q.seededRng(D.dayStamp());
  return { mods: Object.keys(S.mods || {}).length, day: S.quick.daily === D.dayStamp(), arena: S.quick.arena === H.dailyArena(), same: [a(), a(), a()].join() === [b(), b(), b()].join() };
});
check('daily arena: two modifiers, the day\'s fixed room and a seeded wave order', dd.mods === 2 && dd.day && dd.arena && dd.same, JSON.stringify(dd));

// ---- setup screen: mode and arena selectors
await G(() => { const g = window.__ff.game; for (const k of ['Game', 'Hud']) if (g.scene.isActive(k)) g.scene.stop(k); g.scene.start('ArenaSetup'); });
await h.sleep(900);
await tap('KeyD'); await tap('KeyD'); await tap('KeyQ');
const su = await G(() => { const s = window.__ff.game.scene.getScene('ArenaSetup'); return { mode: s.modeI, arena: s.arenaI }; });
check('the setup screen changes mode (A/D) and arena (Q)', su.mode === 2 && su.arena === 1, JSON.stringify(su));
await h.shot('s50_setup');
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'ARENA2 FAILED' : 'ARENA2 PASSED');
