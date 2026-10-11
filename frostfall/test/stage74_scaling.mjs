// Enemy scaling with progress: ordinary enemies grow with region and story; bosses and passive animals do not.
import { launch, check } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=424242');
await h.sleep(900);
const G = (fn, a) => h.ev(fn, a);
await G(() => { window.__ff.S.flags.introDone = true; });

// the curve itself
const curve = await G(async () => {
  const E = await import('/src/systems/enemyscale.js');
  const f = (t, s) => +E.progress(t, s).toFixed(3);
  return { f00: f(0, 0), f03: f(0, 1), f30: f(3, 0), f31: f(3, 1), f10: f(1, 0), hp1: E.hpMul(1), dmg1: E.dmgMul(1), gold1: E.goldMul(1), flags: E.STORY_FLAGS.length, hp03: +E.hpMul(E.progress(0, 1)).toFixed(2), dmg03: +E.dmgMul(E.progress(0, 1)).toFixed(2) };
});
check('the very start is untouched (f 0) and the last region at the end is full strength (f 1)', curve.f00 === 0 && curve.f31 === 1, JSON.stringify(curve));
check('full strength is 3x health and 2x damage', curve.hp1 === 3 && curve.dmg1 === 2, JSON.stringify(curve));
check('rushing to the last region before the story is 70% of the way; the story alone moves an early area 30%', curve.f30 === 0.7 && curve.f03 === 0.3, JSON.stringify(curve));
check('an early area at the end of the game is tougher but far from full (1.6x health, 1.3x damage)', curve.hp03 === 1.6 && curve.dmg03 === 1.3, JSON.stringify(curve));

// real enemies in the game
const spawn = (kind, tier, flags = {}) => G(async ([kind, tier, flags]) => {
  const S = window.__ff.S, sc = window.__ff.game.scene.getScene('Game'), { ENEMIES } = await import('/src/data/enemies.js'), { TUNE } = await import('/src/data/tuning.js'), { settings } = await import('/src/systems/settings.js');
  S.flags = { ...S.flags, ...flags };
  const e = sc.addEnemy(kind, 300, 250, { tier });
  const base = ENEMIES[kind].hp * TUNE.difficulty[settings.difficulty].enemyHp;
  const out = { hp: e.maxHp, base, mul: +(e.maxHp / base).toFixed(2), dmg: e.cfg.dmg, baseDmg: ENEMIES[kind].dmg, gold: e.cfg.loot?.gold };
  e.destroy();
  return out;
}, [kind, tier, flags]);
const a = await spawn('bandit', 0);
check('a starting-area bandit gets only the ordinary-monster bonus (x1.3 health)', Math.abs(a.mul - 1.3) < 0.03, JSON.stringify(a));
const allFlags = Object.fromEntries((await G(async () => (await import('/src/systems/enemyscale.js')).STORY_FLAGS)).map((k) => [k, true]));
const b = await spawn('bandit', 3, allFlags);
check('a last-region bandit at the end of the story has about 3.9x base health (3x scaling x1.3 bonus)', Math.abs(b.mul - 3.9) < 0.15 && b.dmg > a.dmg * 1.8, JSON.stringify({ a, b }));
await G(() => { const S = window.__ff.S; for (const k of Object.keys(S.flags)) if (/Dead$|Done$/.test(k)) delete S.flags[k]; });
const c = await spawn('bandit', 3, {});
check('the same region before the story is 70% of the way (2.4x scaling)', Math.abs(c.mul - 1.3 * 2.4) < 0.2, JSON.stringify(c));
check('gold drops grow with progress too', b.gold && a.gold && b.gold[1] > a.gold[1] * 2.5, JSON.stringify({ a: a.gold, b: b.gold }));
const boss = await spawn('boss', 3, allFlags);
const bossBase = await G(async () => { const { ENEMIES } = await import('/src/data/enemies.js'); return ENEMIES.boss.hp; });
check('bosses are not scaled by this system', boss.mul < 1.3 && boss.dmg === boss.baseDmg, JSON.stringify(boss));
const deer = await spawn('deer', 3, allFlags);
check('passive animals are left alone', deer.dmg === deer.baseDmg && deer.mul < 1.2, JSON.stringify(deer));
// more elites late
const el = await G(async () => { const E = await import('/src/systems/enemyscale.js'); return [E.eliteMul(0), E.eliteMul(1)]; });
check('elites appear up to 1.5x as often at full strength', el[0] === 1 && el[1] === 1.5, JSON.stringify(el));
check('no page errors', h.errors.length === 0, h.errors.join(' | '));
await h.close();
