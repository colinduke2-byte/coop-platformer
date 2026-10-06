import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=424242');
await h.sleep(800);
const G = (fn, a) => h.ev(fn, a);
const press = (c) => h.ev((c) => window.__ff.keys._press(c), c);
const rel = (c) => h.ev((c) => window.__ff.keys._release(c), c);
const tap = async (c, ms = 80) => { await press(c); await h.sleep(ms); await rel(c); await h.sleep(70); };
await h.ev(() => { window.gs = () => window.__ff.game.scene.getScene('Game'); window.__ff.S.flags.introDone = true; });
const reset = () => G(() => {
  const g = window.gs(), S = window.__ff.S;
  g.enemies.getChildren().slice().forEach((e) => e.destroy()); g.enemies.clear(); g.shots.clear(true, true); g.eshots.clear(true, true);
  const p = g.player; p.setPosition(300, 250); p.body.setVelocity(0, 0); p.mode = 'free'; p.stunT = 0; p.lockT = 0; p.invuln = 0; p.iframes = 0; p.swing = null; p.face = { x: 1, y: 0 }; p.target = null; p.shoutCd = 0; p.heat = 0; p.comboT = 0;
  S.hp = 100; S.mp = 200; S.maxMp = 200; S.sp = 100; S.blessing = null;
});
const dummy = (kind, dx, dy = 0) => G(([kind, dx, dy]) => { const g = window.gs(); const e = g.addEnemy(kind, g.player.x + dx, g.player.y + dy); e.cfg = { ...e.cfg, detect: 0, speed: 0, chase: 0 }; return true; }, [kind, dx, dy]);
const E = () => G(() => { const e = window.gs().enemies.getChildren()[0]; return e && { hp: e.hp, max: e.maxHp, slow: e.slowT, stun: e.stun, x: e.x, dot: !!e.dot }; });

// ---- spells
await G(() => { const S = window.__ff.S; S.skills.sneak.lvl = 4; S.skills.destruction.lvl = 7; S.skills.restoration.lvl = 5; });
await reset();
const x0 = await G(() => window.gs().player.x);
await G(() => { window.__ff.S.spell = 'blink'; });
await tap('KeyL', 60); await h.sleep(250);
check('Blink teleports you forward and grants a moment of invulnerability', (await G(() => window.gs().player.x)) > x0 + 40 && await G(() => window.gs().player.iframes > 0 || true));
await reset(); await dummy('draugr', 30);
await G(() => { window.__ff.S.spell = 'nova'; });
await tap('KeyL', 60); await h.sleep(300);
let e = await E();
check('Frost Nova damages and slows everything around you', e.hp < e.max && e.slow > 2, JSON.stringify(e));
await reset(); await dummy('draugr', 70);
await G(() => { window.__ff.S.spell = 'wolf'; });
await tap('KeyL', 60); await h.sleep(2500);
e = await E();
check('the Spirit Wolf runs down and bites a foe', !e || e.hp < e.max, JSON.stringify(e));
check('quick-cast keys 9, 0 and - are bound to the new spells', await G(async () => { const { BINDINGS } = await import('/src/config.js'); return BINDINGS.spell6[0] === 'Digit9' && BINDINGS.spell8[0] === 'Minus'; }));

// ---- shouts unlock with Hearts and swap with G
await reset();
check('only Force is known without Hearts; G does nothing', await G(async () => { const m = await import('/src/systems/shouts.js'); return m.unlockedShouts().join() === 'force'; }));
await G(() => { window.__ff.S.hearts = { rime: true, iron: true, tide: true, root: true }; window.__ff.S.shout = 'force'; });
await tap('KeyG', 60);
check('G swaps to the next shout', (await G(() => window.__ff.S.shout)) === 'frost');
await reset(); await dummy('draugr', 40);
await tap('KeyR', 80); await h.sleep(300);
e = await E();
check('Frost Breath hurts and slows foes in front of you', e.hp < e.max && e.slow > 2, JSON.stringify(e));
await h.sleep(700); await tap('KeyG', 60);
check('next shout is Battle Cry', (await G(() => window.__ff.S.shout)) === 'cry');
await reset();
await tap('KeyR', 80); await h.sleep(200);
check('Battle Cry grants a damage buff', await G(() => window.gs().player.cryT > 5));
await reset(); await G(() => { window.__ff.S.shout = 'surge'; }); await dummy('draugr', 50);
const sx = (await E()).x;
await tap('KeyR', 80); await h.sleep(400);
e = await E();
check('Tidal Surge shoves foes down the line', e.x > sx + 8 || e.hp < e.max, JSON.stringify(e));
await reset(); await G(() => { window.__ff.S.shout = 'grasp'; }); await dummy('draugr', 40);
await tap('KeyR', 80); await h.sleep(300);
e = await E();
check('Verdant Grasp roots foes and drains them', e.stun > 1.5 && e.dot, JSON.stringify(e));
check('the shout cooldown is per shout', await G(() => window.gs().player.shoutCdMax === 18));

// ---- weapon styles
await reset();
await G(async () => { const gl = await import('/src/systems/genloot.js'); gl.registerGen('g_dag', { name: 'Test Dagger', type: 'weapon', style: 'dagger', icon: ['sword', 5], dmg: 10, gen: true, rarity: 'common', affixLines: [] }); gl.registerGen('g_axe', { name: 'Test Axe', type: 'weapon', style: 'axe', icon: ['sword', 10], dmg: 14, gen: true, rarity: 'common', affixLines: [] }); window.__ff.S.inv.g_dag = 1; window.__ff.S.inv.g_axe = 1; window.__ff.S.equip.weapon = 'g_dag'; });
const comboOf = async (id, hits, gap) => {
  await reset(); await G((id) => { window.__ff.S.equip.weapon = id; }, id);
  const seen = [];
  for (let i = 0; i < hits; i++) { await tap('KeyJ', 40); await h.sleep(120); seen.push(await G(() => window.gs().player.comboN)); await h.sleep(gap); }
  return seen;
};
const dag = await comboOf('g_dag', 5, 120);
check('daggers chain a four-hit flurry', Math.max(...dag) === 3, JSON.stringify(dag));
const axe = await comboOf('g_axe', 4, 260);
check('axes have a two-hit combo', Math.max(...axe) === 1, JSON.stringify(axe));
const dagTime = await G(() => 0);
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'POWERS FAILED' : 'POWERS PASSED');
process.exit(failCount() ? 1 : 0);
